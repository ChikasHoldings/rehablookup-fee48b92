-- Batch 9/11 — consolidate multi-permissive RLS policies.
-- Tables: public.review_disputes, public.review_requests, public.review_responses, public.seeker_profiles, public.subscription_events
--
-- Strategy: drop service_role-only policies (no-op; service_role
-- bypasses RLS). For the remaining active policies in each (table,
-- command) group, OR them into a single PERMISSIVE policy with the
-- broadest role binding from the group. PostgreSQL OR-combines
-- multiple permissive policies anyway, so this is behavior-preserving
-- but eliminates the per-row planner overhead of evaluating each.

-- public.review_disputes • SELECT (2 policies; 0 service_role-only dropped, 2 active)
DROP POLICY IF EXISTS "Admins can view all disputes" ON public.review_disputes;
DROP POLICY IF EXISTS "Providers can view their facility disputes" ON public.review_disputes;
CREATE POLICY "review_disputes_select_consolidated"
  ON public.review_disputes
  AS PERMISSIVE FOR SELECT
  USING ((has_role(( SELECT auth.uid() AS uid), 'admin'::app_role)) OR ((facility_id IN ( SELECT facilities.id
   FROM facilities
  WHERE (facilities.user_id = ( SELECT auth.uid() AS uid))))));

-- public.review_requests • SELECT (2 policies; 0 service_role-only dropped, 2 active)
DROP POLICY IF EXISTS "Admins can view all review requests" ON public.review_requests;
DROP POLICY IF EXISTS "Providers can view their own review requests" ON public.review_requests;
CREATE POLICY "review_requests_select_consolidated"
  ON public.review_requests
  AS PERMISSIVE FOR SELECT
  USING ((has_role(( SELECT auth.uid() AS uid), 'admin'::app_role)) OR ((facility_id IN ( SELECT facilities.id
   FROM facilities
  WHERE (facilities.user_id = ( SELECT auth.uid() AS uid))))));

-- public.review_responses • SELECT (3 policies; 0 service_role-only dropped, 3 active)
DROP POLICY IF EXISTS "Admins can view all responses" ON public.review_responses;
DROP POLICY IF EXISTS "Providers can view their facility responses" ON public.review_responses;
DROP POLICY IF EXISTS "Public can view active responses" ON public.review_responses;
CREATE POLICY "review_responses_select_consolidated"
  ON public.review_responses
  AS PERMISSIVE FOR SELECT
  USING ((has_role(( SELECT auth.uid() AS uid), 'admin'::app_role)) OR (user_owns_facility(facility_id, ( SELECT auth.uid() AS uid))) OR (((status = 'active'::text) AND (review_id IN ( SELECT facility_reviews.id
   FROM facility_reviews
  WHERE (facility_reviews.status = 'approved'::text))))));

-- public.review_responses • UPDATE (2 policies; 0 service_role-only dropped, 2 active)
DROP POLICY IF EXISTS "Admins can update all responses" ON public.review_responses;
DROP POLICY IF EXISTS "Providers can update their own responses" ON public.review_responses;
CREATE POLICY "review_responses_update_consolidated"
  ON public.review_responses
  AS PERMISSIVE FOR UPDATE
  USING ((has_role(( SELECT auth.uid() AS uid), 'admin'::app_role)) OR ((responder_user_id = ( SELECT auth.uid() AS uid))))
  WITH CHECK ((has_role(( SELECT auth.uid() AS uid), 'admin'::app_role)) OR ((responder_user_id = ( SELECT auth.uid() AS uid))));

-- public.seeker_profiles • SELECT (2 policies; 0 service_role-only dropped, 2 active)
DROP POLICY IF EXISTS "Admins can view all seeker profiles" ON public.seeker_profiles;
DROP POLICY IF EXISTS "Users can view their own seeker profile" ON public.seeker_profiles;
CREATE POLICY "seeker_profiles_select_consolidated"
  ON public.seeker_profiles
  AS PERMISSIVE FOR SELECT
  USING ((has_role(( SELECT auth.uid() AS uid), 'admin'::app_role)) OR ((( SELECT auth.uid() AS uid) = user_id)));

-- public.subscription_events • SELECT (2 policies; 0 service_role-only dropped, 2 active)
DROP POLICY IF EXISTS "Admins can view all subscription events" ON public.subscription_events;
DROP POLICY IF EXISTS "Providers can view their own subscription events" ON public.subscription_events;
CREATE POLICY "subscription_events_select_consolidated"
  ON public.subscription_events
  AS PERMISSIVE FOR SELECT
  USING ((has_role(( SELECT auth.uid() AS uid), 'admin'::app_role)) OR ((user_id = ( SELECT auth.uid() AS uid))));
