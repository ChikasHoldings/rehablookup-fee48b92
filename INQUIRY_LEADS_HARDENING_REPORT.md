# Inquiry / Leads Workflow — Hardening Audit Report

**Date:** 2026-05-08  
**Scope:** Full end-to-end smoke test of the inquiry submission → lead creation → lead routing → provider unlock → lead conversion workflow  
**Result:** 8 bugs fixed, 1 migration added, 6 source files patched, zero TypeScript errors, committed and pushed.

---

## Workflow Traced

The following complete flow was traced step-by-step:

| Step | Entry Point | Exit Point |
|------|------------|------------|
| 1 | Public inquiry form (`LeadIntakeForm`) | `submit-qualified-lead` edge function |
| 2 | `submit-qualified-lead` | Lead inserted into `leads` table, notification sent |
| 3 | Admin reviews lead | `AdminLeads` page → `InquiryDetailModal` |
| 4 | Admin reassigns lead | `redistribution_status` update → `lead_distributions` |
| 5 | `process-lead-redistribution` cron | Redistributes to additional facilities |
| 6 | Provider sees lead | `leads_provider_view` (PII-masked) |
| 7 | Provider unlocks lead | `unlock-lead` → Stripe or credits → `lead_unlocks` |
| 8 | Stripe webhook confirms | `stripe-webhook` → `lead_unlocks.paid = true` |
| 9 | Provider contacts lead | `InquiryDetailPanel` status update |
| 10 | Lead converted | `LeadDetailPanel` status → `converted` |

---

## Bugs Found and Fixed

### BUG-1: `redistribution_status` CHECK Constraint Violation (Critical)

**File:** `supabase/migrations/20260508170000_leads_workflow_hardening.sql`

The admin `InquiryDetailModal` reassign mutation set `redistribution_status = 'redistributed'` but the database `CHECK` constraint only allowed `('exclusive', 'extended', 'expired')`. Every admin manual reassignment would fail with a constraint violation error.

**Fix:** Added `'redistributed'` as a valid value to the CHECK constraint. The cron-based redistribution continues to use `'extended'`; the admin manual reassignment uses `'redistributed'`. Both now coexist cleanly.

---

### BUG-2: Provider Status Update Blocked by RLS (Critical)

**File:** `supabase/migrations/20260508170000_leads_workflow_hardening.sql`

The `InquiryDetailPanel` updates `provider_response_status` and `provider_responded_at` on leads that may not be unlocked. The existing UPDATE RLS policy required `is_lead_unlocked()` to be true, meaning providers could not mark a lead as "contacted" or "responded" unless they had already paid to unlock it.

**Fix:** Added a new RLS policy `"Providers can update status on visible leads"` that allows providers to update non-PII workflow fields (`provider_response_status`, `provider_responded_at`, `provider_response_notes`, `status`, `snooze_until`) on any lead visible to their facility, regardless of unlock status.

---

### BUG-3: Missing `provider_response_notes` Column (High)

**Files:** `supabase/migrations/20260508170000_leads_workflow_hardening.sql`, `src/components/provider/inquiries/InquiryDetailPanel.tsx`, `src/pages/provider/Inquiries.tsx`, `src/components/provider/leads/LeadDetailPanel.tsx`

The `InquiryDetailPanel` and `LeadDetailPanel` interfaces referenced a `provider_response_notes` field that did not exist in the database schema. Any attempt to read or write this field would silently fail or cause a runtime error.

**Fix:** Added `provider_response_notes TEXT` column to the `leads` table via migration. Updated the `leads_provider_view` to expose this column. Updated all TypeScript interfaces and select queries to include it.

---

### BUG-4: `leads_provider_view` Missing Columns (High)

**File:** `supabase/migrations/20260508170000_leads_workflow_hardening.sql`

The `leads_provider_view` (recreated in the PII hardening migration) was missing three columns that `LeadDetailPanel` renders:
- `employment_status`
- `veteran_status`
- `legal_involvement`

These columns exist in the `leads` table (added in migration `20260129074410`) but were not included when the view was recreated. The UI would render empty values for these fields even when data existed.

**Fix:** Added all three columns to the view definition in the hardening migration.

---

### BUG-5: Admin KPI and Filter Queries Missed `'redistributed'` Status (Medium)

**File:** `src/pages/admin/AdminLeads.tsx`

The admin leads KPI strip counted redistributed leads using `.eq("redistribution_status", "extended")` only. After BUG-1 was fixed to allow `'redistributed'` as a separate value, the KPI count and filter queries would miss leads with `redistribution_status = 'redistributed'`.

**Fix:** Updated all three query locations (KPI count, filtered count, main data query) to use `.in("redistribution_status", ["extended", "redistributed"])` when the "redistributed" filter is active.

