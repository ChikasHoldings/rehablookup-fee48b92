-- Add columns to concierge_inquiries for enhanced matching
ALTER TABLE public.concierge_inquiries
ADD COLUMN IF NOT EXISTS match_scores jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS admin_matched_facility_ids uuid[] DEFAULT '{}'::uuid[],
ADD COLUMN IF NOT EXISTS introductions_sent_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS introductions_sent_count integer DEFAULT 0;

-- Create concierge_introductions table for tracking provider engagement
CREATE TABLE public.concierge_introductions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inquiry_id uuid REFERENCES public.concierge_inquiries(id) ON DELETE CASCADE NOT NULL,
  facility_id uuid REFERENCES public.facilities(id) ON DELETE CASCADE NOT NULL,
  sent_at timestamp with time zone DEFAULT now(),
  sent_by uuid,
  provider_response text DEFAULT 'pending' CHECK (provider_response IN ('pending', 'interested', 'declined', 'no_response')),
  provider_responded_at timestamp with time zone,
  provider_notes text,
  seeker_contacted boolean DEFAULT false,
  seeker_contacted_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(inquiry_id, facility_id)
);

-- Enable RLS
ALTER TABLE public.concierge_introductions ENABLE ROW LEVEL SECURITY;

-- Admin can manage all introductions
CREATE POLICY "Admins can manage concierge introductions"
ON public.concierge_introductions
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Providers can view introductions for their facilities
CREATE POLICY "Providers can view their introductions"
ON public.concierge_introductions
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.facilities f
    WHERE f.id = facility_id AND f.user_id = auth.uid()
  )
);

-- Providers can update their response on introductions
CREATE POLICY "Providers can respond to introductions"
ON public.concierge_introductions
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.facilities f
    WHERE f.id = facility_id AND f.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.facilities f
    WHERE f.id = facility_id AND f.user_id = auth.uid()
  )
);

-- Create index for faster lookups
CREATE INDEX idx_concierge_introductions_inquiry ON public.concierge_introductions(inquiry_id);
CREATE INDEX idx_concierge_introductions_facility ON public.concierge_introductions(facility_id);
CREATE INDEX idx_concierge_introductions_response ON public.concierge_introductions(provider_response);