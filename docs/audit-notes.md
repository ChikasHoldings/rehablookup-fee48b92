# Phase 0 Audit Notes — 2026-05-22

Branch: `claude/phase2-deployment-5WYOn`

Short, role-focused summary of the files reviewed during the phase-0 audit
so the next person (human or agent) can orient quickly. Pair with
`docs/audit-build-warnings.md` for the build output capture.

---

## `package.json`

Standard Vite + React + TS + shadcn project. Two things worth flagging
about the build pipeline:

- **`validate:blocking`** (pre-existing) — chains two YMYL safety
  guards: `check:no-placeholder-phone` and `check:no-fake-inventory`.
  This is the script Vercel and the local build run *before and after*
  `vite build`, and it must exit 0 for the build to succeed. As of
  this audit it now also runs `check:no-duplicate-keys` (added by this
  commit) so duplicate object literal keys block the build the same
  way placeholder phone numbers do.
- **`prebuild:vercel`** — runs `npm run validate:blocking` once before
  Vercel kicks off the SEO-HTML generation pipeline. Cheap fail-fast.
- **`build:vercel`** — the real Vercel build. Long pipeline of static
  HTML / sitemap generators (`generate:seo-html`, `generate:county-pages`,
  `generate:missing-html`, `generate:gsc-recovery-html`,
  `generate:facility-profiles-html`, `generate:resources-html`,
  `generate:all-missing-html`, `generate:remaining-nearme`,
  `generate:missing-nearme`, `patch:og-image`, `backfill:ga-snippet`,
  `generate:sitemaps`, `generate:prerender-manifest`) → SEO link
  checks (`check:redirect-targets`, `check:canonical-ga`) → `vite build`
  → `validate:blocking` (post-build safety check).
- **`build`** (the local equivalent) is even longer — adds the
  vitest run, structured-data checks, internal-links audit, schema
  validators, etc. Useful for catching pre-deploy regressions
  locally, but slow.

Dependencies: React 18, react-router-dom 6.30, Supabase JS 2.87,
TanStack Query 5.83, Sentry 10.31, Stripe (React + JS), shadcn /
Radix UI, Tailwind 3.4, Vite 5.4. Tests via Vitest 3.2 and Playwright
1.48. Note: `@playwright/test` is listed under runtime `dependencies`
instead of `devDependencies` — harmless but worth tidying later.

## `vercel.json`

Static-host config for the SPA + prerendered pages.

- `trailingSlash: false` — canonicalized in app + here.
- `redirects` — ~150 entries, all 301s. Three broad buckets:
  1. **Slug renames** (`/centers` → `/rehab-centers`, `/blog` →
     `/resources`, `/sitemap` → `/sitemap-index.xml`, etc.).
  2. **Insurance carrier short slugs** → canonical `/insurance/<carrier>-rehab`.
  3. **Treatment-type legacy slugs** with `:state` / `:state/:city`
     parameters preserving geo context (e.g.
     `/treatment-types/drug-rehab/:state` →
     `/treatment-types/drug-addiction/:state`).
- `buildCommand`: `npm run build:vercel`.
- `outputDirectory`: `dist`.
- `rewrites`:
  - `/sitemap-facilities.xml` → Supabase edge function
    (dynamic sitemap for ~3.8k facilities).
  - `/(.*)` → `/index.html` (SPA fallback).
- `headers` — strict security baseline applied to every response:
  HSTS preload, X-Content-Type-Options, X-Frame-Options=SAMEORIGIN,
  Referrer-Policy=strict-origin-when-cross-origin, Permissions-Policy
  pinning camera/microphone off, and a hand-tuned CSP that allow-lists
  Supabase, Stripe, GA4/GTM, Sentry, Facebook Pixel, YouTube/Vimeo
  embeds, Google Fonts, and Firecrawl. Static `/assets/*` gets the
  one-year immutable cache; SEO hub paths get a short 60s
  `s-maxage=3600 stale-while-revalidate=3600`. Apple Universal
  Links file gets a JSON content-type + 1h cache.

## `src/main.tsx`

41-line bootstrap. Order matters:
1. `initSecurity()` — HTTPS upgrade guard.
2. Lazy-loaded Sentry behind `requestIdleCallback` so the 231 KB
   Sentry chunk doesn't block first paint (PROD only).
3. `initPerformanceOptimizations()`.
4. Remove the `#ssr-skeleton` placeholder that `index.html` ships
   so React doesn't double-paint.
5. `createRoot(...).render(<App />)`.
6. `warmQueryCache()` on `window.load` (or immediately if already
   loaded) — prefetches Supabase data for the homepage so the first
   navigation is instant.

## `src/App.tsx`

The router + provider tree, ~1907 lines and **929 `<Route>` entries**.
Lots of SEO surface area. Worth knowing:
- **Lazy chunks** — every page except `Index` (homepage) and
  `SmartCatchAll` is `lazy(import(...))`-loaded for bundle splitting.
  A single `<Suspense fallback={<div className="min-h-screen" />}>`
  reserves the viewport during chunk loads to avoid CLS.