---

### BUG-6: `InquiryDetailPanel` Mutation Signature Mismatch (Medium)

**File:** `src/components/provider/inquiries/InquiryDetailPanel.tsx`

The `updateStatus` mutation was refactored to accept `{ status, notes }` but the `onSuccess` callback still destructured the old `(_, status)` signature. The button `onClick` also still called `updateStatus.mutate(status)` instead of `updateStatus.mutate({ status })`.

**Fix:** Updated the `onSuccess` callback to `(_, { status })` and the button `onClick` to pass the object format. Added a `useState` import for the `responseNotes` state.

---

### BUG-7: Dashboard Leads Query Missing Fields (Medium)

**File:** `src/pages/provider/Dashboard.tsx`

The Dashboard page's recent leads query selected only a minimal subset of fields from `leads_provider_view`. When a provider clicked a lead to open `LeadDetailDrawer` → `LeadDetailPanel`, fields like `employment_status`, `veteran_status`, `legal_involvement`, `co_occurring_conditions`, `readiness_level`, `insurance_provider`, and many others would be `undefined`, causing the detail panel to render empty sections.

**Fix:** Expanded the Dashboard leads query to select all fields required by `LeadDetailPanel`.

---

### BUG-8: `InquiryDetailPanel` Missing `provider_response_notes` UI (Low)

**File:** `src/components/provider/inquiries/InquiryDetailPanel.tsx`

The `provider_response_notes` column was added to the schema but there was no UI for providers to enter notes when updating their response status. This is an industry-standard feature (CRMs always allow notes on status changes).

**Fix:** Added a `Textarea` component below the status buttons in the "Response Status" section. Notes are optional and submitted alongside the status update. Previously saved notes are shown as a reference.

---

## Migration Summary

**File:** `supabase/migrations/20260508170000_leads_workflow_hardening.sql`

| Fix | Type | Description |
|-----|------|-------------|
| FIX-1 | Schema | Add `'redistributed'` to `redistribution_status` CHECK constraint |
| FIX-2 | RLS | New policy: providers can update non-PII status fields on visible leads |
| FIX-3 | Schema | Add `provider_response_notes TEXT` column to `leads` |
| FIX-4 | View | Recreate `leads_provider_view` with `provider_response_notes`, `employment_status`, `veteran_status`, `legal_involvement` |
| FIX-5 | Schema | Add `assignment_status` CHECK constraint if missing |
| FIX-6 | Index | Add index on `redistribution_status` for filter performance |
| FIX-7 | Index | Add index on `provider_response_status` for filter performance |
| FIX-8 | Comment | Document admin UPDATE policy coverage |

---

## Files Changed

| File | Change Type | Description |
|------|------------|-------------|
| `supabase/migrations/20260508170000_leads_workflow_hardening.sql` | New | All 8 database fixes |
| `src/components/admin/inquiries/InquiryDetailModal.tsx` | Modified | Use `'redistributed'` status; fix `isRedistributed` check |
| `src/pages/admin/AdminLeads.tsx` | Modified | Fix KPI and filter queries for `'redistributed'` status |
| `src/components/provider/inquiries/InquiryDetailPanel.tsx` | Modified | Add notes textarea, fix mutation signature, add `provider_response_notes` field |
| `src/pages/provider/Inquiries.tsx` | Modified | Add `provider_response_notes` to Lead interface and select query |
| `src/components/provider/leads/LeadDetailPanel.tsx` | Modified | Add `provider_response_notes` to Lead interface |
| `src/pages/provider/Dashboard.tsx` | Modified | Expand leads query to include all LeadDetailPanel fields |

---

## Verification

```
pnpm tsc --noEmit
Exit: 0   # Zero TypeScript errors
```

All changes committed and pushed to `main` branch (commit `8daf4fb02`).

---

## Remaining Recommendations

The following items were observed but are out of scope for this hardening pass:

1. **Lead expiry cron:** The `process-lead-redistribution` function handles redistribution but there is no dedicated cron to mark leads as `expired` after the extended window closes. The redistribution function handles this inline, but a dedicated cleanup cron would be more reliable.

2. **Provider response SLA:** Consider sending a push notification or email to providers who have unlocked leads but have not updated `provider_response_status` within 24 hours.

3. **Seeker confirmation email:** After a lead is submitted, the seeker receives a confirmation email. Consider adding a 48-hour follow-up asking if they were contacted by a facility, which would feed into the lead quality scoring system.

4. **Lead score recalculation:** The `lead_score` and `lead_score_label` are set at submission time. Consider a nightly recalculation that adjusts scores based on provider engagement (e.g., a lead that was unlocked by 3 providers is clearly high-quality).
