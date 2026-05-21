# Inquiry → Lead Workflow — Audit + Targeted Hardening

**Date:** 2026-05-20
**Branch:** `claude/phase2-deployment-5WYOn`
**Verdict:** ✅ Production-ready. Tier-routing pipeline is wired end-to-end; this pass closed the four ops-visibility gaps in the Free-tier branch.

---

## TL;DR

The audit found the inquiry → lead pipeline is **much more wired than expected** — entry CTAs, submission, tier branching, dedup, rate-limiting, provider inbox, admin concierge surfacing, and notifications are all in place. The actual problem was narrower: **the Free-tier branch of `submit-qualified-lead` was writing a `concierge_inquiries` row but not triggering the ops-side flows that the equivalent paid-concierge path triggers**. So Free-tier inquiries were landing in the database, the seeker was getting a confirmation page promising "a coordinator will call within 1 business hour", but ops had zero visibility — no admin notification, no timeline event, no auto-assigned advisor, no confirmation email if the seeker closed the tab.

**Fix:** Mirrored the four advisor-handoff steps from `submit-concierge-intake` into the free-tier branch of `submit-qualified-lead`. The seeker's "coordinator will call" promise is now backed by ops infrastructure that actually fires when the row is created.

---

## What the audit found

### ✅ Already wired (no rebuild needed)

| Area | Implementation | Status |
|------|---------------|--------|
| Entry CTAs | `RequestInfoModal`, `SearchResultCard`, `CenterProfile`, `LeadIntakeForm` | ✅ |
| Submission pipeline | `submit-qualified-lead/index.ts` (1,690 LOC, single entry) | ✅ |
| Tier detection | Server-side live query of `facility_subscriptions.tier` (never trusts client) | ✅ |
| Tier branching | `if (!isProTier) → concierge_inquiries; else → leads` at lines 1156-1276 | ✅ |
| Idempotency | Client UUID + server constraint + Postgres UNIQUE catch | ✅ |
| Dedup window | 24h same-email-phone-facility check | ✅ |
| Rate limiting | 10/h per-email + 5/h per-facility-email + 15/h per-IP (SHA-256) | ✅ |
| Email verification | Server-enforced via `is_email_verified` RPC | ✅ |
| Blocked identifiers | `is_identifier_blocked` RPC | ✅ |
| Pro-tier notifications | Email + SMS + in-app `provider_notifications` + `notification_events` | ✅ |
| Free-tier facility upsell | Async `notify-free-tier-inquiry-redirect` invocation | ✅ |
| Provider inbox | `/provider/dashboard` + `/provider/inquiries` via `leads_provider_view` | ✅ |
| Inbox polling | 30s interval (Realtime intentionally disabled for PII safety) | ✅ |
| Admin concierge surface | `/admin/concierge` with `routing_mode` filter for Free-tier redirects | ✅ |
| Seeker confirmation page | `/inquiry/confirmation/:id` reading from `concierge_inquiries` | ✅ |
| RLS on add-on tables | Fixed in prior pass (`20260520065601_addon_write_rls_policies.sql`) | ✅ |

### 🔴 Closed in this pass

The Free-tier branch was creating a row in `concierge_inquiries` and then... that's it. Ops only found out the inquiry existed if a coordinator happened to refresh the dashboard. Four parallel steps that `submit-concierge-intake` already does for paid intakes were missing for free-tier redirects:

| # | Missing piece | Impact | Fix |
|---|---------------|--------|-----|
| 1 | `admin_notifications` row | Ops blind to new pending intakes | Added insert with `type=concierge_intake`, `routing_mode=free_tier_redirect` metadata |
| 2 | `concierge_case_events` row | Admin timeline tab empty for these cases | Added `case_created` event with `source=free_tier_redirect` |
| 3 | Round-robin advisor auto-assign | Case sits unassigned in queue | Mirrored the load-balanced advisor pick from `submit-concierge-intake:539-573` |
| 4 | Seeker confirmation email | If seeker closes tab they have no receipt | Added `getFreeTierSeekerConfirmationEmail` + `sendEmailWithRetry` w/ `free-tier-seeker-{id}` idempotency key |

