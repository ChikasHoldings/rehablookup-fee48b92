-- Pre-launch audit cleanup.
--
-- Two issues surfaced by Supabase advisors (security + performance
-- lints, 2026-05-23):
--
-- 1. cleanup_old_stripe_webhook_events is a SECURITY DEFINER
--    maintenance function with EXECUTE granted to `anon` and
--    `authenticated`. Anyone could call it via /rest/v1/rpc/... to
--    delete old webhook event rows. Not a privacy bug (the rows are
--    internal cleanup candidates already past retention), but it is
--    an attack surface that doesn't need to exist — the function is
--    only meant to run from the scheduled cron job (service_role).
--    Revoke EXECUTE from anon + authenticated.
--
-- 2. facility_claim_requests has two IDENTICAL unique partial
--    indexes over (facility_id, claimant_user_id) WHERE status IN
--    ('pending', 'under_review'):
--      - idx_claim_requests_unique_pending
--      - facility_claim_requests_active_unique
--    Both were created by separate migrations (20260717000000 was
--    likely a rename attempt that left both indexes in place). One
--    must be dropped or every INSERT/UPDATE on the table writes
--    both indexes for no benefit.
--
-- Idempotent: REVOKE is a no-op if already revoked; DROP INDEX uses
-- IF EXISTS.

BEGIN;

-- 1) Revoke anon / authenticated EXECUTE on the maintenance function.
REVOKE EXECUTE ON FUNCTION public.cleanup_old_stripe_webhook_events()
  FROM anon, authenticated;

COMMENT ON FUNCTION public.cleanup_old_stripe_webhook_events() IS
  'Internal maintenance: deletes stripe_webhook_events rows past '
  'retention. EXECUTE is reserved for service_role only (called by '
  'the scheduled cleanup cron). Revoked from anon + authenticated '
  '2026-05-23 — pre-launch advisor cleanup.';

-- 2) Drop the redundant duplicate index. Keep the canonical
--    facility_claim_requests_active_unique (created by migration
--    20260717000000 as the explicit unique constraint) and drop
--    the earlier idx_claim_requests_unique_pending.
DROP INDEX IF EXISTS public.idx_claim_requests_unique_pending;

COMMIT;
