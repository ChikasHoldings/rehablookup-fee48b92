-- Pro-gating hardening — close the two real server-side bypasses found
-- in the provider-panel audit:
--
--   1. create_review_request RPC was ownership-gated only. A Free
--      provider could send up to 20 review-invite emails / 24h /
--      facility, even though the UI shows it as Pro-only. The fix:
--      reject with the standard 42501 + a clear message if the
--      facility doesn't have active Pro.
--
--   2. get_widget_impression_summary was ownership-gated only. A Free
--      provider could read the full embed-analytics summary the
--      Pro UI exposes. Same fix — has_active_pro check after the
--      ownership check, returning Forbidden.
--
-- LEFT IN PLACE:
--   * record_widget_impression — write-side only, no user-visible
--     bypass; Free facilities can have impressions logged but the
--     read RPC is now Pro-gated. Keeps the widget consistent across
--     all states.
--   * facility_programs / facility_amenities CRUD — already
--     Pro-masked at read time via public_facility_programs /
--     public_facility_amenities views (WHERE has_active_pro(facility_id)).
--     Free providers can prepare data but it never renders publicly.
--     Intentional.

CREATE OR REPLACE FUNCTION public.create_review_request(
  p_facility_id uuid,
  p_recipient_name text,
  p_recipient_email text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_name text;
  v_email text;
  v_recent_count int;
  v_row record;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE='42501';
  END IF;
  IF NOT user_owns_facility(p_facility_id, v_user_id) THEN
    RAISE EXCEPTION 'Forbidden' USING ERRCODE='42501';
  END IF;
  -- PRO gate — closes the audit-flagged bypass where a Free provider
  -- could send real review-invite emails via direct RPC. Aligns with
  -- the UI which surfaces this feature as Pro-only.
  IF NOT public.has_active_pro(p_facility_id) THEN
    RAISE EXCEPTION 'Pro subscription required to send review requests'
      USING ERRCODE='42501';
  END IF;

  v_name := btrim(coalesce(p_recipient_name, ''));
  v_email := lower(btrim(coalesce(p_recipient_email, '')));
  IF length(v_name) = 0 OR length(v_name) > 100 THEN
    RAISE EXCEPTION 'Recipient name must be 1..100 chars';
  END IF;
  IF v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' THEN
    RAISE EXCEPTION 'Invalid recipient email';
  END IF;
  IF length(v_email) > 254 THEN
    RAISE EXCEPTION 'Recipient email too long';
  END IF;

  SELECT count(*) INTO v_recent_count
  FROM public.review_requests
  WHERE facility_id = p_facility_id AND created_at > now() - interval '24 hours';
  IF v_recent_count >= 20 THEN
    RAISE EXCEPTION 'Daily limit reached (20 review requests per facility / 24h). Try again tomorrow.'
      USING ERRCODE='23P01';
  END IF;

  SELECT id, facility_id, recipient_name, recipient_email, status, created_at, sent_at, review_submitted_at, expires_at
  INTO v_row
  FROM public.review_requests
  WHERE facility_id = p_facility_id AND lower(recipient_email) = v_email
    AND status = 'pending' AND expires_at > now() AND review_submitted_at IS NULL
  ORDER BY created_at DESC LIMIT 1;
  IF v_row.id IS NOT NULL THEN
    RETURN jsonb_build_object(
      'request_id', v_row.id, 'facility_id', v_row.facility_id,
      'recipient_name', v_row.recipient_name, 'recipient_email', v_row.recipient_email,
      'status', v_row.status, 'created_at', v_row.created_at, 'duplicate', true
    );
  END IF;

  INSERT INTO public.review_requests (facility_id, sender_user_id, recipient_name, recipient_email, status)
  VALUES (p_facility_id, v_user_id, v_name, v_email, 'pending')
  RETURNING id, facility_id, recipient_name, recipient_email, status, created_at INTO v_row;

  RETURN jsonb_build_object(
    'request_id', v_row.id, 'facility_id', v_row.facility_id,
    'recipient_name', v_row.recipient_name, 'recipient_email', v_row.recipient_email,
    'status', v_row.status, 'created_at', v_row.created_at, 'duplicate', false
  );
END;
$$;


CREATE OR REPLACE FUNCTION public.get_widget_impression_summary(p_facility_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_total int;
  v_total_30d int;
  v_total_7d int;
  v_last_at timestamptz;
  v_by_type jsonb;
  v_by_size jsonb;
  v_top_referrers jsonb;
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
  -- PRO gate — embed analytics are a Pro-only feature; the UI hides
  -- the card for Free providers but a direct RPC call would still
  -- have returned the full summary. Close that bypass.
  IF NOT public.has_active_pro(p_facility_id) THEN
    RAISE EXCEPTION 'Pro subscription required to view widget analytics'
      USING ERRCODE='42501';
  END IF;

  SELECT COUNT(*),
         COUNT(*) FILTER (WHERE created_at > now() - interval '30 days'),
         COUNT(*) FILTER (WHERE created_at > now() - interval '7 days'),
         MAX(created_at)
  INTO v_total, v_total_30d, v_total_7d, v_last_at
  FROM public.badge_impressions WHERE facility_id = p_facility_id;

  SELECT jsonb_object_agg(badge_type, n) INTO v_by_type
  FROM (
    SELECT CASE WHEN badge_type IN ('verified', 'badge') THEN 'badge' ELSE badge_type END AS badge_type, COUNT(*) AS n
    FROM public.badge_impressions
    WHERE facility_id = p_facility_id AND created_at > now() - interval '30 days'
    GROUP BY 1
  ) t;

  SELECT jsonb_object_agg(badge_size, n) INTO v_by_size
  FROM (
    SELECT badge_size, COUNT(*) AS n FROM public.badge_impressions
    WHERE facility_id = p_facility_id AND created_at > now() - interval '30 days'
    GROUP BY badge_size
  ) t;

  SELECT jsonb_agg(row ORDER BY (row->>'count')::int DESC) INTO v_top_referrers
  FROM (
    SELECT jsonb_build_object(
      'domain', COALESCE(NULLIF(referrer_domain, ''), '(unknown)'),
      'count', COUNT(*)
    ) AS row
    FROM public.badge_impressions
    WHERE facility_id = p_facility_id AND created_at > now() - interval '30 days'
    GROUP BY COALESCE(NULLIF(referrer_domain, ''), '(unknown)')
    ORDER BY COUNT(*) DESC LIMIT 10
  ) t;

  RETURN jsonb_build_object(
    'total', COALESCE(v_total, 0),
    'last_30_days', COALESCE(v_total_30d, 0),
    'last_7_days', COALESCE(v_total_7d, 0),
    'last_at', v_last_at,
    'by_widget', COALESCE(v_by_type, '{}'::jsonb),
    'by_size', COALESCE(v_by_size, '{}'::jsonb),
    'top_referrers', COALESCE(v_top_referrers, '[]'::jsonb)
  );
END;
$$;
