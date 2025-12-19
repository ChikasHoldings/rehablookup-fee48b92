-- Add lead_deducted_at column to track when leads are counted against provider limits
ALTER TABLE public.lead_routing_logs 
ADD COLUMN IF NOT EXISTS lead_deducted_at timestamp with time zone DEFAULT NULL;

-- Add comment for clarity
COMMENT ON COLUMN public.lead_routing_logs.lead_deducted_at IS 'Timestamp when this lead was deducted from provider quota';

-- Create index for efficient queries on lead deduction tracking
CREATE INDEX IF NOT EXISTS idx_lead_routing_logs_deducted_at 
ON public.lead_routing_logs(lead_deducted_at) 
WHERE lead_deducted_at IS NOT NULL;