-- Security-advisor hardening: take trigger functions off the public RPC surface.
--
-- Functions that RETURN trigger are invoked by the trigger machinery (which
-- does NOT check EXECUTE privilege), so they never need to be callable by the
-- anon / authenticated roles via PostgREST /rest/v1/rpc/<name>. They were
-- EXECUTE-able only because CREATE FUNCTION grants EXECUTE to PUBLIC by default.
-- Revoking that grant clears the *_security_definer_function_executable
-- advisories for every trigger function without affecting trigger firing.
--
-- Scope is deliberately limited to trigger functions. The other SECURITY
-- DEFINER functions are intentional public RPCs (has_active_pro,
-- get_public_facility_data, get_embed_*, check_rate_limit, …) or RLS helpers
-- (facility_role, user_can_access_facility, user_can_edit_facility) that MUST
-- stay executable, and the public_* views are intentionally SECURITY DEFINER so
-- anon can read curated, paywall-masked projections without direct table grants
-- — converting those would break public access. Verified no app/edge code
-- calls any trigger function via .rpc().

DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prokind = 'f'
      AND p.prorettype = 'pg_catalog.trigger'::regtype
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon, authenticated', r.sig);
  END LOOP;
END $$;
