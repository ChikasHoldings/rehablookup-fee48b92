-- H4 (corrected): The earlier column-level REVOKE had no effect because anon/authenticated
-- had full table-level SELECT (arwdDxtm) on public.facilities, which subsumes any
-- column-level revoke. We must revoke table-level SELECT first, then re-grant SELECT
-- only on the safe, public-facing columns.

-- Step 1: Strip table-wide SELECT from anon and authenticated.
REVOKE SELECT ON public.facilities FROM anon;
REVOKE SELECT ON public.facilities FROM authenticated;

-- Step 2: Re-grant SELECT on safe columns only. PII contact columns
-- (email, reply_email, phone) are intentionally OMITTED.
GRANT SELECT (
  id, name, slug, address, city, state, zip_code, facility_type,
  description, website, logo_url, gallery_urls, gender_served, year_established,
  bed_count, featured, featured_pinned, featured_display_order, verified,
  status, suspended, listing_completeness_score, calculated_ranking_score,
  response_rate_score, created_at, updated_at, user_id,
  accepts_international_patients,
  concierge_network_opted_in, concierge_availability_status,
  concierge_accepted_care_types, concierge_accepted_insurance,
  concierge_admissions_contact, concierge_admissions_email, concierge_admissions_phone,
  concierge_agreement_preference, concierge_notes, concierge_opted_in_at,
  concierge_terms_accepted_at, concierge_terms_accepted_by, concierge_terms_version,
  last_activity_at, last_featured_shown_at,
  reply_email_verified, reply_email_verified_at,
  bonus_leads, lead_limit_override, leads_reset_at,
  profile_completion_celebrated, profile_reminder_count, profile_reminder_sent_at,
  admin_notes
) ON public.facilities TO authenticated;

-- For anon, grant the strictly minimal set used by directory pages.
GRANT SELECT (
  id, name, slug, address, city, state, zip_code, facility_type,
  description, website, logo_url, gallery_urls, gender_served, year_established,
  bed_count, featured, featured_pinned, featured_display_order, verified,
  status, suspended, listing_completeness_score, calculated_ranking_score,
  response_rate_score, created_at, updated_at,
  accepts_international_patients,
  concierge_network_opted_in, concierge_availability_status,
  concierge_accepted_care_types, concierge_accepted_insurance,
  last_activity_at, last_featured_shown_at
) ON public.facilities TO anon;

-- service_role and postgres retain full access (unchanged).