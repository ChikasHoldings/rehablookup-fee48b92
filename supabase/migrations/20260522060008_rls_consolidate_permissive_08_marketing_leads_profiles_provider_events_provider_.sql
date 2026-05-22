-- Batch 8/11 — consolidate multi-permissive RLS policies.
-- Tables: public.marketing_leads, public.profiles, public.provider_events, public.provider_payment_methods, public.rate_limit_log
--
-- Strategy: drop service_role-only policies (no-op; service_role
-- bypasses RLS). For the remaining active policies in each (table,
-- command) group, OR them into a single PERMISSIVE policy with the
-- broadest role binding from the group. PostgreSQL OR-combines
-- multiple permissive policies anyway, so this is behavior-preserving
-- but eliminates the per-row planner overhead of evaluating each.

-- public.marketing_leads • ALL (2 policies; 1 service_role-only dropped, 1 active)
DROP POLICY IF EXISTS "Service role full access to marketing leads" ON public.marketing_leads;
-- (kept 'Admins can manage marketing leads' unchanged)

-- public.profiles • SELECT (2 policies; 0 service_role-only dropped, 2 active)
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
CREATE POLICY "profiles_select_consolidated"
  ON public.profiles
  AS PERMISSIVE FOR SELECT
  USING ((has_role(( SELECT auth.uid() AS uid), 'admin'::app_role)) OR ((( SELECT auth.uid() AS uid) = user_id)));

-- public.provider_events • SELECT (2 policies; 0 service_role-only dropped, 2 active)
DROP POLICY IF EXISTS "Admins can view all events" ON public.provider_events;
DROP POLICY IF EXISTS "Owners can view their facility events" ON public.provider_events;
CREATE POLICY "provider_events_select_consolidated"
  ON public.provider_events
  AS PERMISSIVE FOR SELECT
  USING ((has_role(( SELECT auth.uid() AS uid), 'admin'::app_role)) OR ((facility_id IN ( SELECT facilities.id
   FROM facilities
  WHERE (facilities.user_id = ( SELECT auth.uid() AS uid))))));

-- public.provider_payment_methods • SELECT (2 policies; 0 service_role-only dropped, 2 active)
DROP POLICY IF EXISTS "Admins can view all payment methods" ON public.provider_payment_methods;
DROP POLICY IF EXISTS "Providers can view own payment methods" ON public.provider_payment_methods;
CREATE POLICY "provider_payment_methods_select_consolidated"
  ON public.provider_payment_methods
  AS PERMISSIVE FOR SELECT
  USING ((has_role(( SELECT auth.uid() AS uid), 'admin'::app_role)) OR ((facility_id IN ( SELECT facilities.id
   FROM facilities
  WHERE (facilities.user_id = ( SELECT auth.uid() AS uid))))));

-- public.rate_limit_log • SELECT (2 policies; 1 service_role-only dropped, 1 active)
DROP POLICY IF EXISTS "Service role select rate limit logs" ON public.rate_limit_log;
-- (kept 'Admins can view rate limit logs' unchanged)
