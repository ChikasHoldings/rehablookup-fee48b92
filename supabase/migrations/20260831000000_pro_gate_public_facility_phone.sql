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
-- WHY THE RAW TABLE LEAVES THE ANONYMOUS DATA API ENTIRELY
--   An earlier revision of this migration kept anon on the base table and
--   merely subtracted one column, by re-granting "every current column except
--   phone". That was wrong, and it was wrong in a way that would have grown
--   worse over time: public.facilities is not a directory table with an
--   awkward phone column on it. It is the internal provider record. It
--   currently carries admin_notes, user_id, email, reply_email,
--   reply_email_verified*, verified_phone, verified_phone_set_at,
--   has_facility_verified_contact, claim_owner_id, claim_status,
--   rejection_reason, claimed_at, profile_reminder_*, last_activity_at,
--   leads_reset_at, suspended, last_featured_shown_at, and the whole
--   Concierge-era block (concierge_notes, concierge_admissions_email,
--   concierge_admissions_phone, concierge_license_number,
--   concierge_terms_accepted_by, concierge_eligibility_revoked_reason, …).
--   Enumerating a deny-list of one against that surface publishes all of it.
--
--   The correct boundary is not "which columns of the internal record may an
--   anonymous caller read" — it is that an anonymous caller has no business
--   addressing the internal record at all. Anonymous directory reads go
--   through public.public_facilities (and the other public projections /
--   RPCs), which are explicit, reviewable allow-lists of directory fields.
--   So this migration removes anon from public.facilities completely: no row
--   policy, no table privilege, no column privileges. There is nothing left
--   to enumerate, and a column added to facilities next quarter is public
--   only if someone deliberately adds it to a public projection.
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
--                           including `phone`. The `authenticated` TABLE
--                           privilege is deliberately left alone: owner, team
--                           and admin all share that one Postgres role, and
--                           authorization between them is expressed in RLS.
--        • anon           → loses raw facilities access outright. No SELECT
--                           policy, no table privilege, no column privilege.
--                           Anonymous reads use the public projections.
--        • service_role   → untouched (it bypasses RLS by design and backs
--                           the public Edge functions, claim SMS/voice
--                           verification, and the prerender pipeline).
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
-- ROLLBACK — EMERGENCY ONLY, AND ONLY AS A WHOLE
--   The steps below restore the PRE-MIGRATION PRODUCTION STATE. They are not
--   a partial escape hatch and no part of them belongs in the forward path:
--   re-granting anon on the base table re-opens both the phone leak and the
--   internal-column exposure described above. Run them only if this entire
--   migration is being reverted.
--
--     -- restore the view bodies from
--     --   20260830000000_public_facilities_visible_to_own_claimant.sql
--     -- re-point the five projections back to `facilities`, and restore
--     -- facility_name_aliases_select_public from its prior definition, then:
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
-- 4. Remove the raw base table from the anonymous Data API.
--
--    facilities_select_public was TO public, i.e. anon AND authenticated. It
--    is the bypass, and it goes. Nothing anon-scoped replaces it:
--
--      • ordinary authenticated seeker — matches no SELECT policy on
--        facilities, so RLS returns zero rows. They keep the `authenticated`
--        table privilege only because owner / team / admin share that same
--        Postgres role; the privilege alone grants no rows.
--      • anon — loses the policy AND the privilege. Even with RLS satisfied
--        there is no grant, and even with a grant there is no policy. Two
--        independent boundaries, both closed.
--      • facilities_select_authenticated (admin OR owner) and
--        facilities_team_select (user_can_access_facility) are untouched, so
--        providers, facility teams and admins keep full raw access including
--        `phone`.
--
--    Steps 2 and 3 above are what make this safe: every public projection now
--    sources approved-facility identity from public_facilities (SECURITY
--    DEFINER) or from is_approved_facility() (SECURITY DEFINER), so no
--    anonymous read path depends on the caller holding raw-table access.
-- ─────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "facilities_select_public" ON public.facilities;

-- Defensive: an earlier revision of this migration created an anon-scoped
-- replacement policy. It must not survive, including on any environment that
-- ran that revision.
DROP POLICY IF EXISTS "facilities_select_public_anon" ON public.facilities;

-- Table-level REVOKE also drops every column-level SELECT on the same table,
-- which is what retires the earlier "every column except phone" grant.
REVOKE SELECT ON public.facilities FROM anon;

-- Fail-closed post-condition. If any table or column SELECT survives for anon
-- — a stray historical column grant, a re-grant from another migration — the
-- migration aborts rather than shipping a boundary that only reads as closed.
DO $$
DECLARE
  v_leaked text;
BEGIN
  IF has_table_privilege('anon', 'public.facilities', 'SELECT') THEN
    RAISE EXCEPTION 'anon still holds table-level SELECT on public.facilities';
  END IF;

  SELECT string_agg(a.attname, ', ' ORDER BY a.attnum)
    INTO v_leaked
  FROM pg_attribute a
  WHERE a.attrelid = 'public.facilities'::regclass
    AND a.attnum > 0
    AND NOT a.attisdropped
    AND has_column_privilege('anon', a.attrelid, a.attnum, 'SELECT');

  IF v_leaked IS NOT NULL THEN
    RAISE EXCEPTION
      'anon still holds column-level SELECT on public.facilities: %', v_leaked;
  END IF;
END
$$;

COMMENT ON TABLE public.facilities IS
  'INTERNAL provider record — NOT a public directory table. It carries operational and contact data that is not part of the public listing (admin_notes, user_id, email, reply_email*, verified_phone*, claim_owner_id, claim_status, rejection_reason, profile_reminder_*, leads_reset_at, suspended, and the concierge_* block). Anonymous callers have NO access to it: no SELECT policy, no table privilege, no column privileges. Public/anonymous directory reads go through public.public_facilities and the other public projections/RPCs, which are explicit allow-lists of directory fields. Raw access is authorized only for the facility owner (facilities_select_authenticated), the facility team (facilities_team_select), admins, and service_role.';

COMMENT ON COLUMN public.facilities.phone IS
  'Raw facility phone. INTERNAL/AUTHORIZED DATA: readable by the facility owner, the facility team, admins and service-role functions (claim SMS/voice verification, provider editing, admin moderation). It is NOT public: anon cannot select this table at all, ordinary authenticated seekers have no row policy on it, and the public projection public_facilities.phone is masked to NULL unless has_active_pro(id).';
