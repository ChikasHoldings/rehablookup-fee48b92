-- Add columns to concierge_inquiries for abandoned cart tracking
ALTER TABLE public.concierge_inquiries 
ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS form_completed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS payment_reminder_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS draft_id TEXT;

-- Create index for abandoned cart queries
CREATE INDEX IF NOT EXISTS idx_concierge_inquiries_abandoned_cart 
ON public.concierge_inquiries(payment_status, form_completed_at, email_verified_at, payment_reminder_count)
WHERE payment_status = 'pending' AND form_completed_at IS NOT NULL AND email_verified_at IS NOT NULL;

-- Comment on columns for documentation
COMMENT ON COLUMN public.concierge_inquiries.email_verified_at IS 'When user verified their email during intake flow';
COMMENT ON COLUMN public.concierge_inquiries.form_completed_at IS 'When user completed all intake form fields (before payment)';
COMMENT ON COLUMN public.concierge_inquiries.payment_reminder_count IS 'Number of abandoned cart email reminders sent';
COMMENT ON COLUMN public.concierge_inquiries.draft_id IS 'Unique identifier for draft tracking';