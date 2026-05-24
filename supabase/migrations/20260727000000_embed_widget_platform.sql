-- Embeddable widget platform: anon-callable RPCs.
--
-- Three SECURITY DEFINER functions back the public loader at
-- /embed/v1/loader.js + the two widget content pages
-- (/embed/v1/widget/badge.html, /embed/v1/widget/reviews.html):
--
--   * get_embed_badge(facility_id)        → badge payload or NULL
--   * get_embed_reviews(facility_id, lim) → reviews payload or NULL
--   * record_widget_impression(...)       → inserts into badge_impressions
--
-- Each function returns ONLY public-safe fields. RLS on the underlying
-- tables stays intact — these RPCs bypass it deliberately (via
-- SECURITY DEFINER) to expose a tightly-scoped projection that's safe
-- for the anon role to read from any third-party site.
--
-- Rate limiting: record_widget_impression rejects inserts when the
-- facility has logged > 600 in the past minute. Legit pages load the
-- widget once per pageview; 600/min/facility tolerates Cloudflare
-- caches, AMP, and reasonable popularity while shutting down obvious
-- bot loops.
--
-- Idempotent: CREATE OR REPLACE on every function; REVOKE/GRANT pairs
-- are safe on re-apply.

BEGIN;

-- ─── 1. record_widget_impression ───────────────────────────────────────
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
  -- Validate + normalise inputs. Anything weird → drop silently.
  IF p_facility_id IS NULL THEN RETURN; END IF;

  v_widget := lower(coalesce(p_widget_type, 'verified'));
  IF v_widget NOT IN ('verified', 'reviews', 'badge') THEN
    -- 'badge' is the legacy alias for 'verified'; both flow into
    -- badge_impressions.badge_type='verified' for analytics.
    v_widget := 'verified';
  END IF;
  IF v_widget = 'badge' THEN v_widget := 'verified'; END IF;

  v_size := lower(coalesce(p_size, 'medium'));
  IF v_size NOT IN ('small', 'medium', 'large') THEN
    v_size := 'medium';
  END IF;

  -- Strip protocol + path + port from referrer; we only keep the host.
  v_domain := nullif(btrim(coalesce(p_referrer_domain, '')), '');
  IF v_domain IS NOT NULL THEN
    v_domain := regexp_replace(v_domain, '^https?://', '', 'i');
    v_domain := split_part(v_domain, '/', 1);
    v_domain := split_part(v_domain, ':', 1);
    v_domain := lower(left(v_domain, 253));
  END IF;

  -- Per-facility, per-minute rate limit. Silently no-op when exceeded.
  SELECT COUNT(*) INTO v_recent_count
  FROM public.badge_impressions
  WHERE facility_id = p_facility_id
    AND created_at > now() - interval '1 minute';

  IF v_recent_count >= 600 THEN
    RETURN;
  END IF;

  -- Only log impressions for facilities that actually exist + are
  -- approved + not suspended. Bogus IDs from a misconfigured host get
  -- silently dropped instead of dirtying the analytics table.
  INSERT INTO public.badge_impressions (
    facility_id, badge_type, badge_size, referrer_domain
  )
  SELECT
    f.id,
    v_widget,
    v_size,
    v_domain
  FROM public.facilities f
  WHERE f.id = p_facility_id
    AND f.status = 'approved'
    AND COALESCE(f.suspended, false) = false;
END;
$$;

