# Page Removal and Consolidation Plan (reassessed in Phase 1)

2026-11-23. **Status: proposal only. Nothing in this plan has been executed. Every removal, merge and redirect needs explicit owner approval, wave by wave.** Per-URL data: `SEO_PAGE_DECISIONS.csv` (columns `phase1_class`, `destination_check`, `evidence_gaps`, `confidence`, `approval_status`). Reproduce with `tools/reassess_decisions.py`.

---

## 1. What changed since Phase 0

1. **Six owner-defined classes** replace the Phase 0 action labels.
2. **Evidence limits are stated per URL.** Zero impressions in the GSC export is not treated as proof of no value:
   * the export lists only the top 1,000 pages, so a URL outside it had **11 or fewer** impressions in 16 months, not zero;
   * no backlink data was available;
   * GA4 has no per-URL landing-page or referral data.

   Every removal is therefore **medium confidence** until a backlink export and a full-history GSC page export are checked.
3. **Destination validation.** Every redirect or merge target was checked: it must exist, be prerendered, be indexable, not be a redirect source, and not itself be slated for removal or merge. Two problems were found and moved to *Requires more investigation*:
   * 13 county×service pages pointed at county hubs that are themselves slated to merge (a chain);
   * 1,001 city-combo URLs (currently 301 → noindexed `/search-results`) have no matching city hub with listings.
4. `/rehab-centers` now 301s to `/locations`, an indexable hub, so destinations built on it are valid. This shipped in Phase 1 as a single route, not part of the bulk plan.

## 2. Revised totals (50,607 known URLs)

| Class | URLs |
|---|---:|
| KEEP AND IMPROVE | 5,611 |
| MERGE INTO RELEVANT PAGE (301 to a broader page covering the same intent) | 3,284 |
| 301 REDIRECT TO TRUE EQUIVALENT | 2,320 |
| PERMANENTLY REMOVE WITH 404/410 | 37,174 (includes 1 facility URL that already returns 404) |
| RETAIN BUT NOINDEX | 2 |
| REQUIRES MORE INVESTIGATION | 2,216 |

## 3. Removal groups: why removing beats improving

For a group to be removed, all of these must hold: the URL template promises something the data cannot deliver; the pages carry no facility listings; their bodies are near-identical; Google has already declined to index the pattern; and no visitor journey depends on them. "Improve instead" is rejected only where improving would mean writing varied text with no new information, which the owner has ruled out.

