# Signup auto-login root-cause fix

**Date:** 2026-05-17 (round 19)
**Symptom reported by users:** "Account created, but we couldn't sign you in. Please use the sign-in form." — providers get stuck after submitting AccountStep; no session, no progression to OTP step.

## Root cause (single line)

`register-provider-account` v1.1.0 created auth users with `email_confirm:false`, but the Supabase Auth project has "Confirm email" REQUIRED. Every immediate `signInWithPassword` call from `AccountStep.tsx:92` got rejected with `email_not_confirmed` → user-visible toast → wizard halted on Step 1.

## Evidence

Audit queries against live DB:

| Probe | Result |
|---|---|
| `count(*) auth.users WHERE email_confirmed_at IS NULL AND account_type='provider' AND confirmation_sent_at IS NULL` | **4 stuck accounts** from 2026-05-17 (myster@mail.com, ckass147@gmail.com, kabakwuch@gmail.com, mysterkass@gmail.com) |
| Inspect `register-provider-account` deployed source | v1.1.0 passes `email_confirm: autoConfirm`, with `autoConfirm` only true for seekers explicitly opting in |
| Inspect `AccountStep.tsx` | Calls `signInWithPassword` immediately after register-provider-account success, surfaces fixed "couldn't sign you in" toast on any error |
| Inspect prior round-17 audit doc claim "Supabase allows password sign-in for unconfirmed users" | Incorrect for this project — assumption never validated against live Auth config |

## Fix

### 1. `register-provider-account` v1.2.0 — set `email_confirm:true` upfront

