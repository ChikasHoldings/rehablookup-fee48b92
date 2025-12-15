-- Add reply email verification fields to facilities
ALTER TABLE public.facilities 
ADD COLUMN IF NOT EXISTS reply_email_verified boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS reply_email_verified_at timestamp with time zone;

-- Create reply email verification codes table
CREATE TABLE public.reply_email_verification_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id uuid NOT NULL REFERENCES public.facilities(id) ON DELETE CASCADE,
  email text NOT NULL,
  code text NOT NULL,
  expires_at timestamp with time zone NOT NULL,
  attempts integer DEFAULT 0,
  status text DEFAULT 'pending',
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.reply_email_verification_codes ENABLE ROW LEVEL SECURITY;

-- RLS policies - only service role can manage these codes
CREATE POLICY "Service role can insert reply verification codes"
ON public.reply_email_verification_codes
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Service role can select reply verification codes"
ON public.reply_email_verification_codes
FOR SELECT
USING (true);

CREATE POLICY "Service role can update reply verification codes"
ON public.reply_email_verification_codes
FOR UPDATE
USING (true);

CREATE POLICY "Service role can delete reply verification codes"
ON public.reply_email_verification_codes
FOR DELETE
USING (true);

-- Index for faster lookups
CREATE INDEX idx_reply_email_verification_facility_email 
ON public.reply_email_verification_codes(facility_id, email, status);