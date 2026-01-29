
# Provider Panel Audit & Hardening Plan

## Executive Summary

This audit covers the Provider panel updates, facility limit enforcement, lead locking/unlocking mechanics, and data leak prevention across the frontend, backend, and database layers. Several areas require attention to ensure full compliance with the new Free/Pro monetization model.

---

## Current State Analysis

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

---

## Issues Identified

### Critical Issues (Data Leak Risks)

#### Issue 1: LeadDetailPanel Exposes Contact Info Without Unlock Check
**File:** `src/components/provider/leads/LeadDetailPanel.tsx`
**Risk:** HIGH

The `LeadDetailPanel` component displays full contact info (phone, email) without checking if the lead is unlocked. Lines 508-546 show phone and email directly from `lead.phone` and `lead.email`.

**Current code (lines 514, 534):**
```tsx
<p className="text-base font-semibold text-foreground">{lead.phone}</p>
...
<p className="text-base font-semibold text-foreground truncate">{lead.email}</p>
```

**Fix Required:** Add `isLeadUnlocked` check and mask data for locked leads.

#### Issue 2: LeadDetailDrawer Exposes Contact Info
**File:** `src/components/provider/leads/LeadDetailDrawer.tsx`
**Risk:** HIGH

Similar issue - lines 343-421 display full contact details without unlock verification.

#### Issue 3: Inquiries Page - Contact Display Without Unlock Check
**File:** `src/pages/provider/Inquiries.tsx`
**Risk:** HIGH

Lines 408-428 show contact info for "unlocked" leads but the unlock check uses only client-side state from `useLeadUnlocks`. Should add server-side RLS protection.

#### Issue 4: MobileLeadCard May Expose Name
**File:** `src/components/provider/leads/MobileLeadCard.tsx`
**Risk:** MEDIUM

Line 226 shows `lead.name` when `!isLocked`. Need to verify `isLocked` prop is correctly passed.

---

### Security Issues (RLS/Database)

#### Issue 5: Leads Table RLS - SELECT Policy Too Permissive
**Risk:** MEDIUM

The database linter shows multiple "RLS Policy Always True" warnings. The `leads` table likely allows providers to SELECT any lead data if they can guess the facility_id.

**Fix Required:** Add RLS policy requiring:
1. User owns the facility, OR
2. Lead is unlocked for that facility via `lead_unlocks` table

#### Issue 6: No Server-Side Enforcement of Lead Masking
**Risk:** MEDIUM

While the UI masks data, the `leads` table SELECT returns full `phone`, `email`, `name` fields. A provider could use the Supabase API directly to bypass UI masking.

**Recommended Solution:** Create a `leads_masked` view that hides sensitive columns unless lead is unlocked, or use a SECURITY DEFINER function.

---

### Functionality Issues

#### Issue 7: Dashboard Recent Leads Shows All Lead Data
**File:** `src/pages/provider/Dashboard.tsx`
**Risk:** LOW

Lines 174-188 fetch leads and pass them to the UI. While the Dashboard doesn't show contact details in the preview cards, the data is still fetched client-side.

#### Issue 8: Credits Page Lacks Error Handling for Unlock Failures
**File:** `src/pages/provider/Credits.tsx`
**Risk:** LOW

The purchase flow works but lacks detailed error messaging for edge cases.

---

## Implementation Plan

### Phase 1: Frontend Leak Prevention (Critical)

**Task 1.1: Secure LeadDetailPanel**
```text
File: src/components/provider/leads/LeadDetailPanel.tsx

Changes:
1. Import useLeadUnlocks hook
2. Check if lead is unlocked before displaying contact info
3. Show masked version with unlock CTA for locked leads
4. Add visual "Locked" indicator
```

**Task 1.2: Secure LeadDetailDrawer**
```text
File: src/components/provider/leads/LeadDetailDrawer.tsx

Changes:
1. Same pattern as LeadDetailPanel
2. Replace contact section with locked state UI
3. Include UnlockLeadButton
```

**Task 1.3: Secure Inquiries Page**
```text
File: src/pages/provider/Inquiries.tsx

Changes:
1. Double-check isLeadUnlocked is called correctly
2. Mask name display for locked leads
3. Update card component to show masked state
```

**Task 1.4: Audit MobileLeadCard**
```text
File: src/components/provider/leads/MobileLeadCard.tsx

Changes:
1. Verify isLocked prop source
2. Add fallback masking if prop is missing
```

### Phase 2: Database Security Hardening

