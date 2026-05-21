# Stripe E2E env vars for CI

The `supabase/functions/_tests/stripe-webhook-e2e_test.ts` suite runs
against a deployed `stripe-webhook` endpoint and a sandboxed Supabase
project. It self-skips when any of the eight required env vars is
missing, so adding the suite to CI is safe today; the moment you wire
the env, the tests start gating PRs.

## Required env vars

| Var | Source | Used for |
|---|---|---|
| `STRIPE_WEBHOOK_URL` | `https://<sandbox-project>.functions.supabase.co/stripe-webhook` | Where to POST the signed events |
| `STRIPE_WEBHOOK_SECRET` | The same secret the deployed `stripe-webhook` validates with (Supabase dashboard → Edge Functions → stripe-webhook → Secrets) | Signing the test payloads with `t=…,v1=…` |
| `SUPABASE_TEST_URL` | `https://<sandbox-project>.supabase.co` | Service-role client for DB assertions |
| `SUPABASE_TEST_SRK` | Sandbox project's service-role key | Same client |
| `STRIPE_TEST_CUSTOMER_ID` | `cus_test_…` from Stripe sandbox | Subscription owner in fixture events |
| `STRIPE_TEST_PRO_PRICE_ID` | Price id whose `lookup_key = rl_pro_monthly_v1` in the sandbox | Pro lifecycle tests |
| `STRIPE_TEST_FEATURED_PRICE_ID` | Price id whose `lookup_key = rl_featured_monthly_v1` | Featured-add-on lifecycle test |
| `STRIPE_TEST_FACILITY_ID` | UUID of a seeded test facility in the sandbox DB owned by `STRIPE_TEST_PROVIDER_USER_ID` | Address for the activation helpers |
| `STRIPE_TEST_PROVIDER_USER_ID` | UUID of a seeded test provider in the sandbox `auth.users` | Same |

## GitHub Actions snippet

Add this job to `.github/workflows/test.yml` (or wherever your test
matrix lives):

```yaml
stripe-e2e:
  runs-on: ubuntu-latest
  needs: [build]
  env:
    STRIPE_WEBHOOK_URL: ${{ secrets.STRIPE_WEBHOOK_URL }}
    STRIPE_WEBHOOK_SECRET: ${{ secrets.STRIPE_WEBHOOK_SECRET }}
    SUPABASE_TEST_URL: ${{ secrets.SUPABASE_TEST_URL }}
    SUPABASE_TEST_SRK: ${{ secrets.SUPABASE_TEST_SRK }}
    STRIPE_TEST_CUSTOMER_ID: ${{ secrets.STRIPE_TEST_CUSTOMER_ID }}
    STRIPE_TEST_PRO_PRICE_ID: ${{ secrets.STRIPE_TEST_PRO_PRICE_ID }}
    STRIPE_TEST_FEATURED_PRICE_ID: ${{ secrets.STRIPE_TEST_FEATURED_PRICE_ID }}
    STRIPE_TEST_FACILITY_ID: ${{ secrets.STRIPE_TEST_FACILITY_ID }}
    STRIPE_TEST_PROVIDER_USER_ID: ${{ secrets.STRIPE_TEST_PROVIDER_USER_ID }}
  steps:
    - uses: actions/checkout@v4
    - uses: denoland/setup-deno@v1
      with:
        deno-version: v1.x
    - run: deno test --allow-net --allow-env supabase/functions/_tests/stripe-webhook-e2e_test.ts
```

## Sandbox setup checklist

1. **Stripe**: create a test-mode account if you don't have one; copy
   the webhook signing secret from `https://dashboard.stripe.com/test/webhooks/<id>`.
2. **Supabase**: create a new project (or reuse an existing sandbox).
3. **Migrations**: run the full migration set against the sandbox so
   the cap RPCs, waitlist tables, and dunning columns all exist.
4. **Edge functions**: deploy `stripe-webhook`, the activation helpers'
   functions (`create-checkout-session`, `drain-addon-waitlist`,
   `send-dunning-emails`), and any others the tests trigger.
5. **Seed**: insert a single test facility + provider in the sandbox.
   The tests do NOT create facilities (they assert against owner-RLS),
   so a hand-seeded row is required.
6. **Stripe prices**: in the sandbox Stripe account, create at least
   two recurring prices with `lookup_key=rl_pro_monthly_v1` and
   `rl_featured_monthly_v1`. The test fixtures pass these prices'
   lookup keys to the webhook so the tier-derivation logic activates.
7. **GitHub secrets**: add all eight env vars to the repo's Actions
   secrets.

## Local verification

```bash
export STRIPE_WEBHOOK_URL=...
export STRIPE_WEBHOOK_SECRET=...
# (the other six)

deno test --allow-net --allow-env supabase/functions/_tests/stripe-webhook-e2e_test.ts
```

Without env: `0 passed | 0 failed | 1 ignored`.
With env: `8 passed | 0 failed`.

## Stripe-CLI alternative for exploratory testing

```bash
stripe listen --forward-to https://<sandbox-project>.functions.supabase.co/stripe-webhook
stripe trigger customer.subscription.created
stripe trigger checkout.session.completed
```

This signs payloads automatically with `STRIPE_WEBHOOK_SECRET`. Use it
to debug new event shapes; reserve the Deno suite for **gating**.
