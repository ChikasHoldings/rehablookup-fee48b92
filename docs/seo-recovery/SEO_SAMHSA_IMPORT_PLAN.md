# SAMHSA Facility Data: Validation Summary and Staged Import Plan

Phase 1 deliverable, 2026-11-23. **Status: investigation and preparation only. No staged record has been published, and no facility row has been changed.** The owner approved investigating, cleaning and preparing this data; publishing it is not approved.

> **DEFERRED by the owner (2026-11-23).** "We will get back to it when we have fully fixed all the other issues that are wrong with the platform." Nothing in this plan is to be started until the owner reopens it. The summary the owner wants kept on record:
>
> * **Usable records:** 7,434 new facilities, about 7,300 after dedupe; 454 need manual review.
> * **Impact:** cities with 3 or more listings would go from 322 to 1,075.
> * **Caveats:** the scrape looks incomplete (14,726 rows against about 22,106 facilities per HHS-OIG). It cannot tell us whether a facility has closed. HHS-OIG found errors at 66 of 100 sampled facilities in this source.
> * **Plan when reopened:** re-scrape, keep provenance per field, run a 1–2 state pilot, roll back by batch (§5).
>
> Because the staged data was scraped on 2026-05-14, every count above must be re-measured after the re-scrape; they are not to be reused as-is.

* Full validation report, with every SQL query: `SEO_SAMHSA_VALIDATION_APPENDIX.md`. That analysis was read-only and covered 37 query blocks.
* Independent spot-checks I re-ran myself all matched: 674 rows have the literal website `https://`, 1,420 phones with extensions have a NULL `normalized_phone`, and 1,320 rows have no latitude/longitude.

---

## 1. What the staged data is

| Question | Answer (evidence in the appendix) |
|---|---|
| Source | The SAMHSA FindTreatment.gov locator export (`locator/exportsAsJson/v2`): the same 16 payload keys and facet codes as the SAMHSA API guide v1.12. `insurance` holds the payment facets split out of `services`. |
| Dataset date | Scraped once, 2026-05-14 (14:39–23:13 UTC). FindTreatment.gov is fed by the annual N-SUMHSS survey, and facilities can update or opt out. |
| Completeness | **Probably partial.** There are 14,726 rows, against HHS-OIG's count of 22,106 listed facilities in 2023. Some states are very thin (CT 14, VT 6, SD 5, MO 23, WA 27, VA 29), and the row index caps at 2,000, the API page maximum. A re-scrape is needed before publishing. |
| Identifiers | `source_id` is a hash, not a SAMHSA facility ID, so `facilities.samhsa_facility_id` cannot be back-filled from this data. |
| Closure / operating status | **The data cannot show closure.** No field describes operating status. |
| Accuracy caveat | HHS-OIG (2025) found inaccurate information at **66 of 100** sampled FindTreatment.gov facilities (as of April 2023). |
| Reuse terms | No FindTreatment.gov-specific licence was found. SAMHSA describes samhsa.gov content as public domain unless noted, and appreciates citation; logos are excluded. That page returned 403 to the validator, so the wording needs a manual check by the owner before relying on it. Recommended credit line: *"Source: SAMHSA FindTreatment.gov (N-SUMHSS), retrieved 2026-05-14. Listing in this directory is not an endorsement."* |

## 2. Counts

| Measure | Count |
|---|---:|
| Staged rows | 14,726 |
| Distinct entities (one `match_key`; keyless rows count individually) | 14,133 |
| Entities matching a **live** facility (phone+state, name+ZIP, or street+ZIP) | 4,213 (4,217 counting cluster links) |
| Live facilities with **no** staged match | 465 (458 labelled `samhsa_import` came from state-licence/CARF clusters, so that label is inaccurate) |
| Entities matching nothing live | 9,916 |
| …of which list "Substance use treatment" | 7,783 (1,460 are co-occurring-only mental health, 651 mental-health only) |
| **Usable new SUD facilities** (SUD care listed, 5-digit ZIP, real street, city, 50 states + DC, 10-digit phone) | **7,434** |
| …after collapsing about 130 residual name+ZIP near-duplicates | **about 7,300** |
| Needs review (phone matches a live facility in a different ZIP; could be a separate site sharing an intake line) | 454 |
| Usable with lat/long / with lat/long and website | 7,137 / 6,674 |
| Territories (PR/GU) | 3 |

**What the expansion would do (if fully published):**

* Live listings would go from 3,796 to about 11,230.
* Cities with at least 3 facilities would go from 322 to 1,075, and those with at least 5 from 106 to 503.
* 1,900 cities would get their first listing.
* The largest state gains would be FL +455, NY +532, OH +421, IL +398 and CA +387. Full table: appendix §8.

## 3. Facets available, and what the current import throws away

Among the 7,434 usable records:

