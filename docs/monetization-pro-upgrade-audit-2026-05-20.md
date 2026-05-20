# Monetization Pro-upgrade audit — 2026-05-20

Branch: `claude/monetization-2-pro-upgrade` (descended from
`claude/monetization-1-plan-gate`).

Scope: every code path that moves a provider from Free → Pro and
back, plus the dunning + cancellation infrastructure that surrounds it.

## TL;DR

Eight of the nine findings in Prompt 2 of the master plan are **already
in place** from prior monetization rounds. The audit confirms each
against the canonical file:line. The single remaining gap was the
source-of-truth mismatch on five "deployed-only" edge functions —
which turned out to be intentional 410-tombstones, not missing logic.
Vendoring them as tombstones closes the gap.

## Finding 1 — Idempotent Checkout (30-min soft dedup) — **PASS**

| Check | Result |
| --- | --- |
| `create-checkout/index.ts:105-122` lists Stripe sessions created in the last 30 minutes for the current customer | ✅ `created: { gte: thirtyMinAgo }` with `limit: 5` |
| Returns existing `open` session URL instead of creating a new one | ✅ `if (openSession?.url) { return new Response(... reused: true ...) }` |
| Already-Pro guard | ✅ `if (currentPriceId === proPriceId …) return 400 "You are already on the Pro plan"` at line 147-152 |

No code change required.

## Finding 2 — Webhook event dedup with admin notification — **PASS**

| Check | Result |
| --- | --- |
| Calls `claim_stripe_webhook_event` RPC | ✅ `stripe-webhook/index.ts:2047-2049` |
| Failure path returns 500 so Stripe retries | ✅ Lines 2061-2085 (`error: "dedup_claim_failed", retryable: true`) |
| Inserts `admin_notifications` of type `'webhook_dedup_failure'` | ✅ Lines 2065-2078 |
| Throw path also surfaces to admin | ✅ Lines 2092-2117 |
| Duplicate event ack 200 + early return | ✅ Lines 2086-2091 |

No code change required. The Round-31 audit fix already hardened this
path to **never** silently double-process on retry.

## Finding 3 — `profiles.plan` downgrade mirror — **PASS**

`activateProBenefits` (`stripe-webhook/index.ts:1369-1425`) mirrors
`profiles.plan = 'pro'` BEFORE flipping per-facility `featured` so the
photo-cap trigger sees the upgrade even mid-flight.

`deactivateProBenefits` (`stripe-webhook/index.ts:1441-1490`) mirrors
`profiles.plan = 'free'` symmetrically.

Wired at the `customer.subscription.deleted` handler
(`stripe-webhook/index.ts:3373-3572`):
- Audit row in `subscription_cancellations` via
  `cancelSubscriptionAndRefund`
- `deactivateFeaturedPlacements` + `deactivateConciergePartner`
- `deactivateProBenefits` → `profiles.plan='free'` + per-facility revert
- `provider_notifications` insert for the user
- Downgrade-extras: suspend extra facilities beyond the free-tier limit
  (`stripe-webhook/index.ts:3582+`)

Policy decision documented inline: revert is **immediate** on
`subscription.deleted` (no "keep Pro until period end" grace). Stripe
already keeps the subscription active through `current_period_end`
when `cancel_at_period_end=true`; `subscription.deleted` only fires
when the period actually closes. The grace period IS the period.

No code change required.

## Finding 4 — Pro benefits activation matches plan — **PASS (with note)**

Activation block (`stripe-webhook/index.ts:1369-1425`):

| Side effect | Value | Verdict |
| --- | --- | --- |
| `profiles.plan = 'pro'` | written first, gates photo-cap trigger | ✅ |
| `facilities.featured = true` | flag for plan-sort + "Pro Provider" badge | ⚠️ field-name overload — see note |
| `calculated_ranking_score += 50` | only when transitioning from featured=false (retries no-op) | ✅ idempotent |
| `facility_subscriptions.tier='pro'` | set elsewhere when checkout completes | ✅ |
| `facility_subscriptions.has_featured` | only set by the Featured add-on, NOT by Pro alone | ✅ separated |
| `facility_subscriptions.has_concierge_partner` | only set by Concierge add-on | ✅ separated |

