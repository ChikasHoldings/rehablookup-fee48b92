
# Stripe Payment System - Complete Bug Fix & Remediation Plan

## Executive Summary

**CRITICAL FINDING**: The previous implementation was incomplete. Most critical changes were NOT applied, leaving the payment system with multiple bugs that will cause silent failures and broken checkouts.

---

## Critical Bugs Discovered

### SEVERITY: CRITICAL (Payment System Non-Functional)

| Issue | File | Line | Current | Required |
|-------|------|------|---------|----------|
| Invalid Price ID | `create-checkout/index.ts` | 11 | `price_pro_monthly` (placeholder) | `price_1Sel1C9fxdThyiakWLfgbl9K` |
| Wrong Price Stored | `stripe-webhook/index.ts` | 160 | `price_cents: 9900` | `price_cents: 39900` |
| Frontend Wrong Price | `useSubscription.ts` | 130 | `price: "$99"` | `price: "$399"` |
| Frontend Invalid IDs | `useSubscription.ts` | 143-144 | `price_pro_monthly`, `prod_pro_monthly` | Real Stripe IDs |

### SEVERITY: HIGH (SDK Version Mismatch)

10 edge functions still use outdated `stripe@14.21.0` with deprecated API `2023-10-16`:

| Function | Current SDK | Required SDK |
|----------|-------------|--------------|
| `subscribe-pro` | 14.21.0 | 18.5.0 |
| `purchase-credits` | 14.21.0 | 18.5.0 |
| `unlock-lead` | 14.21.0 | 18.5.0 |
| `check-provider-health-alerts` | 14.21.0 | 18.5.0 |
| `check-churn-alerts` | 14.21.0 | 18.5.0 |
| `send-retention-outreach` | 14.21.0 | 18.5.0 |
| `send-payment-reminder` | 14.21.0 | 18.5.0 |
| `send-followup-reminders` | 14.21.0 | 18.5.0 |
| `send-approval-email` | 14.21.0 | 18.5.0 |
| `_shared/email-templates.ts` | 14.21.0 | 18.5.0 |

### SEVERITY: MEDIUM (Incorrect Pricing in Emails/Comments)

| File | Line | Current | Required |
|------|------|---------|----------|
| `submit-lead/index.ts` | 172 | `$99/month` | `$399/month` |
| `check-subscription/index.ts` | 11 | `$99/mo` (comment) | `$399/mo` |
| `_shared/email-templates.ts` | 7 | `$99/mo` (comment) | `$399/mo` |
| `useSubscription.ts` | 106 | `$99/mo` (comment) | `$399/mo` |
| `subscribe-pro/index.ts` | 11 | `PRO_PRICE_CENTS = 9900` | `39900` |

---

## Files Already Fixed (Verified Working)

- `customer-portal/index.ts` - SDK updated, return URL fixed
- `send-profile-reminders/index.ts` - SDK updated
- `check-subscription/index.ts` - SDK updated (but comment still wrong)

---

## Complete Remediation Plan

### Phase 1: Critical Price ID Fixes (Payments Will Fail Without This)

**1.1 create-checkout/index.ts (Line 11)**
```typescript
// FROM:
const PRO_PRICE_ID = "price_pro_monthly"; // $99/mo Pro subscription

// TO:
const PRO_PRICE_ID = "price_1Sel1C9fxdThyiakWLfgbl9K"; // $399/mo RehabLookup Pro
```

**1.2 useSubscription.ts (Lines 106, 128-145)**
```typescript
// Update PLAN_DETAILS.pro:
pro: {
  name: "Pro",
  price: "$399",  // Was $99
  period: "/month",
  description: "Enhanced visibility + discounts",
  location_limit: 5,
  unlock_discount: 20,
  features: [...],
  price_id: "price_1Sel1C9fxdThyiakWLfgbl9K",  // Was placeholder
  product_id: "prod_Tbyz1bf6iYyzYd",            // Was placeholder
}
```

