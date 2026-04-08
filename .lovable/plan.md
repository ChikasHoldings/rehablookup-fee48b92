

# SEO Coverage Expansion Strategy

## Current Inventory (Audit Summary)

| Page Type | Current Count | Potential |
|-----------|--------------|-----------|
| City + Treatment combos | 4,032 (288 cities × 14 types) | Already strong |
| Best Rehab in [State] | **10** | **50** |
| Substance-specific pages | **6** | **14+** |
| Insurance + State pages | 800 | Already strong |
| Near-me pages | 31 | Already strong |
| Treatment hub pages | 5 | 8+ |
| Comparison pages | 3 | 10+ |
| Cost/info pages | 2 | 5+ |
| Provider guides | 39 | Already strong |
| For-providers-in-state | 50 | Already strong |
| **Demographic + treatment** | **0** | **New category** |
| **Profession-specific rehab** | **0** | **New category** |
| **Substance + city combos** | **0** | **New category** |

---

## Priority 1: Complete Best-in-State Coverage (40 new pages)

Only 10 of 50 states have "Best Rehab Centers in [State]" pages. These are high-intent, high-volume "best rehab in [state]" keywords. Add configs for all 40 missing states to `seoBestInStateConfig.ts`. The routing and page template already exist.

**Missing states**: Alabama, Alaska, Arkansas, Connecticut, Delaware, Hawaii, Idaho, Indiana, Iowa, Kansas, Kentucky, Louisiana, Maine, Maryland, Massachusetts, Michigan, Minnesota, Mississippi, Missouri, Montana, Nebraska, Nevada, New Hampshire, New Jersey, New Mexico, North Carolina, North Dakota, Oklahoma, Oregon, Rhode Island, South Carolina, South Dakota, Tennessee, Utah, Vermont, Virginia, Washington, West Virginia, Wisconsin, Wyoming.

**Impact**: +40 pages targeting "[best rehab in state]" keywords. Each state gets unique intro content, sections, FAQs, and structured data.

---

## Priority 2: Expand Substance-Specific Pages (8 new pages)

Current: cocaine, opioid, heroin, meth, prescription drug, benzodiazepine. Missing high-search-volume substances:

| New Page | Target Keywords |
|----------|----------------|
| Alcohol addiction treatment | "alcohol addiction treatment", "alcoholism treatment" |
| Marijuana/cannabis addiction | "marijuana addiction treatment", "cannabis use disorder" |
| Fentanyl addiction treatment | "fentanyl addiction treatment", "fentanyl detox" |
| Xanax addiction treatment | "xanax addiction", "xanax withdrawal treatment" |
| Adderall addiction treatment | "adderall addiction", "stimulant abuse treatment" |
| Kratom addiction treatment | "kratom addiction treatment", "kratom withdrawal" |
| Gabapentin addiction treatment | "gabapentin abuse treatment" |
| Tramadol addiction treatment | "tramadol addiction treatment" |

Add configs to `seoSubstanceConfig.ts` with unique clinical content, FAQs, and schema.

---

## Priority 3: New Comparison Pages (7 new pages)

Current: inpatient vs outpatient, detox vs rehab, private vs public. Add high-search comparisons:

- **PHP vs IOP** — "php vs iop", "partial hospitalization vs intensive outpatient"
- **30-day vs 90-day rehab** — "how long should rehab be"
- **MAT vs abstinence-based** — "medication assisted treatment vs abstinence"
- **12-step vs non-12-step** — "12 step alternatives", "non 12 step rehab"
- **Rehab vs therapy** — "do i need rehab or therapy"
- **Inpatient vs residential** — "inpatient vs residential treatment"
- **Sober living vs halfway house** — "sober living vs halfway house"

Add to `comparisonPages` array in `seoPageConfig.ts`. Template already handles rendering.

---

## Priority 4: Demographic/Population-Specific Pages (10 new pages)

New page category targeting underserved search intents:

