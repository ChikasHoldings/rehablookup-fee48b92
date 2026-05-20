-- Plan-gate hardening (Prompt 1, 2026-05-20).
-- ─────────────────────────────────────────────
-- Three goals:
--   (a) Backfill `profiles.plan='free'` for any legacy row with NULL
--       that has no active Pro `facility_subscriptions` row. Rows that
--       DO have an active Pro subscription are left alone — their
--       `profiles.plan` is reasserted to 'pro' (defense-in-depth) but
--       NULL → 'free' only applies to non-Pro accounts.
--   (b) Tighten `profiles.plan` to NOT NULL after backfill so future
--       INSERTs / unintended NULL UPDATEs are rejected at the column
--       level. The `profiles_plan_chk` CHECK constraint stays
--       (`'free' | 'pro'`); we just remove the NULL escape hatch.
--   (c) Replace `complete_provider_onboarding()` with a variant that
--       refuses to flip `onboarding_completed_at` when the caller has
--       no plan recorded — neither in `provider_onboarding_state.plan`
--       nor as an active Pro `facility_subscriptions` row. This closes
--       the legacy hole where the no-plan RPC could mark a provider
--       complete without an explicit choice. The `_with_plan` RPC
--       (atomic Free completion) is the only client-callable path.
--
-- Idempotent: every DO-block is gated so re-runs are no-ops. Safe to
-- ship in CI on every Vercel deploy.
--
-- See docs/monetization-plan-gate-audit-2026-05-20.md for the full
-- finding tree.

BEGIN;

-- ─── (a) Backfill ──────────────────────────────────────────────────
DO $$
DECLARE
  null_count int;
  pro_count  int;
BEGIN
  -- (a1) NULL → 'free' for non-Pro accounts
  SELECT count(*) INTO null_count
  FROM public.profiles p
  WHERE p.plan IS NULL
    AND NOT EXISTS (
      SELECT 1 FROM public.facility_subscriptions fs
      WHERE fs.provider_id = p.user_id
        AND fs.tier = 'pro'
        AND fs.status = 'active'
    );

  IF null_count > 0 THEN
    UPDATE public.profiles p
       SET plan = 'free'
     WHERE p.plan IS NULL
       AND NOT EXISTS (
         SELECT 1 FROM public.facility_subscriptions fs
         WHERE fs.provider_id = p.user_id
           AND fs.tier = 'pro'
           AND fs.status = 'active'
       );
    RAISE NOTICE 'plan-gate backfill: % profiles set to plan=free', null_count;
  END IF;

  -- (a2) NULL → 'pro' for accounts that ARE active Pro subscribers
  SELECT count(*) INTO pro_count
  FROM public.profiles p
  WHERE p.plan IS NULL
    AND EXISTS (
      SELECT 1 FROM public.facility_subscriptions fs
      WHERE fs.provider_id = p.user_id
        AND fs.tier = 'pro'
        AND fs.status = 'active'
    );

  IF pro_count > 0 THEN
    -- Bypass the sensitive-column guard for this server-side mirror.
    PERFORM set_config('app.bypass_profile_guard', 'on', true);
    UPDATE public.profiles p
       SET plan = 'pro'
     WHERE p.plan IS NULL
       AND EXISTS (
         SELECT 1 FROM public.facility_subscriptions fs
         WHERE fs.provider_id = p.user_id
           AND fs.tier = 'pro'
           AND fs.status = 'active'
       );
    PERFORM set_config('app.bypass_profile_guard', 'off', true);
    RAISE NOTICE 'plan-gate backfill: % profiles set to plan=pro (mirrored from facility_subscriptions)', pro_count;
  END IF;
END $$;

-- ─── (b) Tighten profiles.plan to NOT NULL ─────────────────────────
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'profiles'
      AND column_name  = 'plan'
      AND is_nullable  = 'YES'
  ) AND NOT EXISTS (
    -- Safety: bail out without ALTER if backfill missed any rows.
    SELECT 1 FROM public.profiles WHERE plan IS NULL
  ) THEN
    ALTER TABLE public.profiles ALTER COLUMN plan SET NOT NULL;
    RAISE NOTICE 'plan-gate: profiles.plan tightened to NOT NULL';
  END IF;
END $$;

-- The `enforce_profile_sensitive_column_guard` trigger already
-- protects plan='pro' elevations. We don't relax it here.

-- ─── (c) Tighten complete_provider_onboarding (no-plan variant) ────
-- The original definition lives in
-- 20260528000000_profile_sensitive_column_guard.sql. We REPLACE the
-- body to refuse completion when the caller has NEITHER a non-null
-- state.plan NOR an active Pro facility_subscriptions row. The
-- _with_plan variant (`complete_provider_onboarding_with_plan`) is the
-- canonical client path for Free completion; the no-plan variant is
-- retained as a server-side / legacy backstop with the new gate.

