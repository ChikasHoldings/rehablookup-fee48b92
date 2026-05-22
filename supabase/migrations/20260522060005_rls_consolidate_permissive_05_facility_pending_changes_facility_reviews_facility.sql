-- Batch 5/11 — consolidate multi-permissive RLS policies.
-- Tables: public.facility_pending_changes, public.facility_reviews, public.facility_reviews_config, public.facility_services, public.facility_staff
--
-- Strategy: drop service_role-only policies (no-op; service_role
-- bypasses RLS). For the remaining active policies in each (table,
-- command) group, OR them into a single PERMISSIVE policy with the
-- broadest role binding from the group. PostgreSQL OR-combines
-- multiple permissive policies anyway, so this is behavior-preserving
-- but eliminates the per-row planner overhead of evaluating each.

-- public.facility_pending_changes • DELETE (2 policies; 0 service_role-only dropped, 2 active)
DROP POLICY IF EXISTS "Admins can delete pending changes" ON public.facility_pending_changes;
DROP POLICY IF EXISTS "Providers can delete their pending changes" ON public.facility_pending_changes;
CREATE POLICY "facility_pending_changes_delete_consolidated"
  ON public.facility_pending_changes
  AS PERMISSIVE FOR DELETE
  USING ((has_role(( SELECT auth.uid() AS uid), 'admin'::app_role)) OR (((( SELECT auth.uid() AS uid) = provider_id) AND (pending_status = 'pending'::text))));

-- public.facility_pending_changes • SELECT (2 policies; 0 service_role-only dropped, 2 active)
DROP POLICY IF EXISTS "Admins can view all pending changes" ON public.facility_pending_changes;
DROP POLICY IF EXISTS "Providers can view their own pending changes" ON public.facility_pending_changes;
CREATE POLICY "facility_pending_changes_select_consolidated"
  ON public.facility_pending_changes
  AS PERMISSIVE FOR SELECT
  USING ((has_role(( SELECT auth.uid() AS uid), 'admin'::app_role)) OR ((( SELECT auth.uid() AS uid) = provider_id)));

-- public.facility_pending_changes • UPDATE (2 policies; 0 service_role-only dropped, 2 active)
DROP POLICY IF EXISTS "Admins can update pending changes" ON public.facility_pending_changes;
DROP POLICY IF EXISTS "Providers can update their pending changes" ON public.facility_pending_changes;
CREATE POLICY "facility_pending_changes_update_consolidated"
  ON public.facility_pending_changes
  AS PERMISSIVE FOR UPDATE
  USING ((has_role(( SELECT auth.uid() AS uid), 'admin'::app_role)) OR (((( SELECT auth.uid() AS uid) = provider_id) AND (pending_status = 'pending'::text))))
  WITH CHECK ((has_role(( SELECT auth.uid() AS uid), 'admin'::app_role)) OR (((( SELECT auth.uid() AS uid) = provider_id) AND (pending_status = 'pending'::text))));

-- public.facility_reviews • DELETE (2 policies; 0 service_role-only dropped, 2 active)
DROP POLICY IF EXISTS "Admins can delete reviews" ON public.facility_reviews;
DROP POLICY IF EXISTS "Users can delete their own reviews" ON public.facility_reviews;
CREATE POLICY "facility_reviews_delete_consolidated"
  ON public.facility_reviews
  AS PERMISSIVE FOR DELETE
  USING ((has_role(( SELECT auth.uid() AS uid), 'admin'::app_role)) OR ((( SELECT auth.uid() AS uid) = user_id)));

-- public.facility_reviews • SELECT (4 policies; 0 service_role-only dropped, 4 active)
DROP POLICY IF EXISTS "Admins can view all reviews" ON public.facility_reviews;
DROP POLICY IF EXISTS "Providers can view reviews for their facilities" ON public.facility_reviews;
DROP POLICY IF EXISTS "Users can view approved reviews" ON public.facility_reviews;
DROP POLICY IF EXISTS "Users can view their own reviews" ON public.facility_reviews;
CREATE POLICY "facility_reviews_select_consolidated"
  ON public.facility_reviews
  AS PERMISSIVE FOR SELECT
  USING ((has_role(( SELECT auth.uid() AS uid), 'admin'::app_role)) OR (user_owns_facility(facility_id, ( SELECT auth.uid() AS uid))) OR ((status = 'approved'::text)) OR ((( SELECT auth.uid() AS uid) = user_id)));

