-- Convert the 6 public-directory views from SECURITY DEFINER to
-- security_invoker (Supabase advisor 0010_security_definer_view), backed by
-- public-read RLS that mirrors each view's existing filter so the public
-- output is unchanged. Verified equal on 3803 approved facilities / 9417
-- accreditations via a rollback-tested anon simulation before applying.

-- 1. Public-read RLS matching each view's filter (approved facility + Pro
--    gate + visibility). Additive/permissive — owner & admin policies keep
--    full access; this only grants the public the rows the views exposed.
DROP POLICY IF EXISTS "facility_amenities_select_public" ON public.facility_amenities;
CREATE POLICY "facility_amenities_select_public" ON public.facility_amenities FOR SELECT
  USING (is_approved_facility(facility_id) AND has_active_pro(facility_id));

DROP POLICY IF EXISTS "facility_programs_select_public" ON public.facility_programs;
CREATE POLICY "facility_programs_select_public" ON public.facility_programs FOR SELECT
  USING (is_approved_facility(facility_id) AND has_active_pro(facility_id) AND is_visible = true);

DROP POLICY IF EXISTS "facility_staff_select_public" ON public.facility_staff;
CREATE POLICY "facility_staff_select_public" ON public.facility_staff FOR SELECT
  USING (is_approved_facility(facility_id) AND has_active_pro(facility_id) AND is_visible = true);

DROP POLICY IF EXISTS "facility_accreditations_select_public_all" ON public.facility_accreditations;
CREATE POLICY "facility_accreditations_select_public_all" ON public.facility_accreditations FOR SELECT
  USING (is_approved_facility(facility_id));

DROP POLICY IF EXISTS "facility_verification_state_select_public" ON public.facility_verification_state;
CREATE POLICY "facility_verification_state_select_public" ON public.facility_verification_state FOR SELECT
  USING (is_approved_facility(facility_id));

-- 2. facility_staff lacked the anon SELECT grant the invoker view needs.
GRANT SELECT ON public.facility_staff TO anon;

-- 3. Flip the views to security_invoker so they enforce RLS instead of
--    bypassing it.
ALTER VIEW public.public_facilities SET (security_invoker = true);
ALTER VIEW public.public_facility_amenities SET (security_invoker = true);
ALTER VIEW public.public_facility_programs SET (security_invoker = true);
ALTER VIEW public.public_facility_staff SET (security_invoker = true);
ALTER VIEW public.public_facility_accreditations SET (security_invoker = true);
ALTER VIEW public.facility_badge_recency SET (security_invoker = true);