CREATE OR REPLACE FUNCTION public.complete_provider_onboarding()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  uid             uuid := auth.uid();
  recorded_plan   text;
  has_active_pro  boolean;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = 'insufficient_privilege';
  END IF;

  SELECT plan INTO recorded_plan
    FROM public.provider_onboarding_state
   WHERE user_id = uid;

  SELECT EXISTS (
    SELECT 1 FROM public.facility_subscriptions fs
     WHERE fs.provider_id = uid AND fs.tier='pro' AND fs.status='active'
  ) INTO has_active_pro;

  IF recorded_plan IS NULL AND NOT has_active_pro THEN
    -- No explicit plan choice on file and no Pro subscription either.
    -- Refuse to mark complete so the caller is forced through PlanStep.
    RAISE EXCEPTION
      'Cannot mark onboarding complete without a plan choice. Call complete_provider_onboarding_with_plan(''free'') from PlanStep, or pay through Stripe Checkout for Pro.'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  UPDATE public.provider_onboarding_state
     SET current_step = 'completed',
         -- If state.plan is NULL but the user IS an active Pro subscriber,
         -- mirror the plan locally so future reads agree.
         plan         = COALESCE(plan, CASE WHEN has_active_pro THEN 'pro' ELSE NULL END)
   WHERE user_id = uid
     AND current_step <> 'completed';

  PERFORM set_config('app.bypass_profile_guard', 'on', true);
  UPDATE public.profiles
     SET onboarding_completed_at = COALESCE(onboarding_completed_at, now()),
         plan                    = COALESCE(plan, CASE WHEN has_active_pro THEN 'pro' ELSE 'free' END)
   WHERE user_id = uid;
  PERFORM set_config('app.bypass_profile_guard', 'off', true);

  RETURN jsonb_build_object('ok', true, 'user_id', uid, 'plan', COALESCE(recorded_plan, CASE WHEN has_active_pro THEN 'pro' ELSE 'free' END));
EXCEPTION WHEN OTHERS THEN
  PERFORM set_config('app.bypass_profile_guard', 'off', true);
  RAISE;
END;
$$;

COMMENT ON FUNCTION public.complete_provider_onboarding() IS
  'Atomically marks provider_onboarding_state.current_step=completed '
  'and profiles.onboarding_completed_at=now() for the authenticated '
  'user. Refuses to flip when neither state.plan nor an active Pro '
  'facility_subscriptions row exists — the caller must go through '
  'PlanStep (complete_provider_onboarding_with_plan) or Stripe '
  'Checkout. Retained for legacy / server-side callers; clients should '
  'prefer the _with_plan variant.';

-- ─── (d) Belt-and-braces: trigger that blocks state row from being
-- marked completed if plan is NULL AND no active Pro subscription.
-- This catches direct REST/PostgREST UPDATEs that bypass the RPCs.

CREATE OR REPLACE FUNCTION public.enforce_onboarding_state_completion_requires_plan()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  has_active_pro boolean;
BEGIN
  IF NEW.current_step = 'completed' AND OLD.current_step <> 'completed' THEN
    IF NEW.plan IS NULL THEN
      SELECT EXISTS (
        SELECT 1 FROM public.facility_subscriptions fs
         WHERE fs.provider_id = NEW.user_id AND fs.tier='pro' AND fs.status='active'
      ) INTO has_active_pro;

      IF NOT has_active_pro THEN
        RAISE EXCEPTION
          'provider_onboarding_state cannot move to completed without a recorded plan and no active Pro subscription. Set plan via complete_provider_onboarding_with_plan or Stripe webhook first.'
          USING ERRCODE = 'check_violation';
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'provider_onboarding_state_completion_plan_chk'
  ) THEN
    EXECUTE 'CREATE TRIGGER provider_onboarding_state_completion_plan_chk '
            'BEFORE UPDATE ON public.provider_onboarding_state '
            'FOR EACH ROW EXECUTE FUNCTION public.enforce_onboarding_state_completion_requires_plan()';
  END IF;
END $$;

COMMENT ON FUNCTION public.enforce_onboarding_state_completion_requires_plan() IS
  'BEFORE UPDATE guard on provider_onboarding_state. Blocks the '
  'current_step → completed transition unless the row has a recorded '
  'plan OR the owner has an active Pro facility_subscriptions row. '
  'Service-role writes from the Stripe webhook satisfy this via the '
  'facility_subscriptions check since the webhook updates that row '
  'BEFORE the state row in the same transaction.';

COMMIT;
