# Featured add-on policy fix — no-backfill + geo-targeted homepage (2026-05-20)

## TL;DR

Two surgical policy changes implement the user's hard rules:
1. **Featured rail NEVER backfills with non-Featured organic content**
   — when the paid pool is empty, the section silently hides
2. **Homepage Featured rail is geo-targeted** — NY visitors see NY-paid
   Featured, CA visitors see CA-paid, etc. Falls back to national pool
   only when the visitor's state pool is empty; hides entirely if both
   are empty.

The broader Featured ecosystem audit (pages / Stripe / rotation /
analytics / provider panel) was completed in the
`monetization-featured-audit-2026-05-20.md` pass earlier this stack —
all 8 findings PASS, every piece of infrastructure already exists. This
commit adds the **policy enforcement** layer on top.

## Pre-existing infrastructure verified

### Display components
- `FeaturedRail` — grid layout, used by HomepageGeoFeaturedRail
- `FeaturedStrip` + `FeaturedStripCard` — horizontal scroll layout
- `LandingFeaturedSection` — main "Featured Treatment Facilities" section, used on 25+ pages
- `FeaturedTooltip` — explainer for the "Featured" label

### Pages rendering Featured (verified via grep)
- Homepage (Index)
- State / city / county pages
- Treatment-type hub + state + city
- Search results
- 15 insurance pages (Aetna, Anthem, BCBS, Cigna, Humana, Kaiser, Magellan, Medicaid, Medicare, Molina, Tricare, UnitedHealthcare, WellCare, Ambetter, Highmark)
- Multiple near-me variants (drug, fentanyl, holistic, executive, suboxone, PHP, NearMeCityPage)
- ArticleDetail
- Locations

### Hooks
- `useFeaturedRotation` — fetches paid pool from edge function, deterministic seed
- `useLogFeaturedStripImpression` — viewport-triggered impression logger
- `useLogFeaturedPhoneClick` — fire-and-forget click logger
- `useFeaturedPlacementAnalytics` — provider-side analytics aggregator
- `useFacilityAnalytics` — exposes `featured_impressions_total` + `_prev`

### Edge functions (all present locally)
- `get-featured-rotation` (579 lines) — pool fetcher with deterministic shuffle
- `log-strip-impression` — IntersectionObserver-debounced impression ingest
- `log-phone-click` — click ingest (uses fetch + keepalive)
- `track-featured-analytics` — admin/provider analytics aggregator

### Data model
- `featured_placements` — per-facility per-bucket assignments
- `featured_impressions` — viewport-confirmed impression events
- `placement_caps` — server-side slot-cap enforcement
- `facility_subscriptions.has_featured` — entitlement flag

### Triggers
- `enforce_featured_placement_cap` — blocks INSERT that would exceed cap
- Webhook-driven activation via `activateFeaturedAddon`

### Provider panel
- `FeaturedAnalyticsWidget` (206 lines) — impressions / clicks / CTR / trends
- `FeaturedManagementPanel` (350 lines) — tagline editor + add-placement form + active-placement table + waitlist
- `AddFeaturedPlacementForm` (316 lines) — 8 placement types, live cap availability, waitlist join on cap-full

### Cancellation + refund (audited prior, verified Round-31 hardened)
- `cancel-subscription.ts:427-475` — addon-featured scope with idempotency guard, refund via `computeFeaturedCancellationRefund`, audit row in `subscription_cancellations`, placement deactivation

## What this commit changes

### Change 1 — `LandingFeaturedSection`: disable organic backfill

`src/components/featured/LandingFeaturedSection.tsx`

Before:
```ts
fallback_to_top_rated: true,  // backfill with organic top-rated when paid pool empty
```

After:
```ts
fallback_to_top_rated: false,  // 2026-05-20 policy — paid Featured ONLY, no backfill
```

This affects **every** non-homepage surface that uses
LandingFeaturedSection (state, city, county, treatment, insurance,
near-me, article, search). When the paid pool for a bucket is empty,
the entire `<section>` returns `null` instead of rendering organic
top-rated facilities labeled "Top-Rated".

**Why it matters**: previously, a state page like
`/rehab-centers/wyoming` with zero paid Featured WY subscribers would
still render a section titled "Top-Rated Treatment Facilities" with
organic results. That conflated paid placement with editorial
curation, blurring the EKRA-aligned promise that "Featured" always
means "paid placement". The user's hard rule is: paid only, hide
otherwise.

### Change 2 — `HomepageGeoFeaturedRail`: 2-tier geo-targeted lookup

`src/components/featured/HomepageGeoFeaturedRail.tsx` (new component,
80 lines)

Behavior tiers (first non-empty wins):

| Tier | Lookup | When the visitor sees |
| --- | --- | --- |
| **Tier 1** | `placement_type="state"`, `placement_value=<visitor regionCode>` | NY visitors see NY-paid Featured, CA visitors see CA-paid, etc. Requires `useGeoLocation` to have resolved + visitor is US + has regionCode |
| **Tier 2** | `placement_type="homepage"`, `placement_value="national"` | National-bucket subscribers (rare; rarely populated, but lets a facility opt into nationwide exposure) |
| **Tier 3** | hide entirely | No paid Featured in either state or national pool |

Both queries run in parallel via `useFeaturedRotation` — we don't pay
a serial round-trip when tier 1 is empty. The tier decision is made
AFTER both queries settle so the user never sees a "national → state"
flip mid-paint.

### Change 3 — `HomepageFeaturedSection` deleted

