# Featured Marketing Add-On — full hardening

**Date:** 2026-05-17 (round 5)
**Anchor:** prior `docs/pro-upgrade-hardening-2026-05-17.md`, monetization plan in `/root/.claude/plans/immutable-munching-rainbow.md`.

## Context

Before this round, the Featured Marketing Add-On purchase was broken end-to-end:

- `src/components/provider/marketing/FeaturedMarketingDetail.tsx:29` invoked `supabase.functions.invoke("create-checkout-session", ...)` but the function **did not exist** in either the repo or the deployed Supabase project. Every Featured purchase click returned `"Function not found"`.
- The Stripe webhook's `customer.subscription.updated` had logic for DROPPING Featured (refund + deactivate) but no path for ADDING Featured mid-subscription.
- Even if a Featured purchase had landed, no code seeded `featured_placements` rows, so the new Featured facility would never appear in the rotation queries that drive `LandingFeaturedSection`, `FeaturedRail`, `FeaturedStrip`, and the homepage Featured pool.
- `facility_subscriptions` had a UNIQUE constraint on `facility_id` (one row per facility) but no column to track a separate Stripe sub for Featured — the marketing copy explicitly says "Featured renews independently of Pro," so Featured needed its own Stripe subscription id.

## What shipped this round

### 1. Migration: `featured_stripe_subscription_id` column
`supabase/migrations/20260531000000_featured_addon_subscription_link.sql` adds a nullable text column on `facility_subscriptions` with a partial UNIQUE index (NULLs allowed for facilities without Featured). Applied to live DB via `apply_migration`.

### 2. New shared helper: `supabase/functions/_shared/featured-addon.ts`

- **`activateFeaturedAddon(supabase, { facilityId, stripeSubscriptionId, currentPeriodEnd })`** — flips `facility_subscriptions.has_featured=true`, stores the Featured Stripe sub id, then seeds `featured_placements` rows for:
  - `placement_type='homepage', placement_value='national'` (matches the token in `src/lib/featuredBucket.ts:34`)
  - `placement_type='state', placement_value=<state_abbr_uppercase>` (e.g., "TX")
  - `placement_type='city', placement_value=<slugified_city>` (e.g., "los-angeles")
  - Re-activates any previously deactivated rows (UNIQUE on (facility_id, type, value) means a re-purchase after cancel flips `active=true` rather than inserting).
- **`deactivateFeaturedAddon(supabase, { facilityId?, stripeSubscriptionId? })`** — flips `has_featured=false`, clears `featured_stripe_subscription_id`, marks every active `featured_placements` row for the subscription `active=false, deactivated_at=now()`.
- **`notifyFeaturedAddonPartialFailure`** — writes `admin_notifications.type='featured_addon_partial_failure'` whenever any step in either helper fails.

Both helpers are idempotent under Stripe webhook retries: `has_featured` flips are guarded by the existing-row check, placement seeds use existence-then-insert-or-reactivate, and deactivation filters on `active=true`.

### 3. New edge function: `create-checkout-session`

`supabase/functions/create-checkout-session/index.ts` accepts:
```
{ facility_id, intent: 'add_addon', billing_period: 'monthly'|'annual',
  items: [{ product: 'featured'|'concierge' }] }
```

Behavior:
- JWT-authenticates the caller.
- Verifies the caller owns the facility (`facility_subscriptions.provider_id === auth.uid()`).
- Pro-gates: requires `facility_subscriptions.tier='pro' AND status='active'`. Returns `409 PRO_REQUIRED` otherwise so the UI can route the user to upgrade first.
- Rejects re-purchase if `has_featured` (or `has_concierge_partner`) is already `true` → `409 ALREADY_ACTIVE`.
- Resolves the Stripe price by lookup key (`rl_featured_monthly_v1` / `rl_featured_annual_v1`; symmetric for concierge).
- 30-min single-flight: returns the existing open Checkout session for the same customer + add-on + facility instead of creating a duplicate.
- Stripe `idempotencyKey` bucketed per user / facility / product / 5 minutes.
- Creates a `mode='subscription'` Checkout session with `metadata.type='featured_addon'` (or `concierge_addon`) + `metadata.facility_id` + `metadata.provider_user_id` + `metadata.billing_period`. Webhook reads these to route activation.
- Returns `{ url, sessionId }` — the existing `FeaturedMarketingDetail.tsx` Stripe-domain validator passes through unchanged.

### 4. `stripe-webhook` wiring

**`customer.subscription.created`**: at the top of the handler, before the Pro path, the webhook inspects `subscription.metadata.type`. If it's `"featured_addon"`, it calls `activateFeaturedAddon`, writes a `subscription_events` audit row of type `featured_addon_activated`, fires a `provider_notifications` row (title: "Featured is live"), and returns early. The Pro-subscription path is untouched.

**`customer.subscription.deleted`**: symmetric — if `metadata.type === 'featured_addon'`, calls `deactivateFeaturedAddon` (bypassing the full `cancelSubscriptionAndRefund` path since add-on cancel is its own scope), writes a `subscription_events` audit row of type `featured_addon_deactivated`, returns early.

