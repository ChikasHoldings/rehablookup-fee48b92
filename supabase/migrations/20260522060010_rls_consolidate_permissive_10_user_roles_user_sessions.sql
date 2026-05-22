-- Batch 10/11 — consolidate multi-permissive RLS policies.
-- Tables: public.user_roles, public.user_sessions
--
-- Strategy: drop service_role-only policies (no-op; service_role
-- bypasses RLS). For the remaining active policies in each (table,
-- command) group, OR them into a single PERMISSIVE policy with the
-- broadest role binding from the group. PostgreSQL OR-combines
-- multiple permissive policies anyway, so this is behavior-preserving
-- but eliminates the per-row planner overhead of evaluating each.

-- public.user_roles • SELECT (2 policies; 0 service_role-only dropped, 2 active)
DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can read own role" ON public.user_roles;
CREATE POLICY "user_roles_select_consolidated"
  ON public.user_roles
  AS PERMISSIVE FOR SELECT
  TO authenticated
  USING ((has_role(( SELECT auth.uid() AS uid), 'admin'::app_role)) OR ((user_id = ( SELECT auth.uid() AS uid))));

-- public.user_sessions • INSERT (2 policies; 1 service_role-only dropped, 1 active)
DROP POLICY IF EXISTS "Service role can insert sessions" ON public.user_sessions;
-- (kept 'Users can insert their own sessions' unchanged)
