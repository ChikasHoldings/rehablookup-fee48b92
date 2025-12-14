-- Add slug column to facilities for clean URLs
ALTER TABLE public.facilities
ADD COLUMN slug text UNIQUE;

-- Create index for faster slug lookups
CREATE INDEX idx_facilities_slug ON public.facilities(slug);

-- Create leads table for contact form submissions
CREATE TABLE public.leads (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  facility_id uuid NOT NULL REFERENCES public.facilities(id) ON DELETE CASCADE,
  name text NOT NULL,
  phone text NOT NULL,
  email text NOT NULL,
  preferred_contact text NOT NULL DEFAULT 'call',
  message text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on leads table
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

-- Anyone can insert leads (public form submission)
CREATE POLICY "Anyone can submit leads"
ON public.leads
FOR INSERT
WITH CHECK (
  facility_id IN (
    SELECT id FROM public.facilities WHERE status = 'approved'
  )
);

-- Facility owners can view their leads
CREATE POLICY "Owners can view their leads"
ON public.leads
FOR SELECT
USING (
  facility_id IN (
    SELECT id FROM public.facilities WHERE user_id = auth.uid()
  )
);