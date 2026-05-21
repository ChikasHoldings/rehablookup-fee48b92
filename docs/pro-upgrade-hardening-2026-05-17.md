# Pro upgrade workflow — full hardening

**Date:** 2026-05-17 (round 4)
**Anchors:** `docs/onboarding-audit-2026-05-17.md`, `docs/onboarding-hardening-2026-05-17b.md`, `docs/claim-flow-hardening-2026-05-17.md`
**Goal:** every provider who selects the $99/mo Pro Plan reliably receives every Pro benefit, with no double-application, no silent failures, no partial state — all surfaces (frontend, backend, DB, edge functions) consistent.

## Findings + fixes

### F1. Pro benefits were activated only in one Stripe-event branch
**Before:** `checkout.session.completed` (pro_subscription mode) did the inline activation: set `facilities.featured=true`, +50 ranking on the target facility, +50 on every other owned facility, send provider notification. `customer.subscription.created` mirrored only `profiles.plan` and lifted suspensions — it did NOT flip `facilities.featured` or apply the ranking boost. Any subscription created outside the checkout flow (Stripe Portal upgrade, admin manual sub, API-created sub) would set `tier='pro'` in `facility_subscriptions` but leave the facility benefits unflipped.

**Fix:** new `supabase/functions/_shared/pro-benefits.ts` ships two helpers:
- `activateProBenefits(supabase, userId)` — mirrors `profiles.plan='pro'`, then iterates every facility the user owns and flips `featured=true` + adds +50 ranking. Idempotent: skips facilities where `featured` is already `true`, so a webhook retry never double-applies.
- `deactivateProBenefits(supabase, userId)` — symmetric revert: mirrors `profiles.plan='free'`, flips `featured=false`, subtracts +50 (clamped at 0).

