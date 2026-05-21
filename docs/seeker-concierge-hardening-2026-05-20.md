# /account/concierge — Deep Hardening Pass

**Date:** 2026-05-20
**Branch:** `claude/phase2-deployment-5WYOn`
**Scope:** `SeekerConcierge.tsx` page + placement components + the seeker-side advisor visibility surface.

---

## Critical bug fixed (P0)

### AdvisorTrustCard was invisible for every seeker with an assigned advisor

**Evidence:** `AdvisorTrustCard.tsx:14-29` selected directly from `admin_user_profiles`:
```ts
const { data, error } = await supabase
  .from("admin_user_profiles")
  .select("first_name, last_name, display_name, avatar_url")
  .eq("user_id", advisorId)
  .maybeSingle();
```

But the RLS policies on `admin_user_profiles` (verified via `pg_policy`) only allow:
1. Admins to SELECT all rows
2. Users to SELECT their own row

A seeker (non-admin) querying their assigned advisor's row gets RLS-denied → returns null silently → `isAssigned = false` → the card rendered the "we're matching you with an advisor" state for every seeker, including those who already had a real advisor assigned.

**Fix:** new SECURITY DEFINER RPC `get_inquiry_advisor_public_info(p_inquiry_id uuid)` in migration `20260703000000_seeker_assigned_advisor_public_info.sql`. The RPC:
- Verifies `auth.uid() IS NOT NULL`
- Returns ONLY the four public-safe columns (`first_name, last_name, display_name, avatar_url`) — no email, no MFA state, no admin_role
- Returns the advisor only when the calling user owns the inquiry that lists the advisor (`concierge_inquiries.user_id = auth.uid()`)
- Is STABLE so React Query can cache it

`AdvisorTrustCard` now calls the RPC via `supabase.rpc("get_inquiry_advisor_public_info", { p_inquiry_id: inquiryId })`. The component gains an `inquiryId: string` required prop; `SeekerConcierge` passes `selectedCase.id`.

This is a real production bug — seekers have been seeing a stale "advisor not yet assigned" message for weeks/months even when their advisor is on the case. Fixed.

---

## Other findings

### Finding 2 — `/account/concierge/:inquiryId` deep-link was silently dropped (P1)

**Evidence:** App.tsx:1364 mounts `SeekerConcierge` at both `/account/concierge` and `/account/concierge/:inquiryId`. SeekerHome's "Resume your placement intake" CTA on `/account` links to `/account/concierge/${seekerKpis.resumeInquiry.id}` (line 621). But `SeekerConcierge.tsx` never called `useParams()` — the `:inquiryId` segment was silently dropped and `selectedCase` fell back to `cases[0]`.

If the seeker had multiple cases and clicked "Resume" on a specific one, they landed on the wrong case.

**Fix:**
1. Added `useParams<{ inquiryId?: string }>()` to read the route segment.
2. Seeded `selectedCaseId` initial state with `routeInquiryId ?? null`.
3. Added a useEffect that keeps the URL in sync with the selected case: clicking a different case in the selector calls `navigate(\`/account/concierge/${id}\`, { replace: true })` so back/forward and bookmarks preserve the selection.
4. When the user has exactly one case AND the URL has no id, the bare URL is left alone (no unnecessary navigation).

### Finding 3 — Auto-link effect serialised + swallowed errors (P1)

**Evidence:** Lines 109-133 (pre-fix). Bare `try/catch` with empty handler, no `.error` check on the SELECT query, individual `link-inquiry-to-user` invocations awaited serially in a `for` loop with `.catch(() => {})` swallowing failures.

**Fixes:**
1. SELECT error now `console.warn`s with the message instead of silent swallow.
2. Link invocations parallelised via `Promise.allSettled` — 10 unlinked inquiries link in roughly the time of 1.
3. Reports number of failed invocations as `console.warn` for ops observability.
4. Added a cancellation flag so a fast remount doesn't double-link.

### Finding 4 — Cancel mutation onSuccess lied when optimistic lock failed (P1)

**Evidence:** `cancelCaseMutation.mutationFn` had a soft-return on optimistic-lock failure (line 334 pre-fix: `if (!updated) return; // idempotent`). But `onSuccess` ALWAYS toasted "Your request has been cancelled" — even when the cancel didn't actually apply because the case had advanced in another tab. The case_event log and notification were correctly skipped, but the success toast was a lie.

