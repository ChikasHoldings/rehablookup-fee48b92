# Onboarding hardening — round 2

**Date:** 2026-05-17 (second pass)
**Anchor:** `docs/onboarding-audit-2026-05-17.md`, `docs/onboarding-fixes-2026-05-17.md`
**Scope:** end-to-end implementation of every outstanding item that blocks "claim or list a facility → 6-digit email verification → Pro payment → land in the provider panel" with zero silent failures.

## Root-cause fix — missing `profiles` row for providers

The audit's drip-enqueue, welcome-modal-trigger, photo-cap, and welcome-email gaps all share one root cause: there was **no `auth.users` → `profiles` trigger for providers**. Only the seeker trigger exists (`handle_new_seeker`). The wizard's `register-provider-account` path therefore left providers without a `profiles` row, and every downstream `UPDATE profiles SET ... WHERE user_id = uid` silently no-op'd.

**Fix:** new migration `20260529000000_provider_profile_auto_create.sql` adds `handle_new_provider()` mirroring the seeker trigger and back-fills any existing provider accounts. Applied to live DB. `AccountStep` also performs a defensive `upsert` so even a trigger failure doesn't break the wizard.

Result: every wizard write to `profiles` now lands. `email_verified_at`, `phone_verified_at`, `plan`, `onboarding_completed_at`, `welcomed_at` all persist.

## Other hardening shipped this round

1. **`verify_phone` dead-end removed.** `Onboarding.tsx` used to render a `PlaceholderStep` for `current_step='verify_phone'`. Nothing ever set that state (phone verification happens inside `FindOrListStep`), so the placeholder was unreachable dead code. Routed `verify_phone` → `FindOrListStep` for safety and deleted `PlaceholderStep.tsx`.

2. **Direct-entry plan-selection gate on `/provider/claim/:slug`.** A signed-in user landing directly on the claim URL previously bypassed the wizard's PlanStep and claimed at whatever plan they happened to have. `ClaimWizard` now reads `profiles.plan` + `provider_onboarding_state.plan`; if neither is set and `onboarding_completed_at IS NULL`, redirect to `/provider/onboarding?intent=claim&facility_id=<id>` so they pick Free vs Pro first.

3. **Same gate on `/provider/onboarding/new-listing`.** `NewListingForm` now applies the identical plan check.

4. **Single-flight `create-checkout`.** A duplicated tab or impatient double-click would create two Stripe Checkout sessions before the user paid either. `create-checkout` now searches for an `open` Checkout session for the same customer in the last 30 minutes and returns its URL instead. Prevents the double-billing surface noted in the original audit (D2 follow-up).

5. **Stripe webhook dedup-claim observability.** `stripe-webhook` previously logged-and-continued when `claim_stripe_webhook_event` failed, hiding the failure. Now writes an `admin_notifications` row of type `webhook_dedup_failure` so silent retries don't accumulate unnoticed.

6. **ClaimSubmitted CTA polish.** "Back to onboarding" replaced with a primary "Go to dashboard" CTA so claim-mode users land in the provider panel exactly as the spec requires.

7. **Stale ClaimWizard docstring** updated. The old "Phase 2 ships steps 1-2, steps 3-5 are placeholders" comment is now accurate: all five steps are live.

## End-to-end flows now operational

**Signup → list a new facility:**
`/provider/onboarding` → AccountStep (creates auth + profile via trigger + defensive upsert) → VerifyEmailStep (6-digit OTP via send-verification-code + verify-code; verify-code writes `profiles.email_verified_at` server-side) → FindOrListStep (inline phone OTP; verify-sms-code authenticates via JWT) → PlanStep (Free → advance; Pro → Stripe Checkout via create-checkout with single-flight) → BuildStep → `/provider/onboarding/new-listing` → ProviderSignup multi-step → `complete_provider_onboarding()` RPC → `/provider/billing` (provider panel).

**Signup → claim existing facility:**
`/provider/onboarding?intent=claim&facility_id=…` (or facility page CTA) → same wizard → BuildStep with `mode='claim'` → `/provider/claim/<slug>` → ClaimWizard → submit → `complete_provider_onboarding()` RPC → `/provider/claim/<slug>/submitted` (also fires the RPC as a safety net) → "Go to dashboard" → provider panel.

**Pro payment:**
PlanStep → create-checkout (Stripe single-flight) → Stripe-hosted Checkout → success returns to PlanStep with `?checkout=success` → 10s poll of `facility_subscriptions` → stripe-webhook writes `facility_subscriptions.tier='pro'` AND mirrors `profiles.plan='pro'` (service-role bypasses F1 guard) → wizard advances → builder runs with Pro photo cap + video unlock.

## Migrations applied

| File | Live? | What it does |
|---|---|---|
| `20260528000000_profile_sensitive_column_guard.sql` | yes | Trigger blocking client-side `plan='pro'`, `email_verified_at`, `onboarding_completed_at` writes; `complete_provider_onboarding()` RPC. |
| `20260529000000_provider_profile_auto_create.sql` | yes | `handle_new_provider()` trigger + backfill of existing provider auth.users. |

Both were applied via Supabase MCP `apply_migration` and verified by querying `pg_trigger`/`pg_proc`.

## What remains for the broader monetization audit

This pass closes signup + claim + Pro payment + onboarding-into-panel. The monetization breakdown in `/root/.claude/plans/immutable-munching-rainbow.md` still covers: Featured add-on (`create-checkout-session` is missing), Concierge add-on (same), admin panel completeness, dunning, smoke tests.