**1.3 stripe-webhook/index.ts (Line 160)**
```typescript
// FROM:
price_cents: 9900,

// TO:
price_cents: 39900,
```

### Phase 2: SDK Standardization (10 Files)

Update all edge functions to use consistent versions:
- `stripe@18.5.0`
- `@supabase/supabase-js@2.57.2`
- `apiVersion: "2025-08-27.basil"`

**Files to update:**
1. `subscribe-pro/index.ts` (lines 2-3, 11, 88)
2. `purchase-credits/index.ts` (lines 2-3, 87)
3. `unlock-lead/index.ts` (lines 2-3, 213)
4. `check-provider-health-alerts/index.ts` (lines 2, 4)
5. `check-churn-alerts/index.ts` (lines 2, 4)
6. `send-retention-outreach/index.ts` (lines 2, 4)
7. `send-payment-reminder/index.ts` (line 4)
8. `send-followup-reminders/index.ts` (line 4)
9. `send-approval-email/index.ts` (line 4)
10. `_shared/email-templates.ts` (line 10)

### Phase 3: Email & Comment Pricing Updates

**3.1 submit-lead/index.ts (Line 172)**
```html
<!-- FROM: -->
<strong>Pro subscription:</strong> $99/month

<!-- TO: -->
<strong>Pro subscription:</strong> $399/month
```

**3.2 check-subscription/index.ts (Line 11)**
```typescript
// FROM:
// Pro subscription = $99/mo for enhanced features

// TO:
// Pro subscription = $399/mo for enhanced features
```

**3.3 _shared/email-templates.ts (Line 7)**
```typescript
// FROM:
* NEW MODEL: Free (no subscription) vs Pro ($99/mo)

// TO:
* NEW MODEL: Free (no subscription) vs Pro ($399/mo)
```

**3.4 subscribe-pro/index.ts (Line 11)**
```typescript
// FROM:
const PRO_PRICE_CENTS = 9900;

// TO:
const PRO_PRICE_CENTS = 39900;
```

---

## Technical Details

### Stripe Configuration (Verified)
- **Price ID**: `price_1Sel1C9fxdThyiakWLfgbl9K`
- **Product ID**: `prod_Tbyz1bf6iYyzYd`
- **Product Name**: RehabLookup Professional
- **Amount**: $399/mo (39900 cents)
- **Status**: Active

### SDK Versions (Target)
```typescript
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
```

---

## Files to Modify (Complete List)

```text
# Phase 1: Critical (3 files)
supabase/functions/create-checkout/index.ts
src/hooks/useSubscription.ts
supabase/functions/stripe-webhook/index.ts

# Phase 2: SDK Updates (10 files)
supabase/functions/subscribe-pro/index.ts
supabase/functions/purchase-credits/index.ts
supabase/functions/unlock-lead/index.ts
supabase/functions/check-provider-health-alerts/index.ts
supabase/functions/check-churn-alerts/index.ts
supabase/functions/send-retention-outreach/index.ts
supabase/functions/send-payment-reminder/index.ts
supabase/functions/send-followup-reminders/index.ts
supabase/functions/send-approval-email/index.ts
supabase/functions/_shared/email-templates.ts

# Phase 3: Pricing Text (4 files - overlaps with above)
supabase/functions/submit-lead/index.ts
supabase/functions/check-subscription/index.ts
supabase/functions/_shared/email-templates.ts
supabase/functions/subscribe-pro/index.ts
```

**Total unique files: 14**

---

## Post-Implementation Testing Checklist

- [ ] Pro subscription checkout redirects to Stripe with correct $399 price
- [ ] Webhook processes subscription and stores `price_cents: 39900`
- [ ] `check-subscription` returns `isPro: true` for subscribers
- [ ] Frontend displays "$399/month" in plan details
- [ ] Credit purchase checkout works
- [ ] Lead unlock via credits works
- [ ] Lead unlock via Stripe works
- [ ] Customer portal opens and returns to `/provider/credits`
- [ ] Provider emails show "$399/month" in Pro upsell sections
- [ ] No console errors or API version warnings
