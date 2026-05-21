-- Add claim_request_id + purpose columns to phone_verification_codes.
--
-- The deployed edge functions `initiate-claim-sms-verification` and
-- `confirm-claim-verification-code` both query / write these columns,
-- but the original table DDL (migration 20251223221031) only ships the
-- 7 base columns (id, phone, code, expires_at, verified, attempts,
-- created_at). Every facility-claim SMS verification attempt was
-- failing with a schema error — the entire SMS leg of the 3-method
-- claim verification flow has been broken in production since the
-- functions were deployed.
--
-- Mirrors the existing email_verification_codes purpose taxonomy so
-- the two OTP tables stay analogous. Idempotent: IF NOT EXISTS on the
-- column adds + the constraint, DROP IF EXISTS on the constraint
-- recreate.

ALTER TABLE public.phone_verification_codes
  ADD COLUMN IF NOT EXISTS claim_request_id uuid,
  ADD COLUMN IF NOT EXISTS purpose text NOT NULL DEFAULT 'general';

-- Index the lookup the claim functions use most often. Existing rows
-- default to 'general' so the partial index is non-empty even on a
-- post-migration query.
CREATE INDEX IF NOT EXISTS idx_phone_verification_codes_claim_request
  ON public.phone_verification_codes(claim_request_id)
  WHERE claim_request_id IS NOT NULL;

-- Whitelist the purpose values. Allows additional purposes to be
-- added later by re-running the DROP + CREATE pattern (matches the
-- email_verification_codes_purpose_check migration).
ALTER TABLE public.phone_verification_codes
  DROP CONSTRAINT IF EXISTS phone_verification_codes_purpose_check;

ALTER TABLE public.phone_verification_codes
  ADD CONSTRAINT phone_verification_codes_purpose_check
  CHECK (purpose = ANY (ARRAY[
    'general'::text,
    'signup'::text,
    'claim_verification'::text,
    'profile_phone'::text
  ]));
