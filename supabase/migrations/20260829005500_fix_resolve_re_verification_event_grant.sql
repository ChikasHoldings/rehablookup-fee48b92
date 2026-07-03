-- =============================================================================
-- Fix: restore EXECUTE for `authenticated` on resolve_re_verification_event().
--
-- BUG: migration 20260829000000_revoke_anon_execute_on_state_mutating_secdef_rpcs
-- placed resolve_re_verification_event in "bucket_a" (internal-only), whose loop
-- runs `revoke execute ... from public, anon, authenticated`. But this function
-- is NOT internal — the admin Re-verification Queue calls it from the client via
-- `supabase.rpc("resolve_re_verification_event", ...)`
-- (src/pages/admin/AdminReVerificationQueue.tsx). With `authenticated` revoked,
-- every admin resolve (Remediate / Suspend / Noop / Superseded) failed with
-- "permission denied for function resolve_re_verification_event".
--
-- It belongs in that migration's "bucket_b" (signed-in admin action): the
-- function is SECURITY DEFINER and self-guards on
-- has_role(auth.uid(), 'admin') (raising ERRCODE 42501 for non-admins), so
-- granting EXECUTE to `authenticated` is safe. `anon`/`PUBLIC` stay revoked —
-- this only restores the signed-in path, exactly the rollback that migration
-- documented ("GRANT EXECUTE ON FUNCTION <sig> TO authenticated; rolls back").
--
-- ROLLBACK: REVOKE EXECUTE ON FUNCTION
--   public.resolve_re_verification_event(uuid, text, text) FROM authenticated;
-- =============================================================================

REVOKE EXECUTE ON FUNCTION public.resolve_re_verification_event(uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.resolve_re_verification_event(uuid, text, text) TO authenticated;
