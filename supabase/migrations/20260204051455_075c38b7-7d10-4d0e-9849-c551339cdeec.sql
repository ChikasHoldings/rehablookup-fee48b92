-- Add verified_at column to track actual verification time (not invalidation)
ALTER TABLE email_verification_codes 
ADD COLUMN IF NOT EXISTS verified_at TIMESTAMP WITH TIME ZONE;

-- Update existing legitimately verified records to have verified_at = created_at + 1 minute (estimate)
UPDATE email_verification_codes 
SET verified_at = created_at + INTERVAL '1 minute'
WHERE verified = true AND expires_at > created_at + INTERVAL '9 minutes';

-- Add index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_email_verification_codes_verified_at 
ON email_verification_codes(email, verified_at) 
WHERE verified_at IS NOT NULL;