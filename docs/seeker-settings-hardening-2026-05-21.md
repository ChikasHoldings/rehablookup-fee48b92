# /account/settings — Deep Hardening Pass

**Date:** 2026-05-21
**Branch:** `claude/phase2-deployment-5WYOn`
**Scope:** `SeekerSettings.tsx` page, `ActivityLog` card, `useActivityLog` hook, `PhoneVerificationStep` interop, `delete-seeker-account` UX, and the new `log_account_activity` RPC backing the activity log.

This page is the seeker's profile + security + danger-zone surface. It's
also the page that owes the most "is this actually working?" questions —
every action here either persists to Postgres, hits an edge function, or
flips an auth row, and most of the prior UX was hiding errors.

---

## Critical bugs found (P0)

### Bug 1 — Activity log writes were 100% silently failing

**Evidence:** `account_activity_log` RLS (live DB) has exactly one
INSERT policy:

```
"Service role can insert activity logs" FOR INSERT TO service_role WITH CHECK (true)
```

The original `useActivityLog.logActivity()` did:

```ts
await supabase.from("account_activity_log").insert([{ user_id, ... }]);
```

…from the anon role with a JWT. RLS denied every call, but the wrapper
was a `try/catch` around an `await` that doesn't throw on Supabase error
responses (it returns `{error}`). The result wasn't even logged. So
EVERY `profile_update`, `password_change`, `email_change`, `avatar_update`,
`avatar_remove` entry the seeker page tried to log went into the void.
The ActivityLog card on this page rendered "No recent activity" for
every seeker since the table existed — the empty card was a lie, not
the truth.

**Fix:** new SECURITY DEFINER RPC `public.log_account_activity(p_event_type,
p_event_description, p_metadata)` (migration `20260704000000`). The RPC
reads `auth.uid()` server-side, so the client cannot impersonate. It
whitelists `event_type` and length-checks `event_description`. Granted
to `authenticated`. `logActivity()` now calls the RPC; failures are
logged to console (still best-effort — logging shouldn't block the
user-facing flow). Verified live: RPC exists with `prosecdef=true`.

### Bug 2 — `delete-seeker-account` UI promised a recovery window that doesn't exist

**Evidence:** `SeekerSettings.tsx` (pre-fix) line 683-689:

```ts
const purgeAfter = (response.data as { purgeAfter?: string } | null)?.purgeAfter;
toast({
  title: "Account scheduled for deletion",
  description: recoveryDate
    ? `Your account will be permanently deleted on ${...}. Sign back in before then to recover it.`
    : "Your account has been scheduled for deletion. Sign back in within 30 days to recover it.",
});
```

The inline comment at the invoke site said "Default soft-delete:
account is signed out + scheduled for purge in 30 days." None of this
is true. The deployed `delete-seeker-account/index.ts` does:

```ts
await adminClient.rpc("purge_seeker_data", { p_user_id, p_user_email });
await adminClient.auth.admin.deleteUser(user.id);
```

— immediate hard delete, no soft window, no `purgeAfter` returned.
The user was told "you have 30 days" and signed off. They cannot recover.

**Fix:**
- Inline comment and toast copy updated to match reality:
  "Your account and personal data have been permanently removed."
- AlertDialog description now states "This is permanent and cannot be
  undone. There is no recovery window."
- Item list expanded to match what `purge_seeker_data` actually removes
  (profile, favorites, saved searches, reviews + responses, inquiry +
  concierge history, auth identity).
- Backend error parser now pulls the `error` field out of the response
  body for honest messages like "This account has elevated roles and
  cannot be self-deleted."

### Bug 3 — Phone-verified badge never showed (and the verified flag was unanchored to the phone number)

**Evidence:**
1. The profile select at line 142 was:
   ```ts
   .select('display_name, first_name, last_name, avatar_url, phone, zipcode, city, state')
   ```
   No `phone_verified` column. The `PhoneVerificationStep` was rendered
   without an `isVerified` prop, so its `localVerified` state started
   `false` for every page load — even for users whose phone had been
   verified months earlier. The "Verified" badge never appeared on this
   page and the "Verify" button always rendered. Cosmetic but eroding.
2. The component DOES disable the input while `localVerified=true`, but
   the disabling never kicked in because the prop wasn't passed. So
   nothing prevented an out-of-band write from leaving `phone_verified=true`
   against a number the user later edited.

**Fix:**
- Profile select now reads `phone_verified`.
- New `phoneVerified` state + `verifiedPhoneRef` (the phone number at
  the moment verification was confirmed).
- `<PhoneVerificationStep isVerified={phoneVerified}>` so the badge +
  disabled input reflect DB truth.
- `onVerified` callback updates `verifiedPhoneRef.current = phone` and
  logs a `phone_verify` activity event (newly whitelisted in the RPC).
- `handleSaveProfile` compares `cleanPhone !== verifiedPhoneRef.current`
  and writes `{phone_verified: false, phone_verified_at: null}` on
  divergence so we never persist a stale verified flag.
