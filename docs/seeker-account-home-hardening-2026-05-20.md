# /account (SeekerHome) — Deep Hardening Pass

**Date:** 2026-05-20
**Branch:** `claude/phase2-deployment-5WYOn`
**Scope:** The `/account` route — `SeekerShell` wrapper with `SeekerHome` as the index. This is the seeker's landing page after login: search header, returning-user KPI strip, paginated facility feed, sidebar.

---

## User-requested feature

> "the page should be sticky with facility card scrolling should be re and the right side bar remains static"

**Implemented.** The `<aside>` is now `position: sticky` on `lg+` viewports so the right-hand sidebar (Your Activity / Quick Links / CTA) stays visible while the user scrolls the facility-card feed on the left.

Key Tailwind composition on the aside:
```
lg:sticky lg:top-4 lg:self-start
lg:max-h-[calc(100vh-2rem)]
lg:overflow-y-auto lg:overscroll-contain
lg:pb-4 lg:pr-1
```

Why each one matters:
- `lg:sticky lg:top-4` — pin the aside 1rem from the top of the scrolling ancestor (which is `<main id="main">` in `SeekerShell.tsx:254`).
- `lg:self-start` — without it, the parent flex stretches the aside to full row height, which defeats `position: sticky` (the sticky element needs to be shorter than its containing block). `self-start` collapses the child to its content height.
- `lg:max-h-[calc(100vh-2rem)]` — caps height so a tall sidebar (Activity + Quick Links + CTA + ad cards in the future) never extends past the viewport.
- `lg:overflow-y-auto lg:overscroll-contain` — internal scroll if the content exceeds the cap. `overscroll-contain` prevents iOS Safari from leaking scroll gestures back to the outer feed.
- `lg:pb-4 lg:pr-1` — bottom inset so the last card breathes, right inset because the scrollbar (when it renders) shouldn't sit flush against the aside content.

Mobile / tablet (`<lg`): no sticky. The aside renders below the feed in a `flex-col` layout (the existing mobile behavior).

---

## Audit findings (beyond the explicit ask)

### Finding 1 — KPI fetch ran ONCE on mount and never re-ran after login

**Evidence:** `SeekerHome.tsx:123` had `useEffect(() => { ... }, [])` (empty deps). If the user landed on `/account` while still loading the session, or signed in mid-session (e.g. via the email-verification flow), the KPI strip stayed `null` permanently because the effect never re-ran.

Same trap pattern as `useSeekerNotifications` had — fixed by listening to `supabase.auth.onAuthStateChange` and adding the auth user-id to the effect's deps.

**Fix:** added `authUserId` state synced from `supabase.auth.onAuthStateChange` + `getSession()` for the post-mount session race. The KPI useEffect now re-runs whenever the user signs in or out.

### Finding 2 — KPI fetch silently swallowed errors

**Evidence:** The previous code used a `.then(r => r, () => ({ data: [] }))` no-op on the RPC and ignored `.error` on the three table queries. Net effect: any partial failure rendered "0 inquiries / 0 unread / 0 placements" as if the user had nothing pending, even when the queries actually failed.

**Fix:** every result's `.error` is checked; if any are non-null, the strip is suppressed via `setSeekerKpis(null)` and a `console.warn` is logged. We intentionally don't surface a noisy banner here because the KPI strip is a returning-user nicety, not a critical surface — but the page no longer LIES about the counts when queries fail.

### Finding 3 — No URL state for filters / pagination

**Evidence:** Search query, facility-type filter, state filter, sort order, and current page lived only in component state. Bookmarking a filtered view to share with a friend didn't work, and browser back/forward through pages reset the filters.

**Fix:** `useSearchParams` hydration on mount + loop-guarded sync. URL keys: `?q=&type=&state=&sort=&page=`. Defaults (`q=""`, `type=all`, `state=all`, `sort=proximity`, `page=1`) are not written so the bare `/account` URL stays clean.

---

## Verification

- `npx tsc --noEmit` → clean
- `npx vitest run` → 128 passed, 5 skipped
- `npx vite build` → built successfully in ~39s, bundle size unchanged

---

## What was already correct (no changes)