-- public.facility_reviews • UPDATE (2 policies; 0 service_role-only dropped, 2 active)
DROP POLICY IF EXISTS "Admins can update all reviews" ON public.facility_reviews;
DROP POLICY IF EXISTS "Users can update their own pending reviews" ON public.facility_reviews;
CREATE POLICY "facility_reviews_update_consolidated"
  ON public.facility_reviews
  AS PERMISSIVE FOR UPDATE
  USING ((has_role(( SELECT auth.uid() AS uid), 'admin'::app_role)) OR (((( SELECT auth.uid() AS uid) = user_id) AND (status = 'pending'::text))))
  WITH CHECK ((has_role(( SELECT auth.uid() AS uid), 'admin'::app_role)) OR (((( SELECT auth.uid() AS uid) = user_id) AND (status = 'pending'::text))));

-- public.facility_reviews_config • SELECT (3 policies; 0 service_role-only dropped, 3 active)
DROP POLICY IF EXISTS "Admins can view all reviews config" ON public.facility_reviews_config;
DROP POLICY IF EXISTS "Providers can view their facility reviews config" ON public.facility_reviews_config;
DROP POLICY IF EXISTS "Public can view reviews config of approved facilities" ON public.facility_reviews_config;
CREATE POLICY "facility_reviews_config_select_consolidated"
  ON public.facility_reviews_config
  AS PERMISSIVE FOR SELECT
  USING ((has_role(( SELECT auth.uid() AS uid), 'admin'::app_role)) OR (user_owns_facility(facility_id, ( SELECT auth.uid() AS uid))) OR (((show_on_profile = true) AND is_approved_facility(facility_id))));

-- public.facility_services • SELECT (2 policies; 0 service_role-only dropped, 2 active)
DROP POLICY IF EXISTS "Anyone can view services of approved facilities" ON public.facility_services;
DROP POLICY IF EXISTS "Users can view services of their facilities" ON public.facility_services;
CREATE POLICY "facility_services_select_consolidated"
  ON public.facility_services
  AS PERMISSIVE FOR SELECT
  TO anon, authenticated
  USING ((is_approved_facility(facility_id)) OR (user_owns_facility(facility_id, ( SELECT auth.uid() AS uid))));

-- public.facility_staff • DELETE (2 policies; 0 service_role-only dropped, 2 active)
DROP POLICY IF EXISTS "Admins can delete all staff" ON public.facility_staff;
DROP POLICY IF EXISTS "Providers can delete their facility staff" ON public.facility_staff;
CREATE POLICY "facility_staff_delete_consolidated"
  ON public.facility_staff
  AS PERMISSIVE FOR DELETE
  USING ((has_role(( SELECT auth.uid() AS uid), 'admin'::app_role)) OR (user_owns_facility(facility_id, ( SELECT auth.uid() AS uid))));

-- public.facility_staff • SELECT (2 policies; 0 service_role-only dropped, 2 active)
DROP POLICY IF EXISTS "Admins can view all staff" ON public.facility_staff;
DROP POLICY IF EXISTS "Providers can view their facility staff" ON public.facility_staff;
CREATE POLICY "facility_staff_select_consolidated"
  ON public.facility_staff
  AS PERMISSIVE FOR SELECT
  USING ((has_role(( SELECT auth.uid() AS uid), 'admin'::app_role)) OR (user_owns_facility(facility_id, ( SELECT auth.uid() AS uid))));

-- public.facility_staff • UPDATE (2 policies; 0 service_role-only dropped, 2 active)
DROP POLICY IF EXISTS "Admins can update all staff" ON public.facility_staff;
DROP POLICY IF EXISTS "Providers can update their facility staff" ON public.facility_staff;
CREATE POLICY "facility_staff_update_consolidated"
  ON public.facility_staff
  AS PERMISSIVE FOR UPDATE
  USING ((has_role(( SELECT auth.uid() AS uid), 'admin'::app_role)) OR (user_owns_facility(facility_id, ( SELECT auth.uid() AS uid))))
  WITH CHECK ((has_role(( SELECT auth.uid() AS uid), 'admin'::app_role)) OR (user_owns_facility(facility_id, ( SELECT auth.uid() AS uid))));
