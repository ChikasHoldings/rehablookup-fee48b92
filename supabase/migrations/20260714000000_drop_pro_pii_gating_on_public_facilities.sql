-- Drops the Pro-subscription gate on phone / email / website in the
-- `public_facilities` view. Under the EKRA flat-fee model + the user's
-- 2026-05-21 directive to "remove all PII logic and UI", facility
-- contact details are no longer monetization-gated. Every approved
-- facility now exposes its public business contact info to every
-- visitor (anonymous, authenticated seeker, admin, owner).
--
-- What this changes:
--   - phone   : was Pro-only (CASE expression); now plain `f.phone`
--   - website : same
--   - email   : same
--   - is_pro / is_premium_visible / is_claimed flags : kept as-is so
--     downstream code can still surface Pro / claimed badges where
--     they're still meaningful (Featured rotation eligibility, etc.).
--     They no longer drive content visibility.
--
-- What this does NOT change:
--   - The `WHERE status='approved' AND NOT suspended` gate. Suspended
--     and pending-claim facilities still don't surface.
--   - Any other column projection.
--   - The four 2026-07-09 profile-content columns (hours, languages,
--     accessibility, accepting_admissions). Already ungated.
--
-- Idempotent: CREATE OR REPLACE VIEW re-runs cleanly even if applied
-- against an already-patched schema.

CREATE OR REPLACE VIEW public.public_facilities AS
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
  f.email,
  ((f.user_id IS NOT NULL) AND (f.claimed_at IS NOT NULL)) AS is_claimed,
  ((ps.id IS NOT NULL) AND (ps.status = 'active'::text) AND (ps.current_period_end > now())) AS is_pro,
  -- is_premium_visible was historically synonymous with "may see Pro-gated
  -- contact info". With the gate removed, it's now a pure passthrough of
  -- is_pro; preserved for back-compat with callers that still read it.
  ((ps.id IS NOT NULL) AND (ps.status = 'active'::text) AND (ps.current_period_end > now())) AS is_premium_visible,
  f.data_source,
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
