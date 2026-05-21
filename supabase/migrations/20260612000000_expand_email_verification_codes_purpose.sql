-- ROOT-CAUSE FIX for the broken signup workflow (2026-05-17 audit).
--
-- The deployed send-verification-code v2.0.0 defaults purpose='signup'
-- (introduced when the function added password-reset support), but the
-- original CHECK constraint on email_verification_codes.purpose only
-- accepted ('general', 'claim_verification'). Every signup INSERT was
-- hitting check_violation and returning HTTP 500 "Failed to create
-- verification code", which the wizard surfaces as a generic
-- "Couldn't send a verification code" toast.
--
-- Symptom reported by users: "no email is being sent, verification step
-- not loading, entire signup/claim process broken end-to-end."
--
-- Fix: expand the CHECK constraint to cover the deployed function's
-- purpose taxonomy. Idempotent: DROP IF EXISTS + re-ADD.
--
-- Verified live after apply: send-verification-code → 200, code row
-- written with purpose='signup', verify-code → 200, verified=true.

ALTER TABLE public.email_verification_codes
  DROP CONSTRAINT IF EXISTS email_verification_codes_purpose_check;

ALTER TABLE public.email_verification_codes
  ADD CONSTRAINT email_verification_codes_purpose_check
  CHECK (purpose = ANY (ARRAY[
    'general'::text,
    'signup'::text,
    'claim_verification'::text,
    'password_reset'::text,
    'reply_email'::text
  ]));
