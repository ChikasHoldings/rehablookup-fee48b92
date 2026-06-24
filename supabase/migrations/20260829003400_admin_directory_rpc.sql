-- Staff-roster read tiering (follow-up #2), phase 1 of 2 (expand): add a
-- non-sensitive admin directory RPC.
--
-- admin_user_profiles SELECT is coarse `has_role('admin') OR self`, so every
-- admin tier can read EVERY staff row — including commission_rate (advisor pay),
-- employment_type, and hire_date — via direct PostgREST/realtime. We want to
-- tighten that so a lower tier reads only its OWN sensitive row. The blocker is
-- that many UI surfaces resolve OTHER admins' display names (assignee dropdowns,
-- "assigned to <name>", audit actor names) and every tier needs that.
--
-- This RPC returns only NON-sensitive identity/operational columns (no
-- commission_rate / employment_type / hire_date / last_login_at / mfa / phone)
-- for the whole admin directory, to any active admin. Frontend name-resolution
-- readers reached by lower tiers are repointed at this RPC; THEN (phase 2, a
-- separate migration applied only after the rewired frontend ships) the table
-- SELECT policy is tightened.
CREATE OR REPLACE FUNCTION public.get_admin_directory()
RETURNS TABLE (
  user_id uuid,
  first_name text,
  last_name text,
  display_name text,
  avatar_url text,
  admin_role admin_role_type,
  status text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  -- Self-gate: only admins get the directory. The predicate is constant per
  -- call, so a non-admin caller receives zero rows.
  SELECT aup.user_id, aup.first_name, aup.last_name, aup.display_name,
         aup.avatar_url, aup.admin_role, aup.status
  FROM public.admin_user_profiles aup
  WHERE public.user_is_admin((SELECT auth.uid()));
$$;

REVOKE ALL ON FUNCTION public.get_admin_directory() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_admin_directory() TO authenticated;
