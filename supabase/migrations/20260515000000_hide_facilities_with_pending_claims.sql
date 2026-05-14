-- Hide facilities with in-progress claims from the public directory.
--
-- The provider workflow split is:
--
--   • Provider self-submits a facility → status defaults to 'pending'.
--     The existing WHERE clause (status='approved' AND NOT suspended)
--     already hides these from the public view until an admin approves.
--
--   • SAMHSA bulk import inserts with status='approved' so the listing
--     is immediately visible to public visitors who might claim it.
--
--   • A provider claims a SAMHSA listing → a row is inserted into
--     facility_claim_requests with status='pending' (or transitioned
--     to 'under_review' by an admin). The facilities row itself is
--     unchanged (still status='approved') so the listing kept showing
--     up in the public directory during the entire claim review.
--
-- That last case is the bug this migration fixes. The user requirement
-- is: "once a listing is claimed, it's removed from the public pages
-- until admin approval". Implemented here as a NOT EXISTS clause on
-- facility_claim_requests for any pending/under_review row.
--
-- When the claim is approved, the facility_claim_requests row flips to
-- status='approved' and the existing DB trigger transfers ownership
-- (sets facilities.user_id, claimed_at) — at that point the NOT EXISTS
-- clause is true again and the listing reappears in the public view
-- with its new owner attached.
--
-- IMPORTANT: this migration also preserves the live view's computed
-- columns — is_claimed, is_pro, is_premium_visible, data_source,
-- email, accepts_international_patients — that the React snapshot
-- loader and useFacilityBySlug hook expect. An earlier draft of this
-- migration dropped them, which would have broken /center/<slug>.

DROP VIEW IF EXISTS public.public_facilities;

CREATE VIEW public.public_facilities
WITH (security_invoker = true) AS
SELECT
  f.id,
  f.name,
  f.slug,
  f.city,
  f.state,
  f.zip_code,
  f.address,
  f.phone,
  f.email,
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
  f.data_source,
  f.calculated_ranking_score,
  f.listing_completeness_score,
  f.response_rate_score,
  f.accepts_international_patients,
  f.created_at,
  f.updated_at,
  -- ── Computed flags consumed by useFacilityBySlug / CenterProfile ──
  -- is_claimed: a facility is "claimed" once a provider account owns it.
  -- This covers two cases:
  --   1. SAMHSA-imported listing that a provider claimed and an admin
  --      approved → claimed_at is set + user_id is set.
  --   2. Provider self-submission → user_id is set from day one (no
  --      claimed_at, since there was nothing to claim).
  -- Both should drive the "Claim This Listing" CTA off the public profile.
  (f.user_id IS NOT NULL) AS is_claimed,
  -- is_pro: facility has an active pro_subscription (paid plan). The
  --   inner predicate matches the existing pro_subscriptions check used
  --   elsewhere — status='active' AND not-yet-expired.
  EXISTS (
    SELECT 1 FROM public.pro_subscriptions ps
    WHERE ps.facility_id = f.id
      AND ps.status = 'active'
      AND (ps.current_period_end IS NULL OR ps.current_period_end > now())
  ) AS is_pro,
  -- is_premium_visible: drives premium placement in browse results.
  --   featured rows are admin-curated; pro subscribers also count.
  (
    f.featured OR EXISTS (
      SELECT 1 FROM public.pro_subscriptions ps
      WHERE ps.facility_id = f.id
        AND ps.status = 'active'
        AND (ps.current_period_end IS NULL OR ps.current_period_end > now())
    )
  ) AS is_premium_visible
FROM public.facilities f
WHERE f.status = 'approved'
  AND COALESCE(f.suspended, false) = false
  AND NOT EXISTS (
    SELECT 1
    FROM public.facility_claim_requests fcr
    WHERE fcr.facility_id = f.id
      AND fcr.status IN ('pending', 'under_review')
  );

GRANT SELECT ON public.public_facilities TO anon, authenticated;

COMMENT ON VIEW public.public_facilities IS
  'Public-facing facility directory. Hides facilities pending admin approval, suspended, or under active claim review. Exposes computed flags is_claimed (user_id set), is_pro (active pro_subscription), and is_premium_visible (featured OR pro) consumed by the SPA.';
