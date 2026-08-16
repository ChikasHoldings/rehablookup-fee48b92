-- =============================================================================
-- Pro-gate the PUBLIC facility phone number, and close the raw-base-table
-- bypass that made view-level gating meaningless.
--
-- PRODUCT DECISION (Stage-2 inquiry-model amendment)
--   Every approved, non-suspended facility may receive an on-platform inquiry
--   from the seeker who selected it — Free, Featured-only, Pro, claimed or
--   unclaimed alike. Inquiry eligibility is NOT an entitlement.
--
--   What an active Pro subscription buys, as a product feature, is PUBLIC
--   PHONE VISIBILITY: the facility's published phone number is shown and is
--   one-tap callable on the public profile, in the contact modal, and in the
--   generated static profile. Free / Featured-only listings do not expose a
--   phone number publicly. Featured alone NEVER unlocks it.
--
-- FINDING (independent production verification, pre-merge)
--   This was NOT a UI-only gap. Two live public paths returned the raw phone
--   of a non-Pro facility:
--
--   1. public.public_facilities selected raw `phone` with no entitlement
--      expression. The Pro CASE was deliberately dropped by
--      20260714000000_drop_pro_pii_gating_on_public_facilities.sql under the
--      then-current "remove all PII gating" directive, and never restored
--      when Pro became a contact-feature tier again.
--
--   2. The base table public.facilities was directly readable by anon AND by
--      any ordinary authenticated seeker, via
--        GRANT SELECT ON public.facilities TO anon            (20260523011251)
--        POLICY facilities_select_public  TO public
--               USING (status='approved' AND NOT COALESCE(suspended,false))
--      so a caller could simply skip the view:
--        select phone from facilities where id = '<free facility>'
--      Reproduced on production as `anon` against Tony Rice Center, INC
--      (3b11bad0-6d79-431c-9e39-605064080a56, is_pro=false) — it returned the
--      raw number. Gating only the view would therefore have fixed nothing.
--
-- WHY THE VIEW CAN STILL READ THE RAW COLUMN
--   public.public_facilities has reloptions = NULL (verified on production),
--   i.e. it is SECURITY DEFINER and executes as its owner `postgres`. It is
--   therefore unaffected by the anon/authenticated grants and policies revoked
--   below, and can still evaluate `phone` in order to mask it. This is the
--   same property 20260829004900 relies on for its claim subquery.
--
-- WHAT THIS MIGRATION DOES
--   1. Recreates public_facilities with a has_active_pro() CASE on `phone`.
--   2. Repoints the five dependent PUBLIC projections off the base table and
--      onto public_facilities, so they no longer require anon/seeker raw row
--      access. They stay SECURITY INVOKER, so RLS on their own base tables is
--      unchanged — this widens nothing.
--   3. Rewrites facility_name_aliases_select_public to use the SECURITY
--      DEFINER helper is_approved_facility() instead of an inline subquery
--      against facilities (an RLS subquery is evaluated with the caller's own
--      RLS, so it would have been neutered by step 4).
--   4. Drops the blanket public raw-row pathway:
--        • authenticated  → loses the approved-row policy entirely. Ordinary
--                           seekers now match no SELECT policy on facilities.
--                           Owner / team / admin policies are UNTOUCHED, so
--                           providers and admins keep full raw access,
--                           including `phone`.
--        • anon           → keeps approved-row visibility (a safety net for
--                           any count-only consumer) but loses the `phone`
--                           column outright at the GRANT level, which is a
--                           hard privilege boundary RLS cannot be tricked
--                           past.
--
-- WHAT THIS MIGRATION DELIBERATELY DOES NOT DO
--   • It does not null, move, or delete facilities.phone. The raw number
--     remains stored and remains authorized data for the owner, the facility
--     team, admins, and service-role functions (claim SMS/voice verification,
--     provider editing, admin moderation).
--   • It does not gate name, address, website, directions data, or any other
--     ordinary directory metadata. PHONE is the only newly gated field.
--   • It does not touch pricing, Stripe, Featured, or claim state.
--
-- ROLLBACK
--   Restore the view bodies from
--     20260830000000_public_facilities_visible_to_own_claimant.sql   (public_facilities)
--   re-point the five projections back to `facilities`, restore
--     facility_name_aliases_select_public from its prior definition, then:
--     CREATE POLICY "facilities_select_public" ON public.facilities
--       AS PERMISSIVE FOR SELECT
--       USING (status = 'approved' AND COALESCE(suspended,false) = false);
--     GRANT SELECT ON public.facilities TO anon;
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. public_facilities — Pro-gate `phone`.
--    Body is otherwise byte-identical to 20260830000000 (claimant visibility
--    and the verified / video_url / virtual_tour_url masks are preserved).
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
      OR EXISTS (
        SELECT 1
        FROM public.facility_claim_requests fcr
        WHERE fcr.facility_id = f.id
          AND fcr.status IN ('pending', 'under_review')
          AND fcr.claimant_user_id = (SELECT auth.uid())
      )
    );

