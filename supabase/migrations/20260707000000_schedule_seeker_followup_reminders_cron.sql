-- Schedules the seeker followup-reminder daily cron (Gap G6 from the
-- seeker email-system audit).
--
-- Function: process-seeker-followup-reminders v1.0.0
-- Schedule: 30 16 * * * (daily 16:30 UTC = 11:30 ET / 08:30 PT)
--           15-min offset from process_seeker_drip (16:15 UTC) so the
--           two seeker-side daily jobs don't compete for resources.
--
-- Eligibility (enforced inside the function):
--   leads.provider_responded_at IS NULL
--   AND leads.created_at < now() - 3 days
--   AND leads.created_at > now() - 30 days
--   AND email_tracking_events has no prior 'sent' for
--       seeker-request_followup-${lead.id}
--
-- Idempotency: send-seeker-emails keys the request_followup send by
-- leadId, so even if the cron lists a lead repeatedly, only one
-- email per lead ever lands.
--
-- Calls via scheduled.call_edge_function so the service_role key from
-- vault.decrypted_secrets is used — matches the pattern of
-- process_seeker_drip + send_seeker_weekly_digest.

SELECT cron.unschedule('process_seeker_followup_reminders')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'process_seeker_followup_reminders');

SELECT cron.schedule(
  'process_seeker_followup_reminders',
  '30 16 * * *',
  $$ SELECT scheduled.call_edge_function('process-seeker-followup-reminders'); $$
);
