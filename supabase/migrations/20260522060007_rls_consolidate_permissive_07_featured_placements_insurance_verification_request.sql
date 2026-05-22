-- Batch 7/11 — consolidate multi-permissive RLS policies.
-- Tables: public.featured_placements, public.insurance_verification_requests, public.lead_contact_events, public.lead_distributions, public.leads
--
-- Strategy: drop service_role-only policies (no-op; service_role
-- bypasses RLS). For the remaining active policies in each (table,
-- command) group, OR them into a single PERMISSIVE policy with the
-- broadest role binding from the group. PostgreSQL OR-combines
-- multiple permissive policies anyway, so this is behavior-preserving
-- but eliminates the per-row planner overhead of evaluating each.

-- public.featured_placements • SELECT (2 policies; 0 service_role-only dropped, 2 active)
DROP POLICY IF EXISTS "Facility owners can view their own featured placements" ON public.featured_placements;
DROP POLICY IF EXISTS "Public can view active featured placements" ON public.featured_placements;
CREATE POLICY "featured_placements_select_consolidated"
  ON public.featured_placements
  AS PERMISSIVE FOR SELECT
  TO anon, authenticated
  USING (((facility_id IN ( SELECT facilities.id
   FROM facilities
  WHERE (facilities.user_id = ( SELECT auth.uid() AS uid))))) OR ((active = true)));

-- public.insurance_verification_requests • SELECT (2 policies; 0 service_role-only dropped, 2 active)
DROP POLICY IF EXISTS "Admins can read all VOB requests" ON public.insurance_verification_requests;
DROP POLICY IF EXISTS "Seekers can read their own linked VOB requests" ON public.insurance_verification_requests;
CREATE POLICY "insurance_verification_requests_select_consolidated"
  ON public.insurance_verification_requests
  AS PERMISSIVE FOR SELECT
  TO authenticated
  USING ((has_role(( SELECT auth.uid() AS uid), 'admin'::app_role)) OR ((linked_user_id = ( SELECT auth.uid() AS uid))));

-- public.lead_contact_events • SELECT (2 policies; 0 service_role-only dropped, 2 active)
DROP POLICY IF EXISTS "Admins can read all contact events" ON public.lead_contact_events;
DROP POLICY IF EXISTS "Providers can read own contact events" ON public.lead_contact_events;
CREATE POLICY "lead_contact_events_select_consolidated"
  ON public.lead_contact_events
  AS PERMISSIVE FOR SELECT
  TO authenticated
  USING ((has_role(( SELECT auth.uid() AS uid), 'admin'::app_role)) OR ((provider_id = ( SELECT auth.uid() AS uid))));

-- public.lead_distributions • SELECT (2 policies; 0 service_role-only dropped, 2 active)
DROP POLICY IF EXISTS "Admins can view all lead distributions" ON public.lead_distributions;
DROP POLICY IF EXISTS "Providers can view their own lead distributions" ON public.lead_distributions;
CREATE POLICY "lead_distributions_select_consolidated"
  ON public.lead_distributions
  AS PERMISSIVE FOR SELECT
  USING (((EXISTS ( SELECT 1
   FROM user_roles
  WHERE ((user_roles.user_id = ( SELECT auth.uid() AS uid)) AND (user_roles.role = 'admin'::app_role))))) OR ((facility_id IN ( SELECT facilities.id
   FROM facilities
  WHERE (facilities.user_id = ( SELECT auth.uid() AS uid))))));

-- public.leads • SELECT (4 policies; 0 service_role-only dropped, 4 active)
DROP POLICY IF EXISTS "Admins can view all leads" ON public.leads;
DROP POLICY IF EXISTS "Owners can view their facility leads" ON public.leads;
DROP POLICY IF EXISTS "Providers can view their redistributed leads" ON public.leads;
DROP POLICY IF EXISTS "Seekers can view their own submitted leads" ON public.leads;
CREATE POLICY "leads_select_consolidated"
  ON public.leads
  AS PERMISSIVE FOR SELECT
  USING ((has_role(( SELECT auth.uid() AS uid), 'admin'::app_role)) OR ((facility_id IN ( SELECT f.id
   FROM facilities f
  WHERE (f.user_id = ( SELECT auth.uid() AS uid))))) OR ((id IN ( SELECT ld.lead_id
   FROM (lead_distributions ld
     JOIN facilities f ON ((ld.facility_id = f.id)))
  WHERE (f.user_id = ( SELECT auth.uid() AS uid))))) OR ((email = (( SELECT auth.jwt() AS jwt) ->> 'email'::text))));

-- public.leads • UPDATE (2 policies; 0 service_role-only dropped, 2 active)
DROP POLICY IF EXISTS "Admins can update all leads" ON public.leads;
DROP POLICY IF EXISTS "Owners can update their facility leads" ON public.leads;
CREATE POLICY "leads_update_consolidated"
  ON public.leads
  AS PERMISSIVE FOR UPDATE
  TO authenticated
  USING ((has_role(( SELECT auth.uid() AS uid), 'admin'::app_role)) OR ((facility_id IN ( SELECT f.id
   FROM facilities f
  WHERE (f.user_id = ( SELECT auth.uid() AS uid))))))
  WITH CHECK ((has_role(( SELECT auth.uid() AS uid), 'admin'::app_role)) OR ((facility_id IN ( SELECT f.id
   FROM facilities f
  WHERE (f.user_id = ( SELECT auth.uid() AS uid))))));
