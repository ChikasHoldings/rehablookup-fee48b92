# Monetization cross-cutting hardening

**Date:** 2026-05-17 (round 7)
**Anchors:** Pro upgrade (round 4), Featured add-on (round 5), Concierge add-on (round 6). This round closes the remaining production UX gaps + builds a starter smoke-test pattern.

## Audit summary

A pre-fix sweep of `src/components/provider/marketing/`, `src/pages/provider/Billing*.tsx`, `src/pages/admin/AdminSubscriptions.tsx`, `src/components/admin/`, `supabase/functions/_shared/`, `supabase/functions/stripe-webhook/`, `check-churn-alerts/`, `send-renewal-reminder/`, `retry-failed-payments/`, `notify-payment-failed/` found **zero** TODO/FIXME/"coming soon" markers in the monetization scope. Admin tabs are all populated (`AdminSubscriptions.tsx` retention tab uses real `AtRiskProvidersCard` + `RetentionDashboard` components — earlier audit speculation was wrong).

The real gaps were:
1. **No provider-side dunning UI** when `facility_subscriptions.status='past_due'`. The webhook records + emails on failure but the provider panel showed no visible state.
2. **`BillingPlacements.tsx` "Add placement" form** scaffolded but unrendered (deferred from Featured round).
3. **`BillingConcierge.tsx` "Add geo" form** scaffolded but unrendered (deferred from Concierge round).
4. **`ProBenefitsWidget`** showed Pro benefits but no renewal date.

All four shipped this round.

## Artifacts

### `src/components/provider/DunningBanner.tsx`
Self-gated banner mounted in `ProviderShell.tsx` above the main panel content. Reads `facility_subscriptions` for every row owned by the signed-in provider where `status='past_due'`. Renders an amber banner listing the affected tier(s) (Pro / Featured / Concierge) with an "Update payment method" CTA pointing to `/provider/billing`. The query revalidates on window focus so a provider who pays in the Stripe Portal sees the banner disappear when they return to the panel. Returns `null` when there are no past_due rows, so it's a zero-cost no-op on the happy path.

### `src/components/provider/featured/AddFeaturedPlacementForm.tsx`
Inline collapsible form mounted in the `Active placements` card on `BillingPlacements.tsx`. Inputs:
- **Page type** — Select with all eight `PLACEMENT_TYPES` from `useFeaturedRotation` (state / city / treatment / insurance / near_me / homepage / search / article).
- **Value** — text input that auto-normalizes per type: state codes → uppercase, slugs → lowercase-with-hyphens, `homepage` → fixed `"national"`, `search` → fixed `"global"`. Mirrors `src/lib/featuredBucket.ts` so server-side rotation queries find a match.

On submit, checks for an existing row keyed on UNIQUE `(facility_id, placement_type, placement_value)`. If inactive, reactivates (preserves the round-5 idempotency pattern). If new, inserts with `active=true`. Both paths invalidate the `featured-placements` query so the table re-renders immediately. Failures surface a toast.

### `src/components/provider/concierge/AddConciergeGeoForm.tsx`
Mirror form for `BillingConcierge.tsx`. Inputs:
- **State** — Select of 50 US 2-letter codes.
- **City** — optional text; blank = statewide.
- **Levels of care** — checkbox grid (detox / inpatient / residential / php / iop / outpatient / sober_living) mirroring the canonical `levelOfCareMap` used by `match-concierge-intake`.
- **EKRA acknowledgement** — required checkbox that captures the same legal stance the EKRA banner already shows: flat fee, no per-call, advisors present ≥2 non-partner alternatives.

On submit, same upsert-or-reactivate pattern, gated on the UNIQUE `(facility_id, geo_state, geo_city)`.

### `ProBenefitsWidget` renewal date
Adds a single-line "Renews on Jun 14, 2026" (or "Ends on …" when `cancel_at_period_end=true`) above the Manage Subscription button. Uses the existing `currentPeriodEnd` already exposed by `useProStatus`. Zero new queries.

## End-to-end verification (post-deploy checklist)

1. **Dunning banner**:
   - Toggle a test sub in Stripe to `past_due`. Reload `/provider/dashboard` — amber banner appears with the affected tier listed.
   - Click "Update payment method" — routes to `/provider/billing`. Stripe customer-portal link there lets the provider update card.
   - When `customer.subscription.updated` fires past_due→active, the next focus event refreshes the banner query; banner disappears.

