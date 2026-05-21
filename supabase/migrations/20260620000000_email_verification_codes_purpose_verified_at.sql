-- Defensive schema sync for email_verification_codes.
--
-- The deployed edge functions (send-verification-code v2.1.0,
-- confirm-password-reset, verify-code) all read / write the columns
-- `purpose` (text) and `verified_at` (timestamptz) on
-- email_verification_codes. The original table DDL (migration
-- 20251214215909) shipped only id/email/code/expires_at/attempts/
-- verified/created_at. The columns were added on the live DB during
-- the deploy of those functions, but the corresponding repo migration
-- was lost. This migration backfills the column adds idempotently so
-- a fresh clone matches production.
--
-- The CHECK constraint on purpose is already maintained by migration
-- 20260612000000_expand_email_verification_codes_purpose.sql — that
-- migration will succeed against this schema because the column add
-- here uses DEFAULT 'general' which satisfies the constraint values.

ALTER TABLE public.email_verification_codes
  ADD COLUMN IF NOT EXISTS purpose text NOT NULL DEFAULT 'general',
  ADD COLUMN IF NOT EXISTS verified_at timestamptz;

-- Backfill purpose='signup' for any existing pre-purpose rows. They
-- were all signup OTPs, so 'general' (the new DEFAULT for INSERTs
-- before this migration ran) would mis-label them.
UPDATE public.email_verification_codes
   SET purpose = 'signup'
 WHERE purpose = 'general';

CREATE INDEX IF NOT EXISTS idx_email_verification_codes_email_purpose
  ON public.email_verification_codes(email, purpose);
