
-- Create a security definer function to check email verification status
-- This bypasses RLS on email_verification_codes (which is service_role only)
CREATE OR REPLACE FUNCTION public.is_email_verified(p_email text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.email_verification_codes
    WHERE email = LOWER(p_email)
    AND verified = true
  );
$$;
