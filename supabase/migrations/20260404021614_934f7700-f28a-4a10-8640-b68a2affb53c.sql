-- Drop old overly-permissive policies on admin_user_permissions
DROP POLICY IF EXISTS "Admins can insert permissions" ON public.admin_user_permissions;
DROP POLICY IF EXISTS "Admins can update permissions" ON public.admin_user_permissions;
DROP POLICY IF EXISTS "Admins can delete permissions" ON public.admin_user_permissions;

-- Only super admins can manage permissions (prevents privilege escalation)
CREATE POLICY "Super admins can insert permissions"
  ON public.admin_user_permissions FOR INSERT
  TO public
  WITH CHECK (public.is_super_admin(auth.uid()));

CREATE POLICY "Super admins can update permissions"
  ON public.admin_user_permissions FOR UPDATE
  TO public
  USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Super admins can delete permissions"
  ON public.admin_user_permissions FOR DELETE
  TO public
  USING (public.is_super_admin(auth.uid()));

-- Tighten admin_user_profiles: only super admins can create/delete admin profiles
DROP POLICY IF EXISTS "Admins can insert admin profiles" ON public.admin_user_profiles;
DROP POLICY IF EXISTS "Admins can delete admin profiles" ON public.admin_user_profiles;
DROP POLICY IF EXISTS "Admins can update admin profiles" ON public.admin_user_profiles;

CREATE POLICY "Super admins can insert admin profiles"
  ON public.admin_user_profiles FOR INSERT
  TO public
  WITH CHECK (public.is_super_admin(auth.uid()));

CREATE POLICY "Super admins can delete admin profiles"
  ON public.admin_user_profiles FOR DELETE
  TO public
  USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Super admins can update admin profiles"
  ON public.admin_user_profiles FOR UPDATE
  TO public
  USING (public.is_super_admin(auth.uid()));