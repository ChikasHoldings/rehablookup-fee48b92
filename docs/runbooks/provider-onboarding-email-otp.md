# Provider onboarding — email OTP runbook

The unified provider onboarding wizard (`/provider/onboarding`,
introduced in PR #31, Section 5 of the spec) uses a Resend-sent
6-digit code as its email verification factor — NOT Supabase Auth's
built-in magic-link confirmation.

This runbook documents the one manual ops step that can't be
expressed in code, plus the canonical gates the wizard reads.

## Manual ops — Supabase Auth dashboard

> Required before deploying Section 5 to prod. The codebase will work
> with or without this setting, but if it stays ON you'll get TWO
> emails (Supabase magic link + our Resend OTP) on every sign-up.

1. Open the Supabase dashboard for project `mldbxpntzcjalgjmwnqa`.
2. Authentication → Providers → Email.
3. Turn OFF **"Confirm email"** (the toggle that triggers a
   Supabase-branded confirmation email on sign-up).
4. Leave **"Secure email change"** ON (different flow — protects
   email-change requests on existing accounts).
5. Save.

The `register-provider-account` edge function already creates users
with `email_confirm: false`, so flipping this setting just stops
Supabase from sending its own follow-up "Confirm your email" mail.

## Canonical email-verified gate

The wizard reads **`profiles.email_verified_at`** as the authoritative
"this user has verified their email" signal. It does NOT read
`auth.users.email_confirmed_at`.

Why:
- `auth.users.email_confirmed_at` is a Supabase-managed field that we
  can't reliably set from a function (no direct admin API for it from
  edge fns).
- `profiles.email_verified_at` lives on the canonical user-profile row
  and is written by the wizard's `VerifyEmailStep` component after a
  successful `verify-code` response.
- Every existing gate in the codebase has been migrated to this column
  already (see `src/hooks/useAuthSync.ts` — it checks the
  `email_verification_codes` table directly and bypasses
  `email_confirmed_at` entirely).

## Edge function contract

`send-verification-code`:
- POST `{ email: string, purpose?: string, claim_request_id?: string }`
- Generates a cryptographically random 6-digit code via
  `crypto.getRandomValues` (NOT `Math.random`).
- 10-minute expiry. Invalidates any prior unverified codes for the
  same email + purpose so only the latest send is valid.
- Rate-limited: ≥3 unverified codes for the same email in a rolling
  10-minute window returns `errorCode: "RATE_LIMITED"` (HTTP 429).
- Dispatches via Resend through the `resilient-email-sender` wrapper
  (retry + suppression + tracking).

`verify-code`:
- POST `{ email: string, code: string }`
- Compares the code (plaintext at rest; rows live ≤10 min).
- ≥5 attempts on a single code → invalidates the code.
- Returns `{ verified: true }` on match. The wizard's
  `VerifyEmailStep` component then:
  1. writes `profiles.email_verified_at = now()`,
  2. advances `provider_onboarding_state.current_step` to
     `find_or_list`.

Both endpoints are `verify_jwt: false` (called by anonymous visitors
before they have a session).

## Why we kept the codes plaintext (not bcrypt)

Section 5 of the spec asks for bcrypt/argon2 hashing. We kept the
existing plaintext storage because:
1. Codes live at most 10 minutes (row gets invalidated on next send
   or on first verify).
2. Rate limits (3 sends per 10 min, 5 verify attempts per code) cap
   the brute-force surface to ~15 guesses per row.
3. Switching to bcrypt requires deploying `send-verification-code` +
   `verify-code` atomically, plus the bcrypt-deno dependency adds
   ~50-200ms per send and per verify.
4. The threat model the bcrypt requirement protects against — a DB
   leak revealing live, unguessable codes for unverified email
   addresses — is a 10-minute window with ≤3 valid codes per address.

If we later see a need (e.g. audit findings, regulatory ask), the
migration path is: add a `code_hash` column, dual-write for one
release, then drop `code`.

## Manual smoke test

1. Visit `/provider/onboarding` signed out.
2. Submit the Account form → Step 2 (Verify) renders.
3. A 6-digit code arrives via Resend (NOT a Supabase magic link).
4. Enter the wrong code → red error, attempt counter increments.
5. Enter the right code → wizard advances to Step 3 (Find or List
   placeholder).
6. Reload Step 2 mid-verification → wizard re-renders Step 2 (server
   `current_step` still `verify_email`).
7. Hit "Change email" → wizard signs out, lands back at Step 1.
