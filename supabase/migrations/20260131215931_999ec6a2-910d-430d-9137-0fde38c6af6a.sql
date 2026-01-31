-- Add RPC function to detect if an email belongs to an admin user
CREATE OR REPLACE FUNCTION public.is_email_admin(p_email text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN auth.users u ON ur.user_id = u.id
    WHERE LOWER(u.email) = LOWER(p_email) AND ur.role = 'admin'
  );
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.is_email_admin(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_email_admin(text) TO anon;