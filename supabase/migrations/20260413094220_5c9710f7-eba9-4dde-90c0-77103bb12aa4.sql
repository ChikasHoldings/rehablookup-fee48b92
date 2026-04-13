
-- Index was already created, just add the missing lead reminder index
CREATE INDEX IF NOT EXISTS idx_leads_reminder_pending 
ON public.leads(created_at, facility_id) 
WHERE redistribution_status = 'exclusive';
