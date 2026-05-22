-- Batch 1/11 — consolidate multi-permissive RLS policies.
-- Tables: public.account_activity_log, public.addon_waitlist, public.admin_audit_log, public.admin_user_permissions, public.admin_user_profiles
--
-- Strategy: drop service_role-only policies (no-op; service_role
-- bypasses RLS). For the remaining active policies in each (table,
-- command) group, OR them into a single PERMISSIVE policy with the
-- broadest role binding from the group. PostgreSQL OR-combines
-- multiple permissive policies anyway, so this is behavior-preserving
-- but eliminates the per-row planner overhead of evaluating each.

-- public.account_activity_log • SELECT (2 policies; 0 service_role-only dropped, 2 active)
DROP POLICY IF EXISTS "Admins can view all activity logs" ON public.account_activity_log;
DROP POLICY IF EXISTS "Users can view their own activity" ON public.account_activity_log;
CREATE POLICY "account_activity_log_select_consolidated"
  ON public.account_activity_log
  AS PERMISSIVE FOR SELECT
  USING ((has_role(( SELECT auth.uid() AS uid), 'admin'::app_role)) OR ((( SELECT auth.uid() AS uid) = user_id)));

-- public.addon_waitlist • SELECT (2 policies; 0 service_role-only dropped, 2 active)
DROP POLICY IF EXISTS "Admins can view all waitlist entries" ON public.addon_waitlist;
DROP POLICY IF EXISTS "Providers can view their own waitlist entries" ON public.addon_waitlist;
CREATE POLICY "addon_waitlist_select_consolidated"
  ON public.addon_waitlist
  AS PERMISSIVE FOR SELECT
  TO authenticated
  USING ((has_role(( SELECT auth.uid() AS uid), 'admin'::app_role)) OR ((requested_by = ( SELECT auth.uid() AS uid))));

-- public.addon_waitlist • UPDATE (2 policies; 0 service_role-only dropped, 2 active)
DROP POLICY IF EXISTS "Admins can update any waitlist entry" ON public.addon_waitlist;
DROP POLICY IF EXISTS "Providers can cancel their own waitlist entries" ON public.addon_waitlist;
CREATE POLICY "addon_waitlist_update_consolidated"
  ON public.addon_waitlist
  AS PERMISSIVE FOR UPDATE
  TO authenticated
  USING ((has_role(( SELECT auth.uid() AS uid), 'admin'::app_role)) OR (((requested_by = ( SELECT auth.uid() AS uid)) AND (status = ANY (ARRAY['waiting'::text, 'invited'::text])))))
  WITH CHECK ((has_role(( SELECT auth.uid() AS uid), 'admin'::app_role)) OR (((requested_by = ( SELECT auth.uid() AS uid)) AND (status = 'canceled'::text))));

-- public.admin_audit_log • INSERT (2 policies; 1 service_role-only dropped, 1 active)
DROP POLICY IF EXISTS "Service role can insert audit entries" ON public.admin_audit_log;
-- (kept 'Admins can insert own audit logs' unchanged)

-- public.admin_user_permissions • SELECT (2 policies; 0 service_role-only dropped, 2 active)
DROP POLICY IF EXISTS "Admins can view all permissions" ON public.admin_user_permissions;
DROP POLICY IF EXISTS "Users can view their own permissions" ON public.admin_user_permissions;
CREATE POLICY "admin_user_permissions_select_consolidated"
  ON public.admin_user_permissions
  AS PERMISSIVE FOR SELECT
  USING ((has_role(( SELECT auth.uid() AS uid), 'admin'::app_role)) OR ((( SELECT auth.uid() AS uid) = user_id)));

-- public.admin_user_profiles • SELECT (2 policies; 0 service_role-only dropped, 2 active)
DROP POLICY IF EXISTS "Admins can view all admin profiles" ON public.admin_user_profiles;
DROP POLICY IF EXISTS "Users can view their own admin profile" ON public.admin_user_profiles;
CREATE POLICY "admin_user_profiles_select_consolidated"
  ON public.admin_user_profiles
  AS PERMISSIVE FOR SELECT
  USING ((has_role(( SELECT auth.uid() AS uid), 'admin'::app_role)) OR ((( SELECT auth.uid() AS uid) = user_id)));

-- public.admin_user_profiles • UPDATE (2 policies; 0 service_role-only dropped, 2 active)
DROP POLICY IF EXISTS "Super admins can update admin profiles" ON public.admin_user_profiles;
DROP POLICY IF EXISTS "Users can update their own admin profile" ON public.admin_user_profiles;
CREATE POLICY "admin_user_profiles_update_consolidated"
  ON public.admin_user_profiles
  AS PERMISSIVE FOR UPDATE
  USING ((is_super_admin(( SELECT auth.uid() AS uid))) OR ((( SELECT auth.uid() AS uid) = user_id)))
  WITH CHECK ((is_super_admin(( SELECT auth.uid() AS uid))) OR (((( SELECT auth.uid() AS uid) = user_id) AND (NOT (status IS DISTINCT FROM ( SELECT aup.status
   FROM admin_user_profiles aup
  WHERE (aup.user_id = ( SELECT auth.uid() AS uid))))) AND (NOT (admin_role IS DISTINCT FROM ( SELECT aup.admin_role
   FROM admin_user_profiles aup
  WHERE (aup.user_id = ( SELECT auth.uid() AS uid))))) AND (NOT (mfa_skip IS DISTINCT FROM ( SELECT aup.mfa_skip
   FROM admin_user_profiles aup
  WHERE (aup.user_id = ( SELECT auth.uid() AS uid))))) AND (NOT (mfa_enabled IS DISTINCT FROM ( SELECT aup.mfa_enabled
   FROM admin_user_profiles aup
  WHERE (aup.user_id = ( SELECT auth.uid() AS uid))))) AND (NOT (force_password_change IS DISTINCT FROM ( SELECT aup.force_password_change
   FROM admin_user_profiles aup
  WHERE (aup.user_id = ( SELECT auth.uid() AS uid))))) AND (NOT (temp_password_hash IS DISTINCT FROM ( SELECT aup.temp_password_hash
   FROM admin_user_profiles aup
  WHERE (aup.user_id = ( SELECT auth.uid() AS uid))))) AND (NOT (temp_password_expires_at IS DISTINCT FROM ( SELECT aup.temp_password_expires_at
   FROM admin_user_profiles aup
  WHERE (aup.user_id = ( SELECT auth.uid() AS uid))))))));
