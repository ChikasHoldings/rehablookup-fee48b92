
# Lead Submission Flows Audit - Complete Bug Analysis

## Executive Summary

After thoroughly auditing all lead submission flows, I've identified **1 critical bug** that explains why facility-specific inquiries are not being delivered to providers, plus **3 additional issues** that could cause problems in edge cases.

---

## Critical Bug Found

### BUG #1: RequestInfoModal Missing Facility Props

**Location:** `src/components/profile/RequestInfoModal.tsx` (lines 475-477)

**Impact:** HIGH - All inquiries submitted through the "Request Info" button on facility profile pages are being treated as direct/unassigned inquiries instead of facility-specific inquiries.

**Root Cause:**
```tsx
// Current code (BROKEN)
<LeadIntakeForm 
  renderSuccess={renderSuccess}
/>

// Should be
<LeadIntakeForm 
  facilityId={facility.id}
  facilityName={facility.name}
  renderSuccess={renderSuccess}
/>
```

**Symptoms:**
- Leads created with `facility_id: null`
- Status set to "unassigned" instead of "new"  
- Source set to "direct" instead of "facility_profile"
- Provider never receives email/SMS/in-app notification
- Lead appears in admin queue as "direct inquiry" instead of showing in provider dashboard

---

## Additional Issues Found

### Issue #2: Success Page Text Inconsistency

**Location:** `src/components/lead-intake/LeadIntakeSuccess.tsx` (line 141)

**Impact:** LOW - The Concierge CTA still says "Our Concierge service matches you..." but the user already submitted to a specific facility.

**Note:** This was already addressed in a previous update but may need consistency review.

---

### Issue #3: ModalSuccessView Concierge Text Contains "free"

**Location:** `src/components/profile/RequestInfoModal.tsx` (line 266)

**Impact:** LOW - The word "free" still appears in the success screen's Concierge CTA text.

**Current text:** "Our free Concierge service matches you with verified treatment centers..."

**Should be:** "Our Concierge service matches you with verified treatment centers..."

---

### Issue #4: Marketing Flow Email Verification Not Required

**Location:** `src/pages/MarketingLanding.tsx`

**Impact:** MEDIUM - The marketing landing page uses `onCustomSubmit` which bypasses the email verification flow entirely. Marketing leads are submitted without email verification.

**Note:** This may be intentional for conversion optimization, but should be documented as a known difference in flows.

---

## All Lead Submission Entry Points Audited

| Entry Point | Location | Status |
|-------------|----------|--------|
| Facility Profile "Request Info" Modal | `RequestInfoModal.tsx` | **BUG - Missing props** |
| Seeker Dashboard Request Form | `SeekerRequestForm.tsx` | Fixed (last update) |
| Direct Lead Intake Page | `/request-help` route | OK |
| Marketing Landing Page | `/lp/convert` route | OK (uses separate table) |
| Concierge Intake | `/concierge` route | OK (different flow) |

---

## Email Verification Flow Status

The email verification flow was recently fixed and now correctly:

1. Checks if email was verified within 24 hours via `verified_at` timestamp
2. Handles retries gracefully with `alreadyVerified` response
3. Distinguishes between invalidated codes and actual verifications
4. Auto-verifies on form load if localStorage contains a previously verified email

---

## Implementation Plan

### Step 1: Fix RequestInfoModal (Critical)

Add the missing `facilityId` and `facilityName` props to the LeadIntakeForm component in RequestInfoModal.tsx.

### Step 2: Fix Concierge CTA Text (Minor)

Update the "free" reference in the ModalSuccessView component.

### Step 3: Verify Fix with Test

After deployment, submit a test lead from a facility profile page and verify:
- Lead appears in provider dashboard
- Provider receives email notification
- Lead status is "new" (not "unassigned")
- Source is "facility_profile"

---

## Technical Details

### Data Flow for Facility-Specific Lead

```text
User clicks "Request Info" on facility page
    |
    v
RequestInfoModal opens with facility context
    |
    v
LeadIntakeForm receives facilityId + facilityName props
    |
    v
useLeadIntakeForm hook sets source = "facility_profile"
    |
    v
handleSubmit calls submit-qualified-lead edge function
    |
    v
Edge function creates lead with:
  - facility_id: [actual facility UUID]
  - status: "new"
  - source: "facility_profile"
  - redistribution fields populated
    |
    v
Provider receives:
  - Email notification
  - SMS (if enabled)
  - In-app notification
```

### Files to Modify

1. `src/components/profile/RequestInfoModal.tsx`
   - Line 475-477: Add facilityId and facilityName props
   - Line 266: Remove "free" from Concierge CTA

---

## Verification Checklist

After implementation, verify these scenarios:

- [ ] Submit inquiry from facility profile page -> lead assigned to that facility
- [ ] Submit inquiry from RequestInfoModal -> provider receives notification
- [ ] Submit inquiry from SeekerRequestForm -> lead correctly attributed
- [ ] Submit direct inquiry (no facility) -> lead marked as "unassigned"
- [ ] Marketing lead -> stored in marketing_leads table separately
- [ ] Email verification persists across page refresh
- [ ] Retry verification doesn't show error if already verified
