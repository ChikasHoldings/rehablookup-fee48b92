-- Support rebuild: in-app threaded tickets with attachments + facility-team sharing.
-- All support tables are empty (0 rows), so schema evolution is safe.

-- 1. Widen status to the in-app lifecycle (keep legacy values for safety)
ALTER TABLE public.support_tickets DROP CONSTRAINT IF EXISTS support_tickets_status_check;
ALTER TABLE public.support_tickets ADD CONSTRAINT support_tickets_status_check
  CHECK (status = ANY (ARRAY['new','open','in_progress','waiting_on_admin','waiting_on_user','resolved','closed']));

-- 2. New columns: facility link (team sharing), linked context, thread/read state
ALTER TABLE public.support_tickets
  ADD COLUMN IF NOT EXISTS facility_id uuid REFERENCES public.facilities(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS related_entity_type text,
  ADD COLUMN IF NOT EXISTS related_entity_id uuid,
  ADD COLUMN IF NOT EXISTS context jsonb,
  ADD COLUMN IF NOT EXISTS last_message_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_message_role text,
  ADD COLUMN IF NOT EXISTS user_last_read_at timestamptz,
  ADD COLUMN IF NOT EXISTS admin_last_read_at timestamptz;

-- 3. Threaded messages (user-visible). Internal notes stay in support_ticket_notes.
CREATE TABLE IF NOT EXISTS public.support_ticket_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  sender_user_id uuid,
  sender_role text NOT NULL CHECK (sender_role IN ('user','admin')),
  body text NOT NULL,
  attachments jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS support_ticket_messages_ticket_idx
  ON public.support_ticket_messages(ticket_id, created_at);
ALTER TABLE public.support_ticket_messages ENABLE ROW LEVEL SECURITY;

-- 4. Access helper — support is available to ALL active team members (NOT Pro-gated),
--    the ticket owner, and admins. Single source of truth for table + storage RLS.
CREATE OR REPLACE FUNCTION public.user_can_access_support_ticket(p_ticket_id uuid, p_uid uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.support_tickets t
    WHERE t.id = p_ticket_id AND (
      public.user_is_admin(p_uid)
      OR t.sender_user_id = p_uid
      OR (t.facility_id IS NOT NULL AND (
        EXISTS (SELECT 1 FROM public.facilities f WHERE f.id = t.facility_id AND f.user_id = p_uid)
        OR EXISTS (SELECT 1 FROM public.facility_team_members m
                   WHERE m.facility_id = t.facility_id AND m.user_id = p_uid AND m.status = 'active')
      ))
    )
  );
$$;
REVOKE ALL ON FUNCTION public.user_can_access_support_ticket(uuid,uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.user_can_access_support_ticket(uuid,uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.user_can_access_support_ticket(uuid,uuid) TO authenticated;

-- 5. Messages RLS — read if you can access the ticket; insert only as yourself with a
--    server-truthful sender_role (admins post 'admin', non-admins post 'user').
CREATE POLICY support_ticket_messages_select ON public.support_ticket_messages
  FOR SELECT TO authenticated
  USING (public.user_can_access_support_ticket(ticket_id, (SELECT auth.uid())));
CREATE POLICY support_ticket_messages_insert ON public.support_ticket_messages
  FOR INSERT TO authenticated
  WITH CHECK (
    sender_user_id = (SELECT auth.uid()) AND (
      (sender_role = 'admin' AND public.user_is_admin((SELECT auth.uid())))
      OR (sender_role = 'user' AND NOT public.user_is_admin((SELECT auth.uid()))
          AND public.user_can_access_support_ticket(ticket_id, (SELECT auth.uid())))
    )
  );
CREATE POLICY support_ticket_messages_admin_update ON public.support_ticket_messages
  FOR UPDATE TO authenticated
  USING (public.user_is_admin((SELECT auth.uid()))) WITH CHECK (public.user_is_admin((SELECT auth.uid())));
CREATE POLICY support_ticket_messages_admin_delete ON public.support_ticket_messages
  FOR DELETE TO authenticated
  USING (public.user_is_admin((SELECT auth.uid())));

-- 6. Widen support_tickets SELECT to the facility team (was owner+admin only)
DROP POLICY IF EXISTS support_tickets_select_consolidated ON public.support_tickets;
CREATE POLICY support_tickets_select_consolidated ON public.support_tickets
  FOR SELECT TO authenticated
  USING (
    public.user_is_admin((SELECT auth.uid()))
    OR sender_user_id = (SELECT auth.uid())
    OR (facility_id IS NOT NULL AND (
      EXISTS (SELECT 1 FROM public.facilities f WHERE f.id = support_tickets.facility_id AND f.user_id = (SELECT auth.uid()))
      OR EXISTS (SELECT 1 FROM public.facility_team_members m
                 WHERE m.facility_id = support_tickets.facility_id AND m.user_id = (SELECT auth.uid()) AND m.status = 'active')
    ))
  );

-- 7. Read-state RPC (users can't UPDATE tickets directly; this marks read for the right side)
CREATE OR REPLACE FUNCTION public.mark_support_ticket_read(p_ticket_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF NOT public.user_can_access_support_ticket(p_ticket_id, v_uid) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;
  IF public.user_is_admin(v_uid) THEN
    UPDATE public.support_tickets SET admin_last_read_at = now() WHERE id = p_ticket_id;
  ELSE
    UPDATE public.support_tickets SET user_last_read_at = now() WHERE id = p_ticket_id;
  END IF;
END; $$;
REVOKE ALL ON FUNCTION public.mark_support_ticket_read(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.mark_support_ticket_read(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.mark_support_ticket_read(uuid) TO authenticated;

-- 8. Private attachments bucket + access-gated storage policies.
--    Path convention: {ticket_id}/{uuid}/{filename}. Pre-creation upload to a
--    not-yet-existing ticket folder is allowed (enables attaching to a new ticket
--    before the row is committed); once the ticket exists only accessors can add.
INSERT INTO storage.buckets (id, name, public)
VALUES ('support-attachments','support-attachments', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS support_attachments_select ON storage.objects;
CREATE POLICY support_attachments_select ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'support-attachments'
    AND (storage.foldername(name))[1] ~ '^[0-9a-fA-F-]{36}$'
    AND public.user_can_access_support_ticket(((storage.foldername(name))[1])::uuid, (SELECT auth.uid()))
  );

DROP POLICY IF EXISTS support_attachments_insert ON storage.objects;
CREATE POLICY support_attachments_insert ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'support-attachments'
    AND (storage.foldername(name))[1] ~ '^[0-9a-fA-F-]{36}$'
    AND (
      public.user_can_access_support_ticket(((storage.foldername(name))[1])::uuid, (SELECT auth.uid()))
      OR NOT EXISTS (SELECT 1 FROM public.support_tickets t WHERE t.id = ((storage.foldername(name))[1])::uuid)
    )
  );

DROP POLICY IF EXISTS support_attachments_admin_delete ON storage.objects;
CREATE POLICY support_attachments_admin_delete ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'support-attachments' AND public.user_is_admin((SELECT auth.uid())));
