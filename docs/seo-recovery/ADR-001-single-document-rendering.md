# ADR-001: One document for crawlers and visitors

* **Status:** Step 1 implemented 2026-11-23 for the retained page families (crawler snapshots of the real SPA render); steps 2–3 (serve one document to everyone, retire generators) remain planned
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

## Implemented 2026-11-23: crawler snapshots of the live page (step 1, owner-requested)

The owner asked for the parity gap to be fixed now rather than after the removal waves. What shipped:

* `scripts/render-crawler-snapshots.mjs` runs in `build:vercel` right after `vite build`. It serves `dist/` locally, opens each selected route in headless Chromium **exactly as a visitor would** (same SPA shell, same live Supabase data), scrolls the page so lazy sections load, and writes the rendered document over `dist/<path>.html` — the file `middleware.ts` already serves to crawlers. The homepage, which crawlers used to receive as an empty shell, is written to `dist/_crawler-home.html` and middleware now rewrites crawler requests for `/` to it.
* **Route set** (`scripts/_crawler-snapshot-routes.mjs`): every URL in the build's sitemaps that belongs to a retained family — home, state/city/county hubs, state articles, treatment types, insurance hubs and government-payer state pages, provider guides, resources, and single-segment content pages. Families proposed for removal (near-me, city combos, rehab-marketing, insurance × county, county × service) are excluded and keep their generator HTML until the owner decides on them. Facility profiles (`/center/*`) are not snapshotted yet (their generator HTML already shares the truth rules; enable with `--facilities`).
* **A snapshot replaces the generator page only if it passes every check**: no client-side redirect; real `<title>` and `<h1>`; no error or "not found" state; canonical equals the route's own URL; not noindex where the generator page was indexable; not thinner than the generator page. Otherwise the generator page stays and the reason is logged.
* The snapshot keeps the app's scripts (a crawler that runs JavaScript ends up with the same React page) and drops analytics. `check:trust-claims` now also scans every snapshot, so live database text is held to the same rules as the source.
* **Fail-soft.** If no browser can start on the build machine, the step logs it and exits 0; crawlers then receive the previous generator HTML. Browser provisioning on Vercel: `scripts/prepare-snapshot-browser.sh` (Playwright's own Chromium plus Amazon Linux libraries, cached in `node_modules/.cache`).
* **Speed.** Each worker loads the app once and moves between routes with in-app navigation, falling back to a full page load if a snapshot does not validate (identical output in a 17-route comparison). Local measurement: 3,630 routes in 21 minutes on 4 cores; the Vercel build machine has 8.

**Measured effect (local production-equivalent dist, 2026-11-23):** crawler word counts now equal the visitor's, e.g. `/rehab-centers/texas` 301 → 2,787, `/resources` 172 → 4,675, `/insurance/aetna-rehab` 171 → 1,786; state and city hubs now carry 12 crawlable `<a href="/center/…">` links each (0 before, from the visitor side).

**What the run exposed (fixed or recorded):**
* 9 public pages and the provider Settings screen crashed for every visitor (`Search` icon used without import; removed setters still called). Fixed; `check:undefined-identifiers` now blocks this class of bug in CI.
* 10 comparison routes (`/php-vs-iop`, `/rehab-vs-therapy` …) and `/notice-of-privacy-practices` rendered "not found" to visitors while crawlers got content. Fixed.
* 571 routes where the app itself is noindex (unsupported treatment-type × state pages, consolidated duplicate articles) but the crawler HTML said index; 50 "best cities" state articles and a handful of treatment/specialty pages that 404 for visitors; treatment × city pages the app redirects to the state page. These keep the generator HTML for now and are listed for the owner's removal/consolidation decision (`SEO_REMOVAL_PLAN.md`).

## Done in Phase 1 (interim)
* `/locations` crawler HTML now has parity with the SPA (same data source, H1, title and canonical). The 301 from `/rehab-centers` and every breadcrumb point to it.
* Facility schema and copy truth rules are shared by both renderers (`src/lib/seo/facilityTruth.mjs`), so the two cannot disagree on claims.
