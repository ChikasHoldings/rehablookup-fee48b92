-- Expose the new facility-profile content columns through
-- public_facilities so the /center/[slug] and /account/facility/[id]
-- pages can read them without bypassing the existing phone/website/
-- email masking layer.
--
-- These four fields are PUBLIC content (not contact details) so no
-- CASE-gating — visible to every page, including anonymous visitors:
--   hours_of_operation     — display string e.g. "Mon-Fri 9am-5pm"
--   languages_spoken       — chip array
--   accessibility_features — chip array
--   accepting_admissions   — boolean badge ("Currently accepting" / etc.)
--
-- This migration preserves the existing view definition verbatim
-- (including the Pro-gated phone/website/email CASE expressions, the
-- subscription join, and the WHERE filter) and adds the four new
-- columns at the end of the select list.

CREATE OR REPLACE VIEW public.public_facilities AS
SELECT
  f.id,
  f.name,
  f.slug,
  f.city,
  f.state,
  f.zip_code,
  f.address,
  CASE
    WHEN (is_admin(auth.uid()) OR ((auth.uid() IS NOT NULL) AND (auth.uid() = f.user_id)) OR (f.verified AND (f.user_id IS NOT NULL) AND (f.claimed_at IS NOT NULL) AND (ps.id IS NOT NULL) AND (ps.status = 'active'::text) AND (ps.current_period_end > now())))
    THEN f.phone
    ELSE NULL::text
  END AS phone,
  CASE
    WHEN (is_admin(auth.uid()) OR ((auth.uid() IS NOT NULL) AND (auth.uid() = f.user_id)) OR (f.verified AND (f.user_id IS NOT NULL) AND (f.claimed_at IS NOT NULL) AND (ps.id IS NOT NULL) AND (ps.status = 'active'::text) AND (ps.current_period_end > now())))
    THEN f.website
    ELSE NULL::text
  END AS website,
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
  f.updated_at,
  CASE
    WHEN (is_admin(auth.uid()) OR ((auth.uid() IS NOT NULL) AND (auth.uid() = f.user_id)) OR (f.verified AND (f.user_id IS NOT NULL) AND (f.claimed_at IS NOT NULL) AND (ps.id IS NOT NULL) AND (ps.status = 'active'::text) AND (ps.current_period_end > now())))
    THEN f.email
    ELSE NULL::text
  END AS email,
  ((f.user_id IS NOT NULL) AND (f.claimed_at IS NOT NULL)) AS is_claimed,
  ((ps.id IS NOT NULL) AND (ps.status = 'active'::text) AND (ps.current_period_end > now())) AS is_pro,
  (is_admin(auth.uid()) OR ((auth.uid() IS NOT NULL) AND (auth.uid() = f.user_id)) OR ((f.verified = true) AND (f.user_id IS NOT NULL) AND (f.claimed_at IS NOT NULL) AND (ps.id IS NOT NULL) AND (ps.status = 'active'::text) AND (ps.current_period_end > now()))) AS is_premium_visible,
  f.data_source,
  -- New profile-content columns (Phase 2 of the facility profile audit):
  f.hours_of_operation,
  f.languages_spoken,
  f.accessibility_features,
  f.accepting_admissions
FROM (
  facilities f
  LEFT JOIN facility_subscriptions ps
    ON (((ps.facility_id = f.id) AND (ps.status = 'active'::text) AND (ps.current_period_end > now())))
)
WHERE ((f.status = 'approved'::text) AND (COALESCE(f.suspended, false) = false));
