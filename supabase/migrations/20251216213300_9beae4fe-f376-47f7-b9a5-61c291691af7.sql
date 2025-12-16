-- Create table to store email tracking events from Resend webhooks
CREATE TABLE public.email_tracking_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email_id TEXT NOT NULL,
  email_type TEXT NOT NULL DEFAULT 'retention_outreach',
  recipient_email TEXT NOT NULL,
  event_type TEXT NOT NULL,
  event_data JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for efficient querying
CREATE INDEX idx_email_tracking_email_id ON public.email_tracking_events(email_id);
CREATE INDEX idx_email_tracking_event_type ON public.email_tracking_events(event_type);
CREATE INDEX idx_email_tracking_created_at ON public.email_tracking_events(created_at);

-- Enable RLS
ALTER TABLE public.email_tracking_events ENABLE ROW LEVEL SECURITY;

-- Only service role can insert (webhook)
CREATE POLICY "Service role can insert tracking events"
ON public.email_tracking_events
FOR INSERT
WITH CHECK (true);

-- Admins can view tracking events
CREATE POLICY "Admins can view tracking events"
ON public.email_tracking_events
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Add resend_id column to subscription_alerts for linking
ALTER TABLE public.subscription_alerts ADD COLUMN IF NOT EXISTS resend_id TEXT;