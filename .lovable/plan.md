

# Provider Panel Cleanup & Missing Features Audit Plan

## Executive Summary

This audit identifies legacy tier subscription remnants (Basic/Professional/Featured) that need cleanup for the new Free/Pro monetization model, and missing features in the current subscription and concierge service.

---

## Part 1: Legacy Tier Subscription Cleanup

### Critical Issues Found

#### Issue 1: Edge Function Legacy Email Content - `submit-qualified-lead`
**File:** `supabase/functions/submit-qualified-lead/index.ts`
**Lines:** 883-937
**Severity:** HIGH

The `sendBasicProviderUpgradeNotification` function contains outdated tier references:
- "But you're on the Basic plan..." (line 902)
- "as a Basic plan member" (line 911)
- "Professional Plan: 100 shared leads/month" (line 918)
- "Featured Plan: 100 exclusive leads/month" (line 919)

**Required Changes:**
- Replace "Basic plan" with "Free plan"
- Replace tier mentions with Free/Pro terminology
- Remove lead limit references (pay-per-unlock model has no monthly caps)

#### Issue 2: Edge Function Legacy References - `get-featured-facilities`
**File:** `supabase/functions/get-featured-facilities/index.ts`
**Lines:** 11-14, 122-138, 281, 568
**Severity:** MEDIUM

Contains legacy product ID arrays and email content:
- `PROFESSIONAL_PRODUCT_IDS` array with old naming
- Email content mentioning "Featured plan subscription"
- Variable names like `professionalFacilityIds`

**Required Changes:**
- Rename to `PRO_PRODUCT_IDS` consistently
- Update email templates to use "Pro" terminology
- Rename variables for consistency

#### Issue 3: Admin Panel Legacy References
**Files:** Multiple admin components
**Severity:** MEDIUM

| File | Issue |
|------|-------|
| `AdminFeatured.tsx` | Lines 1140-1165: "Featured Plan subscribers", "Professional plan limit" |
| `AdminAnalytics.tsx` | Lines 683-684: `PLAN_LIMITS.professional` reference |
| `LeadCapMonitorWidget.tsx` | Lines 103-104: Skip "basic plan" logic, lead limit monitoring |
| `PlanSettingsTab.tsx` | References legacy tier structure in UI |

**Required Changes:**
- Update all UI text to Free/Pro terminology
- Remove or update lead limit monitoring (no longer relevant for pay-per-unlock)
- Update admin analytics to reflect new model

#### Issue 4: Dashboard Comment Referencing "Basic plan"
**File:** `src/pages/provider/Dashboard.tsx`
**Line:** 200
**Severity:** LOW

Comment says "Fetch total leads count for Basic plan" - should reference "Free plan"

#### Issue 5: Provider Notifications Legacy Type
**File:** `src/pages/provider/Notifications.tsx`
**Lines:** 54-66, 104-107
**Severity:** LOW

Contains `lead_limit_warning` notification type which is no longer relevant in pay-per-unlock model.

**Required Changes:**
- Replace with `low_credits_warning` or similar credit-based alert
- Update notification handling logic

---

## Part 2: Missing Features in Current Subscription Model

### Pro Subscription Gaps

#### Gap 1: No Active Pro Subscription Indicator on Dashboard
**Current State:** Dashboard shows "Pro Member" in subtitle but no prominent badge/indicator
**Recommendation:** Add a visible "Pro" badge next to facility name when Pro is active

#### Gap 2: Missing Pro Benefits Summary Widget
**Current State:** Pro benefits only explained on `/provider/pro-upgrade` page
**Recommendation:** Add a small "Your Pro Benefits" card on Dashboard showing:
- 20% unlock discount applied
- Featured placement status
- Up to 5 facilities allowed

#### Gap 3: No Pro Discount Display on Unlock Confirmations
**Current State:** UnlockLeadButton shows discounted price but no "You saved X" messaging
**Recommendation:** After unlock, show toast: "Lead unlocked! Pro discount saved you $X"

### Credit System Gaps

#### Gap 4: No Low Credit Warning
**Current State:** No notification when credits run low
**Recommendation:** Add warning when credits fall below $50 (configurable threshold)

#### Gap 5: Auto-Reload Credits Option Missing
**Current State:** Manual credit purchase only
**Recommendation:** Add option to auto-reload credits when balance drops below threshold

---

## Part 3: Concierge Service Completeness Check

### What's Working Well

1. **Concierge Dashboard** (`/provider/concierge`) - Full functionality
2. **Placement Network** (`/provider/placement-network`) - Complete opt-in flow
3. **E-Signature Terms** (`PlacementTermsModal.tsx`) - Digital signature with typed name
4. **Payment Method Setup** (`AddPaymentMethodModal.tsx`) - Stripe card integration
5. **Introduction Cards** (`ConciergeIntroductionCard.tsx`) - Full respond/accept/decline flow
6. **Messaging System** (`ConciergeMessages.tsx`) - Thread-based messaging
7. **Tour Requests** (`ConciergeTourRequests.tsx`) - Tour coordination
8. **Placement Confirmation** (`ProviderConfirmPlacementModal.tsx`) - Dual confirmation

