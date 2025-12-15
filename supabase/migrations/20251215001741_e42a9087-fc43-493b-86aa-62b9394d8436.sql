-- Add snooze_until column to leads table for reminder snoozing
ALTER TABLE public.leads 
ADD COLUMN snooze_until timestamp with time zone DEFAULT NULL;

-- Add index for efficient snooze checking
CREATE INDEX idx_leads_snooze_check ON public.leads (status, snooze_until) 
WHERE status = 'new';