# Signup OTP root-cause fix

**Date:** 2026-05-17 (round 16)
**Symptom reported by users:** "No email is being sent. The verification step is not loading. The entire sign-up / claim-listing process is failing end-to-end."

## Root cause (single line)

The deployed `send-verification-code` v2.0.0 defaults `purpose='signup'`, but the `email_verification_codes_purpose_check` CHECK constraint only accepted `('general', 'claim_verification')`. **Every signup INSERT hit `check_violation` → HTTP 500**, surfaced to the user as a generic "Couldn't send a verification code" toast — which left them stranded on the OTP entry screen with no code in their inbox.

## How the audit narrowed it down

Direct live-system probes via `net.http_post` and Supabase MCP, isolating each link in the chain:

| Step | What | Result |
|---|---|---|
| 1 | `register-provider-account` POST with fresh test email | 200, `userId` returned |
| 2 | Confirm `handle_new_provider` trigger fired | profiles row exists with first/last/email populated |
| 3 | `send-verification-code` POST with the email | **500 — "Failed to create verification code"** ← bug surfaced |
| 4 | Read `email_verification_codes_purpose_check` constraint | `CHECK (purpose = ANY (ARRAY['general','claim_verification']))` |
| 5 | Read `send-verification-code` deployed source | v2.0.0 defaults `purpose='signup'` ⇒ INSERT collides with CHECK |

## Fix

Migration `20260612000000_expand_email_verification_codes_purpose.sql` drops and re-adds the CHECK to accept the deployed function's purpose taxonomy:

```sql
ALTER TABLE public.email_verification_codes
  DROP CONSTRAINT IF EXISTS email_verification_codes_purpose_check;
ALTER TABLE public.email_verification_codes
  ADD CONSTRAINT email_verification_codes_purpose_check
  CHECK (purpose = ANY (ARRAY[
    'general'::text,
    'signup'::text,
    'claim_verification'::text,
    'password_reset'::text,
    'reply_email'::text
  ]));
```

Applied to live DB.

## Live verification after the fix

```
POST /register-provider-account → 200 success: true, userId: …
handle_new_provider trigger     → profiles row inserted
POST /send-verification-code    → 200 success: true, message: "Verification code sent"
email_verification_codes row    → purpose='signup', code='816704', verified=false
POST /verify-code (with code)   → 200 success: true, verified: true
auth.users.email_confirmed_at   → set true by verify-code's markAuthUserConfirmed
```

Test users + their auth rows cleaned up post-test.

## Repo sync

The deployed `send-verification-code` and `verify-code` had drifted ahead of the repo (v2.0.0 / v2.1.0 vs an older single-purpose version). Synced both source files in the repo so the next deploy can't reintroduce the bug. Smoke-test assertions added in `_tests/monetization-helpers-smoke_test.ts` for:
- send-verification-code uses `purpose='signup'` default
- send-verification-code rate-limits + invalidates per-(email, purpose)
- verify-code marks `auth.users.email_confirmed_at` on signup success via `markAuthUserConfirmed`
- verify-code's legacy-purpose fallback for clients that don't pass purpose

The CHECK-constraint migration is in the repo too, so a fresh-DB rebuild includes it.

## End-to-end signup workflow (now functional)

1. Provider enters name/email/password on `/provider/onboarding` AccountStep.
2. AccountStep invokes `register-provider-account` → auth.users created (email_confirm=false).
3. `handle_new_provider` AFTER INSERT trigger seeds the matching `profiles` row from `raw_user_meta_data.{first_name,last_name}`.
4. AccountStep signs the user in with password (Supabase allows password sign-in for unconfirmed users).
5. AccountStep upserts profiles defensively (no-op on the trigger's row).
6. AccountStep advances `provider_onboarding_state.current_step='verify_email'`.
7. VerifyEmailStep mounts, auto-invokes `send-verification-code` with the user's email.
8. `send-verification-code` inserts a row with `purpose='signup'` (now allowed), sends 6-digit code via Resend.
9. Provider receives email, types code into VerifyEmailStep's 6-input UI.
10. VerifyEmailStep invokes `verify-code` with the email + code.
11. `verify-code` finds the row by (email, purpose='signup', verified=false, not expired), marks verified, calls `markAuthUserConfirmed` which sets `auth.users.email_confirmed_at = now()`.
12. VerifyEmailStep advances `provider_onboarding_state.current_step='find_or_list'`.
13. FindOrListStep renders the phone-verify card + facility search.

## Claim-listing impact

The claim-listing flow uses the same OTP table via the separate `initiate-claim-email-verification` / `confirm-claim-verification-code` functions, which already write `purpose='claim_verification'`. Those weren't broken by this bug — but the wizard's signup gate (AccountStep) is the entry point even for claim-mode, so the broken signup blocked claim users from reaching ClaimWizard at all. With signup fixed, the claim flow's pre-existing OTP pipeline works unchanged.

## Status

| Item | Status |
|---|---|
| Constraint expanded to allow `'signup'` | ✓ applied live |
| Live end-to-end test register → send → verify | ✓ all 200s |
| Repo synced with deployed function versions | ✓ |
| Smoke-test assertions added | ✓ |
| Test data cleaned | ✓ |
| Typecheck clean | ✓ |

All 14 prior audit/harden rounds remain reachable from HEAD.
