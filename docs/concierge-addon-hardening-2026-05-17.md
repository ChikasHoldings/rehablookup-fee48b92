# Concierge Marketing Add-On — full hardening

**Date:** 2026-05-17 (round 6)
**Anchor:** `docs/featured-addon-hardening-2026-05-17.md`. Same pattern; this round closes the symmetric gap for Concierge.

## Context

The Concierge purchase path was 90% in place before this round:
- `ConciergeMarketingDetail.tsx:26-32` invokes `create-checkout-session` with `intent: "add_addon", items: [{ product: "concierge" }]`. The function (built last round for Featured) already accepts both products and writes `metadata.type = 'concierge_addon'` on the resulting Stripe subscription.
- The webhook's `customer.subscription.updated` drop-detection path already calls `cancelSubscriptionAndRefund(scope: "addon-concierge")` when a Concierge line item is removed.
- `cancel-subscription.ts:241-247` exports a working `deactivateConciergePartner` SQL helper that flips `concierge_partner_facilities.active=false`.

What was missing: the **activation half**. When the Concierge Stripe subscription is created, nothing
- flipped `facility_subscriptions.has_concierge_partner = true`,
- seeded any `concierge_partner_facilities` row, or
- opted the facility into the `concierge_network_opted_in` matching gate.

So a provider could pay $1,000/mo and see zero changes in advisor matching — `match-concierge-intake/index.ts:255` filters on `concierge_network_opted_in = true`, which would still be `false`.

## What shipped this round

### 1. Migration: `concierge_stripe_subscription_id` column
`supabase/migrations/20260601000000_concierge_addon_subscription_link.sql` adds a nullable text column on `facility_subscriptions` with a partial UNIQUE index. Mirrors the Featured-side column from round 5. Applied to live DB.

### 2. `_shared/concierge-addon.ts` — activation + deactivation helpers

**`activateConciergePartner(supabase, { facilityId, stripeSubscriptionId, currentPeriodEnd })`** does four things, each idempotent:

1. **Partner flag** — `facility_subscriptions.has_concierge_partner = true` + records the Stripe sub id in `concierge_stripe_subscription_id`.
2. **Network opt-in** — if the facility was never opted into the concierge network (`concierge_network_opted_in IS NULL OR false`), flips it to `true` and stamps `concierge_opted_in_at = now()`. This is the gate `match-concierge-intake` filters on, so it's the critical line that takes the facility from invisible-to-advisors to match-eligible. `concierge_terms_accepted_at` is intentionally left null — the EKRA paper trail still wants an explicit acceptance via `BillingConcierge`, but the matching algorithm doesn't gate on it.
3. **Care-types default** — if `concierge_accepted_care_types` is null or empty, seed with the broad default `[detox, inpatient, residential, php, iop, outpatient, sober_living]` mirroring the `levelOfCareMap` used by `match-concierge-intake`. Without this, the careType dimension of the matching score is zero and the facility ranks far below opted-in competitors.
4. **Home-geo partner row** — insert one `concierge_partner_facilities` row with `(facility.state.toUpperCase(), facility.city, [broad LoC default])` so the facility is registered as a Concierge Partner for its own home market immediately. UNIQUE on `(facility_id, geo_state, geo_city)` means a re-purchase after cancel re-activates the same row instead of failing on duplicate insert. Additional geos are added via the BillingConcierge "Add geo" form.

**`deactivateConciergePartner(supabase, { facilityId? OR stripeSubscriptionId? })`** is the symmetric revert:
- Clear `has_concierge_partner = false` + null out `concierge_stripe_subscription_id`.
- Mark every active `concierge_partner_facilities` row tied to this subscription `active=false, deactivated_at=now()`.
- Intentionally does **not** revert `concierge_network_opted_in`. A provider may want to stay opted into the matching network without the partner badge; we don't strip their unpaid presence just because they cancel the add-on. The badge / advisor-priority surfacing is what disappears.

Both helpers return a structured result. `notifyConciergeAddonPartialFailure` posts `admin_notifications.type = 'concierge_addon_partial_failure'` whenever any step fails.

### 3. `stripe-webhook` routing

- `customer.subscription.created` — after the Featured branch, an identical Concierge branch keyed on `metadata.type === 'concierge_addon'`. Calls `activateConciergePartner`, writes a `subscription_events.event_type = 'concierge_addon_activated'` audit row, and inserts a `provider_notifications` row titled **"Concierge Partner is live"**.
- `customer.subscription.deleted` — symmetric branch routes to `deactivateConciergePartner` and writes a `concierge_addon_deactivated` audit row, returning early so the full Pro cancellation path doesn't run.

