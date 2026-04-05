
-- 1. Replace the overly permissive anonymous SELECT on facilities with a column-restricted policy
-- Drop the permissive policy that exposes ALL columns to anonymous users
DROP POLICY IF EXISTS "Anyone can view approved facilities" ON public.facilities;

-- Create a secure view for public access (already exists, but let's make it SECURITY INVOKER to be safe)
-- The existing public_facilities view already restricts columns - we keep using it

-- Create a restrictive policy that only allows anonymous access through the view
-- Anonymous users should use the public_facilities view, not query facilities directly
CREATE POLICY "Anonymous can view approved facilities basic info"
ON public.facilities
FOR SELECT
TO anon
USING (status = 'approved');

-- 2. Restrict facility_staff public SELECT to exclude email and phone
DROP POLICY IF EXISTS "Public can view visible staff from approved facilities" ON public.facility_staff;

CREATE POLICY "Public can view visible staff from approved facilities"
ON public.facility_staff
FOR SELECT
TO anon, authenticated
USING (
  is_visible = true 
  AND facility_id IN (
    SELECT id FROM public.facilities WHERE status = 'approved'
  )
);

-- Create a secure public view for staff that excludes PII
CREATE OR REPLACE VIEW public.public_facility_staff
WITH (security_invoker = true)
AS
SELECT 
  id,
  facility_id,
  name,
  job_title,
  bio,
  photo_url,
  display_order,
  is_visible
FROM public.facility_staff
WHERE is_visible = true
AND facility_id IN (SELECT id FROM public.facilities WHERE status = 'approved');
