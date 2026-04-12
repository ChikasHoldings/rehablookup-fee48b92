

# Provider-Side SEO Conversion Pages: Build Plan

## What Already Exists
- **50 state provider pages** (`/for-providers-in-{state}`) — custom-built, conversion-focused with stats, licensing info, CTAs
- **50 "list your facility" state pages** (`/list-your-facility-in-{state}`) — uses `ProviderSEOPageLayout`
- **35+ provider guide articles** (`/provider-guides/*`) — using `ProviderSEOPageLayout` (article-style, not landing pages)
- **No city-level provider pages exist**
- **No treatment-specific provider pages exist** (guides exist but not conversion landing pages)
- **No insurance-specific provider pages exist**
- **No comparison/alternative provider pages exist**

## Architecture

All new pages will use a **new dedicated template** (`ProviderConversionPage.tsx`) distinct from the existing article-style `ProviderSEOPageLayout`. This template enforces the exact 8-section structure requested (Hero → Problem → Local Insights → Solution → How It Works → Value Prop → Proof → Final CTA).

```text
ProviderConversionPage.tsx (new template)
├── Hero: Pain-driven headline + CTA → /for-providers
├── Problem: Industry pain points (contextual per page type)
├── Local/Niche Insights: Dynamic data per location/treatment/insurance
├── Solution: Position RehabLookup
├── How It Works: 4-step process
├── Value Proposition: 4 cards
├── Social Proof: Traffic stats, reach
└── Final CTA: Strong close → /for-providers
```

## New Pages to Build

### Phase 1: Core Pages (~100 pages)

**1. City Provider Pages (~50 pages)**
- Route: `/get-more-patients-in-{citySlug}-{stateSlug}`
- Top 50 cities (LA, NYC, Houston, Phoenix, Chicago, Dallas, etc.)
- Dynamic content: city population, competition level, monthly search volume
- Handled via `SmartCatchAll` prefix matching
- No overlap with existing `/for-providers-in-{state}` (those are state-level)

**2. Treatment Provider Pages (8 pages)**
- Route: `/provider-guides/get-more-{treatmentSlug}-patients`
- Types: detox, residential, IOP, PHP, sober-living, MAT, luxury, dual-diagnosis
- Each has unique problem/solution framing for that care level
- No overlap with existing guide articles (those are educational; these are conversion-focused with the full 8-section structure)

**3. State + Treatment Provider Pages (~40 pages)**
- Route: `/rehab-marketing/{stateSlug}/{treatmentSlug}`
- Top 8 states × 5 core treatments = 40 pages
- Dynamic: state-specific demand data + treatment-specific positioning
- States: CA, FL, TX, NY, PA, OH, IL, GA

### Phase 2: Insurance & Comparison (~20 pages)

**4. Insurance Provider Pages (6 pages)**
- Route: `/provider-guides/get-more-{insurerSlug}-patients`
- Insurers: Medicaid, Medicare, Blue Cross, Aetna, Cigna, United Healthcare
- Focus: how to attract patients with specific coverage

**5. State + Insurance Provider Pages (~12 pages)**
- Route: `/rehab-marketing/{stateSlug}/insurance/{insurerSlug}`
- Top 4 states × 3 insurers = 12 pages
- Dynamic state Medicaid expansion data

**6. Comparison/Alternative Pages (5 pages)**
- Route: `/provider-guides/{comparisonSlug}`
- Topics:
  - "Google Ads vs Rehab Directories"
  - "Best Rehab Marketing Platforms in 2026"
  - "Is Psychology Today Worth It for Rehab Centers?"
  - "Facebook Ads vs SEO for Treatment Centers"
  - "Rehab Lead Generation: Paid vs Organic"

### Phase 3: Hub + Internal Linking

**7. Rehab Marketing Hub Page (1 page)**
- Route: `/rehab-marketing`
- Master directory linking to all provider conversion pages
- Organized by: Location → Treatment → Insurance → Comparisons
- Strong SEO signals as the pillar page

## Technical Details

### Files to Create
1. `src/components/provider-guides/ProviderConversionPage.tsx` — New 8-section template
2. `src/pages/provider-guides/CityProviderPage.tsx` — City-level dynamic page
3. `src/pages/provider-guides/TreatmentProviderPage.tsx` — Treatment-specific conversion pages
4. `src/pages/provider-guides/StateTreatmentProviderPage.tsx` — State+Treatment combos
5. `src/pages/provider-guides/InsuranceProviderPage.tsx` — Insurance-specific pages
6. `src/pages/provider-guides/StateInsuranceProviderPage.tsx` — State+Insurance combos
7. `src/pages/provider-guides/ProviderComparisonPage.tsx` — Comparison pages
8. `src/pages/provider-guides/RehabMarketingHub.tsx` — Hub/pillar page
9. `src/data/providerCityData.ts` — City-level stats (population, searches, competition)
10. `src/data/providerPageConfigs.ts` — Treatment, insurance, comparison configs

### Files to Edit
1. `src/App.tsx` — Add ~10 new routes
2. `src/components/SmartCatchAll.tsx` — Add `get-more-patients-in-` and `rehab-marketing-in-` prefix handling
3. `supabase/functions/sitemap-facilities/index.ts` — Add all new provider URLs
4. `src/components/provider-guides/ProviderSEOPageLayout.tsx` — Update `relatedPages` array with new conversion pages

### Duplicate Prevention
- City pages target provider intent ("get more patients in Dallas") — completely different from user-facing city pages (`/rehab-centers/texas/dallas`)
- Treatment provider pages are conversion-focused vs existing educational guides
- State provider pages already exist at `/for-providers-in-{state}` — new State+Treatment combos go under `/rehab-marketing/{state}/{treatment}` with distinct content
- Each page gets a unique canonical URL

### Schema per Page
- `WebPage` schema (not Article — these are landing pages)
- `BreadcrumbList` schema (single instance)
- No FAQ schema on conversion pages (avoids duplication with guide pages)

### Internal Linking
- Every page links to `/for-providers` (primary CTA)
- Every page links to 3-5 related provider pages
- Hub page links to all sub-pages
- Cross-links to relevant user-facing SEO pages (e.g., city provider page links to the user-facing city directory)

### Estimated Total: ~140 new unique, conversion-driven pages

