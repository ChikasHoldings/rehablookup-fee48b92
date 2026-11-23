# SAMHSA staged-data validation (`public.staged_samhsa`)

- Project: Supabase `mldbxpntzcjalgjmwnqa`. Queries run on 2026-11-23.
- Access was read-only. Only `SELECT` statements were run: no writes, DDL, migrations or edge-function calls.
- Every number below comes from the SQL in this file. The appendix holds the full text of each query.
- Query results are untrusted data. Facility names quoted below are examples copied from the data.

## Definitions used throughout

| Term | Definition |
|---|---|
| **Entity** | One distinct `match_key`. The 62 staged rows whose `match_key` is NULL each count as their own entity (`'row:'||id`). That gives 14,071 + 62 = **14,133 entities**. |
| **ph** | The digits of the phone number before any `x` extension, keeping the last 10. NULL if fewer than 10 digits. Computed the same way for staged and live rows. The pipeline's `normalized_phone` is **not** used, because it is NULL for every phone that has an extension (see section 6). |
| **z5** | The first 5 digits of the ZIP code. |
| **addr** | The street normalized by one expression applied to both sides: lower-cased, text after the first comma removed, punctuation removed, suite/unit/apt/room/bldg/floor suffix removed, compass words and common street types abbreviated (north→n, street→st, avenue→ave, and so on), spaces collapsed. |
| **State mapping** | Live `facilities.state` stores full names ("Louisiana"). Staged `state` stores 2-letter codes. A VALUES table maps between them, and all 3,810 live rows map. |
| **Name match** | `lower(trim(name))`. A second variant (b2) also tries `name1 || ' - ' || name2`, because some live names follow that pattern (for example "Beacon Center - Beacon Center Op 3"). |
| **Match to live** | An entity matches if any of its rows satisfies (a) ph + state, or (b/b2) name + z5, or (c) addr + z5, or the cluster link (`staged.cluster_id → facility_match_clusters.promoted_to_facility_id → facilities.id`). |
| **Usable new SUD facility** | An entity that matches no live facility, and has at least one row where Type of Care (`TC`) includes "Substance use treatment", z5 is 5 digits, the normalized street (`addr`) is not NULL (which excludes empty and `- - -` streets), the city is non-empty, the state is one of the 50 states or DC, and ph is not NULL. Website and lat/long are **not** required. Counts with those also required are given separately. |
| **Live baseline (sections 8–9)** | Public live facilities: `status='approved' and not coalesce(suspended,false)`. That is **3,796** rows. |

---

## 1. Provenance

**Raw payload keys (Q1.1).** Every one of the 14,726 rows has the same 16 top-level keys: `_irow, name1, name2, street1, street2, city, state, zip, phone, intake1, hotline1, website, latitude, longitude, typeFacility, services`. Three sampled payloads (Q1.2) contain, for example, `name1`="Adair Acute Care at" with `name2`="Osawatomie State Hospital" and `typeFacility`="MH". The `services` arrays have 16, 17 and 13 items, and each item has the form `{f1,f2,f3}`.

**Source: FindTreatment.gov locator export.** The payload follows the documented response of `https://findtreatment.gov/locator/exportsAsJson/v2` (SAMHSA *FindTreatment.gov API Documentation*, v1.12, Aug 17 2026, Appendix C). That response returns `rows[]` with `_irow, name1, name2, street1, street2, city, state, zip, phone, type_facility, intake1, hotline1, website, latitude, longitude, miles, services[{f1,f2,f3}]`. The staged payload differs in two small ways: it spells `typeFacility` in camelCase, and it has no `miles` key. The `f2` facet codes (TC, SET, PAY, PYAS, SG, SL, AGE, FOP and others) are the locator's codes. Facet catalog: Q1.4.
- The staged `insurance` column holds the `PAY` and `PYAS` facets moved out of `raw_payload.services`. The item counts add up: 279,122 services items + 21,136 insurance items = 300,258 raw items.
- `source_id` has the form `samhsa:<16 hex chars>` and is unique (14,726 distinct values). It is a hash. **The export carries no SAMHSA facility ID**, so `facilities.samhsa_facility_id` cannot be filled from this data.
- `typeFacility`: SA = 9,210, MH = 5,516. The column **`type_facility` is NULL in all rows** because it was never filled from the raw field.

**Scrape date range (Q1.3).** `scraped_at` runs from 2026-05-14 14:39:52 UTC to 2026-05-14 23:13:06 UTC, a single day of about 8.5 hours. `created_at` falls on the same day. The latest `updated_at` is 2026-05-14 23:39:33, the exact `created_at` of every `facility_match_clusters` row. No row has a `rejection_reason`, and `status` is 'staged' for all rows.

**Completeness signals. The data cannot prove whether the pull is complete.**
- `_irow` runs from 1 to 2000, and the API's documented maximum `pageSize` is 2000. `_irow=1` appears 12 times, and the number of rows per `_irow` value falls as the value rises (Q1.6). This fits several overlapping result pages, deduplicated by `source_id`. One row has `_irow=2000`, so at least one page came back full. Later pages for that query may not have been fetched; the data cannot confirm this either way.
- 14,726 staged rows compares with the **22,106 facilities** that HHS-OIG reported as listed on FindTreatment.gov as of April 2023. Some states have very few staged rows: CT 14, VT 6, SD 5, MO 23, WA 27, WI 27, VA 29, MN 40. By contrast ID has 232 and ME 172 (Q1.7). **This pattern is consistent with a partial pull. Treat state coverage as uneven.**

## 2. Duplicates within staged

| Check | Result |
|---|---|
| Rows / distinct non-null `match_key` / NULL `match_key` rows | 14,726 / **14,071** / **62** |
| `match_key` formats | `p:+1NXXNXXXXXX|ST|ZIP` on 13,305 rows; `a:<normalized street>|ST|ZIP` on 1,359 rows |
| `match_key` values with more than one row | **481** keys covering 1,074 rows, so **593 surplus rows**. Up to 10 rows share one key. |
| …of those 481 keys | 160 mix SA and MH listings. 305 contain more than one distinct normalized street: either separate sites that share one phone (for example YMCA of Honolulu school sites, or Center for Life Management at two addresses) or spelling variants ("4316 Washington Avenue" vs "Street"). 261 contain different `name1` values, and 144 share `name1` but differ in `name2`. Only 7 have identical name, name2 and street. |
| Exact duplicate `source_id` | **0** |
| Identical `raw_payload`, with or without `_irow` | **0** |
| `normalized_phone`+`normalized_zip` groups with more than one row | 450 groups (1,011 rows). All fall within one `match_key`, which is by construction. |
| `normalized_name`+`normalized_zip` groups with more than one row | 623 groups (1,414 rows). **395 groups (900 rows) span more than one `match_key`.** These are near-duplicates that `match_key` does not merge, typically SA and MH listings with different phones. |
| `normalized_street`+`normalized_zip` groups spanning more than one `match_key` | 283 groups (606 rows) |
| name+street+zip groups spanning more than one `match_key` | 9 groups (18 rows). These are near-certain duplicates, split because a phone extension sends one copy to an `a:` key. |
| Distinct (`match_key`, `normalized_street`) pairs | 14,556 |

The 62 NULL `match_key` rows all have a phone with an extension, so `normalized_phone` is NULL, and an empty street, so there is no `a:` key either.

## 3. Matches to existing live facilities

Results are given at row level (14,726 rows) and entity level (14,133 entities). Queries: Q3.1, Q3.2, Q3.3.

| Rule | Staged rows | Entities |
|---|---:|---:|
| (a) ph + same state | 4,208 | 3,985 |
| (b) `lower(trim(name))` + z5 | 1,686 | 1,648 |
| (b2) `name1 - name2` + z5 | 893 | 881 |
| (b or b2) | — | 1,676 |
| (c) normalized street + z5 | 2,975 | 2,937 |
| **(a ∪ b ∪ c)** | **4,438** | **4,213** (= **4,201 distinct match_keys** + 12 NULL-key rows) |
| Cluster link (`cluster_id → promoted_to_facility_id`) | 3,485 | 3,299 |
| **Union including cluster** | **4,442** | **4,217** (4,205 match_keys + 12). Only 4 entities match through the cluster link alone. |
| Matched only by (a) | — | 569 |
| Matched only by (b/b2) | — | 59 |
| Matched only by (c) | — | 158 |

Rule (a) is the loosest. Of the entities matched only by phone + state, **534 match live rows only in a different ZIP**, with no name, street or cluster match (Q4.2). **454** of those 534 would otherwise qualify as usable SUD facilities. They may be separate sites that share a central intake number, and should be reviewed rather than auto-merged.

**Live side (Q3.2), 3,810 live rows**

| Live rows | Count |
|---|---:|
| Matched by (a) | 3,235 |
| Matched by (a) with the same z5 | 3,215 |
| Matched by (b/b2) | 1,598 |
| Matched by (c) | 2,867 |
| Matched by any rule | **3,345** |
| **No staged match** | **465** (459 `samhsa_import`, 3 `admin_created`, 3 `self_listed`) |

Of the 459 unmatched `samhsa_import` rows, **458 were promoted through `facility_match_clusters` clusters with `samhsa_count=0`**. Those clusters' `match_signals.sources` contain state licensing lists for all 458, and CARF for 407 (Q3.4). So these rows came from `staged_directory`, not from this SAMHSA pull, and their `data_source='samhsa_import'` label is misleading. One unmatched `samhsa_import` row has no cluster.

**`facility_match_clusters` (Q3.5)**
- 5,853 clusters, all created at 2026-05-14 23:39:33.
- Every cluster has `directory_count>0`. `staged_directory` has 42,949 rows; `staged_leads` has 0.
- 3,549 clusters contain SAMHSA rows, and their `samhsa_count` sums to 3,763, which is exactly the number of staged rows with a `cluster_id`. The other 10,963 staged rows matched no directory record, so they have no cluster.
- By decision: superseded 3,766 (3,124 with SAMHSA rows); promoted 266 (188 with SAMHSA rows, 13 of which have no `promoted_to_facility_id`); admin_review 1,821 (237 with SAMHSA rows).
- `match_tier` is `phone_state_zip` for all clusters except 20, which are `address_state_zip`.
- 3,788 live rows are the `promoted_to_facility_id` of some cluster, and 3,117 of those clusters contain SAMHSA rows.

## 4. Genuinely new candidates

Unmatched entities: 14,133 − 4,217 = **9,916** (Q4.1).

| Attribute (at least one row of the entity has it) | Entities |
|---|---:|
| Valid 5-digit zip | 9,916 |
| Non-empty street (normalized `addr` not NULL, which excludes the `- - -` placeholder) | 9,393 |
| Non-empty city | 9,916 |
| State in 50 + DC | 9,913 |
| PR / territories | **3** (all PR and GU rows in the stage: PR 2, GU 1) |
| Phone with at least 10 digits | 9,915 |
| Website (domain parsed) | 9,313 |
| Latitude/longitude | 8,993 |
| Type of Care includes "Substance use treatment" | **7,783** |
| …or Detoxification / Transitional housing | 7,805 |
| MH listing with co-occurring treatment only (no SU) | 1,460 |
| Mental-health only | 651 |
| Has an SA listing (`typeFacility`) | 5,425 |
| MH listing only | 4,491 |

Type of Care values across all rows: Substance use treatment 12,372 (9,176 SA + 3,196 MH listings); co-occurring SMI/SED 10,020; Mental health treatment 5,516 (all MH); Detoxification 1,831; Transitional housing 810 (Q4.3).

**Usable new SUD facilities = 7,434 entities**, using the criteria in the Definitions table.
- With lat/long also required: 7,137. With lat/long and website: 6,674.
- If Detox or Transitional housing also count as SUD: 7,455.
- **Possible remaining duplicates within the 7,434** (Q8.1). Collapsing by name+z5 leaves 7,306 (128 fewer). Collapsing by street+z5 leaves 7,327 (107 fewer). **A conservative estimate is about 7,300 net-new usable SUD sites.** A further 454 sites need review: those that match live only by phone + state in a different ZIP.

## 5. Facet coverage

"All staged" counts rows (n = 14,726). "New" counts unmatched entities (n = 9,916). "Usable" counts usable new SUD entities (n = 7,434). An entity has a facet value if any of its rows has it. Queries: Q5.1–Q5.5.

**Facet presence**

| Facet (f2) | All staged | % | New | % | Usable | % |
|---|---:|---:|---:|---:|---:|---:|
| Type of Care (TC) | 14,726 | 100.0 | 9,916 | 100.0 | 7,434 | 100.0 |
| Facility Operation (FOP) | 14,716 | 99.9 | 9,907 | 99.9 | 7,427 | 99.9 |
| Service Setting (SET) | 14,711 | 99.9 | 9,904 | 99.9 | 7,425 | 99.9 |
| Age Groups (AGE) | 14,711 | 99.9 | 9,906 | 99.9 | 7,424 | 99.9 |
| Payment Accepted (PAY) | 14,694 | 99.8 | 9,890 | 99.7 | 7,417 | 99.8 |
| Special Programs/Groups (SG) | 12,433 | 84.4 | 8,274 | 83.4 | 6,179 | 83.1 |
| Pharmacotherapies (PHR) | 10,926 | 74.2 | 7,246 | 73.1 | 5,655 | 76.1 |
| License/Cert/Accreditation (LCA) | 10,051 | 68.3 | 6,172 | 62.2 | 5,606 | 75.4 |
| Sex Accepted (SN) | 9,210 | 62.5 | 5,425 | 54.7 | 5,203 | 70.0 |
| Type of Opioid Treatment (OT) | 9,189 | 62.4 | 5,415 | 54.6 | 5,194 | 69.9 |
| Language Services (SL) | 6,721 | 45.6 | 4,360 | 44.0 | 3,617 | 48.7 |
| Opioid Medications (OM) | 6,560 | 44.5 | 3,786 | 38.2 | 3,634 | 48.9 |
| Payment Assistance (PYAS) | 6,442 | 43.7 | 4,143 | 41.8 | 3,338 | 44.9 |
| Detoxification Services (DETOX) | 1,809 | 12.3 | 1,103 | 11.1 | 1,048 | 14.1 |

**Sex Accepted (SN)** appears on exactly the 9,210 SA rows, and every one of the 5,516 MH rows lacks it (Q5.5). On an MH listing, a missing SN therefore means "not reported", not "neither sex". OT (9,189 rows) and AUT (9,208 rows) have similar counts, which suggests they are also SA-only facets, but this was not checked row by row. The other facets present are SMP, FVP, TAP, AS, ASPT, ECS, RSS, SCR, TRSRV, SMAT, OMSC, FT, OTHR, EMS, EXCL, MSRV, OL and HOSP; Q5.1 has their counts.

**Derived flags**

| Flag | All staged rows | Usable new entities |
|---|---:|---:|
| Federally-certified OTP | 1,231 | 576 |
| Methadone (maintenance, detox, or "Methadone used in Treatment") | 1,177 | 544 |
| OTP or methadone | 1,231 | 576 |
| Buprenorphine (any OT/OM buprenorphine value) | 5,863 | 3,264 |
| Service Setting contains "residential" | 2,854 | 1,231 |
| Service Setting contains "Hospital inpatient" | 1,181 | 668 |
| **Residential or hospital inpatient** | **3,577** | **1,638** |
| Has DETOX facet | 1,809 | 1,048 |
| DETOX facet or Type of Care Detoxification | 1,831 | 1,058 |
| Spanish (SL) | 3,546 | 1,765 |
| Sliding fee scale | 5,483 | 2,872 |
| Payment assistance | 3,305 | 1,675 |
| Sliding fee or payment assistance | 6,442 | 3,338 |
| FOP private (for-profit + non-profit) | 13,252 | 6,602 |
| FOP government (any level, including VA, DoD, IHS, tribal) | 1,464 | 825 |
| VA or DoD | 274 | 240 |
| Sex: both / male only / female only (Q5.5) | 8,313 / 495 / 402 | 4,820 / 224 / 162 |

**Value counts (Q5.2, Q5.3)**

