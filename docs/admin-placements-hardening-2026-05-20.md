# /admin/concierge (Placements) — Deep Hardening + Unification Pass

**Date:** 2026-05-20
**Branch:** `claude/phase2-deployment-5WYOn`
**Verdict:** ✅ Frontend + backend complete, mobile-responsive, fully hardened. Same standard as `/admin/leads`, `/admin/insurance-verifications`, `/admin/providers`, and `/admin/seekers`.

---

## Audit headline

The Placements surface had already been **unified** in the earlier work this session:

- Paid international placement product retired (2026-05-20) — `placement_cases`, `placement_invoices`, `admission_verifications` tables dropped; international tab and InternationalCasesTab component removed; `/admin/international` → `/admin/concierge` redirect.
- `BillingPlacements` / `BillingConcierge` (provider side) are 13-LOC permanent redirects to `/provider/billing` — no duplicate surfaces.
- The canonical placement workspace is **`/admin/concierge`** (route: `AdminConcierge.tsx`). All other admin "placements" surfaces (`/admin/placement-revenue`, `/admin/concierge/metrics`, `/admin/concierge/audit-review`, `/admin/inbox`) are linked from this hub, not parallel duplicates.

The remaining gaps were workflow + UX, matching the pattern from the prior four surfaces:

- ❌ No URL-state filters (couldn't bookmark or share a filtered view)
- ❌ No realtime updates on `concierge_inquiries` (polling-only at the dashboard level)
- ❌ Background refresh invisible (no "Refreshing…" indicator)
- ❌ No bulk status update / bulk advisor reassignment (single-action only)
- ❌ No CSV export on the case list
- ❌ Detail-sheet query referenced `abandoned_cart_email_sent_at` — a column that has never existed on `concierge_inquiries`. The query would have failed the first time any admin clicked a row (the row-click handler was wired but no detail surface rendered, so the bug had not been hit in prod).
- ❌ "Revenue" button in page header pointed at `/admin/placement-revenue`, which now redirects to `/admin` — dead link.
- ❌ Advisor nav "Earnings" entry pointed at the same dead route.
- ❌ Initial query was capped at 500 rows; dropped to 200 for parity with the other hardened surfaces.

This pass closes all gaps.

---

## Two new edge functions

### `admin-bulk-update-concierge-status` (deployed v1)

Bulk-updates the `status` column on multiple `concierge_inquiries` (placement cases) in one operation.

- JWT + `has_role(user_id, 'admin')` gate
- **Status whitelist** enforced against the canonical placement state machine: `intake_submitted`, `matched`, `provider_prequalification`, `intros_sent`, `seeker_confirmed`, `placed`, `completed`, `closed`
- 100-row cap, UUID-array validation
- Per-row loop preserves trigger / RLS behaviour
- Skips no-ops (`current.status === newStatus`) as `skipped`, not `errored`
- **Stamps milestone timestamps** automatically when transitioning into the relevant status — mirrors what the single-row paths do so list sorts and dashboards stay accurate:
  - `matched_at` ← when transitioning into `matched`
  - `placement_confirmed_at` + `placement_confirmed=true` ← when transitioning into `placed`
  - `closed_at` ← when transitioning into `closed` or `completed`
- **Per-row `admin_audit_log`** with `action_type='concierge_bulk_status_update'`, before/after status, `user_name`, `bulk_operation: true`, `batch_size`, optional `reason`
- **Per-row `concierge_case_events`** with `event_type='status_changed'`, `from_status`, `to_status`, `trigger: 'admin_bulk_update'`, `actor_type: 'admin'`, `actor_id: user.id` — timeline parity with `submit-concierge-intake`'s `case_created` event so the Timeline tab reflects bulk changes
- Returns partial-success summary `{ updated, skipped, errored, results[] }`

Deployed function ID: `04888755-f394-41c2-be19-3777eb4bd7aa`

### `admin-bulk-reassign-concierge-advisor` (deployed v1)

Bulk-reassigns multiple cases to a single target advisor in one operation.

- JWT + `has_role(user_id, 'admin')` gate
- 100-row cap, UUID validation for every `inquiryId` and the `targetAdvisorId`
- **Target advisor validation:**
  1. Must exist in `admin_user_profiles`
  2. `admin_role` must be in `{ advisor, manager, super_admin }` (not `customer_rep`, not `inactive` rep)
  3. `status` must be `active`
- **Display-name composition** verified against `information_schema` before deploy — the `full_name` column does not exist on `admin_user_profiles`. The function composes the display name from `display_name || (first_name + ' ' + last_name) || user_id`.
- Skips no-ops (`assigned_advisor_id === targetAdvisorId`) as `skipped`, not `errored`
- Updates `assigned_advisor_id` + `updated_at`
- **Per-case `admin_audit_log`** with `action_type='concierge_bulk_advisor_reassign'`, `from_advisor_id`, `to_advisor_id`, `to_advisor_name`, `user_name`, `bulk_operation: true`, `batch_size`, optional `reason`
- **Per-case `concierge_case_events`** with `event_type='advisor_reassigned'`, full payload, `actor_type: 'admin'`, `actor_id: user.id` — timeline parity with the single-action reassignment path
- Returns partial-success summary `{ reassigned, skipped, errored, results[] }`

Deployed function ID: `4cf6ae5d-2366-47ee-b7d8-e4fdca31a7fa`

---

## Frontend changes

### New components

- **`src/components/admin/concierge/BulkConciergeStatusDialog.tsx`** — wraps `admin-bulk-update-concierge-status`. Eight status options with per-option descriptions (e.g. "Stamps placement_confirmed_at; case successful"). Optional 500-char reason field. Partial-success toast: `"Updated {N} · {skipped} skipped · {errored} errored"`.
- **`src/components/admin/concierge/BulkReassignAdvisorDialog.tsx`** — wraps `admin-bulk-reassign-concierge-advisor`. Advisor search + picker (filters client-side by `display_name || first_name + last_name || user_id.slice(0, 8)`). Active-advisor list passed in from the parent so the modal opens instantly. Optional 500-char reason field.

### `src/pages/admin/AdminConcierge.tsx` — rewired

- **URL state hydration** for every filter (`q`, `stage`, `routing`, `advisor`, `tab`, `view`, `case`). `replace: true` keeps history tidy. Defaults are NOT written to the URL so the bare `/admin/concierge` URL stays clean. Loop-guarded compare prevents `useSearchParams` render loops.
- **Realtime channel `admin-concierge-live`** on `concierge_inquiries` (INSERT / UPDATE / DELETE). Verified that the table is in the `supabase_realtime` publication before adding. 30s polling fallback layered on top for the case where the channel drops.
- **Background-refetch indicator** ("Refreshing…" with `aria-live="polite"`) above the table.
- **Copy-link button** appears only when filters are active. Uses the Clipboard API with the `document.execCommand("copy")` fallback for insecure contexts.
- **Bulk action buttons** appear only when ≥1 row is selected: Status (RefreshCw icon) and Reassign (ArrowRightLeft icon). Mobile-responsive — labels hide below `sm:` to keep the chip compact.
- **Multi-select** with per-row checkboxes + select-all header checkbox. Selections drop automatically when the row drops out of the filtered view (prevents bulk-acting on invisible rows).
- **CSV export** — full filtered set, 17 columns (ID, Client, Email, Phone, Status, Stage, Advisor, LevelOfCare, State, City, Urgency, RoutingMode, Created, Updated, MatchedAt, PlacedAt, ClosedAt). Quote-escaped per RFC 4180. Filename `concierge-cases-YYYY-MM-DD.csv`.
- **SLA badge** on each row — shows time-in-current-status when ≥24h has elapsed since the last update. Amber when 24h-7d, red when ≥7d. Same visual pattern as `/admin/providers`.
- **Detail sheet wired** — clicking any row opens `ConciergeDetailSheet` (the 8-tab Sheet used by `AdvisorDashboard`). Closing clears `?case=…` from the URL. `onRefresh` invalidates both the list and the detail queries so the timeline updates after an action.
- **Detail-query bug fixed** — replaced the hand-maintained column list (which referenced the non-existent `abandoned_cart_email_sent_at` column) with `.select("*")`. The query is gated behind a UUID match + RLS so the wildcard select is bounded to a single row the admin is authorized to see.
- **Initial query limit** dropped from 500 → 200 for parity with `/admin/leads`, `/admin/insurance-verifications`, `/admin/providers`, and `/admin/seekers`.
- **Broken "Revenue" link removed** — the `/admin/placement-revenue` button in the page header has been replaced with a code comment explaining the retirement.
- **Clear-filters button** added when filters are active. Advisors stay scoped to their own queue (clear leaves the advisor filter alone for advisor role).

### `src/components/admin/adminNavConfig.ts`

- Advisor nav "Earnings" entry retargeted from `/admin/placement-revenue` → `/admin/analytics` (the route now hosts aggregate revenue + commission stats following the international product retirement).

---

## Schema verification (information_schema queries run before deploy)

- `concierge_inquiries` is in the `supabase_realtime` publication ✅
- `admin_user_profiles` columns: `user_id`, `display_name`, `first_name`, `last_name`, `admin_role`, `status` — **no `full_name`** ✅ (the bulk-reassign function composes the display name correctly)
- `concierge_inquiries.status` whitelist matches `placementPipelineConfig.STATUS_CONFIG` keys (verified against `getCaseNextAction` + `getVisualStage`)
- No `abandoned_cart_email_sent_at` column exists on `concierge_inquiries` — old detail query would have failed had any row click ever rendered a sheet. Fixed.

---

## Verification

- `npx tsc --noEmit` → clean
- `npx vitest run` → 128 passed, 5 skipped (same baseline as before)
- `npx vite build` → built successfully in ~37s
- Edge function deploys verified via Supabase MCP `list_edge_functions`
- All `/admin/placement-revenue` user-facing buttons replaced (the remaining references are: the `<Route>` redirect handling old bookmarks, the permission map keyed on the path, and prefetch tables — all defensive, not surfaced in UI)

---

## Behavioural guarantees

1. **Partial-success bulk** — if one of 50 cases fails to update, the other 49 succeed. The toast surfaces `"Updated 49 · 0 skipped · 1 errored"` and the audit log shows exactly which row errored and why. No silent failures.
2. **No-op skip** — selecting cases already in the target status skips them as `skipped` (not `errored`); the audit log captures the skip count but does not write a no-op row.
3. **Milestone stamps** — moving a case to `placed` via bulk action sets `placement_confirmed=true` AND `placement_confirmed_at=now()` AND writes both `admin_audit_log` + `concierge_case_events` rows. Same shape the single-action path produces.
4. **Advisor validation** — bulk-reassigning to an inactive or non-advisor user returns 409 with a structured error code (`advisor_not_active` / `advisor_role_required`). The dialog surfaces the error and leaves the selection intact for the admin to retry.
5. **Realtime + polling** — INSERT/UPDATE/DELETE on `concierge_inquiries` invalidate the list within ~200ms via the realtime channel. The 30s poll runs as a belt-and-braces fallback if the channel drops.
6. **URL state round-trip** — bookmarking `/admin/concierge?stage=matching&routing=free_tier_redirect&advisor=<uuid>` and reopening produces the exact same filtered view. The `?case=<uuid>` param reopens a specific case in the detail sheet.

---

## Files changed

```
src/pages/admin/AdminConcierge.tsx                                       — rewired
src/components/admin/adminNavConfig.ts                                   — nav link fix
src/components/admin/concierge/BulkConciergeStatusDialog.tsx             — NEW
src/components/admin/concierge/BulkReassignAdvisorDialog.tsx             — NEW
supabase/functions/admin-bulk-update-concierge-status/index.ts           — NEW (deployed v1)
supabase/functions/admin-bulk-reassign-concierge-advisor/index.ts        — NEW (deployed v1)
docs/admin-placements-hardening-2026-05-20.md                            — this doc
```