**Task 2.1: Create Masked Leads View**
```sql
-- Create view that masks sensitive data for locked leads
CREATE OR REPLACE VIEW public.leads_provider_view
WITH (security_invoker = on)
AS
SELECT 
  l.id,
  l.facility_id,
  l.status,
  l.created_at,
  l.urgency,
  l.level_of_care,
  l.source,
  l.location_city_state,
  l.location_zip,
  -- Masked fields unless unlocked
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM lead_unlocks lu 
      WHERE lu.lead_id = l.id AND lu.facility_id = l.facility_id
    ) THEN l.name
    ELSE substring(l.name from 1 for 1) || repeat('●', 6)
  END as name,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM lead_unlocks lu 
      WHERE lu.lead_id = l.id AND lu.facility_id = l.facility_id
    ) THEN l.email
    ELSE '●●●@●●●.com'
  END as email,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM lead_unlocks lu 
      WHERE lu.lead_id = l.id AND lu.facility_id = l.facility_id
    ) THEN l.phone
    ELSE '(●●●) ●●●-●●●●'
  END as phone,
  -- Unlock status indicator
  EXISTS (
    SELECT 1 FROM lead_unlocks lu 
    WHERE lu.lead_id = l.id AND lu.facility_id = l.facility_id
  ) as is_unlocked
FROM leads l;
```

**Task 2.2: Update RLS on Leads Table**
```sql
-- Restrict direct SELECT on leads table
-- Providers must query through the masked view
```

**Task 2.3: Create Security Definer Function for Full Lead Data**
```sql
-- Only returns unmasked data for unlocked leads
CREATE OR REPLACE FUNCTION get_unlocked_lead(p_lead_id uuid, p_facility_id uuid)
RETURNS leads
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if lead is unlocked
  IF NOT EXISTS (
    SELECT 1 FROM lead_unlocks 
    WHERE lead_id = p_lead_id AND facility_id = p_facility_id
  ) THEN
    RAISE EXCEPTION 'Lead is not unlocked';
  END IF;
  
  RETURN (SELECT * FROM leads WHERE id = p_lead_id);
END;
$$;
```

### Phase 3: Frontend Integration Updates

**Task 3.1: Update Hooks to Use Masked View**
```text
Files to update:
- src/hooks/useProviderLeads.ts (if exists)
- src/pages/provider/Inquiries.tsx query
- src/pages/provider/Dashboard.tsx query

Changes:
- Query leads_provider_view instead of leads table
- Use is_unlocked field from view
- Call get_unlocked_lead() when user clicks on unlocked lead
```

**Task 3.2: Create Utility Functions**
```text
File: src/lib/leadMasking.ts (new)

Functions:
- maskLeadName(name: string): string
- maskEmail(email: string): string  
- maskPhone(phone: string): string
- isContactInfoMasked(lead: Lead): boolean
```

### Phase 4: Edge Function Verification

**Task 4.1: Audit All Notification Functions**
```text
Files to verify contact info is not leaked:
- send-lead-confirmation
- submit-qualified-lead (metadata)
- send-lead-email
- send-sms-notification

Ensure all use maskLeadName() where appropriate.
```

### Phase 5: Testing Checklist

```text
Test Scenarios:
[ ] Free user can only add 1 facility
[ ] Pro user can add up to 5 facilities  
[ ] AddLocation shows upgrade prompt at limit
[ ] New leads display as "Locked" in UI
[ ] Locked leads show masked name, email, phone
[ ] Click on locked lead shows LockedLeadDetailPanel
[ ] Unlock button shows correct price (Pro discount applied)
[ ] After unlock, full contact info visible
[ ] Email notifications mask contact info
[ ] Cannot access contact info via Supabase API directly
[ ] Dashboard metrics work correctly
[ ] Pro badge displays correctly
```

---

## Technical Details

### Files Requiring Changes

| File | Priority | Change Type |
|------|----------|-------------|
| `LeadDetailPanel.tsx` | CRITICAL | Add unlock check |
| `LeadDetailDrawer.tsx` | CRITICAL | Add unlock check |
| `Inquiries.tsx` | CRITICAL | Verify unlock check |
| `MobileLeadCard.tsx` | HIGH | Verify isLocked prop |
| Database migration | HIGH | Create masked view |
| `leadMasking.ts` (new) | MEDIUM | Utility functions |
| `Dashboard.tsx` | LOW | Query optimization |

### Estimated Effort

- Phase 1 (Frontend): 2-3 hours
- Phase 2 (Database): 1-2 hours
- Phase 3 (Integration): 1-2 hours
- Phase 4 (Verification): 1 hour
- Phase 5 (Testing): 1 hour

**Total: 6-9 hours**

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Contact info leaked | Medium | High | Implement all Phase 1+2 fixes |
| Pro discount not applied | Low | Medium | Already working in unlock-lead |
| Facility limit bypassed | Low | Low | useFacilityLimits enforces on submit |
| Credits deducted without unlock | Low | High | Transaction in unlock-lead function |
