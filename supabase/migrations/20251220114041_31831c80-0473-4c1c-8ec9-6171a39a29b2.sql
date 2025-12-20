-- Create subscription_events table to track all subscription-related revenue events
CREATE TABLE public.subscription_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_type TEXT NOT NULL,
  stripe_event_id TEXT UNIQUE,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  user_id UUID,
  facility_id UUID REFERENCES public.facilities(id),
  plan_name TEXT,
  plan_tier TEXT,
  amount_cents INTEGER,
  currency TEXT DEFAULT 'USD',
  status TEXT DEFAULT 'completed',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes for efficient querying
CREATE INDEX idx_subscription_events_event_type ON public.subscription_events(event_type);
CREATE INDEX idx_subscription_events_user_id ON public.subscription_events(user_id);
CREATE INDEX idx_subscription_events_facility_id ON public.subscription_events(facility_id);
CREATE INDEX idx_subscription_events_created_at ON public.subscription_events(created_at DESC);
CREATE INDEX idx_subscription_events_stripe_customer ON public.subscription_events(stripe_customer_id);

-- Enable RLS
ALTER TABLE public.subscription_events ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Admins can view all subscription events
CREATE POLICY "Admins can view all subscription events"
ON public.subscription_events
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Service role can insert events (from webhook)
CREATE POLICY "Service role can insert subscription events"
ON public.subscription_events
FOR INSERT
WITH CHECK (true);

-- Providers can view their own subscription events
CREATE POLICY "Providers can view their own subscription events"
ON public.subscription_events
FOR SELECT
USING (user_id = auth.uid());