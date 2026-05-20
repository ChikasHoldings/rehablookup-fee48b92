# /admin/support — Deep Hardening Pass

**Date:** 2026-05-20
**Branch:** `claude/phase2-deployment-5WYOn`
**Verdict:** ✅ Frontend + backend complete, mobile-responsive, fully hardened. Same standard as `/admin/leads`, `/admin/insurance-verifications`, `/admin/providers`, `/admin/seekers`, `/admin/concierge`, `/admin/subscriptions`.

---

## Issues closed

### P0 — broken feature

1. **Assignee filter only showed "All" + "Unassigned"** (`AdminSupport.tsx`) — the dropdown listed two static options and was missing the actual admin-staff list. An admin who wanted to see "tickets assigned to Sarah" had no path. **Fix:** added a `useQuery(["admin-support-staff"])` that fetches active admins from `admin_user_profiles` and renders every one as a `<SelectItem>` in the filter dropdown.

### P1 — workflow gaps

2. **No URL-state for filters** — search, status, source, assignee all lived in component state. Admins couldn't bookmark or share a filtered view. **Fix:** `useSearchParams` hydration on mount + loop-guarded `setSearchParams({ replace: true })` sync. Mirrors the pattern from every other hardened admin surface.

3. **No realtime channel on `support_tickets`** — list waited on initial query + post-mutation invalidations. New tickets didn't appear live. **Fix:** added `admin-support-live` channel subscribing to INSERT / UPDATE / DELETE on `support_tickets`. 30s poll layered as fallback. Verified that `support_tickets` is in the `supabase_realtime` publication before deploy.

4. **KPI cards reflected the FILTERED view** — filtering to "new" made the "Total" card = New count. Misleading. **Fix:** new `["admin-support-global-counts"]` query runs 6 `count: "exact", head: true` lookups (one per status + total) and feeds the KPI strip. The status-tab labels still use in-view counts (those are explicitly per-filter).

5. **Only bulk-delete; no bulk status / priority / assign** — every other admin surface has a full bulk-action set, plus admin-gated edge functions with audit + partial-success. **Fix:** new `admin-bulk-update-support-tickets` edge function (deployed v1) handles all four actions in a single dispatcher; new `BulkSupportTicketActionDialog` component routes between them; AdminSupport renders 4 action buttons when ≥1 row is selected. The old client-only bulk-delete path is gone (now routes through the edge fn so deletions get audited).

6. **`useAssignSupportTicket` had a fetch-then-write race** — read status, then update. Concurrent changes between the two could flip the auto-promote logic. **Fix:** swapped to an atomic conditional update — `.update({ status: "open" }).eq("status", "new")` only fires on tickets actually in `new`. If a concurrent writer changed the status, the conditional update no-ops and the unconditional assignment below applies. Same effect, no race.

7. **`handleEscalateToManager` two-step had no partial-state handling** — escalation row insert + ticket status update. If the second failed silently, the escalation existed but the ticket still showed "new". **Fix:** the second mutation is now wrapped in a Promise-based await so failures surface a `toast.warning("Escalated, but couldn't update ticket status: …")` instead of the original generic success toast.

8. **`handleDelete` silent notes-delete failure** — the notes delete was `await`ed but its error was ignored; only the ticket delete error was thrown. A note with a constraint violation could leave a half-deleted state and surface as a generic "Failed to delete ticket" with no diagnostic. **Fix:** notes-delete error is now thrown with a labeled message; the toast surfaces the actual failure reason.

### P2 — UX/a11y polish

9. **No background-refetch indicator** — admins couldn't tell if the list was being refreshed. **Fix:** "Refreshing…" with `Loader2` spinner + `aria-live="polite"` shown above the list when `isFetching && !isLoading`. Mirrors the pattern from prior surfaces.

10. **No copy-link affordance for filtered views.** **Fix:** Copy-link button (visible only when filters are active) with clipboard + `execCommand` fallback for insecure contexts. Toast feedback on success/failure.

11. **No SLA badge on rows** — admins couldn't see aging tickets at a glance. **Fix:** `ticketSlaBadge()` helper renders an amber badge for 24-48h tickets and a red one for ≥48h. Skipped for `resolved` / `closed`. Same visual pattern as `/admin/concierge` and `/admin/providers`.

12. **Selection drift** — selected ticket IDs that dropped out of the filtered view would still be sent to bulk operations. **Fix:** effect that prunes `selectedIds` to only contain currently-visible IDs.

13. **No "Clear filters" button** when filters are active. **Fix:** added next to Copy-link.

14. **No manual Refresh button** — only the auto-poll / realtime. **Fix:** `refetch()` button in the header actions row.

15. **Deep-link `?ticket=<id>` used `.single()` which throws on no-match** — admins clicking a stale notification got an empty modal. **Fix:** switched to `.maybeSingle()`, distinguish error vs not-found toasts. Switched `setSearchParams` to functional form so it doesn't blow away other URL state.

16. **A11y** — checkboxes, row buttons, bulk-action buttons, and bulk-dialog actions all received `aria-label`. Row button now has `focus-visible:ring`. The unassigned avatar placeholder got `aria-label="Unassigned"` + `title`.

---

## New backend

### `admin-bulk-update-support-tickets` v1 (deployed)

