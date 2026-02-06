
# Placement Intake Flow Restructure: Payment Last + Polished Thank You

## Overview

Restructuring the domestic concierge intake flow so that:
1. Users complete the full intake form first (Steps 1-5)
2. Email verification happens as Step 6 (before payment)
3. Payment is the final step (Step 7)
4. After successful payment, intake is auto-submitted and users see a polished thank you page with inline optional password creation
5. Abandoned cart emails trigger for users who completed form + verified email but didn't pay

---

## New Flow Diagram

```text
CURRENT (6 steps):
Steps 1-5 (Form) → Step 6 (Review) → Pay → Return → Submit → Thank You Page → Create Password Page

NEW (7 steps):
Steps 1-5 (Form) → Step 6 (Email Verify) → Step 7 (Review + Pay) → Auto-Submit + Polished Thank You with Inline Password
                                                     ↓
                                        (If no payment after 2 hours)
                                                     ↓
                                        Abandoned Cart Email Trigger
```

---

## Phase 1: Database Schema Updates

Add new columns to track form completion and email verification for abandoned cart detection:

**concierge_inquiries table:**
- `email_verified_at` (timestamp) - When email was verified in the intake flow
- `form_completed_at` (timestamp) - When all form fields were filled (pre-payment)
- `payment_reminder_count` (integer, default 0) - Track how many reminders sent

---

## Phase 2: New Step Component - Email Verification

**New File: `src/components/concierge/StepEmailVerification.tsx`**

A dedicated step component that:
- Displays the email from Step 5 (read-only)
- Has "Send Verification Code" button
- Shows 6-digit OTP input after code sent
- Shows green checkmark when verified
- Stores verified_at timestamp locally
- Blocks proceeding until email is verified

UI Design:
- Clean, focused layout with the email prominently displayed
- Trust indicators (secure verification, no spam)
- Option to edit email (goes back to Step 5)

---

## Phase 3: Restructure ConciergeIntake.tsx

**File: `src/pages/concierge/ConciergeIntake.tsx`**

Key changes:

1. **Update STEP_CONFIG** - Add new email verification step:
```typescript
const STEP_CONFIG = [
  { title: "Who Needs Help", ... },      // Step 1
  { title: "Care Needs", ... },          // Step 2
  { title: "Location & Preferences", ... }, // Step 3
  { title: "Payment & Insurance", ... }, // Step 4
  { title: "Contact Information", ... }, // Step 5
  { title: "Verify Email", ... },        // Step 6 (NEW)
  { title: "Review & Submit", ... },     // Step 7 (was Step 6)
];
```

2. **Add email verification state**:
```typescript
interface EmailVerificationState {
  verified: boolean;
  verifiedAt: string | null;
  codeSent: boolean;
}
```

3. **Update flow**:
- After Step 5 (Contact), user proceeds to Step 6 (Email Verification)
- User must verify email before proceeding to Step 7
- Step 7 shows review + payment button
- After Stripe payment success, auto-submit intake (no manual submit button)
- Navigate directly to new thank you page

4. **Save draft before payment**:
- Before redirecting to Stripe, call new `save-placement-draft` function
- This persists form data + email verification to database
- Enables abandoned cart detection

---

## Phase 4: New Edge Function - Save Placement Draft

**New File: `supabase/functions/save-placement-draft/index.ts`**

Creates or updates a pending draft record in `concierge_inquiries`:
- Status: `pending_payment`
- Payment status: `pending`
- Form data: All intake fields
- Email verified at: Timestamp
- Form completed at: Now

Returns `draft_id` for tracking and abandoned cart emails.

---

## Phase 5: Polished Thank You Page with Inline Password Creation

**File: `src/pages/concierge/ConciergeThankYou.tsx`**

Complete redesign with inline password creation (not separate page):

**Layout:**
1. Success header with large checkmark animation
2. Personalized message: "Thank you, [First Name]!"
3. Case reference number
4. "What Happens Next?" timeline (styled cards)
5. **Inline Optional Password Creation Section**:
   - Collapsed by default with "Create Account to Track Progress" button
   - Expands to show password fields (no email OTP - already verified)
   - Password + Confirm Password inputs
   - "Create Account" button
   - Skip option to return home
6. Contact support footer

**Password Creation Flow:**
- Since email was verified in Step 6, no need for OTP again
- Use Supabase signUp with the verified email
- Link the concierge_inquiry to the new user_id
- Auto-login after account creation
- Show success message and redirect to /account

---

## Phase 6: Update Abandoned Cart Email Template

**File: `supabase/functions/send-abandoned-placement-email/index.ts`**

Update the email template to be more professional and conversion-focused:

**Design Changes:**
- Dark navy blue header (#1B365D) with white text
- "REHABLOOKUP" branding prominent
- Personalized subject: "[First Name], your placement request is almost complete"
- Remove word "matching" - use "placement service" and "connect you with facilities"
- Benefit bullets (avoid "matching"):
  - "Expert Placement Advisors who review your unique needs"
  - "Verified Treatment Centers only - every facility vetted"
  - "No sales pressure - we work for you, not the facilities"
  - "Concierge-level coordination and support"
  - "24-48 hour response time from our team"
- Summary of saved intake (location, level of care, urgency)
- Clear pricing: "$29 placement service fee - No hidden costs"
- Strong CTA: "Complete My Placement Request"
- Dark navy blue footer (#1B365D) with white text

**Trigger Logic Update:**
- Find drafts where:
  - `form_completed_at` is set
  - `email_verified_at` is set
  - `payment_status = 'pending'`
  - Created 2-24 hours ago
  - `payment_reminder_count < 2`
- Send email and increment reminder count
- Configurable timing: 2 hours for first, 12 hours for second

---

## Phase 7: Update create-concierge-checkout Function

**File: `supabase/functions/create-concierge-checkout/index.ts`**

Updates:
1. Accept `draftId` in request body
2. Before creating Stripe session, call save-placement-draft if no draftId
3. Include `draft_id` in Stripe metadata for webhook recovery
4. Return draft_id along with checkout URL

---

## Phase 8: Update stripe-webhook Handler

**File: `supabase/functions/stripe-webhook/index.ts`**

The domestic concierge handler (added in previous fix) already creates pending records. Update to:
1. Check if draft exists (by draft_id in metadata)
2. If exists, update status to `paid`
3. If not, create new pending record (safety net)

---

## Files to Create

1. `src/components/concierge/StepEmailVerification.tsx` - New email verification step
2. `supabase/functions/save-placement-draft/index.ts` - Save draft before payment

## Files to Modify

1. `src/pages/concierge/ConciergeIntake.tsx` - Add Step 6, restructure flow
2. `src/pages/concierge/ConciergeThankYou.tsx` - Complete redesign with inline password
3. `supabase/functions/send-abandoned-placement-email/index.ts` - New email template
4. `supabase/functions/create-concierge-checkout/index.ts` - Accept draft data
5. Database migration - Add tracking columns

---

## Inline Password Creation on Thank You Page

Since email was verified during intake (Step 6), the thank you page can offer a streamlined account creation:

```typescript
// No OTP needed - email already verified in intake
const handleCreateAccount = async () => {
  // 1. Create user with signUp
  const { data, error } = await supabase.auth.signUp({
    email: userEmail,
    password: password,
    options: {
      emailRedirectTo: window.location.origin,
      data: { first_name: firstName, last_name: lastName, account_type: 'seeker' }
    }
  });
  
  // 2. Link inquiry to user
  await supabase
    .from("concierge_inquiries")
    .update({ user_id: data.user.id })
    .eq("id", inquiryId);
    
  // 3. Create seeker profile
  await supabase.from("seeker_profiles").insert({ ... });
  
  // 4. Redirect to account
  navigate("/account");
};
```

---

## Testing Checklist

1. **Full Happy Path**
   - Start intake at /concierge/intake
   - Complete Steps 1-5
   - Verify email in Step 6 (receive and enter code)
   - Review in Step 7 and click "Pay $29"
   - Complete Stripe payment
   - Verify auto-redirect to thank you page
   - Verify personalized message with first name
   - Create optional password inline
   - Verify redirect to /account with logged-in state
   - Verify concierge_inquiries record linked to user

2. **Abandoned Cart Flow**
   - Complete Steps 1-6 (form + email verification)
   - Abandon at Step 7 (don't pay)
   - Wait 2 hours (or manually trigger)
   - Verify abandoned cart email received
   - Click resume link
   - Verify form data restored
   - Complete payment

3. **Edge Cases**
   - User already has account with verified email
   - User closes browser after payment but before thank you
   - User tries to reuse payment session
   - Email verification rate limiting

---

## Summary

This restructure ensures:
- Email verification happens BEFORE payment (builds trust)
- Payment is the final commitment step
- No manual submit button after payment - automatic processing
- Polished thank you experience with inline account creation
- Abandoned cart recovery for users who verified but didn't pay
- Professional email design matching brand guidelines
