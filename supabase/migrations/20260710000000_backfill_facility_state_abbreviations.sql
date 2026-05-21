-- F5 (docs/search-audit-2026-05-21.md): a handful of facilities were
-- ingested with raw 2-letter state codes ("Co", "TX") instead of full state
-- names. Every public surface (state pages, near-me pages, state filter on
-- /search-results) keys off the full name, so these rows fell out of all
-- state-scoped browsing.
--
-- Gated migration — only touches rows that match the broken shape exactly.
-- Re-running is a no-op once the rows are corrected.
DO $$
BEGIN
  UPDATE public.facilities
  SET state = 'Colorado'
  WHERE state = 'Co';

  UPDATE public.facilities
  SET state = 'Texas'
  WHERE state = 'TX';
END $$;
