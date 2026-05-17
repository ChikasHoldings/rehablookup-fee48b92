-- Schedule the addon-waitlist drain.
--
-- The round-10 trigger (notify_addon_waitlist_on_{featured,concierge}_free)
-- writes an admin_notification when a slot frees, but that requires admin
-- attention to convert into an invite. This cron job calls the new
-- drain-addon-waitlist edge function every 5 minutes to auto-send the
-- invite email + flip status to 'invited' without admin involvement.
--
-- Requirements:
--   - pg_cron + pg_net extensions enabled (already in
--     20251215064825_*.sql)
--   - app.settings.functions_url + app.settings.service_role_key
--     GUCs set at the DB level (already configured for the existing
--     send-renewal-reminders cron; the renewal_reminder_health_check
--     migration enforces this).
--
-- Idempotent: unschedule-then-schedule via DO block so the migration
-- can re-run on cron-already-exists.

BEGIN;

DO $$
BEGIN
  -- Drop any prior schedule with this name; tolerant of nonexistence.
  BEGIN
    PERFORM cron.unschedule('drain-addon-waitlist');
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
END
$$;

SELECT cron.schedule(
  'drain-addon-waitlist',
  '*/5 * * * *',
  $cron$
    SELECT extensions.http_post(
      url := current_setting('app.settings.functions_url') || '/drain-addon-waitlist',
      body := '{}'::text,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || coalesce(current_setting('app.settings.service_role_key', true), '')
      )::jsonb,
      timeout_milliseconds := 30000
    );
  $cron$
);

COMMIT;
