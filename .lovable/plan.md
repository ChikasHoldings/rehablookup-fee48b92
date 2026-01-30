
# Stripe Payment System Remediation Plan

## Summary

Update the platform's payment system to correctly use the **$399/mo RehabLookup Pro** subscription with the existing Stripe price, fix all pricing references from $99 to $399, and standardize the Stripe SDK across all edge functions.

---

## Key Discovery

**Existing Stripe Price Found**: `price_1Sel1C9fxdThyiakWLfgbl9K` 
- Amount: $399/mo (39900 cents)
- Product: `prod_Tbyz1bf6iYyzYd` (RehabLookup Professional)
- Status: Active and ready to use

This eliminates the need to create a new product/price in Stripe.

---

## Changes Overview

### Phase 1: Update Price ID & Pricing References

| File | Current | New |
|------|---------|-----|
| `create-checkout/index.ts` | `price_pro_monthly` placeholder | `price_1Sel1C9fxdThyiakWLfgbl9K` |
| `subscribe-pro/index.ts` | Dynamic price creation ($99) | Remove/deprecate - use create-checkout |
| `stripe-webhook/index.ts` | `price_cents: 9900` | `price_cents: 39900` |
| `useSubscription.ts` | `$99/month` in PLAN_DETAILS | `$399/month` |
| `submit-lead/index.ts` | Email mentions $99/month | `$399/month` |
| `check-subscription/index.ts` | Comments mention $99 | `$399` |
| `_shared/email-templates.ts` | Comments mention $99 | `$399` |

### Phase 2: SDK Standardization

Update 10 edge functions from `stripe@14.21.0` to `stripe@18.5.0` and API version `2025-08-27.basil`:

1. `subscribe-pro/index.ts`
2. `purchase-credits/index.ts`
3. `unlock-lead/index.ts`
4. `check-provider-health-alerts/index.ts`
5. `check-churn-alerts/index.ts`
6. `send-retention-outreach/index.ts`
7. `send-payment-reminder/index.ts`
8. `send-followup-reminders/index.ts`
9. `send-approval-email/index.ts`
10. `send-profile-reminders/index.ts`

### Phase 3: Cleanup & URL Fixes

- Update `customer-portal/index.ts` return URL from `/provider/billing` to `/provider/credits`
- Update email template URLs in `stripe-webhook/index.ts`
- Add `prod_Tbyz1bf6iYyzYd` to PRO_PRODUCT_IDS arrays for consistency

---

## Detailed Changes

### 1. create-checkout/index.ts (Critical)

```typescript
// Line 11 - Change from:
const PRO_PRICE_ID = "price_pro_monthly"; // $99/mo Pro subscription

// To:
const PRO_PRICE_ID = "price_1Sel1C9fxdThyiakWLfgbl9K"; // $399/mo RehabLookup Pro
```

### 2. useSubscription.ts (Frontend)

```typescript
// Lines 128-132 - Update PLAN_DETAILS.pro:
pro: {
  name: "Pro",
  price: "$399",  // Was $99
  period: "/month",
  description: "Enhanced visibility + discounts",
  location_limit: 5,
  unlock_discount: 20,
  features: [
    "Up to 5 facility listings",
    "20% off lead unlocks",
    "20% off Concierge placement fees",
    "Featured homepage placement",
    "Priority search ranking",
    "Pro badge on profile",
  ],
  price_id: "price_1Sel1C9fxdThyiakWLfgbl9K",
  product_id: "prod_Tbyz1bf6iYyzYd",
}
```

### 3. stripe-webhook/index.ts

```typescript
// Line 160 - Change from:
price_cents: 9900,

// To:
price_cents: 39900,
```

### 4. subscribe-pro/index.ts

This function will be deprecated in favor of `create-checkout`. Update to redirect or mark as deprecated:

```typescript
// Line 11 - Update price constant:
const PRO_PRICE_CENTS = 39900; // $399/month

// Lines 105-129 - Replace dynamic price creation with hardcoded price ID:
const PRO_PRICE_ID = "price_1Sel1C9fxdThyiakWLfgbl9K";
```

### 5. Email Templates & Comments

Update all instances of "$99" to "$399" in:
- `supabase/functions/submit-lead/index.ts` (line 172)
- `supabase/functions/check-subscription/index.ts` (line 11)
- `supabase/functions/_shared/email-templates.ts` (line 7)

---

## Pro Feature Summary (for reference)

The $399/mo RehabLookup Pro subscription includes:
- **Up to 5 facility listings** (vs 1 for Free)
- **20% off credits** (lead unlock costs)
- **20% off placement fees** (Concierge network)
- **Featured homepage placement**
- **Top of search results** (priority ranking)
- **Pro badge** on facility profile

---

## Files to Modify

```text
# Phase 1: Critical Price Updates
supabase/functions/create-checkout/index.ts
src/hooks/useSubscription.ts
supabase/functions/stripe-webhook/index.ts
supabase/functions/subscribe-pro/index.ts
supabase/functions/submit-lead/index.ts
supabase/functions/check-subscription/index.ts
supabase/functions/_shared/email-templates.ts

# Phase 2: SDK Standardization (10 files)
supabase/functions/purchase-credits/index.ts
supabase/functions/unlock-lead/index.ts
supabase/functions/check-provider-health-alerts/index.ts
supabase/functions/check-churn-alerts/index.ts
supabase/functions/send-retention-outreach/index.ts
supabase/functions/send-payment-reminder/index.ts
supabase/functions/send-followup-reminders/index.ts
supabase/functions/send-approval-email/index.ts
supabase/functions/send-profile-reminders/index.ts

# Phase 3: URL Cleanup
supabase/functions/customer-portal/index.ts
```

---

## Testing Checklist

After implementation:
- [ ] Pro subscription checkout creates session with $399 price
- [ ] Webhook processes subscription and stores correct price_cents (39900)
- [ ] check-subscription returns isPro: true for subscribers
- [ ] Frontend displays "$399/month" in plan details
- [ ] Credit purchases work correctly
- [ ] Lead unlocks apply 20% Pro discount
- [ ] Customer portal opens and returns to correct URL
- [ ] No console errors or failed API calls
