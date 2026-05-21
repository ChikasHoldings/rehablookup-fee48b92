# /admin/escalations — Deep Hardening Pass

**Date:** 2026-05-20
**Branch:** `claude/phase2-deployment-5WYOn`
**Verdict:** ✅ Frontend + backend complete, mobile-responsive, fully hardened. Same standard as `/admin/leads`, `/admin/providers`, `/admin/seekers`, `/admin/concierge`, `/admin/subscriptions`, `/admin/support`, `/admin/reviews`.

---

## Issues closed

### P0 — latent runtime bugs

1. **`admin_escalations` not in `supabase_realtime` publication.** Neither the page nor `EscalationsList` was even subscribing to the table, but if any future hardening added a channel it would have been silently dead just like `/admin/reviews`. **Fix:** migration `20260622000000_escalations_realtime_and_notify.sql` adds the table to the publication (idempotent).

2. **No realtime channel subscription anywhere in the page.** The list relied entirely on `useQuery` cache invalidation triggered by the local mutation hook — if any other admin filed/updated an escalation from another browser, this admin would never see it until they manually refreshed. **Fix:** added `admin-escalations-live` channel in `EscalationsList` with the same INSERT/UPDATE/DELETE → invalidate pattern as the other surfaces. 30s polling fallback layered on top.

3. **No notification fan-out when a new escalation is filed.** The bell-menu (`admin_user_notifications`) didn't receive an entry when an escalation was created. Managers and super-admins relying on the bell to triage urgent escalations got nothing — they had to be physically looking at the dashboard or running the bookmarked URL. **Fix:** new `notify_admins_on_escalation_insert` trigger on `admin_escalations` that fans out an `admin_user_notifications` row to every active super_admin + manager (excluding the creator) with `link=/admin/escalations?id=<uuid>` so the bell-menu deep-links straight to the row.

### P1 — workflow gaps

4. **No URL-state.** Filters (status / priority / search / view mode) lived only in component state. Admins couldn't bookmark or share filtered views. **Fix:** `useSearchParams` hydration on mount + loop-guarded sync (`?status=…&priority=…&q=…&view=…&id=…`). Defaults not written to URL.

5. **No bulk operations + no admin-gated edge function.** Single-action transitions only. **Fix:** new `admin-bulk-update-escalations` edge function (deployed v1) — action dispatcher (`update_status | update_priority | assign | delete`), 100-row cap, defense-in-depth role tier check (`super_admin + manager` only, with `super_admin`-only for delete), per-row `admin_audit_log` entry, partial-success summary, mirrors the same `ALLOWED_TRANSITIONS` map as the single-row `useEscalationTransition` hook so behavior stays consistent across surfaces. Plus auto-promote `open → in_progress` on first assignment + stamp/clear `resolved_at` matching the single-row hook. New `BulkEscalationActionDialog` routes the 4 actions through one UI.

6. **No CSV export.** Other admin surfaces all have one. **Fix:** 13-column CSV export. Pulls directly from the DB (up to 2000 rows) with the same filter predicates applied — admins can export beyond the 200-row visible cap.

7. **No `isFetching` indicator.** **Fix:** "Refreshing…" with `Loader2` + `aria-live="polite"` in `EscalationsList` when fetching but not initial-loading.

8. **No deep-link from notifications.** The new bell-menu notifications include `link=/admin/escalations?id=<uuid>`, but the page didn't open the detail sheet for that ID. **Fix:** `AdminEscalations` reads `?id=…` on mount and passes it to `EscalationsList`; the list auto-opens the matching row in `EscalationDetailSheet` when the row arrives in the query result. `onInitialOpenConsumed` clears the URL param so refreshing doesn't re-trigger the open.

9. **`adminNames` query silently swallowed errors.** Same shape as reviews — if the lookup failed, every row rendered with "Admin" placeholder. **Fix:** added `if (error) throw` on the lookup.

10. **`EscalationDialog.createMutation` cast priority `as any`.** Lost type safety + would silently accept invalid priorities. **Fix:** typed cast to the literal union. Plus added trim-and-required checks for `subject` + `description` in the mutationFn (was passing empty strings if a user submitted with whitespace-only inputs).

### P2 — UX/a11y polish

11. **Copy-link + Clear-filters buttons** when filters are active.
12. **Manual Refresh** button in the header — invalidates both list + counts queries.
13. **KPI cards now show "—" when counts query hasn't returned** instead of "0".
14. **SLA badge on every active escalation** — tighter SLA for critical priority (4h amber / 24h red); default 24h amber / 7d red.
15. **Selection-drift cleanup happens at the parent** via `setSelectedIds` after a successful bulk action. The list's internal selection state is sourced from the parent so it stays in sync with filter changes.
16. **Char counters** on `EscalationDialog` subject + description, `BulkEscalationActionDialog` resolution notes + audit reason, `EscalationsList` inline resolve textarea — all clamped via `.slice(0, max)` in onChange so the limit applies on paste, not just typing.
17. **A11y** — every checkbox, button, tab trigger, row button got `aria-label`. Row buttons got `focus-visible:ring`. KPI buttons get `aria-pressed`.
18. **Mobile responsiveness** — the status-tab strip now wraps in `overflow-x-auto`. The header action row uses `flex-wrap`. Compact view rows have their action buttons gated by `canModerate` so customer_rep users don't see clutter.

