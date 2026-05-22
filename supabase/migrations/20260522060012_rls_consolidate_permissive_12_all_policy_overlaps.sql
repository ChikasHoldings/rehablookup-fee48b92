-- Batch 12/12 (final) — eliminate remaining multi-permissive overlaps.
--
-- After batches 1-11, the advisor still flags 67 warnings. Root cause:
-- many tables have an "Admins can manage X" policy with cmd = ALL plus
-- one or more cmd-specific user policies. The ALL admin policy fires for
-- every command (SELECT/INSERT/UPDATE/DELETE), creating a 2-permissive
-- group for each command that also has a user policy.
--
-- Fix: drop the ALL admin policies and either
--   a) merge the admin predicate into existing cmd-specific consolidated
--      policies (USING + WITH CHECK), or
--   b) create cmd-specific admin-only policies for commands that didn't
--      have any user policy.
--
-- Also drops:
--   - Duplicate SELECT-admin policies on email_send_failures / suppressed_emails
--     where an identical ALL-admin policy already exists.
--   - "Deny anon access" PERMISSIVE policies on lead_email_resend_attempts /
--     sms_inbound_log. PERMISSIVE policies with USING(false) are no-ops
--     (they OR-combine with other permissives). The admin SELECT policies
--     already control access; non-admin roles still see nothing because
--     no permissive policy grants them anything for those commands.

-- ─── blog_articles ───────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Admins can manage all articles" ON public.blog_articles;
DROP POLICY IF EXISTS "Public can read published articles" ON public.blog_articles;
CREATE POLICY "blog_articles_select_consolidated"
  ON public.blog_articles AS PERMISSIVE FOR SELECT
  USING ((user_is_admin((SELECT auth.uid()))) OR ((status = 'published'::text)));
CREATE POLICY "blog_articles_insert_admin"
  ON public.blog_articles AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (user_is_admin((SELECT auth.uid())));
CREATE POLICY "blog_articles_update_admin"
  ON public.blog_articles AS PERMISSIVE FOR UPDATE TO authenticated
  USING (user_is_admin((SELECT auth.uid())))
  WITH CHECK (user_is_admin((SELECT auth.uid())));
CREATE POLICY "blog_articles_delete_admin"
  ON public.blog_articles AS PERMISSIVE FOR DELETE TO authenticated
  USING (user_is_admin((SELECT auth.uid())));

-- ─── concierge_introductions ─────────────────────────────────────────────────
DROP POLICY IF EXISTS "Admins can manage concierge introductions" ON public.concierge_introductions;
DROP POLICY IF EXISTS "concierge_introductions_select_consolidated" ON public.concierge_introductions;
DROP POLICY IF EXISTS "Providers can respond to introductions" ON public.concierge_introductions;
CREATE POLICY "concierge_introductions_select_consolidated"
  ON public.concierge_introductions AS PERMISSIVE FOR SELECT
  USING ((EXISTS (SELECT 1 FROM user_roles WHERE ((user_roles.user_id = (SELECT auth.uid())) AND (user_roles.role = 'admin'::app_role)))) OR ((facility_id IN (SELECT facilities.id FROM facilities WHERE (facilities.user_id = (SELECT auth.uid()))))) OR (has_role((SELECT auth.uid()), 'admin'::app_role)) OR (EXISTS (SELECT 1 FROM facilities f WHERE ((f.id = concierge_introductions.facility_id) AND (f.user_id = (SELECT auth.uid()))))));
CREATE POLICY "concierge_introductions_update_consolidated"
  ON public.concierge_introductions AS PERMISSIVE FOR UPDATE
  USING ((EXISTS (SELECT 1 FROM user_roles WHERE ((user_roles.user_id = (SELECT auth.uid())) AND (user_roles.role = 'admin'::app_role)))) OR (EXISTS (SELECT 1 FROM facilities f WHERE ((f.id = concierge_introductions.facility_id) AND (f.user_id = (SELECT auth.uid()))))))
  WITH CHECK ((EXISTS (SELECT 1 FROM user_roles WHERE ((user_roles.user_id = (SELECT auth.uid())) AND (user_roles.role = 'admin'::app_role)))) OR (EXISTS (SELECT 1 FROM facilities f WHERE ((f.id = concierge_introductions.facility_id) AND (f.user_id = (SELECT auth.uid()))))));