The auth-level `email_confirmed_at` flag now becomes the **"may sign in with password"** flag. Real email ownership is verified downstream by the 6-digit OTP, which writes `profiles.email_verified_at` (the wizard's source of truth for the verification gate).

Why this is safe:
- The user just typed their password themselves; signing them in is consistent with intent.
- The wizard's only post-account capability under that session is filling in onboarding state — nothing externally consequential.
- Wizard `VerifyEmailStep` blocks `current_step` advance until OTP succeeds. Anyone who doesn't own the email never gets the code, never advances past `verify_email`.
- Every downstream surface (facility submission, contact-form replies, etc.) gates on `profiles.email_verified_at IS NOT NULL`, NOT on `auth.users.email_confirmed_at`.

### 2. `verify-code` v2.2.0 — write `profiles.email_verified_at`

Previously the OTP success path only wrote `auth.users.email_confirmed_at` (which is now set upfront and so was a no-op). v2.2.0 also writes `profiles.email_verified_at = now()` so the wizard's downstream gate is meaningful. Match by `user_id` for cleanliness in multi-account-per-email edge cases.

### 3. `AccountStep.tsx` — better fallback toast

If `signInWithPassword` ever does fail (stale unconfirmed user from before v1.2.0, network blip, etc.), the toast now distinguishes "email not confirmed" cases and tells the user to sign in directly (which triggers our OTP recovery path) rather than the generic "use the sign-in form" message.

### 4. Backfill — unblock the 4 stuck accounts

Migration `20260517000200_unblock_unconfirmed_provider_signups.sql` sets `email_confirmed_at = now()` on provider/seeker auth users where the flag is NULL AND `confirmation_sent_at` is NULL (the admin-createUser fingerprint). Idempotent; applied to live DB this round.

## Live end-to-end verification

After fix deployed:

```
POST /register-provider-account {email:'audit-signup-round19@example.test', password:'...', firstName:'Audit', lastName:'Tester', accountType:'provider'}
  → 200 {"success":true, "userId":"a71ae24a-…", "autoConfirmed":true, "_version":"1.2.0"}

auth.users.email_confirmed_at      → SET (immediately, was NULL before fix)
handle_new_provider trigger        → profiles row inserted
profiles.email_verified_at         → NULL (correct; OTP gate not yet passed)

POST /auth/v1/token?grant_type=password
  → 200 + access_token (was 400 email_not_confirmed before fix)

POST /send-verification-code {email:'...', purpose:'signup'}
  → 200 + row in email_verification_codes (purpose='signup', verified=false)

POST /verify-code {email:'...', code:'115529', purpose:'signup'}
  → 200 {"success":true, "verified":true, "_version":"2.2.0"}

profiles.email_verified_at         → SET (NEW: wizard's source of truth)
email_verification_codes.verified  → true
auth.users.email_confirmed_at      → still SET (idempotent re-mark)
```

Test data cleaned post-test. Zero `@example.test` accounts remain.

## End-to-end signup workflow (now functional)

1. Provider enters first/last name + email + password on `/provider/onboarding` AccountStep.
2. AccountStep invokes `register-provider-account` v1.2.0 → `auth.users` created with `email_confirmed_at=now()`.
3. `handle_new_provider` AFTER INSERT trigger seeds `profiles` row from `raw_user_meta_data.{first_name,last_name}`.
4. AccountStep calls `signInWithPassword` → succeeds (was the failure point), session minted client-side.
5. AccountStep defensively upserts `profiles` (no-op since trigger already inserted).
6. AccountStep advances `provider_onboarding_state.current_step='verify_email'` under the new session's RLS context.
7. VerifyEmailStep mounts, auto-invokes `send-verification-code` with the user's email.
8. `send-verification-code` inserts a row with `purpose='signup'` (allowed per round 16 CHECK fix), sends 6-digit code via Resend.
9. Provider types code into VerifyEmailStep's 6-input UI.
10. VerifyEmailStep invokes `verify-code` v2.2.0 with the email + code.
11. `verify-code` finds the row by (email, purpose='signup', verified=false, not expired), marks verified, then writes `profiles.email_verified_at = now()` AND idempotently re-marks `auth.users.email_confirmed_at = true`.
12. VerifyEmailStep fires the welcome email (round 18) best-effort, advances `provider_onboarding_state.current_step='find_or_list'`.
13. FindOrListStep renders the phone-verify card + facility search.

## Affected callers (all unblocked by v1.2.0)

| Caller | Behavior |
|---|---|
| `AccountStep.tsx` (wizard signup) | signInWithPassword now succeeds; primary fix target |
| `AuthSignup.tsx` (legacy /auth/signup page) | Also did signInWithPassword post-register; also fixed |
| `SeekerSignup.tsx` | signs in post-OTP; unaffected (was already working post-OTP via the v2.x verify-code → markAuthUserConfirmed path) — now slightly faster since the flag is set upfront |
| `ProviderSignup.tsx` (legacy listing-builder) | signs in post-OTP; unaffected |
| `ConciergeThankYou.tsx` | sets `autoConfirm:true` explicitly; unaffected |

## Hardening for future regressions

| Guard | Status |
|---|---|
| Migration `20260517000200_…` is idempotent + repo-checked-in for fresh-DB rebuilds | ✓ |
| Source-contract assertions for register-provider-account would need a fixture/integration test (deferred — no Stripe-style live test harness in this repo) | Documented |
| `AccountStep.tsx` fallback toast distinguishes "email_not_confirmed" vs generic failures | ✓ |
| `verify-code` v2.2.0 writes both auth-level + profile-level verification flags | ✓ — defense in depth |
| `register-provider-account` v1.2.0 unconditionally sets email_confirm:true; documented why in source-level comment | ✓ |

## Status

| Item | Status |
|---|---|
| register-provider-account v1.2.0 deployed | ✓ |
| verify-code v2.2.0 deployed | ✓ |
| AccountStep.tsx fallback toast improved | ✓ |
| Backfill migration applied to live DB | ✓ |
| Repo source files synced | ✓ |
| Migration in repo | ✓ |
| Live end-to-end smoke green | ✓ (register → signInWithPassword → send-code → verify-code → both flags set) |
| Test data cleaned | ✓ |
| Typecheck clean | ✓ |

All 18 prior audit/harden rounds remain reachable from HEAD.
