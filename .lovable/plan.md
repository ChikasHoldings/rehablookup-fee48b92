
# Seeker Panel Audit - Findings & Remediation Plan

## Executive Summary
The Seeker panel has a solid foundation but requires several fixes before production deployment. The most critical issue is **275 broken `/request-help` links** across 27 files that need to be updated to point to the new `/account/concierge` route.

---

## Critical Issues (Must Fix Before Launch)

### 1. Broken `/request-help` Links (275 instances in 27 files)
**Problem:** The `/request-help` page was deleted and redirected to `/account/concierge`, but many files still link directly to it.

**Affected Files:**
- `src/pages/seeker/SeekerHome.tsx` (line 257) - Empty state CTA
- `src/pages/SearchResults.tsx`
- `src/pages/treatment-types/StateOutpatientPrograms.tsx`
- `src/pages/treatment-types/CityAlcoholRehab.tsx`
- `src/pages/treatment-types/StateInpatientRehab.tsx`
- `src/pages/treatment-types/CityInpatientRehab.tsx`
- `src/pages/treatment-types/DualDiagnosisTreatment.tsx`
- `src/pages/treatment-types/StateAlcoholRehab.tsx`
- `src/pages/treatment-types/CityDetoxPrograms.tsx`
- Plus 18+ more files

**Fix:** Search and replace all `/request-help` links with `/account/concierge` and update button labels from "Request Call Back" to "Get Matched" or "Start Concierge".

---

### 2. React forwardRef Console Error
**Problem:** Console shows `Warning: Function components cannot be given refs` in `ReportImageDialog.tsx`.

**File:** `src/components/profile/ReportImageDialog.tsx`

**Fix:** Wrap the component with `React.forwardRef` since it's being passed a ref from `CenterProfile.tsx`.

---

### 3. Missing DialogDescription Accessibility Warning
**Problem:** Console warns `Missing Description or aria-describedby={undefined} for {DialogContent}`.

**Fix:** Audit all Dialog usages and ensure they include `DialogDescription` or add `aria-describedby={undefined}` to suppress when description isn't needed.

---

## Medium Priority Issues

### 4. Incorrect Support Email in SeekerHelp.tsx
**Problem:** Line 316 shows `support@recoverydirectory.com` instead of the correct `help@rehablookup.com`.

**File:** `src/pages/seeker/SeekerHelp.tsx`

**Fix:** Update email to `help@rehablookup.com`.

---

### 5. Static useSeekerShellContext Hook
**Problem:** The `useSeekerShellContext` hook (line 171-172) returns hardcoded `{ isAuthenticated: false, userName: undefined }` instead of actual values.

**File:** `src/components/seeker/SeekerShell.tsx`

**Fix:** Either remove this unused hook or implement it properly using `useOutletContext`.

---

### 6. Orphaned Edge Function
**Problem:** `supabase/functions/track-request-help/index.ts` exists but the `/request-help` page was deleted.

**Fix:** Either delete this edge function if no longer needed, or repurpose it for concierge tracking.

---

## Completed/Working Features

The following features are fully implemented and functional:

| Feature | Status | Notes |
|---------|--------|-------|
| SeekerHome | Working | Filters, sorting, facility cards all functional |
| SeekerSearch | Working | Location suggestions, filters, search all working |
| SeekerSaved | Working | Favorites sync with DB, auth-gated |
| SeekerRequests | Working | Lead tracking, prefill from facility pages |
| SeekerReviews | Working | Edit pending reviews, delete, view responses |
| SeekerSettings | Working | Profile, avatar upload, password change, delete account |
| SeekerConcierge | Working | Full intake flow, Stripe checkout, case tracking |
| SeekerNotifications | Working | Real-time updates, mark read, delete |
| SeekerNotificationPreferences | Working | Toggle email/in-app preferences |
| SeekerHelp | Working | FAQ, contact form, crisis resources |
| SeekerMobileNav | Working | Bottom navigation with More drawer |
| AuthPrompt | Working | Auth-gate for protected features |
| ConciergeInlineIntake | Working | Multi-step form with validation |
| ConciergeMessaging | Working | Real-time messaging threads |
| ConciergeToursList | Working | Tour scheduling and tracking |

---

## Edge Functions Verification

All seeker-related edge functions are deployed:

| Function | Purpose | Status |
|----------|---------|--------|
| `create-concierge-checkout` | Stripe checkout for $29 fee | Deployed |
| `verify-concierge-payment` | Payment verification | Deployed |
| `submit-concierge-intake` | Intake submission | Deployed |
| `send-seeker-emails` | Welcome, confirmation emails | Deployed |
| `send-tour-notifications` | Tour scheduling alerts | Deployed |
| `send-message-notifications` | Messaging alerts | Deployed |
| `auto-status-transition` | Case status automation | Deployed |
| `delete-seeker-account` | Account deletion | Deployed |
| `track-request-help` | Analytics (orphaned - review) | Deployed |

---

## Implementation Tasks

### Phase 1: Critical Fixes (Day 1)
1. Update all 275 `/request-help` links to `/account/concierge`
2. Update button labels from "Request Call Back" to "Get Matched" or "Start Concierge"
3. Fix `ReportImageDialog.tsx` forwardRef issue
4. Add DialogDescription to dialogs missing accessibility attributes

### Phase 2: Cleanup (Day 2)
5. Update support email in SeekerHelp.tsx to `help@rehablookup.com`
6. Remove or fix `useSeekerShellContext` hook
7. Review `track-request-help` edge function - repurpose or delete
8. End-to-end testing of all seeker flows

---

## Files to Modify

```text
# Critical link updates (27 files with /request-help)
src/pages/seeker/SeekerHome.tsx
src/pages/SearchResults.tsx
src/pages/treatment-types/*.tsx (multiple files)

# forwardRef fix
src/components/profile/ReportImageDialog.tsx

# Support email fix
src/pages/seeker/SeekerHelp.tsx

# Hook cleanup
src/components/seeker/SeekerShell.tsx

# Edge function review
supabase/functions/track-request-help/index.ts
```

---

## Testing Checklist

After fixes, verify:
- [ ] SeekerHome displays facilities and all CTAs work
- [ ] SeekerSearch filters and location suggestions work
- [ ] SeekerSaved requires auth and syncs favorites
- [ ] SeekerRequests shows submitted leads
- [ ] SeekerReviews edit/delete flows work
- [ ] SeekerSettings profile save and avatar upload work
- [ ] SeekerConcierge intake → payment → case tracking flow
- [ ] All CTAs redirect to `/account/concierge` correctly
- [ ] No console errors related to refs or accessibility
- [ ] Mobile navigation works smoothly
- [ ] More drawer shows correct items and styling
