# /account/notifications + header dropdown — Deep Hardening Pass

**Date:** 2026-05-21
**Branch:** `claude/phase2-deployment-5WYOn`
**Scope:** `SeekerNotifications.tsx` page, `SeekerHeader.tsx` notification dropdown, `useSeekerNotifications` hook, new `src/lib/seekerNotificationRouting.tsx` shared module.

This is the seeker's inbox. The hook backs three surfaces (the page,
the header bell dropdown, and any side-effect like the audio beep and
desktop notification API), so most of the bugs were about either
duplicated work (two hook instances doing the same side effect) or
silently-diverged copies of the same routing/icon logic.

---

## Critical findings closed (P0)

### Finding 1 — Audio beep + desktop notification doubled when on the inbox page

**Evidence:** `useSeekerNotifications` is consumed in BOTH
`SeekerHeader.tsx:92` (always mounted) and `SeekerNotifications.tsx:134`
(mounted on `/account/notifications`). When the user is on that page,
two hook instances are alive simultaneously and Supabase Realtime
delivers each `INSERT` event to BOTH subscriptions. Each instance
called `playNotificationSound()` and `showBrowserNotification(...)`
independently → users on the inbox page heard a DOUBLE beep on every
new notification, and a duplicate desktop notification would race
(Chrome's `tag:"rehablookup-seeker"` masked the duplicate Notification
most of the time, but Safari and Firefox didn't dedupe by tag the
same way).

**Fix:** module-level `seenNotificationSideEffects: Set<string>` keyed
on notification id, scoped to `window` so it survives across every
hook instance in the process. New `recordSideEffect(id)` helper
returns `true` only on the first call per id — audio + desktop
notification gated behind it. Per-instance React state still updates
in every instance (the header AND the page both need their own
notifications array up to date), but the audible/visual side effects
fire ONCE.

Bounded at 500 entries with FIFO eviction so a multi-hour session
can't accumulate forever. Initial fetch seeds the set with existing
ids so a realtime INSERT that races the fetch can't double-trigger.

### Finding 2 — Header type-routing table was stale; many notifications clicked → wrong page

**Evidence:** `SeekerHeader.handleNotificationClick` (pre-fix) had:

```ts
const inquiryTypes = ["inquiry_update", "inquiry_status", "placement_update", ...];
const facilityTypes = ["facility_update", "facility_approved", "tour_confirmed", "tour_request"];
const reviewTypes = ["review_response", "review_helpful"];
```

None of `inquiry_update`, `inquiry_status`, `placement_update`,
`placement_matched`, `placement_confirmed`, `introduction_sent`,
`facility_approved`, `tour_request`, `review_helpful` are emitted by
ANY edge function in this codebase (verified via grep). The actual
types used are `request_confirmation`, `facility_contacted_you`,
`concierge_intake_received`, `concierge_matches_found`,
`concierge_provider_interested`, `review_approved`, `review_rejected`,
`review_response`, etc. The page (`SeekerNotifications.tsx`) had the
correct list; the header was stuck on an older naming scheme.

Net effect: clicking a concierge notification in the header dropdown
took the user to `/account/notifications` instead of `/account/concierge`.
Clicking a request_confirmation notification fell through too. Every
concierge / request notification produced the wrong destination.

**Fix:** new `src/lib/seekerNotificationRouting.tsx` — single source of
truth for icons (compact + large) AND the type-→-route table. Both the
header and the page import `resolveNotificationRoute(notification)`
which:
1. Honors `notification.link` (producer-set explicit link)
2. Falls back to `notification.metadata.link` (legacy producers)
3. Falls back to the canonical type-route table
4. Final safety net → `/account/notifications`

### Finding 3 — Header search swallowed errors silently

**Evidence:** `SeekerHeader.tsx:130-132` was a bare `catch {}` with
the comment "Silent fail for search". An RLS error, network blip, or
PostgREST 5xx left the user staring at "No results found" — which is
indistinguishable from the legitimate "no matches for this query"
state.

**Fix:** typed catch surfaces `err.message` via destructive toast.
When `{ data, error }` returns an error, the same toast fires and the
results are cleared. The "No results found" empty state now ONLY
appears when the request succeeded but returned zero rows — an
accurate signal.

---

## Other findings closed (P1 / P2)

