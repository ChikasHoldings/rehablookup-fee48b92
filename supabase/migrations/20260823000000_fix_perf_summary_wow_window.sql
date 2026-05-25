-- Fix WoW window off-by-one in get_facility_performance_summary.
-- Previously "last 7 days" spanned 8 calendar days (>= current_date - 7
-- AND <= current_date) while "previous 7 days" spanned 7, inflating the
-- 7-day totals and every WoW delta. Now both windows are exactly 7 days
-- and adjacent: last7 = [today-6 .. today], prev7 = [today-13 .. today-7].
-- CREATE OR REPLACE is atomic; body identical apart from 3 predicates.

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
    AND metric_date > current_date - 7
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
    AND metric_date > current_date - 14
    AND metric_date <= current_date - 7;

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
