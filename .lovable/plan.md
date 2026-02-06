
# Comprehensive Stripe Payment Audit Report & Fix Plan

## Executive Summary

After auditing all Stripe products, prices, edge functions, frontend flows, and database tables, I found **several issues** that need to be addressed to ensure all payment flows work correctly.

---

## Current Stripe Configuration

### Products & Prices Audit

| Product | Price ID | Amount | Type | Status |
|---------|----------|--------|------|--------|
| **Domestic Concierge Service** | `price_1SxeVg9fxdThyiakIWdVSRtT` | $29 | Seeker Fee | CORRECT |
| **International Placement Service Fee** | `price_1SwGkF9fxdThyiakznR520wG` | $299 | Seeker Fee | CORRECT |
| **Domestic Placement Service Fee** | `price_1SxeRE9fxdThyiakM7TJvqDM` | $1,000 | Provider Fee | CORRECT (New) |
| **International Admission Facility Fee** | `price_1SxJoI9fxdThyiakeI4gjY6I` | $3,000 | Provider Fee | CORRECT |
| **RehabLookup Pro** | `price_1Sel1C9fxdThyiakWLfgbl9K` | $399/mo | Subscription | CORRECT |
| **Additional Facility Listing** | `price_1SvUAg9fxdThyiakhDtW2pG9` | $49 | One-time | CORRECT |
| **Lead Unlock Credits** | Dynamic | $100-$1,000 | One-time | CORRECT |

### Deprecated Products (to archive)
- `prod_Tl2ezOd8B09qtL` - Old "RehabLookup Concierge Placement" ($29) - replaced by new product
- `prod_Tu4u0alyv9sPuP` - Old "International Admission Facility Fee" ($4,500) - wrong price

---

## Issues Found & Fixes Required

### Issue 1: Missing STRIPE_WEBHOOK_SECRET (CRITICAL)

**Problem:** The `STRIPE_WEBHOOK_SECRET` is not configured in secrets. The webhook currently falls back to parsing without signature verification, which is insecure.

**Impact:** Without signature verification, the webhook is vulnerable to replay attacks and forged requests in production.

**Fix:** Add the `STRIPE_WEBHOOK_SECRET` from your Stripe Dashboard (Developers > Webhooks > Signing secret).

---

### Issue 2: Pro Subscription Webhook Missing facility_id

**Problem:** In the `stripe-webhook` function, when handling `checkout.session.completed` for Pro subscriptions, the code relies on `session.metadata?.facility_id` being present. However, looking at `subscribe-pro`, it correctly includes this in metadata, but `create-checkout` does NOT include `facility_id`.

**Code Location:** `supabase/functions/create-checkout/index.ts`

**Current (Lines 170-174):**
```typescript
metadata: {
  user_id: user.id,
  plan: "pro",
  plan_name: "Pro",
},
```

**Problem:** Missing `facility_id` and `type: "pro_subscription"` which the webhook requires.

**Fix:** Update `create-checkout` to include required metadata fields.

---

### Issue 3: International Placement Case Creation Gap

**Problem:** Looking at `submit-international-intake`, after payment verification, it creates a case in `international_placement_cases`. However, the Stripe webhook for international payments (`metadataType === "international_placement"`) only updates `international_payments` table, not the cases table. This means if the user doesn't complete the intake form after payment, the case won't be created.

**Impact:** Paid users who abandon the intake form have no case record for admin follow-up.

**Fix:** The webhook should create a pending case record when payment succeeds, and `submit-international-intake` should update it rather than only create new.

---

### Issue 4: Domestic Concierge Webhook Handler Missing

**Problem:** The `stripe-webhook` handles `international_placement` payments but there's NO handler for domestic concierge payments (`service: "concierge_placement"`). The domestic flow relies entirely on frontend-driven `submit-concierge-intake` after payment success URL redirect.

**Impact:** If a user pays but closes the browser before being redirected, the intake is never submitted and no case is created.

