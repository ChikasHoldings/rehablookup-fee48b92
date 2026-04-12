

# Platform-Wide SEO Audit and Controlled Expansion Plan

## Current Inventory

| Page Type | Count | Coverage |
|---|---|---|
| States (locationSeoData) | 50 | All 50 states |
| Cities (locationSeoData) | ~655 | 8-15 per state |
| Counties (countySeoData) | ~250 | 3-6 per state, 50 states |
| topCities (seoPageConfig, for City+Treatment combos) | 288 | Weighted to CA, TX, FL |
| Treatment types (for combos) | 14 | alcohol, drug, detox, inpatient, outpatient, dual-diagnosis, luxury, sober-living, free, faith, fentanyl, veterans, women's, men's |
| BestInState configs | 50 (10 core + 40 expanded) | All 50 states |
| Insurers | 16 | Major national carriers |
| Insurance state configs | 50 | All 50 states |
| Near-me pages | 31 variations x 51 (national + 50 states) | Full coverage |
| Treatment-types state pages | 6 types x 50 states | Alcohol, drug, detox, dual-diagnosis, inpatient, outpatient |
| Treatment-types city pages | 6 types x cities | Same 6 types |
| City+Treatment combos (SmartCatchAll) | 288 cities x 14 types = ~4,032 | All combinations |
| Insurance+State cross pages | 16 x 50 = 800 | All combinations |
| Substance pages | 14 | Cocaine, opioid, heroin, meth, etc. |
| Demographic pages | 10 | Young adult, teen, LGBTQ+, etc. |
| Comparison pages | 10 | Inpatient vs outpatient, etc. |
| Cost/insurance info pages | 7 | General educational |
| Seeker guides | 5 | Family-focused |
| State articles | 50 x 3 = 150 | How to find, cost, best cities |

**Estimated total addressable pages: ~6,000+**

---

## PHASE 1: AUDIT — Issues Found

### 1. Duplicate Content Risks
- **City+Treatment pages** (4,032) use `cityContentGenerator.ts` which varies content by population tier and state region, but 288 cities x 14 treatments = many pages with similar templated structure. The variation logic (metro/mid/small population tiers + ~50 state flavor strings) produces approximately 150 unique content combinations for 4,032 pages — high duplication risk.
- **Insurance+State pages** (800) use a single template with identical FAQ generation logic (`getInsuranceStateFAQs`) — likely producing near-identical FAQ content across insurers per state.
- **Near-me pages** (31 files) are individually coded but follow the same template structure — content differentiation relies mainly on treatment type name substitution.
- **County FAQs** use a `countyFAQs()` helper that generates identical question structures with only county/state name swapped — Google will see these as templated.

### 2. Soft 404 Risks
- **City+Treatment combos**: For small cities with no matching facilities, the page falls back to state-level results. If even those are sparse (e.g., "luxury rehab in Palmdale"), pages show few/no relevant results.
- **Insurance+State pages**: The facility filter has `|| true` fallback (line 40-41 of InsuranceStatePage), meaning ALL state facilities show regardless of insurance match — deceptive to users.

### 3. Missing Page Types (Gaps)
- **County+Treatment pages**: Do not exist.
- **County+Insurance pages**: Do not exist.
- **State+Insurance hub pages** (e.g., "Aetna rehab in California" without the `/insurance/` prefix): Only exist as `/insurance/:slug/:stateSlug`.
- **City+Insurance pages**: Do not exist.
- **Treatment+Insurance combo pages**: Do not exist.
- **BestInState** only has 50 states — no city-level "best in [city]" pages.

### 4. Schema/Breadcrumb Issues
- Multiple pages emit both `FAQPage` and `MedicalWebPage` schemas — potential duplication if FAQ content is thin.
- `BestInStatePage` emits `ItemList` + `FAQPage` — good.
- Need to verify no page emits duplicate `BreadcrumbList` (the `SEO` component and `SEOLandingTemplate` both handle breadcrumbs).

### 5. Internal Linking Gaps
- City pages don't link to county pages and vice versa.
- Insurance+State pages don't link to City+Treatment pages.
- County pages don't link to City+Treatment combos within them.

---

## PHASE 2: QUALITY REBUILD — Implementation Steps

### Step 1: Fix Insurance+State Facility Filter
Remove the `|| true` fallback in `InsuranceStatePage.tsx` that shows all state facilities regardless of insurance match. Replace with a proper fallback: first try exact insurance match, then show state facilities with a disclaimer.

### Step 2: Enhance Content Variation Engine
Upgrade `cityContentGenerator.ts` to produce more unique content:
- Add **facility density** variable (high/medium/low/none based on actual data)
- Add **urban vs rural** classification
- Add **regional healthcare context** (e.g., Medicaid expansion status, state licensing body name)
- Create 4-5 content templates per section that rotate based on a hash of city+treatment, not just population tier

### Step 3: Fix FAQ Deduplication
- `countyFAQs()`: Add county-specific data points (population-based cost ranges, specific hospital names from `majorCities`)
- `getInsuranceStateFAQs()`: Inject insurer-specific coverage details (e.g., Medicaid expansion status for Medicaid pages, network size for private insurers)
- `generateCityTreatmentFAQs()`: Ensure questions vary by treatment type, not just location swap

### Step 4: Thin Page Prevention System
Create a utility `shouldIndexPage()` that checks:
- Does this combination have >= 1 facility within the location?
- Does this combination have >= 3 facilities within the state?
- If neither: add `noindex` meta tag and exclude from sitemap
- Apply to: City+Treatment, Insurance+State, County pages