| Facet | Value | All rows | New | Usable |
|---|---|---:|---:|---:|
| SET | Outpatient | 12,357 | 8,345 | 6,488 |
| SET | Regular outpatient treatment | 7,284 | 4,388 | 4,280 |
| SET | Outpatient methadone/buprenorphine or naltrexone treatment | 4,761 | 2,767 | 2,719 |
| SET | Intensive outpatient treatment | 4,114 | 2,375 | 2,310 |
| SET | Residential/24-hour residential | 2,854 | 1,729 | 1,231 |
| SET | Long-term residential | 1,489 | 774 | 692 |
| SET | Short-term residential | 1,398 | 728 | 665 |
| SET | Outpatient day treatment or partial hospitalization | 1,393 | 857 | 830 |
| SET | Hospital inpatient/24-hour hospital inpatient | 1,181 | 974 | 668 |
| SET | Outpatient detoxification | 932 | 556 | 550 |
| SET | Partial hospitalization/day treatment | 883 | 726 | 433 |
| SET | Residential detoxification | 806 | 458 | 413 |
| SET | Hospital inpatient treatment | 506 | 355 | 340 |
| SET | Hospital inpatient detoxification | 463 | 349 | 328 |
| OT | Accepts clients using MAT but prescribed elsewhere | 5,707 | 3,341 | 3,189 |
| OT | Prescribes buprenorphine | 4,947 | 2,945 | 2,829 |
| OT | Prescribes naltrexone | 4,635 | 2,802 | 2,694 |
| OT | Buprenorphine maintenance | 4,341 | 2,511 | 2,428 |
| OT | Lofexidine or Clonidine detoxification | 3,724 | 2,394 | 2,289 |
| OT | Relapse prevention with naltrexone | 3,575 | 2,198 | 2,129 |
| OT | Maintenance service with medically supervised withdrawal after stabilization | 2,737 | 1,588 | 1,542 |
| OT | Buprenorphine detoxification | 1,290 | 803 | 765 |
| OT | Federally-certified Opioid Treatment Program | 1,231 | 582 | 576 |
| OT | Methadone maintenance | 1,128 | 525 | 521 |
| OT | Does not treat opioid use disorders | 572 | 444 | 416 |
| OT | Methadone detoxification | 337 | 189 | 187 |
| OT | Does not use MAT for opioid use disorders | 336 | 206 | 198 |
| OT | Use methadone/buprenorphine for pain management or emergency dosing | 165 | 122 | 115 |
| OM | Buprenorphine used in Treatment | 5,863 | 3,404 | 3,264 |
| OM | Naltrexone used in Treatment | 5,476 | 3,287 | 3,153 |
| OM | Methadone used in Treatment | 1,177 | 549 | 544 |
| DETOX | Opioids detoxification | 1,773 | 1,074 | 1,019 |
| DETOX | Medication routinely used during detoxification | 1,702 | 1,044 | 997 |
| DETOX | Alcohol Detoxification | 1,409 | 914 | 860 |
| DETOX | Benzodiazepines Detoxification | 1,341 | 878 | 828 |
| DETOX | Methamphetamines detoxification | 1,219 | 789 | 739 |
| DETOX | Cocaine Detoxification | 1,213 | 783 | 735 |
| AGE | Adults | 14,567 | 9,826 | 7,382 |
| AGE | Young Adults | 14,129 | 9,445 | 7,267 |
| AGE | Seniors | 13,304 | 8,808 | 6,981 |
| AGE | Children/Adolescents | 7,556 | 5,425 | 3,774 |
| SN | Male | 8,808 | 5,229 | 5,044 |
| SN | Female | 8,715 | 5,183 | 4,982 |
| FOP | Private non-profit organization | 7,371 | 4,763 | 3,395 |
| FOP | Private for-profit organization | 5,881 | 3,974 | 3,214 |
| FOP | Local, county, or community government | 613 | 437 | 285 |
| FOP | State government | 487 | 397 | 237 |
| FOP | Federal Government | 287 | 282 | 250 |
| FOP | U.S. Department of Veterans Affairs | 265 | 262 | 231 |
| FOP | Tribal government | 77 | 63 | 55 |
| FOP | Department of Defense | 9 | 9 | 9 |
| FOP | Indian Health Services | 8 | 6 | 5 |
| SL | Sign language services for the deaf and hard of hearing | 4,583 | 2,860 | 2,576 |
| SL | **Spanish** | **3,546** | **2,426** | **1,765** |
| SL | Other languages (excluding Spanish) | 958 | 720 | 492 |
| SL | American Indian or Alaska Native languages | 61 | 42 | 33 |
| PAY | Cash or self-payment | 13,319 | 8,881 | 6,833 |
| PAY | Medicaid | 12,008 | 7,921 | 5,833 |
| PAY | Private health insurance | 11,979 | 8,080 | 6,115 |
| PAY | Medicare | 8,647 | 5,899 | 4,482 |
| PAY | State-financed health insurance plan other than Medicaid | 7,837 | 5,201 | 3,969 |
| PAY | Federal military insurance (e.g., TRICARE) | 7,086 | 4,887 | 3,863 |
| PAY | Federal, or any government funding for substance use treatment programs | 4,786 | 2,568 | 2,469 |
| PAY | SAMHSA funding/block grants | 2,960 | 1,547 | 1,499 |
| PAY | State mental health agency (or equivalent) funds | 2,204 | 1,837 | 872 |
| PAY | County or local government funds | 1,924 | 1,584 | 702 |
| PAY | State welfare or child and family services funds | 1,613 | 1,337 | 619 |
| PAY | Other State funds | 1,539 | 1,255 | 617 |
| PAY | IHS/Tribal/Urban (ITU) funds | 1,385 | 1,004 | 824 |
| PAY | Community Mental Health Block Grants | 1,292 | 1,004 | 495 |
| PAY | U.S. Department of VA funds | 1,102 | 949 | 548 |
| PAY | State corrections or juvenile justice funds | 1,073 | 885 | 452 |
| PAY | Community Service Block Grants | 790 | 607 | 320 |
| PAY | State education agency funds | 637 | 545 | 249 |
| PAY | Private or Community foundation | 313 | 254 | 116 |
| PAY | Federal Grants | 155 | 115 | 66 |
| PAY | No payment accepted | 139 | 92 | 81 |
| PYAS | Sliding fee scale (fee is based on income and other factors) | 5,483 | 3,512 | 2,872 |
| PYAS | Payment assistance (check with facility for details) | 3,305 | 2,115 | 1,675 |

**Special Programs/Groups: top 15**

| Value | All rows | New | Usable |
|---|---:|---:|---:|
| Clients with co-occurring mental and substance use disorders | 9,184 | 5,981 | 4,968 |
| Clients who have experienced trauma | 8,387 | 5,590 | 4,170 |
| Criminal justice (other than DUI/DWI)/Forensic clients | 6,142 | 3,855 | 3,189 |
| Young adults | 5,940 | 4,035 | 3,040 |
| Seniors or older adults | 5,706 | 3,934 | 3,027 |
| Adult women | 5,361 | 3,130 | 2,989 |
| Adult men | 5,313 | 3,127 | 3,004 |
| Veterans | 5,071 | 3,390 | 2,795 |
| Clients who have experienced intimate partner violence, domestic violence | 4,648 | 2,885 | 2,517 |
| Clients with HIV or AIDS | 4,047 | 2,598 | 2,220 |
| Members of military families | 3,889 | 2,650 | 2,108 |
| Clients who have experienced sexual abuse | 3,814 | 2,204 | 2,091 |
| Pregnant/postpartum women | 3,498 | 1,975 | 1,899 |
| Active duty military | 3,343 | 2,249 | 1,888 |
| Clients with co-occurring pain and substance use disorders | 3,331 | 1,983 | 1,894 |

## 6. Data quality and conflicts

**Field checks (all staged rows)**

| Check | Rows |
|---|---:|
| Phone empty | 0 |
| Phone with fewer than 10 digits | 1 ("304-525-") |
| Phone with an `x` extension | **1,420**. `normalized_phone` is NULL for all 1,420, so 1,421 rows have NULL `normalized_phone` in total. This is a normalizer bug: those rows fall back to `a:` keys or get a NULL key. |
| Website missing | **675**: 674 are the literal placeholder `https://` and 1 is malformed (`https://www/…`). `website_domain` is NULL for these 675. |
| Intake phone present | 4,565 |
| Hotline phone present | 0 |
| Street empty | 688. All 688 also lack lat/long. Another **26** rows have the placeholder street `- - -`; those 26 do have lat/long. So **714** rows have no usable street, and the normalized `addr` is NULL for exactly these 714 (Q6.5). |
| Lat/long NULL | 1,320 |
| PO box street (regex) | 153 (all `P.O. Box …` in street1) |

**Domains shared by more than 5 entities: 412 domains, covering 4,675 entities (4,866 rows).** Likely parent organizations. Top 25 (entities): va.gov 201, ctcprograms.com 96, joingroups.com 72, newseason.com 64, centerstone.org 62, pinnacletreatment.com 61, omh.ny.gov 59, bhgrecovery.com 58, communitymedicalservices.org 55, sperohealth.com 49, cleanslatecenters.com 49, brightviewhealth.com 41, arisahealth.org 41, mtcomp.org 36, medmark.com 35, daymarkrecovery.org 32, clarvida.com 31, rosecrance.org 29, crossroadstreatmentcenters.com 25, lifestance.com 25, healthconnectamerica.com 24, careclinicmd.com 22, baartprograms.com 22, nychealthandhospitals.org 22, unitypoint.org 22.

**Truncation and splitting in names (Q6.2)**
- `name1` is a fixed field of at most 38 characters; 439 rows are exactly 38. Source abbreviations appear, such as "Behavioral Hlth Dept", "Alc", "Csl" and "Dev".
- **295 names end in a dangling connector** (and, of, at, for, &, `-`, `,`, `/` and others). All 295 continue in `name2`: for example "Adair Acute Care at" + "Osawatomie State Hospital", and "Jewish Family Services of" + "Middlesex County".
- `name2` is sometimes a continuation like these and sometimes a site or program label ("Covington Location", "Building 4"), so display names need a join rule.
- 0 names end in an ellipsis.

**Conflicts where staged and live match (Q6.3)**

Matched pairs: 4,613, covering 4,442 staged rows and 3,345 live rows.

| Conflict | Pairs | Distinct live facilities |
|---|---:|---:|
| Phone differs, where the pair matched by name, street or cluster | 392 | **328** |
| Website domain differs (both present) | 354 | **293** |
| Live has no website but staged has one | — | 14 |
| Street differs, where the pair matched by phone | 1,274 | 714 |
| Phone + state match but z5 differs | 804 | 352 |
| Cluster-linked pairs: phone / website / street differ | 0 / 144 / 683 (of 3,485 pairs) | — |

The `facility_match_clusters.conflicts` flags on the 3,549 clusters with SAMHSA rows cover all sources in each cluster, not just staged vs live: `multiple_names` 3,431, `multiple_phones` 897, `multiple_streets` 2,356, `multiple_websites` 828 (Q6.4).

## 7. Closed or inactive facilities

**This data cannot show whether a facility has closed.**
- None of the 16 raw payload keys describes operating status.
- `status` is the pipeline state ('staged' for all rows), and `rejection_reason` is NULL for all rows.
- A keyword search for closed, inactive, defunct and similar words found 0 real hits. The one hit is a false positive, the organization name "No Longer Bound" (Q7.1).
- All we can say is that each facility was listed on FindTreatment.gov when it was scraped on 2026-05-14.
- `staged_directory` does carry `accreditation_status` values: closed 84, inactive 2, licensee not renewing 1, expired 1, plus historical-2018 892, unknown 647 and listed 164. However, **none** of the 3,763 clustered staged rows shares a cluster with a closed or inactive directory record. Of those 3,763 rows, 303 share a cluster with historical-2018, unknown or listed records, and 13 with an expired `expiry_date` (Q7.2–Q7.4).
- HHS-OIG found that 66 of 100 sampled FindTreatment.gov facilities had some inaccurate information as of April 2023. Phone or address checks before publishing are advisable.

## 8. Per-state impact

Top 15 states by public live count. Columns are public live, plus usable new SUD entities (Q8.1).

| State | Live (public) | + usable new | Live + new | % increase |
|---|---:|---:|---:|---:|
| CA | 402 | 387 | 789 | 96% |
| PA | 274 | 221 | 495 | 81% |
| NY | 235 | 532 | 767 | 226% |
| OH | 206 | 421 | 627 | 204% |
| TX | 177 | 321 | 498 | 181% |
| MD | 175 | 260 | 435 | 149% |
| NC | 175 | 247 | 422 | 141% |
| MI | 142 | 245 | 387 | 173% |
| IL | 139 | 398 | 537 | 286% |
| KY | 131 | 289 | 420 | 221% |
| FL | 120 | 455 | 575 | 379% |
| GA | 115 | 186 | 301 | 162% |
| AZ | 111 | 305 | 416 | 275% |
| NJ | 108 | 251 | 359 | 232% |
| IN | 91 | 297 | 388 | 326% |

Ranked by combined total instead, TN (85 + 256 = 341) enters the top 15 and GA drops out. National totals: 3,796 public live + 7,434 usable new = 11,230.

## 9. City impact

Cities are keyed by `lower(trim(city))` + state. The baseline is public live facilities (Q8.1).

| Metric | Value |
|---|---:|
| Cities with ≥1 live facility | 2,030 |
| Cities with ≥1 facility after adding usable new | 3,930 (1,900 new cities) |
| **Cities going from <3 to ≥3** | **753** (214 of them from 0) |
| **Cities going from <5 to ≥5** | **397** (39 of them from 0) |
| Cities with ≥3 facilities, before → after | 322 → 1,075 |
| Cities with ≥5 facilities, before → after | 106 → 503 |
| Largest gains (live + new) | Chicago IL 28+91; New York NY 29+59; Phoenix AZ 30+59; Baltimore MD 62+57; Brooklyn NY 17+55; Bronx NY 10+53; Indianapolis IN 10+53; Salt Lake City UT 15+50; Las Vegas NV 20+47; Los Angeles CA 23+45 |

If the roughly 130 residual name+zip near-duplicates are collapsed, these city counts would drop slightly.

---

## 10. Reuse terms and attribution for SAMHSA FindTreatment.gov data (web research)

- **No FindTreatment.gov-specific license or terms of use was found.**
  - The API guide (v1.12) says it is meant for "the approved user" and gives no redistribution or license terms. Questions go to FindTreatment@samhsa.hhs.gov or 1-833-888-1553. Source: https://findtreatment.gov/assets/FindTreatment-Developer-Guide.pdf
  - The findtreatment.gov home page renders through JavaScript, and its footer, disclaimer and terms text could not be retrieved.
- **SAMHSA's general public-domain statement.** SAMHSA's FAQ states: "Unless noted otherwise, information posted on public websites within the 'SAMHSA.GOV' domain is considered to be 'in the public domain'". It also says SAMHSA appreciates citation of the original source, and that federal seals and logos are **not** public domain. Source: https://www.samhsa.gov/about/faqs (page returned HTTP 403 to the fetcher; wording comes from the search-engine extract and should be re-checked). Related policy page: https://www.samhsa.gov/about/laws-regulations-policies/website (also 403).
  - Note: findtreatment.gov is not a samhsa.gov hostname, so whether this statement covers it is an inference.
