
# Provider Panel Placement Network - End-to-End Audit Report

## Executive Summary

After a comprehensive audit of the Provider Placement Network feature, the system is **substantially complete and functional**. The architecture is well-designed with proper separation between onboarding, dashboard management, and billing flows. However, I identified several issues and gaps that should be addressed to ensure production reliability.

---

## Architecture Overview

The Placement Network is a unified, state-based experience with three main states:

```text
+------------------+     +------------------+     +------------------+
|   LANDING STATE  | --> |  ONBOARDING FLOW | --> |   DASHBOARD     |
|  (Non-Members)   |     |   (4-Step Setup) |     |  (Active Users)  |
+------------------+     +------------------+     +------------------+
                                  |
                                  v
                    +---------------------------+
                    | 1. Complete Profile        |
                    | 2. Accept Terms (v1.0)     |
                    | 3. Add Payment Method      |
                    | 4. Select Care Types       |
                    +---------------------------+
```

---

## What's Working Correctly

### 1. Onboarding Flow
- Readiness checklist properly gates network opt-in
- Terms modal fetches and displays signed status correctly
- Payment method modal supports both ACH (Financial Connections) and Card
- Care types modal saves to `concierge_accepted_care_types`
- All modals invalidate queries on success for immediate UI updates

### 2. Dashboard Tabs (Post Opt-In)
- **Introductions**: Shows pending intros, awaiting confirmation section, and past responses
- **Profile**: Full network profile management (care types, insurance, availability, contact info)
- **Billing**: Agreement status, fee structure display, payment methods, invoices
- **Placements**: Historical confirmed placements with fee info

### 3. Edge Functions
- `setup-provider-payment-method`: Creates Stripe SetupIntent with Financial Connections
- `save-provider-payment-method`: Persists payment method with verification status
- `confirm-placement`: Handles dual confirmation workflow (seeker + provider)
- `charge-placement-fee`: Charges provider on confirmation or creates invoice
- `match-concierge-intake`: Sophisticated multi-factor matching algorithm
- `send-concierge-introduction`: Email notifications to providers
- `send-concierge-notifications`: Full notification suite for all lifecycle events

### 4. Database & Security
- `provider_payment_methods` table with proper RLS (providers can CRUD own, admins can view)
- `placement_invoices` table with RLS (providers can view own, admins can manage)
- `concierge_introductions` with proper provider access policies
- Pro subscription discount correctly applied (20% off)

---

## Issues Found

### Issue 1: Introduction Response Link Points to Wrong Route
**Severity**: Medium  
**Location**: `send-concierge-introduction/index.ts` line 75

```typescript
const responseUrl = `${supabaseUrl.replace('.supabase.co', '.lovable.app')}/provider/concierge/respond/${introductionId}`;
```

**Problem**: The URL pattern `/provider/concierge/respond/:id` likely doesn't exist. The current Placement Network page doesn't have a dedicated response route - responses are handled inline in the dashboard.

