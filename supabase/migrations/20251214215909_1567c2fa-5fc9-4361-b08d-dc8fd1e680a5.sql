-- Add new columns to leads table for qualified intake
ALTER TABLE public.leads 
ADD COLUMN IF NOT EXISTS who_seeking_help text,
ADD COLUMN IF NOT EXISTS location_zip text,
ADD COLUMN IF NOT EXISTS location_city_state text,
ADD COLUMN IF NOT EXISTS urgency text,
ADD COLUMN IF NOT EXISTS primary_substance text[],
ADD COLUMN IF NOT EXISTS level_of_care text,
ADD COLUMN IF NOT EXISTS dual_diagnosis text,
ADD COLUMN IF NOT EXISTS insurance_type text,
ADD COLUMN IF NOT EXISTS insurance_provider text,
ADD COLUMN IF NOT EXISTS budget_preference text,
ADD COLUMN IF NOT EXISTS source text DEFAULT 'direct',
ADD COLUMN IF NOT EXISTS email_verified boolean DEFAULT false;

-- Create email verification codes table
CREATE TABLE public.email_verification_codes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email text NOT NULL,
  code text NOT NULL,
  expires_at timestamp with time zone NOT NULL,
  attempts integer DEFAULT 0,
  verified boolean DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.email_verification_codes ENABLE ROW LEVEL SECURITY;

-- Allow public insert for verification codes (edge function uses service role)
CREATE POLICY "Service role can manage verification codes"
ON public.email_verification_codes
FOR ALL
USING (true)
WITH CHECK (true);

-- Create index for faster lookups
CREATE INDEX idx_verification_email_code ON public.email_verification_codes(email, code);
CREATE INDEX idx_verification_expires ON public.email_verification_codes(expires_at);

-- Allow nullable facility_id for unassigned leads
ALTER TABLE public.leads ALTER COLUMN facility_id DROP NOT NULL;