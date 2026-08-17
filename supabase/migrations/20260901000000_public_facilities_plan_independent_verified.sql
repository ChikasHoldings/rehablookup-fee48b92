-- =============================================================================
-- B1 — Decouple the PUBLIC verification/trust signal from payment.
--
-- PRODUCT CONTRACT (Stage-3 entitlement amendment)
--   RehabLookup is a treatment DIRECTORY. A provider may pay for product
--   features ($99/mo Pro) and for clearly labeled Featured visibility. A
--   provider may NEVER pay for verification/trust, for organic ranking, for
--   inquiry eligibility, for inquiry value, or for matching.
--
--   `verified` is an underlying FACTUAL directory/trust state. It is
--   established by the verification pipeline (facility_verification_state,
--   re_verification_events, admin review), not by a Stripe subscription.
--   Publishing it therefore cannot depend on the facility's plan.
--
-- WHAT WAS WRONG
--   20260831000000_pro_gate_public_facility_phone.sql — the migration that
--   correctly made PHONE a paid contact feature — carried forward an older
--   mask on the adjacent column:
--
--     CASE WHEN has_active_pro(id) THEN verified ELSE false END AS verified
--
--   That is a trust signal sold as an entitlement. A Free listing whose
--   licence had actually been verified was published to the directory as
--   NOT verified, and buying Pro was what made it "verified" to the public.
--   Independent production verification measured the effect precisely:
--
--     facilities.verified = true         →  5
--     public_facilities.verified = true  →  0        (5 facts, 0 published)
--     facility_subscriptions             →  0 rows
--
--   Every verified facility in the directory was being published as
--   unverified because nobody currently holds Pro.
--
-- WHAT THIS MIGRATION CHANGES
--   Exactly one expression. `verified` is published from the underlying
--   column. Nothing else about the view moves.
--
--   `facilities.verified` is boolean DEFAULT false, and production holds
--   zero NULLs (3807 rows: 5 true, 3802 false, 0 null), so the raw column is
--   read directly rather than wrapped in a COALESCE that would imply an
--   output-nullability contract the view does not actually owe. Every
--   consumer already null-tolerates it (`f.verified || false` in
--   get-public-facilities, `center.verified === true` in the search filter).
--
-- WHAT THIS MIGRATION DELIBERATELY PRESERVES — byte-for-byte from
-- 20260831000000 unless named above:
--   1. PHONE remains has_active_pro-masked. Phone is a PAID CONTACT FEATURE
--      and that contract is untouched. Featured is never consulted.
--   2. Claimant visibility (20260830000000 / PR #78): facilities under a
--      pending/under_review claim stay hidden publicly EXCEPT from the
--      claimant themselves, who must still be able to resume their wizard.
--   3. is_claimed = user_id IS NOT NULL (20260830000100 semantics, NOT the
--      older claimed_at form).
--   4. is_pro / is_premium_visible = has_active_pro(id).
--   5. video_url / virtual_tour_url keep their existing Pro gating —
--      enhanced-profile media is a legitimate Pro product feature.
--   6. website and directions data stay ungated.
--
-- WHAT THIS MIGRATION DELIBERATELY DOES NOT DO
--   • It does not touch the raw-table security closure. There is no
--     DROP POLICY, no CREATE POLICY, no GRANT and no REVOKE on
--     public.facilities here. The Stage-2 closure from 20260831000000 —
--     anon holds no policy, no table privilege and no column privilege on
--     the internal provider record — remains exactly as that migration left
--     it, and remains the migration that owns it.
--   • It does not re-point the five dependent public projections
--     (public_facility_accreditations / _amenities / _programs / _staff,
--     facility_badge_recency). CREATE OR REPLACE VIEW keeps them bound to
--     public_facilities by name, so they stay sourced off the definer view
--     exactly as 20260831000000 repointed them. They are not restated here
--     precisely so that this migration cannot silently revert them.
--   • It does not recreate public.get_public_facility_data(uuid). See the
--     assertion at the foot of this file.
--   • It does not change has_active_pro(). Its treatment of `trialing`
--     (currently excluded: only active-with-valid-period and past_due count)
--     is a separate, unresolved entitlement question and is out of scope
--     here.
--   • It does not touch pricing, Stripe, Featured, claim state, or ranking.
--     Ranking is handled by the sibling migration 20260901000100 and by the
--     calculate-ranking-scores / pro-benefits source changes.
--
-- ROLLBACK — EMERGENCY ONLY
--   Restore the single expression from 20260831000000:
--     CASE WHEN has_active_pro(id) THEN verified ELSE false END AS verified
--   Understand what that restores: paying for Pro is what makes a facility
--   publicly "verified" again.
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. public_facilities — `verified` becomes plan-independent.
--    Body is otherwise identical to 20260831000000.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW public.public_facilities AS
 SELECT id,
    name,
    slug,
    city,
    state,
    zip_code,
    address,
    -- PRO-GATED. Free / Featured-only / lapsed / unconfirmed → NULL.
    -- has_active_pro() is the single canonical, grace-aware entitlement rule;
    -- it is never re-implemented, and Featured is never consulted.
    CASE WHEN has_active_pro(id) THEN phone ELSE NULL::text END AS phone,
    website,
    description,
    facility_type,
    gender_served,
    bed_count,
    featured,
    featured_display_order,
    featured_pinned,
    -- PLAN-INDEPENDENT TRUST STATE. This is a directory FACT, not an
    -- entitlement: it is published exactly as the verification pipeline
    -- recorded it, for Free, Featured-only, Pro and lapsed listings alike.
    -- has_active_pro() must never appear in this expression.
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
    AND (
      NOT EXISTS (
        SELECT 1
        FROM public.facility_claim_requests fcr
        WHERE fcr.facility_id = f.id
          AND fcr.status IN ('pending', 'under_review')
      )
      OR EXISTS (
        SELECT 1
        FROM public.facility_claim_requests fcr
        WHERE fcr.facility_id = f.id
          AND fcr.status IN ('pending', 'under_review')
          AND fcr.claimant_user_id = (SELECT auth.uid())
      )
    );

COMMENT ON VIEW public.public_facilities IS
  'Public facility directory. Hides facilities that are non-approved, suspended, or under an active (pending/under_review) claim — EXCEPT from the claimant themselves, who must still be able to load the facility to resume their claim wizard. anon (auth.uid() IS NULL) never matches a claimant, so public search/profile/sitemap visibility is unchanged. is_claimed = user_id IS NOT NULL. Column entitlement contract: verified is a PLAN-INDEPENDENT FACTUAL TRUST STATE — it is published from the underlying verification fact for Free, Featured-only, Pro and lapsed listings alike, and payment does not create, boost, or reveal it. phone is a PAID CONTACT FEATURE, has_active_pro-masked to NULL for Free/Featured-only/lapsed listings; Featured alone never unlocks it. video_url and virtual_tour_url keep their existing Pro enhanced-profile gating. Security DEFINER on purpose: the claim subqueries must bypass RLS on facility_claim_requests, and the phone mask must be able to read the raw column in order to hide it.';

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Fail-closed post-conditions.
--
--    The failure mode this guards is the one that produced the bug being
--    fixed: a later edit re-introduces an entitlement predicate on a trust
--    column, or resurrects the dropped public RPC as a "fallback" that
--    bypasses the view's masks entirely. Both read as reasonable in review.
--    Assert the mechanism instead.
-- ─────────────────────────────────────────────────────────────────────────────
DO $$
DECLARE
  v_def text;
BEGIN
  SELECT pg_get_viewdef('public.public_facilities'::regclass, true) INTO v_def;

  -- verified must NOT be produced by an entitlement expression.
  IF v_def ~* 'has_active_pro[^,]*\)\s+THEN\s+verified'
     OR v_def ~* 'THEN\s+verified\s+ELSE\s+false' THEN
    RAISE EXCEPTION
      'public_facilities.verified is gated on has_active_pro — verification is a factual trust state, not a paid entitlement';
  END IF;

  -- phone must STILL be produced by one. Removing the trust mask must not
  -- take the paid-contact-feature mask with it.
  IF v_def !~* 'has_active_pro' THEN
    RAISE EXCEPTION
      'public_facilities no longer references has_active_pro at all — the Pro phone mask has been lost';
  END IF;

  -- The claimant-visibility predicate (PR #78 resume path) must survive.
  IF v_def !~* 'facility_claim_requests' THEN
    RAISE EXCEPTION
      'public_facilities lost its claim-state predicate — pending-claim hiding and claimant resume are both broken';
  END IF;
END
$$;

-- public.get_public_facility_data(uuid) was deliberately dropped by
-- 20260829004500_neutralize_get_public_facility_data.sql: it was a dormant
-- SECURITY DEFINER RPC that predated — and bypassed — the public projection's
-- masks. It is NOT a live production function (confirmed absent on
-- production), it is NOT a fallback for this migration, and nothing may
-- recreate it. public_facilities is the canonical public facility projection.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'get_public_facility_data'
  ) THEN
    RAISE EXCEPTION
      'public.get_public_facility_data was recreated — it bypasses the public_facilities masks and must stay dropped';
  END IF;
END
$$;