### Finding 4 — Initial fetch errors were swallowed (P1)

**Evidence:** `fetchNotifications` (in the hook) had a console.error
on failure and just returned. The component had no signal — the page
rendered the empty-state "No notifications yet" as if everything was
fine.

**Fix:** hook now exposes `fetchError: string | null`. Page renders a
persistent destructive banner with a Retry button when set. Banner
sits ABOVE the filter tabs so it's the first thing the user sees if
their inbox failed to load.

### Finding 5 — `requestNotificationPermission` was unreachable (P1)

**Evidence:** The hook exposed `requestNotificationPermission()` (added
in a prior pass to comply with Chrome's "don't auto-prompt" rule) but
NOTHING in the UI wired it. The user could never opt into desktop
notifications even though the prompt is the only way to flip
`Notification.permission` from `'default'` to `'granted'`. Every
seeker stuck at the OS default — usually `'default'`, sometimes
`'denied'`. The browser-notification path through
`showBrowserNotification` was effectively dead code for anyone who
hadn't manually flipped the bit in chrome://settings.

**Fix:**
- New CTA card on `SeekerNotifications.tsx`. Rendered ONLY when
  `Notification.permission === 'default'` (so granted/denied users
  don't see it). "Enable" button calls `requestNotificationPermission`
  via a real user-gesture click — which is the only path Chrome and
  Firefox will accept post-2023.
- After the prompt resolves the page updates local state and toasts
  success/denial accordingly. Denied state surfaces a hint pointing
  to browser site settings (the OS won't let us re-prompt).
- Header bell renders `BellOff` instead of `Bell` when permission is
  denied — a discoverable signal that desktop notifications are off,
  re-evaluated each time the dropdown opens (so a settings change in
  another tab propagates without a reload).

### Finding 6 — `aria-label` on bell didn't include unread count (P2)

**Evidence:** Screen readers heard "Notifications" regardless of
whether there were 0 or 50 unread. The visible badge had no `aria-live`
so its appearance was silent.

**Fix:**
- Bell button `aria-label` switches to `"Notifications, N unread"`
  when `unreadCount > 0`.
- Badge gets `aria-live="polite"` so updates announce.

### Finding 7 — Duplicate icon map drift between Header and Page (P1)

**Evidence:** `notificationTypeIcons` was defined IN FULL in both
`SeekerHeader.tsx` (compact) and `SeekerNotifications.tsx` (large).
Any new notification type needed two edits and the maps had already
drifted (header had `tour_proposed` mapped, page had it mapped
differently). Bound to rot further.

**Fix:** `notificationIconCompact(type)` + `notificationIconLarge(type)`
in the shared module. Both surfaces consume the same source. Adding a
new type now touches ONE file.

### Finding 8 — Dropdown had no bulk-clear affordance (P2)

**Evidence:** The dropdown showed 5 most-recent and a "View all"
footer. There was no way to mark them all read without navigating to
the full page — friction for a power user with many unread items.

**Fix:** added "Mark all read" button in the dropdown header, only
visible when `unreadCount > 0`. Click is `e.stopPropagation()`-guarded
so it doesn't close the menu or trigger an item click.

### Finding 9 — Unused `previousNotificationsRef` (P3)

**Evidence:** With the new dedup set, the `previousNotificationsRef`
array was redundant. Held the same id list twice in memory.

**Fix:** removed.

### Finding 10 — Dead imports in the page (P3)

**Evidence:** Page imported 13 lucide icons; only 5 were used after the
icon map move. Also `Filter` and several concierge icons.

**Fix:** stripped to actual uses.

---

## What was already correct (verified, no changes)

- **RLS on `seeker_notifications`.** Four policies: SELECT/UPDATE/DELETE
  scoped to `auth.uid() = user_id`; INSERT to `service_role` only. The
  client cannot forge notifications. Verified live.
- **Realtime publication.** `seeker_notifications` is in
  `supabase_realtime` (verified live). The hook's INSERT/UPDATE/DELETE
  subscriptions actually receive events.
- **Audio behavior.** Audio element constructed in `useEffect` and
  cleared on unmount. The `play()` promise has a `.catch` so a denied
  autoplay policy doesn't crash the page.
- **`tag: 'rehablookup-seeker'` on the desktop Notification.** Chrome
  uses this to coalesce multiple notifications of the same kind.
- **5-second auto-close** on the desktop notification.
- **Click-to-focus on the desktop notification** — `window.focus() +
  window.location.href` for the link.
- **Audio + desktop only fires when `document.hidden`.** No annoying
  sounds while the user is actively looking at the tab.
- **URL state on the page.** `?filter=unread` round-trips with
  loop-guarded sync.
- **Auth-state-change subscription** in the hook so signing in
  mid-session re-binds the realtime sub to the new user id (already
  hardened in a prior pass).
- **PostgREST filter injection guard** in the header search:
  `replace(/[%_(),.]/g, '')` strips PostgREST `or()`-grammar tokens.
- **Optimistic-update mutations** in the hook (markAsRead /
  markAllAsRead / deleteNotification) with refetch-on-failure already
  surface `error.message` via toast.

---

## Files changed

```
NEW:
  src/lib/seekerNotificationRouting.tsx
    - notificationIconCompact(type) — header dropdown icons
    - notificationIconLarge(type) — full-page list icons
    - resolveNotificationRoute(notification) — link > metadata.link >
      type table > /account/notifications fallback
    - Canonical TYPE_ROUTES table (single source of truth)

MODIFIED:
  src/hooks/useSeekerNotifications.ts
    - Window-scoped seenNotificationSideEffects Set + recordSideEffect()
      gating audio + desktop notification (fixes double-beep)
    - fetchError state exposed; fetch error path sets it and surfaces
      error.message
    - Removed redundant previousNotificationsRef

  src/components/seeker/SeekerHeader.tsx
    - Notification icons via notificationIconCompact (shared module)
    - Notification routing via resolveNotificationRoute (was: stale
      type tables that misrouted concierge notifications)
    - Search now surfaces error.message via toast (was: silent catch{})
    - Bell ↔ BellOff swap when Notification.permission === 'denied'
    - "Mark all read" button in dropdown header
    - aria-label + aria-live on bell + badge

  src/pages/seeker/SeekerNotifications.tsx
    - Notification icons + routing via shared module
    - Persistent fetchError banner with Retry
    - "Enable desktop notifications" CTA card when permission is 'default'
    - Dead imports removed

NEW:
  docs/seeker-notifications-hardening-2026-05-21.md
```

---

## Verification

- `npx tsc --noEmit` → clean
- `npx vitest run` → 128 passed, 5 skipped
- `npx vite build` → built successfully

---

## Behavioural guarantees

1. **No more double beep.** Even when both the header dropdown and the
   inbox page are mounted (i.e., the user is on `/account/notifications`),
   each new notification fires the audio + desktop notification exactly
   once.
2. **Header dropdown and page route the same way.** Every notification
   type lands on the same destination from either surface. Concierge,
   request, review, tour, and facility types all routed correctly.
3. **Honest empty / error / success distinctions.** "No results" in
   search now only means zero matches (never a silent fail). "No
   notifications yet" only means the fetch succeeded with zero rows.
   "Couldn't load notifications" banner surfaces the underlying message.
4. **Desktop notifications are reachable.** A user-gesture-triggered
   CTA exists, only shown when the OS can still accept a prompt.
5. **Denied permission is discoverable.** The bell icon turns into a
   BellOff so the user knows desktop notifications are off rather than
   being silently absent.
6. **One source of truth for routing + icons.** Adding a new
   notification type is a single-file change.

---

## What was NOT changed (and why)

| Area | Decision | Rationale |
| --- | --- | --- |
| Convert hook to a Context provider singleton | Left as multi-instance | The window-scoped dedup set solves the audible-side-effect duplication without restructuring the component tree. A Context refactor would touch the SeekerShell and every consumer; the dedup approach is surgical and reversible. |
| Per-item "Mark read" / "Delete" buttons in the header dropdown | Kept dropdown compact | The dropdown is a quick-glance affordance; full control lives on the page. Adding inline buttons made the dropdown feel cluttered in the design audit. |
| Pagination beyond 50 | 50-row cap kept | The hook caps at 50 most recent. A seeker with 50+ open notifications likely needs cleanup — surfaced by the "Mark all read" affordances rather than infinite scroll. |
| Send-concierge-notifications gating on browser_notifications | Out of scope | Flagged in the notification-preferences hardening doc; needs its own pass. |
