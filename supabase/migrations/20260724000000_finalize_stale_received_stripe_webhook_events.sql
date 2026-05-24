-- Webhook audit-trail hygiene: finalize stale 'received' events.
--
-- The stripe-webhook handler atomically claims each event into
-- stripe_webhook_events with `status = 'received'` (via
-- claim_stripe_webhook_event), then runs the side-effects, then
-- returns 200 to Stripe. It never updates the row's status afterward,
-- so events that the handler chose to ignore (e.g. checkout.session.
-- expired, irrelevant invoice types) sit at 'received' forever and
-- look identical in the audit trail to a row where the handler
-- crashed mid-processing.
--
-- Backend audit on 2026-05-24 found 5 such rows lingering from
-- abandoned checkout sessions. Pre-launch they're harmless, but
-- post-launch the table will accumulate noise and any real
-- crash-mid-processing event becomes a needle in a growing haystack.
--
-- This migration:
--   1) Backfills the existing stuck rows. Any row at 'received'
--      with no error_message and received_at older than 1 hour
--      flips to 'processed' (the webhook would have completed well
--      within that window if it was going to). Crashed rows would
--      normally carry an error_message; we preserve those.
--   2) Extends the existing nightly cleanup function (already
--      scheduled by pg_cron job 'cleanup-stripe-webhook-events' at
--      03:17 UTC) so future stuck 'received' rows get finalized the
--      same way without ops intervention. The function continues to
--      drop rows older than 30 days as before.
--
-- Idempotent: filters on status='received' + age threshold so
-- re-running is a no-op once the rows have flipped.

BEGIN;

-- 1) Backfill the existing stuck rows.
UPDATE public.stripe_webhook_events
SET status = 'processed',
    processed_at = COALESCE(processed_at, now())
WHERE status = 'received'
  AND error_message IS NULL
  AND received_at < now() - interval '1 hour';

-- 2) Extend the nightly cleanup function with the same finalize step
--    so the table stays clean automatically going forward. The DELETE
--    branch is unchanged; we ADD the finalize-stale-received step
--    before it so a stuck-then-aged-out row gets finalized exactly
--    once on its way to deletion.
CREATE OR REPLACE FUNCTION public.cleanup_old_stripe_webhook_events()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_deleted   int;
  v_finalized int;
BEGIN
  -- Finalize any stale 'received' rows the webhook handler implicitly
  -- ignored (event types we don't act on: checkout.session.expired,
  -- retired international invoice events, etc.). 1-hour threshold is
  -- well past Stripe's own retry window; anything older was either
  -- ignored or genuinely crashed (in which case it'd have an
  -- error_message we preserve here).
  UPDATE public.stripe_webhook_events
  SET status = 'processed',
      processed_at = COALESCE(processed_at, now())
  WHERE status = 'received'
    AND error_message IS NULL
    AND received_at < now() - interval '1 hour';
  GET DIAGNOSTICS v_finalized = ROW_COUNT;

  -- Drop rows past the retention window. Audit-trail value drops off
  -- a cliff after a month; the dispute and chargeback windows are
  -- well inside 30 days.
  DELETE FROM public.stripe_webhook_events
  WHERE received_at < now() - interval '30 days';
  GET DIAGNOSTICS v_deleted = ROW_COUNT;

  RETURN jsonb_build_object(
    'ok', true,
    'finalized_stuck_received', v_finalized,
    'deleted', v_deleted,
    'cutoff', (now() - interval '30 days')
  );
END;
$function$;

COMMENT ON FUNCTION public.cleanup_old_stripe_webhook_events() IS
  'Nightly housekeeping for stripe_webhook_events. (1) Finalizes '
  'stale `received` rows the handler implicitly ignored (older than '
  '1h, no error_message) so the audit trail stays clean. (2) Drops '
  'rows older than 30 days past the retention window. Scheduled by '
  'pg_cron job ''cleanup-stripe-webhook-events'' at 03:17 UTC daily. '
  'EXECUTE reserved to service_role + postgres (revoked from anon + '
  'authenticated 2026-05-23 — see migration 20260722000000).';

COMMIT;
