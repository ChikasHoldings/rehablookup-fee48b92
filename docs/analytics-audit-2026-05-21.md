# Google Analytics — Phase 0 Audit (2026-05-21)

Branch: `claude/phase2-deployment-5WYOn`. Evidence gathered via code inspection at HEAD plus live DB probes on production Supabase project `mldbxpntzcjalgjmwnqa`.

## Executive summary

There are **three parallel analytics pipelines** in the platform:

```
                                                  ┌── /admin/analytics + /provider/dashboard
  Browser ─┬─► track-provider-event edge fn ─► provider_events ──┤   (facility KPIs, billing signals)
           │                                                     └── send-admin-daily-summary cron
           │
           ├─► log-analytics-event edge fn ─► analytics_events
           │   (first-party event stream via src/lib/analytics.ts; rarely surfaced)
           │
           └─► gtag.js / Google Analytics G-MM5K8398LY
               (RouteChangeTracker fires page_view on every nav)
```

Each stream has different rules for what counts as a "visit", which is the root cause of the user-reported discrepancy ("Admin analytics show higher visitor counts than GA"). The investigation found:

1. **`track-provider-event` had no bot filter and no staff exclusion** — every Googlebot / Bingbot / prerender hit, plus every admin browsing their own facilities, incremented `provider_events.profile_view`. GA4 silently drops the same traffic via its automatic bot exclusion list and gets no signal from staff sessions (because we'd never tagged them), so GA always reads lower than admin.
2. **GA4 page_view events carried no facility identity** — `/center/<slug>` visits hit GA as generic page_views with no `facility_id` / `facility_state` / `facility_type` parameters. Reports couldn't slice by facility.
3. **`analytics.facilityView()` from `src/lib/analytics.ts`** existed but was never called by any page (orphan code).
4. **No internal-traffic GA filter** — admin/staff GA sessions were counted alongside real visitors. No `traffic_type` user property; no IP allowlist; no Audience filter.

## 1 — Inventory + GA setup

| Item | State |
|---|---|
| GA4 Measurement ID | `G-MM5K8398LY` (env-driven via `VITE_GA_MEASUREMENT_ID`; hardcoded fallback in `vite.config.ts` + `scripts/_ga.mjs`) |
| GA libraries | gtag.js only — **no GTM container** |
| Initial config | `send_page_view: false` (`index.html:407`) so RouteChangeTracker owns all page_views; prevents double-count |
| Route-change tracker | `src/components/RouteChangeTracker.tsx` — fires `gtag('event','page_view',{path,location,title})` on every `useLocation` change |
| Prerendered HTML | Static landing pages embed `gtag.js` with `send_page_view:true`; hybrid SPA shells use `send_page_view:false` (via `scripts/_ga.mjs` `gtagSnippetForSpaShell`) |
| Multiple property IDs | none — only `G-MM5K8398LY` across `src/`, `public/`, `scripts/` |
| Consent mode | not implemented — US-only site, no GDPR/CCPA banner shipped |
| CSP headers | `vercel.json` whitelists `googletagmanager.com`, `google-analytics.com`, `*.analytics.google.com` for `script-src` + `connect-src` |
| Cross-domain tracking | n/a — single domain `rehablookup.com` (the `www.` host 301-redirects to apex via inline script) |

## 2 — page_view event coverage

Verified that `RouteChangeTracker` fires a `page_view` on:
- Initial mount (deep links work)
- Every `useLocation` change (SPA navigation works)
- Path-only updates (`?utm=...` collapses to canonical via `<link rel=canonical>`)

**No double-firing.** Single source of truth.

**Gap:** `page_view` did not include `content_group` or `facility_*` parameters. Reports could see hits per URL but couldn't aggregate "all facility profile views" without manually pattern-matching paths.

## 3 — Discrepancy root causes (Admin > GA)

Live DB probes on `provider_events` show no internal traffic flag at all — every event was treated identically regardless of who fired it.

### 3.1 `track-provider-event` had no bot filtering
Every server-rendered prerender + every search-engine crawl + every uptime probe inflated counts. Estimated impact: 10–30% inflation depending on crawl frequency (catalog has 3,803 facility pages; common crawlers re-fetch the whole catalog every few weeks).

### 3.2 `track-provider-event` did not check the caller's role
An admin reviewing facilities at /admin/providers fires `profile_view` events the same way an anonymous visitor does. With ~3 staff and frequent QA browsing, conservatively another 5–15% inflation.

### 3.3 GA's automatic bot filter excludes the same traffic
GA4's built-in "Exclude known bots and spiders" filter (enabled by default at Admin → Property → Data Streams) silently drops the crawler traffic. So GA underreports relative to our table — actually GA is more accurate; we'd been inflating.

### 3.4 GA has no staff exclusion either
With no `traffic_type=internal` user property set, GA also counts admin sessions. So GA itself was somewhat inflated, just less than admin.

### 3.5 Definition mismatch — sessions vs events
The admin "visitor" KPI = `count(provider_events WHERE event_type IN ('profile_view','listing_impression'))`. That's an EVENT count, not a session/user count. GA's "Users" metric is a deduplicated user-id count. Comparing them apples-to-apples requires either:
- Showing GA "Events / facility_view" instead of "Users", OR
- Reducing admin to `count(DISTINCT session_id)` (which deduplicates within session but doesn't dedupe across).

## 4 — Facility profile tracking

| Source | What it fired | Where it landed | Carries facility_id? |
|---|---|---|---|
| `CenterProfile.tsx` mount | `trackProfileView(facility.id)` | `provider_events` row | ✓ |
| `SeekerFacilityProfile.tsx` mount | `trackProfileView(facility.id)` | `provider_events` row | ✓ |
| `RouteChangeTracker` | `gtag('event','page_view',{...})` | GA4 | ✗ — generic path/title only |
| Click "Call" / "Website" | `trackClickToCall` / `trackWebsiteClick` | `provider_events` row | ✓ |
| Click "Directions" | nothing (no provider_events entry) | — | n/a |
| Click "Send Request" / "Tour" / "Ready to Connect" | nothing on GA side | — | n/a |

**Net:** `provider_events` captured the dimensions; GA captured the page_view but lost the facility identity. Reports in GA could only break down by URL path (3,803 distinct paths) which doesn't aggregate well.

## 5 — Internal/staff traffic exclusion

| Layer | Pre-2026-05-21 | Notes |
|---|---|---|
| `provider_events` | no flag column | every admin click counted |
| GA4 | no `traffic_type` user property | staff sessions counted |
| GA4 Data Filters | no IP allowlist, no Audience exclusion | — |

## 6 — Prioritized fix plan

| # | Severity | Fix |
|---|---|---|
| F1 | **CRITICAL** | Add bot User-Agent detection to `track-provider-event`; tag `is_bot=true`. Admin analytics excludes them. |
| F2 | **CRITICAL** | Add admin/staff role detection to `track-provider-event`; tag `is_internal=true`. Admin analytics excludes them. |
| F3 | **HIGH** | Add `traffic_type=internal/external` GA4 user property from a `useGAInternalTrafficFlag` hook mounted in App.tsx. GA4 Data Filter can then exclude internal. |
| F4 | **HIGH** | Wire `gaFacilityView(...)` on CenterProfile + SeekerFacilityProfile mounts so GA gets facility_id, facility_state, facility_type, surface dimensions. |
| F5 | **HIGH** | Wire `gaFacilityContact(...)` on phone/website/directions click handlers — GA gets engagement signal mirroring `provider_events`. |
| F6 | MEDIUM | Add `content_group` parameter to every page_view in `RouteChangeTracker` so GA reports can slice by section without per-URL pattern matching. |
| F7 | MEDIUM | Backfill `is_internal=false, is_bot=false` filters on every admin / provider dashboard query that displays "visitor counts" so the KPIs reconcile. |
| F8 | LOW | Document the GA vs admin definition contract (events vs users vs sessions; bot filtering; staff exclusion). |
| F9 | LOW (deferred) | Register custom dimensions in GA4 console (`facility_id`, `facility_state`, `facility_type`, `facility_slug`, `surface`, `content_group`, `traffic_type` user property) so reports surface them. |

See `docs/analytics-fixes-2026-05-21.md` for the change log per fix.