REVOKE ALL ON FUNCTION public.record_widget_impression(uuid, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_widget_impression(uuid, text, text, text) TO anon, authenticated;

COMMENT ON FUNCTION public.record_widget_impression(uuid, text, text, text) IS
  'Logs an embed-widget impression into badge_impressions. Anon-callable; '
  'rate-limited to 600/facility/minute. Bogus / suspended / unapproved '
  'facility IDs are silently ignored.';


-- ─── 2. get_embed_badge ────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_embed_badge(p_facility_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  v_row record;
BEGIN
  IF p_facility_id IS NULL THEN RETURN NULL; END IF;

  SELECT f.id, f.name, f.slug, f.city, f.state, f.verified, f.logo_url,
         has_active_pro(f.id) AS is_pro
  INTO v_row
  FROM public.facilities f
  WHERE f.id = p_facility_id
    AND f.status = 'approved'
    AND COALESCE(f.suspended, false) = false
    AND f.verified = true   -- spec: badge renders ONLY for verified facilities
  LIMIT 1;

  IF v_row.id IS NULL THEN
    RETURN NULL;
  END IF;

  RETURN jsonb_build_object(
    'facility_id', v_row.id,
    'name',        v_row.name,
    'slug',        v_row.slug,
    'city',        v_row.city,
    'state',       v_row.state,
    'logo_url',    v_row.logo_url,
    'is_pro',      v_row.is_pro,
    'profile_url', 'https://rehablookup.com/center/' || v_row.slug
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_embed_badge(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_embed_badge(uuid) TO anon, authenticated;

COMMENT ON FUNCTION public.get_embed_badge(uuid) IS
  'Returns a public-safe payload for the verified-badge widget, or NULL '
  'when the facility is not approved / suspended / unverified. Anon-callable '
  '(SECURITY DEFINER) so the static widget HTML can read it without a JWT.';


-- ─── 3. get_embed_reviews ──────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_embed_reviews(
  p_facility_id uuid,
  p_limit int DEFAULT 5
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  v_facility record;
  v_lim int;
  v_avg numeric(3,2);
  v_count int;
  v_reviews jsonb;
BEGIN
  IF p_facility_id IS NULL THEN RETURN NULL; END IF;

  v_lim := LEAST(GREATEST(COALESCE(p_limit, 5), 1), 10);

  SELECT f.id, f.name, f.slug, f.verified
  INTO v_facility
  FROM public.facilities f
  WHERE f.id = p_facility_id
    AND f.status = 'approved'
    AND COALESCE(f.suspended, false) = false
  LIMIT 1;

  IF v_facility.id IS NULL THEN
    RETURN NULL;
  END IF;

  -- Aggregate over approved reviews only — pending / disputed don't
  -- count toward the public number.
  SELECT
    ROUND(AVG(rating)::numeric, 2),
    COUNT(*)
  INTO v_avg, v_count
  FROM public.facility_reviews
  WHERE facility_id = p_facility_id
    AND status = 'approved';

  -- Reviewer PII is masked: first initial only. Existing reviewer_
  -- display_name snapshots are typically "First L." already; we strip
  -- to just the first character for the embed widget so partner sites
  -- never see a full reviewer name.
  SELECT jsonb_agg(jsonb_build_object(
    'id',                r.id,
    'rating',            r.rating,
    'reviewer_initial',  CASE
                            WHEN r.reviewer_display_name IS NULL
                              OR length(btrim(r.reviewer_display_name)) = 0
                            THEN 'V'
                            ELSE upper(left(btrim(r.reviewer_display_name), 1))
                          END,
    'review_text',       left(coalesce(r.review_text, ''), 280),
    'created_at',        r.created_at
  ) ORDER BY r.created_at DESC)
  INTO v_reviews
  FROM (
    SELECT id, rating, reviewer_display_name, review_text, created_at
    FROM public.facility_reviews
    WHERE facility_id = p_facility_id
      AND status = 'approved'
    ORDER BY created_at DESC
    LIMIT v_lim
  ) r;

  RETURN jsonb_build_object(
    'facility_id', v_facility.id,
    'name',        v_facility.name,
    'slug',        v_facility.slug,
    'verified',    v_facility.verified,
    'is_pro',      has_active_pro(v_facility.id),
    'profile_url', 'https://rehablookup.com/center/' || v_facility.slug,
    'avg_rating',  v_avg,
    'rating_count', COALESCE(v_count, 0),
    'reviews',     COALESCE(v_reviews, '[]'::jsonb)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_embed_reviews(uuid, int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_embed_reviews(uuid, int) TO anon, authenticated;

COMMENT ON FUNCTION public.get_embed_reviews(uuid, int) IS
  'Returns a public-safe payload for the reviews widget: aggregate rating + '
  'up to 10 approved reviews with first-initial-only attribution. NULL when '
  'the facility is not approved / suspended.';

COMMIT;
