
-- Add high-intent 1h boost reminder column
ALTER TABLE public.leads 
  ADD COLUMN IF NOT EXISTS reminder_1h_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS lead_expired_at TIMESTAMPTZ;

-- Add last_unlock_at and SMS escalation preference
ALTER TABLE public.notification_preferences 
  ADD COLUMN IF NOT EXISTS last_unlock_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS sms_escalation_enabled BOOLEAN DEFAULT false;

-- Index for expired leads queries
CREATE INDEX IF NOT EXISTS idx_leads_expired ON public.leads(lead_expired_at) WHERE lead_expired_at IS NOT NULL;
