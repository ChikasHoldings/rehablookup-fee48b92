-- =============================================================================
-- admin_email_log_stats() — server-side rollup for the Admin › Email Logs
-- summary tiles (Total / Sent / Failed / Suppressed).
--
-- WHY: the client previously SELECTed every email_tracking_events row for the
-- window and deduped in JS. PostgREST caps an unbounded select at ~1000 rows,
-- so the tiles silently under-counted for large windows ("All time"). Doing the
-- dedup + bucketing server-side counts the full set with no cap.
--
-- SEMANTICS (mirrors the prior client logic exactly): one row per email_id,
-- taking its highest-ranked terminal event
-- (delivered>sent>opened/clicked>bounced/complained/failed/dlq>suppressed>retry),
-- then bucketed: sent = sent/delivered/opened/clicked, failed =
-- failed/dlq/bounced/complained, suppressed = suppressed.
--
-- SECURITY: admin-only (user_is_admin), SECURITY DEFINER, read-only, no RLS
-- change. EXECUTE revoked from anon.
--
-- ROLLBACK: DROP FUNCTION IF EXISTS public.admin_email_log_stats(timestamptz);
-- =============================================================================

CREATE OR REPLACE FUNCTION public.admin_email_log_stats(p_start timestamptz DEFAULT NULL)
RETURNS TABLE (
  total bigint,
  sent bigint,
  failed bigint,
  suppressed bigint
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.user_is_admin((SELECT auth.uid())) THEN
    RAISE EXCEPTION 'admin role required' USING ERRCODE = 'insufficient_privilege';
  END IF;

  RETURN QUERY
  WITH ranked AS (
    SELECT
      e.email_id,
      e.event_type,
      CASE e.event_type
        WHEN 'delivered' THEN 6
        WHEN 'sent' THEN 5
        WHEN 'opened' THEN 4
        WHEN 'clicked' THEN 4
        WHEN 'bounced' THEN 3
        WHEN 'complained' THEN 3
        WHEN 'failed' THEN 3
        WHEN 'dlq' THEN 3
        WHEN 'suppressed' THEN 2
        WHEN 'retry' THEN 1
        ELSE 0
      END AS rank
    FROM public.email_tracking_events e
    WHERE e.email_id IS NOT NULL
      AND (p_start IS NULL OR e.created_at >= p_start)
  ),
  best AS (
    SELECT DISTINCT ON (r.email_id) r.email_id, r.event_type
    FROM ranked r
    ORDER BY r.email_id, r.rank DESC
  )
  SELECT
    count(*)::bigint AS total,
    count(*) FILTER (WHERE b.event_type IN ('sent', 'delivered', 'opened', 'clicked'))::bigint AS sent,
    count(*) FILTER (WHERE b.event_type IN ('failed', 'dlq', 'bounced', 'complained'))::bigint AS failed,
    count(*) FILTER (WHERE b.event_type = 'suppressed')::bigint AS suppressed
  FROM best b;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.admin_email_log_stats(timestamptz) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_email_log_stats(timestamptz) TO authenticated;
