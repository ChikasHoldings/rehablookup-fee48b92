-- Add verification columns to facility_accreditations table
ALTER TABLE public.facility_accreditations
ADD COLUMN IF NOT EXISTS verification_number text,
ADD COLUMN IF NOT EXISTS verification_url text,
ADD COLUMN IF NOT EXISTS document_url text,
ADD COLUMN IF NOT EXISTS document_name text,
ADD COLUMN IF NOT EXISTS issuing_authority text,
ADD COLUMN IF NOT EXISTS notes text,
ADD COLUMN IF NOT EXISTS rejection_reason text;

-- Create index for efficient querying on verification_number
CREATE INDEX IF NOT EXISTS idx_facility_accreditations_verification_number 
ON public.facility_accreditations(verification_number) 
WHERE verification_number IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.facility_accreditations.verification_number IS 'License/certificate/member number for verification';
COMMENT ON COLUMN public.facility_accreditations.verification_url IS 'Optional public lookup URL';
COMMENT ON COLUMN public.facility_accreditations.document_url IS 'Uploaded certificate file URL';
COMMENT ON COLUMN public.facility_accreditations.document_name IS 'Original filename of uploaded document';
COMMENT ON COLUMN public.facility_accreditations.issuing_authority IS 'Authority that issued the accreditation';
COMMENT ON COLUMN public.facility_accreditations.notes IS 'Provider notes for admin review';
COMMENT ON COLUMN public.facility_accreditations.rejection_reason IS 'Reason for rejection if verification failed';