- **Provider stack** (outer → inner): `GlobalErrorBoundary` →
  `HelmetProvider` → `SafeQueryClientProvider` → `SafeTooltipProvider`
  → `SafeBrowserRouter` → `NavigationProvider` → routes.
  The `Safe*` wrappers are `forwardRef` shells (`div.contents`) that
  absorb refs from instrumentation libraries so React doesn't warn
  about function components receiving refs.
- **Global side-effects** — `<AppGlobals>` mounts `useTelClickTracking`
  (GA4 `phone_click` event delegation) and `useGAInternalTrafficFlag`
  (tags GA4 session as internal/external once auth role is known).
- **Inline redirect components** — `LegacyCenterRedirect`,
  `BlogRedirect`, `NavigateHolisticState`, `NavigateOutpatientNearMe`,
  `NavigateAuthSignup`, `NavigateProviderClaim`,
  `NavigateDualDiagnosisRehabNearMe`, `SeekerToClientRedirect`,
  `FacilityToCenterRedirect`, `StateToRehabCentersRedirect`,
  `LocationToRehabCentersRedirect`, `DualDiagnosisStateRedirect`,
  `DetoxStateRedirect`, `InpatientStateRedirect`,
  `AlcoholStateRedirect`. These preserve route params on legacy slugs
  for backlink rescue.
- **Catch-all** — `SmartCatchAll` (eagerly imported, not lazy) handles
  both `/404` and `*` so SEO/near-me pages can `<Navigate to="/404">`
  without falling through SmartCatchAll's prefix matchers.
- **Top-level error handling** — `AppInner` registers a window
  `unhandledrejection` listener that forwards to Sentry and
  `preventDefault()`s the browser's default crash behavior so a
  rejected promise can't blank the page.

## Router config

There is **no `createBrowserRouter` or external router file** — the
entire route table lives inside the JSX of `App.tsx`. The
`react-router-dom` v6.30 imports (`BrowserRouter`, `Routes`, `Route`,
`Navigate`, `useParams`, `useSearchParams`) and the `<Routes>` block
are all defined in `src/App.tsx`. Supporting components that
coordinate with the router and live outside `App.tsx`:

- `src/components/ScrollToTop.tsx` — scrolls to top on every
  navigation; mounts inside `BrowserRouter`.
- `src/components/RouteChangeTracker.tsx` — fires GA4 `page_view`
  on every `useLocation` change.
- `src/components/TrailingSlashRedirect.tsx` — redirects any
  trailing-slash URL to the canonical no-slash form **before**
  `<Routes>` matches so it intercepts every path.
- `src/components/seo/SEORouteBoundary.tsx` — per-route SEO
  boundary that resets `<title>` / canonical / og:* on every
  navigation.
- `src/components/seo/StaticFileRedirect.tsx` — uses
  `window.location.replace` instead of SPA `<Navigate>` so the
  browser issues a real HTTP request for static files (e.g.
  `/sitemap-index.xml`).

---

## Tooling health (2026-05-22)

- `npm install` — clean, 531 packages, 0 vulnerabilities reported.
- `npx tsc --noEmit` — passes (exit 0) under the project's loose
  tsconfig (`strictNullChecks: false`, `noImplicitAny: false`).
- `npx tsc --noEmit --strict <file>` on `src/pages/admin/AdminLeads.tsx`
  surfaced **TS1117** ("An object literal cannot have multiple
  properties with the same name") for a duplicate `staleTime` —
  fixed in this commit.
- `npm run lint` — exits 1 with 545 errors + 81 warnings, almost all
  `@typescript-eslint/no-explicit-any` in `supabase/functions/**`
  (Deno edge functions) plus a handful of `react-refresh` warnings.
  Not blocking the production build today, but worth a follow-up to
  scope the `tseslint` config away from the Deno edge code (which is
  shipped to Supabase, not bundled by Vite).
- `npm run build` / `vite build` — succeeds (exit 0). Warnings
  captured in `docs/audit-build-warnings.md`; one was a real
  duplicate-key bug now fixed.
- `npm run validate:blocking` — exits 0 with the new
  `check:no-duplicate-keys` step wired in.

---

## Manual dashboard changes — 2026-05-22

Track here anything the Supabase MCP / CLI can't change. These are
**operator action items** — apply them in the Supabase Dashboard,
then re-run `get_advisors` to confirm the lint clears.

### Auth → DB connection pool: switch from Absolute to Percentage

**Advisor lint:** `auth_db_connections_absolute` (performance, WARN).

**What:** Supabase's GoTrue Auth server has its DB connection pool sized as
"Absolute 10". On larger Postgres instances this becomes a bottleneck
during login spikes (login flow, password reset, JWT refresh) because
GoTrue can't grow the pool with the instance.

**Where to change it:**
- Supabase Dashboard → Project Settings → Auth → Connection Pool
- Toggle from **Absolute (10)** to **Percentage (20%)**
- Save. The setting takes effect within a few seconds; no restart.

**Why 20%:** Supabase's recommended default for Auth. With a 60-connection
Postgres instance that's 12 connections (slightly above the current
absolute 10); on a 200-connection instance it's 40, which scales
without further intervention.

**Verification:** Run `get_advisors(performance)`. The
`auth_db_connections_absolute` warning should drop off (1 → 0).

**Owner:** project admin with Dashboard access (Claude Code MCP can't
toggle this — the Auth config sits behind the GoTrue control plane,
not in the SQL surface).