All four are **non-blocking try/catch** — a failure in any one doesn't fail the seeker's request. The `concierge_inquiries` row is the source of truth; these are supplementary surfaces.

---

## Architecture (after this pass)

### Pro-tier flow (unchanged)
```
Seeker fills RequestInfoModal → useLeadIntakeForm submits
   → submit-qualified-lead (tier check: pro)
        ├─ INSERT into leads (idempotency_key UNIQUE)
        ├─ INSERT into lead_distributions
        ├─ Email seeker (getSeekerConfirmationEmail, dedup key seeker-confirm-{id})
        ├─ Email facility (getFacilityNotificationEmail, dedup key facility-lead-{id})
        ├─ SMS facility (send-sms-notification, w/ retry → admin_notifications on fail)
        ├─ INSERT into provider_notifications (in-app)
        └─ INSERT into notification_events (audit/billing)
   → response 200 { success: true, leadId, facilityName }
   → modal shows success state
   → provider inbox at /provider/inquiries (polls 30s) shows new lead
```

### Free-tier flow (closed gaps in this pass)
```
Seeker fills RequestInfoModal → useLeadIntakeForm submits
   → submit-qualified-lead (tier check: free or unclaimed)
        ├─ INSERT into concierge_inquiries (routing_mode='free_tier_redirect')
        ├─ [NEW] INSERT into admin_notifications
        ├─ [NEW] INSERT into concierge_case_events (case_created)
        ├─ [NEW] Round-robin advisor auto-assign
        ├─ [NEW] Email seeker (getFreeTierSeekerConfirmationEmail, dedup key free-tier-seeker-{id})
        └─ Async fan-out: notify-free-tier-inquiry-redirect (upsell email to Free facility)
   → response 200 { routing_mode: 'free_tier_redirect', confirmation_path: '/inquiry/confirmation/{id}' }
   → client navigates to /inquiry/confirmation/{id}
   → ops sees pending intake in /admin/concierge with routing_mode filter
   → assigned advisor receives case via case-load balancing
```

---

## Source-contract assertions — 33 checks

```
✓ 1.tier-branch    : queries facility_subscriptions for tier
✓ 1.tier-branch    : isProTier check (status=active AND tier=pro)
✓ 1.tier-branch    : free tier → concierge_inquiries insert (routing_mode='free_tier_redirect')
✓ 1.tier-branch    : pro tier → leads insert
✓ 1.tier-branch    : free path returns confirmation_path

✓ 2.free-tier      : admin_notifications insert (NEW)
✓ 2.free-tier      : concierge_case_events insert (NEW)
✓ 2.free-tier      : advisor round-robin auto-assign (NEW)
✓ 2.free-tier      : seeker confirmation email (NEW)
✓ 2.free-tier      : notify-free-tier-inquiry-redirect still wired

✓ 3.dedup          : idempotency-key lookup
✓ 3.dedup          : 24h same-email-phone-facility duplicate check
✓ 3.dedup          : per-email rate limit (10/h)
✓ 3.dedup          : per-facility rate limit (5/h same email)
✓ 3.dedup          : per-IP rate limit (15/h, SHA-256 hashed)
✓ 3.dedup          : idempotency UNIQUE constraint Postgres-catch (23505)

✓ 4.verify         : server enforces email verification (is_email_verified RPC)
✓ 4.verify         : blocked identifier check (is_identifier_blocked RPC)

✓ 5.pro            : seeker confirmation email (idempotency key seeker-confirm-{id})
✓ 5.pro            : facility notification email (idempotency key facility-lead-{id})
✓ 5.pro            : provider_notifications row inserted (in-app)
✓ 5.pro            : notification_events row inserted (audit)
✓ 5.pro            : SMS via send-sms-notification edge fn

✓ 6.client         : idempotency key generated (UUID/email/facility/timestamp)
✓ 6.client         : submit debounce + in-flight guard
✓ 6.client         : handles free_tier_redirect → navigate to confirmation_path

✓ 7.confirm-page   : reads originating_facility_name
✓ 7.confirm-page   : queries concierge_inquiries by id

✓ 8.admin          : routing_mode column in SELECT
✓ 8.admin          : routing-mode filter UI (free_tier_redirect / standard / all)

✓ 9.provider-inbox : queries leads_provider_view (PII-safe)
✓ 9.provider-inbox : 30s polling fallback present

✓ 10.notify-fn     : exists + handles facility upsell (facility_id + inquiry_id payload)
```

