-- Create badge_impressions table for tracking embed badge views
CREATE TABLE public.badge_impressions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  facility_id UUID NOT NULL REFERENCES public.facilities(id) ON DELETE CASCADE,
  referrer_domain TEXT,
  badge_type TEXT NOT NULL DEFAULT 'verified',
  badge_size TEXT NOT NULL DEFAULT 'medium',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for analytics queries
CREATE INDEX idx_badge_impressions_facility_id ON public.badge_impressions(facility_id);
CREATE INDEX idx_badge_impressions_created_at ON public.badge_impressions(created_at);
CREATE INDEX idx_badge_impressions_referrer ON public.badge_impressions(referrer_domain);

-- Enable RLS
ALTER TABLE public.badge_impressions ENABLE ROW LEVEL SECURITY;

-- Allow public inserts (for tracking from edge function)
CREATE POLICY "Allow public inserts for badge tracking"
ON public.badge_impressions
FOR INSERT
WITH CHECK (true);

-- Allow facility owners to view their impressions
CREATE POLICY "Facility owners can view their badge impressions"
ON public.badge_impressions
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.facilities f
    WHERE f.id = facility_id AND f.user_id = auth.uid()
  )
);

-- Allow admins to view all impressions
CREATE POLICY "Admins can view all badge impressions"
ON public.badge_impressions
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);