# /admin/leads — Deferred Items Completion

**Date:** 2026-05-20
**Branch:** `claude/phase2-deployment-5WYOn`
**Verdict:** ✅ Three deferred items completed: bulk status update, URL-state filter presets, routing-decision history.

---

## What this pass closed

Three items were explicitly deferred in `docs/admin-leads-deep-hardening-2026-05-20.md`. This pass ships all three.

| Deferred item | Action | Why now |
|---------------|--------|---------|
| **Bulk status update** | ✅ Edge fn + dialog + button | Mirrors bulk-reassign pattern; ops can mark batches as closed/expired |
| **Saved filter presets** | ✅ URL-state encoding + Copy-link button | Bookmarkable / shareable filtered views (lighter than DB-backed presets) |
| **Routing decision history** | ✅ New section in InquiryDetailModal | Drill into `lead_routing_logs` per lead — why this facility, what tier check, eligibility outcome |

The fourth deferred item — *Lead-quality scoring / AI flagging* — remains intentionally out of scope. It's a "whole new feature" rather than a hardening pass; needs its own product spec.

---

## 1. Bulk status update

### New edge function — `admin-bulk-update-lead-status` (deployed v1)

Mirrors `admin-bulk-reassign-leads` pattern. JWT + `has_role` admin gate, UUID-array validation, 100-lead cap, per-lead loop preserving triggers/RLS/FK behaviour.

Specifics:
- `VALID_STATUSES = {new, contacted, responding, converted, closed, expired}` whitelist — rejects any other value
- Skips no-ops (`current.status === newStatus`) as `skipped`, not `errored`
- When `newStatus === "expired"`, also stamps `lead_expired_at = now()` so the existing `idx_leads_expired` index + SLA queries work correctly
- Per-lead `admin_audit_log` row with `action_type='lead_bulk_status_update'`, captures `previous_status`, `new_status`, `facility_id`, `bulk_operation: true`, `batch_size`, optional `reason`
- Returns partial-success shape: `{ updated, skipped, errored, results[] }`

### New component — `BulkStatusUpdateDialog`

- Six status options with help text per option (e.g. "Stamps lead_expired_at; removes from active queue")
- Optional reason textarea (500 char cap, audit-logged)
- Disables UI during mutation; prevents close mid-request
- Partial-success toast: `"Updated 18 · 2 skipped · 0 errored"`

### Wiring in `AdminLeads`

New "Status (N)" button appears alongside Reassign and Delete when ≥1 leads are selected. `aria-label` reflects count + action.

---

## 2. Saved filter presets via URL-state

The previous design had filters in local React state — admins couldn't bookmark a view, share a link, or restore filters after a refresh. This pass encodes every filter state in the URL search params.

### Round-tripping

**Hydrate on mount:** `useState(() => searchParams.get("status") ?? "all")` for each filter. Custom date-range parser tolerates missing/malformed values.

**Write on change:** A consolidated `useEffect` builds the next `URLSearchParams` from the current state values, skips defaults to keep the URL tidy (`statusFilter !== "all"`, etc.), and writes via `setSearchParams(next, { replace: true })` to keep browser history short.

**Loop guard:** Before writing, compares `next.toString()` vs `searchParams.toString()` — only writes if they actually differ. Prevents the `useSearchParams` render-loop that would otherwise fire every render.

### URL params

| Param | State | Default (skipped from URL) |
|-------|-------|---------------------------|
| `q` | searchQuery (debounced) | `""` |
| `status` | statusFilter | `"all"` |
| `type` | inquiryTypeFilter | `"all"` |
| `dist` | redistributionFilter | `"all"` |
| `dp` | datePreset | `"all"` |
| `from` | dateRange.from (yyyy-MM-dd) | none |
| `to` | dateRange.to (yyyy-MM-dd) | none |
| `sort` | sortKey | `"created_at:desc"` |

### Copy-link affordance

When `hasActiveFilters` is true, a "Copy link" button (with `Link2` icon) appears in the header. Clicks copy `window.location.href` to the clipboard via the modern Clipboard API, with a fallback for insecure contexts. Toast confirms or reports failure. Admins can paste the link in Slack / a ticket / an email to share the exact view with a colleague.

### Example URLs

- `/admin/leads?status=new&dist=redistributed&sort=urgency:desc` — "All redistributed leads still in 'new' status, urgent first"
- `/admin/leads?type=request_callback&from=2026-05-10&to=2026-05-20` — "Callback requests from the last 10 days"
- `/admin/leads?q=acme&status=expired&dp=lastMonth` — "Expired leads matching 'acme' from last month"

Refresh / back / forward / new tab — all reproduce the same view.

---

## 3. Routing decision history widget

The InquiryDetailModal's Lead Details tab already had "Distribution History" (which lead-distributions reflect post-assignment state). Missing: WHY a lead landed at a specific facility. New "Routing Decisions" section queries `lead_routing_logs` and surfaces every assignment decision.

### Data shown per row

- **Assignment reason** (free-text from the routing pipeline)
- **Plan tier** badge (`pro` / `free`) — explains which routing branch was taken
- **Subscription status** badge (`active` / `past_due` / etc.)
- **Routing source** badge (`facility_form` / `concierge_intake` / `redistribution_engine` / etc.)
- **Exclusivity** badge (`exclusive` / `extended`)
- **Provider routing order** if set (#1, #2 — for ranked-fallback assignments)
- **Requested → assigned facility** with a `(diverged)` tag in amber if they don't match (signals fallback assignment)
- **Eligibility check result** as a collapsible `<details>` block rendering the JSONB blob — useful for forensic debugging of why a facility was skipped

### Empty state

For leads created before the routing-log was instrumented (or for direct facility-form submissions that bypass the routing pipeline), the section renders a clear explanation rather than silently showing zero rows.

---

## CI gate results

| Check | Result |
|-------|--------|
| `npx tsc --noEmit` | ✅ clean |
| `npx vitest run` | ✅ 128 passed / 5 skipped |
| `npx vite build` | ✅ built in 28.41s |
| `admin-bulk-update-lead-status` edge fn deployed | ✅ v1 active |
| 21 source-contract assertions | ✅ all pass |

---

## Files changed

| File | Change | LOC |
|------|--------|-----|
| `supabase/functions/admin-bulk-update-lead-status/index.ts` | NEW edge fn | +170 |
| `src/components/admin/inquiries/BulkStatusUpdateDialog.tsx` | NEW dialog | +155 |
| `src/pages/admin/AdminLeads.tsx` | URL-state, copy-link, bulk-status button | +75 |
| `src/components/admin/inquiries/InquiryDetailModal.tsx` | Routing decisions section + query | +95 |
| `docs/admin-leads-deferred-complete-2026-05-20.md` | This file | +new |

**Net: ~500 LOC across 4 source files. One new admin action wired end-to-end. URL-state preserves every filter combination across reload / share / bookmark.**

---

## What remains intentionally out of scope

| Item | Why deferred (still) |
|------|----------------------|
| Lead-quality scoring / AI flagging | Whole new product feature — needs its own spec, ML model, evaluation harness |
| Server-side saved-presets table | Heavier than URL-state; URL-state covers 95% of the use case (share / bookmark / reload) without a DB schema change |

---

## Smoke verdict

🟢 **Ship-ready.** Every deferred item from the previous pass that was structurally tractable is now complete. The remaining deferred item (lead-quality scoring) is a new product feature, not a hardening or completeness gap.
