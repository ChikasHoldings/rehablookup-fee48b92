# User Panel — Flow Trace (Phase 3)

> Captured: 2026-05-01. Code-level trace of the 14 highest-stakes user-panel flows.
> Methodology: read source for each flow end-to-end, cross-reference edge functions, surface inconsistencies.

## Flows traced

| # | Flow | Status |
|---|---|---|
| 1 | Lead intake (qualified) | ⚠️ 1 medium bug surfaced (C-1) |
| 2 | Email verification (send/verify code) | ✅ clean |
| 3 | Concierge intake (domestic, 7-step) | ✅ idempotency holds |
| 4 | International intake | ✅ mirrors concierge |
| 5 | Stripe checkout → webhook → thank-you | ✅ chain intact |
| 6 | Seeker auth gating (`SeekerShell`) | ⚠️ 1 medium UX bug (S-1) |
| 7 | Seeker collection pages (Saved/Reviews/Requests/Search) | ✅ all have empty states |
| 8 | Seeker config pages (Settings/Help/NotificationPrefs) | ✅ N/A — no empty state needed |
| 9 | SmartCatchAll slug fallback | ✅ falls through to `<NotFound />` |
| 10 | Center profile (`/center/:slug`) | ✅ uses `get_public_facility_data` RPC, gated |
| 11 | Search results + proximity ranking | ✅ guarded by `useStaticFacilities` snapshot fallback |
| 12 | Contact / Provider support forms | ⚠️ inherit C-1 |
| 13 | Exit-intent / marketing leads | ⚠️ inherit C-1 |
| 14 | Lead-intake error toast → user copy | ⚠️ surfaces "[object Object]" — see C-1 |

---

## Critical findings

### C-1 (Critical) — Inconsistent error envelope causes "[object Object]" toast on email_required / invalid_email

**Where:** `supabase/functions/submit-qualified-lead/index.ts` (and any sibling fn that mixes envelopes).

**What:** Within a single edge function, validation responses use **two different shapes**:

1. Legacy string shape (Name, Phone, Facility, Rate-limit, etc.):
   ```json
   { "success": false, "error": "Name is required (minimum 2 characters)" }
   ```
2. New structured shape (Email — added during standardization):
   ```json
   { "error": { "code": "email_required", "message": "Email is required" }, "code": "email_required", "details": { "field": "email" } }
   ```

**Client consumer** (`src/components/lead-intake/useLeadIntakeForm.ts:478`):
```ts
if (data?.error) throw new Error(data.error);
```

For shape (1) `data.error` is a string — toast renders correctly.  
For shape (2) `data.error` is an object — `new Error({...})` produces a `"[object Object]"` message and the user sees:

> Submission failed
> [object Object]

**Reach:** Every form whose backend returns the new structured `email_required` / `invalid_email` envelope:
- Lead intake (`useLeadIntakeForm.ts:478`)
- Concierge intake (`ConciergeIntake.tsx`, draft + checkout invocations)
- Contact form (`Contact.tsx`)
- Provider support (`ProviderSupport.tsx`) — out of user-panel scope but same bug
- Exit-intent / marketing / qualified-lead siblings — same pattern.

**Severity:** Critical for conversion. The very flows we just hardened (email_required) now show a debugger-style toast instead of friendly copy. The user can't tell what went wrong.

**Fix options (tracked, not implemented in audit):**
1. **Client-side normalizer**: extract a helper `extractErrorMessage(data)` that handles both shapes:
   ```ts
   const msg = typeof data?.error === "string"
     ? data.error
     : data?.error?.message ?? data?.reason ?? "Please try again";
   ```
   Apply at all `supabase.functions.invoke` consumers (~14 sites).
2. **Server-side**: also write `reason` (string) at the top level — already done in `submit-qualified-lead` line 546, but other functions need to mirror. Then clients can `data.reason || data.error`.
3. **Best**: do (1) — client tolerant of both shapes — and gradually finish the envelope standardization.

---

## Medium findings

### S-1 (Medium) — Admin/provider sees seeker "Complete Your Profile" empty state on `/account/*` redirect

**Where:** `src/components/seeker/SeekerShell.tsx:219`.

