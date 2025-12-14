-- Add quality_flag column for provider feedback on lead quality
ALTER TABLE public.leads 
ADD COLUMN quality_flag text DEFAULT NULL,
ADD COLUMN ip_hash text DEFAULT NULL,
ADD COLUMN validation_status text DEFAULT 'valid';

-- Create index for duplicate detection (email + facility within time window)
CREATE INDEX idx_leads_duplicate_check ON public.leads (facility_id, email, created_at DESC);

-- Create index for IP-based rate limiting
CREATE INDEX idx_leads_ip_rate_limit ON public.leads (ip_hash, created_at DESC);

-- Add comment for quality_flag values
COMMENT ON COLUMN public.leads.quality_flag IS 'Provider feedback: low_quality, spam, duplicate, null for normal leads';
COMMENT ON COLUMN public.leads.ip_hash IS 'Hashed IP address for rate limiting (not personally identifiable)';
COMMENT ON COLUMN public.leads.validation_status IS 'valid, duplicate, rate_limited, invalid_format';