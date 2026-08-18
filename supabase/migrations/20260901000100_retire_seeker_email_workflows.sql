-- Retires the remaining seeker email workflows (directory cutover stage 3).
--
-- WHY
--   Stage 3 removes the consumer account product end to end: the panel, the
--   signup, the notification surface and the recurring email that fed them.
--   20260901000000 already unscheduled the weekly digest. This migration
--   unschedules the rest of the seeker-side jobs, and the edge functions they
--   called are deleted in the same commit.
--
--   Every one of these jobs emailed a legacy consumer about a surface that no
--   longer exists, linking /account/* URLs that are now 301s to
--   /search-results:
--
--     process_seeker_followup_reminders  daily 16:30 UTC  "have you heard
--       back?" nudges → /account/requests, opt-out toggle deleted with the
--       preferences page
--     process_seeker_drip                daily 16:15 UTC  welcome / tips /
--       account-reminder drip sequence → /account
--     send_saved_search_alerts           saved-search match alerts → the
--       /account/saved-searches manager, and saved searches can no longer be
--       created at all
--     send_new_facility_alerts           "new facilities in your state" →
--       /account/settings
--
--   Only the first is defined by a migration (20260707000000). The others
--   were scheduled outside version control — the 20260706/20260707 headers
--   reference `process_seeker_drip` running at 16:15 UTC, so at least that
--   one exists in the live cron table with no migration to show for it.
--   Unscheduling by name here brings them under version control and cleans
--   them up wherever they were created. Each call is EXISTS-guarded, so a job
--   that was never scheduled in a given environment is a silent no-op rather
--   than an error.
--
--   This matters beyond tidiness: the edge functions are deleted in this same
--   change, so any surviving schedule would fire hourly/daily against a
--   function that no longer exists.
--
-- WHAT THIS DOES NOT DO
--   • Does not drop or alter seeker_profiles, seeker_notifications,
--     saved_searches, notification_preferences or any other table. Stage 3
--     retires the product surface; the historical records stay.
--   • Does not touch send-seeker-emails, which survives because the provider
--     and admin inquiry panels still use it to tell someone who contacted a
--     facility that the facility replied — live directory product.
--   • Does not touch placement_monitor. That job belongs to the stage-1
--     concierge/placement retirement and still serves the admin concierge
--     portal (SLA alerts); its seeker-reminder half wants a decision of its
--     own rather than being swept up here.
--   • Does not touch any provider or admin job:
--     send_provider_weekly_digest, run_re_verification_sweep and
--     plan_grace_enforcement are all unaffected.
--
-- REVERSIBILITY
--   Re-scheduling is a one-line cron.schedule per job, but the edge functions
--   are deleted alongside this migration — restoring a schedule means
--   restoring the function from git first.

SELECT cron.unschedule('process_seeker_followup_reminders')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'process_seeker_followup_reminders');

SELECT cron.unschedule('process_seeker_drip')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'process_seeker_drip');

SELECT cron.unschedule('send_saved_search_alerts')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'send_saved_search_alerts');

SELECT cron.unschedule('send_new_facility_alerts')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'send_new_facility_alerts');
