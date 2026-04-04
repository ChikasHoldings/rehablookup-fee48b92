

# Plan: SEO Expansion — Substance Pages, City Expansion, Insurance+State Pages, Hreflang & Best-in-State Roundups

## What We're Building

Based on the audit recommendations, we'll implement 5 major SEO expansions plus a sitemap update. All pages use the proven `SEOLandingTemplate` pattern with rich content, FAQ schema, and internal linking.

---

## Phase 1: Substance-Specific Landing Pages (6 pages)

**New pages under `/substance/`:**
- `/cocaine-addiction-treatment`
- `/opioid-addiction-treatment`
- `/heroin-addiction-treatment`
- `/meth-addiction-treatment`
- `/prescription-drug-rehab`
- `/benzodiazepine-addiction-treatment`

**Implementation:**
- Add `SubstanceConfig` type to `src/data/seoPageConfig.ts` with content, FAQs, symptoms, treatment approaches
- Create `src/pages/seo/SubstanceTreatmentPage.tsx` — a single dynamic page component using `SEOLandingTemplate`
- Each page includes: detailed intro (200+ words), 3-4 content sections (signs/symptoms, treatment approaches, recovery timeline, insurance), FAQ schema (5+ questions), facility listings filtered by substance keyword, internal links to city combos and insurance pages
- Register 6 routes in `App.tsx`

---

## Phase 2: Expand City+Treatment Combos to 50 Cities (150 new combos)

**Add 25 new cities** to `topCities` in `seoPageConfig.ts`:
Nashville ✓ (exists), San Diego ✓, Portland ✓, Minneapolis, Detroit, San Antonio ✓, Sacramento, Tampa, Charlotte ✓, Salt Lake City, Baltimore, Milwaukee, Kansas City, Tucson, Raleigh, Richmond, New Orleans, Pittsburgh, Oklahoma City, Honolulu, Albuquerque, Omaha, Virginia Beach, Boise, Spokane

**Implementation:**
- Extend `topCities` array from 25 → 50 cities with proper state/nearby data
- No new components needed — `CityTreatmentPage.tsx` already handles all combos dynamically
- This adds 25 cities × 6 treatment types = **150 new pages** automatically

---

## Phase 3: Insurance + State Cross Pages (45 pages)

**Pattern:** `/insurance/{provider}-rehab-coverage/{state}`

**Top 5 insurers × Top 9 states:**
- Insurers: Aetna, BCBS, Cigna, UnitedHealthcare, Humana
- States: California, Florida, Texas, New York, Arizona, Colorado, Ohio, Pennsylvania, Illinois

**Implementation:**
- Add `InsuranceStateConfig` to `seoPageConfig.ts` with state-specific content (Medicaid expansion status, average costs, state regulations)
- Create `src/pages/seo/InsuranceStatePage.tsx` using `SEOLandingTemplate`
- Content includes: state insurance laws, provider network details, cost breakdowns, how to verify coverage, FAQ schema
- Register wildcard routes in `App.tsx`: `/insurance/:provider-rehab-coverage/:state`

---

## Phase 4: "Best Rehab Centers in [State]" Roundup Pages (10 pages)

**States:** California, Florida, Texas, New York, Arizona, Colorado, Pennsylvania, Ohio, Illinois, Georgia

**Implementation:**
- Create `src/pages/seo/BestInStatePage.tsx`
- Dynamic facility listings from database filtered by state
- Content sections: state overview, treatment landscape, insurance options, how to choose
- ItemList schema markup for rankings
- Cross-links to city pages within the state, insurance pages, and treatment type pages
- Register routes: `/best-rehab-centers-in-:state`

---

## Phase 5: Hreflang Tags for International Pages

**Implementation:**
- Extend `SEO.tsx` props to accept `hreflang` entries: `{ lang: string; href: string }[]`
- Add `<link rel="alternate" hreflang="..." href="..." />` tags in Helmet
- Apply to all international pages:
  - `/us-rehab/canadian-patients` → `hreflang="en-CA"`
  - `/us-rehab/uk-patients` → `hreflang="en-GB"`
  - `/us-rehab/australian-patients` → `hreflang="en-AU"`
  - `/us-rehab/european-patients` → `hreflang="en-EU"` (and de, fr, etc.)
  - `/us-rehab/uae-patients` → `hreflang="ar-AE"`
- Each page gets `x-default` pointing to `/international`

---

## Phase 6: Sitemap Update

**Update `supabase/functions/sitemap-facilities/index.ts`:**
- Add all 6 substance treatment pages (priority 0.85)
- Add 150 new city+treatment combo URLs from expanded cities
- Add 45 insurance+state cross pages (priority 0.8)
- Add 10 best-in-state roundup pages (priority 0.85)
- Bump version to v4.0.0

---

## Files to Create/Modify

| Action | File | Purpose |
|--------|------|---------|
| Modify | `src/data/seoPageConfig.ts` | Add substance configs, 25 new cities, insurance-state configs, best-in-state configs |
| Create | `src/pages/seo/SubstanceTreatmentPage.tsx` | Substance-specific landing pages |
| Create | `src/pages/seo/InsuranceStatePage.tsx` | Insurance + state cross pages |
| Create | `src/pages/seo/BestInStatePage.tsx` | Best rehab in state roundups |
| Modify | `src/App.tsx` | Register ~15 new route patterns |
| Modify | `src/components/SEO.tsx` | Add hreflang support |
| Modify | 5 international page files | Add hreflang props |
| Modify | `supabase/functions/sitemap-facilities/index.ts` | Add all new URLs |
| Modify | `src/components/seo/InternalLinkingSection.tsx` | Add substance and best-in-state link groups |

## Estimated New Pages: **~220+ pages**
## Estimated Additional Monthly Traffic: **8,000–15,000 visits** at maturity

