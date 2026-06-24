-- Staff-roster read tiering (follow-up #2), phase 2 of 2 (contract): tighten the
-- admin_user_profiles SELECT so lower tiers (customer_rep, advisor) can read
-- only their OWN row. super_admin / manager retain full read (they are the
-- oversight tiers — ManagerDashboard/ManagerTeamPerformance legitimately read
-- the team's status/employment_type). This stops a lower-tier admin from
-- reading OTHER admins' commission_rate / employment_type / hire_date /
-- last_login_at / mfa flags / phone via direct PostgREST or realtime.
--
-- Name resolution for OTHER admins (assignee dropdowns, "assigned to <name>",
-- audit actor names) now goes through the get_admin_directory() RPC added in
-- phase 1 (20260829003400), which returns only non-sensitive identity columns —
-- so this tightening does not break those UIs.
--
-- ORDERING: this migration is applied to the live DB only AFTER the frontend
-- that reads get_admin_directory() is deployed. Applying it before that would
-- break the previously-deployed frontend's direct identity reads for lower
-- tiers (expand-then-contract). The file is committed in the same PR for
-- migration-history reproducibility.
DROP POLICY IF EXISTS admin_user_profiles_select_consolidated ON public.admin_user_profiles;

CREATE POLICY admin_user_profiles_select_consolidated
  ON public.admin_user_profiles
  FOR SELECT
  TO authenticated
  USING (
    public.can_moderate_users((SELECT auth.uid()))
    OR ((SELECT auth.uid()) = user_id)
  );
