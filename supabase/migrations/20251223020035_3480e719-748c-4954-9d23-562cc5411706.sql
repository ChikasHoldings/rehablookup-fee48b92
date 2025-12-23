-- Fix 1: Restrict seeker_profiles to only allow users to view their own profile
-- Drop the existing public policy and create a proper one
DROP POLICY IF EXISTS "Users can view their own seeker profile" ON public.seeker_profiles;
DROP POLICY IF EXISTS "Anyone can view seeker profiles" ON public.seeker_profiles;
DROP POLICY IF EXISTS "Public can view seeker profiles" ON public.seeker_profiles;

-- Users can only view their own profile
CREATE POLICY "Users can view their own seeker profile" 
ON public.seeker_profiles 
FOR SELECT 
USING (auth.uid() = user_id);

-- Fix 2: Create a public facilities view that excludes sensitive data
-- First, drop the existing public view if it exists
DROP VIEW IF EXISTS public.public_facilities;

-- Create a secure public view for facilities
CREATE VIEW public.public_facilities AS
SELECT 
  id,
  name,
  slug,
  address,
  city,
  state,
  zip_code,
  phone,
  email,
  website,
  description,
  facility_type,
  bed_count,
  gender_served,
  logo_url,
  gallery_urls,
  featured,
  featured_pinned,
  last_featured_shown_at,
  verified,
  year_established,
  status,
  created_at,
  updated_at
FROM public.facilities
WHERE status = 'approved';

-- Grant access to the view
GRANT SELECT ON public.public_facilities TO anon, authenticated;

-- Fix 3: Update facility_views to restrict public access
-- Drop overly permissive policy
DROP POLICY IF EXISTS "Anyone can view counts of approved facilities" ON public.facility_views;

-- Only facility owners and admins can view facility view counts
-- The existing "Owners can view their facility counts" policy already covers owners
-- Add admin access
CREATE POLICY "Admins can view all facility views" 
ON public.facility_views 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Fix 4: Enable leaked password protection (handled via auth config)
-- This requires using the configure-auth tool, not SQL