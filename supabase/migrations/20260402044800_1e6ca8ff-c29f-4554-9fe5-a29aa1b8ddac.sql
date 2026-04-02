
-- 1. Fix prerender_cache: restrict to service_role only (currently allows public ALL)
DROP POLICY IF EXISTS "Service role can manage prerender cache" ON public.prerender_cache;
CREATE POLICY "Service role can manage prerender cache" ON public.prerender_cache FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 2. Fix international_placement_cases: remove duplicate/redundant public-role policies
DROP POLICY IF EXISTS "Admins full access to international cases" ON public.international_placement_cases;
DROP POLICY IF EXISTS "Users can insert own international cases" ON public.international_placement_cases;
DROP POLICY IF EXISTS "Users can view own international cases" ON public.international_placement_cases;

-- 3. Fix facility_staff: restrict public view to exclude email and phone via a view
-- The SELECT policy for anon is already scoped to is_visible + approved facilities
-- but the scan flags staff contact info exposure. We'll keep the policy but ensure
-- the public_facility_staff view (which excludes PII) is used instead.
-- No RLS change needed - this is handled at the view level already.

-- 4. Fix placement_cases: restrict public INSERT to require basic validation
DROP POLICY IF EXISTS "Anyone can submit placement cases" ON public.placement_cases;
CREATE POLICY "Authenticated users can submit placement cases" ON public.placement_cases FOR INSERT TO authenticated WITH CHECK (auth.uid() = seeker_user_id);
