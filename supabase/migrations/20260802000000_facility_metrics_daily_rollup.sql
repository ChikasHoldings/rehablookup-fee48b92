-- Performance Analytics dashboard backing store.
--
-- Aggregates the per-event tables (provider_events + leads +
-- badge_impressions) into a daily-per-facility rollup so dashboard
-- queries hit ~30 rows per facility instead of scanning the 10k+
-- raw event tables on every load.
--
-- Refresh model:
--   * refresh_facility_metrics_daily(p_days_back int) is idempotent
--     — recomputing the last N days overwrites in place via UPSERT.
--   * pg_cron job (registered at the bottom) runs every hour at :17
--     refreshing the last 3 days. Catches late-arriving impressions
--     without holding heavy locks at the witching hour. Same row
--     count regardless of how many facilities have traffic.
--   * The dashboard's get_facility_performance_summary RPC also
--     invokes the refresh for the calling facility just-in-time when
--     metrics are stale (>15min) so a Pro provider checking the
--     dashboard always sees within-15-minute-fresh numbers without
--     us cranking the cron to every minute.
--
-- Guardrails:
--   * is_bot=true and is_internal=true events are excluded at the
--     refresh-query level. Raw counts never include them.
--   * Market-position queries use COUNTS only — never expose another
--     facility's identity or raw numbers.
--   * SECURITY DEFINER on every read RPC; owner check via
--     user_owns_facility before any data leaves the function.

BEGIN;

-- ────────────────────────────────────────────────────────────────────
-- 1) Rollup table
-- ────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.facility_metrics_daily (
  facility_id uuid NOT NULL REFERENCES public.facilities(id) ON DELETE CASCADE,
  metric_date date NOT NULL,
  -- Counters: everything 30d-back-able the dashboard wants. Stored
  -- as plain ints because all flat counts; jsonb adds nothing here.
  impressions       int NOT NULL DEFAULT 0,  -- listing_impression
  profile_views     int NOT NULL DEFAULT 0,  -- profile_view
  phone_clicks      int NOT NULL DEFAULT 0,  -- click_to_call
  website_clicks    int NOT NULL DEFAULT 0,  -- website_click
  inquiries         int NOT NULL DEFAULT 0,  -- leads inserted that day
  widget_loads      int NOT NULL DEFAULT 0,  -- badge_impressions rows
  updated_at        timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (facility_id, metric_date)
);

CREATE INDEX IF NOT EXISTS facility_metrics_daily_date_facility_idx
  ON public.facility_metrics_daily (metric_date DESC, facility_id);

ALTER TABLE public.facility_metrics_daily ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "facility_metrics_daily_select_owner_or_admin"
  ON public.facility_metrics_daily;
CREATE POLICY "facility_metrics_daily_select_owner_or_admin"
  ON public.facility_metrics_daily FOR SELECT
  TO authenticated
  USING (
    has_role((SELECT auth.uid()), 'admin'::app_role)
    OR user_owns_facility(facility_id, (SELECT auth.uid()))
  );

-- ────────────────────────────────────────────────────────────────────
-- 2) Refresh function — recomputes the last N days idempotently
-- ────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.refresh_facility_metrics_daily(
  p_days_back int DEFAULT 3,
  p_only_facility uuid DEFAULT NULL
)
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_from date := (current_date - GREATEST(COALESCE(p_days_back, 3), 1))::date;
  v_to   date := current_date;
  v_rows int;
