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
