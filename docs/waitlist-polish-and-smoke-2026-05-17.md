# Waitlist polish + monetization smoke tests

**Date:** 2026-05-17 (round 12)
**Anchor:** rounds 10-11 (waitlist + auto-drain). Closes the named carry-forward items from round 11.

## What shipped

### 1. Position-in-line indicator
- Migration `20260606000000` adds the `get_addon_waitlist_position(p_waitlist_id uuid)` RPC. SECURITY DEFINER with an in-function `auth.uid()` check so callers can only fetch their own row's position (admins bypass). Returns `(queue_position, queue_total)` — `position` is a reserved word in Postgres SQL grammar so the column name is `queue_position` and the caller renames at the edge.
- `JoinAddonWaitlistButton` queries the RPC when an existing entry is found and renders `"On the waitlist — we'll be in touch (#3 of 8)"`.

### 2. Per-user auto-invite opt-out
- Same migration adds `addon_waitlist.auto_invite_opt_out boolean NOT NULL DEFAULT false`.
- `drain-addon-waitlist` edge function now filters `.eq("auto_invite_opt_out", false)` when pulling waiting rows. Opt-out entries still trip the slot-freed admin notification (round 10 contract preserved), but no Resend email is auto-sent.
- `JoinAddonWaitlistButton` has a checkbox below the opt-in CTA: *"Skip auto-email when a slot opens — our team will reach out manually when it's your turn."* Toast on submit reflects the user's choice.
- `MyWaitlistEntries` renders a small `BellOff` badge on opt-out rows so the provider can see at a glance which entries are manual-outreach.

### 3. Provider waitlist panel — `MyWaitlistEntries`
- New shared component that lists every open waitlist entry for the signed-in provider. Supports optional `facilityId` + `addonType` filters.
- Mounted on `BillingPlacements.tsx` (filtered to `featured` + the active facility) and `BillingConcierge.tsx` (filtered to `concierge` + the active facility). Renders nothing when there are no entries, so it's a zero-cost addition on the happy path.
- Each row shows scope, status badge (Waiting / Invited), opt-out badge if set, facility name, joined date, and a "Leave" button that flips `status='canceled'`. Owner-only RLS (round 10) gates the cancel.

### 4. Runnable monetization smoke tests
- `supabase/functions/_tests/monetization-helpers-smoke_test.ts` — source-contract assertions in the same style as `provider-onboarding-smoke_test.ts`. Twenty named tests covering:
  - **pro-benefits**: helpers exported, double-+50 ranking guard present, ranking clamps at 0 on revert, partial-failure notifier exists
  - **featured-addon**: seeds homepage `national` + state-upper + slugified city, reactivation path exists, deactivate filters on `active=true`
  - **concierge-addon**: auto-opts into `concierge_network_opted_in`, default LoC seed contains all 7 canonical values, deactivate does NOT auto-revert opt-in
  - **create-checkout-session**: Pro gate, `metadata.type='${product}_addon'` routing token, 30-min single-flight, Stripe idempotency key, 409 on already-active
  - **stripe-webhook**: subscription.created routes both add-ons via shared helpers; subscription.deleted does the symmetric routing; Pro path uses shared `activateProBenefits`
  - **drain-addon-waitlist**: service-role gate, claim-before-send pattern, Resend idempotency key, opt-out filter, failed-send admin notification

These run in Deno against the source files (no live HTTP, no Stripe sandbox). Each assertion guards a specific bug class that already appeared in the audit (e.g. the double-+50 bug from round 4). Running them in CI catches regressions at PR time.

The **full Stripe-test-mode integration suite** (real `create-checkout-session` → real Stripe Checkout → real webhook → real DB) still requires a sandboxed Supabase project + Stripe test keys, neither provisioned in this environment. The pattern is documented in `docs/monetization-cross-cutting-2026-05-17.md`.

## Cumulative production-readiness (rounds 4-12)

- [x] Pro upgrade
- [x] Featured Add-On
- [x] Concierge Add-On
- [x] Dunning + self-service forms + renewal display
- [x] Cap enforcement + availability RPCs
- [x] Admin cap-management UI + RLS lock-down
- [x] Waitlist with provider opt-in + admin queue + drain notifications
- [x] Auto-email invite on slot-free
- [x] Position-in-line indicator
- [x] Per-user auto-invite opt-out
- [x] Provider waitlist panel on billing pages
- [x] Source-contract smoke tests covering every monetization regression seen in this audit

## What remains owed (separate infra prompts)

- **Full Stripe-test-mode end-to-end suite** — replays real `checkout.session.completed` webhooks via Stripe CLI against a test Supabase project; asserts the DB transitions match. Needs sandbox infra.
- **Per-tier dunning email cadence** — today the dunning banner appears in the provider panel when status=past_due; an automatic email sequence (day 1, day 3, day 7) before subscription auto-cancellation is its own retention round.
- **Waitlist analytics in admin dashboard** — surfacing top-demanded scopes (largest queues) would inform cap-tuning decisions.
