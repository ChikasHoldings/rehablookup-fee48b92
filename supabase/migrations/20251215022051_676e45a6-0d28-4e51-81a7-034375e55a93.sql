-- Create table for tracking facility interactions (calls, website visits)
CREATE TABLE public.facility_interactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  facility_id UUID NOT NULL REFERENCES public.facilities(id) ON DELETE CASCADE,
  interaction_type TEXT NOT NULL, -- 'call' or 'website'
  interaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
  interaction_count INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(facility_id, interaction_type, interaction_date)
);

-- Enable RLS
ALTER TABLE public.facility_interactions ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Owners can view their facility interactions" 
ON public.facility_interactions 
FOR SELECT 
USING (facility_id IN (SELECT id FROM facilities WHERE user_id = auth.uid()));

CREATE POLICY "Service role can insert interactions" 
ON public.facility_interactions 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Service role can update interactions" 
ON public.facility_interactions 
FOR UPDATE 
USING (true);

-- Create index for efficient queries
CREATE INDEX idx_facility_interactions_facility_date 
ON public.facility_interactions(facility_id, interaction_date);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.facility_interactions;