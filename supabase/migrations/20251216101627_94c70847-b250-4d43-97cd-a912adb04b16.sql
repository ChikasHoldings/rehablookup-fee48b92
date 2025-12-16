-- Fix the security definer view warning by recreating as a regular view
-- The view should inherit RLS from the underlying facilities table

-- Drop the existing view
DROP VIEW IF EXISTS public.public_facilities;

-- Recreate as a simple view (not security definer) 
-- This view will respect the RLS policies on the facilities table
CREATE VIEW public.public_facilities AS
SELECT 
  id,
  name,
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
  slug,
  status,
  featured,
  featured_pinned,
  verified,
  last_featured_shown_at,
  created_at,
  updated_at,
  reply_email,
  reply_email_verified,
  reply_email_verified_at
FROM public.facilities
WHERE status = 'approved' AND (suspended IS NULL OR suspended = false);

-- Grant access
GRANT SELECT ON public.public_facilities TO anon;
GRANT SELECT ON public.public_facilities TO authenticated;