
# Monetization Overhaul Implementation Plan

## Status: ✅ COMPLETE

All phases have been successfully implemented. The platform has been transitioned from a tiered subscription model (Basic/Professional/Featured) to a **freemium + pay-per-lead unlock model** with an optional **Pro subscription** for enhanced benefits.

---

## Completed Phases

### ✅ Phase 1: Security & Lead Privacy (CRITICAL)
- Fixed email lead leaks in `send-lead-digest`, `send-followup-reminders`, `send-weekly-digest`
- Removed full contact info from notification metadata in `submit-lead`
- Lead display components already mask locked data correctly

### ✅ Phase 2: Remove Old Subscription Tiers
- Cleaned up 15+ files with legacy Professional/Featured plan references
- Updated hooks: `useApprovedFacilities`, `useStaticFacilities`
- Simplified `facilityPlanSort.ts` to Pro vs Free sorting
- Removed tier-based lead type logic from components

### ✅ Phase 3: Provider Panel Updates
- Updated Dashboard metrics for new model
- Removed lead quota references from Analytics
- Simplified notification categorization
- Updated CenterProfile and search components

### ✅ Phase 4: Facility Limit Enforcement
- Created centralized `useFacilityLimits` hook
- Free = 1 facility max, Pro = 5 facilities max
- Updated AddLocation, Dashboard, ProviderHeader

### ✅ Phase 5: Edge Functions Cleanup
- Updated `_shared/email-templates.ts` with new PlanType and PLAN_CONFIG
- Refactored all email functions for Pro-aware styling
- Removed lead quota logic, replaced with unlock counts
- Updated `get-facility-plan` to return only `free` or `pro`

### ✅ Phase 6: Admin Panel Updates
- Updated `AdminDashboard.tsx` plan colors and breakdown (Free/Pro)
- Updated `AdminSubscriptions.tsx` stats types and distribution
- Removed Basic/Professional/Featured tier references

### ✅ Phase 7: Website Pages Updates
- `ForProviders.tsx` already correctly shows new model
- `ProviderFAQ.tsx` already mentions unlock model and Pro Visibility
- No additional changes needed

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

## Key Technical Changes Summary

### Database Tables (No Changes Needed)
- `pro_subscriptions` - Pro subscription tracking
- `lead_unlocks` - Lead unlock records
- `provider_credits` - Credit balance
- `credit_transactions` - Purchase/unlock history

### Updated Edge Functions
| Function | Changes |
|----------|---------|
| `_shared/email-templates.ts` | New PlanType, PLAN_CONFIG, getProviderPlan |
| `send-lead-digest` | Removed quota, uses unlock counts |
| `send-weekly-digest` | Pro-aware styling, unlock metrics |
| `send-followup-reminders` | Masked lead info, Pro styling |
| `send-approval-email` | Pro-aware messaging |
| `send-profile-reminders` | Pro benefits messaging |
| `send-provider-welcome-email` | Pro welcome path |
| `send-review-notification` | Free/Pro styling |
| `send-subscription-alerts` | Removed lead limit warnings |
| `get-facility-plan` | Returns only 'free' or 'pro' |

### Updated Components/Hooks
| File | Changes |
|------|---------|
| `useFacilityLimits.ts` | New centralized hook |
| `useApprovedFacilities.ts` | Removed legacy fields |
| `useStaticFacilities.ts` | Simplified to isPro |
| `facilityPlanSort.ts` | Pro vs Free sorting |
| `FacilityCard.tsx` | isPro check simplified |
| `ProviderHeader.tsx` | Uses useFacilityLimits |
| `Dashboard.tsx` | Uses useFacilityLimits |
| `AddLocation.tsx` | Uses useFacilityLimits |
| `AdminDashboard.tsx` | Free/Pro plan colors |
| `AdminSubscriptions.tsx` | Free/Pro stats |


