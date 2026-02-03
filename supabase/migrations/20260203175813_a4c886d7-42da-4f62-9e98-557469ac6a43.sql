-- Add email_verified column to international_placement_cases
ALTER TABLE public.international_placement_cases 
ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT false;

-- Add index for filtering by verification status
CREATE INDEX IF NOT EXISTS idx_intl_cases_email_verified 
ON public.international_placement_cases(email_verified);

-- Add pending_verification as valid status
COMMENT ON COLUMN public.international_placement_cases.status IS 'Case status: pending_verification, in_review, matched, placed, closed';