-- Add status column to leads table
ALTER TABLE public.leads 
ADD COLUMN status text NOT NULL DEFAULT 'new';

-- Create lead_notes table for provider notes
CREATE TABLE public.lead_notes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  note text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on lead_notes
ALTER TABLE public.lead_notes ENABLE ROW LEVEL SECURITY;

-- Policy: Providers can view notes on their leads
CREATE POLICY "Providers can view notes on their leads"
ON public.lead_notes
FOR SELECT
USING (
  lead_id IN (
    SELECT l.id FROM public.leads l
    JOIN public.facilities f ON l.facility_id = f.id
    WHERE f.user_id = auth.uid()
  )
);

-- Policy: Providers can insert notes on their leads
CREATE POLICY "Providers can insert notes on their leads"
ON public.lead_notes
FOR INSERT
WITH CHECK (
  auth.uid() = user_id AND
  lead_id IN (
    SELECT l.id FROM public.leads l
    JOIN public.facilities f ON l.facility_id = f.id
    WHERE f.user_id = auth.uid()
  )
);

-- Policy: Providers can delete their own notes
CREATE POLICY "Providers can delete their own notes"
ON public.lead_notes
FOR DELETE
USING (
  auth.uid() = user_id
);

-- Policy: Providers can update lead status on their leads
CREATE POLICY "Providers can update their leads"
ON public.leads
FOR UPDATE
USING (
  facility_id IN (
    SELECT id FROM public.facilities
    WHERE user_id = auth.uid()
  )
);