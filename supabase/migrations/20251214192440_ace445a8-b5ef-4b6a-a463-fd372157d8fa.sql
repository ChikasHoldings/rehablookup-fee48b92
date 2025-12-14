-- Create table to track facility profile views
CREATE TABLE public.facility_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id uuid NOT NULL REFERENCES public.facilities(id) ON DELETE CASCADE,
  view_date date NOT NULL DEFAULT CURRENT_DATE,
  view_count integer NOT NULL DEFAULT 1,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(facility_id, view_date)
);

-- Enable RLS
ALTER TABLE public.facility_views ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can view counts for approved facilities
CREATE POLICY "Anyone can view counts of approved facilities"
ON public.facility_views
FOR SELECT
USING (
  facility_id IN (
    SELECT id FROM public.facilities WHERE status = 'approved'
  )
);

-- Policy: Facility owners can view their own view counts
CREATE POLICY "Owners can view their facility counts"
ON public.facility_views
FOR SELECT
USING (
  facility_id IN (
    SELECT id FROM public.facilities WHERE user_id = auth.uid()
  )
);

-- Policy: Allow inserts via service role (edge function will handle this)
CREATE POLICY "Service role can insert views"
ON public.facility_views
FOR INSERT
WITH CHECK (true);

-- Policy: Allow updates via service role
CREATE POLICY "Service role can update views"
ON public.facility_views
FOR UPDATE
USING (true);

-- Create index for faster queries
CREATE INDEX idx_facility_views_facility_id ON public.facility_views(facility_id);
CREATE INDEX idx_facility_views_date ON public.facility_views(view_date);

-- Add trigger for updated_at
CREATE TRIGGER update_facility_views_updated_at
BEFORE UPDATE ON public.facility_views
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();