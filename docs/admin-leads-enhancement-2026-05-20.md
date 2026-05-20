# /admin/leads — Targeted Enhancement + Hardening

**Date:** 2026-05-20
**Branch:** `claude/phase2-deployment-5WYOn`
**Verdict:** ✅ Page was structurally sound from prior monetization passes (zero broken queries, zero retired refs). This pass closes five concrete gaps that the deep audit surfaced.

---

## Audit headline

The `/admin/leads` surface emerged from the monetization rebuild + international retirement in **clean shape**:
- Every column the page SELECTs exists in the `leads` table schema (31/31)
- Zero references to dropped tables (`provider_credits`, `lead_unlocks`, `international_*`)
- Zero references to dropped columns (`unlock_count`, `lead_limit_override`, etc.)
- RLS policies on `leads` are admin-aware and audit-trailing exists for reassigns

The audit found **one real bug** (silent dropdown cap), **two missing capabilities** (audit logging for flag/contacted, concierge-queue awareness), and **two UX gaps** (CSV export incomplete, no SLA visibility). All five were closed in this pass.

I disagreed with one auditor recommendation (adding a `crisis_flag` column to the `leads` table): leads come from facility inquiry forms which don't ask about suicidal ideation. Crisis flagging lives on `concierge_inquiries` where the `suicideHistory` question exists. Adding the column to `leads` would be dead weight.

---

## What changed

### 1. Facilities dropdown — silent cap removed
**File:** `src/components/admin/inquiries/InquiryDetailModal.tsx:457`

**Before:** `facilities.slice(0, 100).map(...)` — the admin's reassign-lead picker silently truncated to the first 100 facilities. Any org with >100 listings would lose facilities from the picker with no error or warning.

**After:** `facilities.map(...)` — renders all approved facilities. The upstream query already caps at 2,000 (and filters to `status='approved'`), so the picker shows the same universe as the table. Comment explains the design.

**Why it matters:** A real bug that could cause "facility X is missing from the reassign dropdown" support tickets that were impossible to debug from the UI.

### 2. CSV export — 8 new columns
**File:** `src/lib/csvExport.ts`

The page already SELECTs all 31 columns of the lead row but the export shipped only 17. Added 8 fields ops actually needs for cohort analysis:

| Added column | Why |
|--------------|-----|
| `age_range` | Demographic cohort analysis |
| `gender` | Demographic cohort analysis |
| `inquiry_type` | Filter by request_info vs request_callback vs tour_request |
| `preferred_contact` | Outreach prioritization |
| `quality_flag` | Spam/dupe/test/low-quality filters |
| `redistribution_status` | Exclusive vs redistributed analysis |
| `provider_response_status` | "Did the provider respond?" cohort |
| `provider_responded_at` | SLA / response-time analysis |

Updated the format-specific switch to title-case the new enum-shaped columns and date-format the new timestamp column.

### 3. Audit logging — closed two gaps
**File:** `src/components/admin/inquiries/InquiryDetailModal.tsx`

Previously, only **lead reassignment** wrote to `admin_audit_log`. Two other admin mutations on the same page wrote silently:
- **Mark contacted** (sets `provider_response_status='contacted'`) — admin nudges to a provider's status had no audit trail
- **Flag issue** (sets `quality_flag` to spam/duplicate/low_quality/test/invalid_contact) — quality triage decisions had no audit trail

Now both write to `admin_audit_log` with structured `action_type` (`lead_marked_contacted`, `lead_quality_flag_changed`) + `details` JSONB capturing the previous + new value. The audit writes are wrapped in try/catch so a log-write failure doesn't bubble up and fail the mutation (the data write is the source of truth; the log is supplementary).

**Why it matters:** When an admin asks "who changed this lead's status?" or "who flagged this as spam?", the audit trail can now answer. Previously only reassignments were traceable.

### 4. Concierge-queue awareness banner
**File:** `src/pages/admin/AdminLeads.tsx`

The audit's "single most painful thing" finding: the leads table holds only Pro-tier inquiries (`submit-qualified-lead` → leads table when facility is Pro). Free / Unclaimed facility inquiries route to `concierge_inquiries` with `routing_mode='free_tier_redirect'` and don't appear here at all. An admin landing on `/admin/leads` has no visual cue that a parallel pipeline exists at `/admin/concierge`.