Both handlers now use the helper:
- `customer.subscription.created` → `activateProBenefits` (canonical source of truth)
- `checkout.session.completed` (pro_subscription mode) → `activateProBenefits` (covers the wizard's PlanStep race where checkout returns before subscription.created fires)
- `customer.subscription.deleted` → `deactivateProBenefits` (replaces the inline revert that was duplicated across the handler)

### F2. Double-application of the +50 ranking boost
**Before:** the inline activation read `currentScore` and wrote `currentScore + 50` without guarding on `featured`. Webhook retries (Stripe's at-least-once delivery) added another +50 every time, eventually inflating scores arbitrarily.

**Fix:** `activateProBenefits` guards with `featured === true` short-circuit. The boost only applies when the row transitions `false → true`. Subsequent retries find `featured=true` and skip.

### F3. Silent failure on `profiles.plan` mirror
**Before:** failed `UPDATE profiles SET plan='pro'` logged WARN and continued. If the mirror fails, the `enforce_facility_plan_photo_cap` trigger holds the user to the Free cap (5 photos) even though they paid for Pro.

**Fix:** `notifyProBenefitsPartialFailure` writes an `admin_notifications` row of type `pro_benefits_partial_failure` whenever the mirror errors OR any facility update fails. Hooked into all three call sites (subscription.created, checkout.session.completed, subscription.deleted).

### F4. Silent failures in `_shared/cancel-subscription.ts`
**Before:** the refund executor caught Stripe refund errors, missing-charge cases, and audit-row insert failures with `console.error` only. Operators had no visibility unless they tailed function logs.

**Fix:** introduced a `notifyAdmin()` helper inside the module that posts to `admin_notifications` on each of:
- Stripe refund creation failure → type `subscription_refund_failed`
- Refund owed but no underlying charge found → type `subscription_refund_missing_charge`
- `subscription_cancellations` insert failure → type `subscription_cancellation_row_insert_failed`

Plus the existing `subscription.deleted` webhook fallback now writes `subscription_cancel_refund_failed` when the whole refund executor throws (was previously only logged).

### F5. `create-checkout` Stripe-side idempotency
**Before:** the function had a 30-minute open-session reuse guard (round 2) but did NOT pass a Stripe `idempotencyKey` to `sessions.create`. A network retry of the same Create-Session call could create a duplicate session.

**Fix:** generate a per-user, 5-minute-bucketed idempotency key (`create-checkout:<user_id>:<bucket>`) and pass it as the second arg to `stripe.checkout.sessions.create`. Stripe stores idempotency keys for 24 h, so a retry of the same logical call always returns the same session id. Combined with the open-session reuse this gives belt-and-braces double-billing protection.

## Coverage check — Stripe events handled

| Event | Handler line | What it does post-fix |
|---|---|---|
| `checkout.session.completed` (payment mode = international fee) | ~234 | Records placement fee payment. Unchanged. |
| `checkout.session.completed` (subscription mode = Pro) | ~445 | Creates `facility_subscriptions` row, calls `activateProBenefits` (idempotent), notifies provider. |
| `customer.subscription.created` | 1019 | Inserts canonical `facility_subscriptions` row, calls `activateProBenefits`, lifts suspensions, records event. |
| `customer.subscription.updated` | 585 | Syncs status, restores benefits on past_due→active recovery, detects + refunds add-on item drops. |
| `customer.subscription.deleted` | ~1221 | `cancelSubscriptionAndRefund(scope=all)` → `deactivateProBenefits` → suspend extras. |
| `invoice.payment_succeeded` | ~845 | Records event, sends renewal-confirmation email, resets renewal-reminder state. |
| `invoice.paid` | ~1538 | International placement fee. Unchanged. |
| `invoice.payment_failed` | ~727 | Records failure, notifies provider + admin. |

## End-to-end Pro upgrade journey (verified)

1. Wizard `PlanStep` → user clicks "Continue with Pro" → `create-checkout` invoked.
2. `create-checkout`: authenticates JWT, checks `already pro` short-circuit, reuses open Checkout session if one exists in the last 30 min, otherwise calls `stripe.checkout.sessions.create` with `idempotencyKey`. Returns `{ url }`.
3. User completes payment on Stripe-hosted Checkout. Stripe redirects to `?checkout=success`.
4. PlanStep polls `facility_subscriptions` for `tier='pro' AND status='active'` for 10s.
5. Meanwhile Stripe fires webhooks (signed, dedup-claimed via `claim_stripe_webhook_event`):
   - `checkout.session.completed` → activation block runs `activateProBenefits` (idempotent).
   - `customer.subscription.created` → same helper (idempotent on second pass).
6. Both events end up at the same end state: `profiles.plan='pro'`, all owned `facilities.featured=true` with +50 ranking applied exactly once, suspensions lifted.
7. PlanStep detects the active row, advances wizard, navigates to `/provider/billing` / `/provider/dashboard`.
8. UI surfaces consistently:
   - `Billing.tsx` reads `subscription.tier === 'pro' && status === 'active'` → renders "Pro" badge + renewal date.
   - `MarketingHub.tsx`, `MarketingFeatured.tsx`, `MarketingConcierge.tsx` gate on `subscription.tier === 'pro'`.
   - `PlanGate.tsx` reads `profiles.plan` to unlock the facility-video tile.
   - `enforce_facility_plan_photo_cap` trigger reads `profiles.plan` → 10-photo cap unlocks.
9. Cancellation: provider hits `/provider/billing/cancel` → `provider-self-cancel-subscription` → Stripe → webhook fires `customer.subscription.deleted` → `cancelSubscriptionAndRefund` issues prorated refund + writes audit row + alerts admin on any failure → `deactivateProBenefits` reverts every facility-level flag → suspends extra facilities beyond the free-tier limit of 1.

## Production-readiness checklist

- [x] Pro activation is event-source-agnostic (works from Checkout, Portal upgrades, manual subs).
- [x] Idempotent on Stripe webhook retries (no double ranking, no double refund, no double notifications via `claim_stripe_webhook_event`).
- [x] Double-billing-resistant Checkout (30-min open-session reuse + Stripe idempotencyKey).
- [x] Silent-failure surfaces eliminated: every catch on the cancellation path writes `admin_notifications`.
- [x] Pro benefits revert symmetrically on cancel (helper applies to all facilities, mirrors profile plan).
- [x] Sensitive-column guard (`enforce_profile_sensitive_column_guard`) plus webhook bypass (no JWT = no-op) prevents client-side `plan='pro'` escalation while permitting webhook writes.
- [x] Typecheck clean.

## What's intentionally still owed (carry-forward, separate prompts)

- `customer.subscription.trial_will_end` handler — our product has no trial; current behavior is `no-op via missing branch`. Add only if a trial SKU is introduced.
- Featured / Concierge add-on `create-checkout-session` (separate edge function — covered by monetization Prompts 3 + 4 in `/root/.claude/plans/immutable-munching-rainbow.md`).
- Admin "manual force cancel" UI consuming `admin-cancel-subscription` (covered by monetization Prompt 5).
- Dunning banner on `Billing.tsx` for `status='past_due'` (covered by monetization Prompt 5).
