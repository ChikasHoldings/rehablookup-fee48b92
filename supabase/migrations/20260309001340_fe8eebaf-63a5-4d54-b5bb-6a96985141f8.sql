-- Fix concierge_inquiries RLS policies that incorrectly reference auth.users directly (causing permission denied)

-- 1) Helper function: current user's email (safe, does not allow arbitrary lookup)
CREATE OR REPLACE FUNCTION public.current_user_email()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT au.email::text
  FROM auth.users au
  WHERE au.id = auth.uid();
$$;

REVOKE ALL ON FUNCTION public.current_user_email() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.current_user_email() TO authenticated;

-- 2) Replace seeker policies to use the security definer function instead of auth.users
DROP POLICY IF EXISTS "Seekers can view own inquiries" ON public.concierge_inquiries;
DROP POLICY IF EXISTS "Seekers can update own inquiry for confirmation" ON public.concierge_inquiries;

CREATE POLICY "Seekers can view own inquiries"
ON public.concierge_inquiries
FOR SELECT
TO authenticated
USING (
  (user_id = auth.uid())
  OR (user_email = public.current_user_email())
);

CREATE POLICY "Seekers can update own inquiry for confirmation"
ON public.concierge_inquiries
FOR UPDATE
TO authenticated
USING (
  (user_id = auth.uid())
  OR (user_email = public.current_user_email())
)
WITH CHECK (
  (user_id = auth.uid())
  OR (user_email = public.current_user_email())
);

-- 3) Ensure authenticated seekers can create their own inquiries (required for the concierge flow)
DROP POLICY IF EXISTS "Seekers can create own inquiries" ON public.concierge_inquiries;
CREATE POLICY "Seekers can create own inquiries"
ON public.concierge_inquiries
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()
);
