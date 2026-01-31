
-- First, clean up duplicate accounts where user has both provider profile AND seeker profile
-- Delete seeker profiles for users who are providers
DELETE FROM public.seeker_profiles 
WHERE user_id IN (
  SELECT user_id FROM public.profiles
);

-- Delete seeker role for users who are providers  
DELETE FROM public.user_roles 
WHERE role = 'seeker' 
AND user_id IN (
  SELECT user_id FROM public.profiles
);

-- Update the handle_new_seeker function to check for profiles table
-- This prevents auto-creating seeker accounts for provider signups
CREATE OR REPLACE FUNCTION public.handle_new_seeker()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- DO NOT auto-create seeker profiles anymore
  -- Seeker profiles should only be created explicitly through the seeker signup flow
  -- This prevents providers from accidentally getting seeker accounts
  RETURN NEW;
END;
$$;

-- Create a function to check if email is already registered as a provider
CREATE OR REPLACE FUNCTION public.is_email_provider(p_email text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    JOIN auth.users u ON p.user_id = u.id
    WHERE u.email = p_email
  );
$$;

-- Create a function to check if email is already registered as a seeker
CREATE OR REPLACE FUNCTION public.is_email_seeker(p_email text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.seeker_profiles sp
    JOIN auth.users u ON sp.user_id = u.id
    WHERE u.email = p_email
  );
$$;

-- Grant execute permissions to anon and authenticated for email checks
GRANT EXECUTE ON FUNCTION public.is_email_provider(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_email_seeker(text) TO anon, authenticated;
