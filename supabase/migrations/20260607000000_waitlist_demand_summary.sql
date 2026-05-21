-- Waitlist demand summary RPC for the admin Caps tab.
-- Returns the top scopes by waitlist depth so admins can spot where to
-- raise caps. Pure read; SECURITY DEFINER + admin-only execution grant.

BEGIN;

CREATE OR REPLACE FUNCTION public.get_waitlist_demand_summary(
  p_limit integer DEFAULT 20
)
RETURNS TABLE (
  addon_type text,
  scope_label text,
  scope_key text,
  scope_type text,
  scope_value text,
  geo_state text,
  geo_city text,
  cap integer,
  used integer,
  waiting_count bigint,
  invited_count bigint,
  oldest_request timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Admin only' USING ERRCODE = 'insufficient_privilege';
  END IF;

  RETURN QUERY
  WITH featured_rollup AS (
    SELECT
      'featured'::text AS addon_type,
      w.scope_type,
      w.scope_value,
      NULL::text AS geo_state,
      NULL::text AS geo_city,
      (w.scope_type || '=' || w.scope_value) AS scope_label,
      ('featured|' || w.scope_type || '|' || w.scope_value) AS scope_key,
      COUNT(*) FILTER (WHERE w.status = 'waiting') AS waiting_count,
      COUNT(*) FILTER (WHERE w.status = 'invited') AS invited_count,
      MIN(w.requested_at) FILTER (WHERE w.status = 'waiting') AS oldest_request
    FROM public.addon_waitlist w
    WHERE w.addon_type = 'featured' AND w.status IN ('waiting', 'invited')
    GROUP BY w.scope_type, w.scope_value
  ),
  concierge_rollup AS (
    SELECT
      'concierge'::text AS addon_type,
      NULL::text AS scope_type,
      NULL::text AS scope_value,
      w.geo_state,
      w.geo_city,
      (w.geo_state || COALESCE('/' || w.geo_city, ' (statewide)')) AS scope_label,
      ('concierge|' || w.geo_state || '|' || COALESCE(w.geo_city, '*')) AS scope_key,
      COUNT(*) FILTER (WHERE w.status = 'waiting') AS waiting_count,
      COUNT(*) FILTER (WHERE w.status = 'invited') AS invited_count,
      MIN(w.requested_at) FILTER (WHERE w.status = 'waiting') AS oldest_request
    FROM public.addon_waitlist w
    WHERE w.addon_type = 'concierge' AND w.status IN ('waiting', 'invited')
    GROUP BY w.geo_state, w.geo_city
  ),
  combined AS (
    SELECT * FROM featured_rollup
    UNION ALL
    SELECT * FROM concierge_rollup
  )
  SELECT
    c.addon_type,
    c.scope_label,
    c.scope_key,
    c.scope_type,
    c.scope_value,
    c.geo_state,
    c.geo_city,
    CASE c.addon_type
      WHEN 'featured' THEN (
        SELECT (public.get_placement_availability(c.scope_type, c.scope_value)).cap
      )
      ELSE (
        SELECT (public.get_concierge_availability(c.geo_state, c.geo_city)).cap
      )
    END AS cap,
    CASE c.addon_type
      WHEN 'featured' THEN (
        SELECT (public.get_placement_availability(c.scope_type, c.scope_value)).used
      )
      ELSE (
        SELECT (public.get_concierge_availability(c.geo_state, c.geo_city)).used
      )
    END AS used,
    c.waiting_count,
    c.invited_count,
    c.oldest_request
  FROM combined c
  ORDER BY (c.waiting_count + c.invited_count) DESC, c.oldest_request ASC NULLS LAST
  LIMIT p_limit;
END;
$$;

REVOKE ALL ON FUNCTION public.get_waitlist_demand_summary(integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_waitlist_demand_summary(integer) TO authenticated;

COMMIT;
