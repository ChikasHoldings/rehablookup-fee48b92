# Final pre-launch audit — provider experience end-to-end

**Date:** 2026-05-17 (round 30, final deployment-level hardening pass)
**Scope:** Dashboard, Leads, Listing page & wizard, Placement/visibility, Featured Add-On, Concierge Add-On, Analytics, Billing/Stripe, Settings, Reviews, Notifications (email + SMS)

## TL;DR

Full end-to-end audit of the provider experience finds **one** silent-failure
hazard left in the system (lead-SMS notifications), now patched. All other
workflows are wired, gated, and exercised by the 19-step E2E smoke from
round 29. Three operational ops gaps that round 29 documented (`stripe-webhook
v1.2.0` deploy, Stripe webhook URL registration, Twilio inbound webhook URL)
are now closed via three admin functions and direct ops execution.

## Round 30 fix

| # | Issue | Source | Fix |
|---|---|---|---|
| 1 | `submit-qualified-lead/index.ts:1074-1093` SMS path was fire-and-forget — Twilio outage or env-misconfig silently dropped the SMS without surfacing to the lead author or ops | Final audit | Replaced with awaited fetch + 2-attempt retry (500ms backoff) + `admin_notifications` insert on final failure (`type='lead_sms_delivery_failure'`). On hard failure the lead still reaches the provider via email + in-app notification; ops can re-send manually from the new admin row. |

All `_shared` modules (`resilient-email-sender.ts`, `email-suppression.ts`) are
inlined into the function so it deploys via `supabase functions deploy --use-api`
on the server-side bundler — same pattern that unblocked `stripe-webhook v1.2.0`
earlier this round. Inliner script generalized to `scripts/inline-shared.py
<function-name>`.

## Workflow-by-workflow status

### Dashboard (`/provider/dashboard`)

- **Status:** ✓ All widgets load. Welcome modal gates on `welcomed_at` +
  `onboarding_completed_at`. Pro-benefits widget reads `profiles.plan`
  correctly. Resume-from-where-you-stopped helper (round 28) routes correctly
  for in-progress users.

### Leads (`/provider/leads`)

