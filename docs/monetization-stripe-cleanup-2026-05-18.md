# Phase F — Stripe Integration Cleanup & Validation

Date: 2026-05-18
Branch: `claude/phase2-deployment-5WYOn`

This is the final phase of the monetization rebuild. Phases A–E removed the
client-facing legacy of the credit/unlock/pay-per-admission model. Phase F
retires the corresponding Stripe-side infrastructure and the dead edge
functions that fronted it.

## Scope

The flat-fee monetization model has exactly three Stripe products:

| Product | Lookup Keys | Monthly | Annual (15% off) |
|---|---|---|---|
| **Pro** | `rl_pro_monthly_v1`, `rl_pro_annual_v1` | $99 | $1,009.80 |
| **Featured** add-on | `rl_featured_monthly_v1`, `rl_featured_annual_v1` | $599 | $6,108.60 |
| **Concierge Partner** add-on | `rl_concierge_monthly_v1`, `rl_concierge_annual_v1` | $1,000 | $10,200 |

International placement (one-time fees, separate flow) keeps:

- `price_1TSR6U9fxdThyiak3hfLXWXb` — $99 seeker fee
- `price_1SxJoI9fxdThyiakeI4gjY6I` — $3,000 provider invoice

## Edge functions retired in this phase (stubbed to HTTP 410)

All ten functions below now return `{"error":"gone","code":"function_retired"}`
with status 410. Local source was deleted for the three that still existed
locally; the rest were deploy-only orphans.

| Function | Why | Local source |
|---|---|---|
| `purchase-credits` | Credit pack purchase — model retired | (deploy-only) |
| `auto-reload-credits` | Credit auto-reload — model retired | (deploy-only) |
| `verify-unlock-payment` | Lead-unlock payment verification — model retired | (deploy-only) |
| `purchase-listing-slot` | Pay-per-extra-slot — Pro is unlimited now | (deploy-only) |
| `record-placement-agreement` | Pay-per-admission T&C — EKRA | (deploy-only) |
| `submit-placement-case` | Pay-per-admission domestic case — EKRA | (deploy-only) |
| `charge-placement-fee` | Pay-per-admission billing — EKRA | (deploy-only) |
| `create-concierge-checkout` | Legacy $299 concierge checkout (now free) | (deploy-only) |
| `send-abandoned-placement-email` | Pay-per-admission cart-abandonment email — EKRA | **deleted** |
| `confirm-placement` | Pay-per-admission confirmation that invoked charge-placement-fee — EKRA | **deleted** |
| `send-provider-welcome-offer-email` | Welcome-credits offer email — model retired | **deleted** |

## stripe-webhook changes

- Removed the legacy `concierge_placement` checkout.session.completed branch
  (≈100 lines). Comment retained pointing at the retired functions.
- The `credit_purchase` / `additional_listing_slot` / `lead_unlock` branches
  were already removed in Phase C.
- **Webhook redeploy is deferred** — the source is updated locally but
  v10 (currently deployed) still contains the dormant `concierge_placement`
  branch. The branch is unreachable because `create-concierge-checkout` now
  returns 410, so no new `concierge_placement` sessions are created. Roll
  the next webhook deploy (Phase G or any future change) and the branch
  will drop out of production.

## Frontend changes

- `src/components/provider/ProviderWelcomeModal.tsx` — replaced "Up to 5
  listings" with "Unlimited listings" (Pro now grants unlimited), replaced
  `?purchase_credits=true` link with `?upgrade=pro`, replaced "Unlock
  leads / View contact details" tile with "Reach families / Full contact
  details on Pro".
- `src/pages/ProviderSignup.tsx` — removed the dead invocation of
  `send-provider-welcome-offer-email` (step 12b).
- `src/lib/contracts/error-codes.ts` — dropped 8 retired error codes from
  the frontend mirror.
- `src/lib/contracts/friendly-error-messages.ts` — dropped the
  `welcome_offer_email_send_failed` entry.
- `src/pages/admin/AdminNotifications.tsx` — dropped `placement_charge_failed`
  from the admin notification type list.
- `src/components/admin/concierge/CaseTimelineEvents.tsx` — dropped the
  dead `charge_failed` and `charge_retried` case-event icons.

## Backend / test changes

- `_shared/contracts/error-codes.ts` — dropped 8 retired error code
  entries and pruned `emittedBy` arrays of references to the 11 retired
  functions.
- `docs/api/error-codes.json` + `docs/api/error-codes.md` — mirrored.
- `docs/api/welcome-email.openapi.json` — dropped the
  `/send-provider-welcome-offer-email` path.
- `_shared/contracts/welcome-email-contracts.ts` — kept
  `WelcomeOfferRequestSchema` as a backwards-compatible alias; updated
  doc-comment to reflect the retirement.
- `_tests/welcome-email-error-paths_test.ts`,
  `_tests/recipient-email-guard_test.ts`,
  `_tests/provider-onboarding-smoke_test.ts`,
  `_tests/email-rejection-metrics_test.ts`,
  `_tests/email-required-integration_test.ts` — dropped the dead-function
  cases.
- `_tests/charge-placement-fee-smoke_test.ts` — **deleted** (function
  retired).
