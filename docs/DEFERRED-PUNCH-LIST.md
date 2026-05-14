# Deferred items — production-hardening punch list

Items intentionally NOT shipped on the `claude/production-hardening-5xN`
branch. Each is either a multi-day refactor or a design decision that
shouldn't be a hotfix. Logged here so we don't re-discover them.

Last updated: 2026-05-14 (after commit 9d915d11d).

---

## 1. Architectural: middleware human-rewrite-to-`/` flash

**Symptom.** A user (or bot with JS rendering) hitting any non-`/` route
sees the homepage `<title>` and canonical briefly during hydration —
e.g. `/treatment-types/alcohol-rehabilitation` flashes
"Find Trusted Addiction Treatment Centers | RehabLookup" in the tab
before React Router mounts the right page and `<react-helmet-async>`
swaps to the correct title.

**Root cause.** `middleware.ts:259-263` rewrites every human visitor
to `/` so the SPA shell (`/index.html`) is the single React entry
point and GA / Pixel always fire from one place. The shell has the
homepage canonical hardcoded so crawlers on `/` index correctly.
Every other route inherits that homepage HTML for the cold render.

**Why deferred.** Fixing this means changing how hydration starts on
non-`/` routes — either:
- Serve per-route prerendered HTML to humans (need to attach the SPA
  bundle script tag to every prerendered file → real isomorphic
  rendering), OR
- Make the SPA shell more "neutral" (no homepage-specific title /
  canonical / noscript content) so the swap is invisible — but breaks
  `/` SEO unless we conditionally inject homepage content per-request,
  OR
- Move to true SSR (Vite SSR / Vercel Edge Functions rendering React
  per request).

All three are architectural calls that touch hydration semantics
across the entire site. Not a one-line fix.

---

## 2. TypeScript strictness re-enablement

**Symptom.** `tsconfig.json` has `noImplicitAny: false`,
`noUnusedLocals: false`, `noUnusedParameters: false`,
`strictNullChecks: false`. Whole classes of bugs (null deref, unused
code, implicit any) silently pass review.

**Why deferred.** Flipping `strictNullChecks: true` alone produces
hundreds of new errors that must be triaged file-by-file. Multi-day
refactor.

**Suggested rollout.** Per-file overrides via `// @ts-strict-ignore`
or per-directory tsconfig — enable strict checks on new code first,
opt existing files in incrementally.

---

## 3. CSP `'unsafe-eval'` tightening

**Symptom.** `vercel.json` Content-Security-Policy includes
`'unsafe-eval'` and `'unsafe-inline'` in `script-src`. Both reduce
CSP's XSS-mitigation value materially.

**Why deferred.** Removing `'unsafe-eval'` requires identifying which
dependency (likely a runtime template / regex compiler) needs it.
Candidates worth checking first: any react-pdf / mathjs / yup
runtime variants, dynamically-built RegExp constructors, JSX-in-the-
DOM patterns. The audit pass needs to be deliberate — inline-script
nonces are the standard replacement and need build-pipeline support.

---

## 4. SAMHSA import pipeline rollout

**Symptom.** Schema + `samhsa-import-batch` edge function are
deployed (see `docs/samhsa-import.md`). State + county SEO generators
inject facility data into prerendered HTML when the DB has rows.
The remaining 5 generators still emit text-only templates:
`generate-missing-html.mjs`, `generate-all-missing-html.mjs`,
`generate-gsc-recovery-html.mjs`, `generate-remaining-nearme.mjs`,
`generate-missing-nearme-html.mjs`.

**Why deferred.** Multi-day work and waiting on the actual SAMHSA
data import to land first. Pattern is established in
`scripts/_facility-data.mjs` — each remaining generator needs the
same `fetchAllFacilities()` + `renderFacilityList()` integration.

---
