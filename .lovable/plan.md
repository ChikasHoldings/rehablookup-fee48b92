# Provider Panel Audit & Hardening Plan

## Executive Summary

This audit covers the Provider panel updates, facility limit enforcement, lead locking/unlocking mechanics, and data leak prevention across the frontend, backend, and database layers. Several areas require attention to ensure full compliance with the new Free/Pro monetization model.

---

## ✅ COMPLETED PHASES

### Phase 1: Frontend Leak Prevention ✅ DONE

**Task 1.1: Secure LeadDetailPanel** ✅
- Added `useLeadUnlocks` hook integration
- Contact info (phone, email) now masked for locked leads
- Shows `UnlockLeadButton` for locked leads
- Uses `getLeadDisplayInfo()` from `src/lib/leadMasking.ts`

**Task 1.2: Secure LeadDetailDrawer** ✅
- Same pattern as LeadDetailPanel
- Contact section shows locked state UI with masked data
- Includes `UnlockLeadButton` component

**Task 1.3: Secure Inquiries Page** ✅
- Uses `getLeadDisplayInfo()` for proper masking
- Displays masked names for locked leads in cards
- Correctly integrates with `useLeadUnlocks` hook

**Task 1.4: Audit MobileLeadCard** ✅
- Updated to use masking utilities from `leadMasking.ts`
- Properly masks phone and email for locked leads

### Phase 2: Database Security Hardening ✅ DONE

**Task 2.1: Created Masked Leads View** ✅
- `leads_provider_view` created with `security_invoker = on`
- Automatically masks name, email, phone for locked leads
- Uses existing `is_lead_unlocked()` function for checks
- Exposes `is_unlocked` boolean field

**Task 2.2: Security Definer Function** ✅
- `get_unlocked_lead_data()` function created
- Only returns full data if lead is unlocked
- Raises exception if attempting to access locked lead

### Phase 3: Frontend Integration Updates ✅ DONE

**Task 3.1: Masking Utility Created** ✅
File: `src/lib/leadMasking.ts`

Functions implemented:
- `maskLeadName(name)` - "John Smith" → "John S."
- `maskEmail(email)` - "john@example.com" → "j●●●@●●●.com"
- `maskPhone(phone)` - Always returns "(●●●) ●●●-●●●●"
- `getMaskedInitials(name, isLocked)` - Returns "??" for locked
- `getLeadDisplayInfo(lead, isUnlocked)` - Returns complete masked/unmasked display object

### Phase 4: Edge Function Verification ✅ DONE

**Audited Functions:**
- `send-lead-confirmation` ✅ - Sends to seeker, not provider (no PII leak)
- `send-lead-email` ✅ - Uses unlock check before showing contact
- `send-sms-notification` ✅ - Params come from verified sources
- `submit-qualified-lead` ✅ - Only assigns leads, doesn't expose PII in emails
- `_shared/email-templates.ts` ✅ - Has `maskLeadName()` utility already

---

## Current State Summary

### What's Working Well

1. **Facility Limits Hook** (`useFacilityLimits.ts`)
   - Centralized limit enforcement: Free = 1 facility, Pro = 5 facilities
   - Properly integrated into `Dashboard.tsx`, `AddLocation.tsx`, `ProviderHeader.tsx`

2. **Lead Unlock System**
   - `useLeadUnlocks.ts` - Tracks which leads are unlocked
   - `useUnlockPricing.ts` - Dynamic pricing with Pro 20% discount
   - `unlock-lead` edge function - Secure credit deduction and unlock record creation
   - `UnlockLeadButton.tsx` - UI component with proper pricing display

3. **Email Masking in Edge Functions**
   - `send-lead-digest`, `send-followup-reminders`, `send-weekly-digest` all use `maskLeadName()` from shared templates
   - Contact details hidden with "Unlock to view" messaging
   - Notification metadata excludes full contact info

4. **Pro Status Detection**
   - `useProStatus.ts` - Queries `pro_subscriptions` table correctly
   - `_shared/email-templates.ts` - `getProviderPlan()` maps legacy Stripe IDs to Pro

5. **Frontend Masking** ✅ NEW
   - All lead detail components mask contact info for locked leads
   - Utility functions in `src/lib/leadMasking.ts`
   - Consistent "●" pattern for masked data

6. **Database-Level Protection** ✅ NEW
   - `leads_provider_view` automatically masks sensitive columns
   - `get_unlocked_lead_data()` function for secure full data access

---

## Testing Checklist

```text
Test Scenarios:
[x] Free user can only add 1 facility
[x] Pro user can add up to 5 facilities  
[x] AddLocation shows upgrade prompt at limit
[x] New leads display as "Locked" in UI
[x] Locked leads show masked name, email, phone
[x] Click on locked lead shows masked contact info
[x] Unlock button shows correct price (Pro discount applied)
[x] After unlock, full contact info visible
[x] Email notifications mask contact info
[x] Database view masks data for locked leads
[ ] Dashboard metrics work correctly (manual test)
[x] Pro badge displays correctly
```

---

## Files Changed

| File | Status | Change Type |
|------|--------|-------------|
| `src/lib/leadMasking.ts` | ✅ CREATED | Masking utilities |
| `LeadDetailPanel.tsx` | ✅ UPDATED | Add unlock check |
| `LeadDetailDrawer.tsx` | ✅ UPDATED | Add unlock check |
| `Inquiries.tsx` | ✅ UPDATED | Verify unlock check |
| `MobileLeadCard.tsx` | ✅ UPDATED | Use masking utilities |
| `leads_provider_view` | ✅ CREATED | Database view |
| `get_unlocked_lead_data()` | ✅ CREATED | Database function |

---

## Risk Assessment (Updated)

| Risk | Likelihood | Impact | Status |
|------|------------|--------|--------|
| Contact info leaked | Low ✅ | High | MITIGATED - Frontend masking + DB view |
| Pro discount not applied | Low | Medium | Working in unlock-lead |
| Facility limit bypassed | Low | Low | useFacilityLimits enforces on submit |
| Credits deducted without unlock | Low | High | Transaction in unlock-lead function |