- `_tests/placement-error-contracts_test.ts` — **deleted** (covered
  retired functions).
- `_tests/fee-pricing-regression_test.ts` — dropped the two
  `charge-placement-fee` assertions; the `$299` / `$399` sweeps remain.
- `_tests/error-codes-registry_test.ts` — updated the registry-of-codes
  regex to drop the 8 retired codes.
- `supabase/functions/run-smoke-tests/index.ts` — dropped the
  `confirm-placement`, `charge-placement-fee`, and `unlock-lead` probe
  cases + their FIELD_KEYWORDS entries.

## DB state

| Table / column | Status |
|---|---|
| `profiles.plan` CHECK constraint | `IN ('free','pro')` — already correct |
| `facility_subscriptions.tier` CHECK constraint | `= 'pro'` — already correct |
| `facility_subscriptions.unlock_discount_percent` column | dropped (Phase C) |
| `purchased_listing_slots` table | dropped (Phase D) |
| `notification_preferences.notify_lead_limit_warnings` column | dropped (Phase D) |
| `leads_provider_view.lead_score / lead_score_label / is_unlocked` | dropped (Phase E) |
| Legacy placement tables (placement_cases, placement_invoices, etc.) | dropped in 20260516010000 |
| Legacy credit/unlock tables (lead_unlocks, provider_credits, credit_transactions) | dropped in 20260516010000 |
| Legacy RPCs (is_lead_unlocked, get_provider_credit_balance, etc.) | dropped (Phase C) |
| Legacy `enforce_facility_limit` trigger + helper | dropped (Phase D) |

Live DB plan-tier values (sanity check, prod): only `'free'` exists on
`profiles.plan`; `facility_subscriptions` is empty (no live Pro yet).

## ⚠️ Manual Stripe Dashboard cleanup required

I do **not** have direct Stripe API access from this sandbox. The
following changes must be made by hand in the Stripe Dashboard (or via
a one-off script with the live secret key):

### Archive these legacy products

| Product ID | Why |
|---|---|
| `prod_pro_monthly` | Legacy $399 bundled Pro (with credits + unlocks) — retired |
| `prod_TbalLOPujTIoUe` | Legacy Pro product (predecessor to `prod_Tbyz1bf6iYyzYd`) |
| `prod_TbalOeJZA2ZoJl` | Legacy Featured product (predecessor to `prod_TbyzJVNOQL71NN`) |
| `prod_SHmIFMgcVkqixh` | Legacy unknown-tier product (referenced only in get-provider-subscription product-ID enum) |
| `prod_SHmJIiVALcuWdF` | Legacy unknown-tier product (same) |

**Important:** Stripe Archive (not Delete) — archiving keeps the products
out of new Checkout sessions but preserves them on historical invoices
for tax/audit. Do NOT delete any product that has had a paid invoice
issued against it.

### Confirm these products + prices remain active

| Product | Lookup keys on its prices |
|---|---|
| `prod_Tbyz1bf6iYyzYd` (Pro) | `rl_pro_monthly_v1`, `rl_pro_annual_v1` |
| `prod_TbyzJVNOQL71NN` (Featured) | `rl_featured_monthly_v1`, `rl_featured_annual_v1` |
| (Concierge product) | `rl_concierge_monthly_v1`, `rl_concierge_annual_v1` |

Run `admin-attach-stripe-lookup-keys` (deployed v1, ACTIVE) once after
the archive to confirm all six lookup keys resolve.

### Decommission the corresponding Stripe products for retired flows

The following Stripe products / prices belonged to the credit-pack,
lead-unlock, and pay-per-admission flows. If they exist as separate
products in the Stripe dashboard, archive them too:

- Credit pack products ($200 / $500 / $1000 bundles with bonuses)
- Lead-unlock prices ($39 Request Info, $49 Request Callback)
- Pay-per-admission placement fee products ($1,000 domestic, $3,000 intl)
  — **NOTE:** the international fee at $3,000 is still active via
  `manage-international-case` and `price_1SxJoI9fxdThyiakeI4gjY6I`. Only
  domestic placement billing is retired.

### Webhook endpoint configuration

Keep the existing webhook endpoint that signs `stripe-webhook`. No
changes to subscribed events are needed — the function dispatches on
event type internally.

## Validation checklist

- [x] No frontend caller invokes a retired function (grep verified)
- [x] No edge function (other than the stubs themselves) imports a
      retired function's source (`charge-placement-fee` reference in
      `confirm-placement` removed by deletion)
- [x] `profiles.plan` and `facility_subscriptions.tier` CHECK
      constraints reject anything outside `{free, pro}` and `{pro}`
- [x] Typecheck (`npx tsc --noEmit`) passes
- [x] All 10 stub deployments returned status ACTIVE on `mldbxpntzcjalgjmwnqa`
- [ ] **Manual:** archive the 5 legacy products listed above in the
      Stripe dashboard
- [ ] **Manual:** archive the credit-pack / unlock / domestic-placement
      products + prices if they exist as separate Stripe SKUs
- [ ] **Deferred:** redeploy `stripe-webhook` (v11) to drop the dormant
      `concierge_placement` branch from production source
