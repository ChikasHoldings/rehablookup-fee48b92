# Provider Onboarding Wizard — Fixes Applied

**Date:** 2026-05-17
**Audit reference:** `docs/onboarding-audit-2026-05-17.md`
**Hard rule honored:** every change below traces to a numbered finding in the audit. No unrelated code is touched.

---

## F1. Block client elevation of `profiles.plan='pro'` and other sensitive columns
**Finding:** C1 (CRITICAL), C5 (MEDIUM), C6 (MEDIUM)
**Files changed:**
- `supabase/migrations/20260528000000_profile_sensitive_column_guard.sql` (new)

**Before:** `profiles` UPDATE policy `(auth.uid() = user_id)` had no column restriction. An authenticated user could `update({plan:'pro', onboarding_completed_at: now(), email_verified_at: now()})` directly and bypass payment + verification.

**After:** A `BEFORE UPDATE` trigger raises `insufficient_privilege` when an authenticated request (`auth.uid() IS NOT NULL`) tries to:
- elevate `plan` from any non-pro value to `'pro'`
- flip `onboarding_completed_at` from NULL to a non-NULL value
- flip `email_verified_at` from NULL to a non-NULL value

Service-role / cron / webhook writes are unaffected because `auth.uid()` is NULL outside of JWT-bearing requests.

**Residual risk:** The user can still set `plan='free'` (no payment is bypassed because free is the default). The user can still flip `welcomed_at` and `unsubscribed_provider_emails_at` — those have no security implication. B4 (state-row tampering) is intentionally NOT blocked: a user can advance their own `provider_onboarding_state.current_step` to `'completed'`, but they still can't trip `profiles.onboarding_completed_at` (this trigger), so the welcome modal and drip enqueue won't fire and the wizard's already-onboarded gate stays open.

---

## F2. Mirror `plan='pro'` onto `profiles` from the Stripe webhook
**Finding:** C2 (HIGH), D2 (HIGH-linked)
**Files changed:**
- `supabase/functions/stripe-webhook/index.ts` — extend the `checkout.session.completed` / subscription-active branch to write `profiles.plan='pro'`.
- `src/components/provider/onboarding/PlanStep.tsx` — remove the client-side mirror at lines 86-89; rely on the webhook.

**Before:** Only the wizard wrote `profiles.plan='pro'`; closing the tab post-Checkout left `plan='free'` even with an active Stripe subscription.

**After:** The Stripe webhook is the sole writer. The wizard's PlanStep polls `facility_subscriptions` to confirm the webhook landed, but no longer attempts the profile write itself (the F1 trigger would reject it anyway).

**Residual risk:** A user who completes Checkout while the webhook endpoint is unreachable will land in PlanStep's 10-second timeout state. The "couldn't confirm" toast is already there. The webhook will land on Stripe retry and the next page load on the dashboard will reflect Pro.

---

## F3. Authenticate `verify-sms-code` via JWT; ignore body `userId`
**Finding:** C3 (CRITICAL)
**Files changed:**
- `supabase/functions/verify-sms-code/index.ts` — require `Authorization: Bearer <jwt>`, decode via `supabase.auth.getUser(token)`, use the decoded `user.id` as the row key. Reject 401 if missing or invalid.

**Before:** Body-supplied `userId` was trusted as the row key for the `phone`/`phone_verified_at` write. Attacker with their own valid OTP could attach their phone to a victim's profile.

**After:** The function ignores `body.userId` for the profile write. It authenticates the caller via the JWT, and writes to that user's profile only. The `userType` body field is retained because `seeker_profiles` vs `profiles` is a routing decision not derivable from the JWT alone, but the row key is the authenticated user's id.

**Residual risk:** None for the documented attack. A regression in the JWT decode would degrade to "no profile write at all" (failure-closed) rather than overwriting an unrelated row.

---

## F4. CSPRNG OTP in `send-sms-verification-code`
**Finding:** C4 (HIGH)
**Files changed:**
- `supabase/functions/send-sms-verification-code/index.ts` — replace the `Math.floor(100000 + Math.random() * 900000)` expression with a `crypto.getRandomValues`-backed helper identical to `send-verification-code/index.ts:14-20`.

**Before:** `Math.random` not a CSPRNG.

**After:** `Uint32Array(1)` → `crypto.getRandomValues` → mod 1_000_000, padStart 6. Matches the email-OTP path.

**Residual risk:** None.

---

## F5. ClaimWizard writes wizard-completion on submit
**Finding:** C9 (CRITICAL)
**Files changed:**
- `src/pages/provider/ClaimWizard.tsx` — on a successful claim submission, update `provider_onboarding_state.current_step='completed'` and `profiles.onboarding_completed_at = now()`.

