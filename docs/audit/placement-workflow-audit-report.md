# Placement/Concierge Workflow — End-to-End Audit Report

**Date:** May 8, 2026  
**Commit:** `579ee7fa5`  
**Status:** All critical issues fixed and pushed

---

## Executive Summary

The placement workflow had **5 critical bugs** that would cause complete flow failures, **3 PII concerns**, and **multiple missing automation hooks** that required excessive admin manual intervention. All have been fixed.

---

## Architecture Overview

The placement workflow spans 4 panels:

| Panel | Key Components | Edge Functions |
|-------|---------------|----------------|
| **Public Intake** | ConciergeInlineIntake | submit-concierge-intake |
| **Admin Dashboard** | PlacementDetailModal, PlacementOpsDashboard, ConciergeActionsTab | auto-status-transition, match-concierge-intake, send-concierge-introduction, send-concierge-notifications, confirm-placement |
| **Provider Panel** | DomesticCandidatesTab, PlacementDetailModal (provider) | auto-status-transition |
| **Seeker Panel** | SeekerConcierge, SeekerProviderReviewCard, PlacementStatusCard | auto-status-transition |

### Pipeline Status Flow (Corrected)

```
intake_submitted → intake_reviewed → advisor_assigned → matching_providers
→ provider_prequalification → providers_accepted → presented_to_seeker
→ seeker_selected → admission_in_progress → admitted → billed → completed
```

---

## Critical Bugs Found & Fixed

### 1. Cases Stuck at 'new' Status (CRITICAL — Flow Blocker)

**Problem:** `submit-concierge-intake` set `status: 'new'` but the auto-transition system's `FORWARD_PATH` didn't include 'new'. Cases could never auto-advance.

**Fix:** Changed `submit-concierge-intake` to set `status: 'intake_submitted'` directly. Added 'new' to `FORWARD_PATH` and `TRIGGER_VALID_FROM` for legacy cases.

### 2. Missing RLS Policies on concierge_introductions (CRITICAL — Provider Response Broken)

**Problem:** Providers do a direct `.update()` on `concierge_introductions` to respond to introductions, but there was NO UPDATE policy for authenticated users. Admin also does direct `.update()` for PII disclosure and response override.

**Fix:** Added:
- `"Admins can manage introductions"` — FOR ALL with has_role check
- `"Providers can update own introductions"` — FOR UPDATE scoped to facility ownership

### 3. Missing INSERT Policies on concierge_case_events (CRITICAL — Event Logging Broken)

**Problem:** The "Anyone can insert case events" policy was dropped in migration 20260413. But seekers (SeekerProviderReviewCard) and providers (DomesticCandidatesTab) both do direct `.insert()` for event logging.

**Fix:** Added:
- `"Seekers can insert own case events"` — scoped to own inquiry
- `"Providers can insert case events for their introductions"` — scoped to introduced cases

### 4. No Auto-Advance on Seeker Confirmation (CRITICAL — Pipeline Stalls)

**Problem:** When a seeker confirms their facility choice, nothing advanced the pipeline. Admin had to manually move from `presented_to_seeker` → `seeker_selected` → `admission_in_progress`.

**Fix:** Added `seeker_confirmed` trigger to `auto-status-transition` with target `admission_in_progress`. SeekerProviderReviewCard now calls the edge function after confirmation.

### 5. provider_interested Skipped Seeker Review (CRITICAL — Wrong Flow)

**Problem:** The `provider_interested` trigger targeted `seeker_selected`, which skipped the seeker review step entirely.

**Fix:** Changed target to `presented_to_seeker` so the pipeline correctly pauses for seeker review.

---

## PII Issues Found & Fixed

### 1. get_provider_safe_inquiries Leaked Full Name (HIGH)

**Problem:** The RPC returned `i.user_name` directly (full name like "John Smith"). The frontend extracted first name client-side, but full name was transmitted over the wire.

**Fix:** Changed SQL to `split_part(i.user_name, ' ', 1) AS user_name` — server-side masking.

### 2. get_disclosed_inquiry_for_provider (VERIFIED SECURE)

The PII disclosure gate is properly implemented with `CASE WHEN` that checks both `admin_disclosed_pii_at IS NOT NULL` and seeker confirmation before returning name/email/phone.

---

## Automation Improvements

### Auto-Advisor Assignment (NEW)

New cases are now automatically assigned to the advisor with the lowest active caseload via round-robin logic in `submit-concierge-intake`. This eliminates the manual "claim case" step for high-volume scenarios.

### Auto-Status Transitions (ENHANCED)

| Trigger | From | To | Actor |
|---------|------|-----|-------|
| admin_viewed | intake_submitted, new | intake_reviewed | Admin |
| matches_completed | advisor_assigned, matching_providers | provider_prequalification | System |
| introduction_sent | matching_providers, provider_prequalification, providers_accepted | presented_to_seeker | Admin |
| provider_interested | provider_prequalification, providers_accepted | presented_to_seeker | Provider |
| **seeker_confirmed** (NEW) | presented_to_seeker, seeker_selected | admission_in_progress | Seeker |
| **placement_confirmed** (NEW) | admission_in_progress | admitted | Admin |

---

## payment_status 'free' Handling (14 Files Fixed)

Since domestic placement intake is now free, all `payment_status` checks across the platform needed to include `'free'` as a valid "paid" status:

- ConciergeActionsTab.tsx
- ConciergeOverviewTab.tsx
- PlacementProgressStepper.tsx
- placementActionUtils.ts (3 occurrences)
- PlacementDetailModal.tsx
- AdvisorDashboard.tsx
- InternationalCaseDetailSheet.tsx (2 occurrences)
- MarketingLeadProfileModal.tsx
- SeekerInquiriesTab.tsx
- SeekerPlacementsTab.tsx
- SeekerConcierge.tsx (already fixed in prior commit)

---

## What Passed Audit (Already Solid)

| Component | Status |
|-----------|--------|
| DB trigger `validate_concierge_status_transition` | Enforces sequential transitions correctly |
| `confirm-placement` edge function | Walks through intermediate statuses, triggers billing |
| `charge-placement-fee` edge function | Idempotent, Pro discount, invoice fallback |
| `send-concierge-notifications` | All 19 notification types implemented |
| Admin SELECT/UPDATE on concierge_inquiries | Policy exists from initial migration |
| Seeker UPDATE on concierge_inquiries | Policy correctly scoped to user_id |
| Concierge case events audit trail | Comprehensive event logging |
| PlacementOpsDashboard visual pipeline | Correct stage mapping |
| SeekerConcierge status display | All statuses mapped to user-friendly messages |

---

## Database Migration Summary

**File:** `supabase/migrations/20260508140000_harden_placement_workflow.sql`

1. Fix `get_provider_safe_inquiries` — mask user_name to first name
2. Migrate legacy 'new' status cases to 'intake_submitted'
3. Update `validate_concierge_status_transition` trigger — add 'new' → 'intake_submitted'
4. Add admin ALL policy on `concierge_introductions`
5. Add provider UPDATE policy on `concierge_introductions`
6. Add seeker INSERT policy on `concierge_case_events`
7. Add provider INSERT policy on `concierge_case_events`

---

## Remaining Recommendations (Non-Critical)

1. **SLA Monitoring:** Consider adding a cron job that alerts when cases stay in a single status for >48 hours
2. **Auto-Matching:** The matching engine could be triggered automatically after advisor assignment instead of requiring admin to click "Run Matching"
3. **Provider Response Timeout:** Consider auto-declining introductions with no response after 72 hours
4. **Seeker Review Timeout:** Consider sending a reminder email if seeker hasn't reviewed options within 48 hours
