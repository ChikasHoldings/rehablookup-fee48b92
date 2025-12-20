-- Fix Security Definer View issue by recreating without SECURITY DEFINER
-- The view should use invoker's permissions with RLS

DROP VIEW IF EXISTS public.public_facilities;

CREATE VIEW public.public_facilities 
WITH (security_invoker = true)
AS
SELECT 
  f.id,
  f.name,
  f.slug,
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
  f.featured,
  f.featured_pinned,
  f.last_featured_shown_at,
  f.verified,
  f.reply_email,
  f.reply_email_verified,
  f.reply_email_verified_at,
  f.status,
  f.created_at,
  f.updated_at
FROM public.facilities f
WHERE f.status = 'approved';

-- Re-grant access
GRANT SELECT ON public.public_facilities TO anon, authenticated;

COMMENT ON VIEW public.public_facilities IS 'Public-facing facility data with security_invoker enabled - uses RLS of querying user';