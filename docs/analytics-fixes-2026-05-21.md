# Google Analytics — Fixes Applied (2026-05-21)

Audit: `docs/analytics-audit-2026-05-21.md`. Each fix below traces to a numbered finding (F1–F9).

## Phase 1 — Hotfixes

### F1 — Bot detection in `track-provider-event` (CRITICAL)
`supabase/functions/track-provider-event/index.ts`: edge function now reads the request's `User-Agent` header and matches it against a curated list of bot/crawler/headless/uptime patterns (Googlebot, Bingbot, Yandex, Baiduspider, prerender services, HeadlessChrome, PhantomJS, Playwright, UptimeRobot, Lighthouse, generic `crawler`/`spider`/`bot/` substrings, curl/wget/python-requests/axios/etc.). Bot hits are still INSERTED into `provider_events` with `is_bot=true` (so admin can opt into a "show bots" view for QA) but every dashboard query filters `is_bot=false` by default.

Conservatively expected impact: drops 10–30% of historical `profile_view` rows from default reports.

### F2 — Staff exclusion in `track-provider-event` (CRITICAL)
The same function now reads the request's `Authorization: Bearer …` JWT, calls `supabase.auth.getUser(token)`, and looks up the user's roles in `user_roles`. If any role matches `admin`, `super_admin`, or `manager`, the event is tagged `is_internal=true`. Providers + seekers are NOT internal — they're real users of the site, so their browsing still counts.

Conservatively expected impact: drops 5–15% of historical `profile_view` rows for facilities the staff frequently QA.

### Migration `20260712000000_provider_events_internal_bot_flags.sql`
Adds `is_internal boolean NOT NULL DEFAULT false` + `is_bot boolean NOT NULL DEFAULT false` to `provider_events`. Partial index `idx_provider_events_external_human` covers the default dashboard predicate so the new filter doesn't cost performance. Applied to prod via MCP.

### F3 — GA4 internal-traffic user property
- `src/lib/ga.ts:gaSetTrafficType('internal' | 'external')` — typed wrapper that calls `gtag('set', 'user_properties', { traffic_type })`.
- `src/hooks/useGAInternalTrafficFlag.ts` — new hook. On mount: applies cached value from localStorage immediately (avoids tagging delay on staff machines), then fetches the user's roles from `user_roles` and updates GA. Re-runs on Supabase `onAuthStateChange` (SIGNED_IN / SIGNED_OUT / TOKEN_REFRESHED / USER_UPDATED). Cached resolution avoids re-querying on every page load.
- `src/App.tsx:AppGlobals` mounts the hook once at the SPA root.

After this lands, configure GA4 → Admin → Data filters → Create filter → "Exclude" → User property `traffic_type` matches `internal` (use "Testing" state first to validate, then flip to "Active"). That's the user-side step; the code-side wiring is done.

## Phase 3 — Facility profile tracking

### F4 — `gaFacilityView` on profile mount
`src/lib/ga.ts:gaFacilityView({...})` fires a GA4 `facility_view` custom event with parameters: `facility_id`, `facility_slug`, `facility_name`, `facility_state`, `facility_city`, `facility_type`, `surface` (`public` or `seeker_panel`), and `content_group=facility`.

Wired into:
- `src/pages/CenterProfile.tsx` — public facility profile. Fires alongside the existing `trackProfileView` (provider_events) so both streams capture the same hit.
- `src/pages/seeker/SeekerFacilityProfile.tsx` — authenticated seeker view. Same parameters, but `surface=seeker_panel` so GA reports can distinguish authenticated browsing from public.

GA can now answer:
- "How many `facility_view` events did facility X get this month?" — filter by `facility_id`
- "Top 10 viewed facilities in California" — group by `facility_id` filtered by `facility_state`
- "What's the seeker-panel vs public view ratio for residential facilities?" — group by `surface` filtered by `facility_type`

### F5 — `gaFacilityContact` on click handlers
`src/lib/ga.ts:gaFacilityContact({...})` fires a GA4 `facility_contact` custom event with `facility_id`, `method` (`call` / `website` / `directions` / `send_request` / `tour_request` / `ready_to_connect`), `facility_slug`, `facility_state`.

Wired into both facility profile pages. The `trackInteraction` helper on CenterProfile and the new `handleFacilityContact` callback on SeekerFacilityProfile dual-sink to BOTH `provider_events` (admin/billing) AND GA. The `directions` method is now also captured (previously only logged to GA — no provider_events row because no PII transfer).

### F6 — `content_group` on every page_view
`src/components/RouteChangeTracker.tsx` now passes `content_group: resolveContentGroup(location.pathname)` on every page_view. `src/lib/ga.ts:resolveContentGroup` buckets paths into:
- `home` `/`
- `facility` `/center/...`
- `city` `/rehab-centers/<state>/<city>`
- `state` `/rehab-centers/<state>`
- `directory` `/rehab-centers`
- `search` `/search-results`
- `treatment_hub` `/treatment-types/...`
- `near_me` `/*-near-me/...`
- `insurance_hub` `/insurance/...`
- `resources` `/resources/...`
- `seeker_panel` `/account/...` or `/seeker/...`
- `provider_panel` `/provider/...`
- `admin_panel` `/admin/...`
- `concierge` `/concierge`
- `blog` `/blog` / `/articles`
- `other` (fallback)

