-- Fix the SECURITY DEFINER view issue by using SECURITY INVOKER instead
-- This ensures the view uses the permissions of the querying user

-- Drop and recreate with SECURITY INVOKER (default, but being explicit)
DROP VIEW IF EXISTS public.public_facilities;

CREATE VIEW public.public_facilities 
WITH (security_invoker = on) AS
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