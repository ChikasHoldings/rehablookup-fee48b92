-- Create table to track sent alert notifications to avoid duplicates
CREATE TABLE public.subscription_alerts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  alert_type TEXT NOT NULL, -- 'subscription_expiring', 'lead_limit_warning', 'lead_limit_reached'
  alert_key TEXT NOT NULL, -- Unique key like 'sub_expiry_7days_2024-01' to prevent duplicates
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create unique constraint to prevent duplicate alerts
CREATE UNIQUE INDEX idx_subscription_alerts_unique ON public.subscription_alerts(user_id, alert_key);

-- Enable RLS
ALTER TABLE public.subscription_alerts ENABLE ROW LEVEL SECURITY;

-- Service role can manage alerts
CREATE POLICY "Service role can manage alerts"
ON public.subscription_alerts
FOR ALL
USING (true)
WITH CHECK (true);

-- Users can view their own alerts
CREATE POLICY "Users can view their own alerts"
ON public.subscription_alerts
FOR SELECT
USING (auth.uid() = user_id);