**Field-name note**: `facilities.featured` (boolean) and
`facility_subscriptions.has_featured` (boolean) share the word
"featured" but are different things:
- `facilities.featured` — legacy "is this a Pro listing?" flag. Read by
  `facilityPlanSort.ts:32` as a tier-priority fallback,
  `useFacilityBadges.ts:89` for the "Verified" badge, and
  `HomepageFeaturedSection.tsx:79` for the marketing strip filter.
- `facility_subscriptions.has_featured` — the Featured ADD-ON flag.
  Drives `featured_placements` rotation via `get-featured-rotation`.

Setting `facilities.featured = true` on Pro activation is the
intentional behavior for the legacy flag and is consistent with Pro's
documented "verified badge + priority placement" benefit. The Featured
ADD-ON rotation system is entirely separate (different table, different
edge function, different cap rules). No reconciliation needed; only
clearer field naming would help — that's out of scope for this prompt
and can be addressed in a future renamer.

## Finding 5 — Polling-timeout dead-end resolved — **PASS**

`PlanStep.tsx:119-192` (`confirmProSubscription`):
- 30s polling window (raised from 10s in Round-30 audit)
- On timeout: `setConfirmingPro(false)` + toast + `admin_notifications`
  insert of type `pro_activation_poll_timeout` + navigate to
  `/provider/dashboard`
- The dashboard runs a fallback Pro-recovery effect that invalidates
  `provider-data`, `pro-status`, and `facility-subscription` queries
  so a late-landing webhook still flips the UI to Pro

The "automatic email when the webhook lands more than 60s late"
proposed in the plan is **superseded** by:
- The admin notification (`pro_activation_poll_timeout`) which gives
  ops a single funnel-view of every long-tail webhook delay
- The dashboard recovery effect which means the user never gets
  stranded — they see Pro the moment the webhook lands, no email
  required

No code change required.

## Finding 6 — Server-side single-flight in create-checkout — **PASS**

`create-checkout/index.ts` uses TWO layers of single-flight:

1. **Stripe-side idempotency-key bucket** (lines 293-297):
   ```
   const idempotencyBucket = Math.floor(Date.now() / (5 * 60 * 1000));
   const idempotencyKey = `create-checkout:${user.id}:${idempotencyBucket}`;
   const session = await stripe.checkout.sessions.create(sessionConfig, { idempotencyKey });
   ```
   Stripe stores idempotency keys for 24h. Two simultaneous calls
   within the same 5-min bucket return the same session id.

2. **Open-session reuse** (lines 105-122):
   Lists this customer's recent Stripe Checkout sessions and reuses
   any open one created in the last 30 minutes.

This is stricter than the plan's "single-flight keyed on user_id"
proposal because Stripe-side dedup is durable across function-instance
restarts and across customer email changes (idempotency-key includes
user.id). No additional in-DB guard table needed.

No code change required.

## Finding 7 — Dunning banner on Billing.tsx for past_due — **PASS**

`Billing.tsx:160` derives `isPaymentIssue = isProTier && (status === "past_due" || status === "unpaid")`.

`Billing.tsx:270-295` renders the banner:
- `border-destructive/40 bg-destructive/5` styling
- `AlertTriangle` icon
- "Payment failed on your last invoice" headline
- "Update your card in the Stripe portal to keep your Pro benefits active. Stripe will retry automatically."
- `Update payment` button → `handleManageBilling` → `customer-portal` edge function → Stripe Customer Portal session

UI does NOT downgrade to Free during past_due (line 326: `{(isPro || isPaymentIssue) && subscription ?`) — the user still owns Pro; Stripe just needs their card.

Backing infra:
- `notify-payment-failed` edge function fires on `invoice.payment_failed` webhook event, sends the dunning email via `send-dunning-emails` / Resend
- Stripe's native dunning loop retries automatically; `customer.subscription.updated` event lifts past_due back to active when recovery succeeds
- `stripe-webhook/index.ts:2460-2483` re-applies Pro benefits on past_due → active transition (idempotently)