---

## New backend

### `admin-bulk-update-escalations` v1 (deployed)

| action          | extra payload                                  | behavior                                                                                                                                                                                                                                |
| --------------- | ---------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| update_status   | `newStatus` ∈ {open, in_progress, resolved, closed}, optional `resolutionNotes` | Validates the same `ALLOWED_TRANSITIONS` map as the single-row hook — invalid hops (e.g. `closed → resolved`) error per row, batch continues. Stamps `resolved_at` on resolved; clears it on reopen. Applies `resolution_notes` only when transitioning to resolved. |
| update_priority | `newPriority` ∈ {low, medium, high, critical}  | Skips no-ops as `skipped`.                                                                                                                                                                                                              |
| assign          | `assigneeId` (UUID or null/empty)             | Verifies assignee is `active` and has `admin_role IN (super_admin, manager)`. Auto-promotes `open → in_progress` on first assignment.                                                                                                  |
| delete          | (no extra)                                     | **Super-admin only.** Straight delete (no FK children currently).                                                                                                                                                                       |

Gating: JWT → `has_role(_user_id, 'admin')` → `admin_user_profiles.admin_role IN ('super_admin', 'manager')` → (for delete) `admin_role = 'super_admin'`. Defense-in-depth — even if a customer_rep token reaches the endpoint, the role tier check blocks the action. Per-row `admin_audit_log` entry with action-specific `action_type` (e.g. `escalation_bulk_status_update`).

Function ID: `bbca7dfd-893c-4b8b-ab4c-cb54a9ca5358`

### Migration `20260622000000_escalations_realtime_and_notify.sql`

Three idempotent changes (all applied to the live project):
1. `ALTER PUBLICATION supabase_realtime ADD TABLE public.admin_escalations`
2. `CREATE OR REPLACE FUNCTION public.notify_admins_on_escalation_insert()` — SECURITY DEFINER, fans out per-recipient rows to `admin_user_notifications` for every active super_admin + manager (excluding the creator), with `link='/admin/escalations?id=<uuid>'` so the bell-menu deep-links straight to the row.
3. `CREATE TRIGGER trg_notify_admins_on_escalation_insert AFTER INSERT ON public.admin_escalations`

---

## Files changed

```
NEW:
  src/components/admin/escalations/BulkEscalationActionDialog.tsx
  supabase/functions/admin-bulk-update-escalations/index.ts          (deployed v1)
  supabase/migrations/20260622000000_escalations_realtime_and_notify.sql  (applied)
  docs/admin-escalations-hardening-2026-05-20.md

MODIFIED:
  src/pages/admin/AdminEscalations.tsx
    — URL-state, bulk actions header row, deep-link consumption,
      CSV export, copy-link, clear-filters, refresh, KPI loading state
  src/components/admin/escalations/EscalationsList.tsx
    — realtime channel + 30s poll fallback, isFetching indicator,
      per-row Checkbox, select-all-on-page, deep-link auto-open,
      SLA badge per row, focus rings, aria-labels, lookup error throw
  src/components/admin/escalations/EscalationDialog.tsx
    — typed priority cast, trim+required validation, char counters,
      escalation-counts invalidation on create
```

---

## Verification

- `npx tsc --noEmit` → clean
- `npx vitest run` → 128 passed, 5 skipped
- `npx vite build` → built successfully in ~42s
- Edge function deployed: `admin-bulk-update-escalations` v1 (id `bbca7dfd-893c-4b8b-ab4c-cb54a9ca5358`) — ACTIVE
- Migration applied: `admin_escalations` confirmed in `supabase_realtime` publication; trigger `trg_notify_admins_on_escalation_insert` confirmed via `pg_trigger` lookup

---

## Behavioural guarantees

1. **Realtime actually works.** INSERT/UPDATE/DELETE on `admin_escalations` propagate to the dashboard via the new channel. 30s poll fallback covers channel drops.
2. **The bell-menu surfaces new escalations.** Managers + super_admins each get an `admin_user_notifications` row with a deep-link straight to the new escalation.
3. **Bulk + single-action parity.** The edge fn mirrors the same `ALLOWED_TRANSITIONS` graph as `useEscalationTransition`, stamps `resolved_at`/clears on reopen, and auto-promotes `open → in_progress` on assignment — same shape as the single-row hook.
4. **Defense in depth on bulk mutations.** JWT → has_role → admin_role tier check (super_admin + manager) → (delete only) super_admin gate. Customer_rep tokens that bypass the UI still bounce off the edge fn.
5. **URL-state round-trips.** Bookmarking `/admin/escalations?status=in_progress&priority=critical&q=outage&view=compact` reopens the exact filtered view.
6. **Deep-link from notifications opens the right row.** Clicking a bell-menu notification with `link=/admin/escalations?id=<uuid>` lands the admin on the page and auto-opens the detail sheet for that row.
7. **No silent failures.** All edge-fn invokes check both `error` and `data?.error`; every mutation `onError` surfaces the real error message; the admin-name lookup throws so the list shows a real error state instead of fallback "Admin" placeholders.