- Young adults rehab (18-25)
- Teen rehab programs
- Senior/elderly addiction treatment
- LGBTQ+ rehab programs
- Pregnant women addiction treatment
- First responders rehab
- Healthcare professionals rehab (nurses, doctors)
- Executive rehab programs
- Teachers/educators rehab
- College student addiction treatment

**Implementation**: Create a new `seoDemographicConfig.ts` data file, a `DemographicTreatmentPage.tsx` template page, and add routes. Similar structure to substance pages.

---

## Priority 5: Expand Treatment Hub Pages (3 new pages)

Current hubs: alcohol, drug, detox, inpatient, outpatient, dual diagnosis. Add:

- **PHP Programs** — "partial hospitalization program near me"
- **IOP Programs** — "intensive outpatient program near me"  
- **MAT Programs** — "medication assisted treatment near me"

Add to `treatmentHubPages` array. Template already exists.

---

## Priority 6: Additional Cost/Info Pages (3 new pages)

- **How to pay for rehab without insurance** — "rehab without insurance", "how to afford rehab"
- **Free rehab programs guide** — "free rehab programs", "state funded rehab"
- **Rehab financial assistance guide** — "rehab grants", "scholarship for rehab"

Add to `costInsurancePages` array.

---

## Priority 7: Seeker Intent / "How to Help" Pages (5 new pages)

Capturing informational + transactional queries from family members:

- How to stage an intervention
- Signs your loved one needs rehab
- How to help an alcoholic family member
- What to expect when a loved one goes to rehab
- How to find rehab for a family member

**Implementation**: New `seoSeekerGuidesConfig.ts` + `SeekerGuidePage.tsx` template with FAQ schema, internal linking to facility search.

---

## Structural SEO Improvements

### Internal Linking Enhancements
- Cross-link substance pages to relevant city+treatment pages (e.g., "opioid treatment" links to "drug rehab in [top cities]")
- Cross-link demographic pages to relevant near-me and city pages
- Add "Related Conditions" section to each substance page linking to other substance pages
- Add breadcrumb depth: Home > Treatment Types > [Type] > [City]

### Keyword Cannibalization Prevention
- Map primary keyword targets per page type to avoid overlap
- Substance pages target condition-name queries; treatment hubs target service-type queries
- City+treatment pages own "[type] in [city]"; near-me pages own "[type] near me"
- Demographic pages own "[population] rehab" queries

### Sitemap & Indexing Updates
- Add all new pages to sitemap generation scripts
- Generate static HTML files for new page categories
- Update `robots.txt` and `sitemap-index.xml`

---

## Total Impact

| Metric | Before | After |
|--------|--------|-------|
| Best-in-state pages | 10 | **50** |
| Substance pages | 6 | **14** |
| Comparison pages | 3 | **10** |
| Demographic pages | 0 | **10** |
| Treatment hub pages | 5 | **8** |
| Cost/info pages | 2 | **5** |
| Seeker guide pages | 0 | **5** |
| **New pages total** | — | **+82 pages** |
| Estimated new keyword targets | — | **500+ long-tail keywords** |

---

## Implementation Order

1. **Best-in-state expansion** (40 pages) — highest impact, template exists, data-only change
2. **New substance pages** (8 pages) — data-only addition to existing config
3. **New comparison pages** (7 pages) — data-only addition
4. **New treatment hub pages** (3 pages) — data-only addition
5. **New cost/info pages** (3 pages) — data-only addition
6. **Demographic pages** (10 pages) — new template + config + routes
7. **Seeker guide pages** (5 pages) — new template + config + routes
8. **Internal linking pass** — cross-link all new and existing pages
9. **Sitemap + static HTML generation** — update build scripts

---

## Technical Details

- Priorities 1-5 require **only data additions** to existing config files — all templates and routing already exist
- Priority 6-7 require new page components, config files, and route additions
- All new pages follow existing patterns: SEOLandingTemplate with structured data, FAQs, breadcrumbs, and internal linking
- Static HTML generation scripts need updating to include new page categories
- SmartCatchAll may need new prefix patterns for demographic pages if using inline slug format

