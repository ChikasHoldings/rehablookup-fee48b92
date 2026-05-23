-- HOTFIX (extends 20260523011000 and 20260523011251)
-- — restores 31 more public.* table SELECT policies that were broken by
-- the same batch-12 multi-permissive consolidation + Phase 2B revoke
-- interaction. RLS regression sweep (this session) verified each
-- policy below calls has_role / is_admin / user_owns_facility from a
-- TO-public USING; anon (and any role missing EXECUTE on those helpers)
-- gets 42501 before predicates can short-circuit.
--
-- Two repair patterns:
--
--   (A) Tables with legitimate anon visibility — facility-profile
--       attribute lists (age groups, insurance, services) and the
--       featured placements pool. Split into _select_public (the safe
--       predicate, no revoked helpers) + _select_authenticated (the
--       admin/owner paths). Combined as OR'd permissive policies, the
--       union exactly preserves the original USING for both roles.
--
--   (B) Tables with NO legitimate anon visibility — admin / provider
--       / seeker / concierge private data. Drop the TO-public policy
--       and recreate it bound TO authenticated. Anon paths return 0
--       rows (was: 42501 error). Admin/owner functional access is
--       preserved.
--
-- Accepted trade-off: re-introduces multiple_permissive_policies
-- advisor warnings on (table, authenticated, SELECT) for the (A)
-- tables. Lint is informational; user-visible site breakage is real.

-- ════════════════════════════════════════════════════════════════════
-- (A) Tables with legitimate anon visibility — split pattern
-- ════════════════════════════════════════════════════════════════════

-- ── facility_age_groups ─────────────────────────────────────────────
DROP POLICY IF EXISTS "facility_age_groups_select_consolidated" ON public.facility_age_groups;

CREATE POLICY "facility_age_groups_select_public"
  ON public.facility_age_groups
  AS PERMISSIVE FOR SELECT
  USING (is_approved_facility(facility_id));

CREATE POLICY "facility_age_groups_select_authenticated"
  ON public.facility_age_groups
  AS PERMISSIVE FOR SELECT
  TO authenticated
  USING (user_owns_facility(facility_id, (SELECT auth.uid())));

-- ── facility_insurance ──────────────────────────────────────────────
DROP POLICY IF EXISTS "facility_insurance_select_consolidated" ON public.facility_insurance;

CREATE POLICY "facility_insurance_select_public"
  ON public.facility_insurance
  AS PERMISSIVE FOR SELECT
  USING (is_approved_facility(facility_id));

CREATE POLICY "facility_insurance_select_authenticated"
  ON public.facility_insurance
  AS PERMISSIVE FOR SELECT
  TO authenticated
  USING (user_owns_facility(facility_id, (SELECT auth.uid())));

-- ── facility_services ───────────────────────────────────────────────
DROP POLICY IF EXISTS "facility_services_select_consolidated" ON public.facility_services;

CREATE POLICY "facility_services_select_public"
  ON public.facility_services
  AS PERMISSIVE FOR SELECT
  USING (is_approved_facility(facility_id));

CREATE POLICY "facility_services_select_authenticated"
  ON public.facility_services
  AS PERMISSIVE FOR SELECT
  TO authenticated
  USING (user_owns_facility(facility_id, (SELECT auth.uid())));

-- ── featured_placements ─────────────────────────────────────────────
DROP POLICY IF EXISTS "featured_placements_select_consolidated" ON public.featured_placements;

CREATE POLICY "featured_placements_select_public"
  ON public.featured_placements
  AS PERMISSIVE FOR SELECT
  USING (active = true);

CREATE POLICY "featured_placements_select_authenticated"
  ON public.featured_placements
  AS PERMISSIVE FOR SELECT
  TO authenticated
  USING (
    is_admin((SELECT auth.uid()))
    OR (facility_id IN (SELECT facilities.id FROM public.facilities WHERE facilities.user_id = (SELECT auth.uid())))
  );

-- ════════════════════════════════════════════════════════════════════
-- (B) Tables with no legitimate anon visibility — TO authenticated
-- ════════════════════════════════════════════════════════════════════

-- ── account_activity_log ────────────────────────────────────────────
DROP POLICY IF EXISTS "account_activity_log_select_consolidated" ON public.account_activity_log;
CREATE POLICY "account_activity_log_select_consolidated"
  ON public.account_activity_log
  AS PERMISSIVE FOR SELECT
  TO authenticated
  USING (has_role((SELECT auth.uid()), 'admin'::app_role) OR ((SELECT auth.uid()) = user_id));

