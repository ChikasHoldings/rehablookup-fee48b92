-- H4: Revoke anon/authenticated SELECT on provider contact PII columns of public.facilities.
-- Public-facing code routes through the public_facilities view (which omits these columns)
-- and through the leads_provider_view for masking. Direct table reads of email/reply_email/phone
-- by anon or authenticated roles must be denied so a future misrouted query can't leak data.
-- Facility owners themselves use the provider panel which queries with service-role-backed
-- edge functions, and the admin/super-admin roles have their own SECURITY DEFINER paths.

REVOKE SELECT (email, reply_email, phone) ON public.facilities FROM anon;
REVOKE SELECT (email, reply_email, phone) ON public.facilities FROM authenticated;

-- Re-grant explicit SELECT on the safe, public-facing columns so RLS policies that allow
-- broad column lists keep working. (Postgres column-level REVOKE removes the column from
-- the implicit table-level SELECT grant; we must re-grant the rest explicitly.)
GRANT SELECT (
  id, name, slug, address, city, state, zip_code, facility_type,
  description, website, logo_url, gallery_urls, gender_served, year_established,
  bed_count, featured, featured_pinned, featured_display_order, verified,
  status, suspended, listing_completeness_score, calculated_ranking_score,
  response_rate_score, created_at, updated_at, user_id,
  accepts_international_patients,
  concierge_network_opted_in, concierge_availability_status,
  concierge_accepted_care_types, concierge_accepted_insurance,
  last_activity_at, last_featured_shown_at
) ON public.facilities TO anon, authenticated;