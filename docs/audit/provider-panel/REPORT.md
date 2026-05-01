# Provider Panel — Audit Report (Phase 5)

_Generated: 2026-05-01. See `01-surface-map.md`, `02-static-checks.md`, `03-flow-traces.md` for evidence._

## Executive summary

The provider panel is **structurally sound and production-grade in its hottest paths** (lead unlock, credit deduction, RLS-gated PII, Stripe webhook idempotency, multi-facility scoping). The PII masking contract holds across **111 scanned files** and **20 contract tests**. RLS policies on `public.leads` are present and enforced through `leads_provider_view` (security_invoker).

This audit found **2 real high-severity issues** worth fixing before the next production push, **3 medium** items, and **3 low / quick wins**. No critical blocker was identified in code review. Several flows still require runtime reproduction (Phase 4) to graduate from ⚠ to ✅ — they are listed under "Did not test".

## Issues

### H1 — Credit deduction not rolled back on uncaught exceptions in `unlock-lead`
- **Severity:** High
- **Affected:** `supabase/functions/unlock-lead/index.ts` (lines ~313 → ~423)
- **Steps to reproduce:** Deduct credits succeeds (line 313). If anything between that and the `lead_unlocks` insert (e.g. the redistribution check, fetch-lead, or a transient network error to Postgres) throws, control falls through to the outer `try/catch`. The rollback branch only runs in the explicit `if (unlockError)` block.
- **Expected:** Any failure after credit deduction and before `lead_unlocks` is committed must refund credits.
- **Actual:** Thrown errors return 500 without refunding.
- **Root cause:** Error handling is per-branch, not wrapped around the deduction → insert pair.
- **Fix:** Introduce a `creditsDeducted` flag set immediately after deduction, and a single `catch` that calls `increment_provider_credits` + writes a refund row + admin_notification on any error path before the unlock row is committed.

### H2 — `auto-reload-credits` uses `select("*")` on a sensitive settings table
- **Severity:** High (contract violation)
- **Affected:** `supabase/functions/auto-reload-credits/index.ts:94`
- **Steps to reproduce:** Static scan via `scripts/audit/scan-provider-edge-functions.mjs`.
- **Expected:** Per platform memory, no `select("*")` anywhere; explicit columns only.
- **Actual:** `from("provider_auto_reload_settings").select("*")`.
- **Root cause:** Drift from the rule.
- **Fix:** Replace with the exact columns used in the function (`enabled`, `threshold_cents`, `reload_amount_cents`, `payment_method_id`, `provider_id`).

### M1 — Stripe-paid unlock has no client-side reconciliation if webhook is delayed/missed
- **Severity:** Medium
- **Affected:** `unlock-lead` (Stripe path) + `Inquiries.tsx` success URL
- **Steps to reproduce:** User clicks Unlock with `paymentMethod='stripe'`, completes Stripe Checkout, returns to `/provider/inquiries?unlock_success=true&lead=…`. If the webhook is delayed, the unlock row hasn't been written yet — the lead still appears locked.
- **Expected:** A confirmation/verify call reconciles state.
- **Actual:** UI just renders inquiries; user must wait/refresh.
- **Fix:** On `unlock_success=true`, call a `verify-unlock-payment` edge fn (or reuse `unlock-lead` with a `session_id` arg) that confirms the Stripe session and creates the unlock row if missing. Mirrors `verify-concierge-payment`.

### M2 — Post-signup race between `profiles` row creation and `ProviderShell` role check
- **Severity:** Medium
- **Affected:** `src/components/provider/ProviderShell.tsx:74-94`
- **Steps to reproduce:** Sign up as a new provider; if the post-signup `profiles` insert lags (DB latency / trigger), `useUserRole` returns `null` and the shell falls back to a manual `from("profiles").select("id")` and bounces to `/login?type=provider` if it doesn't find one.
- **Expected:** New provider lands on `/provider/dashboard` reliably.
- **Actual:** Possible bounce-to-login on slow signup.
- **Fix:** Add a single short retry (e.g. 500ms × 2) in the shell's `checkProvider` before the redirect, or have `ProviderSignup` await the trigger by polling `profiles` once before navigating.

### M3 — Notification fan-out on new lead is not deduplicated across channels
- **Severity:** Medium (UX)
- **Affected:** `send-lead-email`, `send-sms-notification`, `provider_notifications` insert
- **Steps to reproduce:** A lead arrives; the panel sends email + SMS + in-app simultaneously regardless of provider preferences.
- **Expected:** Per-provider channel preferences gate which fan-outs fire, and digest mode batches.
- **Actual:** Not asserted in code review; memory `mem://monetization/lead-engagement-and-urgency` describes a 5-stage sequence but channel prefs are not visible at the call site.
- **Fix:** Centralize channel selection through one `notify-provider-of-lead` orchestrator that reads `provider_notification_preferences` and dispatches accordingly.

