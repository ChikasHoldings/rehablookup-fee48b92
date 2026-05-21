-- Seeker SMS opt-in / opt-out infrastructure (Phase 2 of the seeker
-- SMS audit). Adds two timestamp columns to seeker_profiles that
-- mirror the existing fields on `profiles` (provider table):
--
--   sms_opted_out_at — set when an inbound STOP / UNSUBSCRIBE / etc.
--                      keyword is received from this seeker's phone,
--                      cleared on START / UNSTOP. NOT NULL value =
--                      seeker has opted OUT of all marketing/
--                      transactional SMS. Verification OTP is the
--                      one exception (TCPA-compliant: it's user-
--                      initiated and operationally necessary).
--   sms_opted_in_at  — explicit opt-in timestamp, captured on START
--                      keyword OR at any future opt-in surface.
--
-- These columns are part of the compliance foundation for ANY future
-- seeker SMS feature (welcome SMS, alerts, etc.). twilio-sms-inbound
-- is being updated in the same pass to populate them.
--
-- Backfill: existing rows get NULL/NULL — meaning "no recorded
-- opt-in or opt-out state yet". This is intentional: it doesn't
-- assume opt-in (which would be a TCPA risk if any seeker SMS
-- marketing launches before they affirmatively consent) AND doesn't
-- assume opt-out (which would block the existing verification OTP
-- flow that seekers expect to work).
--
-- Idempotent: ADD COLUMN IF NOT EXISTS so re-apply is a no-op.

ALTER TABLE public.seeker_profiles
  ADD COLUMN IF NOT EXISTS sms_opted_out_at timestamptz,
  ADD COLUMN IF NOT EXISTS sms_opted_in_at  timestamptz;

-- Index to make the inbound-webhook's "find seeker by phone" lookup
-- fast. Phone is already E.164-normalized at write-time after the
-- Phase 1 frontend changes; this index supports the equality lookup
-- in twilio-sms-inbound when matching an inbound message's `From`
-- header to a seeker. Partial index so we only index rows with a
-- non-null phone.
CREATE INDEX IF NOT EXISTS idx_seeker_profiles_phone
  ON public.seeker_profiles(phone)
  WHERE phone IS NOT NULL;