- Realtime sub on `seeker_profiles` UPDATE (filtered by user_id) so the
  badge updates within ~200ms if the verify edge function flips
  `phone_verified=true` from another tab.

---

## Other findings closed (P1)

### Finding 4 — `is_email_verified` RPC error was swallowed (P1)

**Evidence:** `await supabase.rpc('is_email_verified', { p_email })` with
no `error` destructure. If the RPC failed (transient network, RLS, RPC
removed), `verified` was `null` and the page silently rendered "Unverified"
for a user who IS verified — no console signal for ops.

**Fix:** destructure `verifyErr`, `console.warn` with `verifyErr.message`.

### Finding 5 — Initial profile fetch error swallowed (P1)

**Evidence:** `supabase.from('seeker_profiles').select(...).maybeSingle()`
with no `error` check. RLS denial, conn error, or query fault collapsed
silently to an empty profile — the user saw a blank form with no
indication anything went wrong.

**Fix:** destructure `profileErr` and surface via toast.

### Finding 6 — `handleSaveProfile` toast hid `error.message` (P1)

**Evidence:** `description: "Could not update your profile."` — same
generic copy regardless of cause. RLS denial, validation failure, conn
issue, all looked identical.

**Fix:** `description: error.message || "Could not update your profile."`

### Finding 7 — Avatar handlers all swallowed `error.message` (P1)

**Evidence:** `handleAvatarChange`, `handleRemoveAvatar`,
`handleCameraCapture` each had a generic "Could not upload/remove..."
toast and console.error'd the error object — the user saw nothing
actionable.

**Fix:** typed catch with `error instanceof Error ? error.message : <fallback>`
in all three handlers.

### Finding 8 — Avatar storage bloat: every upload accumulated forever (P1)

**Evidence:** Each upload wrote `${userId}/avatar-${Date.now()}.${ext}`.
The remove handler parsed the URL to delete only the CURRENT one —
prior files stayed in storage indefinitely. Across years on a heavy
account this would accumulate hundreds of MB.

**Fix:**
- New `cleanupOldAvatars(uid, keepFileName)` helper lists the user's
  prefix and removes every file except the one just written. Called
  after both `handleAvatarChange` and `handleCameraCapture` succeed.
- `handleRemoveAvatar` now sweeps the entire prefix (not just the
  parsed URL) — more robust against stale `avatarUrl` state.

### Finding 9 — `handleResendVerification` could be button-mashed (P2)

**Evidence:** No client cooldown. The edge function has its own server-
side rate limit but the round trip could be queued multiple times,
yielding duplicate emails.

**Fix:** 30-second client cooldown via `lastResendVerificationRef`. Same
pattern as the other mutation handlers.

### Finding 10 — `handleSignOut` had no error path and no activity log (P2)

**Evidence:** `await supabase.auth.signOut()` ignored error, toast
fired unconditionally. A failure (rare but possible) left the user
believing they were signed out when they were not.

**Fix:**
- Log `sign_out` activity BEFORE the auth call (JWT is invalid after).
- Destructure `error` from `signOut()`; toast the message and return
  without navigating away on failure.

### Finding 11 — Dead icon imports (P3)

**Evidence:** `Phone`, `ShieldCheck` imported but never referenced
(`grep -c '<Phone' = 0`, `<ShieldCheck = 0`).

**Fix:** removed from the import list.

### Finding 12 — ActivityLog had no error state and no realtime (P1)

**Evidence:** `ActivityLog.tsx` fetched once on mount with a bare `try`
that didn't surface `error` to the user. There was no realtime sub, so
even after Bug 1 was fixed, the card wouldn't refresh until the user
navigated away and back.

**Fix:**
- Hoisted the fetch into a `useCallback` `fetchActivities` reusable as
  a retry handler.
- Error state surfaces `queryError.message` with a "Try again" button.
- Realtime sub on `account_activity_log` INSERT filtered by user_id;
  the table was added to `supabase_realtime` in the same migration.
- Icons + colors added for `sign_out`, `avatar_remove`, `phone_verify`
  so the new event types render with the right glyph.

---

## What was already correct (verified, no changes)

- **Password change requires current-password re-auth.** `handleChangePassword`
  calls `signInWithPassword({email, password: currentPassword})` before
  invoking `updateUser({password})`. Without this, a stolen session
  token could rotate the password and lock out the real owner.
- **Email change goes through Supabase confirm-email flow.**
  `auth.updateUser({email})` triggers Supabase's confirmation email to
  the NEW address; the change only takes effect when the user clicks
  the link there. Old email keeps working in the meantime.
- **Input sanitization.** `sanitizeText` strips HTML tags + `javascript:`
  protocol; `sanitizePersonName` allows Unicode letters (so José,
  Núñez, O'Connell aren't mangled by an ASCII-only filter).
- **Rate-limit refs.** 5s on profile save, 10s on password/email change.
  Friction-only; real abuse defense is at the auth/RLS layer.
