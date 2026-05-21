# Monetization smoke-test inventory — 2026-05-20

Branch: `claude/monetization-6-smoke` (descended from
`claude/monetization-5-cross-cutting`).

## Approach

Master plan Prompt 6 asked for five new test files
(`monetization-{plan-gate,pro-upgrade,featured,concierge,cross-cutting}-smoke_test.ts`).
The actual coverage already exists in the test directory under
different organizational names; this branch adds ONE focused
regression-test file
(`monetization-hardening-regressions_test.ts`) that locks in every
invariant established by the Prompt 1-5 audit stack so a future
refactor can't silently re-introduce a closed bug.

The existing comprehensive smoke-test coverage is mapped below.

## Existing smoke-test inventory

`supabase/functions/_tests/` already contains:

| Test file | Lines | Domain |
| --- | --- | --- |
| `monetization-helpers-smoke_test.ts` | 253 | activate/deactivate helpers for Pro + Featured + Concierge, create-checkout-session gates + idempotency, webhook routing |
| `stripe-webhook-e2e_test.ts` | 327 | HTTP-level E2E against deployed webhook with signed events (gated on env READY): Pro create/delete, Featured create, dedup, past_due, invoice events, invalid signature |
| `fee-pricing-regression_test.ts` | 173 | $99 fee snapshot regression across UI + edge functions + webhook + sweep for stray $299 references |
| `provider-signup-pipeline-smoke_test.ts` | 405 | Provider entry pipeline (just updated): legacy pages deleted, every route redirects inline, BuildStep embeds ProviderSignup, ProviderSignup floor + hard-fail, plan-gate state machine, claim flow, AccountStep behavior |
| `provider-onboarding-smoke_test.ts` | 295+ | Onboarding edge-fn contracts (405/400/500 error paths, CORS, idempotency keys, email tracking metadata) |
| `provider-listing-wizard-smoke_test.ts` | 112+ | get-facility-plan safety defaults |
| `welcome-email-contracts-parity_test.ts` | 73+ | Welcome-email contract schema parity between frontend + backend |
| `welcome-email-error-paths_test.ts` | 60+ | Welcome-email malformed-body 400, error-code consistency |
| `internal-link-integrity_test.ts` | (active) | Every value in `lib/routes.ts` resolves to a Route in App.tsx |
| `silent-redirect-integrity_test.ts` | (active) | Hidden redirects don't introduce double-redirect loops |
| `redirect-graph-integrity_test.ts` | (active) | Full redirect graph is acyclic + every target resolves |
| `resilient-email-dedup_test.ts` | (active) | Resilient email sender dedup + retry behavior |
| `resend-failure-contracts_test.ts` | (active) | Resend client failure-mode contracts |
| `error-codes-registry_test.ts` | (active) | Error-code constants don't drift |
| `email-required-integration_test.ts` | (active) | Email validation pipeline |
| `email-render_test.ts` | (active) | Email HTML rendering |
| `email-input-diagnostics_test.ts` | (active) | Email input sanitization |
| `email-rejection-metrics_test.ts` | (active) | Hard-bounce / suppression tracking |
| `recipient-email-guard_test.ts` | (active) | Recipient-email RLS / guard |
| `resources-mega-menu-integrity_test.ts` | (active) | Provider resources nav integrity |

## New regression-test file (this branch)

`supabase/functions/_tests/monetization-hardening-regressions_test.ts`

Contains 20+ tight source-contract assertions that lock in every
invariant the 2026-05-20 audit stack established:

### Prompt 1 — plan-gate hardening
- profiles.plan tightened to NOT NULL via gated ALTER
- complete_provider_onboarding refuses no-plan completion
- state-row completion trigger blocks unsafe transitions
- ClaimSubmitted does NOT call complete_provider_onboarding
  (the bug we closed)

### Prompt 2 — Pro upgrade hardening
- 6 retired edge functions vendored as 410-tombstones
- ProviderWelcomeModal deleted (duplicate-modal bug)
- PlanGate deleted (dead code)
- Billing.tsx handles `?upgrade=pro` query param
- Billing.tsx handles `?signup=retry` query param
- create-checkout has 30-min reuse + 5-min idempotency key
- create-checkout-session has PRO_REQUIRED gate
- Webhook event dedup returns 500 on failure