2. **Add placement (Featured)**:
   - As a Pro+Featured user, visit `/provider/billing/placements`.
   - Click "Add a placement" → pick `city` → type `Austin` → Add.
   - Row appears in the table with type "City page" / value "austin".
   - Visit `/local/austin-tx-rehab` (or the equivalent city page) — facility surfaces in the Featured rail.
   - Click Remove → row deactivates → facility drops from the rotation.

3. **Add geo (Concierge)**:
   - As a Pro+Concierge user, visit `/provider/billing/concierge`.
   - Click "Add a geography" → pick "TX (Texas)" → leave city blank → check `detox`, `residential`, `iop` → check EKRA acknowledgement → Add.
   - Row appears with `Texas / detox, residential, iop`.
   - As an admin in `match-concierge-intake` flow, run a test intake for a Texas seeker — facility surfaces as a partner match.

4. **Renewal date on dashboard**:
   - Pro user lands on `/provider/dashboard` → ProBenefitsWidget shows "Renews Jun 14, 2026" (or whatever the test sub's period_end is).
   - Cancel-at-period-end → text becomes "Ends Jun 14, 2026".

## Smoke-test pattern (carry-forward for Prompt 6)

Full Stripe-test-mode smoke tests require a running test Supabase + Stripe sandbox, which doesn't exist in this environment. The pattern below is what each Deno test under `supabase/functions/_tests/` should follow once that infrastructure is set up:

```typescript
// supabase/functions/_tests/featured-addon-smoke_test.ts (pattern, not yet runnable)
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2?target=denonext";
import {
  activateFeaturedAddon,
  deactivateFeaturedAddon,
} from "../_shared/featured-addon.ts";

Deno.test("Featured activate is idempotent", async () => {
  const supabase = createClient(...);
  const { facilityId, subId } = await seedTestFacility(supabase);

  const first = await activateFeaturedAddon(supabase, {
    facilityId, stripeSubscriptionId: subId, currentPeriodEnd: null,
  });
  const second = await activateFeaturedAddon(supabase, {
    facilityId, stripeSubscriptionId: subId, currentPeriodEnd: null,
  });

  // First call seeds 3 rows; second call reactivates 0 (already active).
  assertEquals(first.placements_inserted, 3);
  assertEquals(second.placements_inserted, 0);
  assertEquals(second.failed.length, 0);

  await cleanup(supabase, facilityId);
});

Deno.test("Featured deactivate clears flag + placements", async () => { ... });
Deno.test("Concierge activate auto-opts-in network", async () => { ... });
Deno.test("Pro activation idempotent on retry", async () => { ... });
```

The activation helpers (`activateProBenefits`, `activateFeaturedAddon`, `activateConciergePartner`) all return structured results listing what they did and what failed — exactly the surface a Deno test needs to assert against. The full suite needs:
- `_tests/_seed.ts` — helper to insert a clean test provider + facility + Pro sub.
- `_tests/_cleanup.ts` — helper to tear down test rows by metadata tag.
- `run-smoke-tests/index.ts` — aggregate runner.

These belong in a dedicated infra round once a test Supabase project is provisioned.

## Production-readiness checklist (cumulative across rounds 4-7)

- [x] Pro activation idempotent on Stripe retries (round 4)
- [x] Pro double-billing blocked at create-checkout (single-flight + idempotencyKey)
- [x] Featured Add-On end-to-end via create-checkout-session (round 5)
- [x] Concierge Add-On end-to-end + auto network opt-in (round 6)
- [x] Dunning banner on every provider-panel page (this round)
- [x] Provider can add Featured placements + Concierge geos beyond seeded defaults (this round)
- [x] ProBenefitsWidget shows renewal date
- [x] All silent-failure surfaces emit `admin_notifications` rows
- [x] Sensitive-column guard prevents client-side plan elevation
- [x] Typecheck clean

## Carry-forward (out of scope this round, owned by Prompt 6)

- Full Stripe-test-mode smoke tests under `supabase/functions/_tests/`.
- `get_placement_availability` RPC + live cap visualization in `AddFeaturedPlacementForm` (currently the form just inserts; doesn't show how many slots remain in each scope).
- `get_concierge_availability` RPC + live cap visualization in `AddConciergeGeoForm`.
- Server-side cap-enforcement triggers (30/state, 15/metro, 8/city for Featured; 3-5/major city, 1-3/smaller for Concierge).
- Admin slot/geo cap management UI under `/admin/subscriptions` (the retention tab works; Featured + Concierge cap admin views are separate work).
- `customer.subscription.trial_will_end` handler (irrelevant today — no trial product).
