-- Schedules the seeker weekly digest cron (Gap G3 from the seeker
-- email-system audit).
--
-- Function: send-seeker-weekly-digest (Deno edge function, v1.0.0)
-- Schedule: Sundays 13:30 UTC = 08:30 ET / 05:30 PT — 30 min offset
--           from the provider digest (which fires 13:00 UTC) so the
--           two batches don't compete for Resend rate limit.
--
-- Eligibility (enforced inside the function):
--   notification_preferences.email_weekly_digest = true
--   AND seeker_profiles.deletion_scheduled_at IS NULL
--   AND email NOT IN suppressed_emails
--   AND seeker had non-zero activity in past 7d
--   (requests sent OR responses received OR saved facilities > 0)
--
-- Idempotency: Resend Idempotency-Key=`seeker-weekly-digest-${user_id}-${iso_week}`
-- so re-running the cron during the same ISO week never double-sends.
--
-- Calls via scheduled.call_edge_function so the service_role key from
-- vault.decrypted_secrets is used — matches the pattern of
-- process_seeker_drip and other seeker-side jobs.

SELECT cron.unschedule('send_seeker_weekly_digest')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'send_seeker_weekly_digest');

SELECT cron.schedule(
  'send_seeker_weekly_digest',
  '30 13 * * 0',
  $$ SELECT scheduled.call_edge_function('send-seeker-weekly-digest'); $$
);
