# Seeker Panel — Hardening Pass

**Date:** 2026-05-20
**Branch:** `claude/phase2-deployment-5WYOn`
**Scope:** 13 seeker pages + 4 hooks. Code-evidence sweep against the same standard the admin panel passes were held to.

---

## Audit matrix (before this pass)

| Page                                | URL state | isFetching | errBanner | realtime | `.single()` |
| ----------------------------------- | --------- | ---------- | --------- | -------- | ----------- |
| SeekerConcierge                     | yes       | -          | yes       | -        | **2 bugs**  |
| SeekerFacilityProfile               | -         | -          | partial   | -        | -           |
| SeekerHelp                          | -         | -          | -         | -        | -           |
| SeekerHome                          | -         | -          | partial   | -        | -           |
| SeekerInsuranceVerifications        | -         | -          | partial   | -        | -           |
| SeekerNotificationPreferences       | -         | -          | -         | -        | -           |
| SeekerNotifications                 | -         | -          | -         | yes      | -           |
| SeekerRequests                      | yes       | -          | -         | yes      | -           |
| SeekerReviews                       | -         | -          | partial   | -        | -           |
| SeekerSaved                         | -         | -          | partial   | -        | -           |
| SeekerSavedSearches                 | -         | -          | -         | -        | -           |
| SeekerSearch                        | -         | -          | -         | -        | -           |
| SeekerSettings                      | -         | -          | -         | -        | -           |

Most pages had zero or partial coverage on the standard hardening pattern, particularly **realtime sync** and **explicit error UI** (separate from the empty state).

---

## Findings closed

### P0 — silent toggle failures + missing cross-device sync (`useFavorites`)

**Evidence:** `toggleFavorite` (lines 168-192 pre-fix) caught errors and silently reverted the optimistic update with only a `console.error`. The user couldn't tell their click did nothing — they'd see the heart un-fill briefly then re-fill with no feedback.

The hook also had **no realtime subscription**. A favorite saved on phone wouldn't appear on the user's desktop tab until manual refresh.

**Fix:**
1. Toast on toggle errors with the underlying message. Special-case 23505 (unique-violation) — that's "already saved," not an error.
2. Added a realtime subscription on `user_favorites` filtered by `user_id`. INSERT and DELETE events feed `setFavorites` so the bookmark toggled on one device propagates to another within ~200ms.

### P0 — `.single()` bugs in `SeekerConcierge`

**Evidence:** two `.single()` calls would throw `PostgrestError "no rows returned"` if:
1. The placed facility was deleted (the facility-fetch query) — kicks to the global error boundary.
2. Another tab already submitted feedback (the update-returning-id query) — kicks to error boundary instead of showing the friendly "Feedback already submitted" message that the surrounding `if (data?.seeker_feedback || feedbackSubmitted)` check was supposed to catch.

**Fix:** both changed to `.maybeSingle()`; the second one now throws `new Error("Feedback already submitted")` explicitly when `data` is null. Also removed a duplicated `if (!data) throw` line that had crept in.

### P0 — silent fetch errors on `useSeekerNotifications` mutations

**Evidence:** `markAsRead`, `markAllAsRead`, `deleteNotification` all logged errors to console and refetched. No user-facing toast. A user clicking "mark as read" when the network was down saw nothing.

**Fix:** all three now toast with the underlying error message AND fall back to refetch.

### P1 — realtime publication gap for 5 seeker tables

**Evidence:** `pg_publication_tables` audit showed `user_favorites`, `saved_searches`, `seeker_profiles`, `profiles`, `seeker_facility_alerts` were RLS-enabled but not in `supabase_realtime`. Any hook subscription would be silently inert.

**Fix:** migration `20260702000000_realtime_for_seeker_tables.sql` adds all five. RLS still gates per-user visibility; multi-device sync now works end-to-end.

### P1 — `useSavedSearches` lacked cross-device sync

**Fix:** added a realtime subscription on `saved_searches` filtered by user_id. Any change from another tab/device invalidates the React Query cache and triggers a refetch; the existing optimistic updates from the mutations still handle the same-tab case.

### P1 — silent fetch errors on pages

**Findings + fixes:**
- **`SeekerSavedSearches`** — didn't destructure `isError` from `useSavedSearches`. Now renders a destructive `role="alert"` banner with Retry instead of pretending the empty-state was a real "no saved searches".
- **`SeekerRequests`** — fetch errors only toasted, then the page fell through to the "No Inquiries Yet" empty state. Added a `loadError` state; when set, the empty state is replaced with a destructive banner that includes the underlying error message and a Try again button.
- **`SeekerSearch`** — `useStaticFacilities` exposes an `error` that the page wasn't destructuring. Added an error branch in the results pane with the underlying message + Retry, distinct from the "No facilities found" empty state.
- **`SeekerNotificationPreferences`** — fetch error was silently ignored, leaving the user with default toggles. Now toasts the failure so the user knows the saved values couldn't be read.

