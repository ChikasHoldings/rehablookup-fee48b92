-- Batch 6/11 — consolidate multi-permissive RLS policies.
-- Tables: public.facility_subscriptions, public.facility_views, public.featured_impressions, public.featured_phone_clicks, public.featured_placement_analytics
--
-- Strategy: drop service_role-only policies (no-op; service_role
-- bypasses RLS). For the remaining active policies in each (table,
-- command) group, OR them into a single PERMISSIVE policy with the
-- broadest role binding from the group. PostgreSQL OR-combines
-- multiple permissive policies anyway, so this is behavior-preserving
-- but eliminates the per-row planner overhead of evaluating each.

-- public.facility_subscriptions • SELECT (2 policies; 0 service_role-only dropped, 2 active)
DROP POLICY IF EXISTS "Admins can view all pro subscriptions" ON public.facility_subscriptions;
DROP POLICY IF EXISTS "Providers can view their own pro subscription" ON public.facility_subscriptions;
CREATE POLICY "facility_subscriptions_select_consolidated"
  ON public.facility_subscriptions
  AS PERMISSIVE FOR SELECT
  USING ((has_role(( SELECT auth.uid() AS uid), 'admin'::app_role)) OR ((provider_id = ( SELECT auth.uid() AS uid))));

-- public.facility_views • SELECT (2 policies; 0 service_role-only dropped, 2 active)
DROP POLICY IF EXISTS "Admins can view all facility views" ON public.facility_views;
DROP POLICY IF EXISTS "Owners can view their facility counts" ON public.facility_views;
CREATE POLICY "facility_views_select_consolidated"
  ON public.facility_views
  AS PERMISSIVE FOR SELECT
  USING ((has_role(( SELECT auth.uid() AS uid), 'admin'::app_role)) OR ((facility_id IN ( SELECT facilities.id
   FROM facilities
  WHERE (facilities.user_id = ( SELECT auth.uid() AS uid))))));

-- public.featured_impressions • SELECT (2 policies; 0 service_role-only dropped, 2 active)
DROP POLICY IF EXISTS "Admins can view all featured impressions" ON public.featured_impressions;
DROP POLICY IF EXISTS "Facility owners can view own featured impressions" ON public.featured_impressions;
CREATE POLICY "featured_impressions_select_consolidated"
  ON public.featured_impressions
  AS PERMISSIVE FOR SELECT
  TO authenticated
  USING ((is_admin(( SELECT auth.uid() AS uid))) OR ((facility_id IN ( SELECT facilities.id
   FROM facilities
  WHERE (facilities.user_id = ( SELECT auth.uid() AS uid))))));

-- public.featured_phone_clicks • SELECT (2 policies; 0 service_role-only dropped, 2 active)
DROP POLICY IF EXISTS "Admins can view all featured phone clicks" ON public.featured_phone_clicks;
DROP POLICY IF EXISTS "Facility owners can view own featured phone clicks" ON public.featured_phone_clicks;
CREATE POLICY "featured_phone_clicks_select_consolidated"
  ON public.featured_phone_clicks
  AS PERMISSIVE FOR SELECT
  TO authenticated
  USING ((is_admin(( SELECT auth.uid() AS uid))) OR ((facility_id IN ( SELECT facilities.id
   FROM facilities
  WHERE (facilities.user_id = ( SELECT auth.uid() AS uid))))));

-- public.featured_placement_analytics • SELECT (2 policies; 0 service_role-only dropped, 2 active)
DROP POLICY IF EXISTS "Admins can view featured analytics" ON public.featured_placement_analytics;
DROP POLICY IF EXISTS "Owners can view their facility analytics" ON public.featured_placement_analytics;
CREATE POLICY "featured_placement_analytics_select_consolidated"
  ON public.featured_placement_analytics
  AS PERMISSIVE FOR SELECT
  USING ((has_role(( SELECT auth.uid() AS uid), 'admin'::app_role)) OR ((facility_id IN ( SELECT facilities.id
   FROM facilities
  WHERE (facilities.user_id = ( SELECT auth.uid() AS uid))))));