COMMENT ON VIEW public.public_facilities IS
  'Public facility directory. Hides facilities that are non-approved, suspended, or under an active (pending/under_review) claim — EXCEPT from the claimant themselves, who must still be able to load the facility to resume their claim wizard. anon (auth.uid() IS NULL) never matches a claimant, so public search/profile/sitemap visibility is unchanged. phone/verified/video_url/virtual_tour_url are has_active_pro-masked: phone is a PAID CONTACT FEATURE and is NULL for Free, Featured-only and lapsed listings. is_claimed = user_id IS NOT NULL. Security DEFINER on purpose: the claim subqueries must bypass RLS on facility_claim_requests, and the phone mask must be able to read the raw column in order to hide it.';

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Repoint the dependent PUBLIC projections onto public_facilities.
--
--    These five views are SECURITY INVOKER and previously joined `facilities`
--    directly, which is the only reason anon/authenticated needed raw row
--    access at all. Sourcing approved-facility identity from the definer view
--    instead removes that requirement without changing their own RLS posture:
--    each still reads its own base table (facility_amenities, facility_staff,
--    …) as the caller, so per-table RLS continues to apply exactly as before.
--
--    Behavioural note: public_facilities additionally hides facilities under
--    an active third-party claim. These projections therefore inherit that
--    rule, which makes them consistent with the rest of the public surface.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW public.public_facility_accreditations AS
 SELECT fa.id,
    fa.facility_id,
    fa.accreditation_type,
    fa.verified,
    fa.verified_at,
    fa.expiry_date,
    fa.verification_url,
    fa.issuing_authority,
        CASE
            WHEN has_active_pro(fa.facility_id) THEN fa.is_highlighted
            ELSE false
        END AS is_highlighted,
    fa.created_at
   FROM facility_accreditations fa
     JOIN public.public_facilities f ON f.id = fa.facility_id
  WHERE f.status = 'approved'::text;

CREATE OR REPLACE VIEW public.public_facility_amenities AS
 SELECT a.id,
    a.facility_id,
    a.amenity_name,
    a.is_highlighted,
    a.display_order,
    a.created_at
   FROM facility_amenities a
     JOIN public.public_facilities f ON f.id = a.facility_id
  WHERE f.status = 'approved'::text AND has_active_pro(a.facility_id);

CREATE OR REPLACE VIEW public.public_facility_programs AS
 SELECT p.id,
    p.facility_id,
    p.name,
    p.description,
    p.level_of_care,
    p.length_text,
    p.display_order,
    p.created_at
   FROM facility_programs p
     JOIN public.public_facilities f ON f.id = p.facility_id
  WHERE f.status = 'approved'::text AND p.is_visible = true AND has_active_pro(p.facility_id);

CREATE OR REPLACE VIEW public.public_facility_staff AS
 SELECT fs.id,
    fs.facility_id,
    fs.name,
    fs.job_title,
    fs.bio,
    fs.photo_url,
    fs.display_order,
    fs.is_visible,
    fs.created_at
   FROM facility_staff fs
     JOIN public.public_facilities f ON f.id = fs.facility_id
  WHERE f.status = 'approved'::text AND fs.is_visible = true AND has_active_pro(fs.facility_id);

