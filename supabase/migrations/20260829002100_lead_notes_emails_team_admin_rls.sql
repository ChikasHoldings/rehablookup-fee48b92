-- ============================================================================
-- Inquiry/Leads lifecycle: make lead_notes + lead_emails RLS admin- & team-aware
--
-- Before: lead_notes and lead_emails were OWNER-ONLY (facilities.user_id =
-- auth.uid()), with NO admin policy. This broke two real workflows:
--   1. Team members (managers) can view/update a facility's leads
--      (user_can_access_facility / user_can_edit_facility on the leads table)
--      but could NOT see or add the lead's notes, nor see logged emails.
--   2. Admins have NO policy on these tables at all, so the admin lead-detail
--      modal's notes list returned 0 rows and the admin "save note" INSERT was
--      RLS-denied — surfacing as a false success in the modal.
--
-- This aligns lead_notes/lead_emails with the SAME access model the leads table
-- already uses: admin OR per-facility team access (owner always; members
-- Pro-gated via the helper). Read = user_can_access_facility; write = author/
-- sender is the caller AND (admin OR user_can_edit_facility). lead_notes DELETE
-- stays author-scoped (a user removes only their own note).
--
-- ROLLBACK: restore the owner-only policies (facilities.user_id = auth.uid()).
-- ============================================================================

-- ---- lead_notes ----
DROP POLICY IF EXISTS "Providers can view notes on their leads" ON public.lead_notes;
CREATE POLICY "lead_notes_select_team_admin" ON public.lead_notes
  FOR SELECT TO authenticated
  USING (
    has_role((SELECT auth.uid()), 'admin'::app_role)
    OR lead_id IN (
      SELECT l.id FROM public.leads l
      WHERE public.user_can_access_facility(l.facility_id, (SELECT auth.uid()))
    )
  );

DROP POLICY IF EXISTS "Providers can insert notes on their leads" ON public.lead_notes;
CREATE POLICY "lead_notes_insert_team_admin" ON public.lead_notes
  FOR INSERT TO authenticated
  WITH CHECK (
    (SELECT auth.uid()) = user_id
    AND (
      has_role((SELECT auth.uid()), 'admin'::app_role)
      OR lead_id IN (
        SELECT l.id FROM public.leads l
        WHERE public.user_can_edit_facility(l.facility_id, (SELECT auth.uid()))
      )
    )
  );
-- DELETE ("Providers can delete their own notes": user_id = auth.uid()) unchanged.

-- ---- lead_emails ----
DROP POLICY IF EXISTS "Providers can view their lead emails" ON public.lead_emails;
CREATE POLICY "lead_emails_select_team_admin" ON public.lead_emails
  FOR SELECT TO authenticated
  USING (
    has_role((SELECT auth.uid()), 'admin'::app_role)
    OR facility_id IN (
      SELECT f.id FROM public.facilities f
      WHERE public.user_can_access_facility(f.id, (SELECT auth.uid()))
    )
  );

DROP POLICY IF EXISTS "Providers can insert lead emails" ON public.lead_emails;
CREATE POLICY "lead_emails_insert_team_admin" ON public.lead_emails
  FOR INSERT TO authenticated
  WITH CHECK (
    (SELECT auth.uid()) = sender_user_id
    AND (
      has_role((SELECT auth.uid()), 'admin'::app_role)
      OR facility_id IN (
        SELECT f.id FROM public.facilities f
        WHERE public.user_can_edit_facility(f.id, (SELECT auth.uid()))
      )
    )
  );
