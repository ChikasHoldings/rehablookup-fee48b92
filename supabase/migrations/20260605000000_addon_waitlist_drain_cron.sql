-- Schedule the addon-waitlist drain.
--
-- The round-10 trigger (notify_addon_waitlist_on_{featured,concierge}_free)
-- writes an admin_notification when a slot frees, but that requires admin
-- attention to convert into an invite. This cron job calls the
-- drain-addon-waitlist edge function every 5 minutes to auto-send the
-- invite email + flip status to 'invited' without admin involvement.
--
-- Secrets are read from supabase_vault (not GUCs) because ALTER DATABASE
-- ... SET app.settings.* requires postgres superuser, which the platform
-- doesn't expose. The two Vault secrets used:
--   functions_url       — base URL like https://<proj>.supabase.co/functions/v1
--   service_role_key    — bearer the cron-only edge fns gate on
--
-- Idempotent: unschedule-then-schedule via DO block.

BEGIN;

DO $$
BEGIN
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
      url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'functions_url' LIMIT 1) || '/drain-addon-waitlist',
      body := '{}'::text,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key' LIMIT 1)
      )::jsonb,
      timeout_milliseconds := 30000
    );
  $cron$
);

COMMIT;