CREATE POLICY "concierge_introductions_insert_admin"
  ON public.concierge_introductions AS PERMISSIVE FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM user_roles WHERE ((user_roles.user_id = (SELECT auth.uid())) AND (user_roles.role = 'admin'::app_role))));
CREATE POLICY "concierge_introductions_delete_admin"
  ON public.concierge_introductions AS PERMISSIVE FOR DELETE
  USING (EXISTS (SELECT 1 FROM user_roles WHERE ((user_roles.user_id = (SELECT auth.uid())) AND (user_roles.role = 'admin'::app_role))));

-- ─── concierge_messages ──────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Admins can manage all messages" ON public.concierge_messages;
DROP POLICY IF EXISTS "concierge_messages_insert_consolidated" ON public.concierge_messages;
DROP POLICY IF EXISTS "concierge_messages_select_consolidated" ON public.concierge_messages;
CREATE POLICY "concierge_messages_insert_consolidated"
  ON public.concierge_messages AS PERMISSIVE FOR INSERT
  WITH CHECK ((has_role((SELECT auth.uid()), 'admin'::app_role)) OR (((sender_id = (SELECT auth.uid())) AND (sender_type = 'provider'::text) AND (thread_id IN (SELECT ct.id FROM (concierge_threads ct JOIN facilities f ON ((ct.facility_id = f.id))) WHERE (f.user_id = (SELECT auth.uid())))))) OR (((thread_id IN (SELECT concierge_threads.id FROM concierge_threads WHERE (concierge_threads.user_id = (SELECT auth.uid())))) AND (sender_id = (SELECT auth.uid())))));
CREATE POLICY "concierge_messages_select_consolidated"
  ON public.concierge_messages AS PERMISSIVE FOR SELECT
  USING ((has_role((SELECT auth.uid()), 'admin'::app_role)) OR ((thread_id IN (SELECT ct.id FROM (concierge_threads ct JOIN facilities f ON ((ct.facility_id = f.id))) WHERE (f.user_id = (SELECT auth.uid()))))) OR ((thread_id IN (SELECT concierge_threads.id FROM concierge_threads WHERE (concierge_threads.user_id = (SELECT auth.uid()))))));
CREATE POLICY "concierge_messages_update_admin"
  ON public.concierge_messages AS PERMISSIVE FOR UPDATE
  USING (has_role((SELECT auth.uid()), 'admin'::app_role))
  WITH CHECK (has_role((SELECT auth.uid()), 'admin'::app_role));
CREATE POLICY "concierge_messages_delete_admin"
  ON public.concierge_messages AS PERMISSIVE FOR DELETE
  USING (has_role((SELECT auth.uid()), 'admin'::app_role));

-- ─── concierge_partner_facilities ────────────────────────────────────────────
DROP POLICY IF EXISTS "Admins can manage concierge partner facilities" ON public.concierge_partner_facilities;
DROP POLICY IF EXISTS "Facility owners can insert own concierge partner geo" ON public.concierge_partner_facilities;
DROP POLICY IF EXISTS "concierge_partner_facilities_select_consolidated" ON public.concierge_partner_facilities;
DROP POLICY IF EXISTS "Facility owners can update own concierge partner geo" ON public.concierge_partner_facilities;
CREATE POLICY "concierge_partner_facilities_insert_consolidated"
  ON public.concierge_partner_facilities AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((is_admin((SELECT auth.uid()))) OR ((facility_id IN (SELECT facilities.id FROM facilities WHERE (facilities.user_id = (SELECT auth.uid()))))));
CREATE POLICY "concierge_partner_facilities_select_consolidated"
  ON public.concierge_partner_facilities AS PERMISSIVE FOR SELECT TO authenticated
  USING ((is_admin((SELECT auth.uid()))) OR ((facility_id IN (SELECT facilities.id FROM facilities WHERE (facilities.user_id = (SELECT auth.uid()))))));
CREATE POLICY "concierge_partner_facilities_update_consolidated"
  ON public.concierge_partner_facilities AS PERMISSIVE FOR UPDATE TO authenticated
  USING ((is_admin((SELECT auth.uid()))) OR ((facility_id IN (SELECT facilities.id FROM facilities WHERE (facilities.user_id = (SELECT auth.uid()))))))
  WITH CHECK ((is_admin((SELECT auth.uid()))) OR ((facility_id IN (SELECT facilities.id FROM facilities WHERE (facilities.user_id = (SELECT auth.uid()))))));
