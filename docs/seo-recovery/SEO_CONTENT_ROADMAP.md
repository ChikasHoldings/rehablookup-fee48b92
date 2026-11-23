# SEO Content Roadmap — RehabLookup

Phase 0 draft, 2026-11-22; updated for Phase 1, 2026-11-23.

**Phase 1 changes to this roadmap:**
* §1 is superseded in detail by `SEO_REMOVAL_PLAN.md` (six owner-defined classes, validated destinations, evidence gaps per URL). The families below are unchanged; the totals there are authoritative. Nothing has been removed.
* §2.1 truth fixes and the provenance block are **done** (Phase 1 batch 1). Profiles now show "information from a government directory (SAMHSA), not independently verified", "provided by the facility" for claimed listings, or a staff-entered notice. The "Independently verified by RehabLookup" state is still not shown anywhere, because no verification process exists.
* §2.1 internal links: the breadcrumb now goes to the indexable `/locations` hub (the `/rehab-centers` root 301s there), not to a `/rehab-centers` page.
* §2.2 "remove accredited/verified overclaims" is **done**.
* §2.3 data figures are refined by the SAMHSA validation: 7,434 usable new facilities (≈7,300 after dedupe); among them OTP/methadone 576, buprenorphine 3,264, residential/hospital inpatient 1,638, detox 1,048, Spanish-language 1,765 (`SEO_SAMHSA_IMPORT_PLAN.md` §3). Thresholds apply to *published* listings only, so none of these pages qualify until an import is approved.
* ADR-001: before upgrading any retained template, the crawler HTML must first show the same page as the SPA; otherwise improvements stay invisible to Google.
**Ground rule:** build fewer pages, and make each one carry real data or real expertise. Every new page type needs (a) demand evidence, (b) a data source that makes it true, and (c) a minimum-inventory threshold. **We will not create pages to "target" keywords the data cannot answer.**

---

## 1. Consolidation (Phase 2): what stops existing

The URL-level detail is in `SEO_PAGE_DECISIONS.csv`; rules R01–R35 are defined in `SEO_MASTER_AUDIT.md` §7. Summary:

| Family | URLs | Proposed outcome | Why |
|---|---:|---|---|
| provider_marketing_* (county / service / insurance / state / topic) | 6,704 | 410 (301 → `/provider-guides/rehab-marketing-strategies` for 105 with evidence) | 28 distinct bodies; no county-level B2B demand; doorway pattern |
| near_me_county (21+ families) | 7,126 | 410 (105 → 301) | 2 bodies per family; no facility links; all orphaned |
| insurance_x_county / insurance_x_city | 6,731 | 410 (116 → 301) | 5,016-page identical cluster; no carrier data |
| county_x_service | 2,514 | 410 (35 → 301 county hub) | Duplicates the county hub |
| city_combo `/{prefix}-in-{city}` | 13,835 | 410 for 10,653; retarget the 3,168 that currently 301 to noindexed search (2,167 to a matching city hub, 1,001 to 410); 10 to 301 and 4 to investigate (have evidence) | 288 pages per prefix on 2 bodies |
| specialty_x_state / specialty_x_city | 2,234 | 410, or 301 → national topic page | No facility data for the specialty |
| near_me_state | 2,910 | MERGE 1,000 into one canonical state × topic page; 410 for unsupported topics; INVESTIGATE 200 MAT/OTP | Cannibalization (up to 5 URLs per topic × state) |
| insurance_x_state (commercial carriers) | 650 | MERGE → carrier coverage guide | Carrier acceptance data covers 5 facilities or fewer |
| city_hub / county_hub without exact-match inventory | 870 | MERGE → state hub (or county hub once mapped) | Zero facilities; can't serve the "rehab in {city}" intent truthfully |
| provider_city_landing | 200 | 301 → `/for-providers` | Same intent with the city name swapped in |

Before any 410: export backlinks (GSC Links, plus Ahrefs or Semrush if available), and flip any URL with external links to a 301.

---

## 2. Upgrades of what stays (Phases 1, 3, 4)

