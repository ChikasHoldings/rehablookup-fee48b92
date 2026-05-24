-- Embed platform extensions:
--   * Gallery widget (third widget on the same platform)
--   * Provider impression-analytics RPC
--
-- 1) record_widget_impression gains 'gallery' as a valid widget type
--    so the new carousel can log impressions through the same
--    rate-limited path the verified-badge + reviews widgets use.
--
-- 2) get_embed_gallery(facility_id) — anon-callable, returns a
--    public-safe gallery payload. Free facilities are capped at the
--    first 5 photos (matching the Free photo limit in
--    enforce_facility_plan_photo_cap); Pro returns up to 10. Logo,
--    name, city, state, slug + profile_url all included so the
--    widget can render attribution without a second fetch.
--
-- 3) get_widget_impression_summary(facility_id) — authenticated,
--    owner-only. Returns aggregate counts the provider portal's new
--    "Embed analytics" card uses to surface impression performance
--    without giving them direct read on badge_impressions (the
--    public_facilities is_pro view already gates rich content; same
--    pattern here keeps the read side narrow).

BEGIN;

-- ─── 1. Extend record_widget_impression with 'gallery' ───────────────
CREATE OR REPLACE FUNCTION public.record_widget_impression(
  p_facility_id uuid,
  p_widget_type text,
  p_referrer_domain text,
  p_size text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_recent_count int;
  v_widget text;
  v_size text;
  v_domain text;
BEGIN
  IF p_facility_id IS NULL THEN RETURN; END IF;

  v_widget := lower(coalesce(p_widget_type, 'verified'));
  -- Allow-list mirrors the static widget pages under /embed/v1/widget/.
  -- 'badge' is the legacy alias for 'verified' that the original
  -- platform shipped before the gallery widget was added.
  IF v_widget NOT IN ('verified', 'reviews', 'badge', 'gallery') THEN
    v_widget := 'verified';
  END IF;
  IF v_widget = 'badge' THEN v_widget := 'verified'; END IF;

  v_size := lower(coalesce(p_size, 'medium'));
  IF v_size NOT IN ('small', 'medium', 'large') THEN
    v_size := 'medium';
  END IF;

  v_domain := nullif(btrim(coalesce(p_referrer_domain, '')), '');
  IF v_domain IS NOT NULL THEN
    v_domain := regexp_replace(v_domain, '^https?://', '', 'i');
    v_domain := split_part(v_domain, '/', 1);
    v_domain := split_part(v_domain, ':', 1);
    v_domain := lower(left(v_domain, 253));
  END IF;

  SELECT COUNT(*) INTO v_recent_count
  FROM public.badge_impressions
  WHERE facility_id = p_facility_id
    AND created_at > now() - interval '1 minute';

  IF v_recent_count >= 600 THEN
    RETURN;
  END IF;

  INSERT INTO public.badge_impressions (facility_id, badge_type, badge_size, referrer_domain)
  SELECT f.id, v_widget, v_size, v_domain
  FROM public.facilities f
  WHERE f.id = p_facility_id
    AND f.status = 'approved'
    AND COALESCE(f.suspended, false) = false;
END;
$$;

REVOKE ALL ON FUNCTION public.record_widget_impression(uuid, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_widget_impression(uuid, text, text, text) TO anon, authenticated;


-- ─── 2. get_embed_gallery — anon-callable, public-safe ───────────────
CREATE OR REPLACE FUNCTION public.get_embed_gallery(p_facility_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  v_row record;
  v_is_pro boolean;
  v_cap int;
  v_photos text[];
BEGIN
  IF p_facility_id IS NULL THEN RETURN NULL; END IF;

  SELECT f.id, f.name, f.slug, f.city, f.state, f.logo_url, f.gallery_urls
  INTO v_row
  FROM public.facilities f
  WHERE f.id = p_facility_id
    AND f.status = 'approved'
    AND COALESCE(f.suspended, false) = false
  LIMIT 1;

  IF v_row.id IS NULL THEN
    RETURN NULL;
  END IF;

  -- Free facilities are capped at the same 5-photo limit
  -- enforce_facility_plan_photo_cap applies to the underlying
  -- gallery — keeping the embed surface aligned with what the public
  -- profile actually shows. Pro gets up to 10. Bots reading via this
  -- RPC can't surface more than the public profile already exposes.
  v_is_pro := has_active_pro(v_row.id);
  v_cap := CASE WHEN v_is_pro THEN 10 ELSE 5 END;

  -- Drop NULL / empty entries before capping. text[] can carry sparse
  -- values if older rows still have legacy placeholder URLs.
  SELECT array_agg(url) INTO v_photos
  FROM (
    SELECT unnest(v_row.gallery_urls) AS url LIMIT v_cap
  ) t
  WHERE url IS NOT NULL AND length(btrim(url)) > 0;

  RETURN jsonb_build_object(
    'facility_id', v_row.id,
    'name',        v_row.name,
    'slug',        v_row.slug,
    'city',        v_row.city,
    'state',       v_row.state,
    'logo_url',    v_row.logo_url,
    'is_pro',      v_is_pro,
    'photos',      COALESCE(to_jsonb(v_photos), '[]'::jsonb),
    'photo_count', COALESCE(array_length(v_photos, 1), 0),
    'profile_url', 'https://rehablookup.com/center/' || v_row.slug
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_embed_gallery(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_embed_gallery(uuid) TO anon, authenticated;

COMMENT ON FUNCTION public.get_embed_gallery(uuid) IS
  'Returns a public-safe gallery payload (logo + up to 5 photos for '
  'Free, up to 10 for Pro). NULL when facility is not approved / '
  'suspended. Anon-callable; matches the same Pro-gating used by '
  'enforce_facility_plan_photo_cap so the embed surface never reveals '
  'more photos than the public profile.';


-- ─── 3. get_widget_impression_summary — owner analytics ──────────────
CREATE OR REPLACE FUNCTION public.get_widget_impression_summary(p_facility_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
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
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
  END IF;
  IF p_facility_id IS NULL THEN
    RAISE EXCEPTION 'Missing facility_id';
  END IF;
  IF NOT user_owns_facility(p_facility_id, v_user_id) THEN
    RAISE EXCEPTION 'Forbidden' USING ERRCODE = '42501';
  END IF;

  SELECT COUNT(*),
         COUNT(*) FILTER (WHERE created_at > now() - interval '30 days'),
         COUNT(*) FILTER (WHERE created_at > now() - interval '7 days'),
         MAX(created_at)
  INTO v_total, v_total_30d, v_total_7d, v_last_at
  FROM public.badge_impressions
  WHERE facility_id = p_facility_id;

  -- Per-widget breakdown over the last 30 days. Mapping back to the
  -- four widget surfaces the provider knows about (badge / reviews /
  -- gallery). Legacy 'verified' rows already collapse to 'badge' in
  -- the UI for consistency with the picker labels.
  SELECT jsonb_object_agg(badge_type, n) INTO v_by_type
  FROM (
    SELECT
      CASE WHEN badge_type IN ('verified', 'badge') THEN 'badge' ELSE badge_type END AS badge_type,
      COUNT(*) AS n
    FROM public.badge_impressions
    WHERE facility_id = p_facility_id
      AND created_at > now() - interval '30 days'
    GROUP BY 1
  ) t;

  SELECT jsonb_object_agg(badge_size, n) INTO v_by_size
  FROM (
    SELECT badge_size, COUNT(*) AS n
    FROM public.badge_impressions
    WHERE facility_id = p_facility_id
      AND created_at > now() - interval '30 days'
    GROUP BY badge_size
  ) t;

  -- Top 10 referrer domains. Hosts that didn't send a referrer (or
  -- where the loader couldn't infer one) collapse to '(unknown)' so
  -- the provider sees them but they don't pollute the list of real
  -- sites embedding their widget.
  SELECT jsonb_agg(row ORDER BY (row->>'count')::int DESC) INTO v_top_referrers
  FROM (
    SELECT jsonb_build_object(
      'domain', COALESCE(NULLIF(referrer_domain, ''), '(unknown)'),
      'count',  COUNT(*)
    ) AS row
    FROM public.badge_impressions
    WHERE facility_id = p_facility_id
      AND created_at > now() - interval '30 days'
    GROUP BY COALESCE(NULLIF(referrer_domain, ''), '(unknown)')
    ORDER BY COUNT(*) DESC
    LIMIT 10
  ) t;

  RETURN jsonb_build_object(
    'total',        COALESCE(v_total, 0),
    'last_30_days', COALESCE(v_total_30d, 0),
    'last_7_days',  COALESCE(v_total_7d, 0),
    'last_at',      v_last_at,
    'by_widget',    COALESCE(v_by_type, '{}'::jsonb),
    'by_size',      COALESCE(v_by_size, '{}'::jsonb),
    'top_referrers', COALESCE(v_top_referrers, '[]'::jsonb)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_widget_impression_summary(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_widget_impression_summary(uuid) TO authenticated;

COMMENT ON FUNCTION public.get_widget_impression_summary(uuid) IS
  'Aggregate widget-impression analytics for a single facility, owner-'
  'only. Returns last-30-day totals + breakdowns by widget type, size, '
  'and top 10 referrer domains. Used by the Embed analytics card on '
  '/provider/embed-badge.';

COMMIT;