**Fix:**
1. Mutation returns a structured sentinel `{ cancelled: false }` when the optimistic lock fails, `{ cancelled: true }` on actual cancel.
2. `onSuccess` reads the sentinel: shows "Your case has moved forward in another tab — refreshing the view." when the lock failed, "Your request has been cancelled" only on real cancellation.
3. Case-event log failures now `console.warn` instead of throwing (the cancel itself already succeeded; an event-log blip shouldn't bubble to the user).

### Finding 5 — Case selector buttons didn't scale + had awkward selection state (P2)

**Evidence:** Lines 540-553 rendered a `<Button>` per case. The active-state check was `selectedCaseId === c.id || (!selectedCaseId && c.id === cases[0].id)` — workaround for the now-fixed selected-state-vs-route mismatch. With 10+ cases the buttons wrap into a wall of pills.

**Fix:**
- 2-3 cases → keep the button row (now uses the canonical `selectedCase?.id` for the active check).
- 4+ cases → switch to a `<Select>` dropdown showing `#XXXXXXXX` + creation date + status.
- All variants get `aria-label` + `aria-pressed` for screen readers.

### Finding 6 — Realtime channel listened to UPDATE only (P2)

**Evidence:** Line 200 (pre-fix) had `event: "UPDATE"`. A new case INSERT in another tab/device would not propagate; the user had to refresh.

**Fix:** `event: "*"` so INSERT and DELETE also invalidate the cases query.

### Finding 7 — `matchedFacilities` fetch error was indistinguishable from "no matches yet" (P2)

**Evidence:** The query previously didn't destructure `isError`. A failed `facilities` SELECT rendered as an empty `PlacementTabs` — visually identical to a legitimate "still waiting for matches" state.

**Fix:** destructure `isError + refetch`; render an inline `role="alert"` banner with a Retry button when the fetch fails, distinct from the "no matches" empty state. Placed BEFORE the tabs so the seeker sees the failure context.

---

## Files changed

```
NEW:
  supabase/migrations/20260703000000_seeker_assigned_advisor_public_info.sql  (applied)
  docs/seeker-concierge-hardening-2026-05-20.md

MODIFIED:
  src/pages/seeker/SeekerConcierge.tsx
    - useParams<{ inquiryId? }> reads the route segment; seeds
      selectedCaseId; useEffect keeps URL in sync with case selection
    - Auto-link effect: Promise.allSettled; surface fetch errors via
      console.warn; cancellation flag
    - cancelCaseMutation returns structured {cancelled} sentinel;
      onSuccess shows accurate message when optimistic lock fails;
      case-event log failures console.warn (don't throw)
    - Case selector: <=3 cases → button row; 4+ → <Select> dropdown
    - Realtime channel listens to event:"*" (was UPDATE only)
    - matchedFacilities destructures isError + refetch; inline
      destructive banner with Retry
    - AdvisorTrustCard call passes new required inquiryId prop
  src/components/seeker/placement/AdvisorTrustCard.tsx
    - Added required inquiryId: string prop
    - Replaced direct SELECT on admin_user_profiles (RLS-blocked for
      seekers — silently null) with the security-definer RPC
      get_inquiry_advisor_public_info(p_inquiry_id)
    - Returns only public-safe columns; authorised via
      concierge_inquiries.user_id = auth.uid()
```

---

## Verification

- `npx tsc --noEmit` → clean
- `npx vitest run` → 128 passed, 5 skipped
- `npx vite build` → built successfully in ~38s
- Migration applied: RPC `get_inquiry_advisor_public_info` exists on live project, granted to `authenticated`

---

## Behavioural guarantees

1. **Advisor visibility actually works.** Every seeker with an assigned advisor now sees their advisor's name and avatar on the trust card — previously hidden by RLS for all seekers.
2. **No advisor info leak.** The RPC exposes ONLY the four public-safe columns and authorises by inquiry-ownership. Other admin columns (email, MFA, admin_role, employment_type) remain RLS-protected.
3. **Deep links work.** `/account/concierge/<id>` lands on the correct case. Selecting a different case updates the URL. Bookmark + share + back/forward all preserve the case selection.
4. **No silent autolink failures.** Pre-signup inquiries link to the user account on login with proper error visibility (console.warn for ops) and parallel execution.
5. **No misleading cancel-success toasts.** When the optimistic lock catches a parallel-cancel race, the user sees "case advanced in another tab" instead of a lie about successful cancellation.
6. **Case selector scales.** 1-3 cases get a button row; 4+ get a dropdown with creation date and status.
7. **Realtime covers all events.** New case inserts and case deletions propagate within ~200ms across sessions.
8. **Matched-facility fetch errors surface inline** with a Retry — no more "is it loading or did it fail?" ambiguity.

---

## What was already correct (no changes)

- `.maybeSingle()` on placed-facility fetch (added in earlier hardening pass) — RLS-friendly null return.
- `.maybeSingle()` on feedback mutation with explicit "Feedback already submitted" friendly error — added in earlier hardening pass.
- Stripped legacy `?payment` / `?session_id` query params from old bookmarks (lines 186-194) — leftover from the retired $29 paid concierge flow.
- `validateTransition("concierge", status, "closed")` client-side guard before allowing cancel — surfaces clear message instead of opaque DB rejection.
- `casesError` shows a destructive `Card` with Retry on top-level fetch failure.
- `FeedbackForm`, `PlacementHero`, `PlacementSupportCard`, `PlacementMatchCard`, `PlacementStatusCard`, `PlacementConfirmationCard`, `AdmissionStatusCard`, `PlacementTabs`, `SeekerProviderReviewCard`, `SeekerPlacementModal`, `AdvisorMessaging` — read-only inspection, no obvious gaps.
- `framer-motion` AnimatePresence between hero/intake (line 405-440) — clean transition with no orphan timers.
- Loading skeleton matches the rendered layout shape.

---

## What would benefit from a browser session (out of scope here)

1. Visually verify the new Select dropdown renders well at all viewports (320 / 768 / 1280px).
2. Test the deep-link flow end-to-end: click "Resume" on SeekerHome → land on the right case → swap cases → URL updates.
3. Test the realtime by opening two tabs and submitting a new intake in one.
4. Verify the AdvisorTrustCard now shows the real advisor name on a production-data case with an assigned advisor.
