-- Provider profile auto-creation + onboarding hardening.
--
-- Background: an existing trigger handle_new_seeker() creates a
-- seeker_profiles row on auth.users INSERT when raw_user_meta_data
-- account_type='seeker'. There is no symmetric trigger for providers,
-- so register-provider-account → admin.createUser leaves the user
-- without a profiles row. Every downstream wizard write to profiles
-- (email_verified_at, phone_verified_at, plan, onboarding_completed_at,
-- welcomed_at) then silently no-ops, breaking welcome modal triggering,
-- drip enqueue, plan benefits, and the already-onboarded redirect.
--
-- This migration adds handle_new_provider() mirroring the seeker
-- trigger, attaches it to auth.users INSERT, and back-fills missing
-- profiles rows for any existing provider account.
--
-- Idempotent: trigger creation gated on pg_trigger; backfill is an
-- INSERT ... ON CONFLICT DO NOTHING.

BEGIN;

CREATE OR REPLACE FUNCTION public.handle_new_provider()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only create a profiles row for explicit provider signups.
  -- Seeker signups go through handle_new_seeker(); admin invites use
  -- their own path.
  IF (NEW.raw_user_meta_data ->> 'account_type') = 'provider' THEN
    INSERT INTO public.profiles (
      user_id,
      first_name,
      last_name,
      email
    )
    VALUES (
      NEW.id,
      NEW.raw_user_meta_data ->> 'first_name',
      NEW.raw_user_meta_data ->> 'last_name',
      NEW.email
    )
    ON CONFLICT (user_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.handle_new_provider() IS
  'Seeds a profiles row on auth.users INSERT when '
  'raw_user_meta_data.account_type = ''provider''. Without this trigger, '
  'every wizard write to profiles silently no-ops.';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_created_provider'
  ) THEN
    EXECUTE 'CREATE TRIGGER on_auth_user_created_provider '
            'AFTER INSERT ON auth.users '
            'FOR EACH ROW EXECUTE FUNCTION public.handle_new_provider()';
  END IF;
END $$;

-- Backfill any provider accounts that predate this trigger.
INSERT INTO public.profiles (user_id, first_name, last_name, email)
SELECT
  u.id,
  u.raw_user_meta_data ->> 'first_name',
  u.raw_user_meta_data ->> 'last_name',
  u.email
FROM auth.users u
LEFT JOIN public.profiles p ON p.user_id = u.id
WHERE p.user_id IS NULL
  AND (u.raw_user_meta_data ->> 'account_type') = 'provider'
ON CONFLICT (user_id) DO NOTHING;

COMMIT;
