-- Add column to track when follow-up reminder was sent
ALTER TABLE public.leads 
ADD COLUMN follow_up_reminder_sent_at timestamp with time zone DEFAULT NULL;

-- Add index for efficient querying of leads needing reminders
CREATE INDEX idx_leads_reminder_check ON public.leads (status, created_at, follow_up_reminder_sent_at) 
WHERE status = 'new' AND follow_up_reminder_sent_at IS NULL;