Added a thin violet-bordered banner above the KPI cards that:
- Queries `concierge_inquiries` for `status NOT IN (closed,completed)` counts
- Renders only when there's at least one open concierge inquiry (collapses on a quiet day)
- Calls out specifically how many came from `routing_mode='free_tier_redirect'` (the Free-tier facility inquiries that bypassed this page)
- "Open concierge queue" CTA links to `/admin/concierge`

Refreshes every 60s alongside the existing KPI polling.

**Why it matters:** Closes the cognitive split between the two parallel inquiry pipelines. Admins now see at a glance that they need to check both pages.

### 5. SLA visibility — stale-lead badges in the table
**File:** `src/pages/admin/AdminLeads.tsx`

Added an inline amber badge next to the Status column that surfaces when:
- `provider_response_status` is anything other than `'contacted'`
- Lead status is not terminal (`closed`/`expired`/`converted`)
- More than 24h have elapsed since `assigned_at` (or `created_at` if never assigned)

The badge shows `Xh` for under-72h staleness and `Xd` for older. Tooltip on hover: "No provider response in {N}h".

**Why it matters:** Admin can now scan a page of leads and immediately see which ones the provider hasn't followed up on. Previously the admin had to open each row's detail modal to see the response status.

---

## What I intentionally did NOT do

| Item | Why |
|------|-----|
| Add `crisis_flag` to leads table | Crisis flagging is for concierge intakes (suicide_history form question). Leads come from facility inquiry forms which don't ask. Would be dead weight. |
| Replace 30s polling with realtime | Audit flagged this as a possible scale issue, but PII safety on the leads table is the documented reason polling is used. The volume is well within what 30s polling supports. |
| User-configurable column sort | Genuinely useful but more invasive than this surgical pass. Page locks to `created_at DESC` for now. Adding multi-column sort needs a refactor of the URL state + the query builder. |
| "Resend facility notification" button | Requires a new edge function (or hook into the existing notification pipeline). Worth doing later but out of scope here. |
| Bulk reassign | High-value but a different UX surface (multi-select → action sheet). Worth a dedicated pass. |
| Mobile-card layout | Page uses `overflow-x-auto` for mobile; works but isn't elegant. Out of scope. |

---

## CI gate results

| Check | Result |
|-------|--------|
| `npx tsc --noEmit` | ✅ clean |
| `npx vitest run` | ✅ 128 passed / 5 skipped |
| `npx vite build` | ✅ built in 38.76s |
| Live DB check: `admin_audit_log.action_type` is freeform text | ✅ confirmed (no enum constraint blocks new types) |

---

## Files changed

| File | Change | LOC |
|------|--------|-----|
| `src/components/admin/inquiries/InquiryDetailModal.tsx` | Remove silent 100-facility cap; add audit logging for mark-contacted + flag mutations | +30/−1 |
| `src/lib/csvExport.ts` | Add 8 missing fields to LeadExportData type + column list + formatter switch | +20 |
| `src/pages/admin/AdminLeads.tsx` | Concierge-backlog query + banner; SLA staleHours computation + amber badge inline next to StatusBadge; Link + UserCheck imports | +60 |
| `docs/admin-leads-enhancement-2026-05-20.md` | This file | +new |

**Net: ~110 LOC of value-additive code, no rebuild, no breakage.**

---

## Acceptance criteria

| Criterion | Status |
|-----------|--------|
| Silent facility-dropdown cap removed | ✅ |
| CSV export carries every column needed for cohort/quality/SLA analysis | ✅ |
| Every admin mutation on a lead leaves an `admin_audit_log` row | ✅ |
| Admin can't lose sight of the parallel concierge pipeline | ✅ banner + CTA |
| Admin can scan for stale (no-response) leads at a glance | ✅ inline SLA badge |
| No regressions to existing functionality | ✅ tsc + vitest + vite-build clean |
| Page remains aligned to current monetization (no retired refs) | ✅ verified by prior audits + this audit |

---

## Smoke verdict

🟢 **Ship-ready.** `/admin/leads` is now harder (audit-trail complete, no silent data loss in pickers), more useful for ops (CSV export carries the data they need, SLA staleness is visible, concierge queue is one click away), and structurally unchanged otherwise. No rebuild required — the page was already well-architected.
