
# Plan: Fix 404 Errors Across Insurance Routes

## Problem Summary
A route mismatch is causing widespread 404 errors on insurance pages. The React Router in `App.tsx` defines short URLs (e.g., `/insurance/bcbs`) while all internal links throughout the codebase use canonical URLs (e.g., `/insurance/bcbs-treatment`).

When users click links within the app, React Router handles the navigation client-side, bypassing the server-level redirects configured in `_redirects` and `vercel.json`. This results in 404 errors for all insurance detail pages.

## Root Cause Analysis

| Location | URL Pattern Used |
|----------|-----------------|
| **App.tsx Routes** | `/insurance/bcbs`, `/insurance/aetna`, etc. |
| **Insurance.tsx Links** | `/insurance/bcbs-treatment`, `/insurance/aetna-rehab`, etc. |
| **InternalLinkBlock.tsx** | `/insurance/bcbs-treatment`, `/insurance/aetna-rehab`, etc. |
| **All Insurance Page Cross-Links** | Canonical URLs with `-rehab` or `-treatment` suffix |
| **SEO Canonical Tags** | `/insurance/bcbs-treatment`, etc. |

The server redirects only work for direct URL access or external links - not for in-app navigation via React Router's `<Link>` component.

## Solution

Add the canonical URL routes to `App.tsx` so both short and canonical URLs work for client-side navigation. This is the cleanest fix because:
1. All existing internal links already use canonical URLs
2. SEO canonical tags already reference the canonical URLs
3. Server redirects handle external traffic from short URLs
4. No need to update dozens of files with internal links

## Implementation

### File: `src/App.tsx`

Add the following routes after the existing insurance routes (around line 348):

```text
Routes to add:
/insurance/aetna-rehab             -> AetnaRehab
/insurance/bcbs-treatment          -> BCBSTreatment
/insurance/cigna-rehab             -> CignaRehab
/insurance/united-healthcare-rehab -> UnitedHealthcareRehab
/insurance/humana-rehab            -> HumanaRehab
/insurance/kaiser-rehab            -> KaiserRehab
/insurance/medicare-rehab          -> MedicareRehab
/insurance/medicaid-rehab          -> MedicaidRehab
/insurance/anthem-rehab            -> AnthemRehab
```

### Code Changes

Insert after line 348 in `App.tsx`:
```tsx
{/* Insurance Routes - Canonical URLs */}
<Route path="/insurance/aetna-rehab" element={<PublicRouteGuard><AetnaRehab /></PublicRouteGuard>} />
<Route path="/insurance/bcbs-treatment" element={<PublicRouteGuard><BCBSTreatment /></PublicRouteGuard>} />
<Route path="/insurance/cigna-rehab" element={<PublicRouteGuard><CignaRehab /></PublicRouteGuard>} />
<Route path="/insurance/united-healthcare-rehab" element={<PublicRouteGuard><UnitedHealthcareRehab /></PublicRouteGuard>} />
<Route path="/insurance/humana-rehab" element={<PublicRouteGuard><HumanaRehab /></PublicRouteGuard>} />
<Route path="/insurance/kaiser-rehab" element={<PublicRouteGuard><KaiserRehab /></PublicRouteGuard>} />
<Route path="/insurance/medicare-rehab" element={<PublicRouteGuard><MedicareRehab /></PublicRouteGuard>} />
<Route path="/insurance/medicaid-rehab" element={<PublicRouteGuard><MedicaidRehab /></PublicRouteGuard>} />
<Route path="/insurance/anthem-rehab" element={<PublicRouteGuard><AnthemRehab /></PublicRouteGuard>} />
```

## Verification Checklist

After implementation, verify these navigation flows work without 404 errors:

1. **Insurance.tsx** - Click "View coverage details" on any insurance card
2. **InternalLinkBlock** - Click insurance links in the "Insurance Coverage" section
3. **Cross-page Links** - Navigate between insurance pages using "Other Insurance Options" links at page bottom
4. **Direct URL Access** - Navigate directly to `/insurance/bcbs-treatment` and similar URLs

## Files Affected

- `src/App.tsx` (add 9 new route definitions)

## Technical Notes

- The existing short routes (`/insurance/bcbs`, etc.) remain for backward compatibility and server-side redirect targets
- Both short and canonical URLs will resolve to the same components
- No changes needed to `_redirects` or `vercel.json` as they already handle external traffic correctly
- This maintains SEO best practices by keeping canonical URLs consistent across internal links and meta tags
