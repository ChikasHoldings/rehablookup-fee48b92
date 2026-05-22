-- Wrap auth.uid() / auth.jwt() / auth.role() in (select …) so the planner
-- evaluates them once per query instead of once per row. Fixes the
-- Supabase advisor `auth_rls_initplan` warnings (34 → 0).
--
-- One BEGIN/COMMIT per table so a single broken policy doesn't leave the
-- table without protection mid-migration.

-- ─── public.addon_waitlist (5 policies) ───────────────────────────────────────
BEGIN;
DROP POLICY IF EXISTS "Admins can update any waitlist entry" ON public.addon_waitlist;
CREATE POLICY "Admins can update any waitlist entry"
  ON public.addon_waitlist
  AS PERMISSIVE FOR UPDATE
 TO authenticated
  USING (has_role((select auth.uid()), 'admin'::app_role))
  WITH CHECK (has_role((select auth.uid()), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins can view all waitlist entries" ON public.addon_waitlist;
CREATE POLICY "Admins can view all waitlist entries"
  ON public.addon_waitlist
  AS PERMISSIVE FOR SELECT
 TO authenticated
  USING (has_role((select auth.uid()), 'admin'::app_role));

DROP POLICY IF EXISTS "Providers can cancel their own waitlist entries" ON public.addon_waitlist;
CREATE POLICY "Providers can cancel their own waitlist entries"
  ON public.addon_waitlist
  AS PERMISSIVE FOR UPDATE
 TO authenticated
  USING (((requested_by = (select auth.uid())) AND (status = ANY (ARRAY['waiting'::text, 'invited'::text]))))
  WITH CHECK (((requested_by = (select auth.uid())) AND (status = 'canceled'::text)));

DROP POLICY IF EXISTS "Providers can insert their own waitlist entries" ON public.addon_waitlist;
CREATE POLICY "Providers can insert their own waitlist entries"
  ON public.addon_waitlist
  AS PERMISSIVE FOR INSERT
 TO authenticated
  WITH CHECK ((requested_by = (select auth.uid())));

DROP POLICY IF EXISTS "Providers can view their own waitlist entries" ON public.addon_waitlist;
CREATE POLICY "Providers can view their own waitlist entries"
  ON public.addon_waitlist
  AS PERMISSIVE FOR SELECT
 TO authenticated
  USING ((requested_by = (select auth.uid())));

COMMIT;

-- ─── public.analytics_events (1 policy) ─────────────────────────────────────
BEGIN;
DROP POLICY IF EXISTS "Admin staff read analytics_events" ON public.analytics_events;
CREATE POLICY "Admin staff read analytics_events"
  ON public.analytics_events
  AS PERMISSIVE FOR SELECT
  USING ((EXISTS ( SELECT 1
   FROM admin_user_profiles aup
  WHERE ((aup.user_id = (select auth.uid())) AND (COALESCE(aup.status, 'active'::text) = 'active'::text)))));

COMMIT;

-- ─── public.concierge_geo_caps (3 policies) ───────────────────────────────────
BEGIN;
DROP POLICY IF EXISTS "Admins can delete concierge geo caps" ON public.concierge_geo_caps;
CREATE POLICY "Admins can delete concierge geo caps"
  ON public.concierge_geo_caps
  AS PERMISSIVE FOR DELETE
 TO authenticated
  USING (has_role((select auth.uid()), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins can insert concierge geo caps" ON public.concierge_geo_caps;
CREATE POLICY "Admins can insert concierge geo caps"
  ON public.concierge_geo_caps
  AS PERMISSIVE FOR INSERT
 TO authenticated
  WITH CHECK (has_role((select auth.uid()), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins can update concierge geo caps" ON public.concierge_geo_caps;
CREATE POLICY "Admins can update concierge geo caps"
  ON public.concierge_geo_caps
  AS PERMISSIVE FOR UPDATE
 TO authenticated
  USING (has_role((select auth.uid()), 'admin'::app_role))
  WITH CHECK (has_role((select auth.uid()), 'admin'::app_role));

COMMIT;

-- ─── public.facility_claim_requests (4 policies) ──────────────────────────────
BEGIN;
DROP POLICY IF EXISTS "facility_claim_requests_admin_update" ON public.facility_claim_requests;
CREATE POLICY "facility_claim_requests_admin_update"
  ON public.facility_claim_requests
  AS PERMISSIVE FOR UPDATE
  USING (is_admin((select auth.uid())))
  WITH CHECK (is_admin((select auth.uid())));

DROP POLICY IF EXISTS "facility_claim_requests_claimant_withdraw" ON public.facility_claim_requests;
CREATE POLICY "facility_claim_requests_claimant_withdraw"
  ON public.facility_claim_requests
  AS PERMISSIVE FOR UPDATE
  USING ((((select auth.uid()) = claimant_user_id) AND (status = ANY (ARRAY['pending'::text, 'under_review'::text]))))
  WITH CHECK ((((select auth.uid()) = claimant_user_id) AND (status = 'withdrawn'::text)));

DROP POLICY IF EXISTS "facility_claim_requests_insert" ON public.facility_claim_requests;
CREATE POLICY "facility_claim_requests_insert"
  ON public.facility_claim_requests
  AS PERMISSIVE FOR INSERT
  WITH CHECK (((select auth.uid()) = claimant_user_id));

DROP POLICY IF EXISTS "facility_claim_requests_select" ON public.facility_claim_requests;
CREATE POLICY "facility_claim_requests_select"
  ON public.facility_claim_requests
  AS PERMISSIVE FOR SELECT
  USING ((((select auth.uid()) = claimant_user_id) OR is_admin((select auth.uid()))));

COMMIT;

-- ─── public.facility_match_clusters (1 policy) ──────────────────────────────
BEGIN;
DROP POLICY IF EXISTS "clusters_admin_all" ON public.facility_match_clusters;
CREATE POLICY "clusters_admin_all"
  ON public.facility_match_clusters
  AS PERMISSIVE FOR ALL
 TO authenticated
  USING (is_admin((select auth.uid())))
  WITH CHECK (is_admin((select auth.uid())));

COMMIT;

-- ─── public.facility_reviews (1 policy) ─────────────────────────────────────
BEGIN;
DROP POLICY IF EXISTS "Authenticated users can insert reviews" ON public.facility_reviews;
CREATE POLICY "Authenticated users can insert reviews"
  ON public.facility_reviews
  AS PERMISSIVE FOR INSERT
 TO authenticated
  WITH CHECK ((((select auth.uid()) = user_id) AND (facility_id IN ( SELECT facilities.id
   FROM facilities
  WHERE (facilities.status = 'approved'::text))) AND (NOT user_owns_facility(facility_id, (select auth.uid())))));

COMMIT;

-- ─── public.placement_caps (3 policies) ───────────────────────────────────────
BEGIN;
DROP POLICY IF EXISTS "Admins can delete placement caps" ON public.placement_caps;
CREATE POLICY "Admins can delete placement caps"
  ON public.placement_caps
  AS PERMISSIVE FOR DELETE
 TO authenticated
  USING (has_role((select auth.uid()), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins can insert placement caps" ON public.placement_caps;
CREATE POLICY "Admins can insert placement caps"
  ON public.placement_caps
  AS PERMISSIVE FOR INSERT
 TO authenticated
  WITH CHECK (has_role((select auth.uid()), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins can update placement caps" ON public.placement_caps;
CREATE POLICY "Admins can update placement caps"
  ON public.placement_caps
  AS PERMISSIVE FOR UPDATE
 TO authenticated
  USING (has_role((select auth.uid()), 'admin'::app_role))
  WITH CHECK (has_role((select auth.uid()), 'admin'::app_role));

COMMIT;

-- ─── public.provider_interest (2 policies) ────────────────────────────────────
BEGIN;
DROP POLICY IF EXISTS "Admins can update provider interest" ON public.provider_interest;
CREATE POLICY "Admins can update provider interest"
  ON public.provider_interest
  AS PERMISSIVE FOR UPDATE
 TO authenticated
  USING (is_admin((select auth.uid())))
  WITH CHECK (is_admin((select auth.uid())));

DROP POLICY IF EXISTS "Admins can view provider interest" ON public.provider_interest;
CREATE POLICY "Admins can view provider interest"
  ON public.provider_interest
  AS PERMISSIVE FOR SELECT
 TO authenticated
  USING (is_admin((select auth.uid())));

COMMIT;

-- ─── public.provider_onboarding_state (3 policies) ────────────────────────────
BEGIN;
DROP POLICY IF EXISTS "provider_onboarding_state_owner_insert" ON public.provider_onboarding_state;
CREATE POLICY "provider_onboarding_state_owner_insert"
  ON public.provider_onboarding_state
  AS PERMISSIVE FOR INSERT
  WITH CHECK ((user_id = (select auth.uid())));

DROP POLICY IF EXISTS "provider_onboarding_state_owner_select" ON public.provider_onboarding_state;
CREATE POLICY "provider_onboarding_state_owner_select"
  ON public.provider_onboarding_state
  AS PERMISSIVE FOR SELECT
  USING ((user_id = (select auth.uid())));

DROP POLICY IF EXISTS "provider_onboarding_state_owner_update" ON public.provider_onboarding_state;
CREATE POLICY "provider_onboarding_state_owner_update"
  ON public.provider_onboarding_state
  AS PERMISSIVE FOR UPDATE
  USING ((user_id = (select auth.uid())))
  WITH CHECK ((user_id = (select auth.uid())));

COMMIT;

-- ─── public.saved_searches (4 policies) ───────────────────────────────────────
BEGIN;
DROP POLICY IF EXISTS "Users delete own saved searches" ON public.saved_searches;
CREATE POLICY "Users delete own saved searches"
  ON public.saved_searches
  AS PERMISSIVE FOR DELETE
  USING (((select auth.uid()) = user_id));

DROP POLICY IF EXISTS "Users insert own saved searches" ON public.saved_searches;
CREATE POLICY "Users insert own saved searches"
  ON public.saved_searches
  AS PERMISSIVE FOR INSERT
  WITH CHECK (((select auth.uid()) = user_id));

DROP POLICY IF EXISTS "Users select own saved searches" ON public.saved_searches;
CREATE POLICY "Users select own saved searches"
  ON public.saved_searches
  AS PERMISSIVE FOR SELECT
  USING (((select auth.uid()) = user_id));

DROP POLICY IF EXISTS "Users update own saved searches" ON public.saved_searches;
CREATE POLICY "Users update own saved searches"
  ON public.saved_searches
  AS PERMISSIVE FOR UPDATE
  USING (((select auth.uid()) = user_id))
  WITH CHECK (((select auth.uid()) = user_id));

COMMIT;

-- ─── public.staged_directory (1 policy) ─────────────────────────────────────
BEGIN;
DROP POLICY IF EXISTS "staged_directory_admin_all" ON public.staged_directory;
CREATE POLICY "staged_directory_admin_all"
  ON public.staged_directory
  AS PERMISSIVE FOR ALL
 TO authenticated
  USING (is_admin((select auth.uid())))
  WITH CHECK (is_admin((select auth.uid())));

COMMIT;

-- ─── public.staged_leads (1 policy) ─────────────────────────────────────────
BEGIN;
DROP POLICY IF EXISTS "staged_leads_admin_all" ON public.staged_leads;
CREATE POLICY "staged_leads_admin_all"
  ON public.staged_leads
  AS PERMISSIVE FOR ALL
 TO authenticated
  USING (is_admin((select auth.uid())))
  WITH CHECK (is_admin((select auth.uid())));

COMMIT;

-- ─── public.staged_samhsa (1 policy) ────────────────────────────────────────
BEGIN;
DROP POLICY IF EXISTS "staged_samhsa_admin_all" ON public.staged_samhsa;
CREATE POLICY "staged_samhsa_admin_all"
  ON public.staged_samhsa
  AS PERMISSIVE FOR ALL
 TO authenticated
  USING (is_admin((select auth.uid())))
  WITH CHECK (is_admin((select auth.uid())));

COMMIT;

-- ─── public.user_compare_list (3 policies) ────────────────────────────────────
BEGIN;
DROP POLICY IF EXISTS "Users delete own compare entries" ON public.user_compare_list;
CREATE POLICY "Users delete own compare entries"
  ON public.user_compare_list
  AS PERMISSIVE FOR DELETE
  USING (((select auth.uid()) = user_id));

DROP POLICY IF EXISTS "Users insert own compare entries" ON public.user_compare_list;
CREATE POLICY "Users insert own compare entries"
  ON public.user_compare_list
  AS PERMISSIVE FOR INSERT
  WITH CHECK (((select auth.uid()) = user_id));

DROP POLICY IF EXISTS "Users select own compare list" ON public.user_compare_list;
CREATE POLICY "Users select own compare list"
  ON public.user_compare_list
  AS PERMISSIVE FOR SELECT
  USING (((select auth.uid()) = user_id));

COMMIT;

-- ─── realtime.messages (1 policy) ───────────────────────────────────────────
BEGIN;
DROP POLICY IF EXISTS "Users can only subscribe to own channels" ON realtime.messages;
CREATE POLICY "Users can only subscribe to own channels"
  ON realtime.messages
  AS PERMISSIVE FOR SELECT
 TO authenticated
  USING (((extension = 'presence'::text) OR (topic = ((select auth.uid()))::text) OR (topic ~~ (((select auth.uid()))::text || ':%'::text)) OR (topic ~~ (((select auth.uid()))::text || '-%'::text))));

COMMIT;
