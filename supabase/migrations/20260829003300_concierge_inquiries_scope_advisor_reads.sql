-- Concierge PII tiering (follow-up #1): scope ADVISOR reads of concierge_inquiries.
--
-- concierge_inquiries holds seeker PII (name, email, phone, primary_concern,
-- insurance, intake). The SELECT policy's admin branch was coarse
-- `has_role('admin')`, so EVERY admin tier — including advisors — could read
-- EVERY case (and stream them all via realtime, which respects RLS). The
-- product already models advisors as working only their OWN caseload
-- (AdvisorDashboard / AdvisorInbox are self-scoped on assigned_advisor_id), and
-- advisors claim UNASSIGNED cases. So an advisor has no need to read other
-- advisors' caseloads or the whole queue.
--
-- Scope the advisor tier to `assigned_advisor_id = self OR assigned_advisor_id
-- IS NULL` (own + claimable). super_admin / manager / customer_rep retain full
-- read: managers/super_admins are the oversight tiers, and customer_rep reads
-- concierge context keyed on a specific seeker/lead in the seeker- and
-- lead-management UIs (it has seekers:true / leads) — cutting it would silently
-- blank legitimate support context rather than close a real exposure. (Properly
-- scoping customer_rep to seeker-keyed reads would require a SECURITY DEFINER
-- RPC rewire of those readers; tracked separately.)
--
-- The facility-owner introduction branch and the seeker-self branch are
-- unchanged. Edge functions use the service-role client (bypass RLS) and the
-- dependent reader RPCs are SECURITY DEFINER, so neither is affected.

DROP POLICY IF EXISTS concierge_inquiries_select_consolidated ON public.concierge_inquiries;

CREATE POLICY concierge_inquiries_select_consolidated
  ON public.concierge_inquiries
  FOR SELECT
  TO authenticated
  USING (
    -- Non-advisor admin tiers (super_admin, manager, customer_rep) keep full read.
    (public.has_role((SELECT auth.uid()), 'admin'::app_role)
      AND NOT public.has_admin_role((SELECT auth.uid()), 'advisor'::admin_role_type))
    -- Advisors: only their own caseload + unassigned (claimable) cases.
    OR (public.has_admin_role((SELECT auth.uid()), 'advisor'::admin_role_type)
      AND (assigned_advisor_id = (SELECT auth.uid()) OR assigned_advisor_id IS NULL))
    -- Facility owner (post-disclosure / placed) — unchanged.
    OR (EXISTS (
      SELECT 1
      FROM public.concierge_introductions ci
      JOIN public.facilities f ON f.id = ci.facility_id
      WHERE ci.inquiry_id = concierge_inquiries.id
        AND f.user_id = (SELECT auth.uid())
        AND (
          ci.admin_disclosed_pii_at IS NOT NULL
          OR (concierge_inquiries.seeker_confirmed = true AND concierge_inquiries.placed_facility_id = f.id)
        )
    ))
    -- Seeker self — unchanged.
    OR (user_id = (SELECT auth.uid()))
    OR (user_email = public.current_user_email())
  );
