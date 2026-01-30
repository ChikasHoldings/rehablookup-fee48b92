
# Seeker Panel Audit - Production Readiness Fixes

## Summary

Comprehensive audit of the Seeker panel identified **3 issues** that require remediation to ensure production readiness. The majority of the panel is fully functional with proper error handling, authentication flows, and edge function integration.

---

## Issues Identified

### Issue 1: Branding Inconsistencies (CRITICAL)
**Severity**: High - Incorrect product name and email address displayed to users

| File | Line(s) | Current | Required |
|------|---------|---------|----------|
| `SeekerHelp.tsx` | 125 | `Recovery Directory` | `RehabLookup` |
| `SeekerHelp.tsx` | 314-317 | `support@recoverydirectory.com` | `help@rehablookup.com` |
| `SeekerSearch.tsx` | 240 | `Recovery Directory` | `RehabLookup` |

### Issue 2: Dead Code (LOW)
**Severity**: Low - Non-functional code that should be cleaned up

| File | Line(s) | Issue |
|------|---------|-------|
| `SeekerShell.tsx` | 170-173 | `useSeekerShellContext()` returns hardcoded values `{ isAuthenticated: false, userName: undefined }` but is never used anywhere |

**Note**: Child routes correctly use `useOutletContext` from react-router-dom per memory/architecture notes. This function is deprecated dead code.

### Issue 3: Console Logging in Production (INFO)
**Severity**: Info - Console logs present but acceptable for debugging

Multiple seeker pages contain `console.log` statements for debugging. These are tagged with component prefixes (e.g., `[SeekerRequests]`, `[SeekerSaved]`) and do not cause functional issues.

---

## Verification: Features Working Correctly

| Feature | Status | Details |
|---------|--------|---------|
| **Authentication** | Working | SeekerShell properly manages auth state via `supabase.auth.onAuthStateChange` |
| **Requests Page** | Working | Fetches leads by email, handles prefill from facility pages |
| **Saved Facilities** | Working | Uses `useFavorites` hook with localStorage fallback for guests |
| **Reviews** | Working | Full CRUD with edit/delete, facility responses displayed |
| **Notifications** | Working | Real-time via Supabase channels, mark read/delete functions |
| **Notification Preferences** | Working | Saves preferences via upsert to `notification_preferences` table |
| **Settings** | Working | Profile update, avatar upload/camera, password change, account deletion |
| **Search** | Working | Proximity search, filtering by treatment/facility type |
| **Facility Profile** | Working | Full details, tour request modal, contact form, reviews section |
| **Concierge** | Working | Payment flow via Stripe, intake submission, case tracking, messaging |
| **Help** | Working | FAQ accordion, support form sends to `send-support-request` edge function |

---

## Edge Functions Verified

All required edge functions exist and are properly invoked:
- `send-support-request` - Support form submissions
- `delete-seeker-account` - Account deletion
- `get-facility-plan` - Plan detection for contact display
- `track-view` - Facility view tracking
- `verify-concierge-payment` - Payment verification
- `submit-concierge-intake` - Intake submission

---

## Changes Required

### File 1: src/pages/seeker/SeekerHelp.tsx

**Update Helmet title (line 125)**
```typescript
// FROM:
<title>Help & Support | Recovery Directory</title>

// TO:
<title>Help & Support | RehabLookup</title>
```

**Update support email (lines 314-318)**
```typescript
// FROM:
<a href="mailto:support@recoverydirectory.com" ...>
  support@recoverydirectory.com
</a>

// TO:
<a href="mailto:help@rehablookup.com" ...>
  help@rehablookup.com
</a>
```

### File 2: src/pages/seeker/SeekerSearch.tsx

**Update Helmet title (line 240)**
```typescript
// FROM:
<title>Search Treatment Centers | Recovery Directory</title>

// TO:
<title>Search Treatment Centers | RehabLookup</title>
```

### File 3: src/components/seeker/SeekerShell.tsx

**Remove or fix dead code (lines 170-173)**
```typescript
// OPTION A: Remove entirely (recommended - function is unused)
// DELETE lines 170-173

// OPTION B: Document as deprecated
// Update comment to indicate deprecated
```

---

## Technical Notes

### Authentication Pattern
Child routes access auth state via React Router's `useOutletContext`:
```typescript
const context = useOutletContext<SeekerOutletContext>();
const isAuthenticated = context?.isAuthenticated ?? false;
```

### Auth Prompt Pattern
Protected pages consistently use the `AuthPrompt` component:
```typescript
if (!isAuthenticated) {
  return <AuthPrompt title="..." returnTo="/account/..." />;
}
```

### Error Handling
All pages implement:
- Loading states with skeletons
- Error toasts for failed operations
- Graceful fallbacks for missing data

---

## Post-Fix Testing Checklist

- [ ] Verify SeekerHelp title displays "RehabLookup" in browser tab
- [ ] Verify support email link opens mail client with "help@rehablookup.com"
- [ ] Verify SeekerSearch title displays "RehabLookup" in browser tab
- [ ] Verify all pages load without console errors
- [ ] Test auth flow: sign in, access protected pages, sign out
- [ ] Test support form submission sends email successfully
