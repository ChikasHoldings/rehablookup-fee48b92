# Public website — link audit (round 22)

**Date:** 2026-05-17
**Scope:** Every internal navigation target (`<Link to=…>`, `navigate(…)`, `href="/…"`, `window.location.assign(…)`, `redirectTo=`), every footer link, every header link, and every external href on public-facing pages.

## Method

1. Resolved every registered React Router route — **907 routes** including nested children under `<Route path="/account">`, `<Route path="/provider">`, `<Route path="/admin">` shells. (My first parser had a false-positive bug where `<PublicRouteGuard>` matched the `<Route` prefix; v3 of the extractor added a `(?=[\s>])` lookahead and resolved 627 additional nested routes correctly.)
2. Grepped `src/**/*.{ts,tsx}` for every internal navigation target — **126 unique targets across 1,408 occurrences**.
3. Cross-referenced each target against the resolved-route set (treating `:param` as wildcard, `/*` as prefix-match).
4. Separately audited Footer (8 sections, 72 unique link paths), Header (5 unique targets), and external URLs.

## Findings + fixes

| # | Issue | Severity | Fix |
|---|---|---|---|
| 1 | `<Link to="/provider/locations/new">` in `pages/provider/Dashboard.tsx:438` — route doesn't exist. The "Add facility now" button in the signup-recovery banner navigated to a 404. | Showstopper for one specific banner CTA | Changed to `/provider/add-location` (the actual route). |
| 2 | SEO canonical URL `https://rehablookup.com/lp/ad` in `pages/AdLanding.tsx:266` — `/lp/ad` is not a registered route. The page is mounted at `/ads/:slug`. Misleading canonical for any crawler that follows it. | Cosmetic (page is `noindex,nofollow`) but still wrong | Removed the canonical declaration. The duplicate `<meta name="robots" content="noindex, nofollow" />` line dropped from 2 → 1 as a side-effect. |
| 3 | `<Route path="credits" element={<Navigate to="/provider/billing?purchase_credits=true" replace />} />` in `App.tsx:1650` — the credit-purchase model was retired during the EKRA refactor (round 18-21 cleanup). The `purchase_credits=true` query param is meaningless now. | Stale legacy redirect | Redirected to plain `/provider/billing` and added a comment explaining why. |

## Other categories swept — all clean

| Surface | Targets | Broken |
|---|---|---|
| Footer link data (`locationLinks`, `treatmentLinks`, `insuranceLinks`, `programLinks`, `internationalLinks`, `resourceLinks`, `providerLinks`, `companyLinks`) | 72 unique | **0** |
| Header (`components/layout/Header.tsx`) | 5 unique | **0** |
| External `https://` hosts in public pages | 5 hosts: `988lifeline.org`, `findtreatment.gov`, `cms.gov`, `samhsa.gov`, `rehablookup.com` | **0** broken (all real / canonical self-refs) |
| Empty `onClick={() => {}}` / no-op buttons in public surfaces | scanned across `pages/`, `components/{layout,home,seo,featured,blog,concierge,contact,listings,lead,marketing}/` | **0** |
| Insecure `http://` href in public pages | — | **0** |
| Static asset refs (`/sitemap.xml`, etc.) | `/sitemap.xml` lives in `/public/` — Vite serves it at root | **0** (was a false positive in the route extractor) |

## Resolved-route categories (for reference)

- 21 `/provider/*` panel routes (children of `<Route path="/provider">`)
- 30+ `/admin/*` routes (children of `<Route path="/admin">`)
- 14 `/account/*` seeker routes (children of `<Route path="/account">`)
- ~700 SEO / location / treatment-type / insurance / provider-guide marketing routes
- 15+ static legacy-URL redirects (e.g. `/provider-login` → `/login`, `/admin-login` → `/admin/login`, `/provider-signup` → `/provider/onboarding`, `/provider/listing` → `/provider/listings`, `/provider/placement-network` → `/provider/marketing`)

## Files changed

| File | Change |
|---|---|
| `src/pages/provider/Dashboard.tsx` | `/provider/locations/new` → `/provider/add-location` |
| `src/pages/AdLanding.tsx` | removed misleading canonical pointing to non-existent `/lp/ad` |
| `src/App.tsx` | `/provider/credits` redirect cleaned (dropped `?purchase_credits=true`) |
| `docs/public-link-audit-2026-05-17.md` | NEW — this report |

## Status

| Item | Status |
|---|---|
| Every navigation target validated against resolved routes | ✓ |
| Every footer link validated | ✓ |
| Every header link validated | ✓ |
| External hosts inventoried + verified | ✓ |
| No dead `onClick` no-op buttons on public surfaces | ✓ |
| Typecheck clean | ✓ |

All 21 prior audit/harden rounds remain reachable from HEAD.
