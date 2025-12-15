-- Create request help analytics table for CTA tracking
CREATE TABLE public.request_help_analytics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_type TEXT NOT NULL, -- 'page_view', 'step_complete', 'form_submit'
  source TEXT NOT NULL DEFAULT 'direct', -- CTA source: hero, header, footer, contact, etc.
  facility_id UUID REFERENCES public.facilities(id) ON DELETE SET NULL,
  step_number INTEGER,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.request_help_analytics ENABLE ROW LEVEL SECURITY;

-- Allow public inserts for tracking (anonymous visitors)
CREATE POLICY "Anyone can insert analytics events"
ON public.request_help_analytics
FOR INSERT
WITH CHECK (true);

-- Only admins can view analytics
CREATE POLICY "Admins can view analytics"
ON public.request_help_analytics
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'moderator')
  )
);

-- Create index for efficient querying
CREATE INDEX idx_request_help_analytics_source ON public.request_help_analytics(source);
CREATE INDEX idx_request_help_analytics_created_at ON public.request_help_analytics(created_at);