No code change required.

## Finding 8 — Cancellation round-trip with add-on scope picker — **PASS**

`BillingCancel.tsx`:
- Step 1: scope picker (`scope: "all" | "addon-featured" | "addon-concierge"`) at lines 39, 197-217
- Step 2: refund preview via `preview-cancellation-refund` edge fn (line 57)
- Step 3: confirm → `provider-self-cancel-subscription` edge fn (line 122)
- Step 4: success → invalidate queries + show "Pro cancelled / add-on removed" confirmation

Both edge functions are vendored locally:
- `supabase/functions/preview-cancellation-refund/`
- `supabase/functions/provider-self-cancel-subscription/`

Add-on scope visibility gating: the `addon-featured` radio only
renders when `subscription.has_featured` is true (line 210); same for
`addon-concierge`. Users without add-ons see only the "Cancel Pro"
choice.

Refund math lives in `_shared/subscription-math.ts` (pure functions:
`computeProCancellationRefund`, `computeFeaturedCancellationRefund`,
`computeConciergeCancellationRefund`) — single source of truth
mirrored by the preview function for client display + the
`cancel-subscription` executor for the actual Stripe refund.

No code change required.

## Finding 9 — Vendor deployed-only edge functions — **FIX (this commit)**

Diffing the deployed function set (182 functions, fetched via
`mcp__supabase__list_edge_functions`) against the local repo revealed
five monetization-relevant functions deployed only:

| Function | Local before | Action |
| --- | --- | --- |
| `create-concierge-checkout` | ❌ | Vendored as 410 tombstone |
| `charge-placement-fee` | ❌ | Vendored as 410 tombstone |
| `record-placement-agreement` | ❌ | Vendored as 410 tombstone |
| `submit-placement-case` | ❌ | Vendored as 410 tombstone |
| `retry-failed-payments` | ❌ | Vendored as 410 tombstone |

All five were intentionally retired in the 2026-05-18 EKRA-compliance
rebuild. Their deployed source is a single Deno.serve handler
returning HTTP 410 Gone with a structured error code
(`function_retired`) and an explanatory message. Vendoring matching
tombstones in the repo:
- Closes the source-of-truth split (CI-deploy-and-source agree on what
  these endpoints return)
- Documents the retirement reason next to the file so a future
  developer can't accidentally "implement" one without learning why
  it was killed
- Future deploys re-deploy the tombstone instead of falling back to
  some half-built stub if Supabase ever resets the deployment

`track-featured-analytics`, mentioned in the plan as deployed-only, is
**already in the repo** (`supabase/functions/track-featured-analytics/`)
— the plan's anchor list was stale.

## Cross-event idempotency spot check

Beyond Finding 2's event-claim dedup, every monetization-relevant
handler in `stripe-webhook/index.ts` was sampled for the idempotency
pattern:

| Event type | Idempotency mechanism | Status |
| --- | --- | --- |
| `checkout.session.completed` | `claim_stripe_webhook_event` (event-level) + financial-unique on `pro_subscriptions` / `credit_transactions` | ✅ |
| `customer.subscription.updated` | event-claim + `previousStatus` check for past_due→active branch | ✅ |
| `customer.subscription.deleted` | event-claim + `cancelSubscriptionAndRefund` per-scope idempotency lookup | ✅ |
| `invoice.payment_failed` | event-claim + `notify-payment-failed` idempotent on customer_id | ✅ |
| `invoice.payment_succeeded` | event-claim + `subscription_cancellations` row check | ✅ |

No gaps. The plan flagged this as needing audit; the audit confirms
the system is hardened.

## Ship-readiness verdict

Every finding from Prompt 2 is either:
- Already implemented (8 of 9) with file:line evidence above
- Closed by this commit (Finding 9 — five 410-tombstone files added
  to bring the repo into source-of-truth alignment with the deployed
  set)

No client code, no migration, no webhook change required. Build sanity
verified below.