CREATE POLICY "concierge_partner_facilities_delete_admin"
  ON public.concierge_partner_facilities AS PERMISSIVE FOR DELETE TO authenticated
  USING (is_admin((SELECT auth.uid())));

-- ─── concierge_threads ───────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Admins can manage all threads" ON public.concierge_threads;
DROP POLICY IF EXISTS "Seekers can create advisor threads only" ON public.concierge_threads;
DROP POLICY IF EXISTS "concierge_threads_select_consolidated" ON public.concierge_threads;
DROP POLICY IF EXISTS "Users can update own threads" ON public.concierge_threads;
CREATE POLICY "concierge_threads_insert_consolidated"
  ON public.concierge_threads AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((EXISTS (SELECT 1 FROM user_roles WHERE ((user_roles.user_id = (SELECT auth.uid())) AND (user_roles.role = 'admin'::app_role)))) OR (((thread_type = 'advisor'::text) AND (user_id = (SELECT auth.uid())))));
CREATE POLICY "concierge_threads_select_consolidated"
  ON public.concierge_threads AS PERMISSIVE FOR SELECT
  USING ((EXISTS (SELECT 1 FROM user_roles WHERE ((user_roles.user_id = (SELECT auth.uid())) AND (user_roles.role = 'admin'::app_role)))) OR (((facility_id IS NOT NULL) AND (EXISTS (SELECT 1 FROM facilities f WHERE ((f.id = concierge_threads.facility_id) AND (f.user_id = (SELECT auth.uid()))))))) OR ((user_id = (SELECT auth.uid()))));
CREATE POLICY "concierge_threads_update_consolidated"
  ON public.concierge_threads AS PERMISSIVE FOR UPDATE
  USING ((EXISTS (SELECT 1 FROM user_roles WHERE ((user_roles.user_id = (SELECT auth.uid())) AND (user_roles.role = 'admin'::app_role)))) OR ((user_id = (SELECT auth.uid()))))
  WITH CHECK ((EXISTS (SELECT 1 FROM user_roles WHERE ((user_roles.user_id = (SELECT auth.uid())) AND (user_roles.role = 'admin'::app_role)))) OR ((user_id = (SELECT auth.uid()))));
CREATE POLICY "concierge_threads_delete_admin"
  ON public.concierge_threads AS PERMISSIVE FOR DELETE
  USING (EXISTS (SELECT 1 FROM user_roles WHERE ((user_roles.user_id = (SELECT auth.uid())) AND (user_roles.role = 'admin'::app_role))));

-- ─── concierge_tour_requests ─────────────────────────────────────────────────
DROP POLICY IF EXISTS "Admins can manage all tour requests" ON public.concierge_tour_requests;
DROP POLICY IF EXISTS "Admins can create tour requests" ON public.concierge_tour_requests;
DROP POLICY IF EXISTS "concierge_tour_requests_select_consolidated" ON public.concierge_tour_requests;
DROP POLICY IF EXISTS "Users can update own tour requests" ON public.concierge_tour_requests;
CREATE POLICY "concierge_tour_requests_insert_consolidated"
  ON public.concierge_tour_requests AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((has_role((SELECT auth.uid()), 'admin'::app_role)) OR ((EXISTS (SELECT 1 FROM user_roles WHERE ((user_roles.user_id = (SELECT auth.uid())) AND (user_roles.role = 'admin'::app_role))))) OR ((user_id = (SELECT auth.uid()))));
CREATE POLICY "concierge_tour_requests_select_consolidated"
  ON public.concierge_tour_requests AS PERMISSIVE FOR SELECT
  USING ((has_role((SELECT auth.uid()), 'admin'::app_role)) OR ((facility_id IN (SELECT facilities.id FROM facilities WHERE (facilities.user_id = (SELECT auth.uid()))))) OR ((user_id = (SELECT auth.uid()))));
CREATE POLICY "concierge_tour_requests_update_consolidated"
  ON public.concierge_tour_requests AS PERMISSIVE FOR UPDATE
  USING ((has_role((SELECT auth.uid()), 'admin'::app_role)) OR ((user_id = (SELECT auth.uid()))))
  WITH CHECK ((has_role((SELECT auth.uid()), 'admin'::app_role)) OR ((user_id = (SELECT auth.uid()))));
