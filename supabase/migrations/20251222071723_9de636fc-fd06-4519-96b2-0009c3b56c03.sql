-- Create review_responses table (provider responses to reviews)
CREATE TABLE public.review_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id uuid REFERENCES public.facility_reviews(id) ON DELETE CASCADE NOT NULL,
  facility_id uuid REFERENCES public.facilities(id) ON DELETE CASCADE NOT NULL,
  responder_user_id uuid NOT NULL,
  response_text text NOT NULL,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(review_id)
);

-- Create review_disputes table (for flagging reviews)
CREATE TABLE public.review_disputes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id uuid REFERENCES public.facility_reviews(id) ON DELETE CASCADE NOT NULL,
  facility_id uuid REFERENCES public.facilities(id) ON DELETE CASCADE NOT NULL,
  disputed_by uuid NOT NULL,
  reason text NOT NULL,
  details text,
  status text NOT NULL DEFAULT 'pending',
  admin_notes text,
  resolved_by uuid,
  resolved_at timestamptz,
  created_at timestamptz DEFAULT now(),
  UNIQUE(review_id)
);

-- Add disputed column to facility_reviews
ALTER TABLE public.facility_reviews ADD COLUMN IF NOT EXISTS disputed boolean DEFAULT false;

-- Enable RLS on review_responses
ALTER TABLE public.review_responses ENABLE ROW LEVEL SECURITY;

-- Providers can view responses for their facilities
CREATE POLICY "Providers can view their facility responses"
ON public.review_responses
FOR SELECT
USING (facility_id IN (
  SELECT id FROM public.facilities WHERE user_id = auth.uid()
));

-- Providers can insert responses for their facilities
CREATE POLICY "Providers can insert responses for their facilities"
ON public.review_responses
FOR INSERT
WITH CHECK (
  facility_id IN (SELECT id FROM public.facilities WHERE user_id = auth.uid())
  AND responder_user_id = auth.uid()
);

-- Providers can update their own responses
CREATE POLICY "Providers can update their own responses"
ON public.review_responses
FOR UPDATE
USING (responder_user_id = auth.uid());

-- Providers can delete their own responses
CREATE POLICY "Providers can delete their own responses"
ON public.review_responses
FOR DELETE
USING (responder_user_id = auth.uid());

-- Public can view active responses for approved reviews
CREATE POLICY "Public can view active responses"
ON public.review_responses
FOR SELECT
USING (
  status = 'active' 
  AND review_id IN (
    SELECT id FROM public.facility_reviews WHERE status = 'approved'
  )
);

-- Admins can view all responses
CREATE POLICY "Admins can view all responses"
ON public.review_responses
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Admins can update all responses
CREATE POLICY "Admins can update all responses"
ON public.review_responses
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Enable RLS on review_disputes
ALTER TABLE public.review_disputes ENABLE ROW LEVEL SECURITY;

-- Providers can view disputes for their facilities
CREATE POLICY "Providers can view their facility disputes"
ON public.review_disputes
FOR SELECT
USING (facility_id IN (
  SELECT id FROM public.facilities WHERE user_id = auth.uid()
));

-- Providers can create disputes for their facilities
CREATE POLICY "Providers can create disputes for their facilities"
ON public.review_disputes
FOR INSERT
WITH CHECK (
  facility_id IN (SELECT id FROM public.facilities WHERE user_id = auth.uid())
  AND disputed_by = auth.uid()
);

-- Admins can view all disputes
CREATE POLICY "Admins can view all disputes"
ON public.review_disputes
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Admins can update disputes
CREATE POLICY "Admins can update disputes"
ON public.review_disputes
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Admins can delete disputes
CREATE POLICY "Admins can delete disputes"
ON public.review_disputes
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create trigger for updated_at on review_responses
CREATE TRIGGER update_review_responses_updated_at
BEFORE UPDATE ON public.review_responses
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for new tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.review_responses;
ALTER PUBLICATION supabase_realtime ADD TABLE public.review_disputes;