**33/33 pass.**

---

## CI gate results

| Check | Result |
|-------|--------|
| `npx tsc --noEmit` | ✅ clean |
| `npx vitest run` | ✅ 128 passed / 5 skipped |
| `npx vite build` | ✅ built in 51.29s |
| Source-contract smoke | ✅ 33/33 |

---

## Notes on items intentionally NOT changed

| Item | Why |
|------|-----|
| Provider Inquiries page uses 30s polling not realtime | Architectural decision documented at `Inquiries.tsx:162` — "Realtime disabled for PII safety". The `leads_provider_view` PII masking is enforced via RLS; realtime replication can bypass row-level filtering in some configurations. Polling is correct here. |
| Skipped consent-notice tests in `RequestInfoForm.test.tsx:100` | TODO in source notes "copy + Terms/Privacy links need re-testing after recent form changes" — out of scope for routing hardening. |
| `ProviderBillingConciergePage` redirect-only lazy import | Kept for backward bookmark compatibility (prior audit). |
| No tier-aware RLS on `leads` (Free + Pro providers at same facility) | Facility ownership is the gate; multi-tier-per-facility isn't a supported use case. |
| Email verification strict (no fallback path) | Intentional — every inquiry must have a verified email before it reaches provider/concierge surfaces. Verified emails cache for 24h to minimize friction. |

---

## Files changed in this pass

| File | Change | LOC |
|------|--------|-----|
| `supabase/functions/submit-qualified-lead/index.ts` | Added 4 ops-handoff blocks in free-tier branch + `getFreeTierSeekerConfirmationEmail` template | +175 |
| `docs/inquiry-lead-workflow-audit-2026-05-20.md` | This file | +new |

---

## Acceptance criteria (per the brief)

| Criterion | Status |
|-----------|--------|
| Audit complete (entry points, pipeline, data model, routing, notifications, inbox) | ✅ |
| Pro providers receive inquiries directly in their Leads inbox | ✅ Already wired; `/provider/inquiries` queries `leads_provider_view` |
| Unclaimed and Free tiers route to Concierge intake | ✅ Already wired; `concierge_inquiries` insert w/ `routing_mode='free_tier_redirect'` |
| Eliminate duplicates | ✅ Triple safeguard (client debounce + idempotency UNIQUE + 24h dupe check + 3-tier rate limiting) |
| Eliminate silent failures | ✅ Fixed — admin_notifications + case_events + advisor + seeker email now fire on free-tier path |
| Tier snapshot at submit time | ✅ Server-side re-check; never trusts client |
| Notifications + acknowledgements with retries + logs | ✅ All emails use `sendEmailWithRetry` with idempotency keys + logging |
| Provider inbox shows new inquiries | ✅ 30s polling (realtime intentionally disabled for PII) |
| Concierge console surfaces free-tier redirects | ✅ `/admin/concierge` has routing_mode filter |
| Schema integrity (tier_snapshot, originating_facility_id, indexes) | ✅ Stored in `concierge_inquiries.intake_data` + `routing_mode` + `originating_facility_id` columns |
| Production-ready end-to-end | ✅ |

---

## Smoke verdict

🟢 **Ship-ready.** The inquiry → lead pipeline now has parity between Pro and Free-tier ops surfaces. Pro inquiries reach the provider inbox with email + SMS + in-app + audit. Free-tier inquiries reach the admin concierge dashboard with admin_notifications + case timeline + auto-assigned advisor + durable seeker email confirmation.
