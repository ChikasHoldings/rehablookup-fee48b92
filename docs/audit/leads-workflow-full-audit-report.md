# Leads Workflow End-to-End Audit Report

**Date:** May 8, 2026  
**Scope:** Full inquiry/leads pipeline — submission → conversion → PII enforcement → unlock → admin management  
**Commit:** `b56f956b4`

---

## Executive Summary

The leads workflow is the platform's primary monetization engine. This audit examined every layer — from public form submission through database storage, view masking, provider access, unlock payment, and admin management. **Three critical PII vulnerabilities were found and fixed**, along with several hardening improvements.

---

## Architecture Overview

```
Public Form → submit-qualified-lead (edge fn) → leads table (raw PII)
                                                       ↓
                                              leads_provider_view (masked PII)
                                                       ↓
                                              Provider Dashboard (UI)
                                                       ↓
                                              unlock-lead (edge fn) → lead_unlocks table
                                                       ↓
                                              Full PII revealed in UI + email
```

**Key design principles:**
- PII (name, email, phone, message) is stored in the raw `leads` table
- Providers access leads through `leads_provider_view` which masks PII for locked leads
- Unlocking requires credit payment (dynamic Smart Score pricing)
- The `unlock-lead` edge function handles atomic credit deduction + unlock record creation

---

## Critical Issues Found & Fixed

### 1. Direct Table Query Bypasses View Masking (CRITICAL)

**Problem:** The `leads` table had a permissive RLS SELECT policy ("Owners can view their facility leads") that allowed providers to query the raw table directly via Supabase client, bypassing the view's PII masking. A technically savvy provider could execute:

```js
supabase.from("leads").select("name, email, phone").eq("facility_id", myFacilityId)
```

...and receive full PII without paying for an unlock.

**Root cause:** The `20260501` migration added `security_invoker=true` to the view AND created a permissive SELECT policy without an unlock check. The intent was for the view to handle masking, but the raw table remained accessible.

**Fix:**
- Removed `security_invoker` from the view (view now runs as owner/postgres, bypasses RLS)
- Added `REVOKE SELECT (name, email, phone, message) ON public.leads FROM authenticated, anon`
- View's own WHERE clause + `current_auth_uid()` (SECURITY DEFINER) handles row filtering
- View's CASE expressions handle PII masking based on unlock status

### 2. Facility Notification Email Leaks Message Content (CRITICAL)

**Problem:** The facility notification email included a `messageExcerpt` from the seeker's free-text message field. Seekers frequently include phone numbers, email addresses, or full names in their messages, effectively giving providers PII without paying for an unlock.

**Fix:** Replaced the message excerpt with a locked notice:
> "📝 Personal message included — This lead included a personal message. Unlock the lead in your dashboard to read it."

### 3. View Exposed Additional PII Fields Without Unlock (HIGH)

**Problem:** The `leads_provider_view` exposed `previous_treatment_details` and `best_time_to_call` without masking. These free-text fields can contain doctor names, facility names, and scheduling information that should be gated behind unlock.

**Fix:** Added CASE masking for both fields — they now return `NULL` for locked leads.

---

## Hardening Improvements

| Change | File | Purpose |
|--------|------|---------|
| `.select("id")` instead of `.select("*")` | `RequestInfoModal.tsx` | Prevents column permission errors with new REVOKE |
| Added `lead_expired_at` timestamp | `process-lead-redistribution/index.ts` | Analytics tracking for lead expiry timing |
| `REVOKE ALL FROM PUBLIC/anon` on view | Migration | Prevents anonymous access to the view |
| Dropped redundant restrictive policy | Migration | Cleanup — was superseded by permissive policy |

---

## Audit Results by Layer

### Layer 1: Public Lead Submission ✅