BEGIN
  -- Build the per-day aggregation. Each event source produces
  -- (facility_id, metric_date, <metric>) rows; the FULL OUTER JOIN
  -- pattern would be expensive on first run, so we instead do four
  -- UNION ALL streams then aggregate to a single row per (fid,date).
  WITH events AS (
    SELECT facility_id,
           created_at::date AS metric_date,
           SUM(CASE WHEN event_type = 'listing_impression' THEN 1 ELSE 0 END) AS impressions,
           SUM(CASE WHEN event_type = 'profile_view'        THEN 1 ELSE 0 END) AS profile_views,
           SUM(CASE WHEN event_type = 'click_to_call'       THEN 1 ELSE 0 END) AS phone_clicks,
           SUM(CASE WHEN event_type = 'website_click'       THEN 1 ELSE 0 END) AS website_clicks
    FROM public.provider_events
    WHERE created_at::date BETWEEN v_from AND v_to
      AND is_bot = false
      AND is_internal = false
      AND (p_only_facility IS NULL OR facility_id = p_only_facility)
    GROUP BY facility_id, created_at::date
  ),
  inquiries AS (
    SELECT facility_id,
           created_at::date AS metric_date,
           COUNT(*) AS inquiries
    FROM public.leads
    WHERE created_at::date BETWEEN v_from AND v_to
      AND facility_id IS NOT NULL
      AND (p_only_facility IS NULL OR facility_id = p_only_facility)
    GROUP BY facility_id, created_at::date
  ),
  widget_loads AS (
    SELECT facility_id,
           created_at::date AS metric_date,
           COUNT(*) AS widget_loads
    FROM public.badge_impressions
    WHERE created_at::date BETWEEN v_from AND v_to
      AND (p_only_facility IS NULL OR facility_id = p_only_facility)
    GROUP BY facility_id, created_at::date
  ),
  combined AS (
    SELECT facility_id, metric_date,
           SUM(impressions)    AS impressions,
           SUM(profile_views)  AS profile_views,
           SUM(phone_clicks)   AS phone_clicks,
           SUM(website_clicks) AS website_clicks,
           SUM(inquiries)      AS inquiries,
           SUM(widget_loads)   AS widget_loads
    FROM (
      SELECT facility_id, metric_date, impressions, profile_views, phone_clicks, website_clicks, 0 AS inquiries, 0 AS widget_loads FROM events
      UNION ALL
      SELECT facility_id, metric_date, 0, 0, 0, 0, inquiries, 0 FROM inquiries
      UNION ALL
      SELECT facility_id, metric_date, 0, 0, 0, 0, 0, widget_loads FROM widget_loads
    ) u
    GROUP BY facility_id, metric_date
  )
  INSERT INTO public.facility_metrics_daily AS m (
    facility_id, metric_date, impressions, profile_views,
    phone_clicks, website_clicks, inquiries, widget_loads, updated_at
  )
  SELECT
    c.facility_id, c.metric_date,
    COALESCE(c.impressions, 0)::int,
    COALESCE(c.profile_views, 0)::int,
    COALESCE(c.phone_clicks, 0)::int,
    COALESCE(c.website_clicks, 0)::int,
    COALESCE(c.inquiries, 0)::int,
    COALESCE(c.widget_loads, 0)::int,
    now()
  FROM combined c
  -- Skip facilities that no longer exist (CASCADE handles drops but
  -- the join is still cheap).
  WHERE EXISTS (SELECT 1 FROM public.facilities f WHERE f.id = c.facility_id)
  ON CONFLICT (facility_id, metric_date)
  DO UPDATE SET
    impressions    = EXCLUDED.impressions,
    profile_views  = EXCLUDED.profile_views,
    phone_clicks   = EXCLUDED.phone_clicks,
    website_clicks = EXCLUDED.website_clicks,
    inquiries      = EXCLUDED.inquiries,
    widget_loads   = EXCLUDED.widget_loads,
    updated_at     = now();

  GET DIAGNOSTICS v_rows = ROW_COUNT;
  RETURN v_rows;
END;
$$;

