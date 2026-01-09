-- Add payment retry tracking fields to placement_invoices
ALTER TABLE public.placement_invoices
ADD COLUMN IF NOT EXISTS retry_count integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_retry_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS next_retry_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS delinquent boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS delinquent_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS failure_reason text;

-- Create index for retry scheduling
CREATE INDEX IF NOT EXISTS idx_placement_invoices_next_retry 
ON public.placement_invoices (next_retry_at) 
WHERE status = 'failed' AND retry_count < 3 AND NOT delinquent;