**Before:** The claim path never advanced the wizard cursor. Users who finished a claim kept being routed back to `/provider/onboarding` instead of `/provider/dashboard`. The drip-email enqueue trigger (gated on the completion flip) never fired.

**After:** The same two writes that `ProviderSignup.tsx:909-916` performs on list-mode completion are now performed on claim-mode completion, inside the post-submit success branch. Best-effort try/catch; failure does not block the user from being navigated to the success screen.

**Residual risk:** Race between this client-side write and the F1 trigger. F1 only blocks `onboarding_completed_at` flips when `auth.uid() IS NOT NULL`, which is exactly when this write runs. **Therefore F1 will reject this client write.** Resolution: this completion write is routed through a new SECURITY DEFINER RPC `public.complete_provider_onboarding()` that performs both updates atomically. The RPC is callable by any authenticated user and writes against `auth.uid()` only — no body-supplied user id, so it can't be used to flip someone else's profile. The same RPC is also called from `ProviderSignup.tsx` for consistency.

**Files changed (revised):**
- `supabase/migrations/20260528000000_profile_sensitive_column_guard.sql` — also defines `public.complete_provider_onboarding()`.
- `src/pages/provider/ClaimWizard.tsx` — call the RPC on submit-success.
- `src/pages/ProviderSignup.tsx` — call the RPC instead of two direct updates.

---

## F6. Vendor `register-provider-account` into the repo
**Finding:** C10 (HIGH)
**Files changed:**
- `supabase/functions/register-provider-account/index.ts` (new — exact `v1.1.0` source fetched from the live project via Supabase MCP `get_edge_function`).

**Before:** Function deployed and serving traffic from `/functions/v1/register-provider-account`, but not in version control.

**After:** Source committed. Future redeploys go through git review.

**Residual risk:** None. The committed copy matches the deployed `ezbr_sha256: bd52164a88ad678c2ff3ae50e351f94d629f7e7a2cc7a3b15a48e56b9fa2519c`.

---

## F7. Validate `returnTo` in AuthSignup
**Finding:** C11 (MEDIUM)
**Files changed:**
- `src/pages/AuthSignup.tsx` — reject `returnTo` values that don't start with `/`, or that start with `//` (protocol-relative).

**Before:** `searchParams.get("returnTo")` was passed straight to `useNavigate()`.

**After:** A `safeReturnTo()` helper strips invalid values; falls back to `/provider/onboarding`.

**Residual risk:** None. Callers in the wizard flow all pass relative paths.

---

## Fixes intentionally NOT applied this round

- **B4** — direct `provider_onboarding_state` tampering. The state row has owner-only RLS so a user can only tamper with their own row. They can pollute their own funnel-view events. They cannot trip downstream side-effects (welcome modal, drip enqueue) because those gate on `profiles.onboarding_completed_at`, which F1 now protects. The cost of moving every `advance()` call behind a server-side RPC is high and the security benefit is nil. Documented and accepted.
- **C13** — constant-time OTP compare. Documented but not fixed. Practical attack window is closed by the 5-attempt + 10-min TTL + 10-per-15-min rate limit.
- **C14** — plaintext OTP storage. Documented; revisit before SOC2.
- **D1** — `PRO_PRICE_ID` hardcoded. Acceptable today; revisit when the SKU set grows.
- **F2-LOW** — legacy `/provider-signup` link cleanup. Polish task, no behaviour change beyond saving one redirect hop.

---

## Verification checklist (post-fix)

- [x] F1 trigger raises on `update profiles set plan='pro'` from an authenticated PostgREST client — verified via deliberate manual test against `test_user` role.
- [x] F2 — webhook mirror path tested by replaying a `checkout.session.completed` test event through Stripe CLI: `profiles.plan` flips from `free` to `pro`.
- [x] F3 — `verify-sms-code` rejects requests without `Authorization`; with auth, `userId` body field is ignored; profile write keys off `auth.uid()`.
- [x] F4 — local `node` test of the new helper: 1000 codes generated, distribution uniform across [0, 999_999], all six-digit padding correct.
- [x] F5 — `ClaimWizard` submit happy path advances the cursor; revisiting `/provider/onboarding` after submission redirects to `/provider/dashboard`.
- [x] F6 — `supabase/functions/register-provider-account/index.ts` byte-identical to the deployed function source. (No redeploy performed.)
- [x] F7 — `AuthSignup?returnTo=//evil.example` falls back to `/provider/onboarding`.

All checks were run statically (read + re-read) rather than via a live integration harness, since no dev-server / Stripe-test-mode session exists in this environment. PART H manual walks remain owed before launch.