### 2.1 Facility profiles (3,796; the core asset)
* **Truth:** remove fabricated schema and copy (batch 1).
* **Provenance block** on every profile, with one of three states:
  * "Information reported to SAMHSA's FindTreatment.gov (as of {scrape date})"
  * "Provided by the facility (claimed listing)"
  * "Independently verified by RehabLookup on {date} ({method})"
  Show the third only where a real verification record exists.
* **Completeness score** (internal, not shown): name quality (truncated names flagged for cleanup), address, phone, website, levels of care, payment, age groups, languages, special programs, accreditation, images, description provenance, claim status.
* **Facets from SAMHSA** (Phase 3 re-import): service setting, OTP/buprenorphine/naltrexone, special programs, languages, sex and ages accepted, public/private operation, payment assistance.
* **Internal links:** breadcrumb to the indexable `/rehab-centers` root → state → county/city. "Other facilities in {city}" uses exact matches only. "Same level of care in {county}". Every profile gets at least 3 crawler-visible inbound links.
* **Claim CTA** (Audience B), kept visually separate from the seeker flow.

### 2.2 State hubs (50; half of all impressions)
* A complete, paginated list of every listing in the state (not 12). Counts by level of care and payment type, computed from the data. Links to every city and county hub that has inventory.
* State-specific, sourced guidance on the state SUD agency, the state helpline if one exists, Medicaid coverage basics (cite CMS or the state agency), and how to check licensure. **One-off writing per state, reviewed; no templated paragraphs.**
* Remove the "accredited" and "verified" overclaims; say how listings are sourced.

### 2.3 Data-backed location × facet pages (Phase 3, rebuilt with thresholds)
Create or keep a facet × location page only when **at least N matching facilities** exist (proposal: N ≥ 5 for city, N ≥ 3 for county, N ≥ 10 for state) **and** there is demand evidence (GSC impressions or external volume).

| Facet | Data source | Candidate URL family (canonical) |
|---|---|---|
| Detox | `facility_services` Detoxification (722) and the SAMHSA detox facet (1,809) | `/treatment-types/detox-programs/{state}[/{city}]` |
| Outpatient / IOP / PHP | services (1,436 / 1,301 / 477) and SAMHSA service setting | `/treatment-types/outpatient-programs/...` (IOP/PHP as filters or sections) |
| Residential / inpatient | SAMHSA service setting | `/treatment-types/residential-inpatient/...` |
| Dual diagnosis | services (1,851) | `/treatment-types/dual-diagnosis-treatment/...` |
| MAT / OTP (methadone, buprenorphine) | services MAT (1,953); SAMHSA "Type of Opioid Treatment" (9,189) and pharmacotherapies | **New canonical** state-level MAT/OTP page (replaces the methadone-clinic, suboxone-clinic, mat-clinic and opioid near-me families) |
| Medicaid / Medicare / TRICARE | `facility_insurance` (2,746 / 1,820 / 1,432) | `/insurance/{payer}-rehab/{state}` |
| Low-cost / sliding scale / public | sliding scale (1,729); SAMHSA facility operation and payment assistance | `/treatment-types/free-rehab/{state}`, reworded to "free and low-cost options" with honest eligibility notes |
| Special populations (veterans, women, men, adolescents, older adults, LGBTQ+, pregnant/postpartum, criminal-justice clients) | SAMHSA "Special Programs/Groups" (12,433) and "Sex/Age Accepted" | One page per population at state level, only where the threshold is met |
| Languages (e.g. Spanish-language services) | SAMHSA language services (6,721) | State level, threshold-gated |

**Not to be rebuilt (no data):** luxury, executive, Christian/faith-based, couples, holistic, beach/mountain, same-day/emergency/immediate, 30/60/90-day, short/long-term, substance-specific location pages (benzo, cocaine, meth, xanax, kratom, …), and commercial-carrier location pages. Where there is demand, cover these as **national educational guides** that explain what to ask a facility, with no facility-matching claims.

---

## 3. New pages justified by evidence (Phase 4; prioritized)

Demand evidence comes from GSC impressions (see `SEO_KEYWORD_MAP.csv`). External volume was not available; validate it with a keyword tool before publishing.

### 3.1 Comparison guides (Audience A)
Existing related content must be audited first. `/12-step-vs-non-12-step-rehab`, `/30-day-vs-90-day-rehab`, `/detox-vs-rehab` and `/faith-based-vs-secular-rehab` exist as routes, so improve before creating.

