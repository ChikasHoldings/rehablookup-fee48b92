
# Unified Login Page Implementation Plan (Revised)

## Overview

Create a centralized login page at `/login` that handles both Seeker and Provider authentication while maintaining strict role separation. Admin accounts are **blocked** from this page and redirected to the dedicated admin login. Unknown emails are **blocked** with a clear error message.

## Key Requirements

1. Admin accounts cannot login from `/login` - must redirect to `/admin-login`
2. Unknown emails block login attempt with clear error message
3. No UI flickering, jumping, or unnecessary reloads
4. Full security features (CAPTCHA, rate limiting, lockout)
5. Separate signup pages remain unchanged

## Current Authentication Architecture

```text
Current Routes:
├── /auth               → SeekerAuth (combined login/signup tabs)
├── /signup             → SeekerSignup (dedicated signup)
├── /provider-login     → ProviderLogin (with full security)
├── /provider-signup    → ProviderSignup
└── /admin-login        → AdminLogin (completely separate - UNTOUCHED)
```

## New Architecture

```text
New Routes:
├── /login              → Unified Login (Seekers + Providers)
├── /forgot-password    → Unified Forgot Password
├── /signup             → SeekerSignup (unchanged)
├── /provider-signup    → ProviderSignup (unchanged)
├── /admin-login        → AdminLogin (UNTOUCHED)
└── Legacy redirects:
    ├── /auth           → /login?type=seeker
    └── /provider-login → /login?type=provider
```

## Implementation Details

### Phase 1: Create Unified Login Page

**New File: `src/pages/Login.tsx`**

**Login Flow (No Flickering Design):**
1. User enters email and password
2. On form submit (NOT on blur), run email detection in parallel with validation
3. Email detection results:
   - **Admin detected**: Block login, show message: "Admin accounts must use the dedicated admin login", provide link to `/admin-login`
   - **Unknown email**: Block login, show message: "No account found with this email. Please check your email or create an account."
   - **Provider detected**: Proceed with provider auth flow, redirect to `/provider/dashboard`
   - **Seeker detected**: Proceed with seeker auth flow, redirect to `/account`
4. All state managed with single loading state to prevent flicker

**Anti-Flicker Techniques:**
- Single `isSubmitting` state controls entire flow
- No intermediate state transitions
- Detection happens server-side in single request
- Use `replace: true` on all navigation
- Memoize expensive computations
- Skeleton-free design during auth check on mount

**Security Features (ported from ProviderLogin):**
- Zod validation for email/password
- CAPTCHA after 3 failed attempts
- Account lockout after 5 failed attempts (15 minutes)
- Server-side rate limiting via `log-login-attempt` edge function
- IP blocking detection
- Session tracking in `user_sessions` table
- Activity logging

### Phase 2: Create RPC Function for Admin Email Detection

**New Migration: Add `is_email_admin` function**

```sql
CREATE OR REPLACE FUNCTION public.is_email_admin(p_email text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN auth.users u ON ur.user_id = u.id
    WHERE u.email = p_email AND ur.role = 'admin'
  );
$$;
```

### Phase 3: Create Unified Forgot Password Page

**New File: `src/pages/ForgotPassword.tsx`**

Features:
- Single email input form
- Detects account type and sends appropriate reset email
- Provider accounts → redirect to `/provider-reset-password`
- Seeker accounts → redirect to `/reset-password`
- Admin accounts → redirect to `/admin-login` with message
- Unknown emails → show "No account found" error

### Phase 4: Update Routing

**Modifications to `src/App.tsx`:**
```typescript
// Add new unified routes
<Route path="/login" element={<Login />} />
<Route path="/forgot-password" element={<ForgotPassword />} />

// Add redirects for legacy routes
<Route path="/auth" element={<Navigate to="/login?type=seeker" replace />} />
<Route path="/provider-login" element={<Navigate to="/login?type=provider" replace />} />
```

### Phase 5: Update Navigation Links

**Files to Update:**
| File | Changes |
|------|---------|
| `src/components/layout/Header.tsx` | `/auth` → `/login`, add `/provider-login` redirect handling |
| `src/components/layout/Footer.tsx` | Update "Provider Login" link |
| `src/components/seeker/SeekerHeader.tsx` | Update sign in link |
| `src/components/seeker/SeekerMobileNav.tsx` | Update sign in link |
| `src/components/seeker/AuthPrompt.tsx` | Update auth URL |
| `src/components/provider/ProviderShell.tsx` | Update logout redirect |
| `src/pages/SeekerAuth.tsx` | Update link in header to `/login` |
| `src/components/PublicRouteGuard.tsx` | Add `/login` to allowed routes |
| `src/hooks/useUserRole.ts` | Add `/login` and `/forgot-password` to PUBLIC_AUTH_ROUTES |

### Phase 6: UI Design

**Desktop View:**
- Left panel: Dynamic branding based on detected account type
  - Default: "Welcome Back" with platform stats
  - Provider hint: Professional treatment facility messaging
  - Seeker hint: Recovery journey messaging
- Right panel: Clean login form

**Mobile View:**
- Full-width card-based form
- Sticky header with logo
- Smooth transitions

**Visual States:**
- Default: Neutral messaging
- Provider detected (after submit): Green badge "Provider Account"
- Seeker detected (after submit): Blue badge "Personal Account"
- Admin detected: Warning alert with redirect link
- Unknown email: Error state with "Create Account" CTA

**Error Display:**
- Admin email: `"This email is registered as an admin account. Admin accounts must sign in through the dedicated admin portal."`
- Unknown email: `"No account found with this email address. Please check your email or create a new account."`
- Invalid credentials: `"Invalid email or password. {X} attempts remaining."`
- Rate limited: `"Too many failed attempts. Please wait {time} before trying again."`

## Technical Details

### Email Detection Logic (Server-Side)

```typescript
// In Login.tsx handleSubmit
const detectAccountType = async (email: string) => {
  // Check admin first (highest priority - blocks login)
  const { data: isAdmin } = await supabase.rpc('is_email_admin', { p_email: email });
  if (isAdmin) return { type: 'admin', blocked: true };

  // Check provider
  const { data: isProvider } = await supabase.rpc('is_email_provider', { p_email: email });
  if (isProvider) return { type: 'provider', blocked: false };

  // Check seeker
  const { data: isSeeker } = await supabase.rpc('is_email_seeker', { p_email: email });
  if (isSeeker) return { type: 'seeker', blocked: false };

  // Unknown email
  return { type: 'unknown', blocked: true };
};
```

### State Management (Anti-Flicker)

```typescript
// Single unified state
const [formState, setFormState] = useState<{
  isSubmitting: boolean;
  detectedType: 'provider' | 'seeker' | 'admin' | 'unknown' | null;
  error: string | null;
}>({
  isSubmitting: false,
  detectedType: null,
  error: null,
});
```

### Auth State Check (No Flicker on Mount)

```typescript
const [isCheckingAuth, setIsCheckingAuth] = useState(true);

useEffect(() => {
  let mounted = true;
  
  supabase.auth.getSession().then(async ({ data: { session } }) => {
    if (!mounted) return;
    
    if (session) {
      // Determine role and redirect immediately
      const { data: isAdmin } = await supabase.rpc('has_role', { _user_id: session.user.id, _role: 'admin' });
      if (isAdmin) {
        navigate('/admin', { replace: true });
        return;
      }
      
      const { data: profile } = await supabase.from('profiles').select('id').eq('user_id', session.user.id).maybeSingle();
      if (profile) {
        navigate('/provider/dashboard', { replace: true });
        return;
      }
      
      const { data: seeker } = await supabase.from('seeker_profiles').select('id').eq('user_id', session.user.id).maybeSingle();
      if (seeker) {
        navigate('/account', { replace: true });
        return;
      }
    }
    
    setIsCheckingAuth(false);
  });
  
  return () => { mounted = false; };
}, []);
```

## File Changes Summary

| File | Action | Description |
|------|--------|-------------|
| `src/pages/Login.tsx` | CREATE | Unified login with role detection, full security |
| `src/pages/ForgotPassword.tsx` | CREATE | Unified forgot password flow |
| `supabase/migrations/XXXXXX.sql` | CREATE | Add `is_email_admin` RPC function |
| `src/App.tsx` | MODIFY | Add new routes, legacy redirects |
| `src/components/layout/Header.tsx` | MODIFY | Update login links |
| `src/components/layout/Footer.tsx` | MODIFY | Update provider login link |
| `src/components/seeker/SeekerHeader.tsx` | MODIFY | Update sign in link |
| `src/components/seeker/SeekerMobileNav.tsx` | MODIFY | Update sign in link |
| `src/components/seeker/AuthPrompt.tsx` | MODIFY | Update auth URL |
| `src/components/provider/ProviderShell.tsx` | MODIFY | Update logout redirect |
| `src/components/PublicRouteGuard.tsx` | MODIFY | Add `/login` to allowed routes |
| `src/hooks/useUserRole.ts` | MODIFY | Add `/login`, `/forgot-password` to PUBLIC_AUTH_ROUTES |

## Security Guarantees

1. **Admin isolation**: Admin emails are detected and blocked at form submission level
2. **Unknown email blocking**: Prevents enumeration attacks while providing user feedback
3. **No account mixing**: Database triggers prevent dual accounts
4. **Role-locked routing**: `useUserRole` enforces portal boundaries post-login
5. **Rate limiting**: Server-side via `log-login-attempt` edge function
6. **IP blocking**: Handled by edge function
7. **Session management**: Tracked in `user_sessions` table
8. **CAPTCHA**: Math challenge after 3 failed attempts
9. **Lockout**: 15-minute lockout after 5 failed attempts

## Testing Checklist

- [ ] Seeker login → redirects to `/account`
- [ ] Provider login → redirects to `/provider/dashboard`
- [ ] Admin email → shows error, links to `/admin-login`
- [ ] Unknown email → shows "No account found" error
- [ ] Already authenticated → immediate redirect (no flicker)
- [ ] CAPTCHA → appears after 3 failed attempts
- [ ] Lockout → blocks after 5 failed attempts
- [ ] Forgot password → routes to correct reset page
- [ ] Legacy `/auth` → redirects to `/login?type=seeker`
- [ ] Legacy `/provider-login` → redirects to `/login?type=provider`
- [ ] Mobile responsiveness → all flows work on mobile
- [ ] No page flicker or jumping during auth checks
