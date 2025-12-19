-- Create provider_events table for analytics tracking
CREATE TABLE public.provider_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  facility_id UUID NOT NULL REFERENCES public.facilities(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('listing_impression', 'profile_view', 'click_to_call', 'website_click')),
  session_id TEXT NOT NULL,
  page_context TEXT DEFAULT 'other' CHECK (page_context IN ('search', 'profile', 'other')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes for efficient querying
CREATE INDEX idx_provider_events_facility_id ON public.provider_events(facility_id);
CREATE INDEX idx_provider_events_event_type ON public.provider_events(event_type);
CREATE INDEX idx_provider_events_created_at ON public.provider_events(created_at DESC);
CREATE INDEX idx_provider_events_facility_type_date ON public.provider_events(facility_id, event_type, created_at);

-- Enable RLS
ALTER TABLE public.provider_events ENABLE ROW LEVEL SECURITY;

-- Service role can insert events (from edge function)
CREATE POLICY "Service role can insert events" 
ON public.provider_events 
FOR INSERT 
WITH CHECK (true);

-- Owners can view their facility events
CREATE POLICY "Owners can view their facility events" 
ON public.provider_events 
FOR SELECT 
USING (facility_id IN (
  SELECT id FROM public.facilities WHERE user_id = auth.uid()
));

-- Admins can view all events
CREATE POLICY "Admins can view all events" 
ON public.provider_events 
FOR SELECT 
USING (public.has_role(auth.uid(), 'admin'));