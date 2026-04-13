
-- Create notification_events table for tracking notification lifecycle
CREATE TABLE IF NOT EXISTS public.notification_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL,
  facility_id UUID NOT NULL,
  user_id UUID NOT NULL,
  notification_stage TEXT NOT NULL,
  channel TEXT NOT NULL,
  event_type TEXT NOT NULL,
  notification_type TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_notification_events_lead ON public.notification_events(lead_id);
CREATE INDEX IF NOT EXISTS idx_notification_events_facility ON public.notification_events(facility_id);
CREATE INDEX IF NOT EXISTS idx_notification_events_user ON public.notification_events(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_events_stage ON public.notification_events(notification_stage, event_type);

-- RLS: only service role can insert (edge functions), providers can read their own
ALTER TABLE public.notification_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notification events"
  ON public.notification_events FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Service role can manage notification events"
  ON public.notification_events FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- Add missing columns to notification_preferences
ALTER TABLE public.notification_preferences 
  ADD COLUMN IF NOT EXISTS engagement_tier TEXT DEFAULT 'moderate',
  ADD COLUMN IF NOT EXISTS total_unlocks_30d INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_unlock_at TIMESTAMPTZ;

-- Add missing columns to leads
ALTER TABLE public.leads 
  ADD COLUMN IF NOT EXISTS high_intent BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS reminder_2h_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS reminder_20h_sent_at TIMESTAMPTZ;

-- Index for the reminder cron query
CREATE INDEX IF NOT EXISTS idx_leads_exclusive_reminders 
  ON public.leads(created_at, facility_id) 
  WHERE redistribution_status = 'exclusive';
