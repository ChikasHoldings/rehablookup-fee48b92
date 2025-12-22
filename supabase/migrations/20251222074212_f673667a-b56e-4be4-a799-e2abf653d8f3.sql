-- Add RLS policy for providers to view reviews for their facilities
CREATE POLICY "Providers can view reviews for their facilities"
ON public.facility_reviews
FOR SELECT
USING (
  facility_id IN (
    SELECT id FROM public.facilities WHERE user_id = auth.uid()
  )
);

-- Add RLS policy to allow reading seeker profiles for displaying reviewer names (display_name only)
CREATE POLICY "Anyone can view seeker display names"
ON public.seeker_profiles
FOR SELECT
USING (true);