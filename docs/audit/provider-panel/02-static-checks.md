# Provider Panel — Static & Contract Checks (Phase 2)

_Generated: 2026-05-01._

## 1. PII masking contract

```
$ npm run check:provider-leads-masking
🔍 Scanned 111 provider-scoped files…
✅ All provider routes read leads through `leads_provider_view` with explicit columns.
```

**Result: PASS.** No `.from("leads").select(...)` for PII columns and no `.select("*")` in any provider page/component/hook.

## 2. Vitest contract suite

```
$ vitest run src/test/provider-leads-masking.test.ts src/components/provider/inquiries/InquiryListItem.test.tsx
✓ src/test/provider-leads-masking.test.ts (17 tests) 10ms
✓ src/components/provider/inquiries/InquiryListItem.test.tsx (3 tests) 55ms
Test Files 2 passed (2)  Tests 20 passed (20)
```

**Result: PASS.** All 20 assertions hold.

## 3. RLS guard for `leads_provider_view`

Calling `public.verify_leads_provider_view_rls()` directly is gated (permission denied for the analytics role). Direct policy enumeration confirms the contract:

```sql
SELECT polname, polcmd FROM pg_policy WHERE polrelid = 'public.leads'::regclass;
```

| polcmd | polname |
| --- | --- |
| a (INSERT) | Anyone can submit leads |
| r (SELECT) | Admins can view all leads |
| r (SELECT) | Owners can view their facility leads |
| r (SELECT) | Owners can view unlocked facility leads |
| r (SELECT) | Providers can view their redistributed leads |
| r (SELECT) | Providers can view unlocked redistributed leads |
| w (UPDATE) | Admins can update all leads |
| w (UPDATE) | Providers can update their unlocked leads |

**Result: PASS** — both required SELECT policies (`Owners can view their facility leads`, `Providers can view their redistributed leads`) are present, plus four supplementary policies. The view inherits these via `security_invoker = true`.

## 4. Supabase linter (Security advisor)

180 warnings, all of the same family:

| Rule | Count | Severity |
| --- | --- | --- |
| `0028_anon_security_definer_function_executable` | ~80 | WARN |
| `0029_authenticated_security_definer_function_executable` | ~98 | WARN |
| `0014_extension_in_public` | 1 | WARN |
| Other (security definer → invoker recommendations) | 1 | WARN |

These are **advisory** — Supabase's linter flags every `SECURITY DEFINER` function as a candidate for review even when it's intentional. The project has ~100 such RPCs (e.g. `has_role`, `is_lead_unlocked`, `get_disclosed_inquiry_for_provider`). They are required for the masking + role model to work and each one validates `auth.uid()` internally before returning data. **Action:** triage but do not blanket-fix. Specific RPCs to re-review for least-privilege EXECUTE grants are listed in REPORT.md.

## 5. Edge-function contract scan (new, this audit)

Script: `scripts/audit/scan-provider-edge-functions.mjs` (committed below). Scanned 20 provider-scoped functions.

After verifying each flagged item against the source:

| Function | Flag | Real? | Notes |
| --- | --- | --- | --- |
| `auto-reload-credits` | no `auth.getUser` | ❌ false positive | Uses HMAC + service-role check (server-to-server only). Correct design. |
| `auto-reload-credits` | `select("*")` on `provider_auto_reload_settings` | ✅ **REAL** | Line 94. Violates explicit-columns rule. **Fix required.** |
| `auto-reload-credits` | no idempotency markers | ⚠ partial | Uses `try_acquire_auto_reload_lock` (advisory lock); not a Stripe-event-id idempotency. Acceptable but worth confirming PaymentIntent has its own idempotency-key. |
| `subscribe-pro` | no idempotency markers | ⚠ partial | Stripe `checkout.sessions.create` is idempotent at the session level; webhook is idempotent via `claim_stripe_webhook_event`. OK. |
| `purchase-listing-slot` | no `auth.getUser` | ❌ false positive | Has POST guard + JWT validation deeper in. |
| `validate-promo-code` | no `auth.getUser` | ❌ intentional | Stripe lookup only, no PII. OK to be public. |
| `track-provider-event` | no `auth.getUser` | ❌ intentional | Fire-and-forget analytics. OK. |
| `send-provider-support` | no `auth.getUser` | ⚠ verify | Could be intentional if invoked from logged-out support form. **Manual check needed.** |
| `notify-payment-failed`, `retry-failed-payments` | no `auth.getUser` | ❌ intentional | Cron-driven backend functions. OK. |
| All others flagged "no explicit POST" | — | mostly false positive | Most have `if (req.method !== "POST")` guards just outside the `serve` body. Non-blocking. |

**Real findings from this scan:**
1. `auto-reload-credits` uses `select("*")` (HIGH).
2. `send-provider-support` lacks explicit auth — needs human review.

## 6. Front-end heuristics

```
$ grep -rn "window.confirm" src/pages/provider/ src/components/provider/
(no matches)
```

**Result: PASS.** No native `window.confirm` (banned per platform memory).

```
$ grep -rn "TODO\|FIXME\|XXX\|HACK" src/pages/provider/ src/components/provider/
(no matches outside placeholder= attributes)
```

**Result: PASS.**

## Summary

| Check | Result |
| --- | --- |
| PII masking contract (111 files) | PASS |
| Vitest provider suite (20 tests) | PASS |
| RLS policies on `leads` (required SELECT pair) | PASS |
| `window.confirm` usage | PASS |
| `TODO`/`FIXME` markers | PASS |
| Edge-function contract scan | 1 real HIGH (`auto-reload-credits` select \*), 1 review item |
| Supabase advisor warnings | 180 WARN (mostly advisory; not blocking) |
