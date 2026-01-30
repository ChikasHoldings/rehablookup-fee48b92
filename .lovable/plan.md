

# Plan: Fix and Complete ACH Instant Verification with Stripe Financial Connections

## Summary

The current payment method implementation already has the foundation for **Instant Verification** via Stripe Financial Connections, but there are critical issues preventing it from working properly. This plan addresses those issues and ensures both ACH (via bank login) and Card payments are fully functional.

---

## What's Already in Place

- SetupIntent creation with `us_bank_account` and `card` payment method types
- Financial Connections with `payment_method` permission
- `verification_method: 'instant'` configured on the backend
- Frontend flow using `collectBankAccountForSetup()` and `confirmUsBankAccountSetup()`
- Database table `provider_payment_methods` with verification tracking

---

## Issues to Fix

### Issue 1: Missing Account Holder Name in ACH Flow

The `collectBankAccountForSetup()` call passes an empty `billing_details.name`, which can cause issues with some banks during instant verification.

**Fix**: Collect the account holder's name from the user or fetch it from the facility data before initiating the Financial Connections flow.

### Issue 2: Incomplete Error Handling for Edge Cases

The current implementation doesn't properly handle all SetupIntent states, particularly when verification fails or when the user's bank doesn't support instant verification.

**Fix**: Add comprehensive status handling for all possible `setupIntent.status` values and `next_action` types.

### Issue 3: Verification Status Not Properly Tracked

The `save-provider-payment-method` function checks for `status_details.blocked` but doesn't properly read the ACH account's verification status from Stripe.

**Fix**: Update the edge function to properly check and store the verification status from the payment method.

### Issue 4: No Visual Feedback for Pending Verification

If instant verification fails and falls back to micro-deposits, users aren't given clear instructions or status updates.

**Fix**: Add UI components to display verification status and next steps.

---

## Implementation Steps

### Step 1: Update Frontend Payment Form

**File**: `src/components/provider/AddPaymentMethodModal.tsx`

- Add account holder name input field for ACH
- Pre-populate name from facility data where available
- Pass the name to `collectBankAccountForSetup()` billing details
- Add comprehensive status handling for all SetupIntent states
- Display clear messaging for:
  - Instant verification success
  - Micro-deposit fallback (with timeline explanation)
  - Verification failure scenarios

### Step 2: Enhance Setup Edge Function

**File**: `supabase/functions/setup-provider-payment-method/index.ts`

- Ensure `verification_method: 'instant'` is enforced (already configured)
- Add the facility name to the SetupIntent metadata for tracking
- Return additional context for the frontend (customer name for pre-fill)

### Step 3: Improve Save Payment Method Function

**File**: `supabase/functions/save-provider-payment-method/index.ts`

- Properly check `us_bank_account.status` field (values: `new`, `validated`, `verified`, `verification_failed`, `errored`)
- Store verification status in database
- Handle both instantly verified and pending verification states

### Step 4: Add Verification Status Display

**File**: `src/components/provider/AddPaymentMethodModal.tsx` (or new component)

- Show verification badge/status on saved payment methods
- Display "Pending Verification" for micro-deposit fallback cases
- Add inline instructions for completing micro-deposit verification

---

## Technical Details

### SetupIntent Status Flow

```text
┌─────────────────────────────────────────────────────────────────┐
│                     SetupIntent Flow                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  collectBankAccountForSetup()                                   │
│           │                                                     │
│           ▼                                                     │
│  ┌─────────────────┐                                            │
│  │ User Selects    │                                            │
│  │ Bank & Logs In  │                                            │
│  └────────┬────────┘                                            │
│           │                                                     │
│           ▼                                                     │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ SetupIntent Status                                      │    │
│  ├─────────────────────────────────────────────────────────┤    │
│  │ requires_payment_method → User cancelled                │    │
│  │ requires_confirmation   → Call confirmUsBankAccountSetup│    │
│  │ succeeded               → Instantly verified, save PM   │    │
│  └─────────────────────────────────────────────────────────┘    │
│           │                                                     │
│           ▼                                                     │
│  confirmUsBankAccountSetup()                                    │
│           │                                                     │
│           ▼                                                     │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ Confirmed Status                                        │    │
│  ├─────────────────────────────────────────────────────────┤    │
│  │ succeeded              → Verified! Save payment method  │    │
│  │ requires_action        → Check next_action.type         │    │
│  │   ├─ verify_with_microdeposits → Fallback, notify user  │    │
│  │   └─ redirect_to_url          → 3DS/Bank redirect       │    │
│  │ processing             → Pending verification           │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Database Updates

The `provider_payment_methods.is_verified` field will be set based on:

| Stripe Status | `is_verified` Value |
|---------------|---------------------|
| `verified` | `true` |
| `validated` | `true` |
| `new` | `false` (pending) |
| `verification_failed` | `false` |
| `errored` | `false` |

### Card Verification

For cards, verification is automatic via 3D Secure when required. The current `confirmCardSetup()` implementation handles this correctly. We'll add:

- Better error messaging for declined cards
- Support for 3DS redirect flows if triggered

---

## User Experience Flow

### ACH Instant Verification (Happy Path)

1. User clicks "Connect Bank Account"
2. Stripe Financial Connections modal opens
3. User searches for their bank
4. User logs into their bank (OAuth flow)
5. User selects checking/savings account
6. User authorizes connection
7. Bank is instantly verified and saved
8. Success message displayed

### ACH with Micro-deposit Fallback

1. User clicks "Connect Bank Account"
2. User's bank doesn't support instant verification
3. User enters bank details manually
4. System initiates micro-deposits ($0.01 x 2)
5. User sees "Pending Verification" status
6. In 1-2 business days, user receives email from Stripe
7. User verifies amounts via Stripe-hosted page
8. Payment method becomes verified

### Card Payment (Happy Path)

1. User switches to "Credit/Debit Card" tab
2. User enters card number, expiry, CVC
3. User clicks "Save Card"
4. Card is verified and saved immediately
5. Success message displayed

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/provider/AddPaymentMethodModal.tsx` | Add name input, improve status handling, better UX messaging |
| `supabase/functions/setup-provider-payment-method/index.ts` | Include facility name in response for pre-fill |
| `supabase/functions/save-provider-payment-method/index.ts` | Properly check verification status from Stripe API |

---

## Testing Approach

After implementation, test using Stripe's test bank credentials:

- **Test Institution**: Use "Test Institution" in Financial Connections sandbox
- **Success Flow**: Login credentials trigger instant verification
- **Manual Entry Test**: Account `000123456789`, Routing `110000000` → triggers micro-deposits

