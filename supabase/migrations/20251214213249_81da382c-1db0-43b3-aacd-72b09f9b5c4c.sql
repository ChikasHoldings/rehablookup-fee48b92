-- Create lead_emails table to log all emails sent to leads
CREATE TABLE public.lead_emails (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  facility_id uuid NOT NULL REFERENCES public.facilities(id) ON DELETE CASCADE,
  sender_user_id uuid NOT NULL,
  sender_name text NOT NULL,
  template_id text NOT NULL,
  template_name text NOT NULL,
  custom_note text,
  recipient_email text NOT NULL,
  status text NOT NULL DEFAULT 'sent',
  resend_id text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.lead_emails ENABLE ROW LEVEL SECURITY;

-- Providers can view email logs for their own leads
CREATE POLICY "Providers can view their lead emails"
ON public.lead_emails
FOR SELECT
USING (
  facility_id IN (
    SELECT id FROM public.facilities
    WHERE user_id = auth.uid()
  )
);

-- Providers can insert email logs for their own leads
CREATE POLICY "Providers can insert lead emails"
ON public.lead_emails
FOR INSERT
WITH CHECK (
  auth.uid() = sender_user_id AND
  facility_id IN (
    SELECT id FROM public.facilities
    WHERE user_id = auth.uid()
  )
);

-- Create index for faster lookups
CREATE INDEX idx_lead_emails_lead_id ON public.lead_emails(lead_id);
CREATE INDEX idx_lead_emails_facility_id ON public.lead_emails(facility_id);
CREATE INDEX idx_lead_emails_created_at ON public.lead_emails(created_at DESC);