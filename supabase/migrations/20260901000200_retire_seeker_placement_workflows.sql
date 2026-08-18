-- Completes the seeker workflow retirement (directory cutover stage 3).
--
-- 20260901000000 stopped the weekly digest; 20260901000100 stopped the drip,
-- follow-up reminders, saved-search alerts and new-facility alerts. A sweep of
-- the LIVE cron.job table found the retirement was still incomplete: the
-- concierge/placement product retired in stage 1 left three hourly jobs
-- running, and one seeker job points at an edge function that does not exist
-- in this repository at all.
--
-- Production state when this migration was written (select * from cron.job):
--
--   jobid 47  send-placement-review-requests    17 * * * *   active
--   jobid 46  placement_monitor                 25 * * * *   active
--   jobid 25  auto_decline_stale_introductions  15 * * * *   active
--   jobid 26  purge_deleted_seekers             30 4 * * *   active
--
-- WHY EACH ONE GOES
--
--   send-placement-review-requests — emails the SEEKER a review link after a
--     concierge placement settles. RehabLookup no longer runs placements, and
--     the seeker surface that link addressed is gone.
--
--   placement_monitor — half admin SLA alerts on concierge cases, half
--     "nudge seekers sitting on ready options >48h". The seeker half has no
--     recipient surface left. The admin half watches a product that is no
--     longer sold, over a single legacy concierge_inquiries row. Both halves
--     are retired product; the job is stopped whole rather than split.
--
--   auto_decline_stale_introductions — mutates concierge_introductions for a
--     funnel that no longer accepts new cases.
--
--   purge_deleted_seekers — calls edge function `purge-deleted-seekers`,
--     which has NEVER existed in this repository's git history and is not in
--     supabase/config.toml. The schedule has been firing daily against a
--     function that cannot resolve. Unscheduling removes a job that was
--     already non-functional; it does not remove a working capability.
--     IMPORTANT: if automated purge of deletion-scheduled seekers is wanted
--     later, BOTH the edge function and this schedule must be recreated.
--     At the time of writing seeker_profiles has 0 rows and 0 rows pending
--     deletion, so nothing is queued.
--
-- BLAST RADIUS — measured, not assumed. At the time of writing:
--     saved_searches         0 rows
--     seeker_profiles        0 rows   (0 pending deletion)
--     seeker_notifications   0 rows
--     concierge_inquiries    1 row
--   No live recipient exists for any of these jobs.
--
-- WHAT THIS DOES NOT DO
--   • Drops no table, row or column. The historical records — such as they
--     are — stay exactly where they are.
--   • Deletes no edge function. send-placement-review-requests,
--     placement-monitor and auto-decline-stale-introductions remain deployed
--     and manually invokable; only their timers are removed.
--   • Touches no provider, billing or admin job. send_provider_weekly_digest,
--     process_provider_drip, plan_grace_enforcement, run_re_verification_sweep,
--     send-dunning-emails and the rest are unaffected.
--   • Does NOT touch process_lead_redistribution (every 30 min, also pointing
--     at a function absent from this repo). That is provider-side lead
--     handling and belongs to the upcoming provider retirement pass — flagged,
--     deliberately not swept up here.
--
-- REVERSIBILITY
--   Each line is a single cron.schedule away from being restored; the
--   original schedules are recorded above so they can be recreated exactly.
--
-- VERIFICATION (run after deploy — expect zero rows):
--   select jobid, jobname, schedule, active
--     from cron.job
--    where jobname in (
--            'send_seeker_weekly_digest', 'process_seeker_followup_reminders',
--            'process_seeker_drip', 'send_saved_search_alerts',
--            'send_new_facility_alerts', 'send-placement-review-requests',
--            'placement_monitor', 'auto_decline_stale_introductions',
--            'purge_deleted_seekers');
--
-- Every call is EXISTS-guarded, so an environment where a job was never
-- scheduled is a silent no-op rather than an error.

SELECT cron.unschedule('send-placement-review-requests')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'send-placement-review-requests');

SELECT cron.unschedule('placement_monitor')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'placement_monitor');

SELECT cron.unschedule('auto_decline_stale_introductions')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'auto_decline_stale_introductions');

SELECT cron.unschedule('purge_deleted_seekers')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'purge_deleted_seekers');
