-- Hardened facility search for the provider sign-up wizard's Step 3
-- (Find or List).
--
-- Previous implementation: a raw ILIKE on facilities.name, no relevance
-- ranking, no multi-token support, no fuzzy matching, hard-capped at 8
-- results. With 3,800+ SAMHSA-sourced listings in the directory,
-- providers with hard-to-spell facility names or providers searching by
-- city ended up missing their listing and hitting "list new" instead —
-- creating duplicates.
--
-- New design:
--   1. IMMUTABLE wrapper around extensions.unaccent so it can be used in
--      functional indexes (the base unaccent is STABLE).
--   2. Trigram GIN indexes on lower(unaccent(name)) and
--      lower(unaccent(city)) — pg_trgm + unaccent are already enabled.
--   3. search_provider_facilities() RPC with composite scoring:
--        exact name match           +10000
--        name starts-with query     +5000
--        name contains query (sub)  +2000
--        each token in name         +500
--        each token in city         +200
--        each token in state        +100
--        trigram name similarity    +0..50  (continuous, tiebreaker)
--      Sanitizes the query (strip wildcards, control chars, lowercase,
--      unaccent), tokenizes on whitespace + punctuation, drops single-
--      char tokens, caps token count at 4. Returns up to 50 ranked
--      rows + a total_matches count so the UI can render
--      "showing N of M".
--   4. Approved + unsuspended gate matches the public_facilities view.
--   5. SECURITY DEFINER + EXECUTE granted to anon + authenticated so
--      anonymous wizard visitors can also search before signing up.

CREATE OR REPLACE FUNCTION public.immutable_unaccent(text)
RETURNS text
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
STRICT
AS $$ SELECT extensions.unaccent('extensions.unaccent', $1); $$;

CREATE INDEX IF NOT EXISTS idx_facilities_name_trgm
  ON public.facilities USING gin (lower(public.immutable_unaccent(name)) gin_trgm_ops)
  WHERE status = 'approved';

CREATE INDEX IF NOT EXISTS idx_facilities_city_trgm
  ON public.facilities USING gin (lower(public.immutable_unaccent(city)) gin_trgm_ops)
  WHERE status = 'approved';

CREATE OR REPLACE FUNCTION public.search_provider_facilities(
  p_query text,
  p_limit integer DEFAULT 20
)
RETURNS TABLE (
  id uuid,
  name text,
  slug text,
  city text,
  state text,
  logo_url text,
  is_claimed boolean,
  match_score integer,
  total_matches bigint
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
DECLARE
  v_clean text;
  v_lower text;
  v_tokens text[];
  v_total bigint;
  v_limit int := GREATEST(LEAST(COALESCE(p_limit, 20), 50), 1);
BEGIN
  -- Sanitize: strip wildcards + control chars, trim, length-cap, lowercase, unaccent.
  v_clean := regexp_replace(coalesce(p_query, ''), E'[%_\\x00-\\x1f\\n\\r]', '', 'g');
  v_clean := substring(btrim(v_clean) for 100);
  IF length(v_clean) < 2 THEN
    RETURN;
  END IF;
  v_lower := lower(public.immutable_unaccent(v_clean));

  -- Tokenize: split on whitespace + common punctuation; keep tokens >= 2 chars.
  v_tokens := ARRAY(
    SELECT t
    FROM unnest(regexp_split_to_array(v_lower, E'[\\s,/\\.-]+')) AS t
    WHERE length(t) >= 2
  );
  IF cardinality(v_tokens) = 0 THEN
    v_tokens := ARRAY[v_lower];
  END IF;
  IF cardinality(v_tokens) > 4 THEN
    v_tokens := v_tokens[1:4];
  END IF;

  -- Total match count — same predicate as the SELECT below so the
  -- "showing N of M" copy is consistent with the returned rows.
  SELECT COUNT(*) INTO v_total
  FROM public.facilities f
  WHERE f.status = 'approved'
    AND COALESCE(f.suspended, false) = false
    AND (
      lower(public.immutable_unaccent(f.name)) % v_lower
      OR lower(public.immutable_unaccent(f.name))  ILIKE '%' || v_lower || '%'
      OR lower(public.immutable_unaccent(f.city))  ILIKE '%' || v_lower || '%'
      OR lower(public.immutable_unaccent(f.state)) ILIKE '%' || v_lower || '%'
      OR EXISTS (
        SELECT 1 FROM unnest(v_tokens) AS tok
        WHERE lower(public.immutable_unaccent(f.name)) ILIKE '%' || tok || '%'
           OR lower(public.immutable_unaccent(f.city)) ILIKE '%' || tok || '%'
      )
    );

  RETURN QUERY
  SELECT
    f.id,
    f.name,
    f.slug,
    f.city,
    f.state,
    f.logo_url,
    (f.user_id IS NOT NULL AND f.claimed_at IS NOT NULL) AS is_claimed,
    (
        CASE WHEN lower(public.immutable_unaccent(f.name)) = v_lower THEN 10000 ELSE 0 END
      + CASE WHEN lower(public.immutable_unaccent(f.name)) LIKE v_lower || '%' THEN 5000 ELSE 0 END
      + CASE WHEN lower(public.immutable_unaccent(f.name)) ILIKE '%' || v_lower || '%' THEN 2000 ELSE 0 END
      + (
          SELECT COALESCE(SUM(
              CASE WHEN lower(public.immutable_unaccent(f.name)) ILIKE '%' || tok || '%' THEN 500 ELSE 0 END
            + CASE WHEN lower(public.immutable_unaccent(f.city)) ILIKE '%' || tok || '%' THEN 200 ELSE 0 END
            + CASE WHEN lower(public.immutable_unaccent(f.state)) ILIKE '%' || tok || '%' THEN 100 ELSE 0 END
          ), 0)
          FROM unnest(v_tokens) AS tok
        )::int
      + (similarity(lower(public.immutable_unaccent(f.name)), v_lower) * 50)::int
    ) AS match_score,
    v_total AS total_matches
  FROM public.facilities f
  WHERE f.status = 'approved'
    AND COALESCE(f.suspended, false) = false
    AND (
      lower(public.immutable_unaccent(f.name)) % v_lower
      OR lower(public.immutable_unaccent(f.name))  ILIKE '%' || v_lower || '%'
      OR lower(public.immutable_unaccent(f.city))  ILIKE '%' || v_lower || '%'
      OR lower(public.immutable_unaccent(f.state)) ILIKE '%' || v_lower || '%'
      OR EXISTS (
        SELECT 1 FROM unnest(v_tokens) AS tok
        WHERE lower(public.immutable_unaccent(f.name)) ILIKE '%' || tok || '%'
           OR lower(public.immutable_unaccent(f.city)) ILIKE '%' || tok || '%'
      )
    )
  ORDER BY match_score DESC, f.name ASC
  LIMIT v_limit;
END;
$$;

COMMENT ON FUNCTION public.search_provider_facilities(text, integer) IS
  'Hardened multi-token + fuzzy + ranked facility search for the provider wizard. Returns approved + unsuspended rows only. Public-safe (no PII columns).';

REVOKE ALL ON FUNCTION public.search_provider_facilities(text, integer) FROM public;
GRANT EXECUTE ON FUNCTION public.search_provider_facilities(text, integer) TO anon, authenticated;
