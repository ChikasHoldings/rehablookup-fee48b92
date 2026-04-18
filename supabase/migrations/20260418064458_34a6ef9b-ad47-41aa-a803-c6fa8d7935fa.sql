-- Recreate public_facilities view with definer-style access (no security_invoker)
-- and grant public read access. The base `facilities` table remains protected by RLS;
-- the view exposes only non-sensitive columns of approved/active facilities.

DROP VIEW IF EXISTS public.public_facilities CASCADE;

CREATE VIEW public.public_facilities AS
SELECT
  f.id,
  f.name,
  f.slug,
  f.city,
  f.state,
  f.zip_code,
  f.address,
  f.phone,
  f.website,
  f.email,
  f.description,
  f.facility_type,
  f.gender_served,
  f.bed_count,
  f.featured,
  f.featured_display_order,
  f.featured_pinned,
  f.verified,
  f.year_established,
  f.logo_url,
  f.gallery_urls,
  f.status,
  f.calculated_ranking_score,
  f.listing_completeness_score,
  f.response_rate_score,
  f.accepts_international_patients,
  f.created_at,
  f.updated_at
FROM public.facilities f
WHERE f.status = 'approved'
  AND COALESCE(f.suspended, false) = false;

ALTER VIEW public.public_facilities OWNER TO postgres;

GRANT SELECT ON public.public_facilities TO anon, authenticated;