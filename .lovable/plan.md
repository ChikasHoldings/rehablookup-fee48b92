
# International Placement System - Production Readiness Audit & Enhancement Plan

## Executive Summary
The International Placement system has a critical bug in the checkout flow and several design/UX improvements needed to match the high-value enterprise positioning. This plan addresses all issues to make the system production-ready.

---

## Critical Bug Fix

### 1. Broken Checkout Flow
**Problem**: The landing page (`InternationalLanding.tsx`) calls the checkout function with empty/placeholder data:
```javascript
body: {
  name: "International Client",  // Placeholder
  email: "",                      // EMPTY - will fail validation
  country: "International",       // Placeholder
}
```

The `create-international-checkout` function requires email, name, and country - this will throw an error immediately.

**Solution**: Add a pre-checkout collection form on the landing page to gather:
- Full name (required)
- Email address (required)  
- Phone number (optional)
- Country of residence (required)

This will be a simple inline form before redirecting to Stripe checkout.

---

## Provider Portal - Two Placement Types

### 2. Fee Structure Visibility
**Current State**: The `PlacementBenefits.tsx` only shows domestic fees ($1,000/$800). Providers need to clearly see both placement types.

**Enhancement**: Update the provider Placement Network page to display:

| Placement Type | Description | Standard Fee | Pro Fee |
|----------------|-------------|--------------|---------|
| **Domestic** | US-based seekers | $1,000 | $800 |
| **International** | Global clients seeking US treatment | $4,500 | $4,500 |

Add a new "Fee Structure" section in the landing view that clearly distinguishes between both types.

---

## Landing Page Enhancement

### 3. Enterprise-Grade Design Upgrade
The current landing page is functional but needs to better convey the premium nature of a $299 service that gates access to $30K-$100K treatment programs.

**Enhancements**:
- Add a compelling value proposition section explaining why US rehab is different (privacy, immediate access, luxury options, no wait lists)
- Add international client testimonials placeholder section
- Add trust indicators (countries served, facilities in network)
- Improve the hero section with more authoritative messaging
- Add a "Why Choose US Treatment?" section with clear benefits

---

## Data Flow Verification

### 4. Intake Data Key Normalization
**Issue**: The intake form uses camelCase (`budgetRange`, `rehabStyle`) but the provider view expects snake_case (`budget_range`, `rehab_style`).

**Solution**: Update the intake submission to normalize keys to snake_case before storing, ensuring consistent data access throughout the system.

---

## Technical Implementation Tasks

### Files to Modify:

1. **`src/pages/international/InternationalLanding.tsx`**
   - Add pre-checkout collection form (name, email, phone, country)
   - Improve hero messaging and value proposition
   - Add "Why US Treatment?" section
   - Add trust indicators

2. **`src/components/provider/placement-network/PlacementBenefits.tsx`**
   - Update to show BOTH domestic and international fee structures
   - Clear visual distinction between the two types

3. **`src/components/provider/international/InternationalCandidatesTab.tsx`**
   - Add clearer header explaining this is for international (non-US) clients
   - Add brief explanation of the $4,500 fee context

4. **`src/pages/international/InternationalIntake.tsx`**
   - Normalize form data keys to snake_case before submission

5. **`supabase/functions/create-international-checkout/index.ts`**
   - Add fallback handling if minimal data is passed (use Stripe's customer_email field)

---

## Flow Verification Checklist

After implementation, verify these end-to-end flows:

### Flow 1: International Client Journey
1. Non-US visitor sees geo-targeted banner (Already working)
2. Clicks to `/international` landing page
3. Fills pre-checkout form with name, email, country
4. Redirected to Stripe for $299 payment
5. Returns to `/international/intake` with session_id
6. Completes detailed intake form
7. Redirected to thank-you page
8. Case appears in admin dashboard

### Flow 2: Admin Case Management
1. Admin sees new case in International dashboard
2. Admin assigns advisor
3. Admin invites facilities
4. Facilities receive invitations in provider portal

### Flow 3: Provider Response
1. Provider sees candidate in "Int'l" tab
2. Reviews anonymized details (country, budget, urgency, concern)
3. Accepts or declines
4. On acceptance, admin notified

### Flow 4: Admission & Billing
1. Admin confirms admission with refund/credit choice
2. System processes $299 refund via Stripe OR marks as credited
3. System creates $4,500 facility invoice record
4. Admin issues invoice via Stripe
5. Webhook updates status when paid

---

## Design Specifications

### Pre-Checkout Form (New Component)
```text
+------------------------------------------+
|  Start Your Placement                    |
|                                          |
|  Full Name *                             |
|  [________________________]              |
|                                          |
|  Email Address *                         |
|  [________________________]              |
|                                          |
|  Phone (optional)                        |
|  [+1 v] [_______________]                |
|                                          |
|  Country *                               |
|  [Select country...        v]            |
|                                          |
|  [  Continue to Payment - $299  ]        |
|                                          |
|  Fee refunded upon confirmed admission   |
+------------------------------------------+
```

### Provider Fee Structure Display
```text
+------------------------------------------+
|  PLACEMENT FEES                          |
|                                          |
|  Domestic Placements                     |
|  US-based families                       |
|  Standard: $1,000  |  Pro: $800          |
|                                          |
|  ─────────────────────────────────────── |
|                                          |
|  International Placements                |
|  Global clients seeking US treatment     |
|  Flat Fee: $4,500                        |
|                                          |
|  Charged only on confirmed admission     |
+------------------------------------------+
```

---

## Responsive Design Notes

All new components will use existing Tailwind patterns:
- Mobile-first grid layouts
- `sm:` / `md:` / `lg:` breakpoints for responsive behavior
- Consistent spacing with existing design system

---

## Timeline Estimate

| Task | Complexity |
|------|------------|
| Fix checkout flow bug | Low |
| Add pre-checkout form | Medium |
| Update provider fee display | Low |
| Enhance landing page | Medium |
| Normalize intake data | Low |
| End-to-end testing | Medium |

---

## Summary

This plan addresses:
1. **Critical bug** - Checkout flow will work without errors
2. **Provider clarity** - Clear distinction between domestic ($1K) and international ($4.5K) fees  
3. **Enterprise design** - Landing page worthy of a premium $299 service
4. **Data integrity** - Consistent data format throughout the system
5. **Production readiness** - Full end-to-end flow verification
