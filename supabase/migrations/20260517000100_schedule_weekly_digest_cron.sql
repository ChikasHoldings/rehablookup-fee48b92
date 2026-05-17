-- Schedules the weekly provider digest cron.
--
-- Function: send-provider-weekly-digest (Deno edge function, v1.0.0)
-- Schedule: Sundays 13:00 UTC = 08:00 ET / 05:00 PT — same early-morning
--           Sunday window used for send_admin_daily_summary (job runs at
--           '0 13 * * *') so providers see weekly stats before Monday.
--
-- Eligibility (enforced inside the function):
--   notification_preferences.email_weekly_digest = true
--   AND profiles.unsubscribed_provider_emails_at IS NULL
--   AND profiles.email IS NOT NULL
--
-- Idempotency: Resend Idempotency-Key=`weekly-digest-${user_id}-${iso_week}`
-- so re-running the cron during the same ISO week never double-sends.
--
-- Added 2026-05-17 (round 18: notifications audit).

SELECT cron.unschedule('send_provider_weekly_digest')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'send_provider_weekly_digest');

SELECT cron.schedule(
  'send_provider_weekly_digest',
  '0 13 * * 0',
  $$
    SELECT net.http_post(
      url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'functions_url') || '/send-provider-weekly-digest',
      body := jsonb_build_object(),
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key')
      ),
      timeout_milliseconds := 60000
    );
  $$
);
