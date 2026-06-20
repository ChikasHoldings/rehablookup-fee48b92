-- Real-time admin sidebar badges: add the last two queue tables to the
-- supabase_realtime publication.
--
-- The admin sidebar badges now show the live count of pending work in each
-- section (pending facility claims, new leads, open tickets, …), read from each
-- section's source table and refreshed via postgres_changes. Most of those
-- tables were already in the supabase_realtime publication (added by the
-- 20260621–20260630 realtime_for_* migrations), but two were not, so their
-- badges only updated on the 60s poll:
--   * facility_claim_requests  -> Providers badge (pending claims)
--   * re_verification_events   -> Re-verification badge (open events)
--
-- Adding them makes every sidebar badge update within ~200ms of a change.
-- Counts themselves are RLS-scoped at query time; realtime delivery is likewise
-- RLS-filtered, so this exposes nothing new — admins already read these tables.
--
-- Idempotent: each ADD TABLE is guarded by a pg_publication_tables check, so the
-- migration is a no-op if the table is already published.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'facility_claim_requests'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.facility_claim_requests;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 're_verification_events'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.re_verification_events;
  END IF;
END $$;
