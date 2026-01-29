
# Monetization Overhaul Implementation Plan

## Executive Summary

This plan transforms the platform from a tiered subscription model (Basic/Professional/Featured) to a **freemium + pay-per-lead unlock model** with an optional **Pro subscription** for enhanced benefits. This is a major architectural change requiring updates across the entire platform.

---

## Current State Analysis

### What Exists Today
1. **Three-Tier Subscription Model**: Basic (free), Professional ($399/mo), Featured ($1,099/mo)
2. **Lead Routing by Plan**: Different lead limits per tier (Basic: 0, Professional: 100, Featured: 100)
3. **Lead Unlocking System**: Already partially implemented with `lead_unlocks` table and unlock pricing
4. **Pro Subscription**: Exists at $99/mo for 20% discount on unlocks + featured placement
5. **Email/Notifications**: Currently expose **full contact details** (SECURITY ISSUE)

### Critical Issues Found
1. **Email Leaks**: `send-lead-digest`, `send-followup-reminders`, `submit-lead` all expose full lead contact info (name, email, phone) in emails and notifications before unlock
2. **In-App Notification Leaks**: `provider_notifications` metadata contains full `lead_email` and `lead_phone`
3. **Old Subscription References**: 15+ files still reference Professional/Featured plan tiers
4. **Placement Network**: Partially built but needs ACH billing integration

---

## New Monetization Model

```text
+---------------------------+
|     FREE PROVIDER         |
+---------------------------+
| - 1 facility listing      |
| - Receive locked leads    |
| - Pay per unlock ($39-49) |
+---------------------------+
           |
           v
+---------------------------+
|     PRO SUBSCRIBER        |
|       ($99/month)         |
+---------------------------+
| - Up to 5 facility listings|
| - 20% off lead unlocks    |
| - 20% off Concierge fees  |
| - Featured homepage spot  |
| - Priority search ranking |
+---------------------------+
```

---

## Phase 1: Security & Lead Privacy (CRITICAL)

### 1.1 Fix Email Lead Leaks
**Files to Update:**
- `supabase/functions/submit-lead/index.ts` - Remove lead contact info from email templates
- `supabase/functions/send-lead-digest/index.ts` - Show masked names only
- `supabase/functions/send-followup-reminders/index.ts` - Remove contact details
- `supabase/functions/send-weekly-digest/index.ts` - Mask lead info

**Implementation:**
- Replace `${lead.name}` with `${maskName(lead.name)}` (e.g., "John S.")
- Replace `${lead.phone}` and `${lead.email}` with "Unlock to view"
- Add utility function `maskLeadInfo()` to shared email templates

### 1.2 Fix In-App Notification Leaks
**Files to Update:**
- `supabase/functions/submit-lead/index.ts` lines 1127-1134

**Implementation:**
- Remove `lead_email`, `lead_phone` from notification metadata
- Keep only `lead_id` and masked name

### 1.3 Update Lead Display Components
**Files Already Correct:**
- `src/components/provider/leads/LockedLeadCard.tsx` - Already blurs name and contact info

**Files to Verify:**
- `src/pages/provider/Dashboard.tsx` - Ensure locked leads show masked data
- `src/pages/provider/Inquiries.tsx` - Ensure contact hidden for locked leads

---

## Phase 2: Remove Old Subscription Tiers

### 2.1 Remove Subscription Plan Selection
**Files to Update:**
- `src/pages/provider/ProUpgrade.tsx` - Keep as-is (this IS the Pro upgrade page)
- Remove any references to Professional/Featured plan selection

### 2.2 Update Provider Sidebar
**Current State:** `src/components/provider/ProviderSidebar.tsx`
- Already shows Credits, Pro Visibility correctly
- Remove any subscription tier references

### 2.3 Clean Up Plan-Based Logic
**Files to Update (15+ files):**
- `src/hooks/useApprovedFacilities.ts` - Remove `hasProfessionalPlan` logic
- `src/hooks/useStaticFacilities.ts` - Simplify to just `isPro`
- `src/lib/facilityPlanSort.ts` - Simplify sorting (Pro vs Free)
- `src/pages/SearchResults.tsx` - Update priority scoring
- `src/components/profile/RequestInfoModal.tsx` - Remove plan-based lead type logic
- `src/components/admin/FeaturedAnalyticsDashboard.tsx` - Update messaging

### 2.4 Update Edge Functions
**Files to Update:**
- `supabase/functions/submit-lead/index.ts` - Remove Professional/Featured plan routing logic
- `supabase/functions/get-featured-facilities/index.ts` - Base on `pro_subscriptions` only
- `supabase/functions/check-subscription/index.ts` - Simplify to Pro check only
- `supabase/functions/send-lead-digest/index.ts` - Remove plan tier styling

---

## Phase 3: Provider Panel Updates

### 3.1 Dashboard Updates
**File:** `src/pages/provider/Dashboard.tsx`
- Update "Locations" metric to show Pro limits (1 free, 5 Pro)
- Update lead display to respect unlock status
- Remove any subscription tier badges

