# /account/search — Deep Rebuild + Hardening Pass

**Date:** 2026-05-21
**Branch:** `claude/phase2-deployment-5WYOn`
**Scope:** `SeekerSearch.tsx` page — full rewrite preserving the data
layer (`useStaticFacilities`, `parseLocationInput`, `getProximityTier`,
`FacilityCard`) but reworking the entire user-facing surface for URL
state, save-search wiring, sort, complete filter parity, accessibility,
and empty-state handling.

---

## Critical findings closed (P0/P1)

### Finding 1 — No URL state at all (P1)

**Evidence:** Every piece of search state — query, location, treatment
types, facility types, insurance, gender, verified, page — lived in
`useState` only. Net effects:
- A user landing on `/account/search?q=detox` from a marketing link
  got an empty page; the URL param was ignored.
- The header dropdown's "go to search" entry-point dropped the user's
  context.
- Refreshing in the middle of a results page wiped everything back to
  the initial state.
- Bookmarking "Aetna detox in San Diego" was impossible.
- The Save Search component required a URL to save against — but the
  URL never reflected the search, so saved searches couldn't
  round-trip.

**Fix:** Full URL state coverage. Every dimension hydrates from
`useSearchParams` on mount and writes back via loop-guarded sync:

| Param | Purpose | Example |
| --- | --- | --- |
| `q` | Free-text search | `?q=detox` |
| `loc` | Location string | `?loc=Los%20Angeles,%20CA` |
| `t` | Treatment types (csv) | `?t=detox,inpatient` |
| `ft` | Facility types (csv) | `?ft=residential,detox-center` |
| `ins` | Insurance (csv) | `?ins=aetna,cigna` |
| `g` | Gender served (csv) | `?g=male,co-ed` |
| `v` | Verified only | `?v=1` |
| `sort` | Sort key | `?sort=rating` |
| `p` | Page | `?p=3` |

Defaults are NOT written so a bare `/account/search` URL stays clean.

### Finding 2 — `SaveSearchButton` existed but was never used on the page (P1)

**Evidence:** `src/components/search/SaveSearchButton.tsx` was a fully-
built component with dialog, alert-frequency radio group, and
`useSavedSearches` integration. The Save-search hook had realtime,
optimistic mutations, and dedup-by-URL. Neither the page nor any
search surface rendered the button — the whole save-search pipeline
was dead code from the user's perspective.

**Fix:**
- Result header now renders `<SaveSearchButton>` with:
  - `criteria` = JSON of every active filter
  - `suggestedName` = humanized "{query} {treatments} in {location} with {insurance}"
  - `searchUrl` = current pathname + search (which now actually reflects
    the search, thanks to Finding 1)
  - `resultCount` = filtered count
- Initial state shows up to 4 most-recent saved searches as clickable
  cards. Last-match-count badge on each. Click navigates to the saved
  URL — which re-hydrates the full search via Finding 1.

### Finding 3 — Active-filter chip strip only covered 2 of 5 dimensions (P1)

**Evidence:** The active-filters bar above results only rendered
treatment-type and facility-type chips. Insurance, gender, and
verified-only had NO chip representation — the user had to open the
filter sheet to remove them or check whether they were on. Easy to
forget a stale insurance filter is the reason for an empty list.

**Fix:** New `<FilterChips>` helper component, used 4× (treatment,
facility, insurance, gender) + an explicit verified-only chip with the
`ShieldCheck` icon. Plus a "Clear filters" button when 2+ are active.

### Finding 4 — `hasSearched` was a parallel state to active filters, drifted (P1)

**Evidence:** A separate `hasSearched: boolean` state was set in
multiple places (popular-click handlers, location-suggestion select,
filter-sheet Apply). Drift cases:
- User toggled a filter off in a chip, dropping `activeFilterCount` to 0,
  but `hasSearched` was still true → rendered empty results card instead
  of returning to initial state.
- Filter sheet's Apply button set `hasSearched=true` even when no
  filter was active.

**Fix:** Removed the boolean. `hasActiveSearch` is now derived from the
real filter state — single source of truth, no drift possible.

### Finding 5 — No keyboard navigation in the location suggestion list (P2)

**Evidence:** The location dropdown was mouse-only. Up/down arrows
didn't highlight; Enter just submitted whatever was typed. Inaccessible
for keyboard users and clumsy for power users.

**Fix:**
- Arrow keys traverse the list with a highlighted item.
- Enter selects the highlighted item (or commits the typed text if
  nothing is highlighted).
- Escape collapses the dropdown.
- `role="combobox"` + `aria-autocomplete="list"` + `aria-controls` +
  `aria-activedescendant` on the input.
- `<ul role="listbox">` with `<li role="presentation">` wrappers and
  `role="option"` + `aria-selected` on the buttons.

### Finding 6 — No sort control (P1)

**Evidence:** Results were always sorted by proximity → Pro → rating,
with no user override. A seeker who wanted the highest-rated facility
regardless of distance had no path.

**Fix:** Sort `<Select>` in the results header with five options:
- Most relevant (default — proximity + Pro + rating)
- Highest rated
- Closest to me (forces proximity even if no other criteria favor it)
- Most recently added (by `year_established`)
- Name (A–Z)

URL-state persisted via `?sort=`.

---

## Other findings closed

### Finding 7 — Page didn't auto-clamp when filters shrank results (P2)

**Evidence:** Toggling a filter that reduced results below the current
page's range left the user on an empty page with no rows visible. They
had to manually click back.

**Fix:** `useEffect` clamps `currentPage` down to `totalPages` whenever
the filtered count changes.

### Finding 8 — `window.scrollTo` instead of container-scoped scroll (P2)

