-- Round-30 merge: onboarding step reorder
-- ─────────────────────────────────────────
-- The unified provider onboarding wizard now runs:
--   account → verify_email → find_or_list → build → plan → completed
-- (Plan moved from BEFORE build to AFTER build.)
--
-- Migrate any in-flight rows currently sitting at current_step='plan'
-- forward to 'build', since under the old ordering "plan" was BEFORE
-- the listing-builder; those users still need to build. Their plan
-- choice (provider_onboarding_state.plan) is preserved — PlanStep will
-- pre-select whatever they originally picked when they reach it again.
--
-- This migration is idempotent and gated so it's a no-op on re-run.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'provider_onboarding_state'
  ) THEN
    -- Move stuck-at-plan rows forward to 'build'. These are users who
    -- saw the OLD pre-build plan picker but never finished publishing.
    UPDATE public.provider_onboarding_state
    SET current_step = 'build',
        updated_at   = now()
    WHERE current_step = 'plan';

    RAISE NOTICE
      'Reordered onboarding: % rows advanced from plan→build',
      (SELECT COUNT(*) FROM public.provider_onboarding_state WHERE current_step = 'build');
  END IF;
END $$;