-- ── admin_user_permissions ──────────────────────────────────────────
DROP POLICY IF EXISTS "admin_user_permissions_select_consolidated" ON public.admin_user_permissions;
CREATE POLICY "admin_user_permissions_select_consolidated"
  ON public.admin_user_permissions
  AS PERMISSIVE FOR SELECT
  TO authenticated
  USING (has_role((SELECT auth.uid()), 'admin'::app_role) OR ((SELECT auth.uid()) = user_id));

-- ── admin_user_profiles ─────────────────────────────────────────────
DROP POLICY IF EXISTS "admin_user_profiles_select_consolidated" ON public.admin_user_profiles;
CREATE POLICY "admin_user_profiles_select_consolidated"
  ON public.admin_user_profiles
  AS PERMISSIVE FOR SELECT
  TO authenticated
  USING (has_role((SELECT auth.uid()), 'admin'::app_role) OR ((SELECT auth.uid()) = user_id));

-- ── blocked_identifiers ─────────────────────────────────────────────
DROP POLICY IF EXISTS "Admins can view blocked identifiers" ON public.blocked_identifiers;
CREATE POLICY "Admins can view blocked identifiers"
  ON public.blocked_identifiers
  AS PERMISSIVE FOR SELECT
  TO authenticated
  USING (has_role((SELECT auth.uid()), 'admin'::app_role));

-- ── concierge_case_events ───────────────────────────────────────────
DROP POLICY IF EXISTS "concierge_case_events_select_consolidated" ON public.concierge_case_events;
CREATE POLICY "concierge_case_events_select_consolidated"
  ON public.concierge_case_events
  AS PERMISSIVE FOR SELECT
  TO authenticated
  USING (
    (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = (SELECT auth.uid()) AND role = 'admin'::app_role))
    OR has_role((SELECT auth.uid()), 'admin'::app_role)
    OR (EXISTS (
      SELECT 1
      FROM public.concierge_inquiries ci
      JOIN public.facilities f ON (f.id = ANY (ci.matched_facility_ids))
      WHERE ci.id = concierge_case_events.inquiry_id
        AND f.user_id = (SELECT auth.uid())
    ))
    OR (EXISTS (
      SELECT 1 FROM public.concierge_inquiries
      WHERE id = concierge_case_events.inquiry_id
        AND user_id = (SELECT auth.uid())
    ))
  );

-- ── concierge_inquiries ─────────────────────────────────────────────
DROP POLICY IF EXISTS "concierge_inquiries_select_consolidated" ON public.concierge_inquiries;
CREATE POLICY "concierge_inquiries_select_consolidated"
  ON public.concierge_inquiries
  AS PERMISSIVE FOR SELECT
  TO authenticated
  USING (
    has_role((SELECT auth.uid()), 'admin'::app_role)
    OR (EXISTS (
      SELECT 1 FROM public.concierge_introductions ci
      JOIN public.facilities f ON (f.id = ci.facility_id)
      WHERE ci.inquiry_id = concierge_inquiries.id
        AND f.user_id = (SELECT auth.uid())
        AND (
          (ci.admin_disclosed_pii_at IS NOT NULL)
          OR (concierge_inquiries.seeker_confirmed = true AND concierge_inquiries.placed_facility_id = f.id)
        )
    ))
    OR (user_id = (SELECT auth.uid()))
    OR (user_email = current_user_email())
  );

-- ── concierge_introductions ─────────────────────────────────────────
DROP POLICY IF EXISTS "concierge_introductions_select_consolidated" ON public.concierge_introductions;
CREATE POLICY "concierge_introductions_select_consolidated"
  ON public.concierge_introductions
  AS PERMISSIVE FOR SELECT
  TO authenticated
  USING (
    (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = (SELECT auth.uid()) AND role = 'admin'::app_role))
    OR (facility_id IN (SELECT facilities.id FROM public.facilities WHERE facilities.user_id = (SELECT auth.uid())))
    OR has_role((SELECT auth.uid()), 'admin'::app_role)
    OR (EXISTS (
      SELECT 1 FROM public.facilities f
      WHERE f.id = concierge_introductions.facility_id
        AND f.user_id = (SELECT auth.uid())
    ))
  );

-- ── concierge_messages ──────────────────────────────────────────────
DROP POLICY IF EXISTS "concierge_messages_select_consolidated" ON public.concierge_messages;
CREATE POLICY "concierge_messages_select_consolidated"
  ON public.concierge_messages
  AS PERMISSIVE FOR SELECT
  TO authenticated
  USING (
    has_role((SELECT auth.uid()), 'admin'::app_role)
    OR (thread_id IN (
      SELECT ct.id FROM public.concierge_threads ct
      JOIN public.facilities f ON ct.facility_id = f.id
      WHERE f.user_id = (SELECT auth.uid())
    ))
    OR (thread_id IN (
      SELECT id FROM public.concierge_threads
      WHERE user_id = (SELECT auth.uid())
    ))
  );