### Step 5: County Page Enhancement
Current county pages exist but need:
- Treatment type links to City+Treatment pages for cities within the county
- Insurance links to Insurance+State pages
- Better internal linking to neighboring counties

---

## PHASE 3: PAGE DIFFERENTIATION

### Enforce Distinct Page Personalities

| Page Type | Content Focus | Template Style |
|---|---|---|
| City | "Find treatment in [City]" — hyperlocal, nearby facilities, neighborhood context | Listings-first, map-oriented |
| State | "[State] treatment overview" — major cities, statewide stats, Medicaid info | Hub page, links to cities |
| County | "Regional coverage in [County]" — county seat focus, rural vs urban access | Regional context, bridge to cities |
| City+Treatment | "[Treatment] in [City]" — specific service availability | Treatment-focused with local filter |
| State+Treatment | "[Treatment] across [State]" — statewide availability, top cities | Overview with city links |
| Insurance+State | "[Insurer] rehab in [State]" — coverage details, acceptance rates | Insurance-focused with state context |
| Treatment Hub | "[Treatment Type]" — educational, national | Educational authority page |

### Add `pagePersonality` field to content generators
Each generator checks its page type and adjusts tone, section order, and CTA style accordingly.

---

## PHASE 4: SEO IMPLEMENTATION FIXES

### Metadata
- Audit all pages for unique `<title>` and `<meta description>` — the templated generators already do this, but verify no collisions across City+Treatment combos.
- Ensure canonical URLs are self-referencing (currently handled by `SEOLandingTemplate`).

### Schema Cleanup
- Add a check in `SEO` component: if `FAQPage` schema has fewer than 3 FAQs, don't emit it.
- Ensure only one `BreadcrumbList` per page (check for double-emission between `SEO` and `BreadcrumbNav`).

### Internal Linking Enhancement
Create a `SmartInternalLinks` component that generates contextual links based on page type:
- City pages → link to county, state, city+treatment combos, insurance pages
- County pages → link to cities within county, state page, nearby counties
- Treatment pages → link to top city+treatment combos, insurance+treatment
- Insurance pages → link to city and state pages

---

## PHASE 5: CONTROLLED EXPANSION

### Tier 1 (Implement Now)
1. **Expand BestInState** — Already at 50 states. Verify all content is unique (core 10 have hand-written content; expanded 40 may be templated).
2. **State+Treatment for remaining types** — Currently only 6 treatment types have state pages. Add for: luxury, sober-living, free, faith-based, fentanyl, veterans, women's, men's (8 more types x 50 states = 400 pages). Use `stateContentGenerator.ts` pattern.
3. **City+Treatment for top 50 cities** — Already covered via SmartCatchAll. Focus on ensuring these 50 x 14 = 700 pages have meaningful facility matches.

### Tier 2 (After Validation)
4. **County+Treatment pages** — For top 3 treatment types (alcohol, drug, detox) in counties with population > 200k. Estimated: ~80 counties x 3 = 240 pages. Route: `/rehab-centers/:stateSlug/county/:countySlug/:treatmentSlug`.
5. **City+Insurance pages** — For top 50 cities x top 4 insurers (Aetna, BCBS, Cigna, UHC). Route: `/insurance/:insurerSlug/:stateSlug/:citySlug`. Only create where facility data exists.

### Tier 3 (Deferred — requires data validation)
6. **Treatment+Insurance combo pages** — Only for Medicaid + Medicare with specific treatment types. ~10 pages.
7. **City+Treatment+Insurance** — Skip for now. Too high a risk of thin content.

### DO NOT CREATE
- Empty location pages with no facility data
- County+Insurance pages (low search volume, high duplication risk)
- Triple-combo pages without validated search demand

---

## PHASE 6: VALIDATION SYSTEM

### Pre-Indexing Checks (Build as utility)
Create `src/utils/seoPageValidator.ts`:
```text
validatePage(pageType, params) → {
  hasUniqueContent: boolean
  facilityCount: number  
  hasInternalLinks: boolean
  hasValidSchema: boolean
  hasThinSections: boolean
  recommendation: 'index' | 'noindex' | 'enhance'
}
```

### Apply to Sitemap Generation
Update the sitemap edge function to call validation before including URLs. Pages that fail get `noindex` and are excluded.

---

## PHASE 7: SITEMAP UPDATE

Update `sitemap-generator` edge function to:
1. Include new State+Treatment pages for expanded treatment types
2. Include County+Treatment pages (Tier 2)
3. Exclude pages where `shouldIndexPage()` returns false
4. Add `<lastmod>` dates based on facility data freshness

---

## Implementation Order (16 steps)

1. Fix Insurance+State `|| true` filter bug
2. Add `shouldIndexPage()` thin page detection utility
3. Enhance `cityContentGenerator` with density/urban-rural variables
4. Fix `countyFAQs()` and `getInsuranceStateFAQs()` for uniqueness
5. Schema cleanup — min 3 FAQs for FAQPage, single BreadcrumbList check
6. Create `SmartInternalLinks` component for contextual cross-linking
7. Add internal links to County, City, and Insurance pages
8. Expand State+Treatment pages (8 new types x 50 states)
9. Create State+Treatment data config and page components
10. Apply `noindex` to pages with no facility matches
11. Update sitemap edge function with expanded URLs + exclusions
12. Add County+Treatment route and page component (Tier 2)
13. Add City+Insurance route and page component (Tier 2)
14. Verify expanded BestInState content uniqueness
15. Audit all canonical URLs for correctness
16. QA: Spot-check 20 pages across all types for content uniqueness

**Estimated scope**: ~15-20 file changes, 3-5 new files, 1 edge function update. The data expansion (State+Treatment configs for 8 new types) is the largest single task.