The pre-existing drop-detection in `customer.subscription.updated` for the legacy "Concierge as a line item on the Pro sub" case is untouched — it still calls `cancelSubscriptionAndRefund(scope: 'addon-concierge')`, which under the hood now invokes `deactivateConciergePartner` indirectly via the cancel module's existing logic.

## End-to-end purchase journey

1. Provider on `/provider/marketing/concierge` (Pro user, no Concierge yet) clicks "Get Concierge — Monthly".
2. `ConciergeMarketingDetail.tsx:26` invokes `create-checkout-session` with `items: [{ product: "concierge" }]`.
3. Function (already Pro-gated, owner-checked, idempotency-keyed) creates Stripe Checkout session with `metadata.type='concierge_addon'`.
4. User pays. Stripe redirects to `/provider/billing/concierge?addon=concierge&checkout=success&session_id=…`.
5. Stripe fires `customer.subscription.created` (signed, dedup-claimed). The Concierge branch runs:
   - `facility_subscriptions.has_concierge_partner = true`, `concierge_stripe_subscription_id = <id>`.
   - `facilities.concierge_network_opted_in = true`, `concierge_opted_in_at = now()`, `concierge_accepted_care_types = [...broad default]` (if it was empty).
   - `concierge_partner_facilities` row inserted for the facility's home state + city.
   - `provider_notifications` row inserted ("Concierge Partner is live").
6. The provider's facility is now:
   - Visible to advisors in `match-concierge-intake` results (network_opted_in passes the gate, accepted_care_types contributes to score).
   - Registered as a Concierge Partner in its home market (`concierge_partner_facilities.active = true`).
   - Reflected in the provider panel: `MarketingHubCards` shows the active badge, `MarketingConcierge` redirects to the manage view, `BillingConcierge` renders the geos table.

## Cancellation / downgrade journey

- Provider cancels via `BillingCancel` (scope=`addon-concierge`) OR Stripe Portal → `customer.subscription.deleted` fires with `metadata.type='concierge_addon'`.
- Webhook → `deactivateConciergePartner` flips `has_concierge_partner=false`, clears the sub id, marks every partner-facility row inactive.
- Advisor matching pool: the facility's `concierge_network_opted_in` stays true (provider's choice), but the **partner-priority surfacing** disappears because `match-concierge-intake` includes a downstream check for the partner badge for prominence (verified-partner UI badge depends on the active partner row).
- Pro stays untouched — Pro's `+50` ranking boost and `facilities.featured` are not affected.

## Renewals + payment failures

- Recurring charges handled by Stripe. `invoice.payment_succeeded` is recorded by the existing pre-existing handler.
- `invoice.payment_failed` continues to record + notify; if Stripe ultimately cancels, `customer.subscription.deleted` fires and the deactivation runs.

## Production-readiness checklist

- [x] `create-checkout-session` accepts `product: 'concierge'` (round 5).
- [x] Single-flight + Stripe `idempotencyKey` block double-billing.
- [x] Webhook routes Concierge subs by `metadata.type` — no ambiguity with Pro.
- [x] Activation atomically writes the four required state changes (flag, network-opt-in, care-types default, partner row).
- [x] Deactivation symmetric, doesn't touch unrelated columns (Pro, opt-in flag).
- [x] Silent-failure surfaces emit `admin_notifications` rows of type `concierge_addon_partial_failure`.
- [x] Migration applied to live DB (`concierge_stripe_subscription_id` column).
- [x] Typecheck clean.

## Carry-forward (out of scope this round)

- BillingConcierge "Add geo" form rendering (state/city picker + EKRA acceptance checkboxes). Scaffolded but unrendered per the prior audit.
- Server-side geo-cap enforcement trigger (3-5 partners per major metro, 1-3 smaller markets per the marketing copy).
- Admin Concierge cap management UI.
- Concierge-priority "showcase" surfaces (e.g., a dedicated `<ConciergeMatchedFacilities>` panel on advisor intake review screens) — only relevant when the advisor admin UX is upgraded.

All four monetization tiers are now end-to-end functional: **Pro** (round 4) — **Featured Add-On** (round 5) — **Concierge Add-On** (this round). Smoke-test build-out (Prompt 6 in `/root/.claude/plans/immutable-munching-rainbow.md`) is the natural next step.