**Evidence:** Pagination jumps used `window.scrollTo({top:0})`. The
seeker shell has its own overflow container; the body scroll target
was wrong in some viewports.

**Fix:** `resultsTopRef` + `scrollIntoView({behavior:'smooth'})` —
container-scoped, correct regardless of where the scrolling viewport
lives.

### Finding 9 — Empty state was generic — no actionable suggestions (P2)

**Evidence:** "Try adjusting your search terms or filters" with a
single "Clear all" button. The user had no signal about WHICH filter
was likely the cause.

**Fix:** Contextual `<EmptyResults>`:
- Headline names the actual constraint ("Nothing matched 'detox' near
  Los Angeles, CA").
- Action buttons surface specifically: "Remove location" (when
  location is set), "Clear filters" (when ≥1 filter active), "Start
  over" (always).

### Finding 10 — Sticky search header had no z-index ceiling / shadow (P3)

**Evidence:** Scrolling pushed result cards behind the search header
in some breakpoints because the header was `position: static` and the
search input lost focus visibility under content.

**Fix:** `sticky top-0 z-30` on the header strip. Survives over the
list as the user scrolls — survives over autoSuggest dropdowns too
since they're `z-50`.

### Finding 11 — Filter sheet Apply button claimed "Apply Filters" without showing the count (P3)

**Evidence:** User couldn't see how many matches their selections
produced without closing the sheet first.

**Fix:** Apply button now reads "Show N results" — recomputed live
against `filteredFacilities.length` as the user toggles.

### Finding 12 — Dead imports / unused state (P3)

**Evidence:** `Clock` icon imported and never used; `useCallback`
imported but not needed.

**Fix:** Cleaned up.

---

## What was already correct (verified, no changes)

- **Data layer.** `useStaticFacilities` returns CDN-cached snapshot with
  proper error/refetch surface. Wired correctly here.
- **Proximity match.** `parseLocationInput` handles ZIP (5-digit, +4
  optional) and city/state. The filter and the sort both honor it.
- **Insurance / gender substring match.** Tolerates name variations
  ("Aetna" vs "Aetna PPO") via `includes`. Co-ed facilities pass the
  gender filter for everyone.
- **Pro-priority + rating tiebreaker** in the relevance sort (kept as
  the within-bucket order for every sort key).
- **Helmet noindex.** This is a private search surface.
- **`saved_searches` RLS.** Verified live: 4 policies, all scoped to
  `auth.uid() = user_id`. The Save dialog's RLS path is sound.
- **`saved_searches` realtime.** Already in `supabase_realtime` via
  migration `20260702000000`. New / deleted saved searches propagate
  across tabs.
- **`SaveSearchButton` itself.** Has correct dedup-by-URL via
  `findByUrl`, auth gate that redirects to `/login?returnTo=...`, and
  alert-frequency UX (off/daily/weekly).

---

## Files changed

```
MODIFIED:
  src/pages/seeker/SeekerSearch.tsx
    - Full URL-state coverage (q, loc, t, ft, ins, g, v, sort, p)
    - SaveSearchButton wired in results header
    - Recent saved searches surfaced in initial state
    - hasActiveSearch derived from state (drops drifting hasSearched bool)
    - Sort <Select> with 5 options
    - All filter dimensions chip-represented (was: 2/5)
    - Keyboard nav + ARIA combobox on location suggestions
    - Page auto-clamps when filtered results shrink
    - Container-scoped scrollIntoView (replaces window.scrollTo)
    - Contextual empty state with actionable buttons
    - Sticky search header (z-30) so sticky-on-scroll behavior works
    - Filter sheet Apply now reads "Show N results"
    - Dead imports removed

NEW:
  docs/seeker-search-hardening-2026-05-21.md
```

---

## Verification

- `npx tsc --noEmit` → clean
- `npx vitest run` → 128 passed, 5 skipped
- `npx vite build` → built successfully

---

## Behavioural guarantees

1. **Shareable / bookmarkable searches.** Every state dimension
   round-trips through the URL; refresh, back/forward, and external
   links all preserve the exact view.
2. **Saved searches actually save the right URL.** The button reads
   from the real URL — which now reflects the real search — so a
   re-applied saved search restores everything.
3. **No drifted "we searched" boolean.** `hasActiveSearch` is derived
   from filters; flipping a chip off correctly returns to the initial
   suggestions state.
4. **All filters are visible at a glance.** A stale insurance filter
   can't hide and confuse "why am I getting 0 results".
5. **Keyboard-accessible location pick.** Arrow keys, Enter, Escape
   all work; screen readers announce listbox state.
6. **Sort is honored.** Every sort key writes to URL and is restored
   on reload.
7. **Empty state names the constraint.** Buttons point to the likely
   fix instead of nuking everything.
8. **Pagination clamps to live result count.** No more "ghost page"
   showing zero rows because filters narrowed results.

---

## What was NOT changed (and why)

| Area | Decision | Rationale |
| --- | --- | --- |
| Header mobile-search icon → `/account/search` (no `?q=` carry-through) | Left as-is | The mobile icon is a "fresh search" affordance; there is no text input on the header for mobile. Desktop has its own search bar that already navigates to `/search-results` with `?q=`. |
| The treatment / facility / insurance filter LIST contents | Left as-is | The visible-filter values match the data shape's labels; expansion is out of scope. |
| Distance radius / "within N miles" UI | Left as-is | Proximity tiers (exact city, same state, near state, anywhere) are coded in `proximitySearch`; adding a slider would need a real radius value, not a tier. Out of scope. |
| Real-time results updates as the user types | Left as-is | The Search button is a deliberate commit — saves the user from a noisy results update on every keystroke. Sort/filter changes DO update immediately. |
| Map view | Out of scope | Real estate change. Would need Mapbox / Google Maps integration. |
