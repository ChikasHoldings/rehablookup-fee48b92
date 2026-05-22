# Stripe webhook end-to-end test harness

Runnable Deno test suite that replays signed webhook events against a
real deployed `stripe-webhook` and asserts the downstream DB state.

## What it covers

| Scenario | Asserts |
|---|---|
| Pro `customer.subscription.created` | `facility_subscriptions` row created, `tier=pro`, `status=active`, audit row in `subscription_events` |
| `customer.subscription.deleted` | `status=canceled` |
| `invoice.payment_succeeded` | 200; no tier mutation |
| Dedup: same `eventId` twice | second response has `duplicate:true`; `subscription_events` count == 1 |
| Featured `customer.subscription.created` with `metadata.type='featured_addon'` | `has_featured=true`, `featured_stripe_subscription_id` set |
| `customer.subscription.updated` → `past_due` | `status=past_due`, `past_due_since` stamped by the `sync_dunning_state` trigger, `dunning_milestones_sent=[]` |
| `checkout.session.completed` (Pro) | 200 |
| Missing `stripe-signature` header | 401 + no `stripe_webhook_events` row |
| Invalid `stripe-signature` | 401 + no `stripe_webhook_events` row |
| Valid `stripe-signature` (Pro create) | 200 + `stripe_webhook_events` row with matching `event_id`/`event_type` |

## Running

```bash
export STRIPE_WEBHOOK_URL="https://<project>.functions.supabase.co/stripe-webhook"
export STRIPE_WEBHOOK_SECRET="<the same secret the function validates with>"
export SUPABASE_TEST_URL="https://<test-project>.supabase.co"
export SUPABASE_TEST_SRK="<test project service_role key>"

# Stripe test-mode customer + price ids
export STRIPE_TEST_CUSTOMER_ID="cus_test_..."
export STRIPE_TEST_PRO_PRICE_ID="price_..."      # lookup_key = rl_pro_monthly_v1
export STRIPE_TEST_FEATURED_PRICE_ID="price_..." # lookup_key = rl_featured_monthly_v1

# Seeded test facility + provider on the SUPABASE_TEST_URL project
export STRIPE_TEST_FACILITY_ID="<uuid>"
export STRIPE_TEST_PROVIDER_USER_ID="<uuid>"

deno test --allow-net --allow-env \
  supabase/functions/_tests/stripe-webhook-e2e_test.ts
```

When any of these env vars is missing, the entire file emits a single
`SKIPPED` test and exits 0 so CI without sandbox credentials stays green.

## Stripe-CLI alternative

Instead of constructing events in TypeScript, you can use the Stripe CLI:

```bash
stripe listen --forward-to https://<project>.functions.supabase.co/stripe-webhook
stripe trigger customer.subscription.created
stripe trigger checkout.session.completed
```

The CLI signs payloads with `STRIPE_WEBHOOK_SECRET` automatically. Use
this for exploratory testing; this file's value is for **CI gating** —
the same scenarios run on every PR.

## Test data lifecycle

Each test cleans its own writes by `stripe_subscription_id`:
`subscription_events`, `featured_placements`, `concierge_partner_facilities`,
`facility_subscriptions`, plus a defensive UPDATE clearing
`featured_stripe_subscription_id` / `concierge_stripe_subscription_id` on
the facility's canonical row.

Each test uses a unique `eventId` and `subscriptionId` so concurrent
runs don't collide. The dedup test deliberately reuses the same id
across two calls to assert the dedup path.

## Adding new scenarios

1. Add a builder to `_fixtures/stripe-events.ts` matching Stripe's
   real shape for the event type (consult Stripe's API reference for
   the 2025-08-27.basil version that `stripe-webhook` pins to).
2. Add a `Deno.test` block wrapped in `if (READY)`.
3. Use the existing `baseArgs()` + `postEvent()` helpers; clean up
   in `finally`.
