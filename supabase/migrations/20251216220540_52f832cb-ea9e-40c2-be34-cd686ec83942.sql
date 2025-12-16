-- Create featured placement analytics table
CREATE TABLE public.featured_placement_analytics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  facility_id UUID NOT NULL REFERENCES public.facilities(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL, -- 'impression', 'click', 'lead_conversion'
  event_date DATE NOT NULL DEFAULT CURRENT_DATE,
  event_count INTEGER NOT NULL DEFAULT 1,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(facility_id, event_type, event_date)
);

-- Enable RLS
ALTER TABLE public.featured_placement_analytics ENABLE ROW LEVEL SECURITY;

-- Admins can view all analytics
CREATE POLICY "Admins can view featured analytics"
ON public.featured_placement_analytics
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Service role can insert/update analytics
CREATE POLICY "Service role can insert featured analytics"
ON public.featured_placement_analytics
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Service role can update featured analytics"
ON public.featured_placement_analytics
FOR UPDATE
USING (true);

-- Facility owners can view their own analytics
CREATE POLICY "Owners can view their facility analytics"
ON public.featured_placement_analytics
FOR SELECT
USING (facility_id IN (
  SELECT id FROM public.facilities WHERE user_id = auth.uid()
));

-- Create index for faster queries
CREATE INDEX idx_featured_analytics_facility_date ON public.featured_placement_analytics(facility_id, event_date);
CREATE INDEX idx_featured_analytics_event_type ON public.featured_placement_analytics(event_type, event_date);

-- Add trigger for updated_at
CREATE TRIGGER update_featured_analytics_updated_at
BEFORE UPDATE ON public.featured_placement_analytics
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();