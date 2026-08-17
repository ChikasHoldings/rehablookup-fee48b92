-- ============================================================================
-- Featured advertising becomes independent of Pro
-- ============================================================================
--
-- PROBLEM
-- ───────
-- `facility_subscriptions` was modelled as "the Pro subscription row, which
-- also carries add-on flags":
--
--     tier text NOT NULL DEFAULT 'pro' CHECK (tier IN ('pro'))
--
-- A row therefore could not exist unless it was a Pro row. That single
-- constraint is what made every downstream Featured gate necessary:
--
--   • create-checkout-session returned 409 NO_SUBSCRIPTION / 409 PRO_REQUIRED
--     for intent='add_addon', because there was nowhere to record Featured for
--     a facility without Pro.
--   • activateFeaturedAddon() hard-refused with
--     "no facility_subscriptions row exists; Pro upgrade must precede Featured".
--
-- The product contract is that these are SEPARATE products, not a tier ladder:
--
--     Free      = be listed
--     Pro       = enhance and measure your listing
--     Featured  = buy clearly labeled additional exposure
--     Verified  = earned, never sold
--     Organic ranking = never for sale
--
-- so a facility must be able to hold Featured with no Pro subscription at all.
--
-- WHAT THIS CHANGES
-- ─────────────────
-- `tier` describes the LISTING PLAN only ('free' | 'pro'). Advertising lives
-- in its own columns (`has_featured`, `featured_stripe_subscription_id`,
-- `featured_current_period_end`) and is orthogonal to tier. The four valid
-- states are therefore all representable:
--
--     tier='free', has_featured=false   → Free only        (usually NO row)
--     tier='pro',  has_featured=false   → Pro only
--     tier='free', has_featured=true    → Featured only    ← newly possible
--     tier='pro',  has_featured=true    → Pro + Featured
--
-- WHY THIS DOES NOT LEAK PRO
-- ──────────────────────────
-- Pro entitlement has exactly one definition, `public.has_active_pro()`, and it
-- predicates on `tier = 'pro'`. A tier='free' row can never satisfy it. The
-- client mirror (`isActiveProRow` in src/lib/proAccess.ts) predicates on
-- `tier !== 'pro' → false` as well. This migration deliberately does NOT touch
-- either one.
--
-- A Featured-only row must carry status='active', because
-- get-featured-rotation INNER JOINs facility_subscriptions and filters
-- `facility_subscriptions.status = 'active'` to decide whether a paid placement
-- may render. That is precisely the "B3 landmine" the Stage-3 entitlement audit
-- documented: any query that infers Pro from `status='active'` WITHOUT a tier
-- predicate becomes an entitlement leak the moment this migration lands. Those
-- call sites were audited in the same change; the canonical ones
-- (has_active_pro, isActiveProRow, get-facility-plan, enforce-plan-grace-cron,
-- send-lead-message, get-featured-facilities) all already filter tier='pro'.
--
-- WHY THE DEFAULT IS DROPPED
-- ──────────────────────────
-- `DEFAULT 'pro'` means any INSERT that forgets `tier` silently mints a Pro
-- entitlement. With tier='free' now legal that footgun is live, so the default
-- is removed: every writer must state which listing plan it is recording. The
-- only application writer today is the stripe-webhook Pro upsert, which sets
-- tier:'pro' explicitly, plus the new Featured-only insert, which sets 'free'.
--
-- Organic ranking is untouched: calculate-ranking-scores reads neither
-- facility_subscriptions nor any Featured column (enforced by
-- scripts/check-directory-trust-ranking.mjs).
-- ============================================================================

BEGIN;

-- 1. Widen the tier domain to the two LISTING plans.
--    The constraint name is the implicit one Postgres generated for the inline
--    CHECK added by 20260516010000_monetization_foundation.sql. IF EXISTS keeps
--    this idempotent and safe on a database where it was already renamed.
ALTER TABLE public.facility_subscriptions
  DROP CONSTRAINT IF EXISTS facility_subscriptions_tier_check;

ALTER TABLE public.facility_subscriptions
  ADD CONSTRAINT facility_subscriptions_tier_check
  CHECK (tier IN ('pro', 'free'));

-- 2. Remove the DEFAULT so no writer can create a Pro entitlement by omission.
ALTER TABLE public.facility_subscriptions
  ALTER COLUMN tier DROP DEFAULT;

-- 3. A Featured-only row has no Pro subscription, so it must not carry Pro
--    Stripe identifiers. This is the invariant that keeps the webhook's
--    Pro-status updates (which key on stripe_subscription_id) from ever
--    touching a Featured-only row.
ALTER TABLE public.facility_subscriptions
  DROP CONSTRAINT IF EXISTS facility_subscriptions_free_tier_has_no_pro_sub;

ALTER TABLE public.facility_subscriptions
  ADD CONSTRAINT facility_subscriptions_free_tier_has_no_pro_sub
  CHECK (tier <> 'free' OR stripe_subscription_id IS NULL);

COMMENT ON COLUMN public.facility_subscriptions.tier IS
  'LISTING plan only: ''free'' or ''pro''. Advertising is NOT a tier — Featured '
  'lives in has_featured / featured_stripe_subscription_id / '
  'featured_current_period_end and is independent of this column. Pro '
  'entitlement is has_active_pro(), which requires tier = ''pro''. A '
  'tier=''free'' row exists only to carry an independent Featured purchase.';

COMMENT ON COLUMN public.facility_subscriptions.has_featured IS
  'Featured advertising is active on this facility. Independent of tier: a '
  'tier=''free'' row with has_featured=true is a Featured-only facility. Grants '
  'sponsored placement inventory ONLY — never Pro capabilities, never '
  'verification, never organic ranking influence.';

COMMIT;
