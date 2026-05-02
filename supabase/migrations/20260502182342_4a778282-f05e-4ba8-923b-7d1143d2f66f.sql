-- Hide facility owner contact emails from anonymous public visitors.
-- The "Anon can read approved facilities for public view" RLS policy returns
-- approved rows to the `anon` role, but RLS does not filter columns. We use
-- column-level GRANTs to restrict which columns `anon` can read.
--
-- After this change:
--   * `anon` keeps SELECT on every column EXCEPT `email` and `reply_email`.
--   * `authenticated` retains full column SELECT (owner/admin RLS still gates rows).
--   * `service_role` is unaffected.

-- Drop blanket SELECT, then grant SELECT on every column individually except
-- the two sensitive ones. Using explicit columns keeps this future-proof
-- against new sensitive columns being added without review.
REVOKE SELECT ON public.facilities FROM anon;

GRANT SELECT (
  id,
  user_id,
  name,
  slug,
  address,
  city,
  state,
  zip_code,
  phone,
  website,
  description,
  facility_type,
  gender_served,
  bed_count,
  status,
  featured,
  verified,
  suspended,
  logo_url,
  gallery_urls,
  year_established,
  accepts_international_patients,
  concierge_network_opted_in,
  concierge_availability_status,
  concierge_admissions_contact,
  concierge_admissions_email,
  concierge_admissions_phone,
  concierge_terms_accepted_at,
  reply_email_verified,
  reply_email_verified_at,
  admin_notes,
  created_at,
  updated_at
) ON public.facilities TO anon;
-- NOTE: `email` and `reply_email` are intentionally omitted above so the
-- anon role cannot read facility owner contact addresses.

-- Make sure authenticated users keep full visibility (RLS still enforces
-- which rows they can read — owner-only or admin via has_role()).
GRANT SELECT ON public.facilities TO authenticated;