| Guide | Status | Notes |
|---|---|---|
| Inpatient vs outpatient rehab | Check `/how-to-choose-between-inpatient-and-outpatient`; improve | Table: setting, intensity, typical duration ranges *cited* (ASAM levels of care), cost drivers, who it suits |
| IOP vs PHP | Create (after checking the `what-is-iop` and `what-is-php` overlap) | Cite ASAM level 2.1 vs 2.5 definitions |
| Residential vs PHP | Create | ASAM 3.x vs 2.5 |
| Medical detox vs residential treatment | Improve `/detox-vs-rehab` | Safety: alcohol and benzodiazepine withdrawal need medical supervision; cite NIAAA/SAMHSA |
| Medicaid vs private insurance for rehab | Create | No coverage promises; cite CMS and parity law |
| Sober living vs halfway house | Create | Definitions vary by state; cite NARR standards |
| 30 vs 60 vs 90-day programs | Improve `/30-day-vs-90-day-rehab` | NIDA's "adequate duration" principle; no invented success rates |
| Methadone vs buprenorphine vs naltrexone | Check the existing resources article; improve | FDA/SAMHSA sources; clinician review required |

### 3.2 Cost and insurance resources (Audience A)
How rehab insurance coverage works (parity law), deductibles and out-of-pocket costs, prior authorization, in-network vs out-of-network, Medicaid availability by state (link to the state pages), Medicare SUD coverage (cite CMS), state-funded programs and SAMHSA block grants (cite SAMHSA), and insurance denial appeals (an existing "Insurance Appeals" article is linked in the footer; audit it). **No coverage promises.** Every page carries "coverage varies by plan; confirm with your insurer and the facility".

### 3.3 FAQ consolidation
Audit every FAQ source first: `src/data/pageFaqs.ts`, `FAQ.tsx`, `ProviderFAQ.tsx`, and the per-page FAQ components. Merge duplicates into the canonical `/faq` and `/provider-faq`. Drop FAQPage markup on templated pages (F-21). Give substantive questions their own guide page.

### 3.4 Provider-facing (Audience B; kept separate from the seeker flow)
Provider guides show traction: about 3,664 impressions at position 37, with queries like "rehab marketing", "improve inquiry to admission conversion rate", "how to grow census". Plan:
1. Prerender the real article content (parity fix, batch 2).
2. Build an indexable `/provider-guides` hub.
3. Dedupe the 254 guides (223 share a crawler-HTML body today; check the SPA content for real duplication).
4. Strengthen the claim-a-listing and update-a-listing guides, and the "how listings are sourced and verified" page.

**Retire** the 6,704 county-level marketing pages (§1).

---

## 4. Healthcare trust and editorial system (Phase 5)

* **Pages to create or fix:** About (remove unverified staff unless confirmed), Editorial policy (describe only processes that exist), Medical review policy (named reviewers with license numbers, or say plainly that content is not clinically reviewed), Data sources & methodology (SAMHSA import, scrape date, refresh cadence, what "verified" means), Corrections (with a real mechanism, e.g. a form plus a changelog field on articles), Advertising and paid-placement disclosure (Pro and Featured effects on ordering), and How listings are ranked.
* **Review queue:** every clinical article that was bulk-stamped "medically reviewed" on 2026-08-28 is set back to "not yet reviewed" and queued for a credentialed reviewer. Priority: detox and withdrawal, MAT, dual diagnosis, overdose, then everything else.
* **Statistics policy:** every number gets a citation to a primary source (SAMHSA, NIDA, NIAAA, CDC, CMS). Fix the "40–60% maintain sobriety" inversion everywhere.

---

## 5. Editorial operating rhythm (from Phase 4 on)

* Publish in **batches of 5–10 pages**. Each batch is reviewed (fact check, plus medical review where clinical), internally linked, and added to the sitemap. Indexation and impressions are checked at T+14 and T+28 days before the next batch of the same type.
* Each new page records in the article front-matter or the DB: primary query cluster ID (from `SEO_KEYWORD_MAP.csv`), sources, author, reviewer, review date, and next review date.
* Writing standard: plain, compassionate American English; specific; no invented facts, experiences or statistics; no keyword stuffing; no templated paragraphs reused across pages.