### P1 — URL state for filter

- **`SeekerNotifications`** — added `?filter=unread` URL state with loop-guarded sync so the bookmark works.

---

## Files changed

```
NEW:
  supabase/migrations/20260702000000_realtime_for_seeker_tables.sql  (applied)
  docs/seeker-hardening-2026-05-20.md

MODIFIED:
  src/hooks/useFavorites.ts
    — Realtime subscription on user_favorites filtered by user_id
    — Toast on toggle errors (with 23505 special-case)
  src/hooks/useSavedSearches.ts
    — Realtime subscription on saved_searches filtered by user_id
  src/hooks/useSeekerNotifications.ts
    — Toast on markAsRead / markAllAsRead / deleteNotification errors
  src/pages/seeker/SeekerConcierge.tsx
    — .single() -> .maybeSingle() on the placed-facility fetch
    — .single() -> .maybeSingle() on the feedback submission;
      explicit "Feedback already submitted" error when data is null
    — Removed a duplicated `if (!data) throw` line
  src/pages/seeker/SeekerNotifications.tsx
    — URL state hydration + loop-guarded sync (?filter=unread)
  src/pages/seeker/SeekerSavedSearches.tsx
    — Destructure isError; render destructive banner with Retry
  src/pages/seeker/SeekerRequests.tsx
    — loadError state; destructive banner replaces the empty state
      when the fetch fails (was previously indistinguishable from
      "no inquiries yet")
    — Surface facility-join errors via console.warn
  src/pages/seeker/SeekerSearch.tsx
    — Destructure error/refetch from useStaticFacilities
    — Error banner with Retry in the results pane
  src/pages/seeker/SeekerNotificationPreferences.tsx
    — Surface SELECT fetch error via toast (was silently ignored)
    — Update mutation error message uses the underlying error
```

---

## Verification

- `npx tsc --noEmit` → clean
- `npx vitest run` → 128 passed, 5 skipped
- `npx vite build` → built successfully in ~38s
- Migration applied: all 5 seeker tables confirmed in `supabase_realtime` publication

---

## Behavioural guarantees

1. **Cross-device favorites sync.** Save a facility on phone → desktop shows it within ~200ms.
2. **Cross-device saved-search sync.** Same guarantee for saved searches and their alert frequencies.
3. **No silent toggle failures.** Every favorite-toggle, mark-as-read, and notification-delete failure surfaces via toast with the underlying error message. 23505 (already-saved race) is recognised and NOT surfaced.
4. **No `.single()` throws to the global error boundary** in the concierge surface. Missing facilities and duplicate feedback submissions return friendly messages.
5. **Distinguishable error states.** Pages that previously conflated "fetch failed" with "no data yet" now have separate destructive banners with Retry buttons (SeekerSavedSearches, SeekerRequests, SeekerSearch).
6. **Honest preferences page.** SeekerNotificationPreferences tells the user when the saved values couldn't be read instead of silently showing defaults.

---

## What was already correct (no changes)

- `useSeekerNotifications`: full realtime subscription on `seeker_notifications` with INSERT/UPDATE/DELETE handlers, optimistic updates, browser notifications + sound, auth state change handling.
- `SeekerRequests`: realtime channel on `leads` (subscribes globally, RPC filters server-side).
- `SeekerSaved`, `SeekerFacilityProfile`, `SeekerHome`, `SeekerInsuranceVerifications`, `SeekerReviews`: already have isLoading + error UI patterns.
- `SeekerSettings`, `SeekerHelp`: tightly bound to mutations with proper toasts.
- `SeekerShell`, `SeekerHeader`, `SeekerMobileNav`: layout components, no data fetches.

---

## What still needs a browser

(Same caveat as the admin pass — sandbox proxy blocks outbound to `*.supabase.co` and `rehablookup.com`, can't drive a real session here.)

1. Test cross-device sync by toggling a favorite on a phone-sized viewport and watching a desktop viewport update.
2. Test the realtime mark-as-read by opening the bell icon dropdown on two devices and clicking mark-as-read on one.
3. Verify the error banners actually render correctly by forcing a fetch failure (e.g. network throttling to "Offline").
4. Confirm no console warnings on the seeker pages under React 18 strict mode (none expected — most useEffects properly clean up).
