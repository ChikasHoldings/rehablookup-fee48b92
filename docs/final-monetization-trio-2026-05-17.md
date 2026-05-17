# Final monetization trio — analytics, dunning cadence, Stripe E2E

**Date:** 2026-05-17 (round 13)
**Anchor:** rounds 12 (waitlist polish + smoke tests). Closes the three remaining infra-prompt items.

## A. Waitlist demand analytics

### Migration `20260607000000_waitlist_demand_summary`
`get_waitlist_demand_summary(p_limit int DEFAULT 20)` — SECURITY DEFINER RPC, admin-only execution. Rolls up `addon_waitlist` rows grouped by scope (per add-on) and joins the per-row availability via `get_placement_availability` / `get_concierge_availability`. Returns `addon_type, scope_label, cap, used, waiting_count, invited_count, oldest_request` ordered by total queue depth descending then oldest waiter first.

### UI — `WaitlistDemandCard` in the admin Caps tab
New "Where demand is hottest" card at the top of the tab. Each row shows the scope, cap, in-use, waiting, invited, and oldest waiter timestamp. Color cue: waiting count >= cap renders red (system is at saturation); waiting > 0 renders amber. Empty state surfaces "Caps are sized comfortably for current demand" so admins know the absence isn't a bug.

Admins can immediately answer "which states need a cap bump?" without leaving the page.

## B. Per-tier dunning email cadence

### Migration `20260608000000_dunning_cadence`
Adds two columns to `facility_subscriptions`:
- `past_due_since timestamptz` — stamped by the new `sync_dunning_state()` BEFORE UPDATE trigger when `status` transitions to `past_due`. Cleared (set NULL) when `status` returns to `active`. Backfilled from `updated_at` for any row currently `past_due`.
- `dunning_milestones_sent text[]` — append-only set of milestone tokens (`day_1`, `day_3`, `day_7`) already emailed in the current past_due cycle. Reset to `ARRAY[]::text[]` on recovery.

Trigger guarantees the columns stay coherent without webhook code changes (the trigger fires inside the existing `customer.subscription.updated` UPDATE path).

### Edge function `send-dunning-emails`
Cron-only (hard-coded service-role JWT check, same pattern as `drain-addon-waitlist`). Per tick:
1. Pulls up to 500 `status='past_due'` rows ordered oldest-first by `past_due_since`.
2. For each row, computes `daysSince = floor((now - past_due_since) / 1 day)`.
3. For each milestone `(day_1=1, day_3=3, day_7=7)` whose elapsed-days threshold has passed AND token not in `dunning_milestones_sent`:
   - **Claim-first**: UPDATE the array with the token, gated on the token NOT already being present. Concurrent ticks race-lose cleanly.
   - Resolve recipient via `auth.admin.getUserById`, facility name via `facilities`.
   - Send Resend email with tier-aware copy (Pro / Pro+Featured / Pro+Concierge text), `Idempotency-Key: dunning:<sub_id>:<milestone>`.
   - Failure → `admin_notifications.type='dunning_email_failed'` with recipient + milestone in metadata.

Tier-aware copy varies by milestone:
- **day_1**: "we couldn't charge your card" + Stripe portal link
- **day_3**: "still past due — benefits may start to degrade"
- **day_7**: final notice listing the specific benefits at risk (placements, partner status, photo cap, ranking)

### Migration `20260609000000_dunning_cadence_cron`
Schedules `send-dunning-emails` daily at 10am UTC via the same pg_cron + extensions.http_post pattern as `send-renewal-reminders` and `drain-addon-waitlist`. **Staged only** (not applied to live DB) so the edge function deploys first.

## C. Stripe webhook end-to-end harness

### `_tests/_fixtures/stripe-events.ts`
Typed builders for the Stripe events `stripe-webhook` handles: `customer.subscription.{created,updated,deleted}`, `checkout.session.completed`, `invoice.payment_{succeeded,failed}`. Each returns a (mostly) realistic Stripe.Event JSON matching the `2025-08-27.basil` API version. Add-on subscriptions can be built by passing `addonType='featured_addon'|'concierge_addon'` + `facilityId` + `providerUserId` to populate `metadata.type` correctly so the webhook's routing branches activate.

### `_tests/stripe-webhook-e2e_test.ts`
Eight scenarios covering Pro lifecycle, Featured activation, past_due transitions, dedup, checkout.session.completed, and signature rejection. Each test:
1. Uses a unique `eventId` + `subscriptionId` so concurrent runs don't collide
2. POSTs a signed payload to `STRIPE_WEBHOOK_URL` using `crypto.subtle.sign` (HMAC-SHA256 — matches what Stripe sends)
3. Asserts response status + downstream DB state via `SUPABASE_TEST_URL` service-role client
4. Cleans its own writes by `stripe_subscription_id` in a `finally` block

When any of the eight required env vars is missing, the entire file emits a single `SKIPPED` test and exits 0 so CI without sandbox credentials stays green. This makes the harness safe to merge today — it activates the moment a sandbox is provisioned.

### `_tests/README-stripe-e2e.md`
Run instructions, env-var list, and a Stripe-CLI alternative for exploratory testing.

## Cumulative production-readiness (rounds 4-13)

- [x] Pro upgrade
- [x] Featured Add-On
- [x] Concierge Add-On
- [x] Dunning banner + self-service forms + renewal display
- [x] Cap enforcement + availability RPCs
- [x] Admin cap-management UI + RLS lock-down
- [x] Waitlist with provider opt-in + admin queue + drain notifications
- [x] Auto-email invite on slot-free
- [x] Position indicator + per-user opt-out + provider waitlist panel
- [x] Source-contract smoke tests
- [x] **Waitlist demand analytics** (this round)
- [x] **Per-tier dunning email cadence (day 1 / 3 / 7)** (this round)
- [x] **Stripe webhook E2E harness** (this round — runs the moment infra exists)

Every named carry-forward item from this 13-round audit is now closed in code. The remaining open work is operational: configure `app.settings.functions_url` + `app.settings.service_role_key` on the live DB if they aren't already (the existing renewal-reminder cron asserts this), deploy the two new staged cron migrations alongside their edge functions, and seed the `STRIPE_TEST_*` env on CI to activate the E2E suite.
