# `/admin/concierge` — Post-Rebuild Hardening Pass

**Date:** 2026-05-20
**Branch:** `claude/phase2-deployment-5WYOn`
**Verdict:** ✅ Unified Placements workspace fully hardened. Workflow now truly terminates at `seeker_selected` ("Placed") under the current monetization model. No remaining paths push cases into the retired admission/billing states.

---

## Why this pass

The prior rebuild deleted the admission UI components but left a few backend + edge-case paths that would still push cases through the legacy admission states under specific user actions:

1. The seeker-side "I confirm this facility" action fired `auto-status-transition` with trigger `seeker_confirmed`, which the edge function translated to `admission_in_progress` (the retired state).
2. `StageActionBar` rendered an "Advance" button for `seeker_selected` cases that would push them forward into `admission_in_progress`.
3. `ConciergeOverviewTab` rendered labels "Admitting" / "Admitted" / "Billed" for cases in legacy states, instead of showing them as the unified "Placed" terminal label.

This pass closes those paths.

---

## Issues closed

### P0 — workflow leaks into the retired admission flow

1. **`auto-status-transition` v5 (deployed)** — `TRIGGER_TARGET`:
   - `seeker_confirmed`: `admission_in_progress` → **`seeker_selected`**
   - `placement_confirmed`: `admitted` → **`seeker_selected`** (kept as a legacy alias for any external callers)
   - `getTimestampFields` now stamps `placement_confirmed = true` + `placement_confirmed_at = now()` when reaching `seeker_selected`, so dashboard widgets that previously read the legacy `admitted` flag now see the new state. Version bumped to 5.0.0. Edge function ID `4f1a75ad-c692-484f-9204-cedfe641c4c7` redeployed.

2. **`StageActionBar`** — rebuilt to recognize `seeker_selected` (and the legacy `admission_in_progress` / `admitted` / `billed`) as terminal "Placed" states. The bar now renders a clean "Placed — close case when follow-up is complete" panel with a single "Close case" button that jumps to the Actions tab, instead of the previous "Advance" button that would have pushed the case into the retired admission flow. The dead `isAdmissionAdvance` code path and the orphaned `onSwitchTab("admission")` reference (the admission tab was removed in the rebuild) are gone.

### P1 — stale labels and guards

3. **`ConciergeOverviewTab.tsx`** — `STATUS_LABELS`: dropped "Admitting" / "Admitted" / "Billed" labels for the legacy statuses; they now all read **"Placed"** so historical rows render under the unified label. `isPlaced` predicate updated to include `seeker_selected` (the new terminal "Placed" state) alongside the legacy admission states it already included.

4. **`ConciergeActionsTab.tsx`** — `updateCaseMutation` previously had a brittle `caseData.status === 'admitted' || caseData.status === 'completed'` guard that didn't recognize the new `seeker_selected` terminal state. Replaced with a `terminalStates` Set covering `seeker_selected` + legacy admission states + `completed`. Error message updated to: *"This case is already placed. Close the case instead of changing status."*

### P2 — cache namespace + a11y polish

5. **`AdvisorProviderDirectory.tsx`** — query keys renamed from generic `["advisor-providers", …]` and `["advisor-provider-counts"]` to namespaced `["admin-concierge-directory", …]` and `["admin-concierge-directory-counts"]`. Prevents cache collision now that the component is embedded as a tab inside the unified Placements workspace (where other queries may share the broad `advisor-` prefix).

6. **`ConciergeDetailSheet.tsx`** — added `aria-label={tab.label}` to all 9 `TabsTrigger` elements. On mobile the text label is `hidden sm:inline` (icon-only), so a screen reader previously saw 9 nameless buttons.

---

## False positives in the audit (no fix needed, verified in code)

- **"Realtime channel not cleaned up on tab switch"** — `AdminConcierge.tsx:177` already has `return () => { supabase.removeChannel(channel); };` in the effect cleanup.
- **"routing_mode column not selected"** — already in the SELECT at `AdminConcierge.tsx:185`.
- **"BulkConciergeStatusDialog missing `error` check before `data?.error`"** — code already has `if (error) throw error; if (data?.error) throw new Error(data.error);` at lines 65-66.
- **"AdvisorInbox polls while tab hidden"** — Radix Tabs (shadcn) unmounts inactive `TabsContent` by default, so the embedded inbox + directory components only mount + run their queries when their tab is the active one.
- **"Hardcoded BulkConciergeStatusDialog options should validate against VALID_TRANSITIONS"** — the dialog options already correspond to the real `CONCIERGE_STATUSES` enum (fixed in the prior pass). The DB trigger remains the authoritative gate; the dialog is a UX shortcut.

---

## Verification

- `npx tsc --noEmit` → clean
- `npx vitest run` → 128 passed, 5 skipped
- `npx vite build` → built successfully in ~37s
- Edge function deploy: `auto-status-transition` v5 (id `4f1a75ad-c692-484f-9204-cedfe641c4c7`) — ACTIVE
- Live DB check: confirmed the 5 current `concierge_inquiries` rows all use real workflow statuses (`intake_submitted`, `matching_providers`, `pending_intake`, `seeker_selected`); no `intros_sent` / `seeker_confirmed` / `placed` ghost values from the old broken dialog.

---

## Behavioural guarantees

1. **Workflow terminates at `seeker_selected`.** A seeker confirming their chosen facility on the seeker side fires `auto-status-transition` with `seeker_confirmed`, which now lands the case at `seeker_selected` (rendered as "Placed"). No more silent push into `admission_in_progress`.
2. **No dead UI affordances.** The `StageActionBar` Advance button cannot push a case into a retired state — for the new terminal "Placed" state it renders a Close button instead.
3. **Legacy rows still display correctly.** Historical cases at `admission_in_progress` / `admitted` / `billed` render under the unified "Placed" label everywhere (overview, list, ops dashboard, stepper). The DB enum still accepts the values for backward-compat, and the StageActionBar offers the same Close button so admins can clear them.
4. **`placement_confirmed_at` stamp stays consistent.** Reaching the new terminal state via the auto-status-transition fn stamps both `placement_confirmed=true` AND `placement_confirmed_at=now()` — same as the previous `admitted` behavior — so downstream widgets reading these columns keep working.

---

## Files touched

```
MODIFIED:
  src/components/admin/ConciergeDetailSheet.tsx              — aria-label on TabsTriggers
  src/components/admin/concierge/ConciergeActionsTab.tsx     — terminal-states Set guard
  src/components/admin/concierge/ConciergeOverviewTab.tsx    — legacy labels collapse to "Placed"; isPlaced updated
  src/components/admin/concierge/StageActionBar.tsx          — rebuilt: Placed terminal branch + a11y; dead "Confirm Admission" code removed
  src/pages/admin/AdvisorProviderDirectory.tsx               — query keys namespaced under admin-concierge-directory
  supabase/functions/auto-status-transition/index.ts         — v5: seeker_confirmed targets seeker_selected; placement_confirmed deprecated path; new timestamp stamps

EDGE FN DEPLOYED:
  auto-status-transition v5.0.0 (id 4f1a75ad-c692-484f-9204-cedfe641c4c7)

DOC:
  docs/admin-concierge-post-rebuild-hardening-2026-05-20.md
```
