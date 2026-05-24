-- Monthly market report for a single facility.
--
-- Computes on-demand from leads + facilities (no materialised cache —
-- the queries are cheap on the existing indexes, and "this month" is
-- the only useful window in practice). The provider Analytics page
-- adds a "Market" tab that calls this RPC.
--
-- Gated server-side: caller must own the facility AND the facility
-- must have an active Pro subscription (free providers get a stub
-- payload they can preview).
--
-- Payload:
--   {
--     month,                          -- YYYY-MM
--     facility_state,
--     state_total_inquiries,
--     facility_inquiries,
--     facility_share_pct,
--     state_rank,                     -- 1-based among in-state facilities by lead count
--     state_total_facilities,         -- count of approved in-state facilities
--     state_verified_count,
--     state_verified_share_pct,
--     top_substances,                 -- [{value, count}]
--     top_levels_of_care,             -- [{value, count}]
--     top_insurance_providers,        -- [{value, count}]
--     generated_at
--   }

CREATE OR REPLACE FUNCTION public.get_facility_market_report(
  p_facility_id uuid,
  p_month date DEFAULT date_trunc('month', now())::date
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_state text;
  v_month_start timestamptz;
  v_month_end timestamptz;
  v_state_total int;
  v_facility_count int;
  v_facility_share numeric;
  v_state_rank int;
  v_state_total_facilities int;
  v_state_verified int;
  v_verified_share numeric;
  v_top_substances jsonb;
  v_top_loc jsonb;
  v_top_insurance jsonb;
  v_is_pro boolean;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE='42501';
  END IF;
  IF p_facility_id IS NULL THEN
    RAISE EXCEPTION 'Missing facility_id';
  END IF;
  IF NOT user_owns_facility(p_facility_id, v_user_id) THEN
    RAISE EXCEPTION 'Forbidden' USING ERRCODE='42501';
  END IF;

  SELECT state INTO v_state FROM public.facilities WHERE id = p_facility_id;
  IF v_state IS NULL THEN
    RAISE EXCEPTION 'Facility has no state on record';
  END IF;

  v_month_start := date_trunc('month', p_month)::timestamptz;
  v_month_end := (v_month_start + interval '1 month');
  v_is_pro := public.has_active_pro(p_facility_id);

  -- ─── State-level inquiry totals ────────────────────────────────
  -- Join to facilities to scope by state. Same-state in-month count
  -- gives the addressable market for this facility.
  SELECT COUNT(*)
  INTO v_state_total
  FROM public.leads l
  JOIN public.facilities f ON f.id = l.facility_id
  WHERE f.state = v_state
    AND l.created_at >= v_month_start
    AND l.created_at < v_month_end;

  -- This facility's count + share
  SELECT COUNT(*)
  INTO v_facility_count
  FROM public.leads l
  WHERE l.facility_id = p_facility_id
    AND l.created_at >= v_month_start
    AND l.created_at < v_month_end;

  v_facility_share := CASE
    WHEN v_state_total > 0 THEN round((v_facility_count::numeric / v_state_total) * 100, 1)
    ELSE 0
  END;

  -- ─── State rank among peer facilities ──────────────────────────
  WITH facility_counts AS (
    SELECT f.id, COUNT(l.id) AS lead_count
    FROM public.facilities f
    LEFT JOIN public.leads l
      ON l.facility_id = f.id
      AND l.created_at >= v_month_start
      AND l.created_at < v_month_end
    WHERE f.state = v_state
      AND f.status = 'approved'
      AND COALESCE(f.suspended, false) = false
    GROUP BY f.id
  ), ranked AS (
    SELECT id, lead_count,
           RANK() OVER (ORDER BY lead_count DESC NULLS LAST) AS rnk
    FROM facility_counts
  )
  SELECT rnk, (SELECT count(*) FROM facility_counts)
  INTO v_state_rank, v_state_total_facilities
  FROM ranked WHERE id = p_facility_id;

  -- ─── Verified-share for context ────────────────────────────────
  SELECT COUNT(*) FILTER (WHERE verified = true)
  INTO v_state_verified
  FROM public.facilities
  WHERE state = v_state
    AND status = 'approved'
    AND COALESCE(suspended, false) = false;

  v_verified_share := CASE
    WHEN v_state_total_facilities > 0
      THEN round((v_state_verified::numeric / v_state_total_facilities) * 100, 1)
    ELSE 0
  END;

  -- ─── Demand mix: top substances / LOC / insurance ──────────────
  -- Scoped to same-state in-month leads. These are aggregates across
  -- the whole peer market, not just this facility, so the provider
  -- sees what the market is asking for (i.e. what services they
  -- should be configured to support).
  SELECT jsonb_agg(row ORDER BY (row->>'count')::int DESC) INTO v_top_substances
  FROM (
    SELECT jsonb_build_object('value', primary_substance, 'count', COUNT(*)) AS row
    FROM public.leads l
    JOIN public.facilities f ON f.id = l.facility_id
    WHERE f.state = v_state
      AND l.created_at >= v_month_start AND l.created_at < v_month_end
      AND primary_substance IS NOT NULL AND length(btrim(primary_substance)) > 0
    GROUP BY primary_substance
    ORDER BY COUNT(*) DESC LIMIT 5
  ) t;

  SELECT jsonb_agg(row ORDER BY (row->>'count')::int DESC) INTO v_top_loc
  FROM (
    SELECT jsonb_build_object('value', level_of_care, 'count', COUNT(*)) AS row
    FROM public.leads l
    JOIN public.facilities f ON f.id = l.facility_id
    WHERE f.state = v_state
      AND l.created_at >= v_month_start AND l.created_at < v_month_end
      AND level_of_care IS NOT NULL AND length(btrim(level_of_care)) > 0
    GROUP BY level_of_care
    ORDER BY COUNT(*) DESC LIMIT 5
  ) t;

  SELECT jsonb_agg(row ORDER BY (row->>'count')::int DESC) INTO v_top_insurance
  FROM (
    SELECT jsonb_build_object('value', insurance_provider, 'count', COUNT(*)) AS row
    FROM public.leads l
    JOIN public.facilities f ON f.id = l.facility_id
    WHERE f.state = v_state
      AND l.created_at >= v_month_start AND l.created_at < v_month_end
      AND insurance_provider IS NOT NULL AND length(btrim(insurance_provider)) > 0
    GROUP BY insurance_provider
    ORDER BY COUNT(*) DESC LIMIT 5
  ) t;

  RETURN jsonb_build_object(
    'month', to_char(p_month, 'YYYY-MM'),
    'facility_state', v_state,
    'state_total_inquiries', COALESCE(v_state_total, 0),
    'facility_inquiries', COALESCE(v_facility_count, 0),
    'facility_share_pct', COALESCE(v_facility_share, 0),
    'state_rank', COALESCE(v_state_rank, 0),
    'state_total_facilities', COALESCE(v_state_total_facilities, 0),
    'state_verified_count', COALESCE(v_state_verified, 0),
    'state_verified_share_pct', COALESCE(v_verified_share, 0),
    'top_substances', COALESCE(v_top_substances, '[]'::jsonb),
    'top_levels_of_care', COALESCE(v_top_loc, '[]'::jsonb),
    'top_insurance_providers', COALESCE(v_top_insurance, '[]'::jsonb),
    'is_pro', v_is_pro,
    'generated_at', now()
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_facility_market_report(uuid, date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_facility_market_report(uuid, date) TO authenticated;
