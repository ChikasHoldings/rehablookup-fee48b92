-- =============================================================================
-- Server-gate two advertised Pro features that were only locked in the UI.
--
-- 1. Embed widgets (badge / reviews / gallery RPCs): the Marketing Hub locks
--    these behind Pro (MarketingHub.tsx `locked={!isPro}`, EmbedBadge.tsx),
--    but the anon-callable data RPCs served ANY approved facility, so a Free
--    provider could embed the widgets by copying the snippet URL. The badge
--    payload also violated the verified-masking rule from 20260819000000
--    ("publicly a facility reads as verified only when verified AND on an
--    active Pro subscription") because it keyed on raw facilities.verified.
--    All three RPCs now return NULL unless has_active_pro(facility).
--
-- 2. Review responses: ForProviders.tsx advertises "Respond to reviews" as
--    Pro-only, but review_responses had only ownership RLS — no plan gate at
--    any layer. validate_review_response() now requires an active Pro
--    subscription for non-admin INSERTs. UPDATEs to an existing response stay
--    allowed (editing what was legitimately posted before a downgrade).
-- =============================================================================

-- ─── 1a. get_embed_badge: require active Pro ────────────────────────────────
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
    AND has_active_pro(f.id) -- embed widgets are a Pro feature; also enforces
                             -- the public verified-badge masking rule
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

COMMENT ON FUNCTION public.get_embed_badge(uuid) IS
  'Returns a public-safe payload for the verified-badge widget, or NULL when '
  'the facility is not approved / suspended / unverified / not on an active '
  'Pro subscription. Anon-callable (SECURITY DEFINER) so the static widget '
  'HTML can read it without a JWT.';

-- ─── 1b. get_embed_reviews: require active Pro ──────────────────────────────
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
    AND has_active_pro(f.id) -- embed widgets are a Pro feature
  LIMIT 1;

  IF v_facility.id IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT
    ROUND(AVG(rating)::numeric, 2),
    COUNT(*)
  INTO v_avg, v_count
  FROM public.facility_reviews
  WHERE facility_id = p_facility_id
    AND status = 'approved';

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

COMMENT ON FUNCTION public.get_embed_reviews(uuid, int) IS
  'Returns a public-safe payload for the reviews widget: aggregate rating + '
  'up to 10 approved reviews with first-initial-only attribution. NULL when '
  'the facility is not approved / suspended / not on an active Pro '
  'subscription.';

-- ─── 1c. get_embed_gallery: require active Pro ──────────────────────────────
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
    AND has_active_pro(f.id) -- embed widgets are a Pro feature
  LIMIT 1;

  IF v_row.id IS NULL THEN
    RETURN NULL;
  END IF;

  v_is_pro := has_active_pro(v_row.id);
  v_cap := CASE WHEN v_is_pro THEN 10 ELSE 5 END;

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

COMMENT ON FUNCTION public.get_embed_gallery(uuid) IS
  'Returns a public-safe gallery payload (up to 10 photos) for facilities on '
  'an active Pro subscription; NULL otherwise. Anon-callable.';

-- ─── 2. Review responses require active Pro (non-admin INSERT) ──────────────
CREATE OR REPLACE FUNCTION public.validate_review_response()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
BEGIN
  -- The response's review_id MUST belong to the facility the responder owns
  -- (facility_id is already ownership-checked by RLS). Without this, a provider
  -- could attach a public response to another facility's review, or squat the
  -- UNIQUE(review_id) slot to block the legitimate facility from responding.
  IF NOT EXISTS (
    SELECT 1 FROM public.facility_reviews fr
    WHERE fr.id = NEW.review_id AND fr.facility_id = NEW.facility_id
  ) THEN
    RAISE EXCEPTION 'Review % does not belong to facility %', NEW.review_id, NEW.facility_id
      USING ERRCODE = 'check_violation';
  END IF;

  -- "Respond to reviews" is an advertised Pro feature (ForProviders
  -- comparison table). Gate new responses on an active Pro subscription for
  -- non-admin, non-service writers. Editing an existing response after a
  -- downgrade stays allowed.
  IF TG_OP = 'INSERT'
     AND (SELECT auth.uid()) IS NOT NULL
     AND current_setting('role', true) <> 'service_role'
     AND auth.role() <> 'service_role'
     AND NOT public.has_role((SELECT auth.uid()), 'admin'::app_role)
     AND NOT public.has_active_pro(NEW.facility_id) THEN
    RAISE EXCEPTION
      'Responding to reviews requires an active Pro subscription.'
      USING ERRCODE = 'check_violation';
  END IF;

  -- Strip HTML/script and enforce non-empty + length (parity with
  -- validate_review_data; review_responses previously had no validation).
  IF NEW.response_text IS NOT NULL THEN
    NEW.response_text := regexp_replace(NEW.response_text, '<[^>]*>', '', 'g');
    NEW.response_text := regexp_replace(NEW.response_text, 'javascript:', '', 'gi');
    NEW.response_text := regexp_replace(NEW.response_text, 'data:', '', 'gi');
    NEW.response_text := btrim(NEW.response_text);
  END IF;
  IF NEW.response_text IS NULL OR NEW.response_text = '' THEN
    RAISE EXCEPTION 'Response text is required';
  END IF;
  IF length(NEW.response_text) > 1000 THEN
    RAISE EXCEPTION 'Response text must be 1000 characters or less';
  END IF;

  RETURN NEW;
END;
$$;
