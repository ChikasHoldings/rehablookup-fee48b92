-- Fix seeker_profiles public exposure vulnerability
-- Drop the overly permissive public SELECT policy
DROP POLICY IF EXISTS "Anyone can view seeker display names" ON public.seeker_profiles;

-- Keep existing owner policy: "Users can view their own seeker profile" (already exists with auth.uid() = user_id)
-- Keep existing owner policies for INSERT and UPDATE (already properly restricted)

-- Add policy for admins to view all seeker profiles
CREATE POLICY "Admins can view all seeker profiles"
ON public.seeker_profiles
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));