-- ── concierge_tour_requests ─────────────────────────────────────────
DROP POLICY IF EXISTS "concierge_tour_requests_select_consolidated" ON public.concierge_tour_requests;
CREATE POLICY "concierge_tour_requests_select_consolidated"
  ON public.concierge_tour_requests
  AS PERMISSIVE FOR SELECT
  TO authenticated
  USING (
    has_role((SELECT auth.uid()), 'admin'::app_role)
    OR (facility_id IN (SELECT facilities.id FROM public.facilities WHERE facilities.user_id = (SELECT auth.uid())))
    OR (user_id = (SELECT auth.uid()))
  );

-- ── email_tracking_events ───────────────────────────────────────────
DROP POLICY IF EXISTS "Admins can view tracking events" ON public.email_tracking_events;
CREATE POLICY "Admins can view tracking events"
  ON public.email_tracking_events
  AS PERMISSIVE FOR SELECT
  TO authenticated
  USING (has_role((SELECT auth.uid()), 'admin'::app_role));

-- ── facility_claim_requests ─────────────────────────────────────────
DROP POLICY IF EXISTS "facility_claim_requests_select" ON public.facility_claim_requests;
CREATE POLICY "facility_claim_requests_select"
  ON public.facility_claim_requests
  AS PERMISSIVE FOR SELECT
  TO authenticated
  USING (((SELECT auth.uid()) = claimant_user_id) OR is_admin((SELECT auth.uid())));

-- ── facility_credential_documents ───────────────────────────────────
DROP POLICY IF EXISTS "facility_credential_documents_select_consolidated" ON public.facility_credential_documents;
CREATE POLICY "facility_credential_documents_select_consolidated"
  ON public.facility_credential_documents
  AS PERMISSIVE FOR SELECT
  TO authenticated
  USING (
    has_role((SELECT auth.uid()), 'admin'::app_role)
    OR (facility_id IN (SELECT facilities.id FROM public.facilities WHERE facilities.user_id = (SELECT auth.uid())))
  );

-- ── facility_pending_changes ────────────────────────────────────────
DROP POLICY IF EXISTS "facility_pending_changes_select_consolidated" ON public.facility_pending_changes;
CREATE POLICY "facility_pending_changes_select_consolidated"
  ON public.facility_pending_changes
  AS PERMISSIVE FOR SELECT
  TO authenticated
  USING (has_role((SELECT auth.uid()), 'admin'::app_role) OR ((SELECT auth.uid()) = provider_id));

-- ── facility_staff ──────────────────────────────────────────────────
DROP POLICY IF EXISTS "facility_staff_select_consolidated" ON public.facility_staff;
CREATE POLICY "facility_staff_select_consolidated"
  ON public.facility_staff
  AS PERMISSIVE FOR SELECT
  TO authenticated
  USING (
    has_role((SELECT auth.uid()), 'admin'::app_role)
    OR user_owns_facility(facility_id, (SELECT auth.uid()))
  );

-- ── facility_subscriptions ──────────────────────────────────────────
DROP POLICY IF EXISTS "facility_subscriptions_select_consolidated" ON public.facility_subscriptions;
CREATE POLICY "facility_subscriptions_select_consolidated"
  ON public.facility_subscriptions
  AS PERMISSIVE FOR SELECT
  TO authenticated
  USING (has_role((SELECT auth.uid()), 'admin'::app_role) OR (provider_id = (SELECT auth.uid())));

-- ── facility_views ──────────────────────────────────────────────────
DROP POLICY IF EXISTS "facility_views_select_consolidated" ON public.facility_views;
CREATE POLICY "facility_views_select_consolidated"
  ON public.facility_views
  AS PERMISSIVE FOR SELECT
  TO authenticated
  USING (
    has_role((SELECT auth.uid()), 'admin'::app_role)
    OR (facility_id IN (SELECT facilities.id FROM public.facilities WHERE facilities.user_id = (SELECT auth.uid())))
  );

-- ── featured_placement_analytics ────────────────────────────────────
DROP POLICY IF EXISTS "featured_placement_analytics_select_consolidated" ON public.featured_placement_analytics;
CREATE POLICY "featured_placement_analytics_select_consolidated"
  ON public.featured_placement_analytics
  AS PERMISSIVE FOR SELECT
  TO authenticated
  USING (
    has_role((SELECT auth.uid()), 'admin'::app_role)
    OR (facility_id IN (SELECT facilities.id FROM public.facilities WHERE facilities.user_id = (SELECT auth.uid())))
  );

