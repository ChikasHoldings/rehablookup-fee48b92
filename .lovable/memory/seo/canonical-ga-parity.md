---
name: Canonical ↔ GA4 page_location parity
description: `npm run check:canonical-ga` blocks build when prerendered pages miss/mismatch their canonical, or when RouteChangeTracker stops reading GA4 page_location from `link[rel="canonical"]`
type: feature
---
Two-part audit (`scripts/check-canonical-ga-parity.mjs`, wired into `npm run build` after `check:unique-meta`):

1. **Static** — every `/public/*.html` (except `index.html`, `404.html`) must ship a `<link rel="canonical">` that:
   - is absolute https,
   - host ∈ {rehablookup.com, www.rehablookup.com},
   - lowercase, no query/hash,
   - path matches the file path (`/foo.html` and `/foo/index.html` → `/foo`).

2. **Runtime** — `src/components/RouteChangeTracker.tsx` must:
   - query `link[rel="canonical"]`,
   - send `page_location` on every SPA navigation,
   - derive `page_location` from `canonicalEl?.href || window.location.href`.

This guarantees GA4 `page_location` matches what Google indexes — utm/query/uppercase variants don't fragment GA4 Pages reports, and Search Console ↔ GA4 reconciliation works.