| Check | Status | Notes |
|-------|--------|-------|
| Input validation (name, email, phone) | ✅ PASS | Server-side regex + sanitization |
| HTML/XSS stripping | ✅ PASS | `sanitizeMessage()` strips all HTML tags |
| UUID validation (facilityId) | ✅ PASS | Regex check before DB query |
| Duplicate detection (24h window) | ✅ PASS | Email + phone dedup per facility |
| Idempotency key | ✅ PASS | Prevents double-submission |
| Blocked identifier check | ✅ PASS | Silent rejection (doesn't reveal blocking) |
| Rate limiting | ✅ PASS | Per-IP and per-facility monthly limits |
| Enum validation | ✅ PASS | Rejects invalid urgency/source/contact values |
| Email verification | ✅ PASS | Server-side verification check |

### Layer 2: Database Security ✅

| Check | Status | Notes |
|-------|--------|-------|
| RLS enabled on leads | ✅ PASS | All policies properly scoped |
| Column-level REVOKE on PII | ✅ FIXED | name, email, phone, message revoked from authenticated/anon |
| View security_barrier | ✅ PASS | Prevents predicate pushdown attacks |
| View runs as owner | ✅ FIXED | Removed security_invoker, view bypasses RLS |
| INSERT policy (service_role only) | ✅ PASS | Edge function uses service_role |
| UPDATE policy (unlock required) | ✅ PASS | `is_lead_unlocked()` check in USING clause |
| Admin policy (has_role check) | ✅ PASS | Only admins can SELECT/UPDATE all leads |
| Realtime disabled for leads | ✅ PASS | Prevents PII broadcast via websocket |

### Layer 3: Provider View & UI ✅

| Check | Status | Notes |
|-------|--------|-------|
| All provider queries use view | ✅ PASS | No `.from("leads").select(PII)` in provider code |
| Name masking (locked) | ✅ PASS | Shows "J*** D." pattern |
| Email masking (locked) | ✅ PASS | Shows "••••@••••.•••" |
| Phone masking (locked) | ✅ PASS | Shows "(•••) •••-••••" |
| Message hidden (locked) | ✅ PASS | Returns NULL |
| previous_treatment_details hidden | ✅ FIXED | Now returns NULL for locked leads |
| best_time_to_call hidden | ✅ FIXED | Now returns NULL for locked leads |
| is_unlocked flag | ✅ PASS | Computed per-user in view |

### Layer 4: Unlock Flow ✅

| Check | Status | Notes |
|-------|--------|-------|
| Authentication required | ✅ PASS | JWT validation |
| Facility ownership verification | ✅ PASS | user_id match check |
| Rate limiting (20/hour) | ✅ PASS | Per-facility hourly cap |
| Idempotency (double-unlock prevention) | ✅ PASS | Checked twice (before + after deduction) |
| Atomic credit deduction | ✅ PASS | `.gte(balance, price)` guard |
| Rollback on failure | ✅ PASS | `increment_provider_credits` RPC |
| Outer-catch safety net | ✅ PASS | Refunds on any uncaught exception |
| Admin notification on rollback failure | ✅ PASS | `admin_notifications` insert |
| Dynamic pricing from DB | ✅ PASS | Reads `platform_settings` |
| Pro discount applied correctly | ✅ PASS | 20% off, configurable |
| Redistributed leads flat $15 | ✅ PASS | No discount on redistributed |
| PII only in success response | ✅ PASS | Full lead data returned after unlock |

### Layer 5: Notification Emails ✅

| Check | Status | Notes |
|-------|--------|-------|
| Facility notification (new lead) | ✅ FIXED | Message excerpt removed, replaced with locked notice |
| Seeker confirmation | ✅ PASS | Shows their own data back to them (appropriate) |
| Unlock confirmation (to provider) | ✅ PASS | No PII in email, directs to dashboard |
| First name in subject line | ✅ ACCEPTABLE | First name only (e.g., "John") for engagement |

### Layer 6: Admin Management ✅

| Check | Status | Notes |
|-------|--------|-------|
| Admin queries raw table | ✅ PASS | Appropriate for admin role |
| Admin RLS policy | ✅ PASS | `has_role(auth.uid(), 'admin')` |
| Admin can see full PII | ✅ PASS | Required for support/moderation |

### Layer 7: Lead Redistribution ✅

| Check | Status | Notes |
|-------|--------|-------|
| Exclusive window (48h) | ✅ PASS | Original facility gets first access |
| Extended window (72h) | ✅ PASS | Redistributed to nearby facilities |
| Expiry handling | ✅ FIXED | Now sets `lead_expired_at` timestamp |
| Distribution access check | ✅ PASS | `lead_distributions` table verified in unlock |
| Redistributed pricing ($15 flat) | ✅ PASS | No Pro discount on redistributed |

---

## Remaining Considerations (No Action Required)

1. **`useUnlockPricing.ts` defaults ($39/$49):** These are fallback values only used if `platform_settings` DB query fails. The actual prices are dynamic and DB-driven.

2. **`ProviderROICalculator.tsx` ($39 reference):** Marketing comparison figure for the ROI calculator page. Not a pricing leak.

3. **`submit-qualified-lead` uses service_role:** This is correct — the edge function needs to insert into the leads table and send emails. The function validates all inputs server-side before insertion.

4. **`lead_score` and `credit_cost` computed by DB trigger:** Not settable from client input. Correctly computed server-side after insertion.

---

## Files Changed

| File | Change Type |
|------|-------------|
| `supabase/migrations/20260508130000_harden_leads_pii_protection.sql` | NEW — PII hardening migration |
| `supabase/functions/submit-qualified-lead/index.ts` | MODIFIED — Removed message from email |
| `supabase/functions/process-lead-redistribution/index.ts` | MODIFIED — Added expiry timestamp |
| `src/components/profile/RequestInfoModal.tsx` | MODIFIED — Fixed count query |
| `docs/audit/leads-workflow-audit.md` | NEW — Audit notes |
