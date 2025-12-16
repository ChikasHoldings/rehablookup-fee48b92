-- Create table for blocked IP addresses and email addresses
CREATE TABLE public.blocked_identifiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier TEXT NOT NULL,
  identifier_type TEXT NOT NULL CHECK (identifier_type IN ('ip', 'email')),
  reason TEXT,
  blocked_by UUID NOT NULL,
  blocked_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  UNIQUE (identifier, identifier_type)
);

-- Enable RLS
ALTER TABLE public.blocked_identifiers ENABLE ROW LEVEL SECURITY;

-- Only admins can view blocked identifiers
CREATE POLICY "Admins can view blocked identifiers"
ON public.blocked_identifiers
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Only admins can insert blocked identifiers
CREATE POLICY "Admins can insert blocked identifiers"
ON public.blocked_identifiers
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Only admins can update blocked identifiers
CREATE POLICY "Admins can update blocked identifiers"
ON public.blocked_identifiers
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Only admins can delete blocked identifiers
CREATE POLICY "Admins can delete blocked identifiers"
ON public.blocked_identifiers
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create function to check if identifier is blocked
CREATE OR REPLACE FUNCTION public.is_identifier_blocked(p_identifier TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.blocked_identifiers
    WHERE identifier = p_identifier
      AND is_active = true
      AND (expires_at IS NULL OR expires_at > now())
  )
$$;

-- Create index for faster lookups
CREATE INDEX idx_blocked_identifiers_lookup 
ON public.blocked_identifiers (identifier, is_active, expires_at);