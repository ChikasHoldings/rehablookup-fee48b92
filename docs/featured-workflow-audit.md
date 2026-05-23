# Featured Workflow — audit + migration plan

**Date:** 2026-05-23
**Status:** Workflow IS functional; one critical placement gap fixed
(article slug pages); known parallel-systems gap documented below.

## End-to-end map

```
┌─────────────────────────────────────────────────────────────────┐
│ SOURCE OF TRUTH (DB)                                            │
│                                                                  │
│   public.featured_placements                                    │
│     (facility_id, placement_type, placement_value, active,      │
│      activated_at, subscription_id)                             │
│   public.facility_subscriptions.has_featured                    │
│   public.placement_caps  (slot scarcity per bucket)             │
│   public.featured_impressions  (server-side analytics)          │
│   public.featured_phone_clicks (server-side analytics)          │
└─────────────────────────────────────────────────────────────────┘
                              │
            ┌─────────────────┴─────────────────┐
            ▼                                   ▼
┌───────────────────────────┐     ┌───────────────────────────┐
│ NEW (canonical)           │     │ LEGACY (deprecated)       │
│                           │     │                           │
│ supabase/functions/       │     │ supabase/functions/       │
│   get-featured-rotation   │     │   get-featured-facilities │
│                           │     │                           │
│ Cookie seed (rl_rot_seed) │     │ Daily seed (date hash)    │
│ Reads featured_placements │     │ Reads has_featured flag   │
│   + has_featured join     │     │   from public_facilities  │
│ NO editorial backfill     │     │ Falls back to top-rated   │
│ EKRA-aligned              │     │ (older, more permissive)  │
└───────────────────────────┘     └───────────────────────────┘
            │                                   │
            ▼                                   ▼
┌───────────────────────────┐     ┌───────────────────────────┐
│ useFeaturedRotation hook  │     │ useStaticFacilities       │
│ useGeoTargetedFeatured    │     │   filtered by              │
│                           │     │   isHomepageFeatured ||    │
│                           │     │   hasFeaturedSubscription  │
└───────────────────────────┘     └───────────────────────────┘
            │                                   │
            ▼                                   ▼
┌───────────────────────────┐     ┌───────────────────────────┐
│ <LandingFeaturedSection/> │     │ <FeaturedCentersSection/> │
│ <HomepageGeoFeaturedRail/>│     │ (src/components/seo/)     │
│ <FeaturedRail/>           │     │                           │
└───────────────────────────┘     └───────────────────────────┘
            │                                   │
            ▼                                   ▼
        12+ pages                          2 pages
   (homepage, state/city/                (/locations,
    county, treatment-types,              TreatmentTypes hub)
    insurance, near-me,
    article slug, search-results,
    CenterProfile)
```

## Placement matrix (2026-05-23, post-fix)

| Page | Component | Position | Notes |
|---|---|---|---|
| `/` Homepage | `HomepageGeoFeaturedRail` | Under hero | Geo-tier resolution (state → nearby → national). |
| `/search-results` | `FeaturedRail` | Above results list | In results column. Position is correct for high-intent search. |
| `/locations` | `FeaturedCentersSection` (legacy) | Under hero | **TODO**: migrate to `LandingFeaturedSection`. |
| `/treatment-types` hub | `FeaturedCentersSection` (legacy) | Under hero | **TODO**: migrate to `LandingFeaturedSection`. |
| `/rehab-centers/<state>` | `LandingFeaturedSection` | Under hero | `placement_type="state"`. |
| `/rehab-centers/<state>/<city>` | `LandingFeaturedSection` | Under hero | `placement_type="city"`. |
| `/rehab-centers/<state>/county/<county>` | `LandingFeaturedSection` | Under hero | Uses `placement_type="state"` (no dedicated county bucket in rotation system — documented at CountyPage.tsx:273-277). |
| `/treatment-types/<slug>` (all) | `LandingFeaturedSection` | Under hero | `placement_type="treatment"`. |
| `/insurance/<carrier>` (all) | `LandingFeaturedSection` | Under hero | `placement_type="insurance"`. |
| `/<slug>-near-me` (all) | `LandingFeaturedSection` | Under hero | `placement_type="near_me"`. |
| `/resources/<slug>` (articles) | `LandingFeaturedSection` | **End of article** ← fixed this session | Moved from under-hero (broke reading flow) to between share-bar and Related Articles. |
| `/center/<slug>` (CenterProfile) | `LandingFeaturedSection` | **End of page** ← new this session | "More Featured Facilities in {city}". |
| `/compare`, SEO long-tail | _none_ | _not present_ | Tracked below. |