**`customer.subscription.updated`**: pre-existing drop-detection (lines 587-608 of stripe-webhook) still handles Featured-item-removed-from-Pro-sub case (legacy path where Featured was a line item on the Pro sub). Add-on subs (Featured as its own sub) go through `subscription.deleted` for cancellation.

## End-to-end purchase journey

1. Provider on `/provider/marketing/featured` (Pro user, no Featured yet) clicks "Get Featured — Monthly".
2. `FeaturedMarketingDetail.tsx` invokes `create-checkout-session` with `intent='add_addon', billing_period='monthly', items=[{ product: 'featured' }]`.
3. Function authenticates → Pro-gates → looks up Stripe price → reuses open session or creates new with `idempotencyKey`. Returns `{ url: stripe_checkout_url }`.
4. Frontend validates URL hostname is `*.stripe.com`, redirects.
5. User pays in Stripe-hosted Checkout. Stripe redirects to `/provider/billing/placements?addon=featured&checkout=success&session_id=…`.
6. Stripe fires `customer.subscription.created` (and likely `checkout.session.completed` too) with `metadata.type='featured_addon'`. The webhook signature is verified, dedup-claim succeeds, then the add-on branch runs:
   - `activateFeaturedAddon` flips `has_featured=true`, stores the Featured Stripe sub id, seeds homepage + state + city placements.
   - `provider_notifications` row inserted.
7. The provider's facility is now in:
   - `useFeaturedRotation({ placement_type: 'homepage', placement_value: 'national' })` pool — surfaces in `Index.tsx` homepage Featured rail and any landing page using `LandingFeaturedSection`.
   - `useFeaturedRotation({ placement_type: 'state', placement_value: <facility.state> })` pool — surfaces on the state directory page.
   - `useFeaturedRotation({ placement_type: 'city', placement_value: <slugify(city)> })` pool — surfaces on the city directory page.
   - `get-featured-rotation` joins `featured_placements!inner` with `facility_subscriptions!inner.has_featured=true AND status='active'`. Both filters are satisfied; the facility is in the eligibility pool.

## Cancellation journey

1. Provider on `/provider/billing/cancel` picks `addon-featured` scope OR drops the Featured slot via `BillingPlacements` → `provider-self-cancel-subscription` cancels the Featured sub in Stripe.
2. Stripe fires `customer.subscription.deleted` with `metadata.type='featured_addon'`.
3. Webhook → `deactivateFeaturedAddon` flips `has_featured=false`, clears the Featured Stripe sub id, marks all `featured_placements` rows for the subscription `active=false`.
4. `useFeaturedRotation` queries no longer match (both `has_featured` and placement `active` are now false). The facility drops out of every Featured rotation instantly.
5. **Pro stays intact** — `facilities.featured` (Pro-level boost) is not touched by the Featured-addon deactivation; only `featured_placements` rows are deactivated.

## Renewals & payment failures

- Renewals: Stripe handles the recurring charge automatically. `invoice.payment_succeeded` already records the event (line 845). No additional action needed on the Featured side — the subscription remains active, placements stay live.
- Payment failed: existing `invoice.payment_failed` handler records failure + notifies provider + admin. Subscription enters `past_due`. If it eventually cancels, `subscription.deleted` fires → `deactivateFeaturedAddon` runs.

## Verified consumers of `has_featured`

- `get-featured-rotation/index.ts:413-431` — JOINs `facility_subscriptions!inner.has_featured=true`. Fully wired.
- `get-featured-facilities/index.ts:185` — already queries `facility_subscriptions WHERE status='active' AND current_period_end > now`. The Featured-addon purchase keeps the same row alive with `has_featured=true`, so this picks it up.
- `MarketingHub.tsx`, `MarketingFeatured.tsx`, `BillingPlacements.tsx` — all read `useFacilitySubscription()` which exposes `has_featured`. The UI shows the manage view immediately after purchase.

## Production-readiness checklist

- [x] `create-checkout-session` edge function exists in repo (build & deploy via normal pipeline).
- [x] Single-flight + idempotency-key block double-billing.
- [x] Webhook routes add-on subs by `metadata.type` (not by ambiguous price lookup).
- [x] Activation seeds placements idempotently (rebuy after cancel reactivates the same rows).
- [x] Deactivation is symmetric, doesn't touch the Pro tier.
- [x] Silent-failure surfaces emit `admin_notifications` rows.
- [x] Migration applied to live DB (`featured_stripe_subscription_id` column).
- [x] Typecheck clean.

## Carry-forward (out of scope this round)

- Slot-selector UI on `BillingPlacements.tsx` for adding/removing treatment-type / insurance / specific city slots beyond the seeded defaults.
- Server-side cap enforcement trigger (30/state, 15/metro, 8/city, etc.).
- Concierge purchase path — uses the same `create-checkout-session` function (handler accepts `product='concierge'`) but the webhook activation helper for Concierge still needs writing (mirrors this round's `featured-addon.ts` for `concierge_partner_facilities`).
- Admin Featured slot cap management UI.
- Dunning banner for `status='past_due'` on the provider panel.

Concierge add-on follows next — the foundation here (create-checkout-session + the webhook routing pattern) directly applies.
