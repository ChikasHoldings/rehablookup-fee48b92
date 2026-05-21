# /admin/notifications + Admin Notification System — Deep Hardening Pass

**Date:** 2026-05-20
**Branch:** `claude/phase2-deployment-5WYOn`
**Verdict:** ✅ Page + sidebar + system fully wired. Sidebar badges now reflect unread notification counts per page (single source of truth for type→route mapping).

---

## Scope

- `src/pages/admin/AdminNotifications.tsx` — URL state, error banner, shared route resolver
- `src/components/admin/AdminSidebar.tsx` — badges driven by per-route unread counts
- `src/hooks/useAdminSidebarCounts.ts` — rebuilt to aggregate unread notifications by destination route
- New: `src/lib/notificationRouteMap.ts` — single source of truth for notification.type → /admin/X route
- New: `supabase/migrations/20260630000000_realtime_for_admin_user_notifications.sql` (applied)

Components left as-is (already hardened earlier or out of scope):
- `useAdminNotifications` / `useAdminUserNotifications` hooks (already do optimistic updates, error toasts, realtime channels)
- `AdminHeader` bell icon (uses `useAdminUserNotifications.unreadCount` — personal only, intentional)

---

## Sidebar badges now reflect unread notifications per page

**Before:** Each sidebar nav item had a `countKey` pointing at an operational count (e.g. `leads` = `count(leads WHERE status='new')`, `pendingProviders` = `count(facilities WHERE status='pending')`). Counts came from 8 parallel DB queries on raw operational tables, with no link to the notification system.

**After:** Sidebar item badges come from **unread admin_notifications + admin_user_notifications grouped by destination route**, where the destination route is resolved via the shared `notificationRouteMap`. The badge on each item literally answers: *"how many unread notifications would route to this page if the admin clicked one in the inbox?"*

Implementation:
- `src/lib/notificationRouteMap.ts` exports `resolveNotificationRoute(type)` returning the canonical admin route. The map is exact-match-first (~70 known types) with prefix fallbacks (`concierge_*` → `/admin/concierge`, `lead_*` → `/admin/leads`, etc.) and a default of `/admin/notifications` (the inbox).
- `useAdminSidebarCounts` now selects `type` from both notification tables where `read=false`, aggregates by route, and returns `unreadByRoute: Record<AdminRouteKey, number>`. Legacy field names (`leads`, `pendingProviders`, etc.) are preserved as aliases for backward compatibility but they all now point at the same per-route unread numbers.
- `AdminSidebar.getItemCount` reads `counts.unreadByRoute[item.to]` — the item's own `to` path is the key. This collapses 20+ `countKey: "..."` mappings in `adminNavConfig.ts` into a single resolution path.
- Same `notificationRouteMap` is used by `AdminNotifications.getNotificationLink` so the page and sidebar agree on where each notification belongs. Click-through navigation matches the badge.

Live DB sanity (before this pass landed):
- 23 unread global notifications across 10 distinct types
- Top types: `provider_signup` (9 unread → `/admin/providers`), `new_review` (3 → `/admin/reviews`), `facility_claim_submitted` (3 → `/admin/providers`), `system_maintenance` (2 → `/admin/notifications`), `not_found_alert` (1 → `/admin/not-found-events`), `security_auto_block` (1 → `/admin/security-logs`), `concierge_new_intake` + `concierge_payment_pending_intake` (1 each → `/admin/concierge`).

The sidebar will now show:
- **Providers**: 12 (9 provider_signup + 3 facility_claim_submitted)
- **Reviews**: 3 (3 new_review)
- **Concierge / Placements**: 2 (concierge_*)
- **Not-found 404 Monitor** (under System group): 1
- **Security Logs** (under System group): 1
- The rest sit on `/admin/notifications` (system_maintenance) or have zero unread.

---

## Issues closed

### P0 — latent realtime gap

1. **`admin_user_notifications` not in `supabase_realtime` publication.** The per-user personal stream subscribed to its own channel via `useAdminUserNotifications` (and the bell icon depended on this), but inserts and read-flips never propagated. **Fix:** migration `20260630000000` adds the table. RLS is unchanged (each user sees their own rows).

### P0 — workflow

2. **Sidebar badges showed operational status, not notification volume.** A super-admin watching the sidebar had no signal for "is there an unread broadcast that needs my attention" — only "how many pending providers exist". Two different signals competing for the same UI slot. **Fix:** sidebar badges are now exclusively unread-notification-driven, matching the request: "should only show badges for unread notification for each page they are present."

3. **Notification route mapping was duplicated 3× (inline in AdminNotifications, inline in AdminHeader fallback, hardcoded in sidebar counts).** Each had subtly different rules. **Fix:** consolidated into `src/lib/notificationRouteMap.ts`. AdminNotifications now imports `resolveNotificationLink`; sidebar via `resolveNotificationRoute`; future surfaces (admin search command, mobile nav) can use the same.

