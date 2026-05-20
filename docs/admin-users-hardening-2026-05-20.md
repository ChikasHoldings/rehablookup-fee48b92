# /admin/users — Deep Hardening Pass

**Date:** 2026-05-20
**Branch:** `claude/phase2-deployment-5WYOn`
**Verdict:** ✅ Frontend + backend complete, mobile-responsive, fully hardened. Same standard as the prior 14 admin surfaces.

---

## Scope

- `src/pages/admin/AdminStaff.tsx` — the `/admin/users` route (mapping in `src/App.tsx:384,1825`).
- `src/components/admin/CreateAdminUserDialog.tsx`
- `src/components/admin/AdminUserPermissionsDialog.tsx`
- `src/components/admin/AdminStaffDetailModal.tsx`
- `src/hooks/useAdminUserManagement.ts`
- New: `src/components/admin/staff/BulkAdminStaffActionDialog.tsx`
- New: `supabase/functions/admin-bulk-update-admin-users/` (deployed v1)
- New: `supabase/migrations/20260625000000_realtime_for_admin_user_management.sql` (applied)

---

## Issues closed

### P0 — latent realtime bug

1. **Three admin-management tables not in `supabase_realtime` publication.** `useAdminUserManagement` already subscribes to `postgres_changes` on `admin_user_profiles`, `user_roles`, AND `admin_user_permissions` (hook lines 141–182) — but **none of the three tables were in the `supabase_realtime` publication**. Verified via `SELECT tablename FROM pg_publication_tables WHERE pubname='supabase_realtime' AND tablename IN (...)` returning `[]`. Net effect: the channels subscribed successfully, but never received events. An admin who suspended a peer from another browser had no propagation; the suspending admin's own session got an `invalidateQueries` directly, but every other admin still saw the suspended user as Active until manual refresh. With Super Admin actions being inherently coordination-sensitive, this was a real gap. **Fix:** migration `20260625000000_realtime_for_admin_user_management.sql` adds all three tables to the publication, gated by `IF NOT EXISTS` checks against `pg_publication_tables` (idempotent). RLS still gates which rows each subscriber sees (admins see all admin_user_profiles, regular users see only their own).

### P1 — workflow gaps

2. **No URL-state.** Search query, role filter, and active tab lived only in component state — no bookmark, no share-a-filtered-view. **Fix:** `useSearchParams` hydration on mount + loop-guarded sync. URL keys: `?q=foo&role=manager&tab=active`. Defaults (`q=""`, `role=all`, `tab=all`) are not written to the URL so the bare `/admin/users` URL stays clean.

3. **No bulk operations + no admin-gated bulk edge function.** Every prior admin surface has bulk operations through a dedicated edge function; `/admin/users` was the last single-action-only holdout. **Fix:** new `admin-bulk-update-admin-users` edge function (deployed v1, id `a642c821-7095-4ad9-bee0-81cbcc000103`) with four bulk actions (`suspend`, `unsuspend`, `reset_password`, `resend_invitation`). New `BulkAdminStaffActionDialog` routes the four actions through one UI. Bulk delete is **deliberately not supported** — the single-action path (`manage-admin-user`) has a "cannot delete the last admin" guard and a confirmation dialog that should run one row at a time given the audit weight.

4. **`useAdminUserManagement` did not expose `isFetching`.** Refresh button used `isLoading` which is only true on initial fetch — repeat refreshes never spun the icon. **Fix:** destructure `isFetching` from `useQuery` and expose it. Refresh button + a `Refreshing staff list…` text indicator with `aria-live="polite"` use it.

5. **`useAdminUserManagement` did not surface query errors.** A failed `get_admin_users_list` RPC just logged to `logAdminError`, but the UI rendered an empty staff list as if it were the truth. **Fix:** expose `queryError` from the hook; render a destructive error banner with a Retry button at the top of the page when set.

6. **No CSV export.** Every other admin surface has one. **Fix:** 14-column CSV export (user_id, email, first/last/display name, role, status, employment_type, commission_rate, phone, mfa_enabled, mfa_skip, created_at, last_login_at). Filename `admin-staff-YYYY-MM-DD.csv`.

7. **No Copy-link button** when filters are active. **Fix:** added with clipboard + execCommand fallback, only enabled when filters are non-default.

8. **No Clear-filters button.** Once filters were set, the only way back was to manually reset each one. **Fix:** "Clear" button appears next to the filters when any are non-default.

### P1 — safety

9. **Dropdown's `Suspend/Delete User` items were not gated against self-targeting.** The edge function does block self-suspension/deletion (`manage-admin-user/index.ts:327-331`), but the client UI happily let a super admin click the destructive items on their own row before the server bounced them with a generic error toast. **Fix:** `disabled={isSelf}` on Suspend and Delete dropdown items; AlertDialog's Confirm button is also `disabled` when `isSelfTarget`; an explicit destructive in-dialog note explains the block. A `"You"` badge marks the current user's own card so it's visually obvious which row is theirs.

10. **`handleAction` silently swallowed mutation errors.** The `try { await manageAdminUser(...) } catch { /* handled by mutation */ }` pattern was technically correct (the mutation `onError` toasts the underlying error), but the empty catch made it look like errors were being dropped on the floor. The `useAdminUserManagement.manageAdminUserMutation.onError` (hook lines 336-345) does call `toast.error("Action failed", { description: error.message })`, so it IS surfaced. **Fix:** kept the catch but documented why it's intentionally empty.

### P1 — bulk-action safety guarantees (server-side)

The new `admin-bulk-update-admin-users` edge function has stricter gates than the single-action path:

