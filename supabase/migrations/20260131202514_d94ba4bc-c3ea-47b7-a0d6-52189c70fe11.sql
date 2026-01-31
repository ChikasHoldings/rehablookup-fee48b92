-- Create a secure function to get admin profile data including name fields
CREATE OR REPLACE FUNCTION public.get_admin_profile(p_user_id uuid)
RETURNS TABLE(
  user_id uuid,
  first_name text,
  last_name text,
  display_name text,
  avatar_url text,
  admin_role admin_role_type,
  status text,
  force_password_change boolean,
  mfa_enabled boolean,
  mfa_skip boolean
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT 
    aup.user_id,
    aup.first_name,
    aup.last_name,
    aup.display_name,
    aup.avatar_url,
    aup.admin_role,
    aup.status,
    aup.force_password_change,
    aup.mfa_enabled,
    aup.mfa_skip
  FROM public.admin_user_profiles aup
  WHERE aup.user_id = p_user_id;
$$;