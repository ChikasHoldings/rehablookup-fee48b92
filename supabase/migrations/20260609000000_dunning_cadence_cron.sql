-- Schedule the dunning sweep. Runs daily at 10am UTC so all three
-- milestone bands (day_1, day_3, day_7) fire on a predictable cadence
-- and providers don't get emails at 3am local. The cron edge function
-- itself is idempotent — re-running it multiple times in a day is a
-- no-op because dunning_milestones_sent tracks which tokens have
-- already fired in the current past_due cycle.
--
-- Staged for normal deploy (not applied to live DB yet) — the send-
-- dunning-emails function must deploy first to avoid HTTP 404 noise
-- on the cron's first tick.

BEGIN;

DO $$
BEGIN
  BEGIN
    PERFORM cron.unschedule('send-dunning-emails');
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
END
$$;

SELECT cron.schedule(
  'send-dunning-emails',
  '0 10 * * *',
  $cron$
    SELECT extensions.http_post(
      url := current_setting('app.settings.functions_url') || '/send-dunning-emails',
      body := '{}'::text,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || coalesce(current_setting('app.settings.service_role_key', true), '')
      )::jsonb,
      timeout_milliseconds := 60000
    );
  $cron$
);

COMMIT;
