# /account/saved — Deep Hardening Pass

**Date:** 2026-05-21
**Branch:** `claude/phase2-deployment-5WYOn`
**Scope:** `SeekerSaved.tsx` page + `useFavorites` hook + `FacilityCard` (read-only audit, no edits).

This page lists every facility the seeker has favourited from the rest of
the app, with remove + refresh + pagination. It sits on top of the
`user_favorites` table (already realtime-enabled in the prior pass) and
the `public_facilities` view.

---

## Findings closed

### Finding 1 — Silent failure swallow on unexpected fetch errors (P1)

**Evidence:** `SeekerSaved.tsx:64` had a bare `catch {}` that replaced
any unexpected error with a generic copy:

```ts
} catch {
  setError('An unexpected error occurred');
  setFacilities([]);
}
```

A network drop, a JSON parse fault, or any thrown `Error` from inside the
supabase client was reduced to the same vague string — no clue what
actually broke, and the toast has no actionable info.

**Fix:** typed catch that lifts `err.message` when it's an `Error`:

```ts
} catch (err) {
  const message = err instanceof Error ? err.message : 'An unexpected error occurred';
  setError(message);
  setFacilities([]);
}
```

### Finding 2 — `queryError.message` was dropped on the floor (P1)

**Evidence:** `SeekerSaved.tsx:43-46`:

```ts
if (queryError) {
  setError('Failed to load saved facilities');
  setFacilities([]);
}
```

If RLS blocked the read, or the view threw, the user saw the same fallback
regardless of cause. No way to triage from the UI; no useful message in
the error banner.

**Fix:** `setError(queryError.message || 'Failed to load saved facilities')`.
Falls back to the generic copy only when message is empty.

### Finding 3 — `toggleFavorite` fire-and-forget caused a misleading success path (P0)

**Evidence:** `SeekerSaved.tsx:84-91` (pre-fix):

```ts
const handleRemove = (facilityId: string) => {
  toggleFavorite(facilityId);                              // async, not awaited
  setFacilities(prev => prev.filter(f => f.id !== facilityId));  // optimistic
  toast({ title: 'Removed from saved', ... });             // unconditional
};
```

Three problems chained together:
1. `toggleFavorite` is async — the click was treated as success before
   the DB confirmed the delete.
2. The local `facilities` array was filtered immediately. The favorited
   row vanished from the UI.
3. The "Removed from saved" toast fired unconditionally.

If the DB delete failed (RLS denial, network, anything), `useFavorites`
re-inserted the id back into `favorites` and toasted an error. The
`useEffect([favorites])` re-fetched and the row eventually re-appeared
in `facilities` — but only after the user had already been told their
remove succeeded. Two toasts (one success, one error) and a row that
"un-removed" itself a moment later. Confusing.

**Fix (two parts):**

1. `useFavorites.toggleFavorite` now returns `Promise<boolean>`:
   - `true` when the desired state was reached (network success, or
     guest mode where there's no network to fail, or 23505 unique-
     violation on insert which means the row already exists).
   - `false` when the DB rejected the change. The hook still emits the
     failure toast from inside itself, so callers don't need to.
2. `handleRemove` is now `async` and awaits:

```ts
const handleRemove = async (facilityId: string) => {
  const succeeded = await toggleFavorite(facilityId);
  if (!succeeded) return;
  setFacilities(prev => prev.filter(f => f.id !== facilityId));
  toast({ title: 'Removed from saved', ... });
};
```

No more misleading success toast. No more vanish-and-reappear. The other
three call sites of `toggleFavorite` (SearchResultCard, FacilityCard,
CenterProfile, SeekerFacilityProfile) ignore the new return value; their
behaviour is unchanged because they didn't depend on the synchronous
result.

### Finding 4 — Pagination state not in the URL (P1)

**Evidence:** `usePagination` already supports `syncToUrl` (and writes
`?p=` / `?ps=` to the URL) but `SeekerSaved` opted out. Bookmark
`/account/saved` while on page 3 → reload → page 1. Back-button → page 1.

**Fix:** `syncToUrl: true` on the `usePagination` call. `?p=` (page)
and `?ps=` (page size) round-trip; defaults are not written so the bare
`/account/saved` URL stays clean.

---

## What was already correct (verified, no changes)