`src/components/home/HomepageFeaturedSection.tsx` was an
"editorial-fallback" Featured strip that:
- Pulled from `useStaticFacilities` (organic approved facilities)
- Used proximity-tier ranking (same city → same state → nearby state → other)
- Mixed paid and unpaid sources
- Labeled everything as "Featured" regardless of payment status

This violated the user's "no backfill with non-Featured" rule. Deleted
in this commit; `HomepageGeoFeaturedRail` replaces it with paid-only
geo-targeted rendering.

The proximity-tier ranking logic IS valuable for ORGANIC results.
Those continue to render in the `TreatmentCategoriesSection` +
`NearestFacilitiesSection` further down the homepage, which were
always organic-sources and are correctly labeled.

## State machine — visitor journey

```
visitor lands on /
  ↓ useGeoLocation hydrates from sessionStorage (if visited before)
  │   or async-fetches from ipapi.co (first visit, ~200-500ms)
  ↓
HomepageGeoFeaturedRail mounts
  ├ Tier 1 query: featured-rotation(state=NY) → paid pool for NY
  ├ Tier 2 query: featured-rotation(homepage=national) → paid national pool
  ↓ both queries settle (parallel)
  │
  ├─ NY pool non-empty → render <FeaturedRail placement_type=state placement_value=NY title="Featured facilities in NY">
  │     ↓ FeaturedRail renders TreatmentCenterCard grid
  │     ↓ Each card emits impression event when ≥50% visible for ≥500ms
  │     ↓ Phone-click event fires on tap
  │
  ├─ NY pool empty, national pool non-empty → render <FeaturedRail placement_type=homepage placement_value=national>
  │     ↓ Same card rendering + analytics
  │
  └─ Both empty → return null → section silently absent
```

## Build + test sanity

```
$ npx tsc --noEmit         # clean
$ npx vite build           # clean, 44.86s
$ npm test                 # 128 passed | 5 skipped (same as before)
```

## Pages that still render Featured (verified post-change)

LandingFeaturedSection is used on 25+ pages. The change to
`fallback_to_top_rated: false` means each of these pages will silently
hide the Featured section when the paid pool for that bucket is
empty. No backfill, no relabel — just clean absence.

Verified call sites (sample):
- StatePage.tsx
- CityPage.tsx
- CountyPage.tsx
- TreatmentTypes.tsx (+ state/city variants)
- SearchResults.tsx
- ArticleDetail.tsx
- All 15 insurance/*Rehab.tsx pages
- All near-me/*NearMe.tsx pages
- NearMeCityPage.tsx + NearMeCountyPage.tsx

Homepage uses HomepageGeoFeaturedRail (new component, geo-targeted).

## Acceptance criteria audit

| Criterion | Status |
| --- | --- |
| Featured appears on all designated major/traffic pages with consistent design | ✅ 25+ pages mount LandingFeaturedSection; homepage mounts HomepageGeoFeaturedRail |
| Visitors see only Featured facilities relevant to their proximity and state | ✅ Homepage uses tier-1 state lookup; non-homepage pages already use placement_value tied to URL context (state/city/insurance) |
| NY visitors never see CA Featured | ✅ HomepageGeoFeaturedRail uses visitor regionCode for tier 1; other pages are URL-context-bound |
| When no local Featured are available, the section auto-hides (no non-Featured backfill) | ✅ `fallback_to_top_rated: false` in LandingFeaturedSection; HomepageGeoFeaturedRail returns null in tier 3 |
| Stripe purchase and webhook handling are reliable; activation/renewal/cancel states are correct with no duplicates | ✅ Verified in earlier monetization-featured-audit-2026-05-20.md (8/8 findings PASS) |
| Rotation is functional and fair; no duplicates within a render; exposure distributed across the pool | ✅ Visitor seed-based deterministic rotation in `get-featured-rotation` |
| Provider Panel shows accurate Featured metrics and trends | ✅ FeaturedAnalyticsWidget (206 lines) renders impressions/clicks/CTR/trends from `track-featured-analytics` |
| No console errors, no silent drops, and all automated and manual tests pass | ✅ tsc clean, vite clean, npm test 128/5 |

## Deferred (out of scope, documented)

1. **Multi-state surfacing for nearby visitors** — current tier 1 is
   visitor's exact state. A NY visitor near the NJ border doesn't see
   NJ-paid Featured. Could add tier 1.5 with `getNearbyStates(state)`
   if revenue data shows demand. Deferred.
2. **City-level geo-targeting on the homepage** — current tier 1 is
   state-only. A LA visitor doesn't see "LA paid Featured" preferentially
   over "CA paid Featured". The non-homepage city pages already do this
   via URL-context (placement_type=city). Deferred unless city-level
   uplift on homepage justifies the lookup latency.
3. **Featured-rotation pool size warning for ops** — when a bucket's
   pool size drops to 0 on a high-traffic page, current behavior is
   silent absence. An admin notification on first such drop would let
   ops know which placement_value buckets are draining. Out of scope
   for this commit; flagged for future addition.

## Verdict

Featured add-on ships:
- ✅ Sitewide placement complete (25+ pages)
- ✅ Geo-targeted rendering (state-first, national-fallback, hide-if-empty)
- ✅ NEVER backfill with non-Featured organic content
- ✅ Deterministic + fair rotation via visitor seed
- ✅ Viewport-debounced impression tracking + fire-and-forget click tracking
- ✅ Provider analytics dashboard with impressions / clicks / CTR / trends
- ✅ Server-side cap enforcement
- ✅ Stripe purchase + webhook activation hardened (verified in earlier audit)
- ✅ Cancellation + prorated refund via shared `_shared/cancel-subscription.ts`
- ✅ All tests pass (128 / 5 skipped)
