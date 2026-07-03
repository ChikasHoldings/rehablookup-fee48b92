-- =============================================================================
-- Restore the pending-claim public-visibility filter on public_facilities.
--
-- FINDING (Provider Panel Launch-Readiness Audit)
--   public_facilities exposes approved, non-suspended facilities even while an
--   active claim (status pending / under_review) is in flight. The original
--   NOT EXISTS pending-claim exclusion (20260515000000) was lost in the later
--   has_active_pro masking rewrite (20260819000000). Effect: a SAMHSA-imported
--   listing stays in public search / profile / sitemap during the entire claim
--   review, which the product requires to be hidden until the claim resolves.
--
-- FIX
--   Recreate the view with its current column set + masking, re-adding
--     AND NOT EXISTS (pending/under_review claim on this facility)
--
-- WHY THIS VIEW STAYS SECURITY DEFINER (not security_invoker)
--   The audit suggested optionally bundling security_invoker=true. That is NOT
--   safe here and would BREAK this very filter: under security_invoker the
--   NOT EXISTS subquery on facility_claim_requests is evaluated with the
--   invoker's RLS, and anon/public has NO select policy on that table — so the
--   subquery would see zero claim rows, NOT EXISTS would always be true, and no
--   facility would ever be hidden. security_invoker would also require anon to
--   hold a direct SELECT grant on facilities. The definer view already restricts
--   output to approved + non-suspended + (now) non-pending-claim rows with the
--   same has_active_pro masking, so it exposes nothing extra. The claim subquery
--   MUST run with definer privileges to see the claim rows.
--
-- facilities_select_public (the base-table RLS policy) is intentionally NOT
--   modified: the public app reads facilities exclusively through this view /
--   get-public-facilities, and a NOT EXISTS inside an RLS policy would be
--   neutered by anon's RLS on facility_claim_requests for the same reason.
--
-- ROLLBACK: restore the view body from 20260819000000_pro_gate_verified_badge.sql
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
   FROM facilities f
  WHERE status = 'approved'::text
    AND COALESCE(suspended, false) = false
    AND NOT EXISTS (
      SELECT 1
      FROM public.facility_claim_requests fcr
      WHERE fcr.facility_id = f.id
        AND fcr.status IN ('pending', 'under_review')
    );

COMMENT ON VIEW public.public_facilities IS
  'Public facility directory. Hides facilities that are non-approved, suspended, or under an active (pending/under_review) claim. verified/video_url/virtual_tour_url are has_active_pro-masked. is_claimed = user_id IS NOT NULL. Security DEFINER on purpose: the pending-claim NOT EXISTS must bypass RLS on facility_claim_requests.';
