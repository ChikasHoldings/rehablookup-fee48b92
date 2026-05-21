-- /account/settings hardening — make activity log writable from the client.
--
-- Background: account_activity_log has RLS that allows only the service_role
-- to INSERT (see 20260423052836_*.sql lines 88-95). The reason given there
-- is to prevent a client forging entries for ANY user_id. That's the right
-- threat to defend against, but the implementation also blocks the legitimate
-- "log my own action" case — so SeekerSettings' calls to logActivity() were
-- silently failing for every seeker, leaving the Activity Log card empty.
--
-- Fix: a SECURITY DEFINER RPC that takes the event payload, reads auth.uid()
-- itself, and writes the row. Clients can call this; they cannot forge a
-- different user_id because the function ignores any client-supplied id and
-- uses auth.uid() exclusively. event_type is whitelisted so a compromised
-- client can't spam arbitrary text into the table.
--
-- Also adds account_activity_log to supabase_realtime so the in-page
-- Activity Log card refreshes within ~200ms when a new event lands.

CREATE OR REPLACE FUNCTION public.log_account_activity(
  p_event_type text,
  p_event_description text,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_id uuid;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF p_event_type NOT IN (
    'sign_in',
    'sign_out',
    'password_change',
    'profile_update',
    'email_change',
    'avatar_update',
    'avatar_remove',
    'phone_verify'
  ) THEN
    RAISE EXCEPTION 'Invalid event_type: %', p_event_type;
  END IF;

  IF p_event_description IS NULL
     OR length(p_event_description) = 0
     OR length(p_event_description) > 200 THEN
    RAISE EXCEPTION 'event_description must be 1..200 chars';
  END IF;

  INSERT INTO public.account_activity_log (user_id, event_type, event_description, metadata)
  VALUES (v_user_id, p_event_type, p_event_description, COALESCE(p_metadata, '{}'::jsonb))
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.log_account_activity(text, text, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.log_account_activity(text, text, jsonb) TO authenticated;

-- Realtime publication membership so ActivityLog's subscribe call actually
-- receives events. Gated on existence so re-apply is a no-op.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname='supabase_realtime'
      AND schemaname='public'
      AND tablename='account_activity_log'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.account_activity_log;
  END IF;
END $$;