- **SAMHSA data terms.** SAMHSA's data terms say users agree to its Terms of Use, which include a disclaimer of responsibility for how data are used or interpreted. Source: https://www.samhsa.gov/data/about-us/terms-and-conditions
- **Legacy data.gov entry.** The old "Substance Abuse Treatment Facilities Locator" entry on data.gov is from 2012 and lists the license as ODbL 1.0 (https://opendatacommons.org/licenses/odbl/1.0/). Its description says: "All information in the Locator is completely updated each year… New facilities are added monthly. Updates to facility names, addresses, telephone numbers and services are made weekly." This entry is outdated (last complete update cited is 2012) and may not reflect current terms. Source: https://catalog.data.gov/dataset/substance-abuse-treatment-facilities-locator
- **Not an endorsement.** No current FindTreatment.gov sentence saying a listing is not an endorsement was found.
  - An archived 2009 SAMHSA locator page says SAMHSA "is not endorsing the organizations represented nor making any claim as to the accuracy and validity of the information found on their web sites". That disclaimer concerns links, not listings. Source: https://webarchive.library.unt.edu/web/20090118183142/http://findtreatment.samhsa.gov/links.htm
  - A 2013 archived FAQ says listed facilities are "licensed, certified or otherwise approved… by their State's substance abuse treatment authority". Source: https://webarchive.library.unt.edu/web/20130214161145/http:/findtreatment.samhsa.gov/faq.htm
  - KFF Health News (May 9 2022) reports "minimal vetting… requiring only that they complete a survey and be licensed in their state". Source: https://kffhealthnews.org/news/article/national-addiction-treatment-locator-has-outdated-data-and-other-critical-flaws/
  - **Recommendation (ours, not SAMHSA's wording):** show a "listing does not imply endorsement by SAMHSA/HHS" disclaimer, and do not use SAMHSA logos.
- **Data source and update cadence: N-SUMHSS.**
  - The 2026 N-SUMHSS FAQ calls it "SAMHSA's annual survey of all active substance use and mental health facilities". It says: "Facilities must complete the N-SUMHSS to be eligible to be listed on FindTreatment.gov". Facilities can opt out of listing. The facility universe comes from lists that state agencies provide. Prior-year answers are pre-filled. ICF runs the survey. Source: https://info.nsumhss.samhsa.gov/pdf/2026-nsumhss-faqs.pdf
  - Program pages: https://www.samhsa.gov/data/data-we-collect/n-sumhss-national-substance-use-and-mental-health-services-survey and https://info.nsumhss.samhsa.gov/
  - KFF (2022): SAMHSA surveys yearly and applies reported corrections weekly.
- **Accuracy.** HHS-OIG report A-09-23-01003 (Mar 19 2025):
  - As of Apr 20 2023, 66 of 100 sampled facilities had some inaccurate information.
  - OIG estimates 14,283 of the 22,106 listed facilities were affected.
  - SAMHSA relies on facilities to "report accurate information when they complete a voluntary annual survey".
  - All three recommendations are now closed as implemented.
  - Source: https://oig.hhs.gov/reports/all/2025/samhsas-findtreatmentgov-contained-some-inaccurate-information-on-substance-use-and-mental-health-treatment-facilities
- **Suggested attribution (recommendation):** "Facility data: SAMHSA FindTreatment.gov (N-SUMHSS), retrieved 2026-05-14." Show it alongside a last-verified date and a "verify with the facility" notice.

---

## Appendix: SQL

Every query below is a single read-only `SELECT`.
- **Prefix A** is the shared CTE chain `sm, s0, l0, s, l`.
- **Prefix B** is identical except that `s` and `l` are `MATERIALIZED`. It was used for the faster keyed-lookup queries. A first version of Q4.2 used `EXISTS` subqueries and timed out at 60 s. The keyed rewrite below replaced it and gives the same counts (9,916 new entities and 7,434 usable).
- Each query is printed in full, with its prefix inlined.

### Q1.1 raw_payload keys
```sql
select k, count(*) from public.staged_samhsa, jsonb_object_keys(raw_payload) k group by k order by 2 desc, 1;
```
### Q1.2 three sample payloads
```sql
select id, source_id, jsonb_pretty(raw_payload - 'services') as payload, jsonb_array_length(raw_payload->'services') n_services, (raw_payload->'services'->0) first_service, scraped_at from public.staged_samhsa order by id limit 3;
```
### Q1.3 overview, scrape range, `_irow`, item counts
```sql
select min(scraped_at) min_scraped, max(scraped_at) max_scraped, min(created_at) min_created, max(created_at) max_created, min(updated_at) min_upd, max(updated_at) max_upd, min((raw_payload->>'_irow')::int) min_irow, max((raw_payload->>'_irow')::int) max_irow, count(distinct source_id) distinct_source_id, count(*) n, count(distinct match_key) dmk, count(distinct cluster_id) dclusters, count(cluster_id) with_cluster, count(*) filter (where rejection_reason is not null) with_rej, count(distinct status) dstatus,
sum(jsonb_array_length(raw_payload->'services')) raw_svc_items, sum(jsonb_array_length(services)) svc_items, sum(jsonb_array_length(insurance)) ins_items
from public.staged_samhsa;
```
### Q1.4 facet catalog
```sql
select 'services' src, e->>'f1' f1, e->>'f2' f2, count(*) n_items, count(distinct s.id) n_rows from public.staged_samhsa s, jsonb_array_elements(s.services) e group by 1,2,3
union all
select 'insurance', e->>'f1', e->>'f2', count(*), count(distinct s.id) from public.staged_samhsa s, jsonb_array_elements(s.insurance) e group by 1,2,3
order by 1, 5 desc;
```
### Q1.5 typeFacility, and the `type_facility` column
```sql
select type_facility, raw_payload->>'typeFacility' raw_tf, count(*) from public.staged_samhsa group by 1,2 order by 3 desc;
```
### Q1.6 `_irow` distribution
```sql
select (select count(*) from public.staged_samhsa where (raw_payload->>'_irow')::int=1) irow1_count,
(select count(*) from public.staged_samhsa where (raw_payload->>'_irow')::int=2000) irow2000_count,
(select count(*) from public.staged_samhsa where (raw_payload->>'_irow')::int>1000) irow_gt1000,
(select count(*) from public.staged_samhsa where (raw_payload->>'_irow')::int between 1 and 100) irow_le100,
(select count(distinct date_trunc('minute', scraped_at)) from public.staged_samhsa) distinct_minutes,
(select count(distinct scraped_at) from public.staged_samhsa) distinct_ts;

with x as (select (raw_payload->>'_irow')::int irow, count(*) c from public.staged_samhsa group by 1)
select width_bucket(irow, 1, 2001, 10) bucket, min(irow), max(irow), count(*) distinct_irows, sum(c) rows, min(c) min_per_irow, max(c) max_per_irow from x group by 1 order by 1;
```
### Q1.7 staged rows per state; live rows per state; zip formats
```sql
select state, count(*) n, count(distinct match_key) dmk from public.staged_samhsa group by 1 order by 2 desc;
select state, count(*) from public.facilities group by 1 order by 2 desc;
select 'staged' t, case when zip ~ '^\d{5}$' then '5digit' when zip ~ '^\d{5}-\d{4}$' then 'zip+4' when zip is null or zip='' then 'empty' else 'other:'||zip end k, count(*) from public.staged_samhsa group by 1,2
union all
select 'live', case when zip_code ~ '^\d{5}$' then '5digit' when zip_code ~ '^\d{5}-\d{4}$' then 'zip+4' when zip_code is null or zip_code='' then 'empty' else 'other:'||zip_code end, count(*) from public.facilities group by 1,2
order by 1,3 desc;
```
### Q1.8 field-population overview
```sql
select count(*) filter (where name = raw_payload->>'name1') name_eq_name1, count(*) filter (where coalesce(name_alt,'') = coalesce(raw_payload->>'name2','')) alt_eq_name2, count(*) filter (where coalesce(raw_payload->>'name2','')<>'') has_name2,
count(*) filter (where street = raw_payload->>'street1') street_eq_s1, count(*) filter (where coalesce(raw_payload->>'street2','')<>'') has_street2,
count(*) filter (where phone is null or phone='') no_phone, count(*) filter (where normalized_phone is null) no_norm_phone,
count(*) filter (where phone ~* 'x') phone_with_ext, count(*) filter (where phone ~* 'x' and normalized_phone is null) ext_and_null_norm,
count(*) filter (where intake_phone is not null and intake_phone<>'') has_intake, count(*) filter (where hotline_phone is not null and hotline_phone<>'') has_hotline,
count(*) filter (where website is null or website='') no_website, count(*) filter (where website_domain is null) no_domain,
count(*) filter (where latitude is null or longitude is null) no_latlong,
count(*) filter (where match_key like 'p:%') mk_p, count(*) filter (where match_key like 'a:%') mk_a, count(*) filter (where match_key not like 'p:%' and match_key not like 'a:%') mk_other
from public.staged_samhsa;

select 'no_domain' kind, website v, count(*) from public.staged_samhsa where website_domain is null group by 2
union all select 'null_mk', coalesce(phone,'')||' | '||coalesce(normalized_street,'<null>')||' | '||coalesce(zip,''), count(*) from public.staged_samhsa where match_key is null group by 2
union all select 'no_latlong_raw', coalesce(raw_payload->>'latitude','<null>')||','||coalesce(raw_payload->>'longitude','<null>'), count(*) from public.staged_samhsa where latitude is null or longitude is null group by 2
order by 1, 3 desc limit 40;
```

### Q2.1 duplicate summary
```sql
with mk as (select match_key, count(*) c from public.staged_samhsa where match_key is not null group by 1),
sid as (select source_id, count(*) c from public.staged_samhsa group by 1),
pz as (select normalized_phone, normalized_zip, count(*) c, count(distinct match_key) dmk from public.staged_samhsa where normalized_phone is not null group by 1,2),
nz as (select normalized_name, normalized_zip, count(*) c, count(distinct coalesce(match_key,id::text)) dmk from public.staged_samhsa where coalesce(normalized_name,'')<>'' group by 1,2),
ex as (select md5(raw_payload::text) h, count(*) c from public.staged_samhsa group by 1),
ex2 as (select md5((raw_payload - '_irow')::text) h, count(*) c from public.staged_samhsa group by 1)
select
 (select count(*) from mk where c>1) match_keys_gt1, (select sum(c) from mk where c>1) rows_in_those, (select sum(c-1) from mk where c>1) surplus_rows, (select max(c) from mk) max_rows_per_key,
 (select count(*) from public.staged_samhsa where match_key is null) null_match_key_rows,
 (select count(*) from sid where c>1) dup_source_ids,
 (select count(*) from ex where c>1) identical_payload_groups,
 (select count(*) from ex2 where c>1) identical_payload_ex_irow_groups, (select coalesce(sum(c),0) from ex2 where c>1) rows_in_identical_ex_irow,
 (select count(*) from pz where c>1) phone_zip_groups_gt1, (select sum(c) from pz where c>1) phone_zip_rows, (select count(*) from pz where dmk>1) phone_zip_groups_spanning_keys,
 (select count(*) from nz where c>1) name_zip_groups_gt1, (select sum(c) from nz where c>1) name_zip_rows, (select count(*) from nz where dmk>1) name_zip_groups_spanning_keys, (select sum(c) from nz where dmk>1) name_zip_rows_spanning_keys;
```
### Q2.2 what differs inside multi-row match_keys
```sql
with g as (select match_key, count(*) c, count(distinct lower(name)) dn, count(distinct lower(coalesce(name_alt,''))) dalt, count(distinct normalized_street) dst, count(distinct raw_payload->>'typeFacility') dtf,
  bool_and(raw_payload->>'typeFacility' in ('SA','MH')) ok, count(distinct services::text) dsvc
 from public.staged_samhsa where match_key is not null group by 1 having count(*)>1)
select count(*) groups, count(*) filter (where dtf=2) mixed_sa_mh, count(*) filter (where dn=1 and dalt=1 and dst<=1) same_name_alt_street, count(*) filter (where dn=1 and dalt=1 and dst<=1 and dtf=2) same_all_but_type,
 count(*) filter (where dst>1) diff_street, count(*) filter (where dn>1) diff_name, count(*) filter (where dn=1 and dalt>1) same_name_diff_alt, count(*) filter (where dsvc=1) identical_services
from g;

with g as (select match_key from public.staged_samhsa where match_key is not null group by 1 having count(distinct normalized_street)>1 order by md5(match_key) limit 5)
select s.match_key, s.name, s.name_alt, s.street, s.city, raw_payload->>'typeFacility' tf from public.staged_samhsa s join g using (match_key) order by 1,4;
```
### Q2.3 street+zip and name+street+zip groups spanning keys
```sql
with az as (select normalized_street, normalized_zip, count(*) c, count(distinct coalesce(match_key,id::text)) dmk from public.staged_samhsa where coalesce(normalized_street,'')<>'' group by 1,2),
nzs as (select normalized_name, normalized_zip, normalized_street, count(distinct coalesce(match_key,id::text)) dmk, count(*) c from public.staged_samhsa where coalesce(normalized_name,'')<>'' and coalesce(normalized_street,'')<>'' group by 1,2,3),
ks as (select count(distinct (coalesce(match_key,id::text), coalesce(normalized_street,''))) n from public.staged_samhsa)
select (select count(*) from az where dmk>1) street_zip_groups_spanning_keys, (select sum(c) from az where dmk>1) street_zip_rows_spanning,
 (select count(*) from nzs where dmk>1) name_street_zip_groups_spanning_keys, (select sum(c) from nzs where dmk>1) rows_in_those, (select sum(dmk-1) from nzs where dmk>1) extra_keys,
 (select n from ks) distinct_key_street_pairs;
```

### Q3.0 live-side schema and status checks
```sql
select column_name, data_type from information_schema.columns where table_schema='public' and table_name in ('facilities','facility_match_clusters','staged_directory','staged_leads') order by table_name, ordinal_position;
select status, coalesce(suspended,false) susp, count(*) from public.facilities group by 1,2 order by 1,2;
select data_source, status, count(*), min(created_at)::date, max(created_at)::date, count(*) filter (where id in (select promoted_to_facility_id from public.facility_match_clusters where promoted_to_facility_id is not null)) linked_by_cluster
from public.facilities group by 1,2 order by 3 desc;
```
### Q3.1 staged-side match counts, rows and entities (Prefix A)
```sql
with sm(abbr, full_name) as (values ('AL','Alabama'),('AK','Alaska'),('AZ','Arizona'),('AR','Arkansas'),('CA','California'),('CO','Colorado'),('CT','Connecticut'),('DE','Delaware'),('DC','District of Columbia'),('FL','Florida'),('GA','Georgia'),('HI','Hawaii'),('ID','Idaho'),('IL','Illinois'),('IN','Indiana'),('IA','Iowa'),('KS','Kansas'),('KY','Kentucky'),('LA','Louisiana'),('ME','Maine'),('MD','Maryland'),('MA','Massachusetts'),('MI','Michigan'),('MN','Minnesota'),('MS','Mississippi'),('MO','Missouri'),('MT','Montana'),('NE','Nebraska'),('NV','Nevada'),('NH','New Hampshire'),('NJ','New Jersey'),('NM','New Mexico'),('NY','New York'),('NC','North Carolina'),('ND','North Dakota'),('OH','Ohio'),('OK','Oklahoma'),('OR','Oregon'),('PA','Pennsylvania'),('RI','Rhode Island'),('SC','South Carolina'),('SD','South Dakota'),('TN','Tennessee'),('TX','Texas'),('UT','Utah'),('VT','Vermont'),('VA','Virginia'),('WA','Washington'),('WV','West Virginia'),('WI','Wisconsin'),('WY','Wyoming'),('PR','Puerto Rico'),('GU','Guam'),('VI','Virgin Islands'),('AS','American Samoa'),('MP','Northern Mariana Islands')),
s0 as (
  select s.*, coalesce(s.match_key, 'row:'||s.id::text) mk,
    left(regexp_replace(coalesce(s.zip,''),'\D','','g'),5) z5,
    case when length(regexp_replace(split_part(lower(coalesce(s.phone,'')),'x',1),'\D','','g'))>=10
         then right(regexp_replace(split_part(lower(s.phone),'x',1),'\D','','g'),10) end ph,
    lower(trim(s.name)) nm,
    lower(trim(s.name || coalesce(' - '||nullif(trim(s.name_alt),''),''))) nm_full,
    coalesce(s.street,'') raw_street
  from public.staged_samhsa s),
l0 as (
  select f.*, sm.abbr st,
    left(regexp_replace(coalesce(f.zip_code,''),'\D','','g'),5) z5,
    case when length(regexp_replace(split_part(lower(coalesce(f.phone,'')),'x',1),'\D','','g'))>=10
         then right(regexp_replace(split_part(lower(f.phone),'x',1),'\D','','g'),10) end ph,
    lower(trim(f.name)) nm,
    coalesce(f.address,'') raw_street
  from public.facilities f left join sm on sm.full_name = f.state),
s as (select s0.*, nullif(trim(regexp_replace(
  regexp_replace(regexp_replace(regexp_replace(regexp_replace(regexp_replace(regexp_replace(regexp_replace(regexp_replace(regexp_replace(regexp_replace(regexp_replace(regexp_replace(regexp_replace(regexp_replace(
  regexp_replace(regexp_replace(lower(split_part(raw_street, ',', 1)), '[^a-z0-9 ]', ' ', 'g'), '\m(suite|ste|unit|apt|room|rm|bldg|building|floor|fl)\M.*$', '', 'g'),
  '\mnorth\M','n','g'),'\msouth\M','s','g'),'\meast\M','e','g'),'\mwest\M','w','g'),
  '\mstreet\M','st','g'),'\mavenue\M','ave','g'),'\mroad\M','rd','g'),'\mboulevard\M','blvd','g'),'\mdrive\M','dr','g'),'\mlane\M','ln','g'),'\mhighway\M','hwy','g'),'\mparkway\M','pkwy','g'),'\mcourt\M','ct','g'),'\mplace\M','pl','g'),
  '\s+',' ','g')),'') addr from s0),
l as (select l0.*, nullif(trim(regexp_replace(
  regexp_replace(regexp_replace(regexp_replace(regexp_replace(regexp_replace(regexp_replace(regexp_replace(regexp_replace(regexp_replace(regexp_replace(regexp_replace(regexp_replace(regexp_replace(regexp_replace(
  regexp_replace(regexp_replace(lower(split_part(raw_street, ',', 1)), '[^a-z0-9 ]', ' ', 'g'), '\m(suite|ste|unit|apt|room|rm|bldg|building|floor|fl)\M.*$', '', 'g'),
  '\mnorth\M','n','g'),'\msouth\M','s','g'),'\meast\M','e','g'),'\mwest\M','w','g'),
  '\mstreet\M','st','g'),'\mavenue\M','ave','g'),'\mroad\M','rd','g'),'\mboulevard\M','blvd','g'),'\mdrive\M','dr','g'),'\mlane\M','ln','g'),'\mhighway\M','hwy','g'),'\mparkway\M','pkwy','g'),'\mcourt\M','ct','g'),'\mplace\M','pl','g'),
  '\s+',' ','g')),'') addr from l0),
sf as (
  select s.*,
    exists (select 1 from l where l.ph = s.ph and l.st = s.state) m_phone,
    exists (select 1 from l where l.nm = s.nm and l.z5 = s.z5) m_name,
    exists (select 1 from l where l.nm = s.nm_full and l.z5 = s.z5) m_name_full,
    exists (select 1 from l where l.addr = s.addr and l.z5 = s.z5) m_street,
    exists (select 1 from public.facility_match_clusters c join public.facilities f on f.id = c.promoted_to_facility_id where c.id = s.cluster_id) m_cluster
  from s),
ent as (
  select mk, bool_or(m_phone) m_phone, bool_or(m_name) m_name, bool_or(m_name_full) m_name_full, bool_or(m_street) m_street, bool_or(m_cluster) m_cluster
  from sf group by mk)
select 'rows' lvl, count(*) total,
  count(*) filter (where m_phone) a_phone_state,
  count(*) filter (where m_name) b_name_zip,
  count(*) filter (where m_name_full) b2_namefull_zip,
  count(*) filter (where m_street) c_street_zip,
  count(*) filter (where m_phone or m_name or m_street) union_abc,
  count(*) filter (where m_phone or m_name or m_name_full or m_street) union_abc_b2,
  count(*) filter (where m_cluster) cluster_link,
  count(*) filter (where m_phone or m_name or m_name_full or m_street or m_cluster) union_all,
  count(*) filter (where m_cluster and not (m_phone or m_name or m_name_full or m_street)) cluster_only
from sf
union all
select 'entities', count(*),
  count(*) filter (where m_phone), count(*) filter (where m_name), count(*) filter (where m_name_full), count(*) filter (where m_street),
  count(*) filter (where m_phone or m_name or m_street), count(*) filter (where m_phone or m_name or m_name_full or m_street),
  count(*) filter (where m_cluster), count(*) filter (where m_phone or m_name or m_name_full or m_street or m_cluster),
  count(*) filter (where m_cluster and not (m_phone or m_name or m_name_full or m_street))
from ent;
```
### Q3.2 live-side match counts (Prefix A)
```sql
with sm(abbr, full_name) as (values ('AL','Alabama'),('AK','Alaska'),('AZ','Arizona'),('AR','Arkansas'),('CA','California'),('CO','Colorado'),('CT','Connecticut'),('DE','Delaware'),('DC','District of Columbia'),('FL','Florida'),('GA','Georgia'),('HI','Hawaii'),('ID','Idaho'),('IL','Illinois'),('IN','Indiana'),('IA','Iowa'),('KS','Kansas'),('KY','Kentucky'),('LA','Louisiana'),('ME','Maine'),('MD','Maryland'),('MA','Massachusetts'),('MI','Michigan'),('MN','Minnesota'),('MS','Mississippi'),('MO','Missouri'),('MT','Montana'),('NE','Nebraska'),('NV','Nevada'),('NH','New Hampshire'),('NJ','New Jersey'),('NM','New Mexico'),('NY','New York'),('NC','North Carolina'),('ND','North Dakota'),('OH','Ohio'),('OK','Oklahoma'),('OR','Oregon'),('PA','Pennsylvania'),('RI','Rhode Island'),('SC','South Carolina'),('SD','South Dakota'),('TN','Tennessee'),('TX','Texas'),('UT','Utah'),('VT','Vermont'),('VA','Virginia'),('WA','Washington'),('WV','West Virginia'),('WI','Wisconsin'),('WY','Wyoming'),('PR','Puerto Rico'),('GU','Guam'),('VI','Virgin Islands'),('AS','American Samoa'),('MP','Northern Mariana Islands')),
s0 as (
  select s.*, coalesce(s.match_key, 'row:'||s.id::text) mk,
    left(regexp_replace(coalesce(s.zip,''),'\D','','g'),5) z5,
    case when length(regexp_replace(split_part(lower(coalesce(s.phone,'')),'x',1),'\D','','g'))>=10
         then right(regexp_replace(split_part(lower(s.phone),'x',1),'\D','','g'),10) end ph,
    lower(trim(s.name)) nm,
    lower(trim(s.name || coalesce(' - '||nullif(trim(s.name_alt),''),''))) nm_full,
    coalesce(s.street,'') raw_street
  from public.staged_samhsa s),
l0 as (
  select f.*, sm.abbr st,
    left(regexp_replace(coalesce(f.zip_code,''),'\D','','g'),5) z5,
    case when length(regexp_replace(split_part(lower(coalesce(f.phone,'')),'x',1),'\D','','g'))>=10
         then right(regexp_replace(split_part(lower(f.phone),'x',1),'\D','','g'),10) end ph,
    lower(trim(f.name)) nm,
    coalesce(f.address,'') raw_street
  from public.facilities f left join sm on sm.full_name = f.state),
s as (select s0.*, nullif(trim(regexp_replace(
  regexp_replace(regexp_replace(regexp_replace(regexp_replace(regexp_replace(regexp_replace(regexp_replace(regexp_replace(regexp_replace(regexp_replace(regexp_replace(regexp_replace(regexp_replace(regexp_replace(
  regexp_replace(regexp_replace(lower(split_part(raw_street, ',', 1)), '[^a-z0-9 ]', ' ', 'g'), '\m(suite|ste|unit|apt|room|rm|bldg|building|floor|fl)\M.*$', '', 'g'),
  '\mnorth\M','n','g'),'\msouth\M','s','g'),'\meast\M','e','g'),'\mwest\M','w','g'),
  '\mstreet\M','st','g'),'\mavenue\M','ave','g'),'\mroad\M','rd','g'),'\mboulevard\M','blvd','g'),'\mdrive\M','dr','g'),'\mlane\M','ln','g'),'\mhighway\M','hwy','g'),'\mparkway\M','pkwy','g'),'\mcourt\M','ct','g'),'\mplace\M','pl','g'),
  '\s+',' ','g')),'') addr from s0),
l as (select l0.*, nullif(trim(regexp_replace(
  regexp_replace(regexp_replace(regexp_replace(regexp_replace(regexp_replace(regexp_replace(regexp_replace(regexp_replace(regexp_replace(regexp_replace(regexp_replace(regexp_replace(regexp_replace(regexp_replace(
  regexp_replace(regexp_replace(lower(split_part(raw_street, ',', 1)), '[^a-z0-9 ]', ' ', 'g'), '\m(suite|ste|unit|apt|room|rm|bldg|building|floor|fl)\M.*$', '', 'g'),
  '\mnorth\M','n','g'),'\msouth\M','s','g'),'\meast\M','e','g'),'\mwest\M','w','g'),
  '\mstreet\M','st','g'),'\mavenue\M','ave','g'),'\mroad\M','rd','g'),'\mboulevard\M','blvd','g'),'\mdrive\M','dr','g'),'\mlane\M','ln','g'),'\mhighway\M','hwy','g'),'\mparkway\M','pkwy','g'),'\mcourt\M','ct','g'),'\mplace\M','pl','g'),
  '\s+',' ','g')),'') addr from l0),
lf as (
  select l.id, l.data_source,
    exists (select 1 from s where s.ph = l.ph and s.state = l.st) m_phone,
    exists (select 1 from s where s.ph = l.ph and s.state = l.st and s.z5 = l.z5) m_phone_zip,
    exists (select 1 from s where (s.nm = l.nm or s.nm_full = l.nm) and s.z5 = l.z5) m_name,
    exists (select 1 from s where s.addr = l.addr and s.z5 = l.z5) m_street,
    exists (select 1 from public.facility_match_clusters c where c.promoted_to_facility_id = l.id and c.samhsa_count > 0) m_cluster_samhsa,
    exists (select 1 from public.facility_match_clusters c where c.promoted_to_facility_id = l.id) m_cluster_any
  from l)
select data_source, count(*) live_rows,
  count(*) filter (where m_phone) by_phone_state, count(*) filter (where m_phone_zip) by_phone_state_zip,
  count(*) filter (where m_name) by_name_zip, count(*) filter (where m_street) by_street_zip,
  count(*) filter (where m_phone or m_name or m_street) any_abc,
  count(*) filter (where not (m_phone or m_name or m_street)) no_abc_match,
  count(*) filter (where m_cluster_samhsa) cluster_samhsa_link,
  count(*) filter (where not (m_phone or m_name or m_street or m_cluster_samhsa)) no_match_incl_cluster,
  count(*) filter (where m_cluster_any) cluster_any_link,
  count(*) filter (where not m_cluster_samhsa and m_cluster_any) cluster_dir_only
from lf group by rollup(data_source) order by 1 nulls last;
```
### Q3.3 entity-level split: non-null match_keys vs NULL-key rows (Prefix B)
```sql
with sm(abbr, full_name) as (values ('AL','Alabama'),('AK','Alaska'),('AZ','Arizona'),('AR','Arkansas'),('CA','California'),('CO','Colorado'),('CT','Connecticut'),('DE','Delaware'),('DC','District of Columbia'),('FL','Florida'),('GA','Georgia'),('HI','Hawaii'),('ID','Idaho'),('IL','Illinois'),('IN','Indiana'),('IA','Iowa'),('KS','Kansas'),('KY','Kentucky'),('LA','Louisiana'),('ME','Maine'),('MD','Maryland'),('MA','Massachusetts'),('MI','Michigan'),('MN','Minnesota'),('MS','Mississippi'),('MO','Missouri'),('MT','Montana'),('NE','Nebraska'),('NV','Nevada'),('NH','New Hampshire'),('NJ','New Jersey'),('NM','New Mexico'),('NY','New York'),('NC','North Carolina'),('ND','North Dakota'),('OH','Ohio'),('OK','Oklahoma'),('OR','Oregon'),('PA','Pennsylvania'),('RI','Rhode Island'),('SC','South Carolina'),('SD','South Dakota'),('TN','Tennessee'),('TX','Texas'),('UT','Utah'),('VT','Vermont'),('VA','Virginia'),('WA','Washington'),('WV','West Virginia'),('WI','Wisconsin'),('WY','Wyoming'),('PR','Puerto Rico'),('GU','Guam'),('VI','Virgin Islands'),('AS','American Samoa'),('MP','Northern Mariana Islands')),
s0 as (
  select s.*, coalesce(s.match_key, 'row:'||s.id::text) mk,
    left(regexp_replace(coalesce(s.zip,''),'\D','','g'),5) z5,
    case when length(regexp_replace(split_part(lower(coalesce(s.phone,'')),'x',1),'\D','','g'))>=10
         then right(regexp_replace(split_part(lower(s.phone),'x',1),'\D','','g'),10) end ph,
    lower(trim(s.name)) nm,
    lower(trim(s.name || coalesce(' - '||nullif(trim(s.name_alt),''),''))) nm_full,
    coalesce(s.street,'') raw_street
  from public.staged_samhsa s),
l0 as (
  select f.*, sm.abbr st,
    left(regexp_replace(coalesce(f.zip_code,''),'\D','','g'),5) z5,
    case when length(regexp_replace(split_part(lower(coalesce(f.phone,'')),'x',1),'\D','','g'))>=10
         then right(regexp_replace(split_part(lower(f.phone),'x',1),'\D','','g'),10) end ph,
    lower(trim(f.name)) nm,
    coalesce(f.address,'') raw_street
  from public.facilities f left join sm on sm.full_name = f.state),
s as materialized (select s0.*, nullif(trim(regexp_replace(
  regexp_replace(regexp_replace(regexp_replace(regexp_replace(regexp_replace(regexp_replace(regexp_replace(regexp_replace(regexp_replace(regexp_replace(regexp_replace(regexp_replace(regexp_replace(regexp_replace(
  regexp_replace(regexp_replace(lower(split_part(raw_street, ',', 1)), '[^a-z0-9 ]', ' ', 'g'), '\m(suite|ste|unit|apt|room|rm|bldg|building|floor|fl)\M.*$', '', 'g'),
  '\mnorth\M','n','g'),'\msouth\M','s','g'),'\meast\M','e','g'),'\mwest\M','w','g'),
  '\mstreet\M','st','g'),'\mavenue\M','ave','g'),'\mroad\M','rd','g'),'\mboulevard\M','blvd','g'),'\mdrive\M','dr','g'),'\mlane\M','ln','g'),'\mhighway\M','hwy','g'),'\mparkway\M','pkwy','g'),'\mcourt\M','ct','g'),'\mplace\M','pl','g'),
  '\s+',' ','g')),'') addr from s0),
l as materialized (select l0.*, nullif(trim(regexp_replace(
  regexp_replace(regexp_replace(regexp_replace(regexp_replace(regexp_replace(regexp_replace(regexp_replace(regexp_replace(regexp_replace(regexp_replace(regexp_replace(regexp_replace(regexp_replace(regexp_replace(
  regexp_replace(regexp_replace(lower(split_part(raw_street, ',', 1)), '[^a-z0-9 ]', ' ', 'g'), '\m(suite|ste|unit|apt|room|rm|bldg|building|floor|fl)\M.*$', '', 'g'),
  '\mnorth\M','n','g'),'\msouth\M','s','g'),'\meast\M','e','g'),'\mwest\M','w','g'),
  '\mstreet\M','st','g'),'\mavenue\M','ave','g'),'\mroad\M','rd','g'),'\mboulevard\M','blvd','g'),'\mdrive\M','dr','g'),'\mlane\M','ln','g'),'\mhighway\M','hwy','g'),'\mparkway\M','pkwy','g'),'\mcourt\M','ct','g'),'\mplace\M','pl','g'),
  '\s+',' ','g')),'') addr from l0),
kp as (select distinct ph, st from l where ph is not null),
kn as (select distinct nm, z5 from l),
ka as (select distinct addr, z5 from l where addr is not null),
kc as (select c.id from public.facility_match_clusters c join public.facilities f on f.id = c.promoted_to_facility_id),
sf as (
  select s.mk,
    coalesce((s.ph, s.state) in (select ph, st from kp),false) a,
    coalesce((s.nm, s.z5) in (select nm, z5 from kn),false) b,
    coalesce((s.nm_full, s.z5) in (select nm, z5 from kn),false) b2,
    coalesce((s.addr, s.z5) in (select addr, z5 from ka),false) c,
    coalesce(s.cluster_id in (select id from kc),false) cl
  from s),
ent as (select mk, bool_or(a) a, bool_or(b) b, bool_or(b2) b2, bool_or(c) c, bool_or(cl) cl from sf group by mk)
select (mk like 'row:%') null_key_row, count(*) entities,
 count(*) filter (where a) a, count(*) filter (where b) b, count(*) filter (where b or b2) b_incl_name_full, count(*) filter (where c) c,
 count(*) filter (where a or b or c) abc, count(*) filter (where a or b or b2 or c) abc_b2, count(*) filter (where a or b or b2 or c or cl) any_incl_cluster,
 count(*) filter (where a and not (b or b2 or c or cl)) only_a, count(*) filter (where (b or b2) and not (a or c or cl)) only_b, count(*) filter (where c and not (a or b or b2 or cl)) only_c
from ent group by rollup(1) order by 1 nulls last;
```
### Q3.4 live rows with no staged match, by cluster provenance (Prefix B)
```sql
with sm(abbr, full_name) as (values ('AL','Alabama'),('AK','Alaska'),('AZ','Arizona'),('AR','Arkansas'),('CA','California'),('CO','Colorado'),('CT','Connecticut'),('DE','Delaware'),('DC','District of Columbia'),('FL','Florida'),('GA','Georgia'),('HI','Hawaii'),('ID','Idaho'),('IL','Illinois'),('IN','Indiana'),('IA','Iowa'),('KS','Kansas'),('KY','Kentucky'),('LA','Louisiana'),('ME','Maine'),('MD','Maryland'),('MA','Massachusetts'),('MI','Michigan'),('MN','Minnesota'),('MS','Mississippi'),('MO','Missouri'),('MT','Montana'),('NE','Nebraska'),('NV','Nevada'),('NH','New Hampshire'),('NJ','New Jersey'),('NM','New Mexico'),('NY','New York'),('NC','North Carolina'),('ND','North Dakota'),('OH','Ohio'),('OK','Oklahoma'),('OR','Oregon'),('PA','Pennsylvania'),('RI','Rhode Island'),('SC','South Carolina'),('SD','South Dakota'),('TN','Tennessee'),('TX','Texas'),('UT','Utah'),('VT','Vermont'),('VA','Virginia'),('WA','Washington'),('WV','West Virginia'),('WI','Wisconsin'),('WY','Wyoming'),('PR','Puerto Rico'),('GU','Guam'),('VI','Virgin Islands'),('AS','American Samoa'),('MP','Northern Mariana Islands')),
s0 as (
  select s.*, coalesce(s.match_key, 'row:'||s.id::text) mk,
    left(regexp_replace(coalesce(s.zip,''),'\D','','g'),5) z5,
    case when length(regexp_replace(split_part(lower(coalesce(s.phone,'')),'x',1),'\D','','g'))>=10
         then right(regexp_replace(split_part(lower(s.phone),'x',1),'\D','','g'),10) end ph,
    lower(trim(s.name)) nm,
    lower(trim(s.name || coalesce(' - '||nullif(trim(s.name_alt),''),''))) nm_full,
    coalesce(s.street,'') raw_street
  from public.staged_samhsa s),
l0 as (
  select f.*, sm.abbr st,
    left(regexp_replace(coalesce(f.zip_code,''),'\D','','g'),5) z5,
    case when length(regexp_replace(split_part(lower(coalesce(f.phone,'')),'x',1),'\D','','g'))>=10
         then right(regexp_replace(split_part(lower(f.phone),'x',1),'\D','','g'),10) end ph,
    lower(trim(f.name)) nm,
    coalesce(f.address,'') raw_street
  from public.facilities f left join sm on sm.full_name = f.state),
s as materialized (select s0.*, nullif(trim(regexp_replace(
  regexp_replace(regexp_replace(regexp_replace(regexp_replace(regexp_replace(regexp_replace(regexp_replace(regexp_replace(regexp_replace(regexp_replace(regexp_replace(regexp_replace(regexp_replace(regexp_replace(
  regexp_replace(regexp_replace(lower(split_part(raw_street, ',', 1)), '[^a-z0-9 ]', ' ', 'g'), '\m(suite|ste|unit|apt|room|rm|bldg|building|floor|fl)\M.*$', '', 'g'),
  '\mnorth\M','n','g'),'\msouth\M','s','g'),'\meast\M','e','g'),'\mwest\M','w','g'),
  '\mstreet\M','st','g'),'\mavenue\M','ave','g'),'\mroad\M','rd','g'),'\mboulevard\M','blvd','g'),'\mdrive\M','dr','g'),'\mlane\M','ln','g'),'\mhighway\M','hwy','g'),'\mparkway\M','pkwy','g'),'\mcourt\M','ct','g'),'\mplace\M','pl','g'),
  '\s+',' ','g')),'') addr from s0),
l as materialized (select l0.*, nullif(trim(regexp_replace(
  regexp_replace(regexp_replace(regexp_replace(regexp_replace(regexp_replace(regexp_replace(regexp_replace(regexp_replace(regexp_replace(regexp_replace(regexp_replace(regexp_replace(regexp_replace(regexp_replace(
  regexp_replace(regexp_replace(lower(split_part(raw_street, ',', 1)), '[^a-z0-9 ]', ' ', 'g'), '\m(suite|ste|unit|apt|room|rm|bldg|building|floor|fl)\M.*$', '', 'g'),
  '\mnorth\M','n','g'),'\msouth\M','s','g'),'\meast\M','e','g'),'\mwest\M','w','g'),
  '\mstreet\M','st','g'),'\mavenue\M','ave','g'),'\mroad\M','rd','g'),'\mboulevard\M','blvd','g'),'\mdrive\M','dr','g'),'\mlane\M','ln','g'),'\mhighway\M','hwy','g'),'\mparkway\M','pkwy','g'),'\mcourt\M','ct','g'),'\mplace\M','pl','g'),
  '\s+',' ','g')),'') addr from l0),
kp as (select distinct ph, state st from s where ph is not null),
kn as (select distinct nm, z5 from s union select distinct nm_full, z5 from s),
ka as (select distinct addr, z5 from s where addr is not null),
lf as (select l.id, l.data_source, l.st,
   coalesce((l.ph, l.st) in (select ph, st from kp),false) or coalesce((l.nm, l.z5) in (select nm, z5 from kn),false) or coalesce((l.addr, l.z5) in (select addr, z5 from ka),false) m_abc,
   exists (select 1 from public.facility_match_clusters c where c.promoted_to_facility_id = l.id and c.samhsa_count > 0) cl_samhsa,
   exists (select 1 from public.facility_match_clusters c where c.promoted_to_facility_id = l.id) cl_any,
   (select string_agg(distinct src, ',') from public.facility_match_clusters c, jsonb_array_elements_text(c.match_signals->'sources') src where c.promoted_to_facility_id = l.id) srcs
 from l)
select data_source, cl_any, cl_samhsa, count(*) n_unmatched,
 count(*) filter (where srcs like '%carf%') with_carf_src, count(*) filter (where srcs ~ 'state_') with_state_src
from lf where not m_abc group by 1,2,3 order by 1,2,3;
```
### Q3.5 facility_match_clusters
```sql
select (select count(*) from public.facility_match_clusters) n_clusters,
(select count(*) from public.staged_directory) n_dir, (select count(*) from public.staged_leads) n_leads,
(select count(*) from public.facility_match_clusters where promoted_to_facility_id is not null) promoted,
(select jsonb_agg(distinct promotion_decision) from public.facility_match_clusters) decisions,
(select min(created_at)::text||' / '||max(created_at)::text from public.facility_match_clusters) created_range,
(select count(*) from public.facility_match_clusters where samhsa_count>1) samhsa_multi,
(select sum(samhsa_count) from public.facility_match_clusters) sum_samhsa_count,
(select count(*) from public.facility_match_clusters c where not exists (select 1 from public.staged_samhsa s where s.cluster_id=c.id)) clusters_without_staged;

select promotion_decision, (samhsa_count>0) has_samhsa, (directory_count>0) has_dir, count(*) n, count(promoted_to_facility_id) with_promoted_id,
count(*) filter (where exists (select 1 from public.facilities f where f.id=c.promoted_to_facility_id)) promoted_id_exists_in_live,
count(distinct promoted_to_facility_id) distinct_promoted_ids, round(avg(match_confidence),3) avg_conf
from public.facility_match_clusters c group by 1,2,3 order by 1,2,3;

select match_signals->>'match_tier' tier, promotion_decision, (samhsa_count>0) has_samhsa, count(*) from public.facility_match_clusters group by 1,2,3 order by 1,2,3;

select s.name, s.name_alt, f.name live_name, s.street, s.raw_payload->>'street2' s2, f.address, s.phone, f.phone live_phone, s.website, f.website live_web, s.zip, f.zip_code, c.promotion_decision, c.match_signals
from public.staged_samhsa s join public.facility_match_clusters c on c.id=s.cluster_id join public.facilities f on f.id=c.promoted_to_facility_id order by random() limit 8;
```

### Q4.1 new candidates and usable SUD estimate (Prefix A)
```sql
with sm(abbr, full_name) as (values ('AL','Alabama'),('AK','Alaska'),('AZ','Arizona'),('AR','Arkansas'),('CA','California'),('CO','Colorado'),('CT','Connecticut'),('DE','Delaware'),('DC','District of Columbia'),('FL','Florida'),('GA','Georgia'),('HI','Hawaii'),('ID','Idaho'),('IL','Illinois'),('IN','Indiana'),('IA','Iowa'),('KS','Kansas'),('KY','Kentucky'),('LA','Louisiana'),('ME','Maine'),('MD','Maryland'),('MA','Massachusetts'),('MI','Michigan'),('MN','Minnesota'),('MS','Mississippi'),('MO','Missouri'),('MT','Montana'),('NE','Nebraska'),('NV','Nevada'),('NH','New Hampshire'),('NJ','New Jersey'),('NM','New Mexico'),('NY','New York'),('NC','North Carolina'),('ND','North Dakota'),('OH','Ohio'),('OK','Oklahoma'),('OR','Oregon'),('PA','Pennsylvania'),('RI','Rhode Island'),('SC','South Carolina'),('SD','South Dakota'),('TN','Tennessee'),('TX','Texas'),('UT','Utah'),('VT','Vermont'),('VA','Virginia'),('WA','Washington'),('WV','West Virginia'),('WI','Wisconsin'),('WY','Wyoming'),('PR','Puerto Rico'),('GU','Guam'),('VI','Virgin Islands'),('AS','American Samoa'),('MP','Northern Mariana Islands')),
s0 as (
  select s.*, coalesce(s.match_key, 'row:'||s.id::text) mk,
    left(regexp_replace(coalesce(s.zip,''),'\D','','g'),5) z5,
    case when length(regexp_replace(split_part(lower(coalesce(s.phone,'')),'x',1),'\D','','g'))>=10
         then right(regexp_replace(split_part(lower(s.phone),'x',1),'\D','','g'),10) end ph,
    lower(trim(s.name)) nm,
    lower(trim(s.name || coalesce(' - '||nullif(trim(s.name_alt),''),''))) nm_full,
    coalesce(s.street,'') raw_street
  from public.staged_samhsa s),
l0 as (
  select f.*, sm.abbr st,
    left(regexp_replace(coalesce(f.zip_code,''),'\D','','g'),5) z5,
    case when length(regexp_replace(split_part(lower(coalesce(f.phone,'')),'x',1),'\D','','g'))>=10
         then right(regexp_replace(split_part(lower(f.phone),'x',1),'\D','','g'),10) end ph,
    lower(trim(f.name)) nm,
    coalesce(f.address,'') raw_street
  from public.facilities f left join sm on sm.full_name = f.state),
s as (select s0.*, nullif(trim(regexp_replace(
  regexp_replace(regexp_replace(regexp_replace(regexp_replace(regexp_replace(regexp_replace(regexp_replace(regexp_replace(regexp_replace(regexp_replace(regexp_replace(regexp_replace(regexp_replace(regexp_replace(
  regexp_replace(regexp_replace(lower(split_part(raw_street, ',', 1)), '[^a-z0-9 ]', ' ', 'g'), '\m(suite|ste|unit|apt|room|rm|bldg|building|floor|fl)\M.*$', '', 'g'),
  '\mnorth\M','n','g'),'\msouth\M','s','g'),'\meast\M','e','g'),'\mwest\M','w','g'),
  '\mstreet\M','st','g'),'\mavenue\M','ave','g'),'\mroad\M','rd','g'),'\mboulevard\M','blvd','g'),'\mdrive\M','dr','g'),'\mlane\M','ln','g'),'\mhighway\M','hwy','g'),'\mparkway\M','pkwy','g'),'\mcourt\M','ct','g'),'\mplace\M','pl','g'),
  '\s+',' ','g')),'') addr from s0),
l as (select l0.*, nullif(trim(regexp_replace(
  regexp_replace(regexp_replace(regexp_replace(regexp_replace(regexp_replace(regexp_replace(regexp_replace(regexp_replace(regexp_replace(regexp_replace(regexp_replace(regexp_replace(regexp_replace(regexp_replace(
  regexp_replace(regexp_replace(lower(split_part(raw_street, ',', 1)), '[^a-z0-9 ]', ' ', 'g'), '\m(suite|ste|unit|apt|room|rm|bldg|building|floor|fl)\M.*$', '', 'g'),
  '\mnorth\M','n','g'),'\msouth\M','s','g'),'\meast\M','e','g'),'\mwest\M','w','g'),
  '\mstreet\M','st','g'),'\mavenue\M','ave','g'),'\mroad\M','rd','g'),'\mboulevard\M','blvd','g'),'\mdrive\M','dr','g'),'\mlane\M','ln','g'),'\mhighway\M','hwy','g'),'\mparkway\M','pkwy','g'),'\mcourt\M','ct','g'),'\mplace\M','pl','g'),
  '\s+',' ','g')),'') addr from l0),
sf as (
  select s.*,
    (exists (select 1 from l where l.ph = s.ph and l.st = s.state)
     or exists (select 1 from l where (l.nm = s.nm or l.nm = s.nm_full) and l.z5 = s.z5)
     or exists (select 1 from l where l.addr = s.addr and l.z5 = s.z5)
     or exists (select 1 from public.facility_match_clusters c join public.facilities f on f.id = c.promoted_to_facility_id where c.id = s.cluster_id)) matched,
    (select e->>'f3' from jsonb_array_elements(s.services) e where e->>'f2'='TC' limit 1) toc
  from s),
r as (
  select sf.*,
    toc ilike '%Substance use treatment%' su,
    (toc ilike '%Substance use treatment%' or toc ilike '%Detoxification%' or toc ilike '%Transitional housing%') sud_any,
    toc ilike '%co-occurring%' cooc,
    z5 ~ '^\d{5}$' zip_ok, addr is not null street_ok, coalesce(trim(city),'')<>'' city_ok,
    state in (select abbr from sm where abbr not in ('PR','GU','VI','AS','MP')) st50dc,
    state in ('PR','GU','VI','AS','MP') terr,
    ph is not null phone_ok, website_domain is not null web_ok, (latitude is not null and longitude is not null) ll_ok
  from sf),
ent as (
  select mk, bool_or(matched) matched,
    bool_or(zip_ok) zip_ok, bool_or(street_ok) street_ok, bool_or(city_ok) city_ok, bool_or(st50dc) st50dc, bool_or(terr) terr, bool_or(phone_ok) phone_ok, bool_or(web_ok) web_ok, bool_or(ll_ok) ll_ok,
    bool_or(su) su, bool_or(sud_any) sud_any, bool_or(cooc) cooc,
    bool_or(raw_payload->>'typeFacility'='SA') any_sa, bool_or(raw_payload->>'typeFacility'='MH') any_mh,
    bool_or(su and zip_ok and street_ok and city_ok and st50dc and phone_ok) usable,
    bool_or(su and zip_ok and street_ok and city_ok and st50dc and phone_ok and ll_ok) usable_ll,
    bool_or(su and zip_ok and street_ok and city_ok and st50dc and phone_ok and ll_ok and web_ok) usable_ll_web,
    bool_or(sud_any and zip_ok and street_ok and city_ok and st50dc and phone_ok) usable_sud_any
  from r group by mk)
select count(*) filter (where not matched) new_entities,
 count(*) filter (where not matched and zip_ok) zip5, count(*) filter (where not matched and street_ok) street, count(*) filter (where not matched and city_ok) city,
 count(*) filter (where not matched and st50dc) state_50_dc, count(*) filter (where not matched and terr) territories,
 count(*) filter (where not matched and phone_ok) phone, count(*) filter (where not matched and web_ok) website, count(*) filter (where not matched and ll_ok) latlong,
 count(*) filter (where not matched and su) toc_su, count(*) filter (where not matched and sud_any) toc_sud_any,
 count(*) filter (where not matched and not sud_any and cooc) cooccurring_only_mh, count(*) filter (where not matched and not sud_any and not cooc) mh_only,
 count(*) filter (where not matched and any_sa) any_sa_listing, count(*) filter (where not matched and any_mh and not any_sa) mh_listing_only,
 count(*) filter (where not matched and usable) usable_new_sud, count(*) filter (where not matched and usable_ll) usable_with_latlong, count(*) filter (where not matched and usable_ll_web) usable_ll_web,
 count(*) filter (where not matched and usable_sud_any) usable_sud_incl_detox_th
from ent;
```
### Q4.2 phone-only/different-ZIP exclusions and sex breakdown for usable (Prefix B)
```sql
with sm(abbr, full_name) as (values ('AL','Alabama'),('AK','Alaska'),('AZ','Arizona'),('AR','Arkansas'),('CA','California'),('CO','Colorado'),('CT','Connecticut'),('DE','Delaware'),('DC','District of Columbia'),('FL','Florida'),('GA','Georgia'),('HI','Hawaii'),('ID','Idaho'),('IL','Illinois'),('IN','Indiana'),('IA','Iowa'),('KS','Kansas'),('KY','Kentucky'),('LA','Louisiana'),('ME','Maine'),('MD','Maryland'),('MA','Massachusetts'),('MI','Michigan'),('MN','Minnesota'),('MS','Mississippi'),('MO','Missouri'),('MT','Montana'),('NE','Nebraska'),('NV','Nevada'),('NH','New Hampshire'),('NJ','New Jersey'),('NM','New Mexico'),('NY','New York'),('NC','North Carolina'),('ND','North Dakota'),('OH','Ohio'),('OK','Oklahoma'),('OR','Oregon'),('PA','Pennsylvania'),('RI','Rhode Island'),('SC','South Carolina'),('SD','South Dakota'),('TN','Tennessee'),('TX','Texas'),('UT','Utah'),('VT','Vermont'),('VA','Virginia'),('WA','Washington'),('WV','West Virginia'),('WI','Wisconsin'),('WY','Wyoming'),('PR','Puerto Rico'),('GU','Guam'),('VI','Virgin Islands'),('AS','American Samoa'),('MP','Northern Mariana Islands')),
s0 as (
  select s.*, coalesce(s.match_key, 'row:'||s.id::text) mk,
    left(regexp_replace(coalesce(s.zip,''),'\D','','g'),5) z5,
    case when length(regexp_replace(split_part(lower(coalesce(s.phone,'')),'x',1),'\D','','g'))>=10
         then right(regexp_replace(split_part(lower(s.phone),'x',1),'\D','','g'),10) end ph,
    lower(trim(s.name)) nm,
    lower(trim(s.name || coalesce(' - '||nullif(trim(s.name_alt),''),''))) nm_full,
    coalesce(s.street,'') raw_street
  from public.staged_samhsa s),
l0 as (
  select f.*, sm.abbr st,
    left(regexp_replace(coalesce(f.zip_code,''),'\D','','g'),5) z5,
    case when length(regexp_replace(split_part(lower(coalesce(f.phone,'')),'x',1),'\D','','g'))>=10
         then right(regexp_replace(split_part(lower(f.phone),'x',1),'\D','','g'),10) end ph,
    lower(trim(f.name)) nm,
    coalesce(f.address,'') raw_street
  from public.facilities f left join sm on sm.full_name = f.state),
s as materialized (select s0.*, nullif(trim(regexp_replace(
  regexp_replace(regexp_replace(regexp_replace(regexp_replace(regexp_replace(regexp_replace(regexp_replace(regexp_replace(regexp_replace(regexp_replace(regexp_replace(regexp_replace(regexp_replace(regexp_replace(
  regexp_replace(regexp_replace(lower(split_part(raw_street, ',', 1)), '[^a-z0-9 ]', ' ', 'g'), '\m(suite|ste|unit|apt|room|rm|bldg|building|floor|fl)\M.*$', '', 'g'),
  '\mnorth\M','n','g'),'\msouth\M','s','g'),'\meast\M','e','g'),'\mwest\M','w','g'),
  '\mstreet\M','st','g'),'\mavenue\M','ave','g'),'\mroad\M','rd','g'),'\mboulevard\M','blvd','g'),'\mdrive\M','dr','g'),'\mlane\M','ln','g'),'\mhighway\M','hwy','g'),'\mparkway\M','pkwy','g'),'\mcourt\M','ct','g'),'\mplace\M','pl','g'),
  '\s+',' ','g')),'') addr from s0),
l as materialized (select l0.*, nullif(trim(regexp_replace(
  regexp_replace(regexp_replace(regexp_replace(regexp_replace(regexp_replace(regexp_replace(regexp_replace(regexp_replace(regexp_replace(regexp_replace(regexp_replace(regexp_replace(regexp_replace(regexp_replace(
  regexp_replace(regexp_replace(lower(split_part(raw_street, ',', 1)), '[^a-z0-9 ]', ' ', 'g'), '\m(suite|ste|unit|apt|room|rm|bldg|building|floor|fl)\M.*$', '', 'g'),
  '\mnorth\M','n','g'),'\msouth\M','s','g'),'\meast\M','e','g'),'\mwest\M','w','g'),
  '\mstreet\M','st','g'),'\mavenue\M','ave','g'),'\mroad\M','rd','g'),'\mboulevard\M','blvd','g'),'\mdrive\M','dr','g'),'\mlane\M','ln','g'),'\mhighway\M','hwy','g'),'\mparkway\M','pkwy','g'),'\mcourt\M','ct','g'),'\mplace\M','pl','g'),
  '\s+',' ','g')),'') addr from l0),
kp as (select distinct ph, st from l where ph is not null),
kpz as (select distinct ph, st, z5 from l where ph is not null),
kn as (select distinct nm, z5 from l),
ka as (select distinct addr, z5 from l where addr is not null),
kc as (select c.id from public.facility_match_clusters c join public.facilities f on f.id = c.promoted_to_facility_id),
sf as (
  select s.*,
    (s.ph, s.state) in (select ph, st from kp) m_phone,
    (s.ph, s.state, s.z5) in (select ph, st, z5 from kpz) m_phone_zip,
    ((s.nm, s.z5) in (select nm, z5 from kn) or (s.nm_full, s.z5) in (select nm, z5 from kn) or (s.addr, s.z5) in (select addr, z5 from ka) or s.cluster_id in (select id from kc)) m_other,
    (select e->>'f3' from jsonb_array_elements(s.services) e where e->>'f2'='TC' limit 1) toc,
    (select e->>'f3' from jsonb_array_elements(s.services) e where e->>'f2'='SN' limit 1) sn
  from s),
r as (
  select sf.*, coalesce(toc,'') ilike '%Substance use treatment%' su,
    (z5 ~ '^\d{5}$' and addr is not null and coalesce(trim(city),'')<>'' and state in (select abbr from sm where abbr not in ('PR','GU','VI','AS','MP')) and ph is not null) complete
  from sf),
ent as (select mk, bool_or(coalesce(m_phone,false)) m_phone, bool_or(coalesce(m_phone_zip,false)) m_phone_zip, bool_or(coalesce(m_other,false)) m_other, bool_or(su and complete) usable,
  bool_or(sn ~* '(^|; )male($|;)' and sn ~* '(^|; )female($|;)') sex_both,
  bool_or(sn ~* '(^|; )male($|;)' and sn !~* '(^|; )female($|;)') any_male_only,
  bool_or(sn ~* '(^|; )female($|;)' and sn !~* '(^|; )male($|;)') any_female_only,
  bool_or(sn is not null) has_sn
 from r group by mk)
select count(*) entities,
 count(*) filter (where not m_phone and not m_other) new_entities_check,
 count(*) filter (where m_phone and not m_phone_zip and not m_other) excluded_only_by_phone_state_diff_zip,
 count(*) filter (where m_phone and not m_phone_zip and not m_other and usable) of_which_usable_sud,
 count(*) filter (where not m_phone and not m_other and usable) usable_new,
 count(*) filter (where not m_phone and not m_other and usable and has_sn) usable_with_sex_facet,
 count(*) filter (where not m_phone and not m_other and usable and sex_both) usable_sex_both,
 count(*) filter (where not m_phone and not m_other and usable and any_male_only and not sex_both) usable_male_only,
 count(*) filter (where not m_phone and not m_other and usable and any_female_only and not sex_both) usable_female_only
from ent;
```
### Q4.3 Type of Care values
```sql
select trim(v) val, count(*) rows, count(*) filter (where s.raw_payload->>'typeFacility'='SA') sa_rows, count(*) filter (where s.raw_payload->>'typeFacility'='MH') mh_rows
from public.staged_samhsa s, jsonb_array_elements(s.services) e, unnest(string_to_array(e->>'f3', ';')) v
where e->>'f2' in ('TC') group by 1 order by 2 desc;
```

### Shared tail used by Q5.1–Q5.4
After Prefix A, Q5.1–Q5.4 each run the following CTEs, then their own final SELECT:
```sql
sf as (
  select s.*,
    (exists (select 1 from l where l.ph = s.ph and l.st = s.state)
     or exists (select 1 from l where (l.nm = s.nm or l.nm = s.nm_full) and l.z5 = s.z5)
     or exists (select 1 from l where l.addr = s.addr and l.z5 = s.z5)
     or exists (select 1 from public.facility_match_clusters c join public.facilities f on f.id = c.promoted_to_facility_id where c.id = s.cluster_id)) matched,
    (select e->>'f3' from jsonb_array_elements(s.services) e where e->>'f2'='TC' limit 1) toc
  from s),
r as (
  select sf.*,
    toc ilike '%Substance use treatment%' su,
    z5 ~ '^\d{5}$' zip_ok, addr is not null street_ok, coalesce(trim(city),'')<>'' city_ok,
    state in (select abbr from sm where abbr not in ('PR','GU','VI','AS','MP')) st50dc,
    ph is not null phone_ok, (latitude is not null and longitude is not null) ll_ok
  from sf),
ent as (
  select mk, bool_or(matched) matched,
    bool_or(su and zip_ok and street_ok and city_ok and st50dc and phone_ok) usable
  from r group by mk)
```
### Q5.1 facet presence (Prefix A, then the shared tail)
```sql
with sm(abbr, full_name) as (values ('AL','Alabama'),('AK','Alaska'),('AZ','Arizona'),('AR','Arkansas'),('CA','California'),('CO','Colorado'),('CT','Connecticut'),('DE','Delaware'),('DC','District of Columbia'),('FL','Florida'),('GA','Georgia'),('HI','Hawaii'),('ID','Idaho'),('IL','Illinois'),('IN','Indiana'),('IA','Iowa'),('KS','Kansas'),('KY','Kentucky'),('LA','Louisiana'),('ME','Maine'),('MD','Maryland'),('MA','Massachusetts'),('MI','Michigan'),('MN','Minnesota'),('MS','Mississippi'),('MO','Missouri'),('MT','Montana'),('NE','Nebraska'),('NV','Nevada'),('NH','New Hampshire'),('NJ','New Jersey'),('NM','New Mexico'),('NY','New York'),('NC','North Carolina'),('ND','North Dakota'),('OH','Ohio'),('OK','Oklahoma'),('OR','Oregon'),('PA','Pennsylvania'),('RI','Rhode Island'),('SC','South Carolina'),('SD','South Dakota'),('TN','Tennessee'),('TX','Texas'),('UT','Utah'),('VT','Vermont'),('VA','Virginia'),('WA','Washington'),('WV','West Virginia'),('WI','Wisconsin'),('WY','Wyoming'),('PR','Puerto Rico'),('GU','Guam'),('VI','Virgin Islands'),('AS','American Samoa'),('MP','Northern Mariana Islands')),
s0 as (
  select s.*, coalesce(s.match_key, 'row:'||s.id::text) mk,
    left(regexp_replace(coalesce(s.zip,''),'\D','','g'),5) z5,
    case when length(regexp_replace(split_part(lower(coalesce(s.phone,'')),'x',1),'\D','','g'))>=10
         then right(regexp_replace(split_part(lower(s.phone),'x',1),'\D','','g'),10) end ph,
    lower(trim(s.name)) nm,
    lower(trim(s.name || coalesce(' - '||nullif(trim(s.name_alt),''),''))) nm_full,
    coalesce(s.street,'') raw_street
  from public.staged_samhsa s),
l0 as (
  select f.*, sm.abbr st,
    left(regexp_replace(coalesce(f.zip_code,''),'\D','','g'),5) z5,
    case when length(regexp_replace(split_part(lower(coalesce(f.phone,'')),'x',1),'\D','','g'))>=10
         then right(regexp_replace(split_part(lower(f.phone),'x',1),'\D','','g'),10) end ph,
    lower(trim(f.name)) nm,
    coalesce(f.address,'') raw_street
  from public.facilities f left join sm on sm.full_name = f.state),
s as (select s0.*, nullif(trim(regexp_replace(
  regexp_replace(regexp_replace(regexp_replace(regexp_replace(regexp_replace(regexp_replace(regexp_replace(regexp_replace(regexp_replace(regexp_replace(regexp_replace(regexp_replace(regexp_replace(regexp_replace(
  regexp_replace(regexp_replace(lower(split_part(raw_street, ',', 1)), '[^a-z0-9 ]', ' ', 'g'), '\m(suite|ste|unit|apt|room|rm|bldg|building|floor|fl)\M.*$', '', 'g'),
  '\mnorth\M','n','g'),'\msouth\M','s','g'),'\meast\M','e','g'),'\mwest\M','w','g'),
  '\mstreet\M','st','g'),'\mavenue\M','ave','g'),'\mroad\M','rd','g'),'\mboulevard\M','blvd','g'),'\mdrive\M','dr','g'),'\mlane\M','ln','g'),'\mhighway\M','hwy','g'),'\mparkway\M','pkwy','g'),'\mcourt\M','ct','g'),'\mplace\M','pl','g'),
  '\s+',' ','g')),'') addr from s0),
l as (select l0.*, nullif(trim(regexp_replace(
  regexp_replace(regexp_replace(regexp_replace(regexp_replace(regexp_replace(regexp_replace(regexp_replace(regexp_replace(regexp_replace(regexp_replace(regexp_replace(regexp_replace(regexp_replace(regexp_replace(
  regexp_replace(regexp_replace(lower(split_part(raw_street, ',', 1)), '[^a-z0-9 ]', ' ', 'g'), '\m(suite|ste|unit|apt|room|rm|bldg|building|floor|fl)\M.*$', '', 'g'),
  '\mnorth\M','n','g'),'\msouth\M','s','g'),'\meast\M','e','g'),'\mwest\M','w','g'),
  '\mstreet\M','st','g'),'\mavenue\M','ave','g'),'\mroad\M','rd','g'),'\mboulevard\M','blvd','g'),'\mdrive\M','dr','g'),'\mlane\M','ln','g'),'\mhighway\M','hwy','g'),'\mparkway\M','pkwy','g'),'\mcourt\M','ct','g'),'\mplace\M','pl','g'),
  '\s+',' ','g')),'') addr from l0),
sf as (
  select s.*,
    (exists (select 1 from l where l.ph = s.ph and l.st = s.state)
     or exists (select 1 from l where (l.nm = s.nm or l.nm = s.nm_full) and l.z5 = s.z5)
     or exists (select 1 from l where l.addr = s.addr and l.z5 = s.z5)
     or exists (select 1 from public.facility_match_clusters c join public.facilities f on f.id = c.promoted_to_facility_id where c.id = s.cluster_id)) matched,
    (select e->>'f3' from jsonb_array_elements(s.services) e where e->>'f2'='TC' limit 1) toc
  from s),
r as (
  select sf.*,
    toc ilike '%Substance use treatment%' su,
    z5 ~ '^\d{5}$' zip_ok, addr is not null street_ok, coalesce(trim(city),'')<>'' city_ok,
    state in (select abbr from sm where abbr not in ('PR','GU','VI','AS','MP')) st50dc,
    ph is not null phone_ok, (latitude is not null and longitude is not null) ll_ok
  from sf),
ent as (
  select mk, bool_or(matched) matched,
    bool_or(su and zip_ok and street_ok and city_ok and st50dc and phone_ok) usable
  from r group by mk)
, fr as (
  select r.mk, r.id, e.matched, e.usable, el->>'f2' f2
  from r join ent e using (mk), jsonb_array_elements(r.services || r.insurance) el)
select f2,
  count(distinct id) all_rows, round(100.0*count(distinct id)/14726,1) pct_all_rows,
  count(distinct mk) filter (where not matched) new_ent, round(100.0*count(distinct mk) filter (where not matched)/9916,1) pct_new,
  count(distinct mk) filter (where not matched and usable) usable_ent, round(100.0*count(distinct mk) filter (where not matched and usable)/7434,1) pct_usable
from fr group by f2 order by all_rows desc;
```
### Q5.2 value counts for SET, OT, OM, AGE, SN, FOP, DETOX, PYAS (Prefix A, then the shared tail)
```sql
with sm(abbr, full_name) as (values ('AL','Alabama'),('AK','Alaska'),('AZ','Arizona'),('AR','Arkansas'),('CA','California'),('CO','Colorado'),('CT','Connecticut'),('DE','Delaware'),('DC','District of Columbia'),('FL','Florida'),('GA','Georgia'),('HI','Hawaii'),('ID','Idaho'),('IL','Illinois'),('IN','Indiana'),('IA','Iowa'),('KS','Kansas'),('KY','Kentucky'),('LA','Louisiana'),('ME','Maine'),('MD','Maryland'),('MA','Massachusetts'),('MI','Michigan'),('MN','Minnesota'),('MS','Mississippi'),('MO','Missouri'),('MT','Montana'),('NE','Nebraska'),('NV','Nevada'),('NH','New Hampshire'),('NJ','New Jersey'),('NM','New Mexico'),('NY','New York'),('NC','North Carolina'),('ND','North Dakota'),('OH','Ohio'),('OK','Oklahoma'),('OR','Oregon'),('PA','Pennsylvania'),('RI','Rhode Island'),('SC','South Carolina'),('SD','South Dakota'),('TN','Tennessee'),('TX','Texas'),('UT','Utah'),('VT','Vermont'),('VA','Virginia'),('WA','Washington'),('WV','West Virginia'),('WI','Wisconsin'),('WY','Wyoming'),('PR','Puerto Rico'),('GU','Guam'),('VI','Virgin Islands'),('AS','American Samoa'),('MP','Northern Mariana Islands')),
s0 as (
  select s.*, coalesce(s.match_key, 'row:'||s.id::text) mk,
    left(regexp_replace(coalesce(s.zip,''),'\D','','g'),5) z5,
    case when length(regexp_replace(split_part(lower(coalesce(s.phone,'')),'x',1),'\D','','g'))>=10
         then right(regexp_replace(split_part(lower(s.phone),'x',1),'\D','','g'),10) end ph,
    lower(trim(s.name)) nm,
    lower(trim(s.name || coalesce(' - '||nullif(trim(s.name_alt),''),''))) nm_full,
    coalesce(s.street,'') raw_street
  from public.staged_samhsa s),
l0 as (
  select f.*, sm.abbr st,
    left(regexp_replace(coalesce(f.zip_code,''),'\D','','g'),5) z5,
    case when length(regexp_replace(split_part(lower(coalesce(f.phone,'')),'x',1),'\D','','g'))>=10
         then right(regexp_replace(split_part(lower(f.phone),'x',1),'\D','','g'),10) end ph,
    lower(trim(f.name)) nm,
    coalesce(f.address,'') raw_street
  from public.facilities f left join sm on sm.full_name = f.state),
s as (select s0.*, nullif(trim(regexp_replace(
  regexp_replace(regexp_replace(regexp_replace(regexp_replace(regexp_replace(regexp_replace(regexp_replace(regexp_replace(regexp_replace(regexp_replace(regexp_replace(regexp_replace(regexp_replace(regexp_replace(
  regexp_replace(regexp_replace(lower(split_part(raw_street, ',', 1)), '[^a-z0-9 ]', ' ', 'g'), '\m(suite|ste|unit|apt|room|rm|bldg|building|floor|fl)\M.*$', '', 'g'),
  '\mnorth\M','n','g'),'\msouth\M','s','g'),'\meast\M','e','g'),'\mwest\M','w','g'),
  '\mstreet\M','st','g'),'\mavenue\M','ave','g'),'\mroad\M','rd','g'),'\mboulevard\M','blvd','g'),'\mdrive\M','dr','g'),'\mlane\M','ln','g'),'\mhighway\M','hwy','g'),'\mparkway\M','pkwy','g'),'\mcourt\M','ct','g'),'\mplace\M','pl','g'),
  '\s+',' ','g')),'') addr from s0),
l as (select l0.*, nullif(trim(regexp_replace(
  regexp_replace(regexp_replace(regexp_replace(regexp_replace(regexp_replace(regexp_replace(regexp_replace(regexp_replace(regexp_replace(regexp_replace(regexp_replace(regexp_replace(regexp_replace(regexp_replace(
  regexp_replace(regexp_replace(lower(split_part(raw_street, ',', 1)), '[^a-z0-9 ]', ' ', 'g'), '\m(suite|ste|unit|apt|room|rm|bldg|building|floor|fl)\M.*$', '', 'g'),
  '\mnorth\M','n','g'),'\msouth\M','s','g'),'\meast\M','e','g'),'\mwest\M','w','g'),
  '\mstreet\M','st','g'),'\mavenue\M','ave','g'),'\mroad\M','rd','g'),'\mboulevard\M','blvd','g'),'\mdrive\M','dr','g'),'\mlane\M','ln','g'),'\mhighway\M','hwy','g'),'\mparkway\M','pkwy','g'),'\mcourt\M','ct','g'),'\mplace\M','pl','g'),
  '\s+',' ','g')),'') addr from l0),
sf as (
  select s.*,
    (exists (select 1 from l where l.ph = s.ph and l.st = s.state)
     or exists (select 1 from l where (l.nm = s.nm or l.nm = s.nm_full) and l.z5 = s.z5)
     or exists (select 1 from l where l.addr = s.addr and l.z5 = s.z5)
     or exists (select 1 from public.facility_match_clusters c join public.facilities f on f.id = c.promoted_to_facility_id where c.id = s.cluster_id)) matched,
    (select e->>'f3' from jsonb_array_elements(s.services) e where e->>'f2'='TC' limit 1) toc
  from s),
r as (
  select sf.*,
    toc ilike '%Substance use treatment%' su,
    z5 ~ '^\d{5}$' zip_ok, addr is not null street_ok, coalesce(trim(city),'')<>'' city_ok,
    state in (select abbr from sm where abbr not in ('PR','GU','VI','AS','MP')) st50dc,
    ph is not null phone_ok, (latitude is not null and longitude is not null) ll_ok
  from sf),
ent as (
  select mk, bool_or(matched) matched,
    bool_or(su and zip_ok and street_ok and city_ok and st50dc and phone_ok) usable
  from r group by mk)
, fv as (
  select r.mk, r.id, e.matched, e.usable, el->>'f2' f2, trim(v) val
  from r join ent e using (mk), jsonb_array_elements(r.services || r.insurance) el, unnest(string_to_array(el->>'f3', ';')) v
  where el->>'f2' in ('SET','OT','OM','AGE','SN','FOP','DETOX','PYAS'))
select f2, val, count(distinct id) all_rows, count(distinct mk) filter (where not matched) new_ent, count(distinct mk) filter (where not matched and usable) usable_ent
from fv group by 1,2 order by 1, 3 desc;
```
### Q5.3 PAY (all values), SG (top 15), SL (Prefix A, then the shared tail)
```sql
with sm(abbr, full_name) as (values ('AL','Alabama'),('AK','Alaska'),('AZ','Arizona'),('AR','Arkansas'),('CA','California'),('CO','Colorado'),('CT','Connecticut'),('DE','Delaware'),('DC','District of Columbia'),('FL','Florida'),('GA','Georgia'),('HI','Hawaii'),('ID','Idaho'),('IL','Illinois'),('IN','Indiana'),('IA','Iowa'),('KS','Kansas'),('KY','Kentucky'),('LA','Louisiana'),('ME','Maine'),('MD','Maryland'),('MA','Massachusetts'),('MI','Michigan'),('MN','Minnesota'),('MS','Mississippi'),('MO','Missouri'),('MT','Montana'),('NE','Nebraska'),('NV','Nevada'),('NH','New Hampshire'),('NJ','New Jersey'),('NM','New Mexico'),('NY','New York'),('NC','North Carolina'),('ND','North Dakota'),('OH','Ohio'),('OK','Oklahoma'),('OR','Oregon'),('PA','Pennsylvania'),('RI','Rhode Island'),('SC','South Carolina'),('SD','South Dakota'),('TN','Tennessee'),('TX','Texas'),('UT','Utah'),('VT','Vermont'),('VA','Virginia'),('WA','Washington'),('WV','West Virginia'),('WI','Wisconsin'),('WY','Wyoming'),('PR','Puerto Rico'),('GU','Guam'),('VI','Virgin Islands'),('AS','American Samoa'),('MP','Northern Mariana Islands')),
s0 as (
  select s.*, coalesce(s.match_key, 'row:'||s.id::text) mk,
    left(regexp_replace(coalesce(s.zip,''),'\D','','g'),5) z5,
    case when length(regexp_replace(split_part(lower(coalesce(s.phone,'')),'x',1),'\D','','g'))>=10
         then right(regexp_replace(split_part(lower(s.phone),'x',1),'\D','','g'),10) end ph,
    lower(trim(s.name)) nm,
    lower(trim(s.name || coalesce(' - '||nullif(trim(s.name_alt),''),''))) nm_full,
    coalesce(s.street,'') raw_street
  from public.staged_samhsa s),
l0 as (
  select f.*, sm.abbr st,
    left(regexp_replace(coalesce(f.zip_code,''),'\D','','g'),5) z5,
    case when length(regexp_replace(split_part(lower(coalesce(f.phone,'')),'x',1),'\D','','g'))>=10
         then right(regexp_replace(split_part(lower(f.phone),'x',1),'\D','','g'),10) end ph,
    lower(trim(f.name)) nm,
    coalesce(f.address,'') raw_street
  from public.facilities f left join sm on sm.full_name = f.state),
s as (select s0.*, nullif(trim(regexp_replace(
  regexp_replace(regexp_replace(regexp_replace(regexp_replace(regexp_replace(regexp_replace(regexp_replace(regexp_replace(regexp_replace(regexp_replace(regexp_replace(regexp_replace(regexp_replace(regexp_replace(
  regexp_replace(regexp_replace(lower(split_part(raw_street, ',', 1)), '[^a-z0-9 ]', ' ', 'g'), '\m(suite|ste|unit|apt|room|rm|bldg|building|floor|fl)\M.*$', '', 'g'),
  '\mnorth\M','n','g'),'\msouth\M','s','g'),'\meast\M','e','g'),'\mwest\M','w','g'),
  '\mstreet\M','st','g'),'\mavenue\M','ave','g'),'\mroad\M','rd','g'),'\mboulevard\M','blvd','g'),'\mdrive\M','dr','g'),'\mlane\M','ln','g'),'\mhighway\M','hwy','g'),'\mparkway\M','pkwy','g'),'\mcourt\M','ct','g'),'\mplace\M','pl','g'),
  '\s+',' ','g')),'') addr from s0),
l as (select l0.*, nullif(trim(regexp_replace(
  regexp_replace(regexp_replace(regexp_replace(regexp_replace(regexp_replace(regexp_replace(regexp_replace(regexp_replace(regexp_replace(regexp_replace(regexp_replace(regexp_replace(regexp_replace(regexp_replace(
  regexp_replace(regexp_replace(lower(split_part(raw_street, ',', 1)), '[^a-z0-9 ]', ' ', 'g'), '\m(suite|ste|unit|apt|room|rm|bldg|building|floor|fl)\M.*$', '', 'g'),
  '\mnorth\M','n','g'),'\msouth\M','s','g'),'\meast\M','e','g'),'\mwest\M','w','g'),
  '\mstreet\M','st','g'),'\mavenue\M','ave','g'),'\mroad\M','rd','g'),'\mboulevard\M','blvd','g'),'\mdrive\M','dr','g'),'\mlane\M','ln','g'),'\mhighway\M','hwy','g'),'\mparkway\M','pkwy','g'),'\mcourt\M','ct','g'),'\mplace\M','pl','g'),
  '\s+',' ','g')),'') addr from l0),
sf as (
  select s.*,
    (exists (select 1 from l where l.ph = s.ph and l.st = s.state)
     or exists (select 1 from l where (l.nm = s.nm or l.nm = s.nm_full) and l.z5 = s.z5)
     or exists (select 1 from l where l.addr = s.addr and l.z5 = s.z5)
     or exists (select 1 from public.facility_match_clusters c join public.facilities f on f.id = c.promoted_to_facility_id where c.id = s.cluster_id)) matched,
    (select e->>'f3' from jsonb_array_elements(s.services) e where e->>'f2'='TC' limit 1) toc
  from s),
r as (
  select sf.*,
    toc ilike '%Substance use treatment%' su,
    z5 ~ '^\d{5}$' zip_ok, addr is not null street_ok, coalesce(trim(city),'')<>'' city_ok,
    state in (select abbr from sm where abbr not in ('PR','GU','VI','AS','MP')) st50dc,
    ph is not null phone_ok, (latitude is not null and longitude is not null) ll_ok
  from sf),
ent as (
  select mk, bool_or(matched) matched,
    bool_or(su and zip_ok and street_ok and city_ok and st50dc and phone_ok) usable
  from r group by mk)
, fv as (
  select r.mk, r.id, e.matched, e.usable, el->>'f2' f2, trim(v) val
  from r join ent e using (mk), jsonb_array_elements(r.services || r.insurance) el, unnest(string_to_array(el->>'f3', ';')) v
  where el->>'f2' in ('PAY','SG','SL')),
agg as (select f2, val, count(distinct id) all_rows, count(distinct mk) filter (where not matched) new_ent, count(distinct mk) filter (where not matched and usable) usable_ent,
  row_number() over (partition by f2 order by count(distinct id) desc) rn
from fv group by 1,2)
select f2, val, all_rows, new_ent, usable_ent from agg where (f2='SG' and rn<=15) or f2='PAY' or (f2='SL' and rn<=6) order by f2, all_rows desc;
```
### Q5.4 derived flags: OTP/methadone, buprenorphine, residential/inpatient, detox, Spanish, payment assistance, ownership (Prefix A, then the shared tail)
This query's `sex_both` column has a bug: `ilike '%Male%'` also matches "Female". Use Q5.5 and Q4.2 for sex counts. The `male_only` and `female_only` columns here are correct.
```sql
with sm(abbr, full_name) as (values ('AL','Alabama'),('AK','Alaska'),('AZ','Arizona'),('AR','Arkansas'),('CA','California'),('CO','Colorado'),('CT','Connecticut'),('DE','Delaware'),('DC','District of Columbia'),('FL','Florida'),('GA','Georgia'),('HI','Hawaii'),('ID','Idaho'),('IL','Illinois'),('IN','Indiana'),('IA','Iowa'),('KS','Kansas'),('KY','Kentucky'),('LA','Louisiana'),('ME','Maine'),('MD','Maryland'),('MA','Massachusetts'),('MI','Michigan'),('MN','Minnesota'),('MS','Mississippi'),('MO','Missouri'),('MT','Montana'),('NE','Nebraska'),('NV','Nevada'),('NH','New Hampshire'),('NJ','New Jersey'),('NM','New Mexico'),('NY','New York'),('NC','North Carolina'),('ND','North Dakota'),('OH','Ohio'),('OK','Oklahoma'),('OR','Oregon'),('PA','Pennsylvania'),('RI','Rhode Island'),('SC','South Carolina'),('SD','South Dakota'),('TN','Tennessee'),('TX','Texas'),('UT','Utah'),('VT','Vermont'),('VA','Virginia'),('WA','Washington'),('WV','West Virginia'),('WI','Wisconsin'),('WY','Wyoming'),('PR','Puerto Rico'),('GU','Guam'),('VI','Virgin Islands'),('AS','American Samoa'),('MP','Northern Mariana Islands')),
s0 as (
  select s.*, coalesce(s.match_key, 'row:'||s.id::text) mk,
    left(regexp_replace(coalesce(s.zip,''),'\D','','g'),5) z5,
    case when length(regexp_replace(split_part(lower(coalesce(s.phone,'')),'x',1),'\D','','g'))>=10
         then right(regexp_replace(split_part(lower(s.phone),'x',1),'\D','','g'),10) end ph,
    lower(trim(s.name)) nm,
    lower(trim(s.name || coalesce(' - '||nullif(trim(s.name_alt),''),''))) nm_full,
    coalesce(s.street,'') raw_street
  from public.staged_samhsa s),
l0 as (
  select f.*, sm.abbr st,
    left(regexp_replace(coalesce(f.zip_code,''),'\D','','g'),5) z5,
    case when length(regexp_replace(split_part(lower(coalesce(f.phone,'')),'x',1),'\D','','g'))>=10
         then right(regexp_replace(split_part(lower(f.phone),'x',1),'\D','','g'),10) end ph,
    lower(trim(f.name)) nm,
    coalesce(f.address,'') raw_street
  from public.facilities f left join sm on sm.full_name = f.state),
s as (select s0.*, nullif(trim(regexp_replace(
  regexp_replace(regexp_replace(regexp_replace(regexp_replace(regexp_replace(regexp_replace(regexp_replace(regexp_replace(regexp_replace(regexp_replace(regexp_replace(regexp_replace(regexp_replace(regexp_replace(
  regexp_replace(regexp_replace(lower(split_part(raw_street, ',', 1)), '[^a-z0-9 ]', ' ', 'g'), '\m(suite|ste|unit|apt|room|rm|bldg|building|floor|fl)\M.*$', '', 'g'),
  '\mnorth\M','n','g'),'\msouth\M','s','g'),'\meast\M','e','g'),'\mwest\M','w','g'),
  '\mstreet\M','st','g'),'\mavenue\M','ave','g'),'\mroad\M','rd','g'),'\mboulevard\M','blvd','g'),'\mdrive\M','dr','g'),'\mlane\M','ln','g'),'\mhighway\M','hwy','g'),'\mparkway\M','pkwy','g'),'\mcourt\M','ct','g'),'\mplace\M','pl','g'),
  '\s+',' ','g')),'') addr from s0),
l as (select l0.*, nullif(trim(regexp_replace(
  regexp_replace(regexp_replace(regexp_replace(regexp_replace(regexp_replace(regexp_replace(regexp_replace(regexp_replace(regexp_replace(regexp_replace(regexp_replace(regexp_replace(regexp_replace(regexp_replace(
  regexp_replace(regexp_replace(lower(split_part(raw_street, ',', 1)), '[^a-z0-9 ]', ' ', 'g'), '\m(suite|ste|unit|apt|room|rm|bldg|building|floor|fl)\M.*$', '', 'g'),
  '\mnorth\M','n','g'),'\msouth\M','s','g'),'\meast\M','e','g'),'\mwest\M','w','g'),
  '\mstreet\M','st','g'),'\mavenue\M','ave','g'),'\mroad\M','rd','g'),'\mboulevard\M','blvd','g'),'\mdrive\M','dr','g'),'\mlane\M','ln','g'),'\mhighway\M','hwy','g'),'\mparkway\M','pkwy','g'),'\mcourt\M','ct','g'),'\mplace\M','pl','g'),
  '\s+',' ','g')),'') addr from l0),
sf as (
  select s.*,
    (exists (select 1 from l where l.ph = s.ph and l.st = s.state)
     or exists (select 1 from l where (l.nm = s.nm or l.nm = s.nm_full) and l.z5 = s.z5)
     or exists (select 1 from l where l.addr = s.addr and l.z5 = s.z5)
     or exists (select 1 from public.facility_match_clusters c join public.facilities f on f.id = c.promoted_to_facility_id where c.id = s.cluster_id)) matched,
    (select e->>'f3' from jsonb_array_elements(s.services) e where e->>'f2'='TC' limit 1) toc
  from s),
r as (
  select sf.*,
    toc ilike '%Substance use treatment%' su,
    z5 ~ '^\d{5}$' zip_ok, addr is not null street_ok, coalesce(trim(city),'')<>'' city_ok,
    state in (select abbr from sm where abbr not in ('PR','GU','VI','AS','MP')) st50dc,
    ph is not null phone_ok, (latitude is not null and longitude is not null) ll_ok
  from sf),
ent as (
  select mk, bool_or(matched) matched,
    bool_or(su and zip_ok and street_ok and city_ok and st50dc and phone_ok) usable
  from r group by mk)
,
rf as (
  select r.id, r.mk, e.matched, e.usable,
    coalesce((select string_agg(x->>'f3', '; ') from jsonb_array_elements(r.services) x where x->>'f2'='SET'),'') set_,
    coalesce((select string_agg(x->>'f3', '; ') from jsonb_array_elements(r.services) x where x->>'f2' in ('OT','OM')),'') ot_,
    coalesce((select string_agg(x->>'f3', '; ') from jsonb_array_elements(r.services) x where x->>'f2'='SN'),'') sn_,
    coalesce((select string_agg(x->>'f3', '; ') from jsonb_array_elements(r.services) x where x->>'f2'='FOP'),'') fop_,
    coalesce((select string_agg(x->>'f3', '; ') from jsonb_array_elements(r.services) x where x->>'f2'='SL'),'') sl_,
    coalesce((select string_agg(x->>'f3', '; ') from jsonb_array_elements(r.insurance) x where x->>'f2'='PYAS'),'') pyas_,
    exists (select 1 from jsonb_array_elements(r.services) x where x->>'f2'='DETOX') detox_facet,
    coalesce(r.toc,'') ilike '%Detoxification%' toc_detox
  from r join ent e using (mk)),
fl as (
  select *, (ot_ ilike '%Federally-certified Opioid Treatment Program%') otp,
    (ot_ ilike '%methadone maintenance%' or ot_ ilike '%methadone detoxification%' or ot_ ilike '%Methadone used in Treatment%') methadone,
    (ot_ ilike '%buprenorphine%') bup,
    (set_ ilike '%residential%') resid, (set_ ilike '%Hospital inpatient%') inpt,
    (sn_ ilike '%Male%' and sn_ ilike '%Female%') sex_both, (sn_ <> '' and sn_ not ilike '%Female%') male_only, (sn_ ilike '%Female%' and sn_ not ilike '%; Male%' and sn_ not ilike 'Male%') female_only,
    (fop_ ilike 'Private%') priv, (fop_ <> '' and fop_ not ilike 'Private%') publ, (fop_ ilike '%Veterans Affairs%' or fop_ ilike '%Department of Defense%') va_dod,
    (sl_ ilike '%Spanish%' and sl_ not ilike '%excluding Spanish%' or sl_ ~ '(^|; )Spanish') spanish,
    (pyas_ ilike '%Sliding fee%') sliding, (pyas_ ilike '%Payment assistance%') pay_assist
  from rf)
select 'all_staged_rows' grp, count(*) n,
 count(*) filter (where otp) otp, count(*) filter (where methadone) methadone, count(*) filter (where otp or methadone) otp_or_methadone, count(*) filter (where bup) buprenorphine,
 count(*) filter (where resid) residential, count(*) filter (where inpt) hospital_inpatient, count(*) filter (where resid or inpt) resid_or_inpatient,
 count(*) filter (where detox_facet) detox_facet, count(*) filter (where detox_facet or toc_detox) detox_facet_or_toc,
 count(*) filter (where sex_both) sex_both, count(*) filter (where male_only) male_only, count(*) filter (where female_only) female_only,
 count(*) filter (where priv) private, count(*) filter (where publ) public_govt, count(*) filter (where va_dod) va_or_dod,
 count(*) filter (where spanish) spanish, count(*) filter (where sliding) sliding_fee, count(*) filter (where pay_assist) payment_assist, count(*) filter (where sliding or pay_assist) sliding_or_assist
from fl
union all
select g, count(*), count(*) filter (where otp), count(*) filter (where methadone), count(*) filter (where otp or methadone), count(*) filter (where bup),
 count(*) filter (where resid), count(*) filter (where inpt), count(*) filter (where resid or inpt), count(*) filter (where detox_facet), count(*) filter (where detox_facet or toc_detox),
 count(*) filter (where sex_both), count(*) filter (where male_only), count(*) filter (where female_only), count(*) filter (where priv), count(*) filter (where publ), count(*) filter (where va_dod),
 count(*) filter (where spanish), count(*) filter (where sliding), count(*) filter (where pay_assist), count(*) filter (where sliding or pay_assist)
from (
  select case when usable then 'usable_new_entities' else 'new_entities_not_usable' end g, mk,
   bool_or(otp) otp, bool_or(methadone) methadone, bool_or(bup) bup, bool_or(resid) resid, bool_or(inpt) inpt, bool_or(detox_facet) detox_facet, bool_or(toc_detox) toc_detox,
   bool_or(sex_both) sex_both, bool_and(male_only) male_only, bool_and(female_only) female_only, bool_or(priv) priv, bool_and(publ) publ, bool_or(va_dod) va_dod,
   bool_or(spanish) spanish, bool_or(sliding) sliding, bool_or(pay_assist) pay_assist
  from fl where not matched group by 1,2) e
group by g order by 1;
```
### Q5.5 sex accepted, corrected (all staged rows)
```sql
select count(*) filter (where sn ~* '(^|; )male($|;)' and sn ~* '(^|; )female($|;)') both_sexes,
 count(*) filter (where sn ~* '(^|; )male($|;)' and sn !~* '(^|; )female($|;)') male_only,
 count(*) filter (where sn ~* '(^|; )female($|;)' and sn !~* '(^|; )male($|;)') female_only,
 count(*) filter (where sn is null) no_sex_facet,
 count(*) filter (where sn is null and raw_payload->>'typeFacility'='MH') no_sex_facet_mh
from (select s.*, (select x->>'f3' from jsonb_array_elements(s.services) x where x->>'f2'='SN' limit 1) sn from public.staged_samhsa s) t;
```

### Q6.1 field-level data quality and shared domains
```sql
with d as (select website_domain, count(*) c, count(distinct coalesce(match_key,id::text)) dmk from public.staged_samhsa where website_domain is not null group by 1)
select (select count(*) from d where dmk>5) domains_gt5_entities, (select sum(c) from d where dmk>5) rows_on_those_domains, (select sum(dmk) from d where dmk>5) entities_on_those_domains,
 (select string_agg(website_domain||' ('||dmk||')', ', ' order by dmk desc) from (select * from d order by dmk desc limit 25) t) top25,
 (select count(*) from public.staged_samhsa where phone is null or trim(phone)='') phone_empty,
 (select count(*) from public.staged_samhsa where length(regexp_replace(split_part(lower(coalesce(phone,'')),'x',1),'\D','','g'))<10) phone_lt10_digits,
 (select count(*) from public.staged_samhsa where phone ~* 'x' ) phone_has_ext,
 (select count(*) from public.staged_samhsa where normalized_phone is null) normalized_phone_null,
 (select count(*) from public.staged_samhsa where website is null or trim(website) in ('','https://','http://')) website_missing_or_placeholder,
 (select count(*) from public.staged_samhsa where website_domain is null) website_domain_null,
 (select count(*) from public.staged_samhsa where street is null or trim(street)='') street_empty,
 (select count(*) from public.staged_samhsa where street ~* '(\mp\.?\s*o\.?\s*box\M|post office box|\mpob\s*\d)' or raw_payload->>'street2' ~* '(\mp\.?\s*o\.?\s*box\M|post office box)') po_box,
 (select count(*) from public.staged_samhsa where latitude is null or longitude is null) no_latlong,
 (select count(*) from public.staged_samhsa where (street is null or trim(street)='') and latitude is null) no_street_and_no_latlong;

select 'po' k, street||' | '||coalesce(raw_payload->>'street2','') v from public.staged_samhsa where street ~* '(\mp\.?\s*o\.?\s*box\M|post office box|\mpob\s*\d)' or raw_payload->>'street2' ~* '(\mp\.?\s*o\.?\s*box\M|post office box)' limit 8;
```
### Q6.2 name truncation and split names
```sql
select length(raw_payload->>'name1') len, count(*) from public.staged_samhsa group by 1 order by 1 desc limit 12;

select count(*) filter (where name ~* '(\s(at|of|and|for|the|in|de|del|la|to|on|with|&)|[-,/&(])\s*$') dangling_connector,
 count(*) filter (where name ~ '(\.\.\.|…)\s*$') ellipsis,
 count(*) filter (where length(raw_payload->>'name1')>=38) name1_len_ge38,
 count(*) filter (where length(raw_payload->>'name1')>=38 and coalesce(raw_payload->>'name2','')<>'') name1_len38_with_name2,
 count(*) filter (where name ~* '(\s(at|of|and|for|the|in|de|del|la|to|on|with|&)|[-,/&(])\s*$' and coalesce(name_alt,'')<>'') dangling_with_name2,
 count(*) filter (where name ~ '\(\s*[^)]*$') unbalanced_paren,
 (select string_agg(n, ' || ') from (select name||' / '||coalesce(name_alt,'') n from public.staged_samhsa where name ~* '(\s(at|of|and|for|the|in|de|del|la|to|on|with|&)|[-,/&(])\s*$' order by md5(id::text) limit 10) t) examples
from public.staged_samhsa;

select raw_payload->>'name1' n1, raw_payload->>'name2' n2 from public.staged_samhsa where length(raw_payload->>'name1')>=38 order by md5(id::text) limit 14;
```
### Q6.5 placeholder streets
```sql
select street, x from (select street, trim(regexp_replace(regexp_replace(lower(split_part(coalesce(street,''), ',', 1)), '[^a-z0-9 ]', ' ', 'g'), '\m(suite|ste|unit|apt|room|rm|bldg|building|floor|fl)\M.*$', '', 'g')) x from public.staged_samhsa where coalesce(trim(street),'')<>'') t where x = '' limit 30;
select count(*) n, count(*) filter (where latitude is null) no_ll, count(distinct coalesce(match_key, id::text)) entities from public.staged_samhsa where trim(street) = '- - -';
```
### Q6.3 staged vs live conflicts on matched pairs (Prefix A)
```sql
with sm(abbr, full_name) as (values ('AL','Alabama'),('AK','Alaska'),('AZ','Arizona'),('AR','Arkansas'),('CA','California'),('CO','Colorado'),('CT','Connecticut'),('DE','Delaware'),('DC','District of Columbia'),('FL','Florida'),('GA','Georgia'),('HI','Hawaii'),('ID','Idaho'),('IL','Illinois'),('IN','Indiana'),('IA','Iowa'),('KS','Kansas'),('KY','Kentucky'),('LA','Louisiana'),('ME','Maine'),('MD','Maryland'),('MA','Massachusetts'),('MI','Michigan'),('MN','Minnesota'),('MS','Mississippi'),('MO','Missouri'),('MT','Montana'),('NE','Nebraska'),('NV','Nevada'),('NH','New Hampshire'),('NJ','New Jersey'),('NM','New Mexico'),('NY','New York'),('NC','North Carolina'),('ND','North Dakota'),('OH','Ohio'),('OK','Oklahoma'),('OR','Oregon'),('PA','Pennsylvania'),('RI','Rhode Island'),('SC','South Carolina'),('SD','South Dakota'),('TN','Tennessee'),('TX','Texas'),('UT','Utah'),('VT','Vermont'),('VA','Virginia'),('WA','Washington'),('WV','West Virginia'),('WI','Wisconsin'),('WY','Wyoming'),('PR','Puerto Rico'),('GU','Guam'),('VI','Virgin Islands'),('AS','American Samoa'),('MP','Northern Mariana Islands')),
s0 as (
  select s.*, coalesce(s.match_key, 'row:'||s.id::text) mk,
    left(regexp_replace(coalesce(s.zip,''),'\D','','g'),5) z5,
    case when length(regexp_replace(split_part(lower(coalesce(s.phone,'')),'x',1),'\D','','g'))>=10
         then right(regexp_replace(split_part(lower(s.phone),'x',1),'\D','','g'),10) end ph,
    lower(trim(s.name)) nm,
    lower(trim(s.name || coalesce(' - '||nullif(trim(s.name_alt),''),''))) nm_full,
    coalesce(s.street,'') raw_street
  from public.staged_samhsa s),
l0 as (
  select f.*, sm.abbr st,
    left(regexp_replace(coalesce(f.zip_code,''),'\D','','g'),5) z5,
    case when length(regexp_replace(split_part(lower(coalesce(f.phone,'')),'x',1),'\D','','g'))>=10
         then right(regexp_replace(split_part(lower(f.phone),'x',1),'\D','','g'),10) end ph,
    lower(trim(f.name)) nm,
    coalesce(f.address,'') raw_street
  from public.facilities f left join sm on sm.full_name = f.state),
s as (select s0.*, nullif(trim(regexp_replace(
  regexp_replace(regexp_replace(regexp_replace(regexp_replace(regexp_replace(regexp_replace(regexp_replace(regexp_replace(regexp_replace(regexp_replace(regexp_replace(regexp_replace(regexp_replace(regexp_replace(
  regexp_replace(regexp_replace(lower(split_part(raw_street, ',', 1)), '[^a-z0-9 ]', ' ', 'g'), '\m(suite|ste|unit|apt|room|rm|bldg|building|floor|fl)\M.*$', '', 'g'),
  '\mnorth\M','n','g'),'\msouth\M','s','g'),'\meast\M','e','g'),'\mwest\M','w','g'),
  '\mstreet\M','st','g'),'\mavenue\M','ave','g'),'\mroad\M','rd','g'),'\mboulevard\M','blvd','g'),'\mdrive\M','dr','g'),'\mlane\M','ln','g'),'\mhighway\M','hwy','g'),'\mparkway\M','pkwy','g'),'\mcourt\M','ct','g'),'\mplace\M','pl','g'),
  '\s+',' ','g')),'') addr from s0),
l as (select l0.*, nullif(trim(regexp_replace(
  regexp_replace(regexp_replace(regexp_replace(regexp_replace(regexp_replace(regexp_replace(regexp_replace(regexp_replace(regexp_replace(regexp_replace(regexp_replace(regexp_replace(regexp_replace(regexp_replace(
  regexp_replace(regexp_replace(lower(split_part(raw_street, ',', 1)), '[^a-z0-9 ]', ' ', 'g'), '\m(suite|ste|unit|apt|room|rm|bldg|building|floor|fl)\M.*$', '', 'g'),
  '\mnorth\M','n','g'),'\msouth\M','s','g'),'\meast\M','e','g'),'\mwest\M','w','g'),
  '\mstreet\M','st','g'),'\mavenue\M','ave','g'),'\mroad\M','rd','g'),'\mboulevard\M','blvd','g'),'\mdrive\M','dr','g'),'\mlane\M','ln','g'),'\mhighway\M','hwy','g'),'\mparkway\M','pkwy','g'),'\mcourt\M','ct','g'),'\mplace\M','pl','g'),
  '\s+',' ','g')),'') addr from l0),
pairs as (
  select s.id sid, l.id lid,
    bool_or(l.ph = s.ph and l.st = s.state) by_phone,
    bool_or((l.nm = s.nm or l.nm = s.nm_full) and l.z5 = s.z5) by_name,
    bool_or(l.addr = s.addr and l.z5 = s.z5) by_street,
    bool_or(c.id is not null) by_cluster
  from s join l on (l.ph = s.ph and l.st = s.state) or ((l.nm = s.nm or l.nm = s.nm_full) and l.z5 = s.z5) or (l.addr = s.addr and l.z5 = s.z5)
     or exists (select 1 from public.facility_match_clusters c0 where c0.id = s.cluster_id and c0.promoted_to_facility_id = l.id)
  left join public.facility_match_clusters c on c.id = s.cluster_id and c.promoted_to_facility_id = l.id
  group by 1,2),
pd as (
  select p.*, s.ph sph, l.ph lph, s.addr saddr, l.addr laddr, s.z5 sz, l.z5 lz,
    nullif(split_part(regexp_replace(lower(trim(s.website)), '^https?://(www\.)?', ''), '/', 1),'') sdom,
    nullif(split_part(regexp_replace(lower(trim(coalesce(l.website,''))), '^https?://(www\.)?', ''), '/', 1),'') ldom
  from pairs p join s on s.id = p.sid join l on l.id = p.lid)
select count(*) pairs, count(distinct sid) staged_rows, count(distinct lid) live_rows,
 count(*) filter (where (by_name or by_street or by_cluster) and sph is distinct from lph) phone_differs_pairs,
 count(distinct lid) filter (where (by_name or by_street or by_cluster) and sph is distinct from lph) phone_differs_live,
 count(*) filter (where sdom is not null and ldom is not null and sdom <> ldom) web_differs_pairs,
 count(distinct lid) filter (where sdom is not null and ldom is not null and sdom <> ldom) web_differs_live,
 count(distinct lid) filter (where sdom is not null and ldom is null) live_missing_web_staged_has,
 count(*) filter (where by_phone and saddr is not null and laddr is not null and saddr <> laddr) street_differs_pairs_phone_matched,
 count(distinct lid) filter (where by_phone and saddr is not null and laddr is not null and saddr <> laddr) street_differs_live,
 count(*) filter (where by_phone and sz <> lz) phone_match_diff_zip_pairs,
 count(distinct lid) filter (where by_phone and sz <> lz) phone_match_diff_zip_live,
 count(*) filter (where by_cluster) cluster_pairs,
 count(*) filter (where by_cluster and sph is distinct from lph) cluster_phone_diff, count(*) filter (where by_cluster and sdom <> ldom) cluster_web_diff, count(*) filter (where by_cluster and saddr <> laddr) cluster_street_diff
from pd;
```
Note: the staged website domain comes from the raw `website`, with `https://` and `www.` stripped. A placeholder `https://` becomes an empty string, and `nullif` turns that into NULL.
### Q6.4 cluster conflict flags
```sql
select jsonb_typeof(conflicts) t, count(*), count(*) filter (where samhsa_count>0) with_samhsa,
 (select string_agg(distinct k, ', ') from public.facility_match_clusters c2, jsonb_object_keys(case when jsonb_typeof(c2.conflicts)='object' then c2.conflicts else '{}'::jsonb end) k) keys
from public.facility_match_clusters group by 1;

select count(*) filter (where samhsa_count>0) clusters_with_samhsa,
 count(*) filter (where samhsa_count>0 and (conflicts->>'multiple_names')::boolean) c_names,
 count(*) filter (where samhsa_count>0 and (conflicts->>'multiple_phones')::boolean) c_phones,
 count(*) filter (where samhsa_count>0 and (conflicts->>'multiple_streets')::boolean) c_streets,
 count(*) filter (where samhsa_count>0 and (conflicts->>'multiple_websites')::boolean) c_websites
from public.facility_match_clusters;
```

### Q7.1 closure keywords
```sql
select count(*) filter (where (name||' '||coalesce(name_alt,'')||' '||coalesce(street,'')) ~* '\m(closed|closing|inactive|defunct|temporarily|permanently|no longer|moved)\M') closure_words,
 count(*) filter (where raw_payload::text ~* '\m(closed|inactive|defunct)\M') raw_closure_words,
 (select string_agg(distinct status, ',') from public.staged_samhsa) statuses,
 (select string_agg(name||' / '||coalesce(name_alt,''), ' || ') from (select name, name_alt from public.staged_samhsa where (name||' '||coalesce(name_alt,'')||' '||coalesce(street,'')) ~* '\m(closed|closing|inactive|defunct|temporarily|permanently|no longer|moved)\M' limit 10) t) examples
from public.staged_samhsa;
```
### Q7.2 staged_directory status values
```sql
select source, accreditation_status, count(*), count(*) filter (where expiry_date < current_date) expired, min(scraped_at)::date, max(scraped_at)::date from public.staged_directory group by 1,2 order by 1,3 desc limit 30;
```
### Q7.3 staged_samhsa rows clustered with non-active directory records
```sql
select (select json_object_agg(accreditation_status, n) from (select accreditation_status, count(*) n from public.staged_directory group by 1) t) dir_status_counts,
 (select count(distinct s.id) from public.staged_samhsa s join public.staged_directory d on d.cluster_id = s.cluster_id where d.accreditation_status not in ('active','pending','active in renewal')) samhsa_rows_clustered_with_nonactive_dir,
 (select count(distinct s.id) from public.staged_samhsa s join public.staged_directory d on d.cluster_id = s.cluster_id where d.expiry_date < current_date) samhsa_rows_clustered_with_expired_dir,
 (select count(distinct s.id) from public.staged_samhsa s join public.staged_directory d on d.cluster_id = s.cluster_id) samhsa_rows_clustered_with_any_dir;
```
### Q7.4 breakdown of Q7.3
```sql
select d.accreditation_status, count(distinct s.id) samhsa_rows, count(distinct s.cluster_id) clusters
from public.staged_samhsa s join public.staged_directory d on d.cluster_id = s.cluster_id
where d.accreditation_status <> 'active' group by 1 order by 2 desc;
```

### Q8.1 per-state and per-city impact, plus residual duplicates among usable (Prefix A, then the shared tail)
```sql
with sm(abbr, full_name) as (values ('AL','Alabama'),('AK','Alaska'),('AZ','Arizona'),('AR','Arkansas'),('CA','California'),('CO','Colorado'),('CT','Connecticut'),('DE','Delaware'),('DC','District of Columbia'),('FL','Florida'),('GA','Georgia'),('HI','Hawaii'),('ID','Idaho'),('IL','Illinois'),('IN','Indiana'),('IA','Iowa'),('KS','Kansas'),('KY','Kentucky'),('LA','Louisiana'),('ME','Maine'),('MD','Maryland'),('MA','Massachusetts'),('MI','Michigan'),('MN','Minnesota'),('MS','Mississippi'),('MO','Missouri'),('MT','Montana'),('NE','Nebraska'),('NV','Nevada'),('NH','New Hampshire'),('NJ','New Jersey'),('NM','New Mexico'),('NY','New York'),('NC','North Carolina'),('ND','North Dakota'),('OH','Ohio'),('OK','Oklahoma'),('OR','Oregon'),('PA','Pennsylvania'),('RI','Rhode Island'),('SC','South Carolina'),('SD','South Dakota'),('TN','Tennessee'),('TX','Texas'),('UT','Utah'),('VT','Vermont'),('VA','Virginia'),('WA','Washington'),('WV','West Virginia'),('WI','Wisconsin'),('WY','Wyoming'),('PR','Puerto Rico'),('GU','Guam'),('VI','Virgin Islands'),('AS','American Samoa'),('MP','Northern Mariana Islands')),
s0 as (
  select s.*, coalesce(s.match_key, 'row:'||s.id::text) mk,
    left(regexp_replace(coalesce(s.zip,''),'\D','','g'),5) z5,
    case when length(regexp_replace(split_part(lower(coalesce(s.phone,'')),'x',1),'\D','','g'))>=10
         then right(regexp_replace(split_part(lower(s.phone),'x',1),'\D','','g'),10) end ph,
    lower(trim(s.name)) nm,
    lower(trim(s.name || coalesce(' - '||nullif(trim(s.name_alt),''),''))) nm_full,
    coalesce(s.street,'') raw_street
  from public.staged_samhsa s),
l0 as (
  select f.*, sm.abbr st,
    left(regexp_replace(coalesce(f.zip_code,''),'\D','','g'),5) z5,
    case when length(regexp_replace(split_part(lower(coalesce(f.phone,'')),'x',1),'\D','','g'))>=10
         then right(regexp_replace(split_part(lower(f.phone),'x',1),'\D','','g'),10) end ph,
    lower(trim(f.name)) nm,
    coalesce(f.address,'') raw_street
  from public.facilities f left join sm on sm.full_name = f.state),
s as (select s0.*, nullif(trim(regexp_replace(
  regexp_replace(regexp_replace(regexp_replace(regexp_replace(regexp_replace(regexp_replace(regexp_replace(regexp_replace(regexp_replace(regexp_replace(regexp_replace(regexp_replace(regexp_replace(regexp_replace(
  regexp_replace(regexp_replace(lower(split_part(raw_street, ',', 1)), '[^a-z0-9 ]', ' ', 'g'), '\m(suite|ste|unit|apt|room|rm|bldg|building|floor|fl)\M.*$', '', 'g'),
  '\mnorth\M','n','g'),'\msouth\M','s','g'),'\meast\M','e','g'),'\mwest\M','w','g'),
  '\mstreet\M','st','g'),'\mavenue\M','ave','g'),'\mroad\M','rd','g'),'\mboulevard\M','blvd','g'),'\mdrive\M','dr','g'),'\mlane\M','ln','g'),'\mhighway\M','hwy','g'),'\mparkway\M','pkwy','g'),'\mcourt\M','ct','g'),'\mplace\M','pl','g'),
  '\s+',' ','g')),'') addr from s0),
l as (select l0.*, nullif(trim(regexp_replace(
  regexp_replace(regexp_replace(regexp_replace(regexp_replace(regexp_replace(regexp_replace(regexp_replace(regexp_replace(regexp_replace(regexp_replace(regexp_replace(regexp_replace(regexp_replace(regexp_replace(
  regexp_replace(regexp_replace(lower(split_part(raw_street, ',', 1)), '[^a-z0-9 ]', ' ', 'g'), '\m(suite|ste|unit|apt|room|rm|bldg|building|floor|fl)\M.*$', '', 'g'),
  '\mnorth\M','n','g'),'\msouth\M','s','g'),'\meast\M','e','g'),'\mwest\M','w','g'),
  '\mstreet\M','st','g'),'\mavenue\M','ave','g'),'\mroad\M','rd','g'),'\mboulevard\M','blvd','g'),'\mdrive\M','dr','g'),'\mlane\M','ln','g'),'\mhighway\M','hwy','g'),'\mparkway\M','pkwy','g'),'\mcourt\M','ct','g'),'\mplace\M','pl','g'),
  '\s+',' ','g')),'') addr from l0),
sf as (
  select s.*,
    (exists (select 1 from l where l.ph = s.ph and l.st = s.state)
     or exists (select 1 from l where (l.nm = s.nm or l.nm = s.nm_full) and l.z5 = s.z5)
     or exists (select 1 from l where l.addr = s.addr and l.z5 = s.z5)
     or exists (select 1 from public.facility_match_clusters c join public.facilities f on f.id = c.promoted_to_facility_id where c.id = s.cluster_id)) matched,
    (select e->>'f3' from jsonb_array_elements(s.services) e where e->>'f2'='TC' limit 1) toc
  from s),
r as (
  select sf.*,
    toc ilike '%Substance use treatment%' su,
    z5 ~ '^\d{5}$' zip_ok, addr is not null street_ok, coalesce(trim(city),'')<>'' city_ok,
    state in (select abbr from sm where abbr not in ('PR','GU','VI','AS','MP')) st50dc,
    ph is not null phone_ok, (latitude is not null and longitude is not null) ll_ok
  from sf),
ent as (
  select mk, bool_or(matched) matched,
    bool_or(su and zip_ok and street_ok and city_ok and st50dc and phone_ok) usable
  from r group by mk),
rep as (
  select distinct on (r.mk) r.* from r join ent e on e.mk = r.mk and not e.matched and e.usable
  where r.su and r.zip_ok and r.street_ok and r.city_ok and r.st50dc and r.phone_ok
  order by r.mk, (r.raw_payload->>'typeFacility'='SA') desc, jsonb_array_length(r.services) desc, r.id),
live_pub as (select * from l where status='approved' and not coalesce(suspended,false)),
st_live as (select st, count(*) n from live_pub group by st),
st_new as (select state st, count(*) n from rep group by state),
st as (select coalesce(a.st,b.st) st, coalesce(a.n,0) live, coalesce(b.n,0) new_usable from st_live a full join st_new b on a.st=b.st),
c_live as (select lower(trim(city)) city, st, count(*) n from live_pub group by 1,2),
c_new as (select lower(trim(city)) city, state st, count(*) n from rep group by 1,2),
c as (select coalesce(a.city,b.city) city, coalesce(a.st,b.st) st, coalesce(a.n,0) live, coalesce(b.n,0) new_usable from c_live a full join c_new b on a.city=b.city and a.st=b.st)
select json_build_object(
 'rep_rows', (select count(*) from rep),
 'distinct_name_zip_among_usable', (select count(distinct (nm, z5)) from rep),
 'distinct_addr_zip_among_usable', (select count(distinct (addr, z5)) from rep),
 'distinct_name_addr_zip_collapsed', (select count(*) from (select distinct nm, addr, z5 from rep) t),
 'states_top15_by_live', (select json_agg(x order by live desc, st) from (select st, live, new_usable, live+new_usable total, round(100.0*new_usable/nullif(live,0)) pct_increase from st order by live desc, st limit 15) x),
 'states_top15_by_total', (select json_agg(x order by total desc) from (select st, live, new_usable, live+new_usable total from st order by live+new_usable desc limit 15) x),
 'state_totals', (select json_build_object('live_pub', sum(live), 'new_usable', sum(new_usable)) from st),
 'cities_live', (select count(*) from c where live>0),
 'cities_after', (select count(*) from c where live+new_usable>0),
 'new_cities_zero_to_ge1', (select count(*) from c where live=0 and new_usable>0),
 'lt3_to_ge3', (select count(*) from c where live<3 and live+new_usable>=3),
 'lt3_to_ge3_from_zero', (select count(*) from c where live=0 and live+new_usable>=3),
 'lt5_to_ge5', (select count(*) from c where live<5 and live+new_usable>=5),
 'lt5_to_ge5_from_zero', (select count(*) from c where live=0 and live+new_usable>=5),
 'cities_ge3_before', (select count(*) from c where live>=3), 'cities_ge3_after', (select count(*) from c where live+new_usable>=3),
 'cities_ge5_before', (select count(*) from c where live>=5), 'cities_ge5_after', (select count(*) from c where live+new_usable>=5),
 'top_city_gains', (select json_agg(x) from (select city, st, live, new_usable from c order by new_usable desc limit 10) x)
) res;
```

### Prefix A, shown on its own for reference
Prefix B is identical except it reads `s as materialized (` and `l as materialized (`.
```sql
with sm(abbr, full_name) as (values ('AL','Alabama'),('AK','Alaska'),('AZ','Arizona'),('AR','Arkansas'),('CA','California'),('CO','Colorado'),('CT','Connecticut'),('DE','Delaware'),('DC','District of Columbia'),('FL','Florida'),('GA','Georgia'),('HI','Hawaii'),('ID','Idaho'),('IL','Illinois'),('IN','Indiana'),('IA','Iowa'),('KS','Kansas'),('KY','Kentucky'),('LA','Louisiana'),('ME','Maine'),('MD','Maryland'),('MA','Massachusetts'),('MI','Michigan'),('MN','Minnesota'),('MS','Mississippi'),('MO','Missouri'),('MT','Montana'),('NE','Nebraska'),('NV','Nevada'),('NH','New Hampshire'),('NJ','New Jersey'),('NM','New Mexico'),('NY','New York'),('NC','North Carolina'),('ND','North Dakota'),('OH','Ohio'),('OK','Oklahoma'),('OR','Oregon'),('PA','Pennsylvania'),('RI','Rhode Island'),('SC','South Carolina'),('SD','South Dakota'),('TN','Tennessee'),('TX','Texas'),('UT','Utah'),('VT','Vermont'),('VA','Virginia'),('WA','Washington'),('WV','West Virginia'),('WI','Wisconsin'),('WY','Wyoming'),('PR','Puerto Rico'),('GU','Guam'),('VI','Virgin Islands'),('AS','American Samoa'),('MP','Northern Mariana Islands')),
s0 as (
  select s.*, coalesce(s.match_key, 'row:'||s.id::text) mk,
    left(regexp_replace(coalesce(s.zip,''),'\D','','g'),5) z5,
    case when length(regexp_replace(split_part(lower(coalesce(s.phone,'')),'x',1),'\D','','g'))>=10
         then right(regexp_replace(split_part(lower(s.phone),'x',1),'\D','','g'),10) end ph,
    lower(trim(s.name)) nm,
    lower(trim(s.name || coalesce(' - '||nullif(trim(s.name_alt),''),''))) nm_full,
    coalesce(s.street,'') raw_street
  from public.staged_samhsa s),
l0 as (
  select f.*, sm.abbr st,
    left(regexp_replace(coalesce(f.zip_code,''),'\D','','g'),5) z5,
    case when length(regexp_replace(split_part(lower(coalesce(f.phone,'')),'x',1),'\D','','g'))>=10
         then right(regexp_replace(split_part(lower(f.phone),'x',1),'\D','','g'),10) end ph,
    lower(trim(f.name)) nm,
    coalesce(f.address,'') raw_street
  from public.facilities f left join sm on sm.full_name = f.state),
s as (select s0.*, nullif(trim(regexp_replace(
  regexp_replace(regexp_replace(regexp_replace(regexp_replace(regexp_replace(regexp_replace(regexp_replace(regexp_replace(regexp_replace(regexp_replace(regexp_replace(regexp_replace(regexp_replace(regexp_replace(
  regexp_replace(regexp_replace(lower(split_part(raw_street, ',', 1)), '[^a-z0-9 ]', ' ', 'g'), '\m(suite|ste|unit|apt|room|rm|bldg|building|floor|fl)\M.*$', '', 'g'),
  '\mnorth\M','n','g'),'\msouth\M','s','g'),'\meast\M','e','g'),'\mwest\M','w','g'),
  '\mstreet\M','st','g'),'\mavenue\M','ave','g'),'\mroad\M','rd','g'),'\mboulevard\M','blvd','g'),'\mdrive\M','dr','g'),'\mlane\M','ln','g'),'\mhighway\M','hwy','g'),'\mparkway\M','pkwy','g'),'\mcourt\M','ct','g'),'\mplace\M','pl','g'),
  '\s+',' ','g')),'') addr from s0),
l as (select l0.*, nullif(trim(regexp_replace(
  regexp_replace(regexp_replace(regexp_replace(regexp_replace(regexp_replace(regexp_replace(regexp_replace(regexp_replace(regexp_replace(regexp_replace(regexp_replace(regexp_replace(regexp_replace(regexp_replace(
  regexp_replace(regexp_replace(lower(split_part(raw_street, ',', 1)), '[^a-z0-9 ]', ' ', 'g'), '\m(suite|ste|unit|apt|room|rm|bldg|building|floor|fl)\M.*$', '', 'g'),
  '\mnorth\M','n','g'),'\msouth\M','s','g'),'\meast\M','e','g'),'\mwest\M','w','g'),
  '\mstreet\M','st','g'),'\mavenue\M','ave','g'),'\mroad\M','rd','g'),'\mboulevard\M','blvd','g'),'\mdrive\M','dr','g'),'\mlane\M','ln','g'),'\mhighway\M','hwy','g'),'\mparkway\M','pkwy','g'),'\mcourt\M','ct','g'),'\mplace\M','pl','g'),
  '\s+',' ','g')),'') addr from l0),
chk as (select (select count(*) from s) staged_rows, (select count(*) from l) live_rows, (select count(*) from s where addr is null) s_addr_null, (select count(*) from l where st is null) l_state_unmapped)
select * from chk;  -- returned 14726 / 3810 / 714 / 0
```
