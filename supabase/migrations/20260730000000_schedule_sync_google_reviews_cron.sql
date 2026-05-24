-- Nightly cron for sync-google-reviews edge function.
--
-- Runs at 04:30 UTC, in between cleanup-orphan-storage (04:00) and
-- purge-deleted-seekers (04:30 — wait, that's the same minute). The
-- existing 04:30 job is `purge_deleted_seekers`. Picking 04:35 here so
-- we don't fight for the same pg_net pool with that one.
--
-- The function reads facility_reviews_config (small, indexed) and
-- writes back rating + review_count. No customer-visible work during
-- the run; off-peak window keeps the per-key Google quota predictable.
--
-- Pre-req: GOOGLE_PLACES_API_KEY must be set in the project's edge-
-- function secrets. The function fails closed with a 500 if missing
-- so the cron retry won't run silently against a misconfigured env.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM cron.job WHERE jobname = 'sync_google_reviews'
  ) THEN
    PERFORM cron.schedule(
      'sync_google_reviews',
      '35 4 * * *',
      $cron$SELECT scheduled.call_edge_function('sync-google-reviews');$cron$
    );
  END IF;
END $$;
