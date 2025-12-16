-- Create table to store hashed recovery codes for admin users
CREATE TABLE public.admin_mfa_recovery_codes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  code_hash TEXT NOT NULL,
  used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.admin_mfa_recovery_codes ENABLE ROW LEVEL SECURITY;

-- Only service role can manage recovery codes
CREATE POLICY "Service role can manage recovery codes"
  ON public.admin_mfa_recovery_codes
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Create index for faster lookups
CREATE INDEX idx_admin_mfa_recovery_codes_user_id ON public.admin_mfa_recovery_codes(user_id);
CREATE INDEX idx_admin_mfa_recovery_codes_unused ON public.admin_mfa_recovery_codes(user_id) WHERE used_at IS NULL;