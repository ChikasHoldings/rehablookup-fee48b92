-- Allow a free (claimed) facility's owner to read inquiries that were
-- submitted on their listing and routed to concierge placement
-- (routing_mode = 'free_tier_redirect'). Powers the provider-side
-- "inquiries routed to our placement team" view (useRedirectedInquiries).
--
-- Tightly scoped: only free_tier_redirect rows whose originating_facility_id
-- is a facility owned by the caller. routing_mode is only ever set to
-- 'free_tier_redirect', and intake-form inquiries never set
-- originating_facility_id, so this exposes nothing beyond the intended rows.
-- Additive permissive policy (OR'd with the existing consolidated SELECT
-- policy) so existing access is unchanged.
DROP POLICY IF EXISTS "concierge_inquiries_select_originating_facility" ON public.concierge_inquiries;

CREATE POLICY "concierge_inquiries_select_originating_facility"
ON public.concierge_inquiries
FOR SELECT
TO authenticated
USING (
  routing_mode = 'free_tier_redirect'
  AND originating_facility_id IN (
    SELECT id FROM public.facilities WHERE user_id = (SELECT auth.uid())
  )
);
