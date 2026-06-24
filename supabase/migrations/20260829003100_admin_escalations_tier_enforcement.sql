-- Escalations hardening: enforce the tier model and state machine server-side.
--
-- admin_escalations still carried its original 2026-04 policies, which the
-- earlier roles-hardening pass did not touch:
--   * SELECT was coarse `has_role('admin')` -- every admin tier could read every
--     escalation, including the free-text `description` that can carry
--     seeker/PHI-adjacent context. The resolver audience (the insert-notify
--     trigger) is only super_admin/manager.
--   * UPDATE was `USING`-only (no WITH CHECK) gated on coarse `has_role('admin')`
--     with `created_by = uid OR assigned_to = uid OR is_super_admin`, and there
--     was no state-machine trigger. So a creator/assignee of ANY tier could,
--     via direct PostgREST, reassign an escalation to anyone, change its
--     priority, or jump its status straight to resolved/closed -- bypassing the
--     client-side ALLOWED_TRANSITIONS guard and the super-admin-only
--     close/reopen UI.
--
-- E2 -- tighten SELECT to the moderation tier plus the row's creator/assignee.
DROP POLICY IF EXISTS "Admins can view all escalations" ON public.admin_escalations;
DROP POLICY IF EXISTS "Moderators and owners can view escalations" ON public.admin_escalations;
CREATE POLICY "Moderators and owners can view escalations"
  ON public.admin_escalations
  FOR SELECT
  TO authenticated
  USING (
    public.can_moderate_users((SELECT auth.uid()))
    OR (created_by = (SELECT auth.uid()))
    OR (assigned_to = (SELECT auth.uid()))
  );

-- E1 -- enforce tier + the legal state machine on UPDATE with a BEFORE UPDATE
-- trigger. The existing UPDATE policy (creator/assignee/super_admin may target
-- the row) is kept as the row-targeting gate; the trigger constrains WHAT a
-- non-moderator may change:
--   * reassignment to another admin and priority changes are manager/super-admin
--     only (a non-moderator may still self-claim an UNASSIGNED escalation, i.e.
--     NULL -> their own uid, matching the "Claim & Start Working" button);
--   * closing or reopening (from closed) is manager/super-admin only;
--   * every status change must follow the legal state machine.
-- The service-role bulk edge function runs with no JWT (auth.uid() IS NULL) and
-- is exempt -- it already authorizes the caller's tier in application code.
CREATE OR REPLACE FUNCTION public.enforce_admin_escalation_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := (SELECT auth.uid());
  is_mod boolean;
BEGIN
  -- Service-role / edge-function path (no JWT): the bulk function already
  -- authorizes the caller's tier. Let it through unchanged.
  IF uid IS NULL THEN
    RETURN NEW;
  END IF;

  is_mod := public.can_moderate_users(uid);

  -- Reassignment: only managers/super admins may (re)assign to anyone; a
  -- non-moderator may self-claim an unassigned escalation but not reassign it
  -- to a third party, steal an assigned one, or unassign it.
  IF (NEW.assigned_to IS DISTINCT FROM OLD.assigned_to) AND NOT is_mod THEN
    IF NOT (OLD.assigned_to IS NULL AND NEW.assigned_to = uid) THEN
      RAISE EXCEPTION 'Only managers or super admins can reassign escalations';
    END IF;
  END IF;

  -- Priority changes are moderator-only.
  IF (NEW.priority IS DISTINCT FROM OLD.priority) AND NOT is_mod THEN
    RAISE EXCEPTION 'Only managers or super admins can change escalation priority';
  END IF;

  -- Status transitions.
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    -- Closing, or reopening a closed escalation, is moderator-only.
    IF (NEW.status = 'closed' OR OLD.status = 'closed') AND NOT is_mod THEN
      RAISE EXCEPTION 'Only managers or super admins can close or reopen escalations';
    END IF;
    -- Enforce the legal state machine for everyone (mirrors the client
    -- ALLOWED_TRANSITIONS in useEscalationTransition).
    IF NOT (
      (OLD.status = 'open'        AND NEW.status IN ('in_progress','resolved','closed')) OR
      (OLD.status = 'in_progress' AND NEW.status IN ('resolved','closed','open')) OR
      (OLD.status = 'resolved'    AND NEW.status IN ('closed','open')) OR
      (OLD.status = 'closed'      AND NEW.status = 'open')
    ) THEN
      RAISE EXCEPTION 'Illegal escalation status transition: % -> %', OLD.status, NEW.status;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_admin_escalation_update_trg ON public.admin_escalations;
CREATE TRIGGER enforce_admin_escalation_update_trg
  BEFORE UPDATE ON public.admin_escalations
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_admin_escalation_update();
