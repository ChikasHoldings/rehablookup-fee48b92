-- Concierge lifecycle hardening: seeker placement-review paths + free-tier PII boundary
--
-- C2: Seekers had NO RLS path to read their own concierge_introductions (the
--     table only grants admin + facility-owner SELECT), so the seeker "matched
--     options" card always rendered empty. Add a SECURITY DEFINER reader that
--     returns ONLY seeker-safe columns (id, facility_id, provider_response) for
--     'interested' introductions on an inquiry the caller owns — never
--     provider_notes / seeker_contacted / disclosure columns.
--
-- C4: Seekers could not log their own case events (concierge_case_events INSERT
--     was admin-only), so seeker confirm/reject actions silently lost their audit
--     trail. Add a seeker INSERT policy scoped to their own inquiry + own actor id.
--
-- C3: A FREE originating facility could read the seeker's full PII/PHI directly
--     from concierge_inquiries via the originating-facility SELECT policy
--     (authenticated has table-wide column access), contradicting the free-tier
--     "contact info isn't shared" promise. Per owner decision, free facilities
--     must NOT see seeker contact/PHI — drop the policy. (The RedirectedInquiries
--     UI that consumed it is removed in the same change.)
--
-- ROLLBACK: recreate concierge_inquiries_select_originating_facility; drop
-- get_seeker_introductions + concierge_case_events_insert_seeker_own.

-- ── C2: seeker-safe introductions reader ──
CREATE OR REPLACE FUNCTION public.get_seeker_introductions(p_inquiry_id uuid)
RETURNS TABLE (id uuid, facility_id uuid, provider_response text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT ci.id, ci.facility_id, ci.provider_response
  FROM public.concierge_introductions ci
  WHERE ci.inquiry_id = p_inquiry_id
    AND ci.provider_response = 'interested'
    AND EXISTS (
      SELECT 1 FROM public.concierge_inquiries q
      WHERE q.id = p_inquiry_id
        AND q.user_id = (SELECT auth.uid())
    );
$$;

REVOKE ALL ON FUNCTION public.get_seeker_introductions(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_seeker_introductions(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_seeker_introductions(uuid) TO authenticated;

-- ── C4: seekers may log their own case events ──
DROP POLICY IF EXISTS "concierge_case_events_insert_seeker_own" ON public.concierge_case_events;
CREATE POLICY "concierge_case_events_insert_seeker_own"
ON public.concierge_case_events FOR INSERT TO authenticated
WITH CHECK (
  actor_type = 'seeker'
  AND actor_id = (SELECT auth.uid())
  AND inquiry_id IN (
    SELECT id FROM public.concierge_inquiries WHERE user_id = (SELECT auth.uid())
  )
);

-- ── C3: stop exposing seeker PII to the free originating facility ──
DROP POLICY IF EXISTS "concierge_inquiries_select_originating_facility" ON public.concierge_inquiries;