Plus the `gaFacilityView` event also sets `content_group=facility` so reports can confidently aggregate facility traffic.

## F7 — Dashboard query filters

Eight surfaces that read `provider_events` now exclude `is_internal=true` and `is_bot=true` by default:

| File | What it shows | Change |
|---|---|---|
| `src/pages/admin/AdminAnalytics.tsx` | platform-wide views/clicks (4 queries: current+previous period × views+interactions) | `+.eq("is_internal", false).eq("is_bot", false)` |
| `src/pages/provider/Dashboard.tsx` | provider's own listing impression count | `+.eq("is_internal", false).eq("is_bot", false)` |
| `src/hooks/useProviderData.ts` | provider's 30-day profile view count | same |
| `src/components/admin/providers/tabs/ProviderAnalyticsTab.tsx` | admin viewing a specific provider's events | same |
| `src/components/admin/providers/tabs/ProviderOverviewTab.tsx` | per-provider KPI cards (4 queries) | same |
| `src/components/admin/providers/tabs/ProviderFacilitiesTab.tsx` | per-facility KPI table (4 queries) | same |
| `src/components/provider/ProMultiFacilityOverview.tsx` | Pro multi-facility provider overview | same |
| `src/components/admin/FeaturedAnalyticsDashboard.tsx` | Featured placement performance | same |
| `src/components/admin/FeaturedPlacementTab.tsx` | per-placement counts | same |
| `src/pages/admin/AdminSettings.tsx` | data dump (analytics tab) | same |
| `supabase/functions/send-admin-daily-summary/index.ts` | daily email KPI summary | same |

`DataHealthMonitor.tsx` intentionally KEEPS the unfiltered count — it's a row-existence/health check, not a visitor metric.

`delete-provider-account/index.ts` keeps the unfiltered DELETE — bot/internal rows still need cleanup when a provider account is wiped.

## Phase 5 — Verification + GA4 console steps

### Manual smoke (post-deploy)
1. Open `/center/<any-slug>` in an incognito window. In GA4 → Reports → Realtime, expect:
   - `page_view` event with `content_group=facility`
   - `facility_view` event with `facility_id`, `facility_state`, `facility_type`, `surface=public`
2. Click the "Call" button — expect `facility_contact` event with `method=call`.
3. Click the "Get directions" link — expect `facility_contact` event with `method=directions`.
4. Sign in as admin (chikasholdings@gmail.com). Reload. Open Realtime in a second tab. Expect:
   - Within ~1 second, the GA4 session shows `traffic_type=internal` in DebugView.
   - Subsequent `page_view` events on the admin session can be excluded via the Data Filter.
5. Watch DevTools Network → `track-provider-event` calls. Response should include `tagged: "internal"` on admin sessions.
6. Verify Googlebot simulation: open Chrome DevTools → More tools → Network conditions → User agent → `Googlebot/2.1 (+http://www.google.com/bot.html)`. Load `/center/<slug>`. The edge function should respond with `tagged: "bot"`; the row inserts but `is_bot=true`.

### GA4 console steps (user, one-time)
- Admin → Property → Custom definitions → Create custom dimension → register: `facility_id`, `facility_slug`, `facility_state`, `facility_city`, `facility_type`, `surface`, `content_group`, `method`. Scope: Event (except `content_group` which is also Session via the auto-collected dimension).
- Admin → Property → Custom definitions → Create custom dimension → register `traffic_type` as a User-scoped dimension.
- Admin → Property → Data filters → Create filter → name `Exclude internal staff`, type `Internal traffic`, exclude `traffic_type matches internal`. Start in "Testing" state for 24 hours, then flip to "Active".
- Admin → Property → Data settings → Data filters → confirm "Exclude known bots and spiders" is enabled (default).

### Definition reconciliation
After the GA4 changes propagate (24–48h), expect:

| Metric | Admin (`/admin/analytics`) | GA4 |
|---|---|---|
| "Profile views" (event count) | `count(provider_events WHERE event_type='profile_view' AND NOT is_internal AND NOT is_bot)` | `Events: facility_view` in Realtime / Reports |
| "Visitors" (deduplicated) | `count(DISTINCT session_id)` over same window | "Users" KPI in Reports |
| "Internal traffic" | rows with `is_internal=true` (visible in QA view) | sessions with `user_property:traffic_type=internal` (excluded by filter) |
| "Bot traffic" | rows with `is_bot=true` (visible in QA view) | excluded by GA's automatic bot filter |

Two streams should now agree within ~5% (residual is timing — admin counts at-insert, GA counts when event lands; GA also dedupes across tabs more aggressively).

## §3 — Deferred / follow-up

- **Server-side tagging (Measurement Protocol fallback)**: when a user has a strict ad-blocker, gtag.js never loads and the page_view never reaches GA. We could mirror critical events (facility_view, facility_contact) to GA's Measurement Protocol via an edge function. Deferred — most ad-blocker users aren't the audience anyway, and the dual-sink to `provider_events` already captures the engagement signal.
- **Cypress/Puppeteer regression tests** that assert `gtag` calls on route changes — useful but heavy; tracked separately.
- **Cross-domain tracking** — n/a today (single domain).
- **`analytics_events` first-party stream** (`src/lib/analytics.ts`) — should be reconciled with `provider_events` + GA in a future audit; some events fire to only one of the three sinks today.