### Concierge Service Gaps

#### Gap 6: Duplicate Icon in Sidebar
**File:** `src/components/provider/ProviderSidebar.tsx`
**Lines:** 32-33
**Issue:** Both "Concierge" and "Placement Network" use `Network` icon

**Recommendation:** Use different icons:
- Concierge: `Users` or `Headset` icon
- Placement Network: `Network` icon (keep)

#### Gap 7: No Pending Introduction Badge on Sidebar
**Current State:** No badge showing pending introduction count on Concierge nav item
**Recommendation:** Add badge similar to Inquiries showing pending intro count

#### Gap 8: Missing Concierge Case History View
**Current State:** Only shows recent introductions (limit 20)
**Recommendation:** Add "View All History" link with pagination

#### Gap 9: No Invoice Preview Before Charge
**Current State:** Placement invoices are created automatically
**Recommendation:** Show provider estimated fee before confirming placement

---

## Implementation Plan

### Phase 1: Critical Cleanup (Edge Functions)

**Task 1.1: Update submit-qualified-lead Email**
```text
File: supabase/functions/submit-qualified-lead/index.ts

Changes:
1. Line 902: "But you're on the Basic plan..." → "But you're on the Free plan..."
2. Line 911: "as a Basic plan member" → "as a Free plan member"
3. Lines 917-920: Replace tier list with Free/Pro explanation
4. Line 924: Update CTA link to /provider/pro-upgrade
```

**Task 1.2: Update get-featured-facilities**
```text
File: supabase/functions/get-featured-facilities/index.ts

Changes:
1. Rename PROFESSIONAL_PRODUCT_IDS → PRO_PRODUCT_IDS (consolidate)
2. Update email templates to use "Pro subscription" terminology
3. Rename professionalFacilityIds → proFacilityIds
```

### Phase 2: Admin Panel Updates

**Task 2.1: Update AdminFeatured.tsx**
- Replace "Featured Plan" with "Pro subscription"
- Update help text and descriptions

**Task 2.2: Update AdminAnalytics.tsx**
- Remove PLAN_LIMITS.professional references
- Update plan distribution chart labels

**Task 2.3: Deprecate LeadCapMonitorWidget**
- Widget monitors lead caps which no longer exist
- Either remove or repurpose for credit balance monitoring

### Phase 3: Provider Panel Polish

**Task 3.1: Update Dashboard Comment**
- Line 200 comment cleanup

**Task 3.2: Update Notifications Types**
- Replace lead_limit_warning with low_credits_warning

**Task 3.3: Fix Sidebar Icon Duplication**
- Change Concierge icon to Users or Headset

**Task 3.4: Add Concierge Pending Badge**
- Show pending intro count on sidebar

### Phase 4: Feature Enhancements (Optional)

**Task 4.1: Pro Benefits Widget on Dashboard**
**Task 4.2: Pro Discount Savings Toast**
**Task 4.3: Low Credits Warning System**
**Task 4.4: Concierge History View**

---

## Files Requiring Changes

| File | Priority | Change Type |
|------|----------|-------------|
| `submit-qualified-lead/index.ts` | CRITICAL | Email content update |
| `get-featured-facilities/index.ts` | HIGH | Naming consistency |
| `AdminFeatured.tsx` | MEDIUM | UI text update |
| `AdminAnalytics.tsx` | MEDIUM | Remove legacy references |
| `LeadCapMonitorWidget.tsx` | MEDIUM | Deprecate or repurpose |
| `Dashboard.tsx` | LOW | Comment cleanup |
| `Notifications.tsx` | LOW | Type update |
| `ProviderSidebar.tsx` | LOW | Icon fix + badge |

---

## Summary

### Cleanup Required
- **4 edge function files** with legacy tier email content
- **5 admin components** with old plan terminology
- **2 provider components** with outdated references

### Missing Features (Priority)
1. Low credits warning system
2. Concierge pending badge on sidebar
3. Pro benefits visibility on dashboard
4. Sidebar icon differentiation

### What's Complete
- Free/Pro subscription detection (`check-subscription`, `useProStatus`)
- Lead unlock with Pro discount
- Facility limits enforcement (1 Free, 5 Pro)
- Concierge placement network (full flow)
- Payment method setup and billing

---

## Estimated Effort

- Phase 1 (Critical Cleanup): 2 hours
- Phase 2 (Admin Updates): 2 hours
- Phase 3 (Provider Polish): 1 hour
- Phase 4 (Enhancements): 3-4 hours (optional)

**Total: 5-9 hours**

