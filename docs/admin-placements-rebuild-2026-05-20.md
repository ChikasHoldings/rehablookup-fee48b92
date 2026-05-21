# Placements admin workspace — rebuild for current monetization

**Date:** 2026-05-20
**Branch:** `claude/phase2-deployment-5WYOn`
**Verdict:** ✅ Single unified `/admin/concierge` page with four tabs (Cases / Network / Directory / Inbox). Admission workflow + every reference to the retired paid-placement product removed. UI patterns match the rest of the hardened admin panel.

---

## Why this pass

Two complaints addressed:

1. **"Admin panel still has multiple Placements pages."** The nav had a sub-group of three entries (Command Center → `/admin/concierge`, Advisor Inbox → `/admin/inbox`, Provider Directory → `/admin/provider-directory`) which felt like three separate pages. Now: one entry → one page → four tabs.
2. **"Admin Placements pages still have admission components and flows."** The admission tracking (status / substatus / move-in date / admission notes / admission_in_progress / admitted / billed stages) was holdover from the retired paid-placement product. Concierge is now a Pro subscription add-on; we coordinate intake → match → intros → seeker selection. Whether the seeker actually moves in is between them and the facility.

---

## What changed

### Deleted

- `src/components/admin/concierge/AdmissionCoordinationCard.tsx` (285 LOC) — the admission tracking card with move-in date / admission notes / admission_status select.

### Pipeline state machine — `placementPipelineConfig.ts`

- `VISUAL_STAGES`: dropped the `"admission"` and `"billing"` visual groups. New terminal visual stage is `"placed"` which includes the new active status `seeker_selected` plus the legacy admission_in_progress / admitted / billed rows so historical data keeps rendering as "Placed" instead of going blank.
- `PIPELINE_STAGES`: dropped the entries for `admission_in_progress`, `admitted`, and `billed`. The `seeker_selected` entry is repurposed as the terminal "Placed" stage (was "Client Selected" with a "Begin admission" next action; now "Placed" with a "Close case" next action).
- `STATUS_CONFIG`: added explicit legacy-row badge entries for `admission_in_progress` / `admitted` / `billed` so they all render as a green "Placed" badge in lists.
- `PlacementStage` union retains the legacy values so historical DB rows still type-check, with a comment marking them as retired.

### Next-action logic — `placementActionUtils.ts`

- Rewrote the next-step messages for `seeker_selected` from "Schedule tour or begin admission" → "Confirm placement and close case".
- Collapsed `admission_in_progress` / `admitted` / `billed` into a single "Close legacy case" prompt so admins can clear historical rows.
- Removed the `admission_status` field from the `CaseSnapshot` interface.
- Removed the "Awaiting payment" blocker logic — the retired paid-placement product was the only thing that surfaced unpaid cases as blockers.
- `getCaseBlocker()` no longer references payment status.

### Detail sheet — `ConciergeDetailSheet.tsx`

- Removed the `admission` tab from the tab list and its corresponding `<TabsContent>` block.
- Dropped the `AdmissionCoordinationCard` import.
- Dropped the now-unused `admission_status` prop passed to `PlacementProgressStepper`.
- Tabs are now: Overview / Client / Match / Intros / Msgs / Decision / Tours / Notes / Act.

### Progress stepper — `PlacementProgressStepper.tsx`

- Dropped the `admission_status` field from `PlacementCaseData` interface.

### Ops dashboard — `PlacementOpsDashboard.tsx`

- Removed the "Admissions In Progress" bucket; added a new "Placed — Ready to Close" bucket that surfaces `seeker_selected` + the legacy admission_* / billed rows.
- Replaced the "Pending Payment" SummaryCard with "Placed — Ready to Close".
- `STUCK_THRESHOLDS` no longer includes admission/billed states (legacy rows surface via the placed-ready-to-close bucket instead).

### SLA alerts — `CaseSlaAlerts.tsx`

- Early-return skips terminal states AND legacy admission/admitted/billed rows.
- Tour-not-scheduled rule no longer references `admission_in_progress`.

### Actions tab — `ConciergeActionsTab.tsx`

- `advisorAllowed` set no longer includes `admission_in_progress`.
- Status-guard message clarified: legacy admitted rows can only be closed (not edited).
- Escalate-case visibility no longer hides on `admitted` / `billed` (those are now terminal in the new UI).

### Bulk status dialog — `BulkConciergeStatusDialog.tsx`

- Replaced the fictional state names (`intros_sent`, `seeker_confirmed`, `placed`) with the real DB enum values (`presented_to_seeker`, `seeker_selected`, etc.) from `CONCIERGE_STATUSES`. The prior labels never matched the DB and would have errored at the trigger.
- 11 status options instead of 8, covering the active workflow plus terminal close/complete.

### Edge function — `admin-bulk-update-concierge-status` v2 (deployed)

