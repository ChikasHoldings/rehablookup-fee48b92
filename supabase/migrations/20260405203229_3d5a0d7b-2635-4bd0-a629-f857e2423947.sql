
-- Fix the SECURITY DEFINER view warning by recreating public_facilities as SECURITY INVOKER
CREATE OR REPLACE VIEW public.public_facilities
WITH (security_invoker = true)
AS
SELECT 
  id,
  name,
  slug,
  address,
  city,
  state,
  zip_code,
  phone,
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
