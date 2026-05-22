-- =============================================================================
-- Regression tests: SECURITY INVOKER views
-- =============================================================================
--
-- Run against the Supabase branch after applying
-- 20260522042311_recreate_views_as_security_invoker.sql.
--
-- These are pgTAP-style tests. Each block uses SET LOCAL ROLE and RESET ROLE
-- to impersonate a caller role and asserts what that caller may (and may not)
-- see. The tests are intentionally conservative — they assert on column
-- presence and row count direction, not on specific row values, so they do
-- not depend on seed data.
--
-- Usage:
--   psql $BRANCH_DB_URL -f supabase/tests/security_invoker_views.test.sql
-- =============================================================================

BEGIN;

-- ──────────────────────────────────────────────────────────────────────────────
-- Helpers
-- ──────────────────────────────────────────────────────────────────────────────

CREATE TEMP TABLE test_results (
  test_name  text NOT NULL,
  passed     boolean NOT NULL,
  detail     text
);

CREATE OR REPLACE FUNCTION temp.assert(
  p_test  text,
  p_ok    boolean,
  p_detail text DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO test_results VALUES (p_test, p_ok, p_detail);
  IF NOT p_ok THEN
    RAISE WARNING 'FAIL: % — %', p_test, p_detail;
  END IF;
END;
$$;

-- ──────────────────────────────────────────────────────────────────────────────
-- T1. View reloptions confirm security_invoker = on
-- ──────────────────────────────────────────────────────────────────────────────

DO $$
DECLARE
  v_opts text[];
BEGIN
  SELECT reloptions INTO v_opts
  FROM pg_class
  WHERE relname = 'public_facilities' AND relkind = 'v';

  PERFORM temp.assert(
    'T1a: public_facilities has security_invoker reloption',
    v_opts && ARRAY['security_invoker=on'],
    format('reloptions = %s', v_opts)
  );

  SELECT reloptions INTO v_opts
  FROM pg_class
  WHERE relname = 'leads_provider_view' AND relkind = 'v';

  PERFORM temp.assert(
    'T1b: leads_provider_view has security_invoker reloption',
    v_opts && ARRAY['security_invoker=on'],
    format('reloptions = %s', v_opts)
  );
END;
$$;

-- ──────────────────────────────────────────────────────────────────────────────
-- T2. anon can query public_facilities without error
--     (asserts SELECT permission; row count ≥ 0 is always true but a
--      permission error would raise an exception and fail the block)
-- ──────────────────────────────────────────────────────────────────────────────

DO $$
DECLARE
  v_count bigint;
BEGIN
  SET LOCAL ROLE anon;

  BEGIN
    SELECT count(*) INTO v_count FROM public.public_facilities;
    PERFORM temp.assert(
      'T2a: anon can SELECT from public_facilities',
      true,
      format('row_count = %s', v_count)
    );
  EXCEPTION WHEN OTHERS THEN
    PERFORM temp.assert(
      'T2a: anon can SELECT from public_facilities',
      false,
      SQLERRM
    );
  END;

  RESET ROLE;
END;
$$;

-- ──────────────────────────────────────────────────────────────────────────────
-- T3. anon sees only approved / non-suspended rows
-- ──────────────────────────────────────────────────────────────────────────────

DO $$
DECLARE
  v_bad_rows bigint;
BEGIN
  SET LOCAL ROLE anon;

  SELECT count(*) INTO v_bad_rows
  FROM public.public_facilities
  WHERE status != 'approved' OR COALESCE(suspended, false) = true;

  PERFORM temp.assert(
    'T3: anon sees only approved non-suspended facilities',
    v_bad_rows = 0,
    format('rows with status!=approved or suspended=true: %s', v_bad_rows)
  );

  RESET ROLE;
END;
$$;

-- ──────────────────────────────────────────────────────────────────────────────
-- T4. anon cannot access leads_provider_view
--     (no grants to anon on that view)
-- ──────────────────────────────────────────────────────────────────────────────

DO $$
BEGIN
  SET LOCAL ROLE anon;

  BEGIN
    PERFORM 1 FROM public.leads_provider_view LIMIT 1;
    -- If we get here the grant check failed
    PERFORM temp.assert(
      'T4: anon is denied access to leads_provider_view',
      false,
      'Expected permission denied but SELECT succeeded'
    );
  EXCEPTION
    WHEN insufficient_privilege THEN
      PERFORM temp.assert(
        'T4: anon is denied access to leads_provider_view',
        true,
        'correctly got insufficient_privilege'
      );
    WHEN OTHERS THEN
      PERFORM temp.assert(
        'T4: anon is denied access to leads_provider_view',
        false,
        SQLERRM
      );
  END;

  RESET ROLE;
END;
$$;

-- ──────────────────────────────────────────────────────────────────────────────
-- T5. Column set of public_facilities includes expected public columns
--     and excludes admin-only columns
-- ──────────────────────────────────────────────────────────────────────────────

DO $$
DECLARE
  v_cols text[];
BEGIN
  SELECT array_agg(column_name::text ORDER BY ordinal_position)
  INTO v_cols
  FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'public_facilities';

  -- Must have
  PERFORM temp.assert(
    'T5a: public_facilities exposes id',
    'id' = ANY(v_cols), NULL
  );
  PERFORM temp.assert(
    'T5b: public_facilities exposes is_pro',
    'is_pro' = ANY(v_cols), NULL
  );
  PERFORM temp.assert(
    'T5c: public_facilities exposes is_claimed',
    'is_claimed' = ANY(v_cols), NULL
  );

  -- Must NOT have (admin-internal columns)
  PERFORM temp.assert(
    'T5d: public_facilities does not expose admin_notes',
    NOT ('admin_notes' = ANY(v_cols)), NULL
  );
  PERFORM temp.assert(
    'T5e: public_facilities does not expose concierge_notes',
    NOT ('concierge_notes' = ANY(v_cols)), NULL
  );
  PERFORM temp.assert(
    'T5f: public_facilities does not expose user_id',
    NOT ('user_id' = ANY(v_cols)), NULL
  );
END;
$$;

-- ──────────────────────────────────────────────────────────────────────────────
-- T6. leads_provider_view column set contains expected columns
-- ──────────────────────────────────────────────────────────────────────────────

DO $$
DECLARE
  v_cols text[];
BEGIN
  SELECT array_agg(column_name::text)
  INTO v_cols
  FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'leads_provider_view';

  PERFORM temp.assert(
    'T6a: leads_provider_view has id',
    'id' = ANY(v_cols), NULL
  );
  PERFORM temp.assert(
    'T6b: leads_provider_view has facility_id',
    'facility_id' = ANY(v_cols), NULL
  );
  PERFORM temp.assert(
    'T6c: leads_provider_view does not expose lead_score (vestigial column removed)',
    NOT ('lead_score' = ANY(v_cols)), NULL
  );
  PERFORM temp.assert(
    'T6d: leads_provider_view does not expose is_unlocked (vestigial column removed)',
    NOT ('is_unlocked' = ANY(v_cols)), NULL
  );
END;
$$;

-- ──────────────────────────────────────────────────────────────────────────────
-- Results
-- ──────────────────────────────────────────────────────────────────────────────

SELECT
  test_name,
  CASE WHEN passed THEN 'PASS' ELSE 'FAIL' END AS result,
  detail
FROM test_results
ORDER BY test_name;

DO $$
DECLARE
  v_failures int;
BEGIN
  SELECT count(*) INTO v_failures FROM test_results WHERE NOT passed;
  IF v_failures > 0 THEN
    RAISE EXCEPTION '% test(s) failed — see results above', v_failures;
  ELSE
    RAISE NOTICE 'All % tests passed.', (SELECT count(*) FROM test_results);
  END IF;
END;
$$;

ROLLBACK; -- never persist test scaffolding