- **Password strength bar.** Length + uppercase/lowercase + digit +
  symbol scoring.
- **Confirm-DELETE typed gate.** AlertDialogAction is disabled until
  `deleteConfirmText === "DELETE"`.
- **`delete-seeker-account` edge function** rejects callers who have a
  provider profile or admin role (lines 54-59) and runs `purge_seeker_data`
  before `auth.admin.deleteUser`. The function itself is correct — the
  CLIENT was lying about what it did.
- **Auth gate.** `!isAuthenticated && isReady && !isLoading` →
  `<AuthPrompt>` redirect-style guard so users mid-hydration aren't
  bounced.

---

## Files changed

```
NEW:
  supabase/migrations/20260704000000_log_account_activity_rpc.sql
    - SECURITY DEFINER RPC log_account_activity(text, text, jsonb)
      writes via auth.uid() so clients can't impersonate
    - Adds account_activity_log to supabase_realtime publication
    - Applied live (mldbxpntzcjalgjmwnqa)

MODIFIED:
  src/hooks/useActivityLog.ts
    - logActivity() now calls log_account_activity RPC (was silent
      INSERT denied by RLS)
    - Added 'sign_out' and 'phone_verify' to ActivityEventType

  src/components/seeker/ActivityLog.tsx
    - Error state with Try-again retry
    - Realtime sub on account_activity_log INSERT (user_id filtered)
    - Icons + colors for sign_out, avatar_remove, phone_verify

  src/pages/seeker/SeekerSettings.tsx
    - Fetch phone_verified + initialize phoneVerified state +
      verifiedPhoneRef
    - Realtime sub on seeker_profiles UPDATE (user_id filtered) so
      verify edge-fn writes propagate
    - PhoneVerificationStep gets isVerified={phoneVerified} and an
      onPhoneChange wrapper that clears verifiedPhoneRef on edit;
      onVerified logs phone_verify
    - handleSaveProfile: clear phone_verified when phone changed;
      surface error.message in toast
    - Avatar handlers: surface error.message; new cleanupOldAvatars
      helper sweeps stale files after upload; remove handler now
      sweeps the full prefix
    - handleResendVerification: 30s client cooldown ref
    - handleSignOut: log sign_out before signOut; toast error on
      failure instead of always claiming success
    - handleDeleteAccount: drop the misleading "30 days to recover"
      copy; new dialog text matches reality; parse backend error body
      for honest messages
    - Drop unused icon imports (Phone, ShieldCheck)

NEW:
  docs/seeker-settings-hardening-2026-05-21.md
```

---

## Verification

- `npx tsc --noEmit` → clean
- `npx vitest run` → 128 passed, 5 skipped
- `npx vite build` → built successfully in ~27s
- Migration applied live to `mldbxpntzcjalgjmwnqa`. Verified via
  `pg_proc.prosecdef=true` on `log_account_activity` and
  `pg_publication_tables` membership for `account_activity_log`.

---

## Behavioural guarantees

1. **Activity log actually records events.** Every avatar change, profile
   update, password change, email change, sign-out, and phone-verify
   now appears in the Activity card within ~200ms.
2. **Deleting an account no longer lies about recovery.** Copy matches
   the immediate hard-delete behavior of the edge function.
3. **Phone verified badge reflects DB truth on load** and updates live
   when verification completes in another tab.
4. **Phone changes invalidate the verified flag** on save — no stale
   "verified" against a brand-new number.
5. **No silent toasts.** Every mutation handler surfaces `error.message`
   when the server returns one.
6. **No avatar storage bloat.** After successful upload (file or
   camera), prior files in the user's storage prefix are swept.
7. **No spam-clicked verification emails.** 30s client cooldown layered
   on top of the edge function's server-side rate limit.

---

## What was NOT changed (and why)

| Area | Decision | Rationale |
| --- | --- | --- |
| Soft-delete window (the dormant `deletion_scheduled_at` columns) | Left as-is | The DB columns exist but the edge function never wrote to them. Either we delete the columns or we re-design soft-delete end-to-end (recovery flow, scheduled purge cron, email warnings). Out of scope; the columns are documented as unused. |
| `extractErrorMessage` adoption across every handler | Partial | Used in `handleResendVerification` (where the edge function may return `{data: {error}}`). The other handlers use `error.message || fallback` directly, which is simpler and clearer for the Postgres / auth error shapes they encounter. |
| Email change re-auth | Left as-is | Supabase's confirm-email-flow already requires the user to click a link sent to the NEW address. Adding a current-password re-auth would be belt-and-suspenders but the change has no destructive side. |
| `SessionManagementCard` | Read-only audit | Already-hardened shared component; its own internals are out of scope here. |
| `PhoneVerificationStep` (the component itself) | Read-only audit | Behaves correctly when given `isVerified`. The original bug was the PARENT not passing it. The component's own error path already surfaces `error.message`. |
