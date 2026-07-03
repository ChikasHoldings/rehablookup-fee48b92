-- =============================================================================
-- Owned facilities are not claimable (2026-07-03 audit, gap G1).
--
-- The claim state was fragmented: `is_claimed` in public_facilities required
-- user_id AND claimed_at, but provider-CREATED facilities (signup wizard /
-- AddLocation) set only user_id — claimed_at is written exclusively by the
-- claim-approval triggers. Result:
--   * every provider-created listing permanently read as unclaimed, so the
--     public profile showed "Claim This Listing" to the world (including the
--     actual owner), and
--   * submit-facility-claim used the same both-fields guard, so a THIRD PARTY
--     could file a claim against an owned facility.
--
-- Fix: ownership (user_id IS NOT NULL) is the fact that makes a listing
-- non-claimable, however it was established. claimed_at remains the narrower
-- "verified via the claim flow" signal. The is_claimed flag the public page
-- consumes now keys off user_id alone. (The matching guard change lives in
-- supabase/functions/submit-facility-claim.)
--
-- The view below is the 20260819000000 definition with ONLY the is_claimed
-- expression changed.
-- =============================================================================

CREATE OR REPLACE VIEW public.public_facilities AS
 SELECT id,
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
    CASE WHEN has_active_pro(id) THEN verified ELSE false END AS verified,
    year_established,
    logo_url,
    gallery_urls,
    status,
    calculated_ranking_score,
    listing_completeness_score,
    response_rate_score,
    accepts_international_patients,
    created_at,
    updated_at,
    email,
    user_id IS NOT NULL AS is_claimed,
    has_active_pro(id) AS is_pro,
    has_active_pro(id) AS is_premium_visible,
    data_source,
    hours_of_operation,
    languages_spoken,
    accessibility_features,
    accepting_admissions,
        CASE
            WHEN has_active_pro(id) THEN video_url
            ELSE NULL::text
        END AS video_url,
        CASE
            WHEN has_active_pro(id) THEN virtual_tour_url
            ELSE NULL::text
        END AS virtual_tour_url
   FROM facilities
  WHERE status = 'approved'::text AND COALESCE(suspended, false) = false;