**Fix:** Add webhook handler for domestic concierge payments to create a pending `concierge_inquiries` record.

---

### Issue 5: create-checkout vs subscribe-pro Duplication

**Problem:** There are two edge functions for Pro subscription checkout:
1. `create-checkout` - Generic checkout, includes promo code support
2. `subscribe-pro` - Specific to Pro, requires facilityId

The frontend uses `subscribe-pro` (from Billing.tsx and ProUpgrade.tsx), but `create-checkout` exists and doesn't include required metadata.

**Recommendation:** Either deprecate `create-checkout` or ensure it has the same metadata handling.

---

## Payment Flow Verification

### Flow 1: Pro Membership Subscription
```
Provider clicks "Upgrade to Pro"
→ calls subscribe-pro with facilityId
→ Stripe Checkout Session created with mode: "subscription"
→ User pays on Stripe
→ Webhook: checkout.session.completed (type: pro_subscription)
→ Creates/updates pro_subscriptions record
→ User redirected to /provider/billing?pro_success=true
```
**Status:** WORKING (uses subscribe-pro)

### Flow 2: Domestic Concierge ($29)
```
Seeker submits intake form → calls create-concierge-checkout
→ Stripe Checkout Session created with mode: "payment"
→ User pays on Stripe
→ Redirected to intake page with session_id
→ Seeker submits intake → calls submit-concierge-intake
→ Verifies payment, creates concierge_inquiries record
```
**Status:** WORKING but NO WEBHOOK SAFETY NET

### Flow 3: International Placement ($299)
```
International seeker submits initial form → calls create-international-checkout
→ Stripe Checkout Session created with mode: "payment"
→ User pays on Stripe
→ Webhook: checkout.session.completed (type: international_placement)
→ Updates international_payments record
→ Redirected to intake page
→ Seeker submits intake → calls submit-international-intake
→ Creates international_placement_cases record
```
**Status:** WORKING

### Flow 4: Placement Confirmation & Fee ($1,000/$800)
```
Admin confirms placement → calls confirm-placement
→ Updates concierge_inquiries status to 'placed'
→ Triggers charge-placement-fee
→ Creates placement_invoices, charges provider's saved payment method
→ If no payment method, creates pending invoice
```
**Status:** WORKING

---

## Recommended Fixes

### Priority 1: Add STRIPE_WEBHOOK_SECRET
Request the secret from Stripe Dashboard and add it as a secret.

### Priority 2: Add Domestic Concierge Webhook Handler
Add a handler in `stripe-webhook` for `service: "concierge_placement"` payments to create pending records.

### Priority 3: Fix create-checkout Metadata
Update `create-checkout` to include `type`, `facility_id`, and match the metadata structure expected by the webhook.

### Priority 4: Improve International Payment Webhook
Enhance the webhook to create a pending case record when payment succeeds, not just update the payments table.

---

## Technical Changes Required

### 1. stripe-webhook/index.ts
Add handler for domestic concierge payments (~20 lines)

### 2. create-checkout/index.ts
Add missing metadata fields for webhook compatibility (~5 lines)

### 3. Add STRIPE_WEBHOOK_SECRET
Secret configuration (requires Stripe Dashboard access)

---

## Testing Checklist After Fixes

1. **Pro Membership Flow**
   - Subscribe to Pro from Billing page
   - Verify `pro_subscriptions` record created
   - Verify 20% discount applies to lead unlocks

2. **Domestic Concierge Flow**
   - Start intake form as seeker
   - Complete payment
   - Submit intake form
   - Verify `concierge_inquiries` record created

3. **International Placement Flow**
   - Start international application
   - Complete $299 payment
   - Submit intake form
   - Verify `international_placement_cases` record created

4. **Placement Confirmation**
   - As admin, confirm a placement
   - Verify fee is charged or invoice created
   - Verify case status updates to 'placed'

5. **Webhook Recovery**
   - Simulate payment without form submission
   - Verify pending record created via webhook
