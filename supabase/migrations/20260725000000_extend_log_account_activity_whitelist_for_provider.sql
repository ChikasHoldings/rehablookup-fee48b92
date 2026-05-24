-- Provider Settings audit-log wiring: extend log_account_activity's event_type
-- whitelist so the provider-side calls (which previously slipped through a
-- broken direct-INSERT path that RLS silently dropped) can write through the
-- RPC like the seeker-side flow does.
--
-- Before this migration the whitelist (from 20260704000000_log_account_activity_rpc.sql)
-- only covered the seeker event surface:
--   sign_in, sign_out, password_change, profile_update, email_change,
--   avatar_update, avatar_remove, phone_verify
--
-- Provider Settings additionally fires `session_signout` whenever the user
-- clicks "Sign out all sessions" on the Security card / Sessions tab. That's
-- semantically distinct from a normal `sign_out` (it revokes EVERY session
-- globally — a security-relevant action that should be visible in the audit
-- trail), so we keep it as a separate type rather than collapsing it into
-- sign_out.
--
-- `account_deleted` is intentionally NOT in the whitelist: delete-provider-
-- account already wipes account_activity_log for the deleted user before
-- removing the auth row, so a client-side log would be cleared a moment
-- later anyway. The edge function logs the deletion via console.log only
-- (server-side observability); the user won't see it (their account is gone).
--
-- Idempotent: CREATE OR REPLACE swaps the function body atomically; the
-- existing grants survive.

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
    'session_signout',
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