CREATE OR REPLACE VIEW public.facility_badge_recency AS
 SELECT f.id AS facility_id,
    f.slug,
    s.state,
    s.badge_visible,
    s.last_verified_at,
    s.next_check_due,
    s.remediation_deadline,
    s.last_trigger,
        CASE
            WHEN s.state = 'verified'::text AND s.last_verified_at IS NOT NULL THEN 'Verified · confirmed '::text || to_char(s.last_verified_at, 'Mon YYYY'::text)
            WHEN s.state = 'expiring_soon'::text THEN 'Verified · license expires soon'::text
            WHEN s.state = 'review_due'::text THEN 'Verified · re-check pending'::text
            WHEN s.state = 'lapsed'::text THEN 'Badge paused · awaiting remediation'::text
            WHEN s.state = 'suspended'::text THEN 'Suspended'::text
            ELSE 'Not verified'::text
        END AS badge_label
   FROM public.public_facilities f
     LEFT JOIN facility_verification_state s ON s.facility_id = f.id;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. facility_name_aliases — replace the inline facilities subquery.
--
--    An RLS policy's subquery runs with the CALLER's privileges and RLS, so
--    once the approved-row policy is dropped in step 4 this predicate would
--    silently evaluate to false for every anon visitor and the alias table
--    would go dark (breaking slug-alias resolution / legacy URL redirects).
--    is_approved_facility() is SECURITY DEFINER with EXECUTE granted to anon,
--    and applies the identical approved + not-suspended test.
-- ─────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "facility_name_aliases_select_public" ON public.facility_name_aliases;

CREATE POLICY "facility_name_aliases_select_public"
  ON public.facility_name_aliases
  AS PERMISSIVE FOR SELECT
  USING (public.is_approved_facility(facility_id));

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. Close the raw base-table pathway.
--
--    facilities_select_public was TO public, i.e. anon AND authenticated. It
--    is the bypass. Replacing it with an anon-only policy means an ordinary
--    authenticated seeker matches NO select policy on facilities and can read
--    nothing raw — while facilities_select_authenticated (admin OR owner) and
--    facilities_team_select (user_can_access_facility) are left exactly as
--    they are, so providers, facility teams and admins are unaffected.
-- ─────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "facilities_select_public" ON public.facilities;

CREATE POLICY "facilities_select_public_anon"
  ON public.facilities
  AS PERMISSIVE FOR SELECT
  TO anon
  USING ((status = 'approved'::text) AND (COALESCE(suspended, false) = false));

COMMENT ON POLICY "facilities_select_public_anon" ON public.facilities IS
  'Anon may see approved, non-suspended rows, but NOT the phone column — that is revoked at the GRANT level below. Authenticated seekers intentionally have no public row policy at all; the public app reads facilities through public_facilities. Owner/team/admin SELECT is handled by facilities_select_authenticated and facilities_team_select.';

-- Column-level privilege boundary for anon. Table-level SELECT implies every
-- column, so it must be revoked wholesale and re-granted per column. The grant
-- is built dynamically from the live column list minus `phone`, which also
-- makes the boundary fail-closed: any column added to facilities in future is
-- NOT granted to anon until someone deliberately grants it.
DO $$
DECLARE
  v_cols text;
BEGIN
  SELECT string_agg(quote_ident(column_name), ', ' ORDER BY ordinal_position)
    INTO v_cols
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name  = 'facilities'
    AND column_name <> 'phone';

  IF v_cols IS NULL THEN
    RAISE EXCEPTION 'public.facilities has no columns — refusing to regrant';
  END IF;

  EXECUTE 'REVOKE SELECT ON public.facilities FROM anon';
  EXECUTE format('GRANT SELECT (%s) ON public.facilities TO anon', v_cols);
END
$$;

COMMENT ON COLUMN public.facilities.phone IS
  'Raw facility phone. INTERNAL/AUTHORIZED DATA: readable by the facility owner, the facility team, admins and service-role functions (claim SMS/voice verification, provider editing, admin moderation). It is NOT public: anon has no column privilege on it, ordinary authenticated seekers have no row policy on this table, and the public projection public_facilities.phone is masked to NULL unless has_active_pro(id).';
