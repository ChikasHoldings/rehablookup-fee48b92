-- Schedules the placement-monitor cron — the non-destructive watchdog for
-- concierge placement cases.
--
-- Function: placement-monitor v1.0.0
-- Schedule: 25 * * * * (hourly at :25 UTC)
--           Unique minute offset so it doesn't compete with the other
--           scheduled jobs (:00 / :15 / :17 / :30 / :45).
--
-- Background:
--   The legacy `placement-cron` bundled five responsibilities but was never
--   scheduled, so all five were dead. Rather than schedule the monolith
--   (which would double-run auto-decline and enable destructive auto-close),
--   its two NOTIFY-ONLY slices were extracted into `placement-monitor`:
--     1. SLA monitoring   — alert admins when a case stalls >48h
--     2. Seeker reminders — nudge seekers sitting on ready options >48h
--
--   Deliberately NOT migrated here (and so still not automated):
--     - auto-decline of stale introductions → already handled by the
--       separately-scheduled `auto-decline-stale-introductions`
--     - auto-introduction retry → status mutation; left to intake-time
--       auto-intro + manual admin sending
--     - 14-day stale-case auto-close → closes real seeker cases; a product
--       decision, intentionally left un-automated
--
-- Idempotency:
--   - SLA alerts dedup on a 12h window (no spam) and key the email by
--     admin+date.
--   - Seeker reminders set seeker_reminder_sent_at so each case is nudged
--     once, and the email is keyed seeker-reminder-${inquiryId}.
--
-- Calls via scheduled.call_edge_function so the service_role key from
-- vault.decrypted_secrets is used — matches the pattern of the other
-- concierge crons (auto_decline_stale_introductions, process_lead_redistribution).

SELECT cron.unschedule('placement_monitor')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'placement_monitor');

SELECT cron.schedule(
  'placement_monitor',
  '25 * * * *',
  $$ SELECT scheduled.call_edge_function('placement-monitor'); $$
);