| Group | URLs → 404/410 | Evidence | Why not improve |
|---|---:|---|---|
| Provider-marketing county pages (`/rehab-marketing/{state}/county/{county}[/{service}\|/insurance/{payer}]`, state and topic) | 6,599 | 6,653 pages on 28 distinct bodies; 0 facility links; 100% thin; no county-level B2B demand in GSC (the family's largest page has 62 impressions in 16 months) | There is no county-specific B2B information to add. The genuine provider content already lives in `/provider-guides/*` and `/for-providers`. |
| County near-me pages (`/{topic}-near-me/{state}/county/{county}`) | 7,021 | 21+ families of about 420 pages on **2** bodies each; 0 facility links; all orphaned; 7,123 in the sitemap | The county facility count is 0–3 for most counties. The useful version is the county hub (`/rehab-centers/{state}/county/{county}`), which already exists for counties with listings. |
| Insurance × county/city (`/insurance/{carrier}/{state}/county/{county}`) | 6,615 | 7,527 pages on 29 bodies (one cluster of 5,016); 0 facility links | Carrier acceptance is on record for 5 or fewer facilities per commercial carrier, so a page cannot truthfully list in-network facilities. Medicaid/Medicare/TRICARE are kept at **state** level, where data exists. |
| County × service (`/rehab-centers/{state}/county/{county}/{service}`) | 2,479 | 99.9% duplicate; 0 facility links; 0 inbound links | Duplicates the county hub, which carries the real listings. |
| City combos (`/{prefix}-in-{city}`, 48 prefixes × 288 cities) | 10,653 | 2 bodies per prefix; 0 facility links; 95% orphaned; 360 of them in the production sitemap | Most prefixes (luxury, couples, Christian, substance-specific, 30/60/90-day …) have no facility attribute in the data. The generic prefixes are consolidated into city hubs instead (see 301 groups). |
| Specialty × state/city (`/{specialty}/{state}[/{city}]`) | 2,018 | 100% templated; 0 facility links; orphaned | No data source supports the specialty. National educational pages remain. |
| Near-me state pages for unsupported topics | 1,623 | 0 facility links; duplicate bodies | Same topic-data problem. Supported topics merge into the canonical state × topic page instead. |
| Treatment × state for unsupported types (luxury, faith-based, fentanyl, holistic …) | 124 | 0 facility links | No data source. |
| Other small families (near-me city, insurance × city, specialty × city) | 104 | Same pattern | Same reasons. |
| **Total** | **37,174** (incl. 1 facility URL already 404) | | |

**Before each removal wave executes:** (a) export backlinks (GSC Links report, plus Ahrefs or Semrush if available) and flip any URL with external links to a 301 toward its family's merge target; (b) export full-history GSC page data for the wave's URL patterns and flip any URL with clicks to a 301.

## 4. Consolidation groups (301), with validated destinations

| Group | URLs | Destination | Class |
|---|---:|---|---|
| `/{list-your-facility,get-more-patients,for-providers}-in-{city}` | 200 | `/for-providers` | True equivalent (same intent, city name swapped in) |
| Duplicate state pages (`/detox-centers/{s}`, `/medicaid-rehab/{s}`, `/medicare-rehab/{s}`) | 150 | `/treatment-types/detox-programs/{s}`, `/insurance/{payer}-rehab/{s}` | True equivalent |
| City combos with a generic prefix (drug, alcohol, detox, IOP, outpatient, inpatient, PHP, MAT, sober living …) and a matching city hub with listings | 1,970 | `/rehab-centers/{state}/{city}` | True equivalent |
| Near-me state pages for supported topics | 1,087 | Canonical `/treatment-types/{type}/{state}` or `/insurance/{payer}-rehab/{state}` | Merge |
| City hubs with no exact-match facility | 632 | State hub | Merge (reconsider after the SAMHSA expansion: 753 cities would reach 3 or more listings) |
| County hubs with no listings | 238 | State hub | Merge (same caveat) |
| Commercial insurance × state | 650 | Carrier coverage guide `/insurance/{carrier}` | Merge |
| Evidence-bearing pages in removal families | ~700 | Family merge target | Merge |

**Destination check result:** every destination in the merge and 301 classes passed the checks in §1, after moving 1,014 URLs (13 chains + 1,001 without a hub) to *Requires more investigation*.

**Sequencing caveat:** if the SAMHSA expansion is approved, re-run the reassessment *before* executing the city/county hub merges, because 753 cities would cross 3 or more listings.

## 5. Requires more investigation (2,216)

| Group | URLs | What decides it |
|---|---:|---|
| City combos currently 301 → noindexed `/search-results`, no matching city hub | 1,001 | Either a city hub with listings exists after the SAMHSA expansion (→ 301), or 410 |
| Editorial (content_static, state articles, resource articles, international, resource hub) | ~486 | Content and medical review, one page at a time |
| Treatment × state/city, SAMHSA-supportable types (residential, sober living, women's, men's, veterans …) | 398 | Facet re-import (SAMHSA plan §5) and thresholds |
| Near-me state MAT/OTP topics | 200 | Canonical MAT/OTP state page in Phase 3 |
| National near-me topic pages | 58 | Editorial dedupe against `/treatment-types/*` |
| "Best rehab centers in {state}" | 51 | Remove the ranking claim or publish a methodology; or merge into the state hub |
| County×service chains | 13 | Resolve after the county-hub decision |
| Other | ~9 | Manual review |

## 6. How removal must be implemented (route generation actually stops)

A sitemap edit alone does not remove a page. For each approved family, all of the following must happen in the same release:

1. **Static output:** delete the family's committed `public/**` files *and* remove or guard the code paths that write them. The writers include `generate-all-missing-html.mjs`, `generate-gsc-recovery-html.mjs`, `generate-seo-html.mjs`, `generate-missing-nearme*.mjs`, `generate-remaining-nearme.mjs` and `generate-final-missing.mjs`. Add a build check that fails if any retired pattern reappears in `public/`.
2. **SPA routes:** remove the family's `<Route>` entries in `src/App.tsx` and the matching branches in `src/components/SmartCatchAll.tsx`. Otherwise visitors keep getting a 200 from React.
3. **Edge response:** add the retired patterns to `middleware.ts` and return **410** with `X-Robots-Tag: noindex` for crawlers *and* humans. Without this, an unknown top-level path currently falls through to the SPA shell as a 200 soft 404. For 301 groups, add explicit `vercel.json` redirects (single hop, to destinations that passed §4's check).
4. **Sitemaps and manifest:** regenerate `sitemap*.xml` and `prerender-manifest.ts`, then verify that no retired URL is present (`check-sitemap-coverage`, plus a new retired-pattern assertion).
5. **Internal links:** run `validate-internal-links` and the link-graph tool. No retained page may link to a retired URL.
6. **Verification after deploy:** sample at least 50 URLs per family from an allowed network, as Googlebot UA and as a browser: expect 410 (or 301 → 200 indexable). Then watch GSC "Not found (404)" climb and "Crawled/Discovered – not indexed" fall over the following 4–8 weeks.

## 7. Rollback

* **Code:** each wave is one PR. Revert the PR to restore the files, routes and sitemap entries.
* **Search:** Google re-crawls a restored URL, so a 410 that turns out to be a mistake is recoverable. Recovery is slower than for a 301, which is why any URL with external links or clicks becomes a 301.
* **Data:** removal deletes no database rows. Facility records, ownership and claims are never touched by URL removal.

## 8. Proposed waves (each needs a separate approval)

| Wave | Content | URLs |
|---|---|---:|
| A | Provider-marketing county pages, county near-me, insurance × county/city, county × service: zero-evidence rows only | about 22,700 → 410 |
| B | City combos (zero-evidence → 410; generic + hub → 301), specialty × location, near-me city | about 12,700 → 410, about 2,000 → 301 |
| C | Consolidations (near-me state, commercial insurance × state, provider city landings, duplicate state pages) | about 2,100 → 301 |
| D | City/county hub merges: **only after** the SAMHSA decision | about 870 |
