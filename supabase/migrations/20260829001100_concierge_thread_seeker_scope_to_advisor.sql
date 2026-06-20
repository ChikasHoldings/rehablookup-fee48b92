-- ============================================================================
-- Concierge messaging privacy closure — scope seeker access to advisor threads
--
-- CONFIRMED leak (live role-simulation, before fix): seeker read facility
-- coordination thread=1 msg=1. Facility-coordination threads (thread_type
-- 'facility', the advisor<->facility coordination channel) are created with
-- user_id = the case's SEEKER (src/components/admin/concierge/MessagesTab.tsx
-- inserts user_id: caseData.user_id). Every seeker RLS branch on
-- concierge_threads / concierge_messages used a bare `user_id = auth.uid()`
-- with NO thread_type guard, so the seeker — whose uid equals the thread's
-- user_id — could READ (and INSERT into) the private facility<->advisor
-- coordination thread and its messages. The brokerage model explicitly hides
-- facility coordination from the client.
--
-- FIX: scope the seeker branches to thread_type='advisor' (the seeker-facing
-- advisor chat). Facility-coordination threads remain visible/writable only to
-- the facility owner (existing facility_id branch) and admins/advisors. This is
-- a policy-expression change only — no data-model change, no publication change.
-- Supabase realtime (postgres_changes) re-checks these SELECT policies per row,
-- so the realtime stream is corrected automatically (a seeker no longer
-- receives facility-thread message events).
--
-- Verified after fix (role-sim): seeker facThread=0 facMsg=0 (leak closed),
-- seeker advThread=1 advMsg=1 (own advisor chat preserved), seeker INSERT into
-- facility thread BLOCKED (42501), facility owner facThread=1 facMsg=1
-- (coordination access preserved). The seeker UI (AdvisorMessaging.tsx) already
-- queries .eq('thread_type','advisor'), so it is unaffected.
--
-- ROLLBACK: restore each seeker branch to `user_id = auth.uid()` and drop the
-- `AND thread_type='advisor'` from the two concierge_messages subqueries.
-- ============================================================================

-- 1) Threads SELECT: seeker sees only their own ADVISOR threads (not facility coord).
ALTER POLICY "concierge_threads_select_consolidated" ON public.concierge_threads
USING (
  (EXISTS (SELECT 1 FROM public.user_roles
           WHERE user_roles.user_id = (SELECT auth.uid()) AND user_roles.role = 'admin'::app_role))
  OR ((facility_id IS NOT NULL) AND (EXISTS (SELECT 1 FROM public.facilities f
           WHERE f.id = concierge_threads.facility_id AND f.user_id = (SELECT auth.uid()))))
  OR (thread_type = 'advisor' AND user_id = (SELECT auth.uid()))
);

-- 2) Threads UPDATE (read-state etc.): seeker may only touch their advisor threads.
ALTER POLICY "concierge_threads_update_consolidated" ON public.concierge_threads
USING (
  (EXISTS (SELECT 1 FROM public.user_roles
           WHERE user_roles.user_id = (SELECT auth.uid()) AND user_roles.role = 'admin'::app_role))
  OR (thread_type = 'advisor' AND user_id = (SELECT auth.uid()))
)
WITH CHECK (
  (EXISTS (SELECT 1 FROM public.user_roles
           WHERE user_roles.user_id = (SELECT auth.uid()) AND user_roles.role = 'admin'::app_role))
  OR (thread_type = 'advisor' AND user_id = (SELECT auth.uid()))
);

-- 3) Messages SELECT: seeker reads only ADVISOR-thread messages (facility coord stays private).
ALTER POLICY "concierge_messages_select_consolidated" ON public.concierge_messages
USING (
  has_role((SELECT auth.uid()), 'admin'::app_role)
  OR (thread_id IN (SELECT ct.id FROM public.concierge_threads ct
                    JOIN public.facilities f ON ct.facility_id = f.id
                    WHERE f.user_id = (SELECT auth.uid())))
  OR (thread_id IN (SELECT ct.id FROM public.concierge_threads ct
                    WHERE ct.user_id = (SELECT auth.uid()) AND ct.thread_type = 'advisor'))
);

-- 4) Messages INSERT: seeker may post only into their ADVISOR threads.
ALTER POLICY "concierge_messages_insert_consolidated" ON public.concierge_messages
WITH CHECK (
  has_role((SELECT auth.uid()), 'admin'::app_role)
  OR ((sender_id = (SELECT auth.uid())) AND (sender_type = 'provider')
      AND (thread_id IN (SELECT ct.id FROM public.concierge_threads ct
                         JOIN public.facilities f ON ct.facility_id = f.id
                         WHERE f.user_id = (SELECT auth.uid()))))
  OR ((thread_id IN (SELECT ct.id FROM public.concierge_threads ct
                     WHERE ct.user_id = (SELECT auth.uid()) AND ct.thread_type = 'advisor'))
      AND (sender_id = (SELECT auth.uid())))
);
