
-- Create a security-definer function to list all admin users with their email
-- This is needed because admin users created via the create-admin-user edge function
-- may not have a row in the public.profiles table, but always have an auth.users entry
-- and an admin_user_profiles entry.

CREATE OR REPLACE FUNCTION public.get_admin_users_list()
RETURNS TABLE(
  user_id uuid,
  email text,
  first_name text,
  last_name text,
  display_name text,
  avatar_url text,
  admin_role text,
  status text,
  last_login_at timestamptz,
  force_password_change boolean,
  mfa_enabled boolean,
  mfa_skip boolean,
  created_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    aup.user_id,
    COALESCE(p.email, au.email) AS email,
    COALESCE(aup.first_name, p.first_name) AS first_name,
    COALESCE(aup.last_name, p.last_name) AS last_name,
    aup.display_name,
    aup.avatar_url,
    aup.admin_role::text,
    aup.status,
    aup.last_login_at,
    COALESCE(aup.force_password_change, false) AS force_password_change,
    COALESCE(aup.mfa_enabled, false) AS mfa_enabled,
    COALESCE(aup.mfa_skip, false) AS mfa_skip,
    aup.created_at
  FROM public.admin_user_profiles aup
  INNER JOIN public.user_roles ur ON ur.user_id = aup.user_id AND ur.role = 'admin'
  LEFT JOIN public.profiles p ON p.user_id = aup.user_id
  LEFT JOIN auth.users au ON au.id = aup.user_id
  WHERE has_role(auth.uid(), 'admin')
  ORDER BY aup.created_at DESC;
$$;

COMMENT ON FUNCTION public.get_admin_users_list IS 'Returns all admin users with email resolved from profiles or auth.users. Requires caller to be admin.';