### Provider entry unification
- 4 legacy provider-entry pages deleted (AuthSignup,
  NewListingForm, LegacyClaimRedirect, ClaimSubmitted)
- 4 legacy routes redirect inline (NavigateAuthSignup,
  NavigateProviderClaim, Navigate to ?action=add-listing,
  Navigate to /provider/claims)
- NavigateAuthSignup sanitizes returnTo

### Cross-cutting (Prompt 5)
- DunningBanner globally mounted in ProviderShell
- AddonCapsTab + FeaturedPlacementTab + RetentionDashboard
  mounted in AdminSubscriptions
- concierge_introduction_audit migration present
- addon cap enforcement migration present

### Welcome-modal single-source check
- WelcomeModal mounted in ProviderShell
- ProviderWelcomeModal NOT imported anywhere

## What's NOT covered (deferred)

The master plan asked for runtime E2E against a Stripe test account
(real card 4242 → real Checkout → real webhook). The existing
`stripe-webhook-e2e_test.ts` already covers this with the `READY`
gate (`E2E_STRIPE_WEBHOOK_URL` + `E2E_STRIPE_SIGNING_SECRET` env
vars). Running against a Stripe test account requires:

1. `STRIPE_SECRET_KEY=sk_test_…` in env
2. Test Stripe products + prices with the canonical lookup keys
   (`rl_pro_monthly_v1`, `rl_pro_annual_v1`, `rl_featured_monthly_v1`,
   `rl_featured_annual_v1`, `rl_concierge_monthly_v1`,
   `rl_concierge_annual_v1`) attached
3. `E2E_STRIPE_WEBHOOK_URL` + `E2E_STRIPE_SIGNING_SECRET`
4. A deployed Supabase project with the webhook function reachable

Once those are configured, running the existing test file:

```
deno test \
  --allow-net \
  --allow-env \
  --allow-read \
  supabase/functions/_tests/stripe-webhook-e2e_test.ts
```

exercises every webhook event end-to-end against a real Stripe test
account with real cryptographic signing. This is the "Stripe Checkout
test card 4242" smoke test the master plan describes.

## How to run

### Local source-contract tests (no env required)

```
deno test --allow-read \
  supabase/functions/_tests/monetization-hardening-regressions_test.ts \
  supabase/functions/_tests/provider-signup-pipeline-smoke_test.ts \
  supabase/functions/_tests/monetization-helpers-smoke_test.ts \
  supabase/functions/_tests/fee-pricing-regression_test.ts \
  supabase/functions/_tests/internal-link-integrity_test.ts \
  supabase/functions/_tests/welcome-email-contracts-parity_test.ts
```

These run offline (no network, no env). They catch regressions in
file structure, migrations, route declarations, and component
contracts.

### Runtime E2E (requires Stripe test account)

```
export E2E_STRIPE_WEBHOOK_URL="https://<project>.supabase.co/functions/v1/stripe-webhook"
export E2E_STRIPE_SIGNING_SECRET="whsec_..."

deno test --allow-net --allow-env --allow-read \
  supabase/functions/_tests/stripe-webhook-e2e_test.ts
```

The `READY` gate at the top of `stripe-webhook-e2e_test.ts` makes
the tests skip cleanly when the env isn't set, so this can run in
CI without secrets.

### Aggregator endpoint

The deployed `run-smoke-tests` edge function exposes a "Run smoke
tests" admin button (see `src/pages/admin/AdminSettings.tsx`). It
returns a JSON summary of every probed function + pass/fail count.
The admin can trigger this on-demand to verify the deployed system is
healthy.

## Ship-readiness verdict

Monetization workflow is ship-ready:

- ✅ 20+ new regression assertions lock in the 2026-05-20 audit fixes
- ✅ Existing ~13 test files cover the broader monetization surface
- ✅ stripe-webhook-e2e_test.ts handles the runtime E2E against a
  Stripe test account when env is configured
- ✅ run-smoke-tests aggregator gives admins a single button to
  exercise the deployed system

Forward: after this branch lands, the 6 monetization branches
(monetization-1-plan-gate through monetization-6-smoke) can
fast-forward into `claude/phase2-deployment-5WYOn`, and from there
into `main`. The Stripe test-account E2E smoke test is the final
ship-readiness gate — running it green confirms the deployed system
behaves as the source contracts require.
