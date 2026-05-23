-- HOTFIX (extends 20260523011000_fix_blog_articles_anon_rls_breakage)
-- — anon visitors can't read core public tables because the batch-12
-- multi-permissive consolidation put admin-check functions
-- (has_role / user_is_admin / is_admin) into TO-public SELECT
-- predicates that Phase 2B revoked anon's EXECUTE on.
--
-- Three repairs needed:
--   1. anon needs table-level SELECT grant on public.facilities so the
--      SECURITY INVOKER view public_facilities can read through.
--   2. Each affected table's SELECT policy must be split so the anon
--      path doesn't call any of the revoked admin/owner-check helpers.
--   3. Documented exception: re-introduces multiple_permissive_policies
--      warnings on (table, authenticated, SELECT). The lint is
--      informational; a broken public site is not.
--
-- Verified broken (this session, SET LOCAL ROLE anon + SELECT *):
--   blog_articles           — fixed in 20260523011000
--   facilities              — 42501 permission denied for function has_role
--   public_facilities (view)— 42501 permission denied for table facilities
--   facility_reviews        — same pattern
--   facility_accreditations — same pattern
--   review_responses        — same pattern
--   facility_reviews_config — same pattern
-- ─────────────────────────────────────────────────────────────────────

-- 1. anon needs SELECT on facilities for the SECURITY INVOKER view.
GRANT SELECT ON public.facilities TO anon;

-- 2. Re-split each broken SELECT policy. Pattern:
--     <table>_select_public         TO public (anon+authenticated)
--                                   — only public predicates, no fn calls
--     <table>_select_authenticated  TO authenticated
--                                   — admin/owner paths that call helpers

-- ─── facilities ─────────────────────────────────────────────────────
DROP POLICY IF EXISTS "facilities_select_consolidated" ON public.facilities;

CREATE POLICY "facilities_select_public"
  ON public.facilities
  AS PERMISSIVE FOR SELECT
  USING ((status = 'approved'::text) AND (COALESCE(suspended, false) = false));

CREATE POLICY "facilities_select_authenticated"
  ON public.facilities
  AS PERMISSIVE FOR SELECT
  TO authenticated
  USING (has_role((SELECT auth.uid()), 'admin'::app_role) OR ((SELECT auth.uid()) = user_id));

-- ─── facility_accreditations ────────────────────────────────────────
DROP POLICY IF EXISTS "facility_accreditations_select_consolidated" ON public.facility_accreditations;

CREATE POLICY "facility_accreditations_select_public"
  ON public.facility_accreditations
  AS PERMISSIVE FOR SELECT
  USING ((verified = true) AND is_approved_facility(facility_id));

CREATE POLICY "facility_accreditations_select_authenticated"
  ON public.facility_accreditations
  AS PERMISSIVE FOR SELECT
  TO authenticated
  USING (has_role((SELECT auth.uid()), 'admin'::app_role) OR user_owns_facility(facility_id, (SELECT auth.uid())));

-- ─── facility_reviews ───────────────────────────────────────────────
DROP POLICY IF EXISTS "facility_reviews_select_consolidated" ON public.facility_reviews;

CREATE POLICY "facility_reviews_select_public"
  ON public.facility_reviews
  AS PERMISSIVE FOR SELECT
  USING (status = 'approved'::text);

CREATE POLICY "facility_reviews_select_authenticated"
  ON public.facility_reviews
  AS PERMISSIVE FOR SELECT
  TO authenticated
  USING (has_role((SELECT auth.uid()), 'admin'::app_role)
         OR user_owns_facility(facility_id, (SELECT auth.uid()))
         OR ((SELECT auth.uid()) = user_id));

-- ─── facility_reviews_config ────────────────────────────────────────
DROP POLICY IF EXISTS "facility_reviews_config_select_consolidated" ON public.facility_reviews_config;

CREATE POLICY "facility_reviews_config_select_public"
  ON public.facility_reviews_config
  AS PERMISSIVE FOR SELECT
  USING ((show_on_profile = true) AND is_approved_facility(facility_id));

CREATE POLICY "facility_reviews_config_select_authenticated"
  ON public.facility_reviews_config
  AS PERMISSIVE FOR SELECT
  TO authenticated
  USING (has_role((SELECT auth.uid()), 'admin'::app_role)
         OR user_owns_facility(facility_id, (SELECT auth.uid())));

-- ─── review_responses ───────────────────────────────────────────────
DROP POLICY IF EXISTS "review_responses_select_consolidated" ON public.review_responses;

CREATE POLICY "review_responses_select_public"
  ON public.review_responses
  AS PERMISSIVE FOR SELECT
  USING ((status = 'active'::text) AND (review_id IN (
    SELECT facility_reviews.id FROM public.facility_reviews
    WHERE facility_reviews.status = 'approved'::text
  )));

CREATE POLICY "review_responses_select_authenticated"
  ON public.review_responses
  AS PERMISSIVE FOR SELECT
  TO authenticated
  USING (has_role((SELECT auth.uid()), 'admin'::app_role)
         OR user_owns_facility(facility_id, (SELECT auth.uid())));