-- ── flagged_images ──────────────────────────────────────────────────
DROP POLICY IF EXISTS "Admins can view flagged images" ON public.flagged_images;
CREATE POLICY "Admins can view flagged images"
  ON public.flagged_images
  AS PERMISSIVE FOR SELECT
  TO authenticated
  USING (has_role((SELECT auth.uid()), 'admin'::app_role));

-- ── leads ───────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "leads_select_consolidated" ON public.leads;
CREATE POLICY "leads_select_consolidated"
  ON public.leads
  AS PERMISSIVE FOR SELECT
  TO authenticated
  USING (
    has_role((SELECT auth.uid()), 'admin'::app_role)
    OR (facility_id IN (SELECT f.id FROM public.facilities f WHERE f.user_id = (SELECT auth.uid())))
    OR (id IN (
      SELECT ld.lead_id FROM public.lead_distributions ld
      JOIN public.facilities f ON ld.facility_id = f.id
      WHERE f.user_id = (SELECT auth.uid())
    ))
    OR (email = ((SELECT auth.jwt()) ->> 'email'::text))
  );

-- ── platform_settings ───────────────────────────────────────────────
DROP POLICY IF EXISTS "Admins can view settings" ON public.platform_settings;
CREATE POLICY "Admins can view settings"
  ON public.platform_settings
  AS PERMISSIVE FOR SELECT
  TO authenticated
  USING (has_role((SELECT auth.uid()), 'admin'::app_role));

-- ── profiles ────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "profiles_select_consolidated" ON public.profiles;
CREATE POLICY "profiles_select_consolidated"
  ON public.profiles
  AS PERMISSIVE FOR SELECT
  TO authenticated
  USING (has_role((SELECT auth.uid()), 'admin'::app_role) OR ((SELECT auth.uid()) = user_id));

-- ── provider_events ─────────────────────────────────────────────────
DROP POLICY IF EXISTS "provider_events_select_consolidated" ON public.provider_events;
CREATE POLICY "provider_events_select_consolidated"
  ON public.provider_events
  AS PERMISSIVE FOR SELECT
  TO authenticated
  USING (
    has_role((SELECT auth.uid()), 'admin'::app_role)
    OR (facility_id IN (SELECT facilities.id FROM public.facilities WHERE facilities.user_id = (SELECT auth.uid())))
  );

-- ── provider_payment_methods ────────────────────────────────────────
DROP POLICY IF EXISTS "provider_payment_methods_select_consolidated" ON public.provider_payment_methods;
CREATE POLICY "provider_payment_methods_select_consolidated"
  ON public.provider_payment_methods
  AS PERMISSIVE FOR SELECT
  TO authenticated
  USING (
    has_role((SELECT auth.uid()), 'admin'::app_role)
    OR (facility_id IN (SELECT facilities.id FROM public.facilities WHERE facilities.user_id = (SELECT auth.uid())))
  );

-- ── review_disputes ─────────────────────────────────────────────────
DROP POLICY IF EXISTS "review_disputes_select_consolidated" ON public.review_disputes;
CREATE POLICY "review_disputes_select_consolidated"
  ON public.review_disputes
  AS PERMISSIVE FOR SELECT
  TO authenticated
  USING (
    has_role((SELECT auth.uid()), 'admin'::app_role)
    OR (facility_id IN (SELECT facilities.id FROM public.facilities WHERE facilities.user_id = (SELECT auth.uid())))
  );

-- ── review_requests ─────────────────────────────────────────────────
DROP POLICY IF EXISTS "review_requests_select_consolidated" ON public.review_requests;
CREATE POLICY "review_requests_select_consolidated"
  ON public.review_requests
  AS PERMISSIVE FOR SELECT
  TO authenticated
  USING (
    has_role((SELECT auth.uid()), 'admin'::app_role)
    OR (facility_id IN (SELECT facilities.id FROM public.facilities WHERE facilities.user_id = (SELECT auth.uid())))
  );

-- ── seeker_profiles ─────────────────────────────────────────────────
DROP POLICY IF EXISTS "seeker_profiles_select_consolidated" ON public.seeker_profiles;
CREATE POLICY "seeker_profiles_select_consolidated"
  ON public.seeker_profiles
  AS PERMISSIVE FOR SELECT
  TO authenticated
  USING (has_role((SELECT auth.uid()), 'admin'::app_role) OR ((SELECT auth.uid()) = user_id));

-- ── subscription_events ─────────────────────────────────────────────
DROP POLICY IF EXISTS "subscription_events_select_consolidated" ON public.subscription_events;
CREATE POLICY "subscription_events_select_consolidated"
  ON public.subscription_events
  AS PERMISSIVE FOR SELECT
  TO authenticated
  USING (has_role((SELECT auth.uid()), 'admin'::app_role) OR (user_id = (SELECT auth.uid())));
