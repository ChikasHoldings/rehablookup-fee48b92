# ADR-001: One document for crawlers and visitors

* **Status:** Proposed (Phase 1 investigation complete; implementation planned for Phase 3 after the removal waves)
* **Date:** 2026-11-23
* **Deciders:** owner + engineering

## Context

`middleware.ts` routes by user agent:

* Any UA matching the crawler regex gets the prerendered file `dist/<path>.html` (or a 404 for unknown dynamic slugs).
* **Every other client gets the SPA shell (`/`)**, and React renders the route.

The prerendered files are written by about 20 Node generators in `scripts/`. They do not run the React components, so the two renderings are maintained separately and have drifted.

### Measured divergence (production-equivalent build, 2026-11-23)

Measured with `tools/render_parity.mjs`. It is a local reproduction of the routing rule: crawler view = the static file; visitor view = the SPA rendered in Chromium. **It is not a fetch of production and not proof of what verified Googlebot receives.**

| Path | Crawler words | Visitor words | Crawler `/center` links | Visitor `/center` links | Title same | H1 same | Canonical same |
|---|---:|---:|---:|---:|:-:|:-:|:-:|
| `/` | 4 (SPA shell) | 1,439 | 0 | 0 | ✗ | ✗ | ✗ |
| `/locations` (fixed in Phase 1) | 1,824 | 1,712 | 0 | 0 | ✓ | ✓ | ✓ |
| `/rehab-centers/texas` | 421 | 2,787 | 12 | 0 | ✗ | ✓ | ✓ |
| `/rehab-centers/texas/houston` | 437 | 2,436 | 12 | 0 | ✗ | ✗ | ✓ |
| `/center/{slug}` | 843 | 1,446 | 1 | 0 | ≈ (dash only) | ✓ | ✓ |
| `/treatment-types/detox-programs/texas` | 233 | 2,786 | 0 | 8 | ✗ | ✗ | ✓ |
| `/detox-near-me/texas` | 272 | 2,271 | 0 | 0 | ✗ | ✗ | ✓ |
| `/insurance/aetna-rehab` | 171 | 1,786 | 0 | 0 | ✗ | ✓ | ✓ |
| `/resources` | 172 | 4,675 | 0 | 0 | ✗ | ✗ | ✓ |
| `/provider-guides/rehab-marketing-strategies` | 198 | 1,249 | 0 | 0 | ✗ | ✗ | ✓ |
| `/about` | 168 | 1,146 | 0 | 0 | ✗ | ✓ | ✓ |

Notes:
* For `/`, the "crawler view" is the SPA shell (`index.html` noscript content), which Google must render with JavaScript.
* Visitor-side facility cards on state and city pages navigate by click handler, so they expose **no `<a href="/center/…">`**. Even the rich version is not crawlable through links.
* Visitor JSON-LD includes the sitewide Organization/WebSite/MedicalWebPage set; crawler HTML does not.

### What this means
1. **Google is served the thin version of most templates.** Much of Phase 0's "thin content" measurement describes the crawler shells. The SPA pages carry 5–27× more text. Whether that text is useful or templated still has to be judged per template; it is not automatically better.
2. **Canonicals agree** everywhere except `/`, so this is not a canonicalization defect. **Titles and H1s disagree** on most templates.
3. This is dynamic rendering with non-equivalent content. Google treats dynamic rendering as a workaround, acceptable only when crawlers and users get equivalent content. The present gap is a quality problem (Google indexes the weaker page) and a maintenance problem (two implementations drift).

## Decision (proposed)

**Serve the same HTML document to every client, generated from the React components themselves, and hydrate it for visitors.**

Implementation outline, using existing capabilities without a framework change:
1. **Build-time rendering of the SPA** for the retained URL set. After the removal waves this is about 6–10k URLs, not 50k. Use the existing toolchain: Vite builds the app, then a headless pass with Playwright (already a devDependency) renders each retained route once and writes `dist/<path>.html` with full head, body, JSON-LD and data. React then hydrates over it.
2. **Middleware:** stop branching on user agent for retained routes. Serve the static file to everyone; React takes over after hydration. The "design switches on reload" bug the split was protecting against disappears, because the static file *is* the React render.
3. **Retire the parallel generators** template by template as each moves to SPA prerendering. Keep `generate-facility-profiles-html.mjs` only until `/center/*` is covered.
4. **Guard:** make `render_parity.mjs` a CI check (crawler == visitor title, H1, canonical, and main-content word count within ±15%) on a sample of each retained template.
5. **Links:** make facility cards real `<a href="/center/…">` links (with click handlers on top), so the hierarchy state → city → facility is crawlable.

## Alternatives considered

| Option | Why not (now) |
|---|---|
| A. Keep two renderings and enrich the generators (the approach in unmerged `seo/content-uniqueness-audit`) | Perpetuates drift; doubles maintenance; the branch's composer adds varied text without new data. |
| B. Serve the SPA shell to Googlebot too (no prerender) | Relies entirely on Google's JavaScript rendering for 50k URLs, with slower discovery. The shell `<head>` is generic until hydration, and other crawlers and AI fetchers often don't run JavaScript. |
| C. Migrate to an SSR framework (Next.js, Remix) | A rebuild; out of scope. Only reconsider if build-time rendering cannot keep up with data freshness. |

## Consequences
* **Positive:** one source of truth; Google sees what users see; the parity check prevents regressions; fewer generators.
* **Costs and risks:** rendering several thousand routes per build adds minutes, so cache by data hash. Data freshness depends on rebuild cadence; a facility-update webhook already exists as a pattern (`docs/audit/vercel-cutover/RUNBOOK.md` step 7). Hydration mismatches must be tested.
* **Sequencing:** do this **after** removal waves A–B, so effort is not spent rendering pages scheduled for removal.

## Done in Phase 1 (interim)
* `/locations` crawler HTML now has parity with the SPA (same data source, H1, title and canonical). The 301 from `/rehab-centers` and every breadcrumb point to it.
* Facility schema and copy truth rules are shared by both renderers (`src/lib/seo/facilityTruth.mjs`), so the two cannot disagree on claims.