### 3.2 Analytics Updates
**File:** `src/pages/provider/Analytics.tsx`
- Remove lead quota references (no longer applicable)
- Focus on unlock costs, conversion rates

### 3.3 Settings Updates
**File:** `src/pages/provider/Settings.tsx`
- Remove subscription management UI
- Keep notification preferences

### 3.4 Help/FAQ Updates
**Files:**
- `src/pages/provider/Help.tsx` - Already mentions unlock model
- `src/pages/provider/KnowledgeBase.tsx` - Update content

---

## Phase 4: Facility Limit Enforcement

### 4.1 Update Add Location Page
**File:** `src/pages/provider/AddLocation.tsx`
- Currently shows Pro (5) vs Basic (1) limit - This is correct
- Ensure enforcement at database level

### 4.2 Database Enforcement
**Migration Required:**
- Add trigger to enforce facility limit based on `pro_subscriptions` status
- Free = 1 facility max, Pro = 5 facilities max

---

## Phase 5: Placement Network Completion

### 5.1 Current State
**File:** `src/pages/provider/PlacementNetwork.tsx`
- Opt-in toggle works
- Terms modal exists
- Payment method modal exists
- Care types, insurance selection works

### 5.2 Missing Features
1. **ACH Payment Collection** - Need to add bank account setup via Stripe
2. **Signed Agreement Storage** - Need e-signature capture
3. **Pro Discount Integration** - Apply 20% off placement fees

### 5.3 Implementation
**Updates to `src/components/provider/AddPaymentMethodModal.tsx`:**
- Add ACH/bank account option alongside card
- Use Stripe Financial Connections or manual bank account entry

**Updates to `src/components/provider/PlacementTermsModal.tsx`:**
- Add signature capture field
- Store agreement timestamp and version

**Updates to `supabase/functions/charge-placement-fee/index.ts`:**
- Check Pro status and apply 20% discount
- Support ACH payment method

---

## Phase 6: Admin Panel Updates

### 6.1 Remove Subscription Tiers from Admin
**File:** `src/pages/admin/AdminSubscriptions.tsx`
- Rename to focus on Pro subscriptions only
- Remove Professional/Featured tier management

### 6.2 Update Provider Management
**File:** `src/pages/admin/AdminProviders.tsx`
- Show Pro status instead of plan tiers
- Show unlock spending metrics

### 6.3 Update Dashboard KPIs
**File:** `src/pages/admin/AdminDashboard.tsx`
- Replace subscription revenue with Pro subscription count
- Add lead unlock revenue tracking

---

## Phase 7: Website Pages Updates

### 7.1 For Providers Page
**File:** `src/pages/ForProviders.tsx`
- Already shows correct model: "Free to List, Pay Per Inquiry"
- Add Pro benefits section

### 7.2 Provider FAQ
**File:** `src/pages/ProviderFAQ.tsx`
- Already mentions unlock model
- Update pricing examples if needed

### 7.3 Remove Pricing Page References
- Search for any dedicated pricing pages with tier cards
- Remove or redirect to ForProviders page

---

## Technical Details

### Database Tables (No Changes Needed)
The following tables already support the new model:
- `pro_subscriptions` - Pro subscription tracking
- `lead_unlocks` - Lead unlock records
- `provider_credits` - Credit balance
- `credit_transactions` - Purchase/unlock history

### Edge Functions Summary
| Function | Action Required |
|----------|----------------|
| `submit-lead` | Remove tier routing, mask lead info in emails |
| `unlock-lead` | Keep as-is (already works) |
| `subscribe-pro` | Keep as-is (Pro subscription) |
| `send-lead-digest` | Mask contact info |
| `send-followup-reminders` | Mask contact info |
| `get-featured-facilities` | Base on Pro only |
| `charge-placement-fee` | Add Pro discount logic |

### Components Summary
| Component | Status |
|-----------|--------|
| `LockedLeadCard` | Already correctly blurs info |
| `UnlockLeadButton` | Already works with pricing |
| `ProviderSidebar` | Minor cleanup needed |
| `PlacementNetwork` | Needs ACH/signature completion |

---

## Implementation Priority

1. **CRITICAL (Phase 1)**: Fix email/notification leaks - Security vulnerability
2. **HIGH (Phase 2)**: Remove old subscription references - Consistency
3. **MEDIUM (Phase 3-4)**: Provider panel updates - User experience
4. **MEDIUM (Phase 5)**: Placement network completion - Revenue feature
5. **LOW (Phase 6-7)**: Admin/website updates - Polish

---

## Files to Create
None - all features can be implemented by updating existing files.

## Files to Delete
None - deprecate in place rather than delete for safety.

## Estimated Scope
- **Edge Functions**: 6 functions to update
- **React Components**: 15-20 files to update
- **Admin Pages**: 3-5 files to update
- **Website Pages**: 2-3 files to update

