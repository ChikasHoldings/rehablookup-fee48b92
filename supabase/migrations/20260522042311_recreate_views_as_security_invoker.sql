-- =============================================================================
-- Recreate SECURITY DEFINER views as SECURITY INVOKER
-- =============================================================================
--
-- Supabase advisor flagged two ERROR-level lints:
--   • public.public_facilities  — SECURITY DEFINER view
--   • public.leads_provider_view — SECURITY DEFINER view (was fixed in
--     20260517050000 via ALTER VIEW SET but then lost when 20260616000000
--     dropped and recreated the view without the reloption)
--
-- SECURITY DEFINER views bypass RLS on every underlying table. Switching to
-- SECURITY INVOKER means the caller's grants and policies apply, which is the
-- recommended pattern for defense-in-depth.
--
-- Changes:
-- 1. Add an authenticated SELECT policy on public.facilities so that logged-in
--    seekers (non-admin, non-owner) can read the approved public directory
--    through the view. Previously this worked only because the view was
--    SECURITY DEFINER.
-- 2. Recreate public.public_facilities with security_invoker = on and replace
--    the LEFT JOIN to facility_subscriptions (no anon/authenticated RLS)
--    with public.has_active_pro() — a SECURITY DEFINER helper that is already
--    allowed to read that table.
-- 3. Set security_invoker = true on leads_provider_view (ALTER VIEW is
--    sufficient; the column list is current as of 20260616000000).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Extend facilities read policy to authenticated role
--    The anon policy added in 20260423052026 only covers `anon`. Logged-in
--    seekers (role = authenticated, no facility ownership) also need to read
--    approved facilities so the directory works while logged in.
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Authenticated can read approved facilities for public view"
  ON public.facilities;

CREATE POLICY "Authenticated can read approved facilities for public view"
  ON public.facilities
  FOR SELECT
  TO authenticated
  USING (status = 'approved' AND COALESCE(suspended, false) = false);

-- -----------------------------------------------------------------------------
-- 2. Recreate public.public_facilities with security_invoker = on
--    Column list matches 20260714000000 (the pro-PII-gate-removal migration)
--    with one change: the LEFT JOIN to facility_subscriptions is replaced by
--    public.has_active_pro(f.id), which is SECURITY DEFINER and may read
--    facility_subscriptions regardless of the caller's grants/policies.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.public_facilities
WITH (security_invoker = on) AS
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
  ((f.user_id IS NOT NULL) AND (f.claimed_at IS NOT NULL))           AS is_claimed,
  public.has_active_pro(f.id)                                         AS is_pro,
  public.has_active_pro(f.id)                                         AS is_premium_visible,
  f.data_source,
  f.hours_of_operation,
  f.languages_spoken,
  f.accessibility_features,
  f.accepting_admissions
FROM public.facilities f
WHERE (f.status = 'approved') AND (COALESCE(f.suspended, false) = false);

-- Preserve existing grants (unchanged from 20260423052026).
GRANT SELECT ON public.public_facilities TO anon, authenticated;

-- -----------------------------------------------------------------------------
-- 3. Switch leads_provider_view to security_invoker
--    The view already has an auth.uid()-gated WHERE clause and the underlying
--    `leads` table has matching RLS policies, so ALTER VIEW is sufficient.
-- -----------------------------------------------------------------------------
ALTER VIEW public.leads_provider_view SET (security_invoker = true);

COMMENT ON VIEW public.public_facilities IS
  'Public-facing facility directory. SECURITY INVOKER — callers must have '
  'an RLS policy on public.facilities; anon + authenticated approved-row '
  'policies are maintained in migration history. is_pro / is_premium_visible '
  'computed via has_active_pro() (SECURITY DEFINER) to avoid requiring anon '
  'SELECT on facility_subscriptions.';

COMMENT ON VIEW public.leads_provider_view IS
  'Per-provider lead view. SECURITY INVOKER — RLS on public.leads enforces '
  'facility ownership. WHERE clause kept as defense-in-depth.';
