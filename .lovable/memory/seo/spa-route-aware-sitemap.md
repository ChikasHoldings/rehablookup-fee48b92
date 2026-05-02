---
name: SPA-route-aware sitemap generator
description: Sitemap filter derives allowlist from App.tsx + SmartCatchAll prefixes; keeps SPA-only URLs without prerenders
type: feature
---
`scripts/generate-sitemaps.mjs` no longer uses a hardcoded 16-item RUNTIME_ALLOWLIST. It calls `scripts/lib/extract-spa-routes.mjs` which parses:

1. Every `<Route path="...">` in `src/App.tsx` (static + parameterized).
2. Every prefix string in `src/components/SmartCatchAll.tsx` (CITY_TREATMENT_PREFIXES, `pathname.startsWith(...)` calls, etc).

Output: `{ staticRoutes: Set<string>, dynamicPrefixes: string[] }`. The sitemap filter keeps a URL if EITHER:
- A pre-rendered HTML file exists on disk (hybrid `/path.html` or `/path/index.html`), OR
- The path is a static SPA route, OR
- The path starts with any dynamic prefix (e.g. `/rehab-near-me/`, `/best-rehab-centers-in-`, `/center/`).

Excluded: `/admin`, `/account`, `/provider/*` (panel only — `/provider-guides/*` and `/provider-resources` ARE included as public SEO), `/seeker`, `/client`, `/auth`, `/login`, `/signup`, `/reset-password`, `/forgot-password`, `/404`, `/dev/`, `/ads/`, `/lp/`, `/center/` (separate handler), `/centers/`, `/facility/`, `/get-more-*` (SmartCatchAll provider-facing).

Result on 2026-05-02: upstream 31,998 → kept 31,251 (97.7%). Dropped 744 are deprecated SPA fallbacks (`/treatment-types/holistic/<state>` — redirected to `/holistic-therapy`) or auth-walled.

When adding a new <Route> in App.tsx or a new prefix in SmartCatchAll, the sitemap automatically picks it up next build — no allowlist edits required.