### L1 — `verify_jwt` defaults rely entirely on in-code checks
- **Severity:** Low (defense-in-depth)
- **Affected:** All public edge functions
- **Note:** This is the documented project default. Working as designed; mention only because failure to validate in-code on a new function would silently expose data. Recommend a CI script that flags any new function without `auth.getUser` unless explicitly allowlisted.

### L2 — Supabase advisor noise (180 WARN entries)
- **Severity:** Low
- **Affected:** ~178 SECURITY DEFINER functions flagged for "anyone signed-in can EXECUTE"
- **Action:** Spot-check the highest-privilege RPCs (`admin_*`, `manage-*`) for least-privilege EXECUTE grants; the rest are intentional.

### L3 — Quick win: add a CI check for `select("*")` in `supabase/functions/`
- Mirror the `check:provider-leads-masking` script for edge functions. Would have caught H2 before merge.

## Totals

| Severity | Count |
| --- | --- |
| Critical | 0 |
| High | 2 |
| Medium | 3 |
| Low | 3 |

## Critical blockers (must-fix before production)

None identified. H1 and H2 should ship next.

## Quick wins (high impact / low effort)

- **H2** — single-file edit, ~5 minutes.
- **L3** — add `scripts/audit/check-edge-functions-no-star-select.mjs` and wire into `build`.
- **M2** — 10-line patch in `ProviderShell.tsx`.

## Did not test (explicit out-of-scope list)

These need either runtime browser reproduction or live-mode payment simulation; treat them as **unverified** rather than "passed":

