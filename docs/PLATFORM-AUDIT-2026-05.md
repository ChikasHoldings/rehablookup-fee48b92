# RehabLookup Platform — Full Deep Audit Report

**Audit Date:** May 8, 2026  
**Scope:** Frontend, Backend (Supabase), SEO, Routing, CI/CD, Edge Functions, UI/UX  
**Auditor:** Manus AI  
**Current Status:** Platform is live on Vercel at [rehablookup.com](https://rehablookup.com), backed by Supabase (post-Lovable migration)

---

## Executive Summary

The platform is fundamentally stable and the core user journeys are functional. The SEO pre-render layer (31,918 pages) is clean with 0 errors and 0 warnings after recent work. However, the audit identified **six categories of issues** ranging from critical to low priority that must be resolved before the platform can handle large-scale traffic recovery. The most impactful issues are: a false-positive in the UA routing test script, 658 orphaned pre-rendered pages missing from the sitemap, 627 ESLint errors (primarily `no-explicit-any` in edge functions), two edge functions using `select(*)` instead of explicit column lists, and 46 responsive layout warnings in provider/admin components.

---

## Findings by Category

### 1. CI/CD & Test Scripts

| ID | Severity | Finding |
|----|----------|---------|
| CI-01 | **High** | `check:ua-routing` fails with 9 false positives. The test regex `/gtag\('config', 'G-2VB6C1X2MQ'/` requires a literal GA ID string, but `index.html` correctly uses a `GA_ID` variable (`gtag('config', GA_ID, {...})`). The live site is working correctly; the test script is wrong. |
| CI-02 | **Medium** | `check:gsc-indexing` reports 1 error: `/alcohol-rehab` and `/drug-rehab` have canonical pointing to a non-self URL. These are intentional canonical-redirect alias pages. The GSC indexing check does not have the same "skip cross-canonical pages" logic that `check-unique-meta.mjs` has. |
| CI-03 | **Medium** | `check:vercel-cutover` reports 1 failure: `/seeker → /client 301`. The test expects `/seeker` to redirect to `/client`, but `vercel.json` correctly redirects it to `/account`. The test script has a stale expected destination. |
| CI-04 | **Low** | `check:sitemap-coverage` reports zero-coverage for `/detox-programs-` and `/dual-diagnosis-treatment-` prefixes. These are legitimate single-prefix pages that are in the sitemap but the script's baseline comparison is miscalibrated. |

---

### 2. SEO — Orphaned Pre-rendered Pages (Sitemap Gaps)

| ID | Severity | Finding |
|----|----------|---------|
| SEO-01 | **High** | **658 pre-rendered HTML pages are not listed in any sitemap.** Google cannot discover these pages organically. The breakdown is: 237 under `/rehab-centers/` (county-level pages), 201 under `/treatment-types/` (state/city pages), 50 under `/detox-centers/`, 50 under `/opioid-rehab-near-me/`, 50 under `/rehab-marketing/`, 7 under `/insurance/`, and 63 miscellaneous root-level pages. |
| SEO-02 | **High** | `/alcohol-rehab` and `/drug-rehab` are pre-rendered canonical-redirect pages (canonical points to `-centers` variant). The `check:gsc-indexing` script flags these as errors. These pages should either be removed from `public/` (they are served as 301 redirects by `vercel.json`) or the GSC check should be updated to skip them. |
| SEO-03 | **Medium** | `news.html` and `rehab-score.html` have FAQ content rendered as `<p>` tags with CSS classes (`.ns-faq-q`, `.ns-faq-a`) instead of `<details>`/`<summary>` or proper `FAQPage` JSON-LD structured data. The FAQ content is not machine-readable for Google's rich results. |
| SEO-04 | **Low** | `sitemap-index.xml` is referenced in `robots.txt` but the file may not be generated during every build. The `generate:sitemaps` script should be verified to always output `sitemap-index.xml`. |

---

### 3. Backend — Edge Functions

| ID | Severity | Finding |
|----|----------|---------|
| BE-01 | **Medium** | `verify-code/index.ts` (line 83): uses `select("*")` on `email_verification_codes`. The columns actually used are `id`, `code`, `attempts`, `verified`, `verified_at`, `created_at`, `expires_at`. Should be replaced with an explicit column list to reduce data transfer and prevent accidental exposure of future columns. |
| BE-02 | **Medium** | `verify-sms-code/index.ts` (line ~80): uses `select("*")` on `phone_verification_codes`. The columns actually used are `id`, `code`, `attempts`. Should be replaced with an explicit column list. |
| BE-03 | **Low** | 125 edge functions have been audited. All have CORS headers and error handling. No missing auth patterns were found for protected endpoints. |

---

### 4. Code Quality — ESLint

| ID | Severity | Finding |
|----|----------|---------|
| CQ-01 | **Medium** | **737 ESLint problems (627 errors, 110 warnings)** across the codebase. The dominant rule violations are: `@typescript-eslint/no-explicit-any` (417 occurrences, primarily in edge functions and React components), `react-hooks/exhaustive-deps` (33 occurrences — potential stale closure bugs), `react-refresh/only-export-components` (65 occurrences — HMR performance), `prefer-const` (13 occurrences), `no-useless-escape` (5 occurrences), `no-case-declarations` (11 occurrences). |
| CQ-02 | **Medium** | `react-hooks/exhaustive-deps` violations (33 files) are the most dangerous: missing dependencies in `useEffect`/`useCallback`/`useMemo` hooks can cause stale closures, silent data bugs, and infinite re-render loops in production. |
| CQ-03 | **Low** | `tailwind.config.ts` uses a `require()` import (`@typescript-eslint/no-require-imports`). Should be converted to an ESM import. |

---

### 5. UI/UX — Responsive Layout

| ID | Severity | Finding |
|----|----------|---------|
| UX-01 | **Medium** | **28 components use fixed `grid-cols-N` without responsive breakpoint prefixes** (`sm:` or `md:`). On mobile viewports, these grids will overflow or compress content. The affected components span admin dashboards, provider dashboards, lead intake, and facility photo gallery. |
| UX-02 | **Medium** | `src/pages/ProviderROICalculator.tsx` contains a `<table>` element that is not wrapped in an `overflow-x-auto` container. On narrow screens, the table will overflow the viewport horizontally. |
| UX-03 | **Low** | `src/components/facility/FacilityPhotoGallery.tsx` uses `hidden sm:grid grid-cols-4` — the photo gallery is completely hidden on mobile. Users on mobile devices cannot see facility photos, which is a significant UX gap for a healthcare directory. |

---

### 6. Routing & Vercel Configuration

| ID | Severity | Finding |
|----|----------|---------|
| RT-01 | **Low** | The `vercel.json` Cache-Control header for SEO pages (`max-age=3600`) only covers a subset of prefixes. The `/treatment-types`, `/insurance`, `/rehab-centers`, etc. are covered, but `/detox-centers/`, `/opioid-rehab-near-me/`, `/rehab-marketing/` are not in the cache rule. These pages will be served with default Vercel caching (no explicit cache header). |
| RT-02 | **Low** | The footer contains a link to `/blog` which has no pre-rendered page. It is handled by a React route redirect to `/resources`, but the redirect only works after the SPA hydrates. Crawlers that follow the footer link will see the SPA shell, not a redirect. A `vercel.json` redirect for `/blog` should be confirmed. |

---

## Phased Fix Plan

The fixes are organized into four phases, ordered by impact and risk. Each phase is self-contained and safe to deploy independently without breaking existing functionality.

---

### Phase 1 — Fix False-Positive Test Scripts (CI Stability)

**Priority:** High | **Risk:** Zero (test scripts only, no production code changes) | **Estimated effort:** 1–2 hours

This phase fixes the three test scripts that report false failures, ensuring CI is a reliable green/red signal. No production code is changed.

| Fix | File | Change |
|-----|------|--------|
| CI-01 | `scripts/check-ua-routing.mjs` | Update the GA4 config regex to match the variable-based pattern: replace `/gtag\('config', 'G-2VB6C1X2MQ'/` with `/gtag\s*\(\s*['"]config['"]\s*,\s*(GA_ID\|'G-2VB6C1X2MQ')/` |
| CI-02 | `scripts/check-gsc-indexing.mjs` | Add the same cross-canonical skip logic already present in `check-unique-meta.mjs`: skip pages where `canonical href ≠ self URL` |
| CI-03 | `scripts/check-vercel-cutover.mjs` | Update the expected redirect destination for `/seeker` from `/client` to `/account` |

---

### Phase 2 — Sitemap Coverage (SEO Recovery)

**Priority:** High | **Risk:** Low (additive only — adds URLs to sitemaps, no page content changes) | **Estimated effort:** 2–4 hours

This phase adds the 658 orphaned pre-rendered pages to the appropriate sitemaps so Google can discover and index them. This is the highest-leverage SEO action available.

| Fix | Scope | Change |
|-----|-------|--------|
| SEO-01a | 237 `/rehab-centers/` county pages | Add county-level URLs to `sitemap-extras.xml` or create a dedicated `sitemap-counties.xml` |
| SEO-01b | 201 `/treatment-types/` state/city pages | Add to `sitemap-extras.xml` |
| SEO-01c | 50 `/detox-centers/`, 50 `/opioid-rehab-near-me/`, 50 `/rehab-marketing/` | Add to `sitemap-extras.xml` |
| SEO-01d | 63 miscellaneous root-level pages | Audit each: add to sitemap or add `noindex` if intentionally excluded |
| SEO-02 | `/alcohol-rehab.html`, `/drug-rehab.html` | Remove these files from `public/` — they are served as 301 redirects by `vercel.json` and should not exist as pre-rendered pages. This eliminates the GSC indexing error. |
| SEO-03 | `news.html`, `rehab-score.html` | Add `FAQPage` JSON-LD structured data blocks wrapping the existing FAQ content |

---

### Phase 3 — Edge Function Hardening (Backend Quality)

**Priority:** Medium | **Risk:** Low (narrowing `select()` columns is safe; no logic changes) | **Estimated effort:** 1 hour

| Fix | File | Change |
|-----|------|--------|
| BE-01 | `supabase/functions/verify-code/index.ts` | Replace `select("*")` with `select("id, code, attempts, verified, verified_at, created_at, expires_at")` |
| BE-02 | `supabase/functions/verify-sms-code/index.ts` | Replace `select("*")` with `select("id, code, attempts")` |

---

### Phase 4 — Code Quality & Responsive Layout (Stability & UX)

**Priority:** Medium | **Risk:** Medium (React component changes require visual QA) | **Estimated effort:** 4–8 hours

This phase addresses the ESLint violations that carry real runtime risk (`react-hooks/exhaustive-deps`) and the responsive layout issues affecting mobile users.

**4a — Critical hook dependency fixes (33 files):**
Run `eslint --fix` for auto-fixable rules (`prefer-const`, `no-useless-escape`, `no-empty`) first, then manually audit each `react-hooks/exhaustive-deps` violation. For each: either add the missing dependency, or wrap the callback in `useCallback` with the correct deps, or add an `// eslint-disable-next-line` comment with a justification if the omission is intentional.

**4b — Responsive grid fixes (28 components):**
For each `grid-cols-N` without a breakpoint prefix, determine the appropriate responsive pattern:
- Admin/provider dashboard components (desktop-only views): wrap in `overflow-x-auto` or add `min-w-0` to prevent overflow
- Public-facing components (`LeadIntakeSuccess`, `SingleQuestionFlow`): add `grid-cols-1 sm:grid-cols-N` responsive pattern

**4c — Table overflow fix (1 component):**
`ProviderROICalculator.tsx`: wrap the `<table>` in `<div className="overflow-x-auto">`.

**4d — Mobile photo gallery (1 component):**
`FacilityPhotoGallery.tsx`: replace `hidden sm:grid` with a mobile-friendly single-image view for screens below `sm:`, showing the first photo with a "View all photos" button.

**4e — Remaining ESLint cleanup:**
Address `no-explicit-any` violations in edge functions by replacing `any` with proper TypeScript interfaces. Address `react-refresh/only-export-components` by moving non-component exports to separate utility files.

---

## What Is Already Working Well

The following areas passed all checks and require no action:

- **Internal broken links:** 0 broken links across 63,525 HTML files
- **SEO meta quality:** 0 errors, 0 warnings across 31,918 pre-rendered pages
- **Uniqueness:** Every page has a unique title, description, and canonical URL
- **Bot routing:** 400/400 routes correctly serve pre-rendered HTML to crawlers
- **Vercel cutover:** 22/23 checks pass (only the stale test expectation fails)
- **TypeScript compilation:** 0 errors (`tsc --noEmit` passes cleanly)
- **Security headers:** HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy all present
- **www → apex redirect:** Correctly returns 301 to `https://rehablookup.com`
- **Error boundaries:** GlobalErrorBoundary, ProviderErrorBoundary, SeekerErrorBoundary, AdminErrorBoundary, LeadFormErrorBoundary all present
- **404 page:** Fully implemented with helpful navigation recovery links
- **Edge function CORS:** All 125 edge functions have proper CORS headers
- **Sitemap freshness:** All sitemap entries have `<lastmod>` within the 14-day freshness budget

---

## Recommended Fix Order

```
Phase 1 (CI scripts)    → Phase 2 (Sitemap)    → Phase 3 (Edge functions)    → Phase 4 (Code quality)
~2 hours                  ~4 hours                ~1 hour                        ~8 hours
Zero risk                 Low risk                Low risk                       Medium risk (needs QA)
```

Phases 1–3 can be implemented and deployed in a single PR without any visual QA. Phase 4 should be split into sub-PRs (4a hooks, 4b–4d responsive, 4e ESLint cleanup) to keep diffs reviewable.
