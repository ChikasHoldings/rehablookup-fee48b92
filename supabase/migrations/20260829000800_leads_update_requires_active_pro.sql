-- Provider lead response/management is a Pro feature — enforce it server-side.
--
-- Free facilities are concierge-routed (submit-qualified-lead never creates a
-- raw `leads` row for them), and the provider UI already says "Upgrade to Pro
-- to respond". But the `leads` UPDATE RLS was ownership-only, so a DOWNGRADED
-- (canceled/expired) provider — who still has historical Pro leads — could
-- mutate them via a direct PostgREST call, bypassing the gate (the only block
-- was the client-side canRespond check).
--
-- Add the canonical, grace-aware has_active_pro() to the NON-admin branches of
-- both leads UPDATE policies so the backend enforces what the UI promises:
--   • tier='pro' AND (active within current_period_end OR past_due grace) → may update
--   • admins always may update (support/moderation)
--   • service-role (webhooks/system) bypasses RLS as before
-- This matches the Pro grace model used everywhere else (has_active_pro /
-- isActiveProRow / submit-qualified-lead routing): past_due (dunning) providers
-- keep access; canceled/expired providers do not.
--
-- ROLLBACK: restore the two policies without the `AND has_active_pro(facility_id)`
-- terms (see 20260522060007 / 20260816000100).

DROP POLICY IF EXISTS "leads_update_consolidated" ON public.leads;
CREATE POLICY "leads_update_consolidated" ON public.leads
  FOR UPDATE TO authenticated
  USING (
    has_role((SELECT auth.uid()), 'admin'::app_role)
    OR (
      facility_id IN (SELECT f.id FROM public.facilities f WHERE f.user_id = (SELECT auth.uid()))
      AND has_active_pro(facility_id)
    )
  )
  WITH CHECK (
    has_role((SELECT auth.uid()), 'admin'::app_role)
    OR (
      facility_id IN (SELECT f.id FROM public.facilities f WHERE f.user_id = (SELECT auth.uid()))
      AND has_active_pro(facility_id)
    )
  );

DROP POLICY IF EXISTS "leads_team_update" ON public.leads;
CREATE POLICY "leads_team_update" ON public.leads
  FOR UPDATE TO authenticated
  USING (
    user_can_edit_facility(facility_id, (SELECT auth.uid()))
    AND has_active_pro(facility_id)
  )
  WITH CHECK (
    user_can_edit_facility(facility_id, (SELECT auth.uid()))
    AND has_active_pro(facility_id)
  );