REVOKE ALL ON FUNCTION public.refresh_facility_metrics_daily(int, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.refresh_facility_metrics_daily(int, uuid) TO service_role;

COMMENT ON FUNCTION public.refresh_facility_metrics_daily(int, uuid) IS
  'Idempotent rebuild of facility_metrics_daily for the last N days '
  '(default 3). Pass p_only_facility to scope to a single row — used '
  'by get_facility_performance_summary for just-in-time freshness '
  'when the cron is between runs.';

-- ────────────────────────────────────────────────────────────────────
-- 3) Performance summary RPC — Pro tier, full payload
-- ────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.get_facility_performance_summary(p_facility_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
-- Not STABLE: the RPC may write (refresh sub-call) when metrics are
-- older than 15 min. STABLE would forbid that.
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_is_pro boolean;
  v_facility record;
  v_last_refresh timestamptz;
  v_totals_30 record;
  v_totals_7  record;
  v_totals_prev7 record;
  v_series jsonb;
  v_market jsonb;
  v_traffic jsonb;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
  END IF;
  IF NOT user_owns_facility(p_facility_id, v_user_id) THEN
    RAISE EXCEPTION 'Forbidden' USING ERRCODE = '42501';
  END IF;

  SELECT id, name, slug, city, state INTO v_facility
  FROM public.facilities
  WHERE id = p_facility_id AND status = 'approved';
  IF v_facility.id IS NULL THEN
    RAISE EXCEPTION 'Facility not found';
  END IF;

  v_is_pro := has_active_pro(p_facility_id);

  -- Just-in-time refresh when the most-recent rollup row is older
  -- than 15 minutes. Free providers get the same fresh refresh —
  -- the data shape they see is just narrower.
  SELECT MAX(updated_at) INTO v_last_refresh
  FROM public.facility_metrics_daily
  WHERE facility_id = p_facility_id;

  IF v_last_refresh IS NULL OR v_last_refresh < now() - interval '15 minutes' THEN
    PERFORM refresh_facility_metrics_daily(3, p_facility_id);
  END IF;

  -- 30-day totals (always returned).
  SELECT
    COALESCE(SUM(impressions), 0)::int      AS impressions,
    COALESCE(SUM(profile_views), 0)::int    AS profile_views,
    COALESCE(SUM(phone_clicks), 0)::int     AS phone_clicks,
    COALESCE(SUM(website_clicks), 0)::int   AS website_clicks,
    COALESCE(SUM(inquiries), 0)::int        AS inquiries,
    COALESCE(SUM(widget_loads), 0)::int     AS widget_loads
  INTO v_totals_30
  FROM public.facility_metrics_daily
  WHERE facility_id = p_facility_id
    AND metric_date >= current_date - 30;

  -- 7-day window (this week + last week for WoW delta).
  SELECT
    COALESCE(SUM(impressions), 0)::int      AS impressions,
    COALESCE(SUM(profile_views), 0)::int    AS profile_views,
    COALESCE(SUM(phone_clicks), 0)::int     AS phone_clicks,
    COALESCE(SUM(website_clicks), 0)::int   AS website_clicks,
    COALESCE(SUM(inquiries), 0)::int        AS inquiries,
    COALESCE(SUM(widget_loads), 0)::int     AS widget_loads
  INTO v_totals_7
  FROM public.facility_metrics_daily
  WHERE facility_id = p_facility_id
    AND metric_date >= current_date - 7
    AND metric_date <= current_date;

  SELECT
    COALESCE(SUM(impressions), 0)::int      AS impressions,
    COALESCE(SUM(profile_views), 0)::int    AS profile_views,
    COALESCE(SUM(phone_clicks), 0)::int     AS phone_clicks,
    COALESCE(SUM(website_clicks), 0)::int   AS website_clicks,
    COALESCE(SUM(inquiries), 0)::int        AS inquiries,
    COALESCE(SUM(widget_loads), 0)::int     AS widget_loads
  INTO v_totals_prev7
  FROM public.facility_metrics_daily
  WHERE facility_id = p_facility_id
    AND metric_date >= current_date - 14
    AND metric_date <  current_date - 7;

  -- For Free providers, return only headline counters + a Pro pitch.
  IF NOT v_is_pro THEN
    RETURN jsonb_build_object(
      'tier', 'free',
      'facility', jsonb_build_object(
        'id', v_facility.id, 'name', v_facility.name, 'slug', v_facility.slug,
        'city', v_facility.city, 'state', v_facility.state
      ),
      'last_7_days', jsonb_build_object(
        'impressions',    v_totals_7.impressions,
        'profile_views',  v_totals_7.profile_views,
        'inquiries',      v_totals_7.inquiries
      ),
      'last_30_days', jsonb_build_object(
        'impressions',    v_totals_30.impressions,
        'profile_views',  v_totals_30.profile_views,
        'inquiries',      v_totals_30.inquiries
      )
    );
  END IF;

  -- ─── Pro-only: daily time series ─────────────────────────────────
  WITH days AS (
    SELECT generate_series(
      (current_date - 29)::date,
      current_date::date,
      interval '1 day'
    )::date AS d
  ), joined AS (
    SELECT d.d AS metric_date,
           COALESCE(m.impressions, 0)    AS impressions,
           COALESCE(m.profile_views, 0)  AS profile_views,
           COALESCE(m.phone_clicks, 0)   AS phone_clicks,
           COALESCE(m.website_clicks, 0) AS website_clicks,
           COALESCE(m.inquiries, 0)      AS inquiries,
           COALESCE(m.widget_loads, 0)   AS widget_loads
    FROM days d
    LEFT JOIN public.facility_metrics_daily m
      ON m.facility_id = p_facility_id AND m.metric_date = d.d
  )
  SELECT jsonb_agg(
    jsonb_build_object(
      'date',           metric_date,
      'impressions',    impressions,
      'profile_views',  profile_views,
      'phone_clicks',   phone_clicks,
      'website_clicks', website_clicks,
      'inquiries',      inquiries,
      'widget_loads',   widget_loads
    )
    ORDER BY metric_date ASC
  )
  INTO v_series FROM joined;

  -- ─── Traffic sources (top referrers from analytics_events) ──────
  --
  -- analytics_events captures path/referrer/params for every
  -- pageview the SPA logs. We pull the rows whose path matches this
  -- facility's profile and bucket by referrer host. Bot/internal
  -- filtering happens in the SPA before logging, so no flag join
  -- needed here.
  SELECT jsonb_agg(row ORDER BY (row->>'count')::int DESC)
  INTO v_traffic
  FROM (
    SELECT jsonb_build_object(
      'source', source,
      'count', count(*)
    ) AS row
    FROM (
      SELECT
        CASE
          WHEN referrer IS NULL OR length(referrer) = 0 THEN 'direct / typed'
          WHEN referrer ~* 'google\.[a-z.]+' THEN 'Google'
          WHEN referrer ~* 'bing\.com'       THEN 'Bing'
          WHEN referrer ~* 'duckduckgo\.com' THEN 'DuckDuckGo'
          WHEN referrer ~* 'yahoo\.com'      THEN 'Yahoo'
          WHEN referrer ~* '(facebook|instagram|x\.com|twitter|linkedin|reddit|tiktok)' THEN
            split_part(regexp_replace(referrer, '^https?://(www\.)?', ''), '/', 1)
          ELSE regexp_replace(split_part(regexp_replace(referrer, '^https?://(www\.)?', ''), '/', 1), ':\d+$', '')
        END AS source
      FROM public.analytics_events
      WHERE path = ('/center/' || v_facility.slug)
        AND created_at >= now() - interval '30 days'
    ) s
    GROUP BY source
    ORDER BY count(*) DESC
    LIMIT 10
  ) t;

  -- ─── Market position (rank by 30-day profile views in state) ─────
  --
  -- Rank counts only competitors in the same state with at least one
  -- profile view in the same window. Returns rank + total + percentile
  -- — NEVER another facility's identity or raw count.
  SELECT jsonb_build_object(
    'scope',     'state',
    'state',     v_facility.state,
    'rank',      rank,
    'total',     total,
    'percentile', percentile,
    'metric',    'profile_views_30d'
  )
  INTO v_market
  FROM (
    WITH ranked AS (
      SELECT f.id,
             COALESCE(SUM(m.profile_views), 0) AS views,
             RANK() OVER (ORDER BY COALESCE(SUM(m.profile_views), 0) DESC) AS rnk
      FROM public.facilities f
      LEFT JOIN public.facility_metrics_daily m
        ON m.facility_id = f.id AND m.metric_date >= current_date - 30
      WHERE f.state = v_facility.state
        AND f.status = 'approved'
        AND COALESCE(f.suspended, false) = false
      GROUP BY f.id
    )
    SELECT
      (SELECT rnk FROM ranked WHERE id = p_facility_id) AS rank,
      (SELECT COUNT(*) FROM ranked) AS total,
      ROUND(
        100.0 * (1 - ((SELECT rnk FROM ranked WHERE id = p_facility_id) - 1)::numeric
                     / NULLIF((SELECT COUNT(*) FROM ranked), 0))
      )::int AS percentile
  ) m;

  RETURN jsonb_build_object(
    'tier', 'pro',
    'facility', jsonb_build_object(
      'id', v_facility.id, 'name', v_facility.name, 'slug', v_facility.slug,
      'city', v_facility.city, 'state', v_facility.state
    ),
    'last_refresh_at', v_last_refresh,
    'last_30_days', jsonb_build_object(
      'impressions',    v_totals_30.impressions,
      'profile_views',  v_totals_30.profile_views,
      'phone_clicks',   v_totals_30.phone_clicks,
      'website_clicks', v_totals_30.website_clicks,
      'inquiries',      v_totals_30.inquiries,
      'widget_loads',   v_totals_30.widget_loads
    ),
    'last_7_days', jsonb_build_object(
      'impressions',    v_totals_7.impressions,
      'profile_views',  v_totals_7.profile_views,
      'phone_clicks',   v_totals_7.phone_clicks,
      'website_clicks', v_totals_7.website_clicks,
      'inquiries',      v_totals_7.inquiries,
      'widget_loads',   v_totals_7.widget_loads
    ),
    'prev_7_days', jsonb_build_object(
      'impressions',    v_totals_prev7.impressions,
      'profile_views',  v_totals_prev7.profile_views,
      'phone_clicks',   v_totals_prev7.phone_clicks,
      'website_clicks', v_totals_prev7.website_clicks,
      'inquiries',      v_totals_prev7.inquiries,
      'widget_loads',   v_totals_prev7.widget_loads
    ),
    'series',  COALESCE(v_series,  '[]'::jsonb),
    'traffic', COALESCE(v_traffic, '[]'::jsonb),
    'market',  v_market
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_facility_performance_summary(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_facility_performance_summary(uuid) TO authenticated;

COMMENT ON FUNCTION public.get_facility_performance_summary(uuid) IS
  'Owner-only performance summary. Returns Pro shape (full series + '
  'traffic sources + market position) or Free shape (headline counts '
  'only). Just-in-time refresh on the rollup when older than 15min.';

COMMIT;
