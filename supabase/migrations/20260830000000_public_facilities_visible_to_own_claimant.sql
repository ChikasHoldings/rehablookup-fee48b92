-- =============================================================================
-- Keep a facility visible to the provider who is actively claiming it.
--
-- FINDING (provider claim funnel QA, pre-ad-launch)
--   20260829004900 restored the pending-claim exclusion on public_facilities so
--   a listing under review disappears from the public directory. Correct for
--   the public — but the exclusion is unconditional, and the ENTIRE provider
--   claim flow reads the facility through this same view:
--
--     useFacilityBySlug            → ClaimWizard's facility record
--     BuildStep                    → resolves selected_facility_id → slug
--     FindOrListStep/useSeedFacility → the "Continue with this facility" card
--     AccountStep + Onboarding     → ?facility_slug= deep-link resolution
--
--   ClaimWizard step 2 creates the facility_claim_requests row with
--   status='pending' — which immediately hides the facility from the claimant
--   themselves. React Query masks it for the rest of that session (5-10 min
--   staleTime), so the break surfaces on refresh, on back-navigation, or when
--   the provider returns later — which is the NORMAL path, since document
--   verification takes 1-2 business days and SMS verification requires the
--   operator to be on-site to receive the code.
--
--   What they see on return:
--     ClaimWizard → "We couldn't find this facility — the listing may have
--                    been removed, or the link is mistyped."
--     BuildStep   → "We couldn't load the facility you picked" + the only CTA
--                    is "Pick a different facility", which clears their claim.
--
--   Net effect: a provider cannot resume or finish a claim they already
--   started. They are told their own facility does not exist.
--
-- FIX
--   Narrow the exclusion to claims that are not the caller's. A facility is
--   visible when there is no active claim at all, OR when one of the active
--   claims belongs to the current user.
--
--   Anonymous and third-party visibility is UNCHANGED:
--     • anon              → auth.uid() IS NULL, matches no claimant_user_id,
--                           so the facility stays hidden. Public directory,
--                           search, sitemaps and prerender are unaffected.
--     • other providers   → their uid never matches, so it stays hidden,
--                           including during a competing-claim race.
--     • the claimant      → sees their own in-flight facility and can resume.
--
--   The view remains SECURITY DEFINER for the reason documented in
--   20260829004900: the claim subquery must bypass anon's RLS on
--   facility_claim_requests. auth.uid() reads the request JWT and is
--   unaffected by definer rights, so it still identifies the caller correctly.
--
-- ROLLBACK: restore the view body from
--           20260829004900_public_facilities_hide_pending_claims.sql
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
    AND (
      NOT EXISTS (
        SELECT 1
        FROM public.facility_claim_requests fcr
        WHERE fcr.facility_id = f.id
          AND fcr.status IN ('pending', 'under_review')
      )
      -- ...unless one of those active claims is the caller's own, so the
      -- claimant can still load the facility and finish their wizard.
      OR EXISTS (
        SELECT 1
        FROM public.facility_claim_requests fcr
        WHERE fcr.facility_id = f.id
          AND fcr.status IN ('pending', 'under_review')
          AND fcr.claimant_user_id = (SELECT auth.uid())
      )
    );

COMMENT ON VIEW public.public_facilities IS
  'Public facility directory. Hides facilities that are non-approved, suspended, or under an active (pending/under_review) claim — EXCEPT from the claimant themselves, who must still be able to load the facility to resume their claim wizard. anon (auth.uid() IS NULL) never matches a claimant, so public search/profile/sitemap visibility is unchanged. verified/video_url/virtual_tour_url are has_active_pro-masked. is_claimed = user_id IS NOT NULL. Security DEFINER on purpose: the claim subqueries must bypass RLS on facility_claim_requests.';