One edge function, four actions:

| action            | payload                                | behavior                                                                                                                          |
| ----------------- | -------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `update_status`   | `newStatus` ∈ {new, open, in_progress, resolved, closed} | Skips no-ops as `skipped`. Stamps `resolved_at` + `resolved_by` when transitioning to `resolved`. |
| `update_priority` | `newPriority` ∈ {low, normal, high, urgent} | Skips no-ops as `skipped`.                                                                                                       |
| `assign`          | `assigneeId` (UUID or null/empty)      | Validates active admin if specified. Auto-promotes `new` → `open` on first assignment. Skips no-ops.                              |
| `delete`          | (no extra)                             | Deletes child `support_ticket_notes` first, then the ticket. Per-row error isolation — one bad row doesn't abort the batch.       |

Common gating:
- JWT + `has_role(user_id, 'admin')` RPC check (same pattern as every other bulk edge fn)
- 100-ticket cap
- UUID-array validation
- Per-row `admin_audit_log` entry with action-specific `action_type` (e.g. `support_ticket_bulk_status_update`)
- Partial-success summary: `{ succeeded, skipped, errored, results[] }`

Function ID: `91919e34-1bfc-4668-af60-29e5b3dcb0c2`

---

## Frontend changes

### New components

- `src/components/admin/support/BulkSupportTicketActionDialog.tsx` (231 LOC) — single dialog for all 4 bulk operations. Action-specific UI: status picker / priority picker / assignee picker / destructive confirm. Optional 500-char audit reason. Partial-success toast: `"Updated 47 · 2 skipped · 1 errored"`.

### `src/pages/admin/AdminSupport.tsx` — rewired

- Imports updated; URL-state hydration; loop-guarded URL sync
- Real assignee filter list (fixes P0)
- Global-counts query feeding the KPI strip
- Realtime channel + 30s poll fallback
- "Refreshing…" indicator with `aria-live`
- Copy-link / Clear-filters / Refresh buttons in the header actions row
- 4 bulk-action buttons (Status / Priority / Reassign / Delete) appear only when ≥1 row is selected
- SLA badge on each row
- Selection-drift cleanup effect
- Deep-link uses `.maybeSingle()` + functional `setSearchParams`
- Bulk delete now routes through the edge fn (replaces the old client-only `.from('support_tickets').delete().in(...)` path)
- `<BulkSupportTicketActionDialog>` rendered conditionally on `bulkAction` state

### `src/components/admin/SupportTicketModal.tsx`

- `handleDelete` notes-delete error now thrown + surfaced via toast
- `handleEscalateToManager` second step (status update) is now Promise-wrapped — partial-state failure shows `toast.warning("Escalated, but couldn't update ticket status: …")` instead of a generic success

### `src/hooks/useAdminSupportTickets.ts`

- `useAssignSupportTicket` swapped fetch-then-write to atomic conditional update for the new→open auto-promote
- All mutation `onError` paths surface the actual error message instead of the generic toast

---

## Verification

- `npx tsc --noEmit` → clean
- `npx vitest run` → 128 passed, 5 skipped
- `npx vite build` → built successfully in ~40s
- Edge function deployed: `admin-bulk-update-support-tickets` v1 (id `91919e34-1bfc-4668-af60-29e5b3dcb0c2`) — ACTIVE
- Live DB check: `support_tickets` is in the `supabase_realtime` publication (1 row currently exists)
- Schema check before deploy: `support_tickets` columns match what the edge fn updates (id, status, priority, assigned_to, assigned_at, assigned_by, resolved_at, resolved_by, subject, sender_email, source)

---

## Behavioural guarantees

1. **Every bulk action is admin-gated server-side AND audited.** The edge fn checks `has_role(user_id, 'admin')`; every row processed writes an `admin_audit_log` entry; per-row error isolation means one bad ticket doesn't abort the batch.
2. **No silent failures.** Every mutation `onError` surfaces the real error message; partial-state escalation surfaces a warning toast; notes-delete failure during single-ticket delete is no longer swallowed.
3. **No race on auto-promote.** `useAssignSupportTicket` uses an atomic conditional update instead of fetch-then-write.
4. **URL-state round-trips.** Bookmarking `/admin/support?status=new&source=provider_support&assignee=<uuid>&q=billing` reopens the exact same filtered view.
5. **Realtime stays in sync.** INSERT / UPDATE / DELETE on `support_tickets` invalidates the list within ~200ms; 30s poll covers a dropped channel.
6. **KPI cards are truthful.** They reflect global counts, not the filter selection. Tab labels reflect in-view counts (explicitly per-filter).
7. **A11y.** Every icon-only button, checkbox, row click, and dialog has an `aria-label`. Focus rings on row buttons.

---

## Files changed

```
NEW:
  src/components/admin/support/BulkSupportTicketActionDialog.tsx
  supabase/functions/admin-bulk-update-support-tickets/index.ts   (deployed v1)
  docs/admin-support-hardening-2026-05-20.md

MODIFIED:
  src/pages/admin/AdminSupport.tsx                                — full rewire
  src/components/admin/SupportTicketModal.tsx                     — delete + escalate hardened
  src/hooks/useAdminSupportTickets.ts                             — atomic auto-promote, error surfacing
```
