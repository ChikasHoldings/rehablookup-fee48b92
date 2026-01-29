
# Provider Panel Placement Network Audit & Hardening Plan

## Executive Summary

This audit covers the Provider panel's **Placement Network** feature, including the onboarding flow, fee explanation, payment method setup (ACH/card), e-signature for terms acceptance, and UI/UX consistency with the overall Provider panel design.

---

## Current State Analysis

### What's Working Well

1. **Placement Network Page** (`/provider/placement-network`)
   - Full opt-in/opt-out toggle with readiness checklist
   - "How it Works" 4-step explanation
   - Network benefits section
   - Tab-based navigation (Introductions, Profile, Billing, Placements)

2. **Fee Structure Display**
   - Clear fee breakdown showing:
     - Flat Fee: $1,200 (Pro: $960 with 20% discount)
     - Commission: 8% of first month (Pro: 6.4%, capped at $1,500)
   - Pro discount visually highlighted

3. **E-Signature System** (`PlacementTermsModal.tsx`)
   - Scrollable terms agreement (TERMS_VERSION: "1.0")
   - Checkbox for acknowledgment
   - Digital signature input field (typed full name)
   - Legal disclaimer about electronic signature
   - Saves `concierge_terms_accepted_at`, `concierge_terms_version`, `concierge_terms_accepted_by`

4. **Payment Methods** (`AddPaymentMethodModal.tsx`)
   - Stripe Elements integration for card capture
   - SetupIntent flow for saving payment methods
   - Database table `provider_payment_methods` with proper RLS

5. **Backend Edge Functions**
   - `setup-provider-payment-method` - Creates Stripe SetupIntent
   - `save-provider-payment-method` - Persists payment method to DB
   - `charge-placement-fee` - Charges on confirmed placement

6. **Opt-in Readiness Checklist**
   - Complete facility profile check
   - Terms acceptance check
   - Payment method check
   - Care types selection check

---

## Issues Identified

### Issue 1: ACH/Bank Account Not Functional
**File:** `AddPaymentMethodModal.tsx` (line 133)
**Status:** UI shows "Bank Account (Soon)" but is disabled

The ACH tab is disabled with a "(Soon)" label. The Stripe SetupIntent in `setup-provider-payment-method` already supports `us_bank_account`, but the frontend doesn't implement it.

**Fix Required:** Either fully implement ACH or update messaging to clearly indicate card-only for now.

### Issue 2: Placement Network Not in Sidebar Navigation
**File:** `ProviderSidebar.tsx`
**Status:** MISSING

The Placement Network page exists at `/provider/placement-network` but is not in the sidebar `navItems` array. Users can only access it via:
- Direct URL
- Links from ConciergeDashboard
- "Get Started" prompts

**Fix Required:** Add "Placement Network" to sidebar navigation.

### Issue 3: Missing Stripe Publishable Key Environment Variable
**File:** `AddPaymentMethodModal.tsx` (line 26)
**Current:** `loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || "")`

The `VITE_STRIPE_PUBLISHABLE_KEY` is not in the verified secrets list. If not set, Stripe Elements will fail silently.

**Fix Required:** Verify the publishable key is in `.env` or add it.

### Issue 4: Inconsistent Font Styling in Fee Cards
**File:** `PlacementNetwork.tsx` (lines 744-762)
**Status:** Minor styling inconsistency

The fee structure cards use `text-2xl font-bold` but other dashboard metric cards use `text-xl font-bold`. Should align with Provider panel patterns.

### Issue 5: No Visual Confirmation of Terms Signature
**Status:** After signing, there's no way to view the signed agreement or signature

**Recommendation:** Add a "View Agreement" section in Billing tab showing:
- Signature name
- Date signed
- Terms version

### Issue 6: Missing "Pro Discount" Explanation Before Signup
**File:** `PlacementNetwork.tsx`
**Status:** Pro discount shown in fee card, but not explained in initial "Benefits" section

Providers may not know they can get 20% off placement fees with Pro before they sign up.

---

## Implementation Plan

### Phase 1: Navigation & Discoverability

**Task 1.1: Add Placement Network to Sidebar**
```text
File: src/components/provider/ProviderSidebar.tsx

Changes:
1. Add to navItems array:
   { href: "/provider/placement-network", label: "Placement Network", icon: Network }
2. Position after "Concierge" item
3. Add badge for pending introductions count (optional)
```

### Phase 2: Payment Method Improvements

**Task 2.1: Improve ACH Messaging**
```text
File: src/components/provider/AddPaymentMethodModal.tsx

Option A - Remove ACH tab entirely (cleaner UI)
Option B - Update "(Soon)" to "Coming Q2 2026" with better styling
```