CREATE POLICY "concierge_tour_requests_delete_admin"
  ON public.concierge_tour_requests AS PERMISSIVE FOR DELETE
  USING (has_role((SELECT auth.uid()), 'admin'::app_role));

-- ─── email_send_failures ─────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Admins can view email failures" ON public.email_send_failures;

-- ─── featured_placements ─────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Admins can manage featured placements" ON public.featured_placements;
DROP POLICY IF EXISTS "Facility owners can insert own featured placements" ON public.featured_placements;
DROP POLICY IF EXISTS "featured_placements_select_consolidated" ON public.featured_placements;
DROP POLICY IF EXISTS "Facility owners can update own featured placements" ON public.featured_placements;
CREATE POLICY "featured_placements_insert_consolidated"
  ON public.featured_placements AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((is_admin((SELECT auth.uid()))) OR ((facility_id IN (SELECT facilities.id FROM facilities WHERE (facilities.user_id = (SELECT auth.uid()))))));
CREATE POLICY "featured_placements_select_consolidated"
  ON public.featured_placements AS PERMISSIVE FOR SELECT TO anon, authenticated
  USING ((is_admin((SELECT auth.uid()))) OR ((facility_id IN (SELECT facilities.id FROM facilities WHERE (facilities.user_id = (SELECT auth.uid()))))) OR ((active = true)));
CREATE POLICY "featured_placements_update_consolidated"
  ON public.featured_placements AS PERMISSIVE FOR UPDATE TO authenticated
  USING ((is_admin((SELECT auth.uid()))) OR ((facility_id IN (SELECT facilities.id FROM facilities WHERE (facilities.user_id = (SELECT auth.uid()))))))
  WITH CHECK ((is_admin((SELECT auth.uid()))) OR ((facility_id IN (SELECT facilities.id FROM facilities WHERE (facilities.user_id = (SELECT auth.uid()))))));
CREATE POLICY "featured_placements_delete_admin"
  ON public.featured_placements AS PERMISSIVE FOR DELETE TO authenticated
  USING (is_admin((SELECT auth.uid())));

-- ─── lead_distributions ──────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Admins can manage lead distributions" ON public.lead_distributions;
-- (lead_distributions_select_consolidated already has admin check; just need
-- to add cmd-specific admin policies for the other commands now that ALL
-- admin is gone.)
CREATE POLICY "lead_distributions_insert_admin"
  ON public.lead_distributions AS PERMISSIVE FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM user_roles WHERE ((user_roles.user_id = (SELECT auth.uid())) AND (user_roles.role = 'admin'::app_role))));
CREATE POLICY "lead_distributions_update_admin"
  ON public.lead_distributions AS PERMISSIVE FOR UPDATE
  USING (EXISTS (SELECT 1 FROM user_roles WHERE ((user_roles.user_id = (SELECT auth.uid())) AND (user_roles.role = 'admin'::app_role))))
  WITH CHECK (EXISTS (SELECT 1 FROM user_roles WHERE ((user_roles.user_id = (SELECT auth.uid())) AND (user_roles.role = 'admin'::app_role))));
CREATE POLICY "lead_distributions_delete_admin"
  ON public.lead_distributions AS PERMISSIVE FOR DELETE
  USING (EXISTS (SELECT 1 FROM user_roles WHERE ((user_roles.user_id = (SELECT auth.uid())) AND (user_roles.role = 'admin'::app_role))));

-- ─── lead_email_resend_attempts ─────────────────────────────────────────────
-- "Deny anon access" is PERMISSIVE with USING(false) — a no-op.
-- PERMISSIVE policies OR together; only RESTRICTIVE policies subtract.
DROP POLICY IF EXISTS "Deny anon access to lead_email_resend_attempts" ON public.lead_email_resend_attempts;

-- ─── seeker_facility_alerts ─────────────────────────────────────────────────
DROP POLICY IF EXISTS "Admins can manage facility alerts" ON public.seeker_facility_alerts;
DROP POLICY IF EXISTS "Users can view own alerts" ON public.seeker_facility_alerts;
CREATE POLICY "seeker_facility_alerts_select_consolidated"
  ON public.seeker_facility_alerts AS PERMISSIVE FOR SELECT TO authenticated
  USING ((has_role((SELECT auth.uid()), 'admin'::app_role)) OR (((SELECT auth.uid()) = user_id)));
