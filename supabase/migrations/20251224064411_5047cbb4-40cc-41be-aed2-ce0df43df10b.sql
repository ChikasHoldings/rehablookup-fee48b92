-- Create review_requests table to track sent review invitations
CREATE TABLE public.review_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  facility_id UUID NOT NULL REFERENCES public.facilities(id) ON DELETE CASCADE,
  sender_user_id UUID NOT NULL,
  recipient_name TEXT NOT NULL,
  recipient_email TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  sent_at TIMESTAMP WITH TIME ZONE,
  opened_at TIMESTAMP WITH TIME ZONE,
  clicked_at TIMESTAMP WITH TIME ZONE,
  review_submitted_at TIMESTAMP WITH TIME ZONE,
  resend_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for facility lookup
CREATE INDEX idx_review_requests_facility_id ON public.review_requests(facility_id);
CREATE INDEX idx_review_requests_recipient_email ON public.review_requests(recipient_email);

-- Enable RLS
ALTER TABLE public.review_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Providers can view their own review requests"
ON public.review_requests
FOR SELECT
USING (facility_id IN (
  SELECT id FROM public.facilities WHERE user_id = auth.uid()
));

CREATE POLICY "Providers can insert review requests for their facilities"
ON public.review_requests
FOR INSERT
WITH CHECK (
  auth.uid() = sender_user_id AND
  facility_id IN (SELECT id FROM public.facilities WHERE user_id = auth.uid())
);

CREATE POLICY "Providers can update their own review requests"
ON public.review_requests
FOR UPDATE
USING (facility_id IN (
  SELECT id FROM public.facilities WHERE user_id = auth.uid()
));

CREATE POLICY "Providers can delete their own review requests"
ON public.review_requests
FOR DELETE
USING (facility_id IN (
  SELECT id FROM public.facilities WHERE user_id = auth.uid()
));

CREATE POLICY "Admins can view all review requests"
ON public.review_requests
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Update trigger
CREATE TRIGGER update_review_requests_updated_at
BEFORE UPDATE ON public.review_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();