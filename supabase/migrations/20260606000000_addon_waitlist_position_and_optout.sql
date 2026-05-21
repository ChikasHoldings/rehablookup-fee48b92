-- Add-on waitlist polish: position indicator + per-row auto-invite opt-out.
--
-- 1. `auto_invite_opt_out` boolean on addon_waitlist — when true, the
--    drain-addon-waitlist cron writes the admin_notification (existing
--    contract) but does NOT auto-send a Resend invite. Provider has
--    declared they want admin-only outreach for this entry.
--
-- 2. `get_addon_waitlist_position(p_waitlist_id uuid)` RPC — returns
--    { position, total } for the row's scope so the
--    JoinAddonWaitlistButton can display "you're #N of M".
--
-- Idempotent.

BEGIN;

ALTER TABLE public.addon_waitlist
  ADD COLUMN IF NOT EXISTS auto_invite_opt_out boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.addon_waitlist.auto_invite_opt_out IS
  'When true, the drain cron skips the Resend auto-invite for this row. '
  'Provider has chosen admin-only outreach. The slot-freed admin notification '
  'still fires so an admin can reach out manually.';

-- Note: `position` is a reserved word in older Postgres SQL grammars
-- (used by SUBSTRING(... FROM ... FOR ...) constructs), so the
-- RETURNS TABLE column is named queue_position to avoid the parser
-- ambiguity. The TS caller maps it back to `position` at the edge.

CREATE OR REPLACE FUNCTION public.get_addon_waitlist_position(
  p_waitlist_id uuid
)
RETURNS TABLE (
  queue_position integer,
  queue_total integer
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row record;
  v_position integer;
  v_total integer;
BEGIN
  SELECT addon_type, scope_type, scope_value, geo_state, geo_city, requested_at, requested_by, status
    INTO v_row
    FROM public.addon_waitlist
   WHERE id = p_waitlist_id;

  IF NOT FOUND THEN
    RETURN QUERY SELECT NULL::integer, NULL::integer;
    RETURN;
  END IF;

  IF v_row.requested_by IS DISTINCT FROM auth.uid()
     AND NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RETURN QUERY SELECT NULL::integer, NULL::integer;
    RETURN;
  END IF;

  IF v_row.status NOT IN ('waiting', 'invited') THEN
    RETURN QUERY SELECT 0, 0;
    RETURN;
  END IF;

  IF v_row.addon_type = 'featured' THEN
    SELECT
      COUNT(*) FILTER (WHERE requested_at < v_row.requested_at) + 1,
      COUNT(*)
      INTO v_position, v_total
    FROM public.addon_waitlist
    WHERE addon_type = 'featured'
      AND scope_type = v_row.scope_type
      AND scope_value = v_row.scope_value
      AND status IN ('waiting', 'invited');
  ELSE
    SELECT
      COUNT(*) FILTER (WHERE requested_at < v_row.requested_at) + 1,
      COUNT(*)
      INTO v_position, v_total
    FROM public.addon_waitlist
    WHERE addon_type = 'concierge'
      AND geo_state = v_row.geo_state
      AND status IN ('waiting', 'invited')
      AND (
        (v_row.geo_city IS NULL AND geo_city IS NULL) OR
        (v_row.geo_city IS NOT NULL AND geo_city IS NOT NULL
         AND lower(geo_city) = lower(v_row.geo_city))
      );
  END IF;

  RETURN QUERY SELECT v_position, v_total;
END;
$$;

REVOKE ALL ON FUNCTION public.get_addon_waitlist_position(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_addon_waitlist_position(uuid) TO authenticated;

COMMIT;
