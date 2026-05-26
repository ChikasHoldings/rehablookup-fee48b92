-- review_disputes was the only facility-scoped content table missing
-- team-aware RLS. Managers can edit listings (facilities_team_update) and
-- respond to reviews (review_responses_team_cud), but review_disputes had
-- only owner-only SELECT + INSERT policies — so a manager couldn't see or
-- file a review dispute on a facility they manage: the dispute action
-- errored and existing disputes were hidden.
--
-- Add team-aware SELECT (owner/manager/viewer read) + INSERT (owner/manager
-- file, recorded as themselves), mirroring the *_team_* pattern used across
-- the other facility-content tables. UPDATE/DELETE stay admin-only — admins
-- resolve disputes, providers only raise and view them.

DROP POLICY IF EXISTS review_disputes_team_select ON public.review_disputes;
CREATE POLICY review_disputes_team_select ON public.review_disputes
  FOR SELECT TO authenticated
  USING (public.user_can_access_facility(facility_id, (SELECT auth.uid())));

DROP POLICY IF EXISTS review_disputes_team_insert ON public.review_disputes;
CREATE POLICY review_disputes_team_insert ON public.review_disputes
  FOR INSERT TO authenticated
  WITH CHECK (
    public.user_can_edit_facility(facility_id, (SELECT auth.uid()))
    AND disputed_by = (SELECT auth.uid())
  );