| Facet | Count | Current import |
|---|---:|---|
| OTP / methadone | 576 | lost (only a generic "MAT" tag) |
| Buprenorphine | 3,264 | lost |
| Residential or hospital inpatient | 1,638 | lost (no setting tag) |
| Detox | 1,048 | partly ("Detoxification") |
| Spanish-language services | 1,765 | lost |
| Sliding fee / payment assistance | 3,338 | kept as one tag |
| Sex accepted (both / male only / female only) | 4,820 / 224 / 162 | partly (`gender_served`) |
| Special programs/groups (veterans, adolescents, LGBTQ+, pregnant/postpartum, criminal-justice clients …) | present on most records | lost |
| Age groups, public/private operation, pharmacotherapies, licence/certification/accreditation | present | partly |

## 4. Data-quality problems to fix before any publication

1. 1,420 phones with an extension have a NULL `normalized_phone` because the normalizer drops them. Fix the normalizer and re-key.
2. 674 websites are the literal `https://`. Treat them as missing.
3. 714 streets are empty or `- - -`, and 153 are PO boxes. These are not publishable as street addresses.
4. 1,320 rows have no lat/long. They need geocoding or no distance features.
5. 412 web domains cover more than 5 facilities each (va.gov 201). These are parent-organization sites; do not use them as a dedupe key.
6. `name1` is truncated at 38 characters on 295 rows, with the remainder in `name2`. Join them. The same defect explains live names like "Northcare Addiction and Recovery Prog".
7. `type_facility` is NULL on every row.
8. Among matched pairs, the phone differs for 328 live facilities and the website for 293. These are conflicts that need a resolution rule (§5.3).

## 5. Staged import plan (for owner approval; nothing executed)

### 5.1 Pipeline stages
1. **Re-scrape** FindTreatment.gov with pagination beyond 2,000 rows per query, store the scrape date per row, and keep the raw payload.
2. **Normalize** (a pure function with unit tests, no DB writes): phone with extension, name1+name2 join, address validity, ZIP5, state code, website (empty → NULL), and lat/long.
3. **Facet mapping** into structured, queryable fields instead of free-text tags. Proposed tables:
   * `facility_care_settings`: outpatient / IOP / PHP / residential / hospital inpatient / detox (setting).
   * `facility_medications`: methadone (OTP), buprenorphine, naltrexone, plus a "prescribes on site" flag.
   * `facility_populations`: SAMHSA special-programs codes.
   * `facility_languages`
   * `facility_payment`: Medicaid, Medicare, TRICARE, private insurance, self-pay, sliding fee, payment assistance.

   Each row carries `source` (`samhsa_findtreatment`), `source_record_id`, `observed_at` and `verification_state` (`reported` | `provider_confirmed` | `rehablookup_verified`).
4. **Dedupe and match** against live facilities on phone+state, name+ZIP and street+ZIP, with a review queue for the 454 "same phone, different ZIP" cases and the roughly 130 name+ZIP near-duplicates. Matches *update facets* on existing listings. They must never create a second listing.
5. **Quality gate** before any record becomes public: a real street address, a phone, SUD care listed, a valid state/city, not a duplicate, and (recommended) a phone or website reachability check. This responds to the HHS-OIG accuracy finding.
6. **Controlled publication**:
   * Publish in batches by state (suggested pilot: 1–2 states), each batch keyed by a `publication_batch_id`.
   * Add the listings to state and city directories only. **No new URL families** are created by the import.
   * Facility profile pages are generated only for records that pass the gate.
7. **Rollback**: every published row carries its `publication_batch_id`. Rolling back sets `status='pending'` for the batch, so the next build drops the profiles and listings and no data is deleted. Matched-facility facet updates are written to a side table with the previous values for restore.

### 5.2 Field-level provenance rules (display)
* Facility-reported via SAMHSA → shown as "reported to SAMHSA (as of {date})".
* Provider-entered on a claimed listing → "provided by the facility".
* RehabLookup-verified → shown only when a verification record exists (method, date, staff). No such process exists yet, and none should be implied.

### 5.3 Conflict rule (staged vs live)
* A claimed listing's provider-entered value wins.
* Otherwise the newer SAMHSA observation wins.
* Every overwrite keeps the old value in a history table.

### 5.4 What the expansion enables, and what it does not
* It makes the **existing** state and city directories materially more useful (§2). That is the core fix for F-11.
* It enables data-backed facet sections (e.g. "methadone / OTP providers in {state}", "Spanish-language services") **only where counts meet the thresholds** in `SEO_CONTENT_ROADMAP.md` §2.3.
* It does **not** justify bringing back the removed specialty×city families (luxury, Christian, couples, substance-specific), because the data has no such attributes.

## 6. Decisions needed from the owner
1. Approve a fresh, complete re-scrape (or an official data request to SAMHSA) before any publication.
2. Approve the facet schema (§5.1.3) as a migration. This is additive, with no existing columns changed.
3. Choose the pilot state(s), and decide whether a reachability check (phone or website) is required before publication.
4. Confirm the attribution and disclaimer wording (§1).
