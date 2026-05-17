-- Provider-onboarding fixes for findings C1, C5, C6, C9.
--
-- C1/C5/C6: profiles UPDATE policy is `(auth.uid() = user_id)` with no
-- column restriction. An authenticated user can elevate plan='pro',
-- flip onboarding_completed_at, or flip email_verified_at directly via
-- PostgREST. We add a BEFORE UPDATE trigger that blocks those specific
-- transitions when the caller is authenticated (auth.uid() IS NOT
-- NULL). Service-role / cron / webhook writes have no JWT, so
-- auth.uid() returns NULL and the trigger is a no-op for them.
--
-- C9: ClaimWizard never advanced provider_onboarding_state.current_step
-- to 'completed' nor flipped profiles.onboarding_completed_at, so the
-- claim path never tripped the already-onboarded gate nor the drip-
-- enqueue trigger. We add a SECURITY DEFINER RPC
-- public.complete_provider_onboarding() that performs both writes
-- atomically against auth.uid() (no body-supplied user id), and is
-- callable from both ClaimWizard and ProviderSignup. The RPC bypasses
-- the trigger above because it runs as the function owner (definer
-- rights), not as the calling authenticated role.
--
-- Idempotent: every CREATE OR REPLACE is safe to re-run; the trigger
-- attach is gated on pg_trigger.

BEGIN;

-- ============================================================
-- F1 — sensitive-column guard
-- ============================================================

CREATE OR REPLACE FUNCTION public.enforce_profile_sensitive_column_guard()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Edge functions and cron use the service-role key without a JWT,
  -- so auth.uid() returns NULL. Trigger is a no-op for them.
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  -- C1 — block plan elevation to 'pro' from the authenticated client.
  -- Stripe webhook (service role) is the only sanctioned writer.
  IF COALESCE(NEW.plan, 'free') = 'pro'
     AND COALESCE(OLD.plan, 'free') <> 'pro' THEN
    RAISE EXCEPTION
      'Plan elevation to pro must be performed by the verified Stripe webhook'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  -- C5 — block onboarding_completed_at flip from NULL → set unless via
  -- the complete_provider_onboarding() RPC (which runs as SECURITY
  -- DEFINER and therefore as a different effective role; auth.uid()
  -- inside that definer body still reflects the calling user, so we
  -- use a session-level GUC to opt-in to the bypass).
  IF NEW.onboarding_completed_at IS NOT NULL
     AND OLD.onboarding_completed_at IS NULL
     AND current_setting('app.bypass_profile_guard', true) IS DISTINCT FROM 'on' THEN
    RAISE EXCEPTION
      'profiles.onboarding_completed_at must be flipped via complete_provider_onboarding()'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  -- C6 — block email_verified_at flip from NULL → set unless via the
  -- verify-code edge function (service role, no JWT). The wizard's
  -- VerifyEmailStep used to do this client-side; we remove that write
  -- in the same fix set.
  IF NEW.email_verified_at IS NOT NULL
     AND OLD.email_verified_at IS NULL THEN
    RAISE EXCEPTION
      'profiles.email_verified_at must be set server-side after OTP verification'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.enforce_profile_sensitive_column_guard() IS
  'BEFORE UPDATE guard on profiles. Blocks authenticated clients from '
  'elevating plan to pro, flipping email_verified_at, or flipping '
  'onboarding_completed_at directly. Service-role writes bypass via '
  'auth.uid() IS NULL.';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'profiles_sensitive_column_guard'
  ) THEN
    EXECUTE 'CREATE TRIGGER profiles_sensitive_column_guard '
            'BEFORE UPDATE ON public.profiles '
            'FOR EACH ROW EXECUTE FUNCTION public.enforce_profile_sensitive_column_guard()';
  END IF;
END $$;

-- ============================================================
-- F5 — atomic completion RPC for ClaimWizard + ProviderSignup
-- ============================================================

CREATE OR REPLACE FUNCTION public.complete_provider_onboarding()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = 'insufficient_privilege';
  END IF;

  -- Best-effort wizard-state advance. If the row doesn't exist
  -- (user came in via /auth/signup directly without ever touching
  -- the wizard), we skip rather than fail.
  UPDATE public.provider_onboarding_state
     SET current_step = 'completed'
   WHERE user_id = uid
     AND current_step <> 'completed';

  -- profiles.onboarding_completed_at flip — gated by the guard
  -- trigger unless we toggle the bypass GUC for this session.
  PERFORM set_config('app.bypass_profile_guard', 'on', true);

  UPDATE public.profiles
     SET onboarding_completed_at = COALESCE(onboarding_completed_at, now())
   WHERE user_id = uid;

  PERFORM set_config('app.bypass_profile_guard', 'off', true);

  RETURN jsonb_build_object('ok', true, 'user_id', uid);
EXCEPTION WHEN OTHERS THEN
  -- Always clear the bypass GUC if we threw partway through.
  PERFORM set_config('app.bypass_profile_guard', 'off', true);
  RAISE;
END;
$$;

COMMENT ON FUNCTION public.complete_provider_onboarding() IS
  'Atomically marks provider_onboarding_state.current_step=completed '
  'and profiles.onboarding_completed_at=now() for the authenticated '
  'user. Called from ClaimWizard (mode=claim) and ProviderSignup '
  '(mode=list) on successful publish/submit.';

REVOKE ALL ON FUNCTION public.complete_provider_onboarding() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.complete_provider_onboarding() TO authenticated;

COMMIT;
