-- ============================================================================
-- Provider team analytics access closure
--
-- The team permission matrix says owner, manager, and viewer can VIEW analytics
-- for facilities they can access, but the analytics layer was owner/admin-only,
-- so managers/viewers saw 0 analytics (documented in the dashboard/shell pass).
--
-- This aligns the CORE, non-billing analytics objects to the same per-facility
-- access helper the rest of the panel uses:
--   user_can_access_facility(facility_id, auth.uid())
--     = owner OR active manager/viewer, Pro-gated for members, owner always,
--       per-facility scoped (so cross-facility isolation + Pro-gating are
--       preserved automatically via facility_role()).
--
-- Objects aligned (all read-only, no seeker PII — event/aggregate data only):
--   1. provider_events            (SELECT RLS) — dashboard impression count,
--                                  engagement reads, listing card, etc.
--   2. facility_metrics_daily     (SELECT RLS) — rollup; matrix consistency +
--                                  defense (the perf RPC reads it as DEFINER).
--   3. get_facility_performance_summary(uuid)        — Overview/Performance/
--                                  Market tabs + DashboardPerformanceCard.
--   4. get_provider_engagement_summary(uuid[],ts,ts) — Engagement tab.
--
-- DELIBERATELY LEFT OWNER-ONLY (billing / add-on / not-directly-read):
--   - get-facility-analytics edge fn + featured_impressions / featured_phone_
--     clicks / featured_placement_analytics / facility_subscriptions — these
--     carry billing (renewal forecast, paid amounts) or paid add-on data; the
--     matrix keeps purchases/billing owner-only.
--   - facility_views / facility_interactions / badge_impressions — not read
--     directly by the provider analytics UI (only feed the rollup).
--
-- Writes / event inserts are unchanged. Admin access preserved (the helpers and
-- existing admin policies already allow admins). The two RPC bodies are NOT
-- hand-retyped: we fetch the live definition and string-replace only the
-- authorization predicate, then re-create — so nothing else can drift.
--
-- ROLLBACK: drop the two _team_select policies; restore the two functions'
-- gates to user_owns_facility / f.user_id = v_caller.
-- ============================================================================

-- 1) provider_events — team read
DROP POLICY IF EXISTS provider_events_team_select ON public.provider_events;
CREATE POLICY provider_events_team_select ON public.provider_events
  FOR SELECT TO authenticated
  USING (public.user_can_access_facility(facility_id, (SELECT auth.uid())));

-- 2) facility_metrics_daily — team read
DROP POLICY IF EXISTS facility_metrics_daily_team_select ON public.facility_metrics_daily;
CREATE POLICY facility_metrics_daily_team_select ON public.facility_metrics_daily
  FOR SELECT TO authenticated
  USING (public.user_can_access_facility(facility_id, (SELECT auth.uid())));

-- 3) get_facility_performance_summary — owner gate -> team access gate
DO $mig$
DECLARE v_def text; v_new text;
BEGIN
  SELECT pg_get_functiondef('public.get_facility_performance_summary(uuid)'::regprocedure) INTO v_def;
  -- owner-only -> owner|manager|viewer (Pro-gated) OR admin (the RPC was
  -- originally owner-only with no admin branch; engagement already allows admin,
  -- so this also restores admin parity per the product decision).
  v_new := replace(
    v_def,
    'user_owns_facility(p_facility_id, v_user_id)',
    '(user_can_access_facility(p_facility_id, v_user_id) OR has_role(v_user_id, ''admin''::app_role))'
  );
  IF v_new = v_def THEN
    RAISE EXCEPTION 'get_facility_performance_summary: gate anchor not found — aborting';
  END IF;
  EXECUTE v_new;
END $mig$;

-- 4) get_provider_engagement_summary — owner filter -> team access filter
DO $mig$
DECLARE v_def text; v_new text;
BEGIN
  SELECT pg_get_functiondef(
    'public.get_provider_engagement_summary(uuid[], timestamp with time zone, timestamp with time zone)'::regprocedure
  ) INTO v_def;
  v_new := replace(
    v_def,
    'f.user_id = v_caller',
    'user_can_access_facility(f.id, v_caller)'
  );
  IF v_new = v_def THEN
    RAISE EXCEPTION 'get_provider_engagement_summary: gate anchor not found — aborting';
  END IF;
  -- Pre-existing bug found during this pass: the breakdown/daily-trend queries
  -- call row_to_jsonb(), which is NOT a Postgres function (the builtin is
  -- to_jsonb). The RPC therefore threw for ANY caller with facility access —
  -- the Engagement tab was broken for owners too. Fix it here so owner + team
  -- analytics actually works end-to-end. to_jsonb(record) is the intended call.
  v_new := replace(v_new, 'row_to_jsonb', 'to_jsonb');
  EXECUTE v_new;
END $mig$;
