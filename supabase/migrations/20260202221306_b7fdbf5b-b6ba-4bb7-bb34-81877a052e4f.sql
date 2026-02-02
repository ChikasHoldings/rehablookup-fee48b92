-- Track abandoned cart email sends to prevent spam
CREATE TABLE IF NOT EXISTS public.placement_abandoned_cart_emails (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  inquiry_id UUID REFERENCES public.concierge_inquiries(id) ON DELETE CASCADE,
  international_case_id UUID REFERENCES public.international_placement_cases(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  email_type TEXT NOT NULL DEFAULT 'abandoned_cart', -- abandoned_cart, follow_up
  sent_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  opened_at TIMESTAMP WITH TIME ZONE,
  clicked_at TIMESTAMP WITH TIME ZONE,
  converted_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB DEFAULT '{}',
  CONSTRAINT check_one_case CHECK (
    (inquiry_id IS NOT NULL AND international_case_id IS NULL) OR 
    (inquiry_id IS NULL AND international_case_id IS NOT NULL)
  )
);

-- Index for quick lookups
CREATE INDEX idx_abandoned_cart_emails_inquiry ON public.placement_abandoned_cart_emails(inquiry_id) WHERE inquiry_id IS NOT NULL;
CREATE INDEX idx_abandoned_cart_emails_international ON public.placement_abandoned_cart_emails(international_case_id) WHERE international_case_id IS NOT NULL;
CREATE INDEX idx_abandoned_cart_emails_email ON public.placement_abandoned_cart_emails(email);
CREATE INDEX idx_abandoned_cart_emails_sent_at ON public.placement_abandoned_cart_emails(sent_at);

-- RLS
ALTER TABLE public.placement_abandoned_cart_emails ENABLE ROW LEVEL SECURITY;

-- Only admins can view these records
CREATE POLICY "Admins can manage abandoned cart emails"
ON public.placement_abandoned_cart_emails
FOR ALL
USING (public.user_is_admin(auth.uid()));

-- Add abandoned_cart_email_sent_at to concierge_inquiries for quick filtering
ALTER TABLE public.concierge_inquiries 
ADD COLUMN IF NOT EXISTS abandoned_cart_email_sent_at TIMESTAMP WITH TIME ZONE;

-- Add to international_placement_cases as well
ALTER TABLE public.international_placement_cases 
ADD COLUMN IF NOT EXISTS abandoned_cart_email_sent_at TIMESTAMP WITH TIME ZONE;