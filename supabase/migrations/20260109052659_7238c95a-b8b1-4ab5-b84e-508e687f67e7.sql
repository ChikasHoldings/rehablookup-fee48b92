-- Add due_at column to placement_invoices for tracking overdue payments
ALTER TABLE public.placement_invoices 
ADD COLUMN IF NOT EXISTS due_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS reminder_sent_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS reminder_count integer DEFAULT 0;

-- Set default due_at for new invoices (7 days from creation)
ALTER TABLE public.placement_invoices 
ALTER COLUMN due_at SET DEFAULT (now() + interval '7 days');

-- Update existing pending invoices to have a due date
UPDATE public.placement_invoices 
SET due_at = created_at + interval '7 days' 
WHERE due_at IS NULL AND status IN ('pending', 'sent');

-- Create index for finding overdue invoices
CREATE INDEX IF NOT EXISTS idx_placement_invoices_due_at 
ON public.placement_invoices(due_at) 
WHERE status IN ('pending', 'sent');