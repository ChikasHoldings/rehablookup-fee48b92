-- Provider team / RBAC — phase 2: extend facility access to team members.
--
-- ADDITIVE strategy: existing owner/admin policies are left untouched, so
-- owners behave exactly as before (zero regression risk). We only ADD
-- permissive policies that grant team members access via the
-- role-aware helpers from phase 1:
--   • user_can_access_facility(fid, uid)  → owner OR active member  → READ
--   • user_can_edit_facility(fid, uid)     → owner OR manager        → WRITE
-- Permissive policies OR together, and the helpers are scoped to active
-- membership of THAT facility, so this cannot widen access beyond the
-- member's own facilities.
--
-- Billing (facility_subscriptions), team management
-- (facility_team_members), and facility create/delete are deliberately
-- NOT extended — those stay owner-only on their existing policies.

-- ─── facilities: members can SEE; owner+manager can UPDATE ───────────
DROP POLICY IF EXISTS facilities_team_select ON public.facilities;
CREATE POLICY facilities_team_select ON public.facilities
  FOR SELECT TO authenticated
  USING (public.user_can_access_facility(id, (SELECT auth.uid())));

DROP POLICY IF EXISTS facilities_team_update ON public.facilities;
CREATE POLICY facilities_team_update ON public.facilities
  FOR UPDATE TO authenticated
  USING (public.user_can_edit_facility(id, (SELECT auth.uid())))
  WITH CHECK (public.user_can_edit_facility(id, (SELECT auth.uid())));

-- ─── leads: members can SEE; owner+manager can UPDATE (status/notes) ─
DROP POLICY IF EXISTS leads_team_select ON public.leads;
CREATE POLICY leads_team_select ON public.leads
  FOR SELECT TO authenticated
  USING (public.user_can_access_facility(facility_id, (SELECT auth.uid())));

DROP POLICY IF EXISTS leads_team_update ON public.leads;
CREATE POLICY leads_team_update ON public.leads
  FOR UPDATE TO authenticated
  USING (public.user_can_edit_facility(facility_id, (SELECT auth.uid())))
  WITH CHECK (public.user_can_edit_facility(facility_id, (SELECT auth.uid())));

-- ─── Content tables: members read; owner+manager full CRUD ──────────
-- Applied uniformly to every facility_id-keyed content table.
DO $$
DECLARE
  t text;
  content_tables text[] := ARRAY[
    'facility_staff',
    'facility_programs',
    'facility_amenities',
    'facility_accreditations',
    'facility_services',
    'facility_insurance',
    'facility_age_groups',
    'facility_credentials'
  ];
BEGIN
  FOREACH t IN ARRAY content_tables LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_team_select', t);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (public.user_can_access_facility(facility_id, (SELECT auth.uid())))',
      t || '_team_select', t
    );
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_team_cud', t);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR ALL TO authenticated USING (public.user_can_edit_facility(facility_id, (SELECT auth.uid()))) WITH CHECK (public.user_can_edit_facility(facility_id, (SELECT auth.uid())))',
      t || '_team_cud', t
    );
  END LOOP;
END$$;

-- ─── Review responses: owner+manager can respond ────────────────────
-- (review_responses is facility_id-keyed.)
DROP POLICY IF EXISTS review_responses_team_cud ON public.review_responses;
CREATE POLICY review_responses_team_cud ON public.review_responses
  FOR ALL TO authenticated
  USING (public.user_can_edit_facility(facility_id, (SELECT auth.uid())))
  WITH CHECK (public.user_can_edit_facility(facility_id, (SELECT auth.uid())));
