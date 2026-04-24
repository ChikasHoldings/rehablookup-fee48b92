-- Re-grant anon SELECT on all non-PII columns (everything except email, reply_email).
GRANT SELECT (
  id, user_id, name, slug, description, address, city, state, zip_code, phone, website,
  facility_type, gender_served, bed_count, year_established, logo_url, gallery_urls,
  featured, featured_display_order, featured_pinned, verified, status, suspended,
  calculated_ranking_score, listing_completeness_score, response_rate_score,
  accepts_international_patients, last_activity_at, last_featured_shown_at,
  lead_limit_override, leads_reset_at, bonus_leads, admin_notes,
  concierge_accepted_care_types, concierge_accepted_insurance,
  concierge_admissions_contact, concierge_admissions_email, concierge_admissions_phone,
  concierge_agreement_preference, concierge_availability_status,
  concierge_network_opted_in, concierge_notes, concierge_opted_in_at,
  concierge_terms_accepted_at, concierge_terms_accepted_by, concierge_terms_version,
  reply_email_verified, reply_email_verified_at,
  profile_completion_celebrated, profile_reminder_count, profile_reminder_sent_at,
  created_at, updated_at
) ON public.facilities TO anon;