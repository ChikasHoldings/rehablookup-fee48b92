ALTER TABLE public.concierge_inquiries
  ADD COLUMN IF NOT EXISTS sms_consent boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS sms_callback_requested_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS contact_channel text NOT NULL DEFAULT 'email';

ALTER TABLE public.concierge_inquiries
  DROP CONSTRAINT IF EXISTS concierge_inquiries_contact_channel_check;

ALTER TABLE public.concierge_inquiries
  ADD CONSTRAINT concierge_inquiries_contact_channel_check
  CHECK (contact_channel IN ('email', 'sms'));

CREATE INDEX IF NOT EXISTS idx_concierge_inquiries_contact_channel
  ON public.concierge_inquiries (contact_channel)
  WHERE contact_channel <> 'email';