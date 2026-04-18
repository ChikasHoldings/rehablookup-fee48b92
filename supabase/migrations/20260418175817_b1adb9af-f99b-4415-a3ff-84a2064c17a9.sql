-- Helpers (SECURITY DEFINER bypasses caller grants on facilities)

CREATE OR REPLACE FUNCTION public.is_approved_facility(_facility_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.facilities
    WHERE id = _facility_id
      AND status = 'approved'
      AND COALESCE(suspended, false) = false
  );
$$;

CREATE OR REPLACE FUNCTION public.user_owns_facility(_facility_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.facilities
    WHERE id = _facility_id
      AND user_id = _user_id
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_approved_facility(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.user_owns_facility(uuid, uuid) TO authenticated;

-- facility_staff
DROP POLICY IF EXISTS "Authenticated users can view staff names and roles" ON public.facility_staff;
DROP POLICY IF EXISTS "Anyone can view staff of approved facilities" ON public.facility_staff;
DROP POLICY IF EXISTS "Providers can view their facility staff" ON public.facility_staff;
DROP POLICY IF EXISTS "Providers can update their facility staff" ON public.facility_staff;
DROP POLICY IF EXISTS "Providers can delete their facility staff" ON public.facility_staff;

CREATE POLICY "Anyone can view staff of approved facilities"
ON public.facility_staff FOR SELECT
TO anon, authenticated
USING (is_visible = true AND public.is_approved_facility(facility_id));

CREATE POLICY "Providers can view their facility staff"
ON public.facility_staff FOR SELECT
TO authenticated
USING (public.user_owns_facility(facility_id, auth.uid()));

CREATE POLICY "Providers can update their facility staff"
ON public.facility_staff FOR UPDATE
TO authenticated
USING (public.user_owns_facility(facility_id, auth.uid()));

CREATE POLICY "Providers can delete their facility staff"
ON public.facility_staff FOR DELETE
TO authenticated
USING (public.user_owns_facility(facility_id, auth.uid()));

-- facility_services
DROP POLICY IF EXISTS "Anyone can view services of approved facilities" ON public.facility_services;
DROP POLICY IF EXISTS "Users can view services of their facilities" ON public.facility_services;
DROP POLICY IF EXISTS "Users can delete services from their facilities" ON public.facility_services;

CREATE POLICY "Anyone can view services of approved facilities"
ON public.facility_services FOR SELECT
TO anon, authenticated
USING (public.is_approved_facility(facility_id));

CREATE POLICY "Users can view services of their facilities"
ON public.facility_services FOR SELECT
TO authenticated
USING (public.user_owns_facility(facility_id, auth.uid()));

CREATE POLICY "Users can delete services from their facilities"
ON public.facility_services FOR DELETE
TO authenticated
USING (public.user_owns_facility(facility_id, auth.uid()));

-- facility_insurance
DROP POLICY IF EXISTS "Anyone can view insurance of approved facilities" ON public.facility_insurance;
DROP POLICY IF EXISTS "Users can view insurance of their facilities" ON public.facility_insurance;
DROP POLICY IF EXISTS "Users can delete insurance from their facilities" ON public.facility_insurance;

CREATE POLICY "Anyone can view insurance of approved facilities"
ON public.facility_insurance FOR SELECT
TO anon, authenticated
USING (public.is_approved_facility(facility_id));

CREATE POLICY "Users can view insurance of their facilities"
ON public.facility_insurance FOR SELECT
TO authenticated
USING (public.user_owns_facility(facility_id, auth.uid()));

CREATE POLICY "Users can delete insurance from their facilities"
ON public.facility_insurance FOR DELETE
TO authenticated
USING (public.user_owns_facility(facility_id, auth.uid()));

-- facility_age_groups
DROP POLICY IF EXISTS "Anyone can view age groups of approved facilities" ON public.facility_age_groups;
DROP POLICY IF EXISTS "Users can view age groups of their facilities" ON public.facility_age_groups;
DROP POLICY IF EXISTS "Users can delete age groups from their facilities" ON public.facility_age_groups;

CREATE POLICY "Anyone can view age groups of approved facilities"
ON public.facility_age_groups FOR SELECT
TO anon, authenticated
USING (public.is_approved_facility(facility_id));

CREATE POLICY "Users can view age groups of their facilities"
ON public.facility_age_groups FOR SELECT
TO authenticated
USING (public.user_owns_facility(facility_id, auth.uid()));

CREATE POLICY "Users can delete age groups from their facilities"
ON public.facility_age_groups FOR DELETE
TO authenticated
USING (public.user_owns_facility(facility_id, auth.uid()));

-- facility_accreditations
DROP POLICY IF EXISTS "Anyone can view verified accreditations of approved facilities" ON public.facility_accreditations;
DROP POLICY IF EXISTS "Users can view accreditations of their facilities" ON public.facility_accreditations;
DROP POLICY IF EXISTS "Users can delete accreditations from their facilities" ON public.facility_accreditations;

CREATE POLICY "Anyone can view verified accreditations of approved facilities"
ON public.facility_accreditations FOR SELECT
TO anon, authenticated
USING (verified = true AND public.is_approved_facility(facility_id));

CREATE POLICY "Users can view accreditations of their facilities"
ON public.facility_accreditations FOR SELECT
TO authenticated
USING (public.user_owns_facility(facility_id, auth.uid()));

CREATE POLICY "Users can delete accreditations from their facilities"
ON public.facility_accreditations FOR DELETE
TO authenticated
USING (public.user_owns_facility(facility_id, auth.uid()));

-- facility_reviews_config
DROP POLICY IF EXISTS "Public can view reviews config of approved facilities" ON public.facility_reviews_config;
DROP POLICY IF EXISTS "Providers can view their facility reviews config" ON public.facility_reviews_config;
DROP POLICY IF EXISTS "Providers can update their facility reviews config" ON public.facility_reviews_config;

CREATE POLICY "Public can view reviews config of approved facilities"
ON public.facility_reviews_config FOR SELECT
TO anon, authenticated
USING (show_on_profile = true AND public.is_approved_facility(facility_id));

CREATE POLICY "Providers can view their facility reviews config"
ON public.facility_reviews_config FOR SELECT
TO authenticated
USING (public.user_owns_facility(facility_id, auth.uid()));

CREATE POLICY "Providers can update their facility reviews config"
ON public.facility_reviews_config FOR UPDATE
TO authenticated
USING (public.user_owns_facility(facility_id, auth.uid()));

-- facility_reviews (provider read)
DROP POLICY IF EXISTS "Providers can view reviews for their facilities" ON public.facility_reviews;
CREATE POLICY "Providers can view reviews for their facilities"
ON public.facility_reviews FOR SELECT
TO authenticated
USING (public.user_owns_facility(facility_id, auth.uid()));

-- review_responses (provider read)
DROP POLICY IF EXISTS "Providers can view their facility responses" ON public.review_responses;
CREATE POLICY "Providers can view their facility responses"
ON public.review_responses FOR SELECT
TO authenticated
USING (public.user_owns_facility(facility_id, auth.uid()));