**Task 2.2: Verify Stripe Publishable Key**
```text
Check if VITE_STRIPE_PUBLISHABLE_KEY exists in .env
If missing, add the publishable key (safe for client-side)
```

### Phase 3: UI/UX Alignment with Provider Panel

**Task 3.1: Standardize Typography**
```text
File: src/pages/provider/PlacementNetwork.tsx

Changes:
1. Fee cards: text-xl instead of text-2xl
2. Section headings: Match Dashboard h2 styling
3. Card padding: Align with other provider pages
```

**Task 3.2: Add Pro Discount Callout in Benefits**
```text
Location: PLACEMENT_BENEFITS array or separate callout card

Add:
- "Pro subscribers save 20% on every placement fee"
- Link to Pro Upgrade page
```

**Task 3.3: Improve Header Gradient**
```text
The purple/violet gradient works but could use the same treatment as Dashboard.
Consider: Adding a subtle border-bottom or shadow for visual separation.
```

### Phase 4: Terms & Signature Enhancements

**Task 4.1: Add Signed Agreement Display**
```text
File: src/pages/provider/PlacementNetwork.tsx (Billing tab)

Add section showing:
- "Agreement Status: Signed on [date]"
- "Signed by: [name]"
- "Version: [terms version]"
- Button: "View Terms" to open read-only modal
```

**Task 4.2: E-Signature Validation Enhancement**
```text
File: src/components/provider/PlacementTermsModal.tsx

Improvements:
1. Add confirmation modal before final submission
2. Show "Please type your full name exactly" helper text
3. Add timestamp to signature record
```

### Phase 5: Fee Structure Clarity

**Task 5.1: Add Inline Fee Comparison**
```text
File: src/pages/provider/PlacementNetwork.tsx

Before opt-in, show side-by-side comparison:
| Fee Type    | Standard | Pro (20% off) |
|-------------|----------|---------------|
| Flat Fee    | $1,200   | $960          |
| Commission  | 8%       | 6.4%          |
```

**Task 5.2: Add "When Will I Be Charged?" FAQ**
```text
Location: Below fee structure cards or in expandable accordion

Content:
- "Fees are only charged after confirmed placement"
- "Both you and the family must confirm admission"
- "Invoices are due within 14 days"
```

---

## Files Requiring Changes

| File | Priority | Change Type |
|------|----------|-------------|
| `ProviderSidebar.tsx` | HIGH | Add navigation item |
| `AddPaymentMethodModal.tsx` | MEDIUM | ACH messaging update |
| `PlacementNetwork.tsx` | MEDIUM | Typography alignment, Pro callout |
| `PlacementTermsModal.tsx` | LOW | Signature confirmation |
| `.env` | HIGH | Verify Stripe key |

---

## Technical Details

### Database Schema (Already Complete)

**`provider_payment_methods`** table:
- `id`, `facility_id`, `type`, `stripe_payment_method_id`
- `last_four`, `bank_name`, `card_brand`, `exp_month`, `exp_year`
- `is_default`, `is_verified`, timestamps
- RLS policies properly configured

**`facilities`** concierge columns:
- `concierge_network_opted_in`, `concierge_opted_in_at`
- `concierge_terms_accepted_at`, `concierge_terms_version`, `concierge_terms_accepted_by`
- Network profile fields (care types, insurance, availability, etc.)

### Edge Functions (Verified Working)
- `setup-provider-payment-method` - Creates SetupIntent
- `save-provider-payment-method` - Saves to DB
- `charge-placement-fee` - Processes payment on placement

---

## Summary of What's Already Built vs. What Needs Work

| Feature | Status | Notes |
|---------|--------|-------|
| Placement Network page | Done | Full functionality |
| E-signature (terms acceptance) | Done | Digital signature with typed name |
| Credit card payment setup | Done | Stripe Elements working |
| ACH bank account setup | Partial | UI exists but disabled |
| Fee structure display | Done | Clear pricing with Pro discount |
| Opt-in checklist | Done | 4 requirement checks |
| Sidebar navigation | Missing | Not in sidebar nav |
| Pro discount promotion | Partial | Not prominently featured |
| Signed agreement viewing | Missing | No way to review after signing |

---

## Estimated Effort

- Phase 1 (Navigation): 30 minutes
- Phase 2 (Payment improvements): 1 hour
- Phase 3 (UI alignment): 1-2 hours
- Phase 4 (Terms enhancements): 1 hour
- Phase 5 (Fee clarity): 30 minutes

**Total: 4-5 hours**