CREATE POLICY "seeker_facility_alerts_insert_admin"
  ON public.seeker_facility_alerts AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (has_role((SELECT auth.uid()), 'admin'::app_role));
CREATE POLICY "seeker_facility_alerts_update_admin"
  ON public.seeker_facility_alerts AS PERMISSIVE FOR UPDATE TO authenticated
  USING (has_role((SELECT auth.uid()), 'admin'::app_role))
  WITH CHECK (has_role((SELECT auth.uid()), 'admin'::app_role));
CREATE POLICY "seeker_facility_alerts_delete_admin"
  ON public.seeker_facility_alerts AS PERMISSIVE FOR DELETE TO authenticated
  USING (has_role((SELECT auth.uid()), 'admin'::app_role));

-- ─── seeker_onboarding_drip ─────────────────────────────────────────────────
DROP POLICY IF EXISTS "Admins can manage seeker drip" ON public.seeker_onboarding_drip;
DROP POLICY IF EXISTS "Users can view own drip" ON public.seeker_onboarding_drip;
CREATE POLICY "seeker_onboarding_drip_select_consolidated"
  ON public.seeker_onboarding_drip AS PERMISSIVE FOR SELECT TO authenticated
  USING ((has_role((SELECT auth.uid()), 'admin'::app_role)) OR (((SELECT auth.uid()) = user_id)));
CREATE POLICY "seeker_onboarding_drip_insert_admin"
  ON public.seeker_onboarding_drip AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (has_role((SELECT auth.uid()), 'admin'::app_role));
CREATE POLICY "seeker_onboarding_drip_update_admin"
  ON public.seeker_onboarding_drip AS PERMISSIVE FOR UPDATE TO authenticated
  USING (has_role((SELECT auth.uid()), 'admin'::app_role))
  WITH CHECK (has_role((SELECT auth.uid()), 'admin'::app_role));
CREATE POLICY "seeker_onboarding_drip_delete_admin"
  ON public.seeker_onboarding_drip AS PERMISSIVE FOR DELETE TO authenticated
  USING (has_role((SELECT auth.uid()), 'admin'::app_role));

-- ─── sms_inbound_log ────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Deny anon access to sms_inbound_log" ON public.sms_inbound_log;

-- ─── support_tickets ────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Admins can manage support tickets" ON public.support_tickets;
DROP POLICY IF EXISTS "Authenticated users can open their own tickets" ON public.support_tickets;
DROP POLICY IF EXISTS "Users can view their own support tickets" ON public.support_tickets;
CREATE POLICY "support_tickets_insert_consolidated"
  ON public.support_tickets AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((user_is_admin((SELECT auth.uid()))) OR ((sender_user_id = (SELECT auth.uid()))));
CREATE POLICY "support_tickets_select_consolidated"
  ON public.support_tickets AS PERMISSIVE FOR SELECT TO authenticated
  USING ((user_is_admin((SELECT auth.uid()))) OR ((sender_user_id = (SELECT auth.uid()))));
CREATE POLICY "support_tickets_update_admin"
  ON public.support_tickets AS PERMISSIVE FOR UPDATE TO authenticated
  USING (user_is_admin((SELECT auth.uid())))
  WITH CHECK (user_is_admin((SELECT auth.uid())));
CREATE POLICY "support_tickets_delete_admin"
  ON public.support_tickets AS PERMISSIVE FOR DELETE TO authenticated
  USING (user_is_admin((SELECT auth.uid())));

-- ─── suppressed_emails ──────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Admins can view suppressed emails" ON public.suppressed_emails;

-- ─── template_tags ──────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Admins can manage template tags" ON public.template_tags;
-- (Authenticated users can view template tags — SELECT TRUE — kept as-is.)
CREATE POLICY "template_tags_insert_admin"
  ON public.template_tags AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (has_role((SELECT auth.uid()), 'admin'::app_role));
CREATE POLICY "template_tags_update_admin"
  ON public.template_tags AS PERMISSIVE FOR UPDATE TO authenticated
  USING (has_role((SELECT auth.uid()), 'admin'::app_role))
  WITH CHECK (has_role((SELECT auth.uid()), 'admin'::app_role));
CREATE POLICY "template_tags_delete_admin"
  ON public.template_tags AS PERMISSIVE FOR DELETE TO authenticated
  USING (has_role((SELECT auth.uid()), 'admin'::app_role));
