-- Add admission substatus for detailed tracking
ALTER TABLE public.concierge_inquiries
ADD COLUMN IF NOT EXISTS admission_substatus text NOT NULL DEFAULT 'pending';

-- Add index for filtering
CREATE INDEX IF NOT EXISTS idx_concierge_inquiries_admission_substatus
ON public.concierge_inquiries (admission_substatus)
WHERE admission_substatus != 'pending';

COMMENT ON COLUMN public.concierge_inquiries.admission_substatus IS 'Detailed admission tracking: pending, contact_initiated, screening, accepted, admission_scheduled, admitted';