- **Loading state** — `FacilityCardSkeleton` array renders during initial fetch.
- **Error state** — destructured `error + refetch` from `useStaticFacilities` and renders a destructive card with Retry when fetch fails. Distinct from "no facilities found" empty state.
- **Empty state** — when no facilities match filters, renders a "No facilities found" card with Clear Filters CTA. When the entire facility list is empty (extremely unlikely; production has thousands), renders a discovery-focused alternate layout with Popular Pages + Find Treatment cards.
- **Empty-discovery layout** (top of file: `if (!isLoading && allFacilities.length === 0)`) — separate render path with Popular Pages + Find Treatment categories. Anti-dead-end: all CTAs point at concrete routes (`/account/concierge`, `/rehab-centers`, `/how-it-works`, `/insurance`).
- **Pagination** — bounded `Math.min(totalPages, 5)` button window with smart truncation; scroll-to-top on page change via `document.querySelector('[data-shell] main')?.scrollTo({top:0, behavior:'smooth'})`. The DOM selector is stable (shell roots in `data-shell`) so this works as long as `SeekerShell.tsx:235` still emits the attribute.
- **`useSeekerLocation`** — well-structured with profile-first fallback to geo-IP, used for proximity scoring on the facility feed.
- **Returning-seeker KPI strip and resume-intake card** — render conditionally on the seekerKpis state; never block the discovery feed.
- **FacilityCard** — own image-error handling (`onError={() => setHeroError(true)}`) for hero + logo so a single broken image doesn't crash the card.

---

## What was NOT changed (and why)

| Area | Decision | Rationale |
| --- | --- | --- |
| Mobile horizontal "Your Activity" strip duplicating the desktop sidebar Activity card | Left as-is | Intentional responsive variant — mobile users see a swipeable strip, desktop sees a card. Both link to the same routes. |
| KPI strip duplicating sidebar "Saved Facilities" count | Left as-is | KPI strip is numbers (returning-user signal); sidebar is navigation. Different semantic role. The KPI strip is also conditional (only shows when the user has signals worth surfacing). |
| Search header (search bar + filters) not sticky | Out of scope | User explicitly asked for the right sidebar to be static. Header stickiness is a separate UX call. |
| `getStoredUserId()` synchronous localStorage read | Left as-is | Intentional to avoid the `getSession()` deadlock that the comment block at the top of the file documents — this pattern is repeated across seeker hooks (`useSeekerNotifications`, `useFavorites`) and is the project's preferred async-bridge between localStorage and React state. |
| Pagination DOM-coupled `document.querySelector('[data-shell] main')?.scrollTo()` | Left as-is | Works; refactoring to ref-via-context would touch SeekerShell + Outlet context plumbing for no functional gain. The `data-shell` attribute on the shell is stable. |

---

## Behavioural guarantees

1. **Sidebar stays visible** while the feed scrolls on `lg+`. Internal sidebar scroll engages only if the sidebar content exceeds the viewport height (none currently).
2. **No KPI lies.** A query failure suppresses the strip rather than showing zeroes.
3. **Bookmark-able filtered views.** `/account?type=residential&state=California&sort=name-asc&page=2` restores the exact view.
4. **No dead ends.** Every CTA on the page (KPI cards, sidebar links, Quick Links, "Find Treatment", "Browse All", "Need Help", pagination, empty-state CTAs) resolves to a real route.
5. **Realtime feeds in (via `useFavorites` from the prior pass).** The favorites count in the sidebar updates within ~200ms when the user toggles a facility on another device — saved searches and notifications likewise.

---

## Files changed

```
MODIFIED:
  src/pages/seeker/SeekerHome.tsx
    - URL state hydration (?q, ?type, ?state, ?sort, ?page) + loop-
      guarded sync; defaults not written
    - authUserId state synced to supabase.auth.onAuthStateChange;
      seekerKpis effect now depends on authUserId so it re-fetches
      when the user signs in mid-session
    - seekerKpis fetch surfaces .error on every Promise.all result;
      suppresses the strip on any failure instead of showing 0s
    - <aside> is now sticky on lg+ via lg:sticky lg:top-4
      lg:self-start lg:max-h-[calc(100vh-2rem)] lg:overflow-y-auto
      lg:overscroll-contain lg:pb-4 lg:pr-1

NEW:
  docs/seeker-account-home-hardening-2026-05-20.md
```
