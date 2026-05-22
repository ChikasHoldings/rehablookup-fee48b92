-- Batch 2/11 — consolidate multi-permissive RLS policies.
-- Tables: public.badge_impressions, public.concierge_case_events, public.concierge_inquiries, public.concierge_introduction_audit, public.concierge_introductions
--
-- Strategy: drop service_role-only policies (no-op; service_role
-- bypasses RLS). For the remaining active policies in each (table,
-- command) group, OR them into a single PERMISSIVE policy with the
-- broadest role binding from the group. PostgreSQL OR-combines
-- multiple permissive policies anyway, so this is behavior-preserving
-- but eliminates the per-row planner overhead of evaluating each.

-- public.badge_impressions • SELECT (2 policies; 0 service_role-only dropped, 2 active)
DROP POLICY IF EXISTS "Admins can view all badge impressions" ON public.badge_impressions;
DROP POLICY IF EXISTS "Facility owners can view their badge impressions" ON public.badge_impressions;
CREATE POLICY "badge_impressions_select_consolidated"
  ON public.badge_impressions
  AS PERMISSIVE FOR SELECT
  USING (((EXISTS ( SELECT 1
   FROM user_roles
  WHERE ((user_roles.user_id = ( SELECT auth.uid() AS uid)) AND (user_roles.role = 'admin'::app_role))))) OR ((EXISTS ( SELECT 1
   FROM facilities f
  WHERE ((f.id = badge_impressions.facility_id) AND (f.user_id = ( SELECT auth.uid() AS uid)))))));

-- public.concierge_case_events • ALL (2 policies; 2 service_role-only dropped, 0 active)
DROP POLICY IF EXISTS "Service role can manage all events" ON public.concierge_case_events;
DROP POLICY IF EXISTS "Service role manages case events" ON public.concierge_case_events;
-- (no active policies remain for public.concierge_case_events/ALL; service_role bypasses RLS so behavior is unchanged)

-- public.concierge_case_events • SELECT (4 policies; 0 service_role-only dropped, 4 active)
DROP POLICY IF EXISTS "Admins can view all case events" ON public.concierge_case_events;
DROP POLICY IF EXISTS "Admins can view case events" ON public.concierge_case_events;
DROP POLICY IF EXISTS "Providers can view events for their matched cases" ON public.concierge_case_events;
DROP POLICY IF EXISTS "Seekers can view their own case events" ON public.concierge_case_events;
CREATE POLICY "concierge_case_events_select_consolidated"
  ON public.concierge_case_events
  AS PERMISSIVE FOR SELECT
  USING (((EXISTS ( SELECT 1
   FROM user_roles
  WHERE ((user_roles.user_id = ( SELECT auth.uid() AS uid)) AND (user_roles.role = 'admin'::app_role))))) OR (has_role(( SELECT auth.uid() AS uid), 'admin'::app_role)) OR ((EXISTS ( SELECT 1
   FROM (concierge_inquiries ci
     JOIN facilities f ON ((f.id = ANY (ci.matched_facility_ids))))
  WHERE ((ci.id = concierge_case_events.inquiry_id) AND (f.user_id = ( SELECT auth.uid() AS uid)))))) OR ((EXISTS ( SELECT 1
   FROM concierge_inquiries
  WHERE ((concierge_inquiries.id = concierge_case_events.inquiry_id) AND (concierge_inquiries.user_id = ( SELECT auth.uid() AS uid)))))));

-- public.concierge_inquiries • SELECT (3 policies; 0 service_role-only dropped, 3 active)
DROP POLICY IF EXISTS "Admins can view all concierge inquiries" ON public.concierge_inquiries;
DROP POLICY IF EXISTS "Providers can view disclosed inquiries" ON public.concierge_inquiries;
DROP POLICY IF EXISTS "Seekers can view own inquiries" ON public.concierge_inquiries;
CREATE POLICY "concierge_inquiries_select_consolidated"
  ON public.concierge_inquiries
  AS PERMISSIVE FOR SELECT
  USING ((has_role(( SELECT auth.uid() AS uid), 'admin'::app_role)) OR ((EXISTS ( SELECT 1
   FROM (concierge_introductions ci
     JOIN facilities f ON ((f.id = ci.facility_id)))
  WHERE ((ci.inquiry_id = concierge_inquiries.id) AND (f.user_id = ( SELECT auth.uid() AS uid)) AND ((ci.admin_disclosed_pii_at IS NOT NULL) OR ((concierge_inquiries.seeker_confirmed = true) AND (concierge_inquiries.placed_facility_id = f.id))))))) OR (((user_id = ( SELECT auth.uid() AS uid)) OR (user_email = current_user_email()))));

-- public.concierge_inquiries • UPDATE (2 policies; 0 service_role-only dropped, 2 active)
DROP POLICY IF EXISTS "Admins can update concierge inquiries" ON public.concierge_inquiries;
DROP POLICY IF EXISTS "Seekers can update limited inquiry fields" ON public.concierge_inquiries;
CREATE POLICY "concierge_inquiries_update_consolidated"
  ON public.concierge_inquiries
  AS PERMISSIVE FOR UPDATE
  USING ((has_role(( SELECT auth.uid() AS uid), 'admin'::app_role)) OR ((user_id = ( SELECT auth.uid() AS uid))))
  WITH CHECK ((has_role(( SELECT auth.uid() AS uid), 'admin'::app_role)) OR ((user_id = ( SELECT auth.uid() AS uid))));

-- public.concierge_introduction_audit • SELECT (2 policies; 0 service_role-only dropped, 2 active)
DROP POLICY IF EXISTS "Admins view all concierge audit" ON public.concierge_introduction_audit;
DROP POLICY IF EXISTS "Advisors view own concierge audit" ON public.concierge_introduction_audit;
CREATE POLICY "concierge_introduction_audit_select_consolidated"
  ON public.concierge_introduction_audit
  AS PERMISSIVE FOR SELECT
  TO authenticated
  USING ((is_admin(( SELECT auth.uid() AS uid))) OR ((advisor_id = ( SELECT auth.uid() AS uid))));

-- public.concierge_introductions • ALL (2 policies; 1 service_role-only dropped, 1 active)
DROP POLICY IF EXISTS "Service role manages introductions" ON public.concierge_introductions;
-- (kept 'Admins can manage concierge introductions' unchanged)

-- public.concierge_introductions • SELECT (2 policies; 0 service_role-only dropped, 2 active)
DROP POLICY IF EXISTS "Providers can view own introductions" ON public.concierge_introductions;
DROP POLICY IF EXISTS "Providers can view their introductions" ON public.concierge_introductions;
CREATE POLICY "concierge_introductions_select_consolidated"
  ON public.concierge_introductions
  AS PERMISSIVE FOR SELECT
  USING ((((facility_id IN ( SELECT facilities.id
   FROM facilities
  WHERE (facilities.user_id = ( SELECT auth.uid() AS uid)))) OR has_role(( SELECT auth.uid() AS uid), 'admin'::app_role))) OR ((EXISTS ( SELECT 1
   FROM facilities f
  WHERE ((f.id = concierge_introductions.facility_id) AND (f.user_id = ( SELECT auth.uid() AS uid)))))));
