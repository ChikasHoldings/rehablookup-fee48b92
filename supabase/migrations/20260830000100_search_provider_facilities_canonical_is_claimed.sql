-- =============================================================================
-- Align search_provider_facilities.is_claimed with the canonical definition.
--
-- FINDING (provider claim funnel QA, pre-ad-launch)
--   The wizard search returned
--     (f.user_id IS NOT NULL AND f.claimed_at IS NOT NULL) AS is_claimed
--   but claimed_at is written ONLY by the claim-approval trigger. A facility a
--   provider CREATED through the listing flow has user_id set and claimed_at
--   NULL, so search reported is_claimed = false.
--
--   Every other layer already treats ownership alone as claimed:
--     public_facilities view      → user_id IS NOT NULL AS is_claimed
--     submit-facility-claim       → if (facility.user_id) → FACILITY_ALREADY_CLAIMED
--                                   (tightened by the 2026-07-03 audit, gap G1 —
--                                   this function was not updated to match)
--
--   Consequence: an approved provider-created listing looks claimable in
--   FindOrListStep. The row renders enabled, handleSelectExisting's
--   `candidate?.is_claimed` guard passes, and the wizard advances to
--   current_step='build' with mode='claim'. ClaimWizard then reads the facility
--   through public_facilities — where is_claimed IS true — and renders the
--   terminal "This facility is already claimed" card.
--
--   That card's only action is a link back to /provider/onboarding, which
--   re-resolves to the same stored selection and renders the same dead card:
--   the provider is stuck in a loop with no way to pick a different facility.
--
-- FIX
--   Return the canonical `f.user_id IS NOT NULL`, so an owned listing is
--   correctly rendered as "Already claimed" (disabled) in the result list and
--   the user never advances into the dead-end.
--
--   Only the is_claimed expression changes; predicates, ranking, sanitization,
--   grants and the output signature are byte-for-byte the same as
--   20260517040000_harden_provider_facility_search.sql.
--
-- ROLLBACK: restore the function body from
--           20260517040000_harden_provider_facility_search.sql
-- =============================================================================

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
    -- Canonical: ownership alone means claimed. claimed_at is only ever set by
    -- the claim-approval trigger, so requiring it here mislabelled every
    -- provider-created listing as claimable.
    (f.user_id IS NOT NULL) AS is_claimed,
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
  'Hardened multi-token + fuzzy + ranked facility search for the provider wizard. Returns approved + unsuspended rows only. Public-safe (no PII columns). is_claimed = user_id IS NOT NULL, matching public_facilities and submit-facility-claim.';

REVOKE ALL ON FUNCTION public.search_provider_facilities(text, integer) FROM public;
GRANT EXECUTE ON FUNCTION public.search_provider_facilities(text, integer) TO anon, authenticated;
