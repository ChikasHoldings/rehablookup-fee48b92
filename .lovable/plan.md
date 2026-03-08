

# Launch Readiness Bug Scan - Findings and Fix Plan

After a thorough scan of the codebase, routing, assets, SEO metadata, auth flow, and error handling, here is what I found:

---

## Issues Found

### 1. Broken Legacy Redirect: `/centers/:slug` (HIGH)
**File:** `src/App.tsx` line 349

The redirect `<Navigate to="/center/:slug" replace />` is a **literal string** -- it does NOT substitute the `:slug` param. Visiting `/centers/some-facility` redirects to the literal path `/center/:slug` instead of `/center/some-facility`, resulting in a 404.

**Fix:** Replace with a small component that reads the `slug` param and navigates to `/center/${slug}`.

---

### 2. Stale `logo.png` Preload in `index.html` (MEDIUM)
**File:** `index.html` line 80

```html
<link rel="preload" as="image" href="/logo.png" fetchpriority="high" type="image/png" />
```

The header now uses `logo-header.png` (bundled asset). This preload fetches an unused file, wasting bandwidth and a high-priority network request.

**Fix:** Remove this preload line (the bundled asset is loaded by Vite automatically).

---

### 3. Structured Data References `logo.svg` -- File Exists but May Be Outdated (LOW)
**Files:** `index.html` line 135, `src/components/SEO.tsx` lines 86, 481, 613

Structured data references `https://rehablookup.com/logo.svg`. The file exists in `public/logo.svg` but after logo updates, it may not match the current branding. This is what Google displays in search results.

**Fix:** Verify `public/logo.svg` matches current branding, or update references to point to `logo.png` (which is the current favicon asset).

---

### 4. Duplicate Page Title (LOW)
**Console/Session:** Page title renders as `"Find Drug & Alcohol Rehab Centers Near You | RehabLookup | RehabLookup"` -- the brand name is duplicated.

**Fix:** Check the Index page's SEO component to ensure it doesn't double-append the site name.

---

## Items Verified as Clean (No Issues)

- All logo references in components properly use the new `logo-header.png` or `logo-dark-bg.png` assets
- No `src="/logo.png"` or `from "@/assets/logo.png"` references remain in any component
- No localhost references in production code (only in HTTPS redirect guards, which is correct)
- No `brightness-0 invert` CSS filter remnants
- Favicons properly configured in `index.html` and `site.webmanifest`
- Auth flow, role caching, and portal boundary enforcement look solid
- Error boundaries (Global, Admin, Provider, Lead Form) all properly implemented
- Sentry integration configured correctly (production-only)
- Unhandled promise rejection safety net in place
- All 100+ routes properly defined with guards
- No TODO/FIXME/HACK markers in production code
- Edge functions returning healthy logs with no errors

---

## Implementation Plan

| # | Task | Files | Effort |
|---|------|-------|--------|
| 1 | Fix `/centers/:slug` redirect to properly forward the slug param | `src/App.tsx` | Small |
| 2 | Remove stale `/logo.png` preload from `index.html` | `index.html` | Trivial |
| 3 | Fix duplicate "RehabLookup" in page title | Index page SEO component | Small |
| 4 | Verify/update `public/logo.svg` for structured data consistency | `public/logo.svg` or SEO refs | Small |

Total: 4 targeted fixes. The platform is in strong shape overall.