| Gate | Rule |
| --- | --- |
| Authentication | JWT required (`verify_jwt=true`) |
| Authorization 1 | `has_role(_user_id, 'admin')` — admin role required |
| Authorization 2 | `is_super_admin(_user_id)` — super_admin tier required (no manager exception) |
| Batch cap | `MAX_PER_REQUEST=50` (vs. 100 for other bulk ops — admin accounts are higher-impact) |
| Self-target | Skipped with `reason=self_modification` (no exception, ever) |
| Super-admin target | Skipped with `reason=cannot_modify_super_admin` (must use single-action path with explicit confirmation) |
| No-op | Skipped (e.g. `already_suspended`, `not_suspended`, `not_pending_invitation`) |
| Audit | Per-row `admin_audit_log` row with `bulk_operation:true`, `batch_size`, `reason` |
| Email | Resend errors are warned but do not undo the underlying password change — password reset succeeds even if email fails |

### P2 — UX/a11y polish

11. **Selection state is multi-select with visible checkboxes.** Checkboxes appear only on rows the current admin can bulk-action (so super-admin rows and the current user's own row never show a checkbox). Stop-propagation on the wrapper so checking doesn't open the detail modal.

12. **Card click → detail modal** is now a real `<button type="button">` instead of an `onClick` on the Card root. Focus ring on `:focus-visible`, keyboard activation works.

13. **Selection-drift cleanup effect** — when a filter change drops a row out of `filteredUsers`, that row's ID is removed from `selectedIds` automatically.

14. **Select-all-on-page helper** appears below the filters when there are eligible rows. Bulk-action toolbar appears separately above (sticky-feeling but using normal flow).

15. **aria-labels on every icon-only button** — Refresh, Copy link, Export CSV, the row dropdown trigger (`Actions for ${displayName}`), search input, role filter Select trigger, every tab trigger, every bulk-action button.

16. **Status colors** for the "You" badge, the `pending_password_reset` stats counter (still computed but not surfaced as a stat card; the Pending Setup status badge remains on the row).

17. **Error banner** uses `role="alert"` so screen readers announce the fetch failure immediately.

18. **`pending` stat** is now tracked in the stats object so future surface work doesn't have to retrofit it.

---

## Files changed

```
NEW:
  supabase/migrations/20260625000000_realtime_for_admin_user_management.sql  (applied)
  supabase/functions/admin-bulk-update-admin-users/index.ts                  (deployed v1)
  src/components/admin/staff/BulkAdminStaffActionDialog.tsx
  docs/admin-users-hardening-2026-05-20.md

MODIFIED:
  src/pages/admin/AdminStaff.tsx
    — URL-state hydration + loop-guarded sync (?q=, ?role=, ?tab=)
    — Bulk selection: per-row checkbox, select-all-on-page helper,
      bulk action toolbar with 4 actions (suspend/unsuspend/
      reset_password/resend_invitation)
    — Selection-drift cleanup effect
    — Copy-link button (filtered URL) with execCommand fallback
    — Clear-filters button
    — CSV export (14 columns)
    — isFetching indicator with aria-live="polite"
    — Query-error banner with Retry
    — Self-target gating on Suspend/Delete (disabled + dialog note)
    — "You" badge on the current admin's own card
    — Real <button> for card click + focus-visible ring
    — aria-labels on every icon-only control
    — Sonner toast import for export/copy/self-target error surfacing
  src/hooks/useAdminUserManagement.ts
    — Expose isFetching + queryError from the useQuery destructure
```

---

## Verification

- `npx tsc --noEmit` → clean
- `npx vitest run` → 128 passed, 5 skipped
- `npx vite build` → built successfully in ~34s
- Edge function deployed: `admin-bulk-update-admin-users` v1 (id `a642c821-7095-4ad9-bee0-81cbcc000103`) — ACTIVE
- Migration applied to live project: `admin_user_profiles`, `user_roles`, `admin_user_permissions` all confirmed in `supabase_realtime` publication
- Live DB sanity: `admin_user_profiles` has 2 rows (both `active`, no suspended/pending) so no production rows are affected by the migration itself; bulk actions are no-ops on this dataset
- RLS check: all three newly-publishing tables have `rowsecurity=true` and existing policies gate visibility (admins see all, regular users see their own row). Realtime respects RLS so no info-leak risk.

---

## Behavioural guarantees

1. **Realtime now propagates.** Suspend/unsuspend/role-change/permissions-change on any admin row triggers postgres_changes events on every other admin's subscribed channel within ~200ms — no more "ghost active" rows from peer suspensions until manual refresh.
2. **No silent fetch failures.** `useAdminUserManagement` exposes `queryError` and the page renders a destructive banner with Retry instead of an empty list disguised as "no admins exist."
3. **No silent bulk failures.** Bulk dialog surfaces `succeeded · skipped · errored` counts, the edge fn returns per-row reasons (`self_modification`, `cannot_modify_super_admin`, `already_suspended`, etc.) so the admin understands exactly which rows were no-ops.
4. **Self-action is blocked at every layer.** Dropdown items disabled on the current user's own row, AlertDialog Confirm disabled with an in-dialog warning, bulk-eligible-IDs list excludes the current user, AND the edge fn skips `self_modification` server-side.
5. **Super-admin targets are blocked from bulk.** Super-admin rows have no checkbox in the UI AND the edge fn skips `cannot_modify_super_admin`. Single-action path on these rows still works via the dropdown when invoked by another super admin (the manage-admin-user fn has its own gate for this).
6. **URL-state round-trips.** Bookmarking `/admin/users?role=manager&tab=active&q=jane` reopens the exact same filtered view on a different machine.
7. **Defense in depth on bulk mutations.** Edge fn checks JWT → admin role → super_admin tier → batch cap → per-row guards → audit log. Customer_rep / advisor / manager tokens that bypass the UI still bounce off the edge fn with `super_admin_required`.
