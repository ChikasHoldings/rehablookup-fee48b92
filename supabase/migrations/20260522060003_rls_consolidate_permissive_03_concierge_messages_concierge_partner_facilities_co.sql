-- Batch 3/11 — consolidate multi-permissive RLS policies.
-- Tables: public.concierge_messages, public.concierge_partner_facilities, public.concierge_threads, public.concierge_tour_requests, public.facilities
--
-- Strategy: drop service_role-only policies (no-op; service_role
-- bypasses RLS). For the remaining active policies in each (table,
-- command) group, OR them into a single PERMISSIVE policy with the
-- broadest role binding from the group. PostgreSQL OR-combines
-- multiple permissive policies anyway, so this is behavior-preserving
-- but eliminates the per-row planner overhead of evaluating each.

-- public.concierge_messages • INSERT (2 policies; 0 service_role-only dropped, 2 active)
DROP POLICY IF EXISTS "Providers can insert messages in their facility threads" ON public.concierge_messages;
DROP POLICY IF EXISTS "Users can create messages in own threads" ON public.concierge_messages;
CREATE POLICY "concierge_messages_insert_consolidated"
  ON public.concierge_messages
  AS PERMISSIVE FOR INSERT
  WITH CHECK ((((sender_id = ( SELECT auth.uid() AS uid)) AND (sender_type = 'provider'::text) AND (thread_id IN ( SELECT ct.id
   FROM (concierge_threads ct
     JOIN facilities f ON ((ct.facility_id = f.id)))
  WHERE (f.user_id = ( SELECT auth.uid() AS uid)))))) OR (((thread_id IN ( SELECT concierge_threads.id
   FROM concierge_threads
  WHERE (concierge_threads.user_id = ( SELECT auth.uid() AS uid)))) AND (sender_id = ( SELECT auth.uid() AS uid)))));

-- public.concierge_messages • SELECT (2 policies; 0 service_role-only dropped, 2 active)
DROP POLICY IF EXISTS "Providers can view messages in their facility threads" ON public.concierge_messages;
DROP POLICY IF EXISTS "Users can view messages in own threads" ON public.concierge_messages;
CREATE POLICY "concierge_messages_select_consolidated"
  ON public.concierge_messages
  AS PERMISSIVE FOR SELECT
  USING (((thread_id IN ( SELECT ct.id
   FROM (concierge_threads ct
     JOIN facilities f ON ((ct.facility_id = f.id)))
  WHERE (f.user_id = ( SELECT auth.uid() AS uid))))) OR ((thread_id IN ( SELECT concierge_threads.id
   FROM concierge_threads
  WHERE (concierge_threads.user_id = ( SELECT auth.uid() AS uid))))));

-- public.concierge_partner_facilities • SELECT (2 policies; 0 service_role-only dropped, 2 active)
DROP POLICY IF EXISTS "Admins can view all concierge partners" ON public.concierge_partner_facilities;
DROP POLICY IF EXISTS "Facility owners can view own concierge partner record" ON public.concierge_partner_facilities;
CREATE POLICY "concierge_partner_facilities_select_consolidated"
  ON public.concierge_partner_facilities
  AS PERMISSIVE FOR SELECT
  TO authenticated
  USING ((is_admin(( SELECT auth.uid() AS uid))) OR ((facility_id IN ( SELECT facilities.id
   FROM facilities
  WHERE (facilities.user_id = ( SELECT auth.uid() AS uid))))));

-- public.concierge_threads • SELECT (2 policies; 0 service_role-only dropped, 2 active)
DROP POLICY IF EXISTS "Providers can view threads for their facilities" ON public.concierge_threads;
DROP POLICY IF EXISTS "Users can view own threads" ON public.concierge_threads;
CREATE POLICY "concierge_threads_select_consolidated"
  ON public.concierge_threads
  AS PERMISSIVE FOR SELECT
  USING ((((facility_id IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM facilities f
  WHERE ((f.id = concierge_threads.facility_id) AND (f.user_id = ( SELECT auth.uid() AS uid))))))) OR ((user_id = ( SELECT auth.uid() AS uid))));

-- public.concierge_tour_requests • SELECT (2 policies; 0 service_role-only dropped, 2 active)
DROP POLICY IF EXISTS "Providers can view tours for their facilities" ON public.concierge_tour_requests;
DROP POLICY IF EXISTS "Users can view own tour requests" ON public.concierge_tour_requests;
CREATE POLICY "concierge_tour_requests_select_consolidated"
  ON public.concierge_tour_requests
  AS PERMISSIVE FOR SELECT
  USING (((facility_id IN ( SELECT facilities.id
   FROM facilities
  WHERE (facilities.user_id = ( SELECT auth.uid() AS uid))))) OR ((user_id = ( SELECT auth.uid() AS uid))));

-- public.facilities • SELECT (4 policies; 0 service_role-only dropped, 4 active)
DROP POLICY IF EXISTS "Admins can view all facilities" ON public.facilities;
DROP POLICY IF EXISTS "Anon can read approved facilities for public view" ON public.facilities;
DROP POLICY IF EXISTS "Authenticated can read approved facilities for public view" ON public.facilities;
DROP POLICY IF EXISTS "Users can view their own facilities" ON public.facilities;
CREATE POLICY "facilities_select_consolidated"
  ON public.facilities
  AS PERMISSIVE FOR SELECT
  USING ((has_role(( SELECT auth.uid() AS uid), 'admin'::app_role)) OR (((status = 'approved'::text) AND (COALESCE(suspended, false) = false))) OR (((status = 'approved'::text) AND (COALESCE(suspended, false) = false))) OR ((( SELECT auth.uid() AS uid) = user_id)));

-- public.facilities • UPDATE (2 policies; 0 service_role-only dropped, 2 active)
DROP POLICY IF EXISTS "Admins can update all facilities" ON public.facilities;
DROP POLICY IF EXISTS "Users can update their own facilities" ON public.facilities;
CREATE POLICY "facilities_update_consolidated"
  ON public.facilities
  AS PERMISSIVE FOR UPDATE
  USING ((has_role(( SELECT auth.uid() AS uid), 'admin'::app_role)) OR ((( SELECT auth.uid() AS uid) = user_id)))
  WITH CHECK ((has_role(( SELECT auth.uid() AS uid), 'admin'::app_role)) OR ((( SELECT auth.uid() AS uid) = user_id)));