1. End-to-end signup → email verification → first dashboard load.
2. Real-time lead arrival fan-out (email + SMS + in-app) on a new submitted lead.
3. Stripe `invoice.payment_failed` → Pro downgrade actually disables Pro features in UI.
4. `delete-provider-account` cascade on a populated account.
5. MFA setup + recovery flow.
6. Direct-URL authz bypass attempts (e.g. opening another provider's `/provider/inquiries?lead=…` link).
7. Network-failure mid-unlock on the live preview.
8. Mobile responsiveness across all 16 panel routes.
9. Concierge PII disclosure round-trip.
10. SMS deliverability.

If any of these are priorities, say which and I'll run Phase 4 reproductions on them.

## Phase 6 (next)

I have not made any code changes. To proceed:
- "Fix H1 and H2" → I'll patch both.
- "Fix all High + Medium" → I'll batch H1, H2, M1, M2, M3.
- "Run Phase 4 on items 1, 6, 7" → I'll reproduce in the preview and add findings.

---

## Phase 6 — Fixes applied (2026-05-01)

| ID | Status | Files |
| --- | --- | --- |
| **H1** — credit rollback on uncaught exception | ✅ Fixed | `supabase/functions/unlock-lead/index.ts` (try/catch safety net armed at deduction, disarmed only after `lead_unlocks` insert; falls back to atomic `increment_provider_credits` + refund txn + admin alert) |
| **H2** — `select("*")` in auto-reload-credits | ✅ Fixed | `supabase/functions/auto-reload-credits/index.ts` — explicit columns |
| **M1** — Stripe-paid unlock has no client reconciliation | ✅ Fixed | New `supabase/functions/verify-unlock-payment/index.ts`; `unlock-lead` Stripe `success_url` now includes `session_id={CHECKOUT_SESSION_ID}`; `src/pages/provider/Inquiries.tsx` calls verify on return |
| **M2** — post-signup race in ProviderShell | ✅ Fixed | `src/components/provider/ProviderShell.tsx` — 3-attempt poll (0/500/1000ms) before redirect |
| **M3** — fan-out ignores channel preferences | ✅ Fixed | `supabase/functions/submit-qualified-lead/index.ts` — single `notification_preferences` read gates email + SMS + in-app via `notify_new_leads`, `email_lead_alerts`, `sms_lead_alerts`, `browser_notifications` |
| **L3** — CI scanner for `select("*")` in edge fns | ✅ Added | `scripts/audit/check-edge-functions-no-star-select.mjs` + baseline JSON; wired into `npm run build` and `build:dev` as `check:edge-fn-no-star`. Scanner blocks **new** violations; 14 pre-existing call sites are grandfathered in `scripts/audit/no-star-select-baseline.json` and should be migrated incrementally. |
| **L1** — verify_jwt defense-in-depth | ⏳ Tracked | Existing scanner (`scan-provider-edge-functions.mjs`) already flags missing `auth.getUser` in HIGH severity. No action this cycle. |
| **L2** — Supabase advisor noise (180 WARN) | ⏳ Tracked | Triaged in `02-static-checks.md`. No action this cycle. |

### Verification
- `npm run check:edge-fn-no-star` — ✅ pass (0 new, 14 grandfathered)
- `bunx vitest run src/test/provider-leads-masking.test.ts` — ✅ 17/17 pass
- `node scripts/audit/scan-provider-edge-functions.mjs` — ⚠ remaining HIGH items are unchanged from the original report (auth-less webhook-style functions: `validate-promo-code`, `track-provider-event`, `send-provider-support`, `notify-payment-failed`, `retry-failed-payments`, plus `auto-reload-credits` which validates via HMAC instead of JWT). These are out-of-scope for this round.

### Phase 4 (runtime reproductions) — still not run
Items 1–10 in "Did not test" remain unverified. Surface specific items if you want me to reproduce them.

---

## Phase 7 — Smoke test (2026-05-01)

Re-ran static scanners + targeted deep-dive on `pages/provider/*`, `components/provider/*`, real-time wiring, and edge-function auth posture.

### New findings

| ID | Severity | Status | Details |
| --- | --- | --- | --- |
| **H3** — Silent DB failures in `ListingEditor` services / insurance / age-groups | High | ✅ Fixed | `src/pages/provider/ListingEditor.tsx` — three handlers (`handleServicesChange`, `handleInsuranceChange`, `handleAgeGroupsChange`) collected Supabase builders into `Promise.all(...).then())` and never inspected the resolved `{ error }` payload. Result: provider saw "Updated" toast even when an RLS denial or DB error blocked the write. **Fix:** new `assertAllOk` helper inspects every result and throws on the first error; handlers wrap the batch in `try/catch` and surface a destructive toast with the underlying message. |
| **Scanner blind spots** in `scan-provider-edge-functions.mjs` | n/a (tooling) | ✅ Fixed | Scanner only matched `auth.getUser(` and read the first 50 lines, so it falsely flagged `subscribe-pro` (auth at line 95) and `purchase-listing-slot` (uses `auth.getClaims`). Also flagged cron / public functions (`auto-reload-credits`, `retry-failed-payments`, `notify-payment-failed`, `track-provider-event`, `validate-promo-code`, `send-provider-support`) that intentionally do not require an end-user JWT. **Fix:** scanner now (a) recognises `getClaims`, (b) accepts a documented `AUTH_ALLOWLIST` for cron/HMAC/public callers (each with a justification string), (c) recognises `try_acquire_*_lock` RPCs as idempotency markers, and (d) excludes Checkout-Session-only Stripe handlers from the idempotency requirement. CI now exits non-zero on real HIGH findings. |

### Verified clean (no action needed)

- **Real-time fan-out**: `useProviderNotifications`, `useProviderCredits`, `useProviderFacilities`, `useProviderData`, and `useApprovedFacilities` all use `postgres_changes` channels. Cleanup is via `useRef`-stored channels in `useAdminUserNotifications`/`useProviderNotifications`. No leak signatures.
- **Direct-URL authz on `/provider/inquiries?lead=…`**: gated server-side by `leads_provider_view` (security_invoker on `public.leads`) and client-side by `ProviderShell` role check. No client-side bypass found.
- **Account deletion cascade** (`delete-provider-account/index.ts`): explicit ordered deletes for `leads`, facility reviews, and `facilities` themselves. Service-role.
- **`subscribe-pro` Stripe idempotency**: only creates a Checkout Session URL — actual charge happens on Stripe-hosted pages with their own retry semantics. Not a charge endpoint.
- **`auto-reload-credits` JWT**: validates via HMAC of `(providerId|ts)` signed with `SUPABASE_SERVICE_ROLE_KEY` instead of an end-user JWT. Internal-only call site.
- **TypeScript / vitest**: all 41 frontend tests pass.

### Updated totals (cumulative)

| Severity | Pending |
| --- | --- |
| Critical | 0 |
| High | 0 |
| Medium | 0 |
| Low | 3 (POST enforcement on read-only endpoints; advisor noise; explicit-columns migration of 14 grandfathered `select("*")` call sites) |

### Phase 4 (runtime reproductions) — still not run
Items 1–10 in "Did not test" remain unverified. Ask explicitly to reproduce specific items in the preview.
