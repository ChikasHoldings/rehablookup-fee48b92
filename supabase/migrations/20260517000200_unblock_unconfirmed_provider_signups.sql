-- ROOT-CAUSE FIX (round 19): unblock the 4 wizard-signup accounts stuck
-- with email_confirmed_at IS NULL due to register-provider-account v1.1.0
-- (which set email_confirm:false; signInWithPassword then rejected them
-- with "email_not_confirmed", surfacing the user-visible toast
-- "Account created, but we couldn't sign you in").
--
-- v1.2.0 of register-provider-account sets email_confirm:true upfront so
-- new signups don't hit this. This migration backfills the historical
-- accounts created under v1.1.0 — narrowed to provider accounts that
-- never received a magic-link confirmation (confirmation_sent_at IS NULL,
-- i.e. our admin.createUser path, never Supabase's signUp path).
--
-- Idempotent: a re-run is a no-op once the column is non-null.

UPDATE auth.users
SET email_confirmed_at = COALESCE(email_confirmed_at, now())
WHERE email_confirmed_at IS NULL
  AND confirmation_sent_at IS NULL
  AND raw_user_meta_data->>'account_type' IN ('provider', 'seeker');