- `VALID_STATUSES` now lists all 14 real DB enum values (was 8 fictional ones).
- Milestone stamp logic updated: `seeker_selected` (the new terminal "placed") now triggers `placement_confirmed = true` + `placement_confirmed_at` stamp. Legacy `admitted` still stamps for historical rows.
- Version bumped to 1.1.0.

### Status transitions — `src/lib/statusTransitions.ts`

- Added a doc comment marking `admission_in_progress` / `admitted` / `billed` / `completed` as legacy. The map is left intact because the Postgres trigger `validate_concierge_status_transition` still references those states for historical rows.

### Unified workspace — `AdminConcierge.tsx`

- Page header renamed "Placement Command Center" → **"Placements"**, subtitle "Concierge advisor workspace — intake, matching, intros, and case messaging in one place".
- Tabs collapsed and renamed: `domestic` → `cases`, `providers` → `network`. Added new tabs `directory` and `inbox`.
- URL state hydration adds `normalizeTab()` for backward-compat — old bookmarks at `?tab=domestic` and `?tab=providers` map onto the new names.
- Stat-card label "Admitted" → "Placed".
- `completedCases` counter includes `seeker_selected` + legacy admission/admitted/billed (the unified "Placed" set).
- Query select drops `admission_status` and `admission_substatus` columns (no longer rendered anywhere).
- New `<TabsContent>` blocks for `directory` (renders `AdvisorProviderDirectory` inline) and `inbox` (renders `AdvisorInbox` inline).

### Embedded pages

- **`AdvisorInbox.tsx`** — removed the inline "Advisor Inbox" page header so embedding inside a tab doesn't stack two titles. Starts now with the unread badge + filter row.
- **`AdvisorProviderDirectory.tsx`** — removed the `AdminPageHeader` for the same reason. Starts with the counts summary line.

### Routes — `App.tsx`

- `/admin/inbox` → `<Navigate to="/admin/concierge?tab=inbox" replace />`
- `/admin/provider-directory` → `<Navigate to="/admin/concierge?tab=directory" replace />`
- Dropped the lazy imports for `AdvisorInbox` + `AdvisorProviderDirectory` (they're now imported directly by `AdminConcierge`, not used as standalone route elements).

### Nav config — `adminNavConfig.ts`

- Super admin + manager navs: collapsed the 3-entry Placements sub-group into a single top-level entry → `/admin/concierge`.
- Advisor nav: collapsed "Placement Center" / "Messages" / "Provider Directory" into a single "Placements" entry. Analytics kept.
- Removed the unused `Inbox` lucide-react icon import.

---

## What's preserved

- The case list, filtering, URL state, realtime channel, bulk action dialogs, CSV export, SLA badges, and the `ConciergeDetailSheet` shell — all the prior hardening passes — survived intact.
- Tours, Messages, Timeline, Decision, Intros, Match — every operational tab in the detail sheet stays. Only the admission flow was removed.
- `/admin/concierge/audit-review` and `/admin/concierge/metrics` (EKRA-required compliance surfaces) are unchanged.
- All historical DB rows in legacy states (`admission_in_progress` / `admitted` / `billed`) continue to render correctly under the new "Placed" visual stage and can be progressed via the trigger's existing transition rules.

---

## Verification

- `npx tsc --noEmit` → clean
- `npx vitest run` → 128 passed, 5 skipped (broken-links checker passes — all internal hrefs still resolve)
- `npx vite build` → built successfully in ~43s
- Edge function deployed: `admin-bulk-update-concierge-status` v2 (status whitelist matches DB enum)
- Backward-compat:
  - `/admin/inbox` → redirects to `/admin/concierge?tab=inbox`
  - `/admin/provider-directory` → redirects to `/admin/concierge?tab=directory`
  - `?tab=domestic` / `?tab=providers` are normalized to `cases` / `network`

---

## Files touched

```
DELETED:
  src/components/admin/concierge/AdmissionCoordinationCard.tsx

MODIFIED:
  src/App.tsx
  src/components/admin/ConciergeDetailSheet.tsx
  src/components/admin/adminNavConfig.ts
  src/components/admin/concierge/BulkConciergeStatusDialog.tsx
  src/components/admin/concierge/CaseSlaAlerts.tsx
  src/components/admin/concierge/ConciergeActionsTab.tsx
  src/components/admin/concierge/PlacementNextSteps.tsx
  src/components/admin/concierge/PlacementOpsDashboard.tsx
  src/components/admin/concierge/PlacementProgressStepper.tsx
  src/components/admin/concierge/placementActionUtils.ts
  src/components/admin/concierge/placementPipelineConfig.ts
  src/lib/statusTransitions.ts
  src/pages/admin/AdminConcierge.tsx
  src/pages/admin/AdvisorInbox.tsx
  src/pages/admin/AdvisorProviderDirectory.tsx
  supabase/functions/admin-bulk-update-concierge-status/index.ts

DOC:
  docs/admin-placements-rebuild-2026-05-20.md
```