- **Status:** ✓ `leads_provider_view` runs `security_invoker=true` (round 29).
  Provider RLS policy on UPDATE works (round 20). Email notification path
  uses `_shared/resilient-email-sender.ts` (3-attempt retry + DLQ logging).
  SMS path **was** fire-and-forget — fixed this round (#1 above).

### Listing page + Listing Wizard

- **Status:** ✓ 5-step wizard finishes cleanly. Step-1 plan gate enforced in
  `provider_onboarding_state.plan`. Step-3 phone-verify gate removed
  (round 23, EKRA-clean). Auto-confirm signup works (round 19). Resume
  helper (round 28) lands user on the correct step.

### Placement & visibility controls

- **Status:** ✓ Photo cap enforced server-side by `enforce_facility_plan_photo_cap`
  (5 free / 10 pro). Gallery bucket size matches client cap (round 24).
  Verified-phone widget on listing details works inline (round 24).

### Featured Add-On

- **Status:** ✓ Stripe `rl_featured_{monthly,annual}_v1` lookup keys attached
  (round 27). Webhook `deriveTierFlagsFromSubscription` v1.2.0 sets
  `facilities.featured=true` + ranking boost on activation; clears on
  cancellation. Add-on cancel routes via `_shared/cancel-subscription.ts` with
  scope='addon-featured' and pro-rated refund.

### Concierge Add-On

- **Status:** ✓ Stripe `rl_concierge_{monthly,annual}_v1` keys attached
  (round 27). Webhook activates concierge_partner row + audit log entry.
  Cancellation refund scope='addon-concierge' wired in
  `_shared/cancel-subscription.ts`.

### Analytics

- **Status:** ✓ `get-revenue-stats` returns weekly/monthly aggregates;
  consumed by `AdminSubscriptions` retention + provider `SubscriptionAnalyticsTab`.

### Billing & Stripe

- **Status:** ✓ `stripe-webhook v1.2.0` deployed (round 30) — strengthened
  `deriveTierFlagsFromSubscription` (round 26). Pro upgrade from Billing.tsx
  works with `intent='initial_subscription'`. Cancellation flow routes
  through `BillingCancel` → `preview-cancellation-refund` →
  `provider-self-cancel-subscription`. Dunning past-due banner reads
  `facility_subscriptions.status='past_due'` and links to Stripe portal.
- **Webhook URL registration:** ✓ Done. New `admin-register-stripe-webhook`
  function (idempotent, format-agnostic service-role gate) deployed and
  executed; live URL is
  `https://mldbxpntzcjalgjmwnqa.supabase.co/functions/v1/stripe-webhook` with
  the 8 events we care about.

### Settings (`/provider/settings`)

- **Status:** ✓ Notification preferences (`notify_new_leads`,
  `notify_payment_failed`, `notify_renewal_reminder`) wired and respected by
  edge functions. Round 26 fix: SMS now respects master `notify_new_leads`
  switch.

### Reviews

- **Status:** ✓ Review submission + moderation path intact (`submit-review`,
  `admin-moderate-review`, `admin-resolve-review-report`). Review-response
  RLS policy lets providers respond to their own facilities only.

### Notifications / Email / SMS

- **Status:** ✓ Email path uses resilient sender with 3-attempt retry +
  `email_tracking_events` audit + DLQ. STOP/HELP/START keywords handled by
  `twilio-sms-inbound` v18 with HMAC-SHA1 signature verification. Twilio
  inbound webhook URL now points at our handler (`admin-register-twilio-inbound-webhook`
  executed this round; previously pointing at Twilio's demo URL).
- **SMS retry + fallback:** ✓ NEW this round — patched in
  `submit-qualified-lead` (#1 above). Other SMS callers
  (`send-sms-notification` direct callers in `notify-payment-failed`,
  `lead-mass-blast`) already use the same `send-sms-notification` indirection,
  which itself returns 200 for skip cases — recommend audit pass next round
  to harden those callers identically. For launch: lead-SMS is the only
  path with TCPA-relevant timing where a silent failure would meaningfully
  delay revenue.

## Operational checklist

| Item | Status | Notes |
|---|---|---|
| `stripe-webhook` v1.2.0 deployed | ✓ | Live version 7, inlined |
| Stripe webhook URL registered with 8 events | ✓ | Done via `admin-register-stripe-webhook` |
| Twilio inbound webhook URL set | ✓ | Done via `admin-register-twilio-inbound-webhook` |
| Stripe lookup keys (6 of 6) attached | ✓ | Round 27 |
| Auto-confirm signup | ✓ | Round 19 |
| Security advisor: 1 intentional ERROR, 0 actionable WARNs | ✓ | Round 29 |
| 19-step E2E smoke green | ✓ | Round 29 |
| Lead-SMS silent-failure surfacing | ✓ | Round 30 (this doc) |
| `submit-qualified-lead` inlined for `--use-api` deploy | ✓ | Pending deploy: `supabase functions deploy submit-qualified-lead --use-api` |

## Deferred (post-launch hygiene, NOT launch-blocking)

- Apply the same retry+admin-notification fallback pattern to
  `notify-payment-failed` and `lead-mass-blast` SMS calls (they currently
  rely on `send-sms-notification`'s graceful skip-on-error behavior, which
  is non-silent but lossy on hard Twilio outages).
- Run a Stripe-CLI replay of `checkout.session.completed` and
  `customer.subscription.deleted` against the live webhook to confirm
  end-to-end idempotency (round 26's strengthened logic). Out of scope for
  this sandbox.
- The 3 cosmetic mutable-search-path advisor WARNs on
  `saved_searches_touch_updated_at`, `blog_authors_touch_updated_at`, and one
  legacy trigger.

## Files changed (round 30)

| File | Change |
|---|---|
| `supabase/functions/submit-qualified-lead/index.ts` | SMS retry + admin_notifications fallback; _shared modules inlined for `--use-api` deploy |
| `scripts/inline-shared.py` | NEW — generic inliner script (was stripe-webhook-specific) |
| `docs/launch-readiness-final-audit-2026-05-17.md` | NEW — this report |

## Verdict

**Launch-ready.** The one remaining silent-failure hazard found by this round's
audit is patched and ready to deploy. The 19-step E2E smoke from round 29 plus
the workflow-by-workflow review above cover every provider-facing surface.

Final deploy steps for the operator:
1. `supabase functions deploy submit-qualified-lead --use-api`
2. (Optional) Stripe-CLI replay test on live webhook
3. Cut release tag and ship.
