-- Add tracking columns to international_placement_cases for abandoned cart
ALTER TABLE public.international_placement_cases 
ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS form_completed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS payment_reminder_count INTEGER NOT NULL DEFAULT 0;

-- Add comment for clarity
COMMENT ON COLUMN public.international_placement_cases.email_verified_at IS 'Timestamp when client verified their email in the intake flow';
COMMENT ON COLUMN public.international_placement_cases.form_completed_at IS 'Timestamp when client completed the intake form (before payment)';
COMMENT ON COLUMN public.international_placement_cases.payment_reminder_count IS 'Number of abandoned cart reminder emails sent';