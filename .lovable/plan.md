

# Full Platform Audit & Hardening Plan

## Summary of Findings

After a deep audit of the codebase — routing, components, shells, hooks, edge functions, security, and UI — the platform is in strong production shape. Below are the issues found, categorized by severity, with targeted fixes.

---

## Critical Issues (Security/Functionality)

### 1. Unvalidated Checkout URLs (Open Redirect Risk)
**Files:** `src/pages/provider/Credits.tsx`, `src/pages/provider/Billing.tsx`
- `window.open(data.checkoutUrl, "_blank")` and `window.open(data.url, "_blank")` are called without validating the URL origin
- The concierge/international intake flows correctly validate against `checkout.stripe.com` / `billing.stripe.com`, but Credits.tsx and Billing.tsx do not
- **Fix:** Add Stripe origin validation before all `window.open` calls in these files, matching the pattern already used in `ConciergeIntake.tsx`

### 2. Stripe Dashboard URL Exposed to Admin UI
**File:** `src/components/admin/international/InternationalCaseDetailSheet.tsx`
- `window.open(https://dashboard.stripe.com/invoices/...)` — opens Stripe dashboard directly
- Per memory, external links should be validated. This is admin-only so lower risk, but should validate the invoice ID format to prevent injection
- **Fix:** Validate `stripe_invoice_id` is alphanumeric before constructing URL

### 3. `select("*")` in Admin Queries  
**Files:** `src/pages/admin/AdminConcierge.tsx`, `src/pages/admin/AdminBlog.tsx`
- Per platform standards, all queries should use explicit column selection
- **Fix:** Replace `select("*")` with explicit column lists

---

## Medium Issues (UX/Functionality)

### 4. Route Path Warnings (Console Noise)
**File:** `src/App.tsx` (lines 407-412)
- Routes like `/detox-centers-in-*` trigger React Router warnings about `*` not following `/`
- **Fix:** Change to `/detox-centers-in/*` (add `/` before `*`) for all 6 affected routes

### 5. Credits Page — Orphaned but Accessible
**File:** `src/pages/provider/Credits.tsx`
- This page exists but the route `/provider/credits` redirects to `/provider/billing?purchase_credits=true`
- The file still contains its own checkout logic without URL validation
- **Fix:** Either delete the orphaned file or ensure it's truly unreachable. Since the route redirects, the file is dead code — remove it

### 6. Tailwind Ambiguous Class Warning
- `ease-[cubic-bezier(0.32,0.72,0,1)]` is flagged as ambiguous
- **Fix:** Escape brackets per Tailwind docs: `ease-[cubic-bezier(0.32,0.72,0,1)]` → use CSS variable or direct style

---

## Low Issues (Polish/Hardening)

### 7. Console.log Statements in Production Code
**File:** `src/pages/ProviderSignup.tsx` — ~20+ console.log statements for debugging
- These should use a conditional dev-only logger or be removed for production cleanliness
- **Fix:** Wrap in `import.meta.env.DEV` guard or remove

### 8. GlobalErrorBoundary — process.env Check
**File:** `src/components/GlobalErrorBoundary.tsx` (line 69)
- Uses `process.env.NODE_ENV` which works in Vite but is non-standard — should use `import.meta.env.DEV`
- **Fix:** Replace with `import.meta.env.DEV`

---

## Verified — No Issues Found

- **Routing:** All 200+ routes are properly wired with correct components, guards, redirects, and lazy loading
- **Auth shells:** Provider, Seeker, and Admin shells all have proper role-based redirects, auth guards, and error boundaries
- **No TODO/FIXME/HACK comments** in the codebase
- **No "Coming Soon"** labels or placeholder content
- **No empty catch blocks** — all error handlers log and display user feedback
- **No dead buttons** — all CTAs are wired to actions
- **Stripe URL validation** is correctly implemented in ConciergeIntake, InternationalApplication, and AddListingCard
- **RLS policies** are in place across all sensitive tables
- **Edge functions** (100+) all use proper CORS, Deno.serve(), and versioning
- **SEO components** (breadcrumbs, SEO head, JSON-LD) are consistently applied
- **Error boundaries** exist at Global, Admin, Provider, and Lead Form levels
- **Session management** with cross-tab sync is implemented
- **Double-click guards** (isPending/isSubmitting) are present on all form submissions
- **Rate limiting** is implemented for login, lead submission, and verification flows

---

## Implementation Order

1. Fix unvalidated checkout URLs in Credits.tsx and Billing.tsx (security)
2. Fix `select("*")` queries in admin pages (security standard)
3. Fix React Router wildcard path warnings (console cleanliness)
4. Remove orphaned Credits.tsx file (dead code)
5. Fix `process.env.NODE_ENV` → `import.meta.env.DEV` (correctness)
6. Validate Stripe invoice ID format in admin sheet (injection prevention)
7. Guard console.log statements in ProviderSignup (production hygiene)
8. Fix Tailwind ambiguous class warning (build cleanliness)

**Estimated scope:** 8 targeted fixes across ~8 files. No architectural changes needed — the platform is production-ready with these hardening patches.

