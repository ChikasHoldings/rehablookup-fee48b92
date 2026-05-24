-- Schedule the nightly re-verification sweep.
--
-- The orchestrator edge function `run-re-verification-sweep` calls:
--   * run_data_feed_diff()    — primary continuous monitor
--   * run_expiry_sweep()      — license/accreditation expiry warnings
--   * run_backstop_sweep(200) — periodic backstop revalidation
--
-- 4:50 UTC chosen to land AFTER the existing nightly heavy-lifting
-- (calculate_ranking_scores at 5:00, cleanup-orphan-storage at 4:00,
-- sync-google-reviews at 4:35). Slot fits the cadence and avoids
-- contention with the ranking job that reads the same facilities.

SELECT cron.schedule(
  'run_re_verification_sweep',
  '50 4 * * *',
  $$SELECT scheduled.call_edge_function('run-re-verification-sweep');$$
);
