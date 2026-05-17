-- Schedule the dunning sweep. Daily at 10am UTC so milestones fire on
-- predictable working-hour cadence.
--
-- Reads functions_url + service_role_key from supabase_vault (see the
-- 20260605000000 cron migration for the rationale — GUCs require
-- superuser; Vault does not).

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
      url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'functions_url' LIMIT 1) || '/send-dunning-emails',
      body := '{}'::text,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key' LIMIT 1)
      )::jsonb,
      timeout_milliseconds := 60000
    );
  $cron$
);

COMMIT;