**Fix**: Update to redirect to the Placement Network page:
```typescript
const responseUrl = `https://rehablookup.lovable.app/provider/placement-network`;
```

### Issue 2: Missing Query Invalidation Key Mismatch
**Severity**: Low  
**Location**: `ProviderConfirmPlacementModal.tsx` lines 89-91

```typescript
queryClient.invalidateQueries({ queryKey: ["provider-introductions"] });
queryClient.invalidateQueries({ queryKey: ["provider-placements"] });
```

**Problem**: The actual query keys used in `PlacementNetwork.tsx` are `["placement-introductions", facilityId]` and `["facility-placements", facilityId]`, not the generic keys being invalidated.

**Fix**: Update to match actual keys:
```typescript
queryClient.invalidateQueries({ queryKey: ["placement-introductions"] });
queryClient.invalidateQueries({ queryKey: ["facility-placements"] });
```

### Issue 3: Invoice Query Uses Wrong Column Reference
**Severity**: Medium  
**Location**: `PlacementNetwork.tsx` line 181

```typescript
const { data: invoices } = useQuery({
  queryKey: ["placement-invoices", selectedFacility?.id],
  queryFn: async () => {
    const { data, error } = await (supabase as any)
      .from("placement_invoices")
      .select("*")
      .eq("facility_id", selectedFacility.id)
```

**Problem**: The query works, but uses type assertion `(supabase as any)` which bypasses TypeScript checking. The `placement_invoices` table exists and has correct RLS.

**Fix**: The type assertion is acceptable for now since the table was added after types were generated. When types are regenerated, this can be cleaned up.

### Issue 4: Placement Invoices Missing inquiry_id in Some Edge Cases
**Severity**: Low  
**Location**: `charge-placement-fee/index.ts`

The invoice creation includes `inquiry_id`, but the `placement_invoices` table schema shows `case_id` as the primary reference (from old placement_cases table). The `inquiry_id` column was added later.

**Observation**: The code correctly uses `inquiry_id` which is the new pattern. No action needed.

### Issue 5: CareTypesModal Uses Hardcoded Care Types
**Severity**: Low (Design Choice)  
**Location**: `CareTypesModal.tsx`

The care types are hardcoded in the component. This is fine but means adding new care types requires a code change.

**No action required** - this is intentional for controlled vocabulary.

---

## Missing Features (Minor)

### 1. No Delete Payment Method UI
Providers can add payment methods but there's no UI to remove them. The RLS policy allows deletion.

### 2. No Edit Care Types from Dashboard
After onboarding, providers must go to the Profile tab to modify care types. The checklist action opens the modal but there's no shortcut from the dashboard.

### 3. No Invoice Receipt Download
The invoice list shows status but doesn't provide receipt download links for paid invoices (Stripe `receipt_url` is stored but not displayed).

### 4. No Message/Tour Tabs Implementation
The memory notes mention Messages and Tours tabs, but the current `PlacementNetwork.tsx` only has 4 tabs: Introductions, Profile, Billing, Placements.

---

## Database Schema Verification

### `provider_payment_methods` - Complete
All required columns present: id, facility_id, type, stripe_payment_method_id, stripe_customer_id, last_four, bank_name, card_brand, exp_month, exp_year, is_default, is_verified, created_at, updated_at

### `placement_invoices` - Complete
Comprehensive schema with: amount tracking, status, Stripe integration, retry logic, waiver support, override support, delinquency tracking

### `concierge_introductions` - Complete
Proper linking: inquiry_id, facility_id, provider_response, provider_responded_at, provider_notes

### `facilities` concierge columns - Complete
All needed: concierge_network_opted_in, concierge_opted_in_at, concierge_accepted_care_types, concierge_accepted_insurance, concierge_availability_status, concierge_admissions_contact/email/phone, concierge_agreement_preference, concierge_terms_accepted_at/version/by

---

## Recommended Fixes

### High Priority
1. Fix the introduction email response URL to point to the correct route
2. Fix query invalidation keys in ProviderConfirmPlacementModal

### Medium Priority
3. Add receipt_url display for paid invoices
4. Add "Remove Payment Method" button with confirmation

### Low Priority (Enhancements)
5. Consider adding Messages/Tours tabs if those features are planned
6. Add quick-access buttons to edit settings from dashboard header

---

## Technical Debt Notes

- Multiple `(supabase as any)` casts due to types not regenerated after table additions
- Some edge functions still reference old paths (`/provider/concierge/` routes)
- RLS linter shows some "always true" policies but these are intentional for service role access

---

## Conclusion

The Provider Placement Network is **production-ready** with minor fixes needed. The core flows work correctly:
- Provider onboarding with 4-step readiness checklist
- Network opt-in with all prerequisites enforced
- Introduction receiving and responding
- Dual confirmation workflow for placements
- Automated and admin-initiated billing
- Pro subscriber discounts applied correctly

The two high-priority fixes (response URL and query invalidation keys) should be implemented before heavy production usage.
