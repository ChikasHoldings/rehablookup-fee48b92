
# Plan: Simplified Placement Fee Structure

## Overview
Update the placement fee structure across the platform to remove the commission percentage option and implement straightforward flat-fee pricing:
- **Free tier**: $1,000 flat fee per placement
- **Pro tier**: $800 flat fee per placement (20% discount)

---

## Files to Update

### 1. Frontend UI Components

**`src/components/provider/placement-network/PlacementBenefits.tsx`**
- Update `FEE_STRUCTURE` constant to show only flat fee pricing ($1,000 / $800)
- Remove the entire "Commission Option" card from the UI
- Simplify to single pricing display

**`src/components/provider/PlacementTermsModal.tsx`**
- Update Section 1 "Placement Fee Structure" to reflect new pricing
- Remove the Commission Option box entirely
- Update flat fee values: Standard $1,000, Pro $800

**`src/components/provider/ProviderConfirmPlacementModal.tsx`**
- Update `PLACEMENT_FEES` constant: standard = 100000 cents, pro = 80000 cents
- Remove reference to "Commission cap: $1,500 max" in the fee summary

**`src/pages/provider/PlacementNetwork.tsx`**
- Update `PLACEMENT_FEES` constant to flat-fee-only: standard: 1000, pro: 800
- Remove commission option from the agreement preference dropdown
- Remove the commission pricing card from the Billing tab UI

**`src/components/admin/providers/ProviderDetailModal.tsx`**
- Update fee structure display to show only flat fee ($1,000 / $800)
- Remove the commission line from the fee breakdown

### 2. Backend Edge Function

**`supabase/functions/charge-placement-fee/index.ts`**
- Update `PLACEMENT_FEES` constant:
  - `flat_fee.standard`: 100000 (cents = $1,000)
  - Keep `pro_discount`: 20 (percentage)
- Remove commission logic and `COMMISSION_CAP_CENTS`
- Simplify fee calculation to flat-fee only

### 3. Subscription Details

**`src/hooks/useSubscription.ts`**
- Update Pro plan feature text from "20% off Concierge placement fees" to reflect the actual savings: "Pro placement fee: $800 (save $200)"

---

## Technical Details

### Updated Constants

```text
Frontend (display values):
  flat_fee: { standard: "$1,000", pro: "$800" }

Backend (cents):
  flat_fee: { standard: 100000, pro: 80000 }
  pro_discount: 20 (percent)
```

### UI Changes Summary

| Component | Current | After Update |
|-----------|---------|--------------|
| PlacementBenefits | 2-column grid (Flat + Commission) | Single card with flat fee only |
| PlacementTermsModal | 2 option boxes | Single flat fee box |
| PlacementNetwork Billing | 2-column pricing | Single pricing display |
| ProviderConfirmPlacementModal | Shows commission cap text | Clean fee summary |
| Admin Provider Detail | Lists both options | Shows flat fee only |

### Form Field Updates
- Remove or hide the "Fee Preference" dropdown in the Placement Network profile form
- Default all agreements to flat_fee type

---

## Testing Considerations
- Verify the correct fee displays for both Free and Pro providers
- Test the placement confirmation modal shows $1,000 (Free) or $800 (Pro)
- Confirm the edge function charges the correct amount
- Validate the Placement Terms Modal displays updated pricing
- Check Admin dashboard shows simplified fee structure
