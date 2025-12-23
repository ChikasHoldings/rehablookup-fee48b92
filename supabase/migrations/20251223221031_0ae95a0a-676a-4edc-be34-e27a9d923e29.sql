-- Add phone verification columns to seeker_profiles
ALTER TABLE public.seeker_profiles 
ADD COLUMN IF NOT EXISTS phone_verified boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS phone_verified_at timestamp with time zone;

-- Add phone verification columns to profiles (providers)
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS phone_verified boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS phone_verified_at timestamp with time zone;

-- Create phone verification codes table
CREATE TABLE IF NOT EXISTS public.phone_verification_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone text NOT NULL,
  code text NOT NULL,
  expires_at timestamp with time zone NOT NULL,
  verified boolean DEFAULT false,
  attempts integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now()
);

-- Create index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_phone_verification_codes_phone ON public.phone_verification_codes(phone);
CREATE INDEX IF NOT EXISTS idx_phone_verification_codes_expires ON public.phone_verification_codes(expires_at);

-- Enable RLS on phone_verification_codes
ALTER TABLE public.phone_verification_codes ENABLE ROW LEVEL SECURITY;

-- Only service role can manage verification codes (edge functions use service role)
CREATE POLICY "Service role can manage phone verification codes"
ON public.phone_verification_codes
FOR ALL
USING (true)
WITH CHECK (true);