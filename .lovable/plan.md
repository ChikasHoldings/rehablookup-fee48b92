
# Fix Email Verification Race Condition

## Problem
When users enter the correct verification code, the backend successfully verifies it, but the frontend shows "Email not verified" error due to a React state race condition.

**Technical Cause:**
- `setIsEmailVerified(true)` is asynchronous
- `handleSubmit()` is called immediately after `verifyCode()` returns
- The `isEmailVerified` state check fails because React hasn't re-rendered yet

## Solution
Modify `handleSubmit` to accept an optional parameter that bypasses the verification check when called directly after successful verification.

---

## Changes

### 1. useLeadIntakeForm.ts

**Update `handleSubmit` signature to accept verification bypass:**

```typescript
const handleSubmit = async (options?: { skipVerificationCheck?: boolean }) => {
  // Check honeypot
  if (formData.website) {
    console.log("Honeypot triggered");
    trackAnalytics("spam_blocked", { reason: "honeypot" });
    setIsSubmitted(true);
    return;
  }
  
  // Skip verification check if explicitly told verification just succeeded
  if (!options?.skipVerificationCheck && !isEmailVerified) {
    toast({
      title: "Email not verified",
      description: "Please verify your email before submitting",
      variant: "destructive",
    });
    return;
  }
  
  // ... rest of submission logic unchanged
};
```

### 2. SingleQuestionFlow.tsx

**Update `handleVerifyCode` to pass the bypass flag:**

```typescript
const handleVerifyCode = async () => {
  if (verificationCode.length === 6) {
    const success = await verifyCode(verificationCode);
    if (success) {
      // Pass flag to skip verification check since we JUST verified
      await onSubmit({ skipVerificationCheck: true });
    } else {
      setErrors({ code: "Invalid or expired code" });
    }
  }
};
```

**Update `onSubmit` prop type:**

```typescript
interface SingleQuestionFlowProps {
  // ... existing props ...
  onSubmit: (options?: { skipVerificationCheck?: boolean }) => Promise<void>;
  // ...
}
```

### 3. LeadIntakeForm.tsx

**Update handleSubmit wrapper to pass options:**

```typescript
const handleSubmit = async (options?: { skipVerificationCheck?: boolean }) => {
  if (onCustomSubmit) {
    // For custom submit, still respect the flag
    setCustomSubmitting(true);
    try {
      await onCustomSubmit(formData);
      setCustomSubmitted(true);
    } finally {
      setCustomSubmitting(false);
    }
  } else {
    await defaultHandleSubmit(options);
  }
};
```

---

## Why This Fix Works

| Before | After |
|--------|-------|
| `verifyCode()` sets state async | Same |
| `handleSubmit()` checks stale state | `handleSubmit({ skipVerificationCheck: true })` bypasses check |
| Race condition causes error | Verification success is passed explicitly |

## Files to Modify
1. `src/components/lead-intake/useLeadIntakeForm.ts` - Add options parameter
2. `src/components/lead-intake/SingleQuestionFlow.tsx` - Pass bypass flag
3. `src/components/lead-intake/LeadIntakeForm.tsx` - Forward options to handler
