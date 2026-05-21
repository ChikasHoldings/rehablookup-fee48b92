-- profiles UPDATE policy is `(auth.uid() = user_id)` with no column
-- restriction, which would otherwise let an authenticated user elevate
-- plan='pro', flip email_verified_at, or flip onboarding_completed_at
-- directly via PostgREST. This trigger blocks those specific
-- transitions when the caller is authenticated. Service-role writes
-- (edge functions, cron, webhook) have no JWT, so auth.uid() returns
-- NULL and the trigger is a no-op for them.
--
-- complete_provider_onboarding() is the sanctioned RPC for the
-- onboarding_completed_at flip; it sets a session GUC to bypass.

BEGIN;

CREATE OR REPLACE FUNCTION public.enforce_profile_sensitive_column_guard()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  IF COALESCE(NEW.plan, 'free') = 'pro'
     AND COALESCE(OLD.plan, 'free') <> 'pro' THEN
    RAISE EXCEPTION
      'Plan elevation to pro must be performed by the verified Stripe webhook'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  IF NEW.onboarding_completed_at IS NOT NULL
     AND OLD.onboarding_completed_at IS NULL
     AND current_setting('app.bypass_profile_guard', true) IS DISTINCT FROM 'on' THEN
    RAISE EXCEPTION
      'profiles.onboarding_completed_at must be flipped via complete_provider_onboarding()'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

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

  UPDATE public.provider_onboarding_state
     SET current_step = 'completed'
   WHERE user_id = uid
     AND current_step <> 'completed';

  -- Opt-in to the sensitive-column guard bypass for this transaction.
  PERFORM set_config('app.bypass_profile_guard', 'on', true);

  UPDATE public.profiles
     SET onboarding_completed_at = COALESCE(onboarding_completed_at, now())
   WHERE user_id = uid;

  PERFORM set_config('app.bypass_profile_guard', 'off', true);

  RETURN jsonb_build_object('ok', true, 'user_id', uid);
EXCEPTION WHEN OTHERS THEN
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
