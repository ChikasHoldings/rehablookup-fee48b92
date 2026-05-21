-- Drops one of the two byte-identical reminder indexes on `leads`. Both
-- index (created_at, facility_id) WHERE redistribution_status='exclusive'
-- and both serve the redistribution reminder query in
-- process-lead-redistribution.
--
-- Keeping `idx_leads_exclusive_reminders` (the more descriptive name).
-- Dropping `idx_leads_reminder_pending`. Migration is idempotent — DROP
-- INDEX IF EXISTS is a no-op once it's gone.
DROP INDEX IF EXISTS public.idx_leads_reminder_pending;
