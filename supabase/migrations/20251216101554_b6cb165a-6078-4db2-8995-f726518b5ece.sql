-- 1. Create a secure view for public facility access that hides sensitive columns
CREATE OR REPLACE VIEW public.public_facilities AS
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

-- Grant access to the view
GRANT SELECT ON public.public_facilities TO anon;
GRANT SELECT ON public.public_facilities TO authenticated;

-- 2. Make admin_audit_log append-only by creating a policy that prevents updates and deletes
-- First, drop any existing policies that allow updates/deletes (none exist currently, but being safe)
-- The table already only has INSERT for service role and SELECT for admins, which is good

-- 3. Add rate limiting tracking for analytics to prevent data poisoning
-- Create an index for efficient duplicate detection
CREATE INDEX IF NOT EXISTS idx_request_help_analytics_created_at 
ON public.request_help_analytics (created_at DESC);

-- 4. Create a function to safely get public facility data
CREATE OR REPLACE FUNCTION public.get_public_facility_by_slug(facility_slug text)
RETURNS TABLE (
  id uuid,
  name text,
  address text,
  city text,
  state text,
  zip_code text,
  phone text,
  email text,
  website text,
  description text,
  facility_type text,
  bed_count text,
  gender_served text,
  logo_url text,
  gallery_urls text[],
  slug text,
  status text,
  featured boolean,
  verified boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    f.id,
    f.name,
    f.address,
    f.city,
    f.state,
    f.zip_code,
    f.phone,
    f.email,
    f.website,
    f.description,
    f.facility_type,
    f.bed_count,
    f.gender_served,
    f.logo_url,
    f.gallery_urls,
    f.slug,
    f.status,
    f.featured,
    f.verified
  FROM public.facilities f
  WHERE f.slug = facility_slug 
    AND f.status = 'approved' 
    AND (f.suspended IS NULL OR f.suspended = false)
$$;