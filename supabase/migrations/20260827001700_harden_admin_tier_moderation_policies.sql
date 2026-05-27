-- Tighten write policies for admin-only tables to can_moderate_users()
-- (super_admin | manager). Customer-reps and advisors have no business
-- writing to these tables directly; any legitimate writes come via
-- tier-checked edge functions (service-role, bypass RLS) or the bulk-
-- action dialogs that already call can_moderate_users server-side.
--
-- facility_reviews UPDATE/DELETE are intentionally left at has_role('admin')
-- because customer_reps have the reviews permission and the CustomerRep
-- dashboard's inline moderation relies on it.

-- ── placement_caps ───────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Admins can insert placement caps" ON public.placement_caps;
DROP POLICY IF EXISTS "Admins can update placement caps" ON public.placement_caps;
DROP POLICY IF EXISTS "Admins can delete placement caps" ON public.placement_caps;

CREATE POLICY "Moderators can insert placement caps"
  ON public.placement_caps FOR INSERT
  WITH CHECK (public.can_moderate_users(( SELECT auth.uid() AS uid)));

CREATE POLICY "Moderators can update placement caps"
  ON public.placement_caps FOR UPDATE
  USING (public.can_moderate_users(( SELECT auth.uid() AS uid)))
  WITH CHECK (public.can_moderate_users(( SELECT auth.uid() AS uid)));

CREATE POLICY "Moderators can delete placement caps"
  ON public.placement_caps FOR DELETE
  USING (public.can_moderate_users(( SELECT auth.uid() AS uid)));

-- ── concierge_geo_caps ───────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Admins can insert concierge geo caps" ON public.concierge_geo_caps;
DROP POLICY IF EXISTS "Admins can update concierge geo caps" ON public.concierge_geo_caps;
DROP POLICY IF EXISTS "Admins can delete concierge geo caps" ON public.concierge_geo_caps;

CREATE POLICY "Moderators can insert concierge geo caps"
  ON public.concierge_geo_caps FOR INSERT
  WITH CHECK (public.can_moderate_users(( SELECT auth.uid() AS uid)));

CREATE POLICY "Moderators can update concierge geo caps"
  ON public.concierge_geo_caps FOR UPDATE
  USING (public.can_moderate_users(( SELECT auth.uid() AS uid)))
  WITH CHECK (public.can_moderate_users(( SELECT auth.uid() AS uid)));

CREATE POLICY "Moderators can delete concierge geo caps"
  ON public.concierge_geo_caps FOR DELETE
  USING (public.can_moderate_users(( SELECT auth.uid() AS uid)));

-- ── facility_accreditations UPDATE ──────────────────────────────────────────
-- Provider team paths use facility_accreditations_team_cud (user_can_edit_facility)
-- and are unaffected. Only the admin-side verification UPDATE is tightened.
DROP POLICY IF EXISTS "Admins can update accreditations" ON public.facility_accreditations;

CREATE POLICY "Moderators can update accreditations"
  ON public.facility_accreditations FOR UPDATE
  USING (public.can_moderate_users(( SELECT auth.uid() AS uid)));

-- ── facility_credential_documents UPDATE ────────────────────────────────────
-- Providers INSERT/DELETE their own documents; admin UPDATE (verify/reject)
-- is being tightened. Provider write paths are unaffected.
DROP POLICY IF EXISTS "Admins can update credential documents" ON public.facility_credential_documents;

CREATE POLICY "Moderators can update credential documents"
  ON public.facility_credential_documents FOR UPDATE
  USING (public.can_moderate_users(( SELECT auth.uid() AS uid)));

-- ── addon_waitlist UPDATE — admin path only ──────────────────────────────────
-- The consolidated policy mixes admin and provider paths; we need to replace
-- it with a version that uses can_moderate_users for the admin side.
DROP POLICY IF EXISTS "addon_waitlist_update_consolidated" ON public.addon_waitlist;

CREATE POLICY "addon_waitlist_update_consolidated"
  ON public.addon_waitlist FOR UPDATE
  USING (
    public.can_moderate_users(( SELECT auth.uid() AS uid))
    OR ((requested_by = ( SELECT auth.uid() AS uid)) AND (status = ANY (ARRAY['waiting'::text, 'invited'::text])))
  )
  WITH CHECK (
    public.can_moderate_users(( SELECT auth.uid() AS uid))
    OR ((requested_by = ( SELECT auth.uid() AS uid)) AND (status = 'canceled'::text))
  );
