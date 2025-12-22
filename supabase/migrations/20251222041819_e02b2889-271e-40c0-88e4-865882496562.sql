-- Create facility_reviews_config table for Google Reviews integration
CREATE TABLE public.facility_reviews_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id UUID NOT NULL UNIQUE,
  google_place_id TEXT,
  google_place_url TEXT,
  google_rating DECIMAL(2,1) CHECK (google_rating >= 1.0 AND google_rating <= 5.0),
  google_review_count INTEGER CHECK (google_review_count >= 0),
  show_on_profile BOOLEAN DEFAULT true,
  last_updated_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.facility_reviews_config ENABLE ROW LEVEL SECURITY;

-- Providers can manage their own facility's reviews config
CREATE POLICY "Providers can insert their facility reviews config"
ON public.facility_reviews_config
FOR INSERT
WITH CHECK (
  facility_id IN (
    SELECT id FROM public.facilities WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Providers can update their facility reviews config"
ON public.facility_reviews_config
FOR UPDATE
USING (
  facility_id IN (
    SELECT id FROM public.facilities WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Providers can view their facility reviews config"
ON public.facility_reviews_config
FOR SELECT
USING (
  facility_id IN (
    SELECT id FROM public.facilities WHERE user_id = auth.uid()
  )
);

-- Public can view reviews config for approved facilities
CREATE POLICY "Public can view reviews config of approved facilities"
ON public.facility_reviews_config
FOR SELECT
USING (
  show_on_profile = true AND
  facility_id IN (
    SELECT id FROM public.facilities WHERE status = 'approved'
  )
);

-- Admins can view all
CREATE POLICY "Admins can view all reviews config"
ON public.facility_reviews_config
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Trigger to update last_updated_at
CREATE TRIGGER update_facility_reviews_config_updated_at
BEFORE UPDATE ON public.facility_reviews_config
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();