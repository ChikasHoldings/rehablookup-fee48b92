-- Tighten blocked_identifiers write policies to super_admin/manager only.
--
-- READ stays open to all admin staff (has_role = 'admin') so any staffer
-- can see the ban list for situational awareness.
-- WRITE (INSERT / UPDATE / DELETE) is elevated to can_moderate_users()
-- (super_admin | manager) since these writes have enforcement consequences
-- (banning users). Edge functions that write this table use service-role
-- and bypass RLS, so they are unaffected.

DROP POLICY IF EXISTS "Admins can insert blocked identifiers" ON public.blocked_identifiers;
DROP POLICY IF EXISTS "Admins can update blocked identifiers" ON public.blocked_identifiers;
DROP POLICY IF EXISTS "Admins can delete blocked identifiers" ON public.blocked_identifiers;

CREATE POLICY "Moderators can insert blocked identifiers"
  ON public.blocked_identifiers
  FOR INSERT
  WITH CHECK (public.can_moderate_users(( SELECT auth.uid() AS uid)));

CREATE POLICY "Moderators can update blocked identifiers"
  ON public.blocked_identifiers
  FOR UPDATE
  USING (public.can_moderate_users(( SELECT auth.uid() AS uid)));

CREATE POLICY "Moderators can delete blocked identifiers"
  ON public.blocked_identifiers
  FOR DELETE
  USING (public.can_moderate_users(( SELECT auth.uid() AS uid)));