**What:** When an authenticated admin or provider hits any `/account/*` URL, three queries run in parallel:
- `seeker-profile` (likely returns `null` since admins/providers usually don't have a `seeker_profiles` row)
- `shell-role-check` (returns `"admin"` / `"provider"`)

If `seeker-profile` resolves first (it often will — single-row maybeSingle), the component hits line 219:
```tsx
if (isAuthenticated && profile === null) {
  return <SeekerEmptyState onCompleteProfile={() => navigate('/account/settings')} />;
}
```
So an admin briefly sees "Complete Your Profile" before the role-check effect (line 174) navigates them to `/admin`.

**Fix (tracked):** Gate the empty state on `userRole === "seeker"`:
```tsx
if (isAuthenticated && profile === null && userRole === "seeker") { ... }
```
Or render the skeleton until both queries resolve.

**Severity:** Medium. Wrong-role flicker on admin/provider deep-links to `/account`.

### M-1 (Medium) — Forms without Zod (defense-in-depth)

Carryover from Phase 2 §F-2. Backend validation covers correctness, but client-side Zod would:
- catch malformed input before a network round-trip (perf + UX),
- standardize field-level error rendering (helps fix C-1 client-side).

Files: `Contact.tsx`, `SeekerSignup.tsx`, `ResetPassword.tsx`, `ProviderSupport.tsx`, `useLeadIntakeForm.ts`.

### M-2 (Medium) — `lastSubmitAt` debounce is bypassed when `useRef` resets

`useLeadIntakeForm.ts:354` debounces double-submits at 3s. But the ref is per-hook-instance: if the form unmounts and remounts (e.g. modal closed/reopened) the debounce clock resets. Combined with the idempotency key being also instance-local, duplicate submissions remain possible if the user closes & reopens the modal within 3s.

**Mitigation in place:** server-side `idempotencyKey` is sent and the backend uses it for dedupe. So the user impact is "second submission silently no-ops on the server" — not a duplicate lead.

**Recommend:** raise this as informational only.

---

## Low findings

### L-1 (Low) — `SeekerShellSkeleton` shown when `isAuthenticated && profile === undefined`

`SeekerShell.tsx:214` shows the skeleton while profile loads, but there is no timeout/fallback if the query errors. With `staleTime: Infinity` and `refetchOnMount: false`, an early auth-event-triggered failure (network offline) could leave the user on the skeleton indefinitely. React-Query default is 3 retries with backoff, so it's rare but possible. Add an error boundary fallback inside `SeekerShell` for completeness.

### L-2 (Low) — `console.log` in `useLeadIntakeForm.ts` lines 355, 362

Already documented in Phase 2 (F-2-bis). No PII, but should be gated behind `import.meta.env.DEV`.

### L-3 (Low) — Dev-server warning `Unknown message type: RESET_BLANK_CHECK`

Single warning on Lovable's runtime postMessage channel — emitted by `cdn.gpteng.co/lovable.js`, not our code. No user impact.

---

## Confirmed clean

- **Concierge intake idempotency** (`mem://features/placement-intake-idempotency`):
  - `save-placement-draft` is upsert-by-`draft_id` — confirmed in `ConciergeIntake.tsx:530`.
  - `create-concierge-checkout` receives `draftId` and links the Stripe session — confirmed in line 547.
  - Webhook fallback path uses `draft_id` from session metadata — out-of-scope for this audit but memorialized.
- **PII safety in localStorage**: both `useLeadIntakeForm` and `ConciergeIntake` use explicit whitelists (`PERSISTABLE_FIELDS`, `CONCIERGE_PERSISTABLE_FIELDS`) — names/emails/phones/insurance IDs/clinical narrative never persist to localStorage.
- **Honeypot field** `formData.website` returns fake-success on bot submissions (`useLeadIntakeForm.ts:362`).
- **Email-verification gate**: `handleSubmit` requires `isEmailVerified` unless the caller passes `skipVerificationCheck` immediately after a successful `verify-code` round-trip.
- **Seeker auth redirect**: `SeekerShell.tsx:188` redirects unauthenticated users to `/login?redirect=…` after `useAuthReady` settles (no flicker when `isReady=false`).
- **SmartCatchAll**: every unmapped slug falls through to `<NotFound />` (line 298) — no infinite redirect, no blank page.
- **Empty states present** on every collection-style seeker page (Saved, Requests, Reviews, Search, InternationalCase). Settings/Help/NotificationPreferences are config pages — empty state N/A.

---

## Items routed to Phase 4 (live reproduction)

1. Submit lead form with valid name/phone but blank email → confirm exact toast text (validate C-1).
2. Submit concierge intake with invalid email at Step 5 → confirm toast text.
3. Hit `/account/saved` as anonymous → confirm redirect to `/login?redirect=/account/saved`.
4. Hit `/foo-bar-no-such-slug` → confirm `<NotFound />` renders.
5. Hit `/center/no-such-slug` → confirm graceful fallback (CenterNotFound).

End of Phase 3.
