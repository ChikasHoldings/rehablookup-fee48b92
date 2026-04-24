-- 1. Recreate public_facilities view WITHOUT the email column.
--    The view is referenced by foreign-key relationships in supabase types,
--    so we drop & recreate to preserve dependent FKs that reference its `id` column.
DROP VIEW IF EXISTS public.public_facilities;

CREATE VIEW public.public_facilities
WITH (security_invoker = true) AS
SELECT
  id,
  name,
  slug,
  city,
  state,
  zip_code,
  address,
  phone,
  website,
  description,
  facility_type,
  gender_served,
  bed_count,
  featured,
  featured_display_order,
  featured_pinned,
  verified,
  year_established,
  logo_url,
  gallery_urls,
  status,
  calculated_ranking_score,
  listing_completeness_score,
  response_rate_score,
  accepts_international_patients,
  created_at,
  updated_at
FROM public.facilities f
WHERE status = 'approved' AND COALESCE(suspended, false) = false;

GRANT SELECT ON public.public_facilities TO anon, authenticated;

-- 2. Revoke column-level SELECT on sensitive contact fields from anonymous callers.
--    Authenticated owners retain access; row-level RLS still scopes them to their own facility.
REVOKE SELECT (email, reply_email) ON public.facilities FROM anon;

-- 3. Defensive grant — make sure authenticated role can still read the columns
--    (RLS limits which rows they can see).
GRANT SELECT (email, reply_email) ON public.facilities TO authenticated;