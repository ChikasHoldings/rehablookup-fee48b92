# Public Website 404 Audit — May 1 2026

## Headline

The platform was logging ~507 users/day landing on the React `NotFound`
page even though every URL returns HTTP 200 (Vercel SPA rewrite). Root
cause: **the SPA fallback rewrite in `vercel.json` was intercepting
requests for paths that had a matching pre-rendered HTML file in
`/public`, so Vercel served the generic `index.html` shell instead of
the page-specific HTML.** When the React app then booted, the URL did
not always match a route or a `SmartCatchAll` prefix, so the user was
shown the in-app 404 page.

## Evidence

1. **Internal-link validator clean**: `npm run check:internal-links`
   reported 0 unmatched links — so the 404s were not coming from in-app
   navigation.

2. **Sitemap-robots validator warning**: 297 pre-rendered HTML files
   exist in `/public` for routes that are not in `sitemap.xml`. Most are
   legacy slugs that `SmartCatchAll` redirects (e.g.
   `/alcohol-rehabilitation-michigan` → `/treatment-types/alcohol-rehabilitation/michigan`).

3. **Live curl confirmation**: requesting clean URLs returned the SPA
   shell title, not the prerendered title:

   ```
   $ curl -s https://rehablookup.com/12-step-vs-non-12-step-rehab | grep title
   <title>Find Trusted Addiction Treatment Centers | RehabLookup
   $ curl -s https://rehablookup.com/12-step-vs-non-12-step-rehab.html | grep title
   <title>12-Step vs Non-12-Step Rehab Programs | RehabLookup
   ```

   The same was true for `/alcohol-rehab-in-los-angeles`,
   `/for-providers-in-california`, and every other clean-URL request
   tested — even paths whose nested `public/<path>/index.html` already
   existed (e.g. `for-providers-in-california/index.html`).

4. **Result on the user**: the SPA shell loads, then React Router /
   `SmartCatchAll` evaluate `pathname`. For paths whose prerendered HTML
   exists but whose React route does NOT match cleanly (orphan slugs,
   legacy URLs without a redirect mapping, marketing-team URLs that
   were prerendered manually), the user was dropped onto `<NotFound />`.

## Root cause (confirmed)

`vercel.json` rewrite source was a negative-lookahead catch-all:

```jsonc
"source": "/((?!api/|assets/|functions/).*)",
"destination": "/index.html"
```

In our deployment Vercel was applying this rewrite **before** the
`cleanUrls` filesystem step that maps `/foo` → `/foo.html`. As a result
every clean URL was served the SPA index.html, defeating the entire
prerender pipeline.

## Fixes applied

1. **`vercel.json`**: simplified the SPA rewrite to the canonical Vite
   pattern (`/:path*` → `/index.html`). Vercel's documented order is
   filesystem-then-rewrites; the canonical pattern is what the platform
   tests its filesystem priority against.

2. **HTML generators** (`scripts/generate-seo-html.mjs`,
   `scripts/generate-missing-html.mjs`,
   `scripts/generate-gsc-recovery-html.mjs`): every `writePage` /
   `write` helper now emits **both** `<path>.html` and
   `<path>/index.html`. The nested `index.html` form is the universal
   convention that Vercel's filesystem step always serves before any
   user-defined rewrite, so this guarantees the prerender wins
   regardless of how Vercel orders cleanUrls vs. user rewrites in the
   future.

3. **Backfill**: ran a one-shot script to copy every existing
   `public/<path>.html` to `public/<path>/index.html` (2,299 files
   created, 0 conflicts) so the fix takes effect on the very next
   deploy without waiting for a full regeneration cycle.

## Validation

* `npm run check:internal-links` → 0 unmatched, 0 suspicious.
* `npm run validate:sitemap-robots` → 0 errors, 1 unchanged warning
  about the 297 prerender-orphan slugs (separate, lower-severity issue
  that does not cause 404s).

## Remaining items (lower severity)

* The 297 orphan prerenders (mostly legacy slugs that SmartCatchAll
  redirects) are not in the sitemap. They no longer cause 404s but they
  still waste crawl budget. Recommend a follow-up pass with
  `scripts/cleanup-orphan-prerenders.mjs --apply` after the next
  deploy is confirmed healthy.
* `NotFound.tsx` only logs to `console.error`. Consider wiring it to
  the existing analytics pipeline so future regressions are caught
  automatically (the only reason this issue surfaced was the user's
  external analytics call-out).