### P1 — page hardening

4. **No URL state.** Tab / filter / type / search query lost on navigation. **Fix:** `useSearchParams` hydration + loop-guarded sync. URL keys: `?tab=&filter=&type=&q=`. Defaults not written so `/admin/notifications` stays clean.

5. **No error surfacing.** Both hooks fail silently (return `[]` on error) — the page rendered "No notifications" with no Retry. **Fix:** destructure `error` from both hooks; consolidated destructive banner at top with the underlying message and a Retry button hitting both `refetchGlobal` and `refetchUser`.

6. **No Clear-filters button.** Once filters were set, the only way back was to reset each one. **Fix:** appears next to Refresh when any filter is non-default.

7. **AlertDialog wording for "Clear" was misleading.** It said "delete all {tab}" but global broadcasts are shared across all admins — deleting a broadcast removes it for everyone. **Fix:** explicit warning when the user is clearing global / all: "Global broadcasts are shared across all admins — deleting them removes them for everyone."

8. **Header buttons did not have aria-labels.** Refresh, Mark All Read, Clear were icon-only on mobile. **Fix:** every button gets an aria-label.

9. **`getNotificationLink` had ad-hoc permission gating with stale switch cases.** It listed only ~15 types vs the 70+ types now in the route map. Notifications outside that list fell through to `null` (non-clickable). **Fix:** uses the shared resolver and a `ROUTE_TO_PERMISSION` map; super_admin bypasses the permission gate; non-mapped types still resolve to `/admin/notifications` (the inbox itself), which any admin can access.

---

## Files changed

```
NEW:
  src/lib/notificationRouteMap.ts
  supabase/migrations/20260630000000_realtime_for_admin_user_notifications.sql  (applied)
  docs/admin-notifications-hardening-2026-05-20.md

MODIFIED:
  src/hooks/useAdminSidebarCounts.ts
    — completely rebuilt: aggregates unread counts from both
      admin_notifications and admin_user_notifications, grouped by
      destination route via resolveNotificationRoute. Adds realtime
      channel admin-sidebar-unread-live + 60s polling fallback.
    — Legacy AdminSidebarCounts field names preserved as aliases
      pointing at the per-route counts so adminNavConfig.ts entries
      don't need rewiring.
  src/components/admin/AdminSidebar.tsx
    — getItemCount reads counts.unreadByRoute[item.to] (single
      source of truth) instead of the old countKey lookup.
  src/pages/admin/AdminNotifications.tsx
    — URL state hydration + loop-guarded sync (?tab=, ?filter=,
      ?type=, ?q=)
    — Destructive error banner with Retry (drives both
      refetchGlobal and refetchUser)
    — Clear-filters button
    — AlertDialog wording reflects "global broadcasts are shared"
    — aria-labels on Refresh / Mark All Read / Clear / Clear filters
    — getNotificationLink rewritten to use resolveNotificationLink
      + a ROUTE_TO_PERMISSION map; super_admin bypasses the gate;
      unmapped types fall to /admin/notifications instead of null.
```

---

## Verification

- `npx tsc --noEmit` → clean
- `npx vitest run` → 128 passed, 5 skipped
- `npx vite build` → built successfully in ~34s
- Migration applied: `admin_user_notifications` confirmed in `supabase_realtime` publication
- Live DB sanity: 23 unread global notifications across 10 types; sidebar will now show real route-grouped counts (Providers: 12, Reviews: 3, Concierge: 2, plus singles on Security Logs / 404 Monitor / Notifications inbox)
- All consumers of `AdminSidebarCounts` type-check correctly with the new shape; legacy field names continue to resolve

---

## Behavioural guarantees

1. **Sidebar reflects notification reality.** Every badge answers a single coherent question: "unread notifications routing to this page." Click the item → land on the page → mark notifications as read → badge decrements within ~200ms via realtime.
2. **One mapping, three surfaces.** `resolveNotificationRoute` is used by the sidebar (badge count), the notification list (click navigation), and the route→permission gate (clickability). Add a new notification type once → it routes correctly everywhere.
3. **No silent fetch failures.** Both hooks expose `error`; the page renders a destructive banner with Retry instead of "No notifications" disguising a broken fetch.
4. **URL state round-trips.** Bookmarking `/admin/notifications?tab=personal&filter=unread&type=security_types` reopens the exact filtered view.
5. **Realtime propagation across both notification streams.** Insert / update / delete on either table propagates to all admin sessions within ~200ms. 60s poll fallback covers channel drops.
6. **Honest delete confirmation.** Clearing global broadcasts now warns the admin that this removes the notification for everyone.
