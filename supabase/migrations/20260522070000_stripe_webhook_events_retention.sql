-- Stripe webhook events retention: 30 days.
--
-- stripe_webhook_events is the dedup ledger that prevents Stripe retry
-- storms from re-running downstream side effects (notifications, emails,
-- subscription mutations). Each event_id is UNIQUE so replays return
-- duplicate:true and exit early — the rows themselves are not source-of-
-- truth for any business state.
--
-- After 30 days a row has no operational value:
--   - Stripe's webhook retry window is ~3 days; anything older than that
--     can never be re-delivered.
--   - The downstream financial state (facility_subscriptions, etc.)
--     remains untouched by this cleanup.
--
-- The function deletes in batches via WHERE received_at and is scheduled
-- daily at 03:17 UTC via pg_cron so cleanup runs during low-traffic hours.

CREATE OR REPLACE FUNCTION public.cleanup_old_stripe_webhook_events()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_deleted int;
BEGIN
  DELETE FROM public.stripe_webhook_events
  WHERE received_at < now() - interval '30 days';
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN jsonb_build_object(
    'ok', true,
    'deleted', v_deleted,
    'cutoff', (now() - interval '30 days')
  );
END;
$$;

-- Cron + service roles only — this function should never be reachable via
-- PostgREST. Mirrors the pattern from 20260522052200_revoke_public_execute_
-- security_definer.sql (CRON-ONLY bucket).
REVOKE EXECUTE ON FUNCTION public.cleanup_old_stripe_webhook_events() FROM PUBLIC;

-- Schedule: 03:17 UTC daily. The odd minute spreads cron contention
-- across the existing schedule (the renewal-reminder cron runs at :00).
-- If a previous schedule with this name exists (re-run of this
-- migration in a non-trivially diff scenario), unschedule it first so
-- we don't end up with two copies.
DO $$
BEGIN
  PERFORM cron.unschedule(jobid)
  FROM cron.job
  WHERE jobname = 'cleanup-stripe-webhook-events';
EXCEPTION WHEN OTHERS THEN
  -- pg_cron not installed or no prior schedule — fine, continue.
  NULL;
END $$;

SELECT cron.schedule(
  'cleanup-stripe-webhook-events',
  '17 3 * * *',
  $$SELECT public.cleanup_old_stripe_webhook_events();$$
);
