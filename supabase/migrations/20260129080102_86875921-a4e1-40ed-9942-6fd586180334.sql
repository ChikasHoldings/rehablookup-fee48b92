-- Remove email and website from public_facilities view for privacy
-- Only Pro members should see phone/website via frontend conditional logic

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
  phone,  -- Keep phone in view, but frontend will hide for non-Pro
  -- email removed completely for privacy
  -- website removed completely for privacy  
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
FROM facilities
WHERE status = 'approved';

-- Grant access to the view
GRANT SELECT ON public.public_facilities TO anon, authenticated;

COMMENT ON VIEW public.public_facilities IS 'Public facility data with email/website excluded for privacy - phone/website visibility controlled by frontend based on Pro status';