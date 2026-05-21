# /account/requests — Deep Hardening Pass

**Date:** 2026-05-20
**Branch:** `claude/phase2-deployment-5WYOn`
**Scope:** `SeekerRequests.tsx` page (the seeker inbox) + `SeekerRequestForm` wrapper + the `InquiryDetailModal` and related RPC contracts.

This is a follow-up to the earlier seeker hardening pass that added `loadError` state + an error banner. This pass deep-audits for hidden bugs, dead code, and RLS / RPC contract mismatches.

---

## Critical bug found (P0)

### `SeekerHome` was passing an invalid argument to `get_seeker_submitted_leads`

**Evidence:** `SeekerHome.tsx:204` called:
```ts
supabase.rpc("get_seeker_submitted_leads", { p_email: user.email } as never)
```

The `as never` cast deliberately bypassed TypeScript validation. The actual DB function signature has **no parameters** (verified via `pg_get_function_identity_arguments`):
```
proname: get_seeker_submitted_leads, args: (empty)
```

Calling a parameterless function with `{p_email}` causes PostgREST to return **404 "function does not exist"**. The prior earlier-pass change made the KPI strip honest about errors (suppresses it on failure), but the call itself was the broken contract — every signed-in seeker's home page silently logged a warning and hid the "Inquiries open" KPI for them, even when they had pending leads.

**Fix:** dropped the bogus argument — `supabase.rpc("get_seeker_submitted_leads")` now matches the DB signature. The function reads `auth.uid()` and `auth.users.email` internally to filter the result set.

---

## Other findings closed

### Finding 2 — `prefillData` prop on `SeekerRequestForm` was dead code (P1)

**Evidence:** `SeekerRequestForm` accepted a `prefillData` prop typed against the seeker's saved-request shape, but **never threaded it into `LeadIntakeForm`** (which is the actual form rendered inside). The page also imported `useNavigate` unused.

`LeadIntakeForm` has its OWN prefill mechanism (`useLeadIntakeForm.ts:121-189`): it reads the non-PII fields from a private localStorage cache AND prefills name/email/phone from `seeker_profiles`. So the user's "Your information will be prefilled" promise on the inbox is met through that mechanism — just not through the dead prop.

**Fix:** dropped the `prefillData` prop and its 14-field interface, dropped the unused `useNavigate` import. Also removed the matching `SavedRequestData` interface + `savedData` state + `loadSavedData` + the write-on-success localStorage trip in `SeekerRequests` (lines 503-505 pre-fix). All four were dead — wrote to a localStorage key nothing reads. Documented with an inline comment so a future contributor doesn't re-introduce the dead path.

### Finding 3 — Cross-link card counts silently failed (P1)

**Evidence:** Lines 382-396 (pre-fix). Three parallel `count: "exact", head: true` queries with no `.error` checks. If any failed, the count was `0` silently — visually identical to "you have 0 of these."

**Fix:** each `.error` is now `console.warn`'d (not toasted — the cross-link strip is a nice-to-have, not critical). The card for any failing source stays at 0, so the failure is at least visible to ops in the console.

### Finding 4 — Realtime channel listened to UPDATE only and had no server-side filter (P1)

**Evidence:** Lines 409-419 (pre-fix). `{ event: "UPDATE", schema: "public", table: "leads" }` with no filter. Two problems:
1. INSERT (a new lead submitted from another tab/device) and DELETE (admin cleanup) never propagated.
2. No `filter` meant the Realtime server sent every `leads` UPDATE event to the channel and let RLS filter delivery. RLS does deny rows whose `email !=` the JWT email, but an explicit `filter: "email=eq.X"` is faster, clearer about intent, and reduces unnecessary cross-tenant chatter.

**Fix:**
- `event: "*"` so INSERT/UPDATE/DELETE all invalidate the inbox.
- Channel name now includes the user's email so multiple browser sessions don't share state.
- `filter: "email=eq.<normalized>"` server-side narrows delivery.

### Finding 5 — `markLeadViewed` localStorage set could grow without bound (P1)

**Evidence:** Lines 257-266 (pre-fix). Every viewed-lead-ID was appended to a JSON array in localStorage with no cap. Across years of usage on a heavy account this would accumulate indefinitely.

**Fix:** added `MAX_VIEWED_LEAD_IDS = 500` cap. New IDs are prepended (most-recent-first), and the array is sliced to the cap on every write. Also wrapped the `setItem` in `try/catch` so a quota-exceeded error doesn't surface as a runtime crash.

### Finding 6 — URL prefill params not drained from the URL after consumption (P1)

**Evidence:** Lines 269-281 (pre-fix). The page reads `?facilityId=&facilityName=&facilityCity=&facilityState=` and opens the New Request dialog. But the params stayed in the URL forever. A user who submitted the request and then refreshed (or pressed back-forward) re-opened the dialog over and over.

**Fix:** after consuming the params, drain them with `setSearchParams(drained, { replace: true })`. The page reads them once, the dialog opens, then the URL is clean.

### Finding 7 — Missing URL state for `filterTab` (P2)

**Evidence:** Tab state lived only in `useState`. Bookmarking "responded only" didn't work; back/forward through the page reset the tab.

**Fix:** added URL state hydration + loop-guarded sync (`?tab=pending|responded|all`). `all` (default) is not written so the bare `/account/requests` URL stays clean.

---

## What was already correct (verified, no changes)

- **InquiryDetailModal uses RPCs.** Both `get_seeker_lead_detail` and `get_seeker_lead_notes` are security-definer RPCs — required because the seeker SELECT policy on `leads` filters by JWT email but not by id; the RPCs add the auth check at function level. The modal has loading skeleton + a clear error message UI.
- **`get_seeker_submitted_leads` RPC contract.** Verified via `pg_proc` — parameterless, reads `auth.uid()` → `auth.users.email` → filters `leads.email`. RPC body confirmed `LIMIT 200` cap which is fine for any realistic seeker inbox.
- **`leads` SELECT RLS for seekers.** `"Seekers can view their own submitted leads"` policy `USING (email = (auth.jwt() ->> 'email'))` — the realtime subscription IS authorised to receive the seeker's own lead events.
- **Auth gate.** `!isAuthenticated → <AuthPrompt>` redirect-style guard runs after `isReady` to avoid bouncing during session hydration.
- **Loading skeleton.** Matches the rendered card shape (5-row), no layout shift after data load.
- **Empty state copy + CTA.** Distinct from error state; CTA links to `/account/search` (real route, verified).
- **Quick action card.** "Your information will be prefilled" — still accurate via `LeadIntakeForm`'s built-in profile + localStorage prefill (just not via the dead `prefillData` prop).
- **Dialog primitive.** Already inherits `max-h-[calc(100vh-2rem)] + overflow-y-auto` from the modal-primitive hardening pass; the per-instance `max-h-[90vh]` override is redundant but harmless.

---

## Files changed

```
MODIFIED:
  src/pages/seeker/SeekerHome.tsx
    - get_seeker_submitted_leads RPC call: dropped {p_email} arg
      (the DB signature is parameterless; the previous call 404'd
      and the KPI strip was suppressed for every signed-in seeker)
  src/pages/seeker/SeekerRequests.tsx
    - URL state for ?tab= with loop-guarded sync
    - Cross-link counts: surface .error via console.warn
    - Realtime channel: event:"*" + server-side filter on email
    - markLeadViewed: MAX_VIEWED_LEAD_IDS = 500 cap + try/catch on
      localStorage.setItem
    - Drain ?facilityId / ?facilityName / ?facilityCity /
      ?facilityState params from the URL after consuming them
    - Removed dead SavedRequestData interface + savedData state +
      loadSavedData fn + write-on-success localStorage trip
    - Dropped prefillData prop from SeekerRequestForm call
  src/components/seeker/SeekerRequestForm.tsx
    - Dropped prefillData prop + its 14-field interface (was never
      threaded into LeadIntakeForm)
    - Dropped unused useNavigate import
    - Documented the prefill source-of-truth (LeadIntakeForm reads
      seeker_profiles + private localStorage cache)

NEW:
  docs/seeker-requests-hardening-2026-05-20.md
```

---

## Verification

- `npx tsc --noEmit` → clean
- `npx vitest run` → 128 passed, 5 skipped
- `npx vite build` → built successfully in ~41s
- Live-DB check: `get_seeker_submitted_leads` confirmed parameterless via `pg_proc`; `leads` realtime publication membership confirmed via `pg_publication_tables`

---

## Behavioural guarantees

1. **The "Inquiries open" KPI on `/account` finally works for signed-in seekers.** Previously the RPC contract mismatch caused a 404 every time, the result was treated as `{ data: [] }`, and even users with 5 pending leads saw "0 inquiries."
2. **No dead code.** `prefillData` prop, `SavedRequestData` interface, `savedData` state, `loadSavedData` fn, and the unused `useNavigate` import are gone.
3. **No silent count failures.** Cross-link card failures are visible via `console.warn`.
4. **Realtime covers all events** + uses server-side filtering by email.
5. **`viewedLeadIds` localStorage stays bounded** at 500 IDs.
6. **No re-opening dialog on refresh.** Prefill URL params are drained after consumption.
7. **URL state round-trips.** Bookmarking `/account/requests?tab=responded` restores the filter.

---

## What was NOT changed (and why)

| Area | Decision | Rationale |
| --- | --- | --- |
| `Dialog`'s per-instance `max-h-[90vh] overflow-y-auto` (line 753) | Left as-is | Redundant with base primitive but harmless. |
| `"Your information will be prefilled"` copy on the Quick Action card | Left as-is | Still accurate via `LeadIntakeForm`'s own prefill from `seeker_profiles` + private localStorage cache. |
| `InquiryDetailModal`'s lack of a retry button on error | Left as-is | The error string is shown; the modal close/reopen IS the retry. Adding an inline button would touch the 420-line component for trivial gain. |
| Duplication between empty-state CTA (`Browse Treatment Centers`) and Quick Action card (`New`) | Kept | Different surfaces (empty state vs persistent action); both lead to the same place (`/account/search`). Acceptable. |
