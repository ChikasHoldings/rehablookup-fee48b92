-- Provider onboarding foundation.
-- Idempotent — every ADD is gated by IF NOT EXISTS; every CHECK is gated on
-- pg_constraint absence. Re-running this migration on a populated DB is a
-- no-op.
BEGIN;

-- 1. profiles — provider-side user record gains onboarding + plan fields.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS email_verified_at timestamptz,
  ADD COLUMN IF NOT EXISTS plan text DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS onboarding_completed_at timestamptz,
  ADD COLUMN IF NOT EXISTS welcomed_at timestamptz,
  ADD COLUMN IF NOT EXISTS unsubscribed_provider_emails_at timestamptz;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='profiles_plan_chk') THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_plan_chk
      CHECK (plan IS NULL OR plan IN ('free','pro'));
  END IF;
END $$;

COMMENT ON COLUMN public.profiles.plan IS
  'Provider plan tier. Mirrored from facility_subscriptions.tier for the '
  'primary facility on webhook events. NULL or ''free'' means no paid plan.';
COMMENT ON COLUMN public.profiles.onboarding_completed_at IS
  'Set when the provider finishes /provider/onboarding (Step 5). NULL '
  'means they haven''t completed the wizard yet — landing on the wizard '
  'resumes from current_step.';
COMMENT ON COLUMN public.profiles.welcomed_at IS
  'Set the first time the welcome modal renders on the provider '
  'dashboard. NULL → modal shows next dashboard load.';
COMMENT ON COLUMN public.profiles.unsubscribed_provider_emails_at IS
  'Set when the seeker clicks an unsubscribe link in any Resend '
  'onboarding sequence email. All future sends in those sequences bail.';

-- 2. facilities — denormalized claim ownership signal.
ALTER TABLE public.facilities
  ADD COLUMN IF NOT EXISTS claim_owner_id uuid,
  ADD COLUMN IF NOT EXISTS claim_status text DEFAULT 'unclaimed';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname='facilities_claim_owner_id_fkey'
  ) THEN
    ALTER TABLE public.facilities
      ADD CONSTRAINT facilities_claim_owner_id_fkey
      FOREIGN KEY (claim_owner_id) REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname='facilities_claim_status_chk'
  ) THEN
    ALTER TABLE public.facilities
      ADD CONSTRAINT facilities_claim_status_chk
      CHECK (claim_status IN ('unclaimed','pending','claimed','disputed'));
  END IF;
END $$;

COMMENT ON COLUMN public.facilities.claim_owner_id IS
  'Denormalized current claim owner. Source of truth is the latest '
  'approved row in facility_claim_requests; this column lets the public '
  'directory filter without joining.';
COMMENT ON COLUMN public.facilities.claim_status IS
  '''unclaimed'' | ''pending'' | ''claimed'' | ''disputed''. Mirrors the '
  'facility_claim_requests.status of the latest active request, plus '
  '''claimed'' once an approval transfers ownership.';

-- 3. provider_onboarding_state — the wizard's per-user resume cursor.
CREATE TABLE IF NOT EXISTS public.provider_onboarding_state (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  current_step text NOT NULL DEFAULT 'account',
  mode text,
  plan text,
  selected_facility_id uuid REFERENCES public.facilities(id) ON DELETE SET NULL,
  initial_facility_name text,
  draft_facility_data jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname='provider_onboarding_state_current_step_chk'
  ) THEN
    ALTER TABLE public.provider_onboarding_state
      ADD CONSTRAINT provider_onboarding_state_current_step_chk
      CHECK (current_step IN (
        'account','verify_email','verify_phone','find_or_list','plan','build','completed'
      ));
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname='provider_onboarding_state_mode_chk'
  ) THEN
    ALTER TABLE public.provider_onboarding_state
      ADD CONSTRAINT provider_onboarding_state_mode_chk
      CHECK (mode IS NULL OR mode IN ('list','claim'));
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname='provider_onboarding_state_plan_chk'
  ) THEN
    ALTER TABLE public.provider_onboarding_state
      ADD CONSTRAINT provider_onboarding_state_plan_chk
      CHECK (plan IS NULL OR plan IN ('free','pro'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname='provider_onboarding_state_set_updated_at'
  ) AND EXISTS (
    SELECT 1 FROM pg_proc WHERE proname='set_updated_at_timestamp'
  ) THEN
    EXECUTE 'CREATE TRIGGER provider_onboarding_state_set_updated_at '
            'BEFORE UPDATE ON public.provider_onboarding_state '
            'FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_timestamp()';
  END IF;
END $$;

ALTER TABLE public.provider_onboarding_state ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy
    WHERE polname='provider_onboarding_state_owner_select' AND polrelid='public.provider_onboarding_state'::regclass
  ) THEN
    EXECUTE 'CREATE POLICY provider_onboarding_state_owner_select '
            'ON public.provider_onboarding_state FOR SELECT '
            'USING (user_id = auth.uid())';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy
    WHERE polname='provider_onboarding_state_owner_insert' AND polrelid='public.provider_onboarding_state'::regclass
  ) THEN
    EXECUTE 'CREATE POLICY provider_onboarding_state_owner_insert '
            'ON public.provider_onboarding_state FOR INSERT '
            'WITH CHECK (user_id = auth.uid())';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy
    WHERE polname='provider_onboarding_state_owner_update' AND polrelid='public.provider_onboarding_state'::regclass
  ) THEN
    EXECUTE 'CREATE POLICY provider_onboarding_state_owner_update '
            'ON public.provider_onboarding_state FOR UPDATE '
            'USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid())';
  END IF;
END $$;

COMMIT;