- **Realtime cross-device sync.** `useFavorites` (hardened in the prior
  seeker pass) subscribes to `user_favorites` INSERT + DELETE filtered
  by `user_id=eq.<id>`. A favourite toggled on one device propagates to
  this page within ~200ms (favorites state updates → useEffect refires
  → fetchFacilities re-runs). No additional realtime needed on
  SeekerSaved itself.
- **Auth gate.** `!isAuthenticated && !favoritesLoading` → `AuthPrompt`.
  Doesn't bounce during session hydration.
- **`public_facilities` view, not `facilities`.** Correctly uses the
  view so SAMHSA-imported / unclaimed approved listings still resolve
  with the same Pro-masking and verification rules as the rest of the
  app.
- **500-row fetch cap.** A pragmatic ceiling. Heavy edge case (user has
  more than 500 favourites) is unrealistic for a treatment-seeker; the
  fetch would silently truncate. Documented but left as-is.
- **Skeleton matches loaded card.** `FacilityCardSkeleton` x 3 matches
  the rendered `FacilityCard`'s hero+meta height, no layout shift on
  data arrival.
- **Empty state.** Distinct from error state (the conditional gates on
  `facilities.length === 0 && !error`). CTA links to `/account` (the
  seeker home with search), a real route.
- **`onRemove` vs default heart.** `FacilityCard` accepts `showRemoveButton`
  + `onRemove`; when set, the heart button calls `onRemove(facility.id)`
  instead of `toggleFavorite` directly. Lets the parent (SeekerSaved)
  control the flow (await + toast).
- **`useMemo(visibleFacilities)`.** Recomputed only on `facilities` /
  `pagination` change. Cheap slice.
- **Refresh button.** Hidden while `facilities.length === 0` (nothing
  to refresh; the empty state's CTA is the right action).
- **Helmet noindex.** `/account/saved` is private; `noindex, nofollow`
  is set.

---

## Files changed

```
MODIFIED:
  src/hooks/useFavorites.ts
    - toggleFavorite now returns Promise<boolean> (true on success,
      false on persisted DB failure). Behavior is unchanged for callers
      that ignore the return value; SeekerSaved.handleRemove now awaits
      and gates its optimistic local-state edit + success toast on the
      result.
  src/pages/seeker/SeekerSaved.tsx
    - Surface queryError.message in setError (instead of generic copy)
    - Typed catch — lifts err.message when err instanceof Error
    - handleRemove now async + awaits toggleFavorite; only filters
      local state + toasts on success
    - syncToUrl: true on usePagination — ?p / ?ps round-trip

NEW:
  docs/seeker-saved-hardening-2026-05-21.md
```

---

## Verification

- `npx tsc --noEmit` → clean
- `npx vitest run` → 128 passed, 5 skipped
- `npx vite build` → built successfully in ~29s

---

## Behavioural guarantees

1. **No misleading "Removed from saved" toast.** A DB-side delete
   failure no longer claims success; the user sees the error toast from
   `useFavorites` (with the actual error message) and the row stays
   visible.
2. **Honest error messages.** Both initial-fetch errors and unexpected
   throws surface the underlying message instead of a generic string.
3. **Bookmarkable pagination.** `/account/saved?p=2&ps=25` restores the
   exact position.
4. **Cross-device sync.** A facility favourited on phone appears on
   desktop within ~200ms via the `useFavorites` realtime sub from the
   prior pass.
5. **No double-removal race.** When `toggleFavorite` fails on the
   network side, the favorites array is reverted by `useFavorites`,
   `useEffect` refires `fetchFacilities`, and the row is restored. The
   premature local-state filter no longer fires, so there's no flicker.

---

## What was NOT changed (and why)

| Area | Decision | Rationale |
| --- | --- | --- |
| 500-row fetch cap | Left as-is | Realistic seeker won't favourite that many. A real cap-overflow needs a different UX (paged DB query, not client paging). |
| Realtime subscription on `public_facilities` (admin status change) | Left as-is | Low-frequency; if an admin un-approves a facility, the user's next refresh will reflect it. Not worth the channel overhead. |
| `SearchResultCard`, `CenterProfile`, `FacilityCard` (other `toggleFavorite` callers) | Left as-is | They never showed a "removed" toast; the new return value is ignored harmlessly. No behaviour change. |
| `clearFavorites` (in useFavorites) | Left as-is | Not exposed in any user-facing surface; only used in dev/test seed flows. Adding a confirm dialog or surface would be feature creep. |
