-- Create rejected facilities table for persisting dismissed facilities across devices
CREATE TABLE public.concierge_rejected_facilities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inquiry_id UUID NOT NULL REFERENCES public.concierge_inquiries(id) ON DELETE CASCADE,
  facility_id UUID NOT NULL REFERENCES public.facilities(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(inquiry_id, facility_id)
);

-- Enable RLS
ALTER TABLE public.concierge_rejected_facilities ENABLE ROW LEVEL SECURITY;

-- Seekers can view their own rejected facilities
CREATE POLICY "Seekers can view their rejected facilities"
  ON public.concierge_rejected_facilities
  FOR SELECT
  USING (auth.uid() = user_id);

-- Seekers can insert their own rejected facilities
CREATE POLICY "Seekers can insert their rejected facilities"
  ON public.concierge_rejected_facilities
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Seekers can delete their own rejected facilities (to undo dismiss)
CREATE POLICY "Seekers can delete their rejected facilities"
  ON public.concierge_rejected_facilities
  FOR DELETE
  USING (auth.uid() = user_id);

-- Add index for faster queries
CREATE INDEX idx_concierge_rejected_facilities_inquiry ON public.concierge_rejected_facilities(inquiry_id);
CREATE INDEX idx_concierge_rejected_facilities_user ON public.concierge_rejected_facilities(user_id);