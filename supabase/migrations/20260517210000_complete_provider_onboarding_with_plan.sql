-- Round-30 audit fix: make Free-plan finish atomic.
-- The client previously did:
--   1. UPDATE profiles SET plan='free' (separate txn, can fail silently)
--   2. UPDATE provider_onboarding_state SET current_step='completed'
--   3. CALL complete_provider_onboarding RPC (flips onboarding_completed_at)
-- If step 1 failed for any reason, the user was marked complete but
-- profile.plan stayed NULL. Now: one RPC does plan + state + flip
-- atomically, with the same profile-guard bypass.

CREATE OR REPLACE FUNCTION public.complete_provider_onboarding_with_plan(p_plan text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  uid uuid := auth.uid();
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = 'insufficient_privilege';
  END IF;
  -- Free is the only plan this RPC can set from the client. Pro is
  -- gated to the Stripe webhook (handled by enforce_profile_sensitive_column_guard).
  IF p_plan IS DISTINCT FROM 'free' THEN
    RAISE EXCEPTION 'Only free plan can be set via this RPC; Pro must come from Stripe webhook'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  -- Advance onboarding state
  UPDATE public.provider_onboarding_state
     SET current_step = 'completed',
         plan         = p_plan,
         updated_at   = now()
   WHERE user_id = uid
     AND current_step <> 'completed';

  -- Bypass profile guard so we can flip both plan + onboarding_completed_at
  PERFORM set_config('app.bypass_profile_guard', 'on', true);

  UPDATE public.profiles
     SET plan                    = COALESCE(plan, p_plan),
         onboarding_completed_at = COALESCE(onboarding_completed_at, now())
   WHERE user_id = uid;

  PERFORM set_config('app.bypass_profile_guard', 'off', true);

  RETURN jsonb_build_object('ok', true, 'user_id', uid, 'plan', p_plan);
EXCEPTION WHEN OTHERS THEN
  PERFORM set_config('app.bypass_profile_guard', 'off', true);
  RAISE;
END;
$$;

REVOKE ALL ON FUNCTION public.complete_provider_onboarding_with_plan(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.complete_provider_onboarding_with_plan(text) TO authenticated;