## Known gaps (deferred, by impact)

### 1. Parallel systems (legacy vs new) — HIGHEST IMPACT

**Current state**: /locations and /treatment-types hub mount `FeaturedCentersSection` which uses `get-featured-facilities` + falls back to organic top-rated. The newer `LandingFeaturedSection` uses `get-featured-rotation` (paid placements only, no fallback).

**Why it matters**: a facility tagged "featured" on one path may not appear on the other. Analytics split between two tables. Admin UI configures one; some surfaces show the other.

**Migration plan**:
  1. Confirm paid-Featured subscriber coverage for `homepage`/`national` and `treatment`/`all` buckets has ≥3 active subscribers each (today the strip would be empty otherwise).
  2. Replace `<FeaturedCentersSection />` calls at:
     - `src/pages/Locations.tsx:213` → `<LandingFeaturedSection placement_type="homepage" placement_value="national" />`
     - `src/pages/TreatmentTypes.tsx:322` → `<LandingFeaturedSection placement_type="treatment" placement_value="all" />`
  3. Mark `src/components/seo/FeaturedCentersSection.tsx` deprecated with a tsc `@deprecated` jsdoc tag.
  4. Retire `get-featured-facilities` edge function once no SPA path consumes it (also referenced by useApprovedFacilities and useStaticFacilities — verify those don't break).

### 2. Two analytics tables that don't merge

- `featured_impressions` + `featured_phone_clicks` (new path, written by useFeaturedRotation impression logger).
- `featured_placement_analytics` (legacy, written by track-featured-analytics from `TreatmentCenterCard.tsx:133` + `SearchResultCard.tsx:177`).

Provider dashboard widget reads ONE; cards write to the OTHER. Admin-only impact today, but a sponsor reviewing their dashboard sees inconsistent CTR vs. real attribution.

**Plan**: consolidate writes to `featured_impressions`/`featured_phone_clicks`. Migrate the dashboard widget to query those tables. Drop `featured_placement_analytics` rows after a 90-day retention window.

### 3. Dead code — `FeaturedStrip.tsx`

`src/components/featured/FeaturedStrip.tsx` and `FeaturedStripCard.tsx` are imported nowhere outside their own folder. Was an earlier iteration of the horizontal scroll surface that LandingFeaturedSection replaced. Safe to delete.

### 4. Pages without a Featured strip (audit-flagged candidates)

| Page | Recommended bucket | Position | Priority |
|---|---|---|---|
| `/compare` | `city` (most-compared facility's city) | Below comparison table | Low |
| `src/pages/seo/BestInStatePage.tsx` | `state` | Under hero | Medium |
| `src/pages/seo/CityInsurancePage.tsx` | `city` | Under hero | Medium |
| `src/pages/seo/DemographicCityPage.tsx` | `city` | Under hero | Medium |
| `src/pages/seo/TherapyModalityPage.tsx` | `treatment` | Under hero | Medium |
| Other `src/pages/seo/*` | varies | Under hero | Low-medium |

Adding to all of these is ~10 component mounts (one per page). Deferred to a focused session — bulk-applying could introduce subtle prop-typing issues per-page.

### 5. County bucket gap

`CountyPage.tsx:278` uses `placement_type="state"` with `placement_value=stateData.slug` because the rotation system has no dedicated `placement_type="county"`. Comment at lines 273-277 documents this. A future schema migration could add a `county` placement_type so providers can pay specifically for county-level exposure (a small but real revenue opportunity — county pages drive ~12% of long-tail SEO traffic per the GSC dashboard).

## Verification

  - Article move + CenterProfile add: shipped in commit `947b593d3`.
  - 205/205 unit tests pass.
  - tsc clean on touched files.
  - Featured strips render: confirmed `LandingFeaturedSection` returns
    null when `placement_value` is null AND when the rotation pool is
    empty, so adding it to CenterProfile + moving it on ArticleDetail
    is safe even for facilities/articles without a bucket configured.
