-- Create a function to get user emails for admin purposes
CREATE OR REPLACE FUNCTION public.get_seeker_emails_for_admin()
RETURNS TABLE(user_id uuid, email text)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT au.id as user_id, au.email::text
  FROM auth.users au
  WHERE EXISTS (
    SELECT 1 FROM public.seeker_profiles sp WHERE sp.user_id = au.id
  );
$$;

-- Grant execute to authenticated users (admin check will be done in code)
GRANT EXECUTE ON FUNCTION public.get_seeker_emails_for_admin() TO authenticated;