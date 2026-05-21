# Site Search — Phase 0 Audit (2026-05-21)

Branch: `claude/phase2-deployment-5WYOn`. Evidence gathered via live DB probes on the production Supabase project (`mldbxpntzcjalgjmwnqa`) and code inspection at the merge commit `8341ab2`.

## Executive summary

The platform's public search surfaces are fully wired (every public route shows a facility section), but **the filter→data mapping is broken in several places that silently exclude the majority of the ~3,800-facility catalog**. The pipeline itself is healthy:

```
hero/search bar → URL params → useStaticFacilities() → get-public-facilities edge fn
                                                      → public_facilities view
                                                      → 3,803 rows (status='approved', not suspended)
                                                      → in-memory filter + sort + paginate (12/page)
```

The view returns 3,803 rows; that exact count surfaces in the snapshot. Visibility is correct (1 unapproved + 16 implicitly hidden by claim gate). The bugs are in the filter mapping, the snapshot's field projection, and missing UI options for the most populated services.

## 1 — Data coverage probes (production)

```
facilities_total                       3820
facilities_approved                    3803
facilities_approved_not_suspended      3803
public_facilities_view                 3803
facilities_with_slug                   3803  (100%)
facilities_with_services               3123  (82%)
facilities_with_insurance              3082  (81%)
facilities_with_pending_claim_hidden      0
distinct_states                          53  (50 + DC + 2 raw 2-letter codes)
distinct_cities                        2028
```

The 3k+ catalog is intact and parses through `public_facilities` cleanly. ~700 facilities have no services; ~720 have no insurance. Those automatically fall out of any service- or insurance-filtered view; that is expected behavior.

## 2 — Filter coverage (live DB probes)

### 2.1 Treatment-type filter (5 UI options vs `facility_services`)
| UI filter (`SearchResults.tsx:111-115`) | Matches against | Facilities |
|---|---|---|
| detox | `Detox`, `Detoxification` | **727** ✓ |
| inpatient | `Inpatient`, `Inpatient/Residential`, `Residential` | **0** ✗ |
| outpatient | `Outpatient`, `Intensive Outpatient (IOP)`, `Partial Hospitalization (PHP)` | **2754** ✓ |
| dual-diagnosis | `Dual Diagnosis` | **1864** ✓ |
| holistic | `Holistic`, `Holistic Therapy` | **0** ✗ |

The actual top services in the data are:
- Cognitive Behavioral Therapy (CBT) — **2,949**
- Aftercare/Continuing Care — **2,434**
- Trauma Therapy — **2,254**
- Medication-Assisted Treatment (MAT) — **1,964**
- Dual Diagnosis — 1,864
- Outpatient — 1,441
- 12-Step Programs — 1,374
- Intensive Outpatient (IOP) — 1,307
- Detoxification — 727
- Partial Hospitalization (PHP) — 476
- Family Therapy — 399
- Group Therapy — 1

**`inpatient` and `holistic` are flagship UI options that always return zero**, and the most populated categories (CBT, MAT, Trauma, Aftercare, 12-Step) have **no UI surface at all**.

### 2.2 Insurance filter (11 UI options vs `facility_insurance`)
Using the SearchResults match rule `data.lower().includes(filterValue.lower()) OR data.lower().includes(filterLabel.lower())`:

| UI filter | UI label | Data label | Facilities |
|---|---|---|---|
| medicaid | Medicaid | "Medicaid" | **2759** ✓ |
| medicare | Medicare | "Medicare" | **1830** ✓ |
| tricare | TRICARE | "Tricare" | **1440** ✓ |
| **private-pay** | **Self-Pay / Private Pay** | **"Self-Pay/Private Pay"** | **0 of 2918** ✗ |
| aetna | Aetna | "Aetna" | 2 |
| cigna | Cigna | "Cigna" | 2 |
| humana | Humana | "Humana" | 1 |
| bcbs | Blue Cross Blue Shield | "Blue Cross Blue Shield" | 1 |
| anthem | Anthem | "Anthem Blue Cross" | 1 |
| **united** | **United Healthcare** | — | **0** ✗ |
| **kaiser** | **Kaiser Permanente** | — | **0** ✗ |

Hidden category with high coverage: **Sliding Scale/Financial Assistance — 1,738 facilities, no UI filter.**

**F1 (private-pay):** The biggest filter on the platform. Frontend label is "Self-Pay / Private Pay" (spaces around the slash); data is "Self-Pay/Private Pay" (no spaces). `"self-pay/private pay".includes("self-pay / private pay")` is `false`, and neither does the inverse. **2,918 facilities silently excluded.** Same bug exists in `RehabCenters.tsx:98-106` (`matchesInsurance` does bidirectional `includes` but still cannot bridge the whitespace gap).

### 2.3 Amenities filter (description-text only)
The UI offers Private Rooms / Gym / Pool / Meditation. Logic searches `description + treatmentTypes` concatenation (`SearchResults.tsx:443-464`). Live counts:

| amenity | matched facilities |
|---|---|
| private-rooms | 3 |
| gym | 1 |
| pool | 1 |
| meditation | 0 |

No `facility_amenities` table exists; descriptions are not authoritative. The amenities filter is effectively a no-op for the public catalog.

### 2.4 Verified / Featured / Pro flags
```
verified_true              3802 of 3803   (Verified filter ~no-op)
featured_true                 2 of 3803   (legacy override column)
is_pro_true                   0 of 3803   (no active Pro subscriptions)
featured_placements_active    0           (no live placements)
facility_subscriptions_active 0           (no paying customers yet)
is_claimed_true               2 of 3803
```

This is a **business state**, not a code bug. But the consequences:
- Pro-gated columns (`phone`, `email`, `website`) come back **NULL for all 3,803 rows** in the snapshot (the view's `CASE … is_pro …` masks them).
- The Featured rail (`HomepageGeoFeaturedRail`, `LandingFeaturedSection`) draws from `featured_placements` — currently 0 active rows everywhere. Rails are silent.
- `useStaticFacilities` line 64 overrides `featured` with `isPro` — since `isPro` is universally false, the snapshot's `featured` flag is discarded. Featured-only sort and badge logic both no-op.

### 2.5 State normalization
2 facilities carry 2-letter state codes (`Co`, `TX`) instead of full names. State pages, near-me pages, and the state-filter all key on full names — these rows are orphaned from state browsing. (Trivial backfill.)

### 2.6 Geo / distance
No `lat`/`lng` columns on `facilities`. `selectedDistance` (10/25/50/100 mi) maps onto categorical tiers via `getProximityTier` in `src/lib/proximitySearch.ts:230-271`:
- "Within 10 mi" → exact ZIP OR exact city only
- "Within 25 mi" → +same state
- "Within 50/100 mi" → +nearby state (hard-coded adjacency map)

Concretely, a Philadelphia search with "within 10 miles" cannot return Cherry Hill NJ (across state line, ~8 miles). This is a known limitation, documented at `SearchResults.tsx:476-486`. Phase 2/3 can add real Haversine if we backfill coordinates; out of scope for hotfixes.

## 3 — Edge function: `get-public-facilities`

`supabase/functions/get-public-facilities/index.ts:33-117`. It selects from `public_facilities` but **only 15 columns**, dropping fields the frontend reads:

| Read by frontend | In view? | In snapshot? |
|---|---|---|
| `calculated_ranking_score` | yes | **no** — sort tiebreak silently undefined |
| `is_pro` | yes | **no** — Pro badge cannot render |
| `featured_pinned` | yes | **no** |
| `bed_count`, `gender_served` | yes | **no** |
| `hours_of_operation`, `languages_spoken`, `accessibility_features`, `accepting_admissions` | yes (added 2026-07-09) | **no** |
| `email`, `website` | yes (Pro-masked) | **no** |
| `googleRating`, `googleReviewCount` | n/a (not on view) | n/a |
| `listing_completeness_score`, `response_rate_score` | yes | **no** |
| `data_source`, `accepts_international_patients` | yes | **no** |

Frontend then reads `facility.googleRating` / `facility.googleReviewCount` (`useStaticFacilities.ts:78-79`) which the view doesn't expose either; "Sort by reviews" therefore has no useful signal.

## 4 — Filter logic duplication

Three places define the same mapping with subtly different rules:

1. `src/pages/SearchResults.tsx:110-148` — `treatmentTypeFilters`, `insuranceFilters`, `amenityFilters`, `distanceFilters`
2. `src/pages/RehabCenters.tsx:62-84` — `BROWSE_TREATMENTS`, `BROWSE_INSURERS` (different `value`s — `iop`/`php`/`mental-health` only here, not on `/search-results`)
3. Implicitly: every near-me/treatment-hub page uses `useNearMeFacilities` / `StateFacilitiesSection`, each with its own ad-hoc filter regex.

A change in one place doesn't propagate. **Phase 2 will centralize this into `src/lib/searchFilters.ts`** with a single source of truth.

## 5 — Pagination & sort

- Page size 12, client-side slicing — correct.
- `currentPage = parseInt(searchParams.get("page") || "1")` — no clamp on the upper bound; deep links to `?page=99` for a 6-page result set render an empty grid (no out-of-range guard).
- Sort `proximity` (default): proximity tier → plan_priority → `calculatedRankingScore` (always undefined per §3) → id.
- Sort `reviews`: reads `googleReviewCount` which is undefined; sort is unstable.

## 6 — UI/UX states

`SearchResults.tsx:1459-1639` empty state is well-built (filter-clear chips, alternative-state links, popular-location links, concierge CTA). The bug is upstream: many empty-state renderings are caused by the broken filter mapping above, not by a true zero-match.

`/rehab-centers` has section blocks for Detox / Inpatient / Outpatient / Dual Diagnosis. With the bugs above, the **Inpatient block on `/rehab-centers` always renders empty** because the regex `/inpatient|residential/i` never matches any DB facility's `treatmentTypes`.

## 7 — Page coverage punch list

| Page | Facility section wired? | Notes |
|---|---|---|
| `/` (homepage) | yes (geo-targeted Featured rail) | empty in practice (0 active placements) — falls through to other sections |
| `/rehab-centers` | yes (Top Rated / Detox / **Inpatient (empty)** / Outpatient / Dual Diagnosis / Browse All) | Inpatient section silent due to F2 |
| `/rehab-centers/:state` | yes | |
| `/rehab-centers/:state/:city` | yes | |
| `/rehab-centers/:state/county/:county` | yes | |
| `/search-results` | yes | filters drive the bugs above |
| `/treatment-types/*` (12+ pages) | yes (via `StateFacilitiesSection`) | inpatient/holistic hubs return empty |
| `/*-near-me` (33 routes) | yes (via `useNearMeFacilities`) | |
| `/insurance/*` (16 pages) | **no facility listing by design** | informational coverage guides |
| `/account/search` (auth seeker) | yes | inherits SearchResults bugs |

**No pages have a missing facility section other than the insurance landing pages (intentional).** All zero-result complaints will trace to the filter mapping bugs in §2, not to absent renderers.

## 8 — Prioritized issue list

| ID | Severity | Issue | Surface | Fix phase |
|---|---|---|---|---|
| F1 | **CRITICAL** | `private-pay` filter never matches `Self-Pay/Private Pay` data (2,918 rows excluded) | SearchResults, RehabCenters | 1 |
| F2 | **CRITICAL** | `inpatient` filter returns 0 — no `Inpatient/Residential` rows in `facility_services` | SearchResults, RehabCenters, treatment hubs | 1 |
| F3 | High | `holistic` filter returns 0 — no `Holistic` rows | SearchResults, RehabCenters | 1 |
| F4 | High | Snapshot endpoint drops ranking, is_pro, hours, languages, accessibility, admissions, ranking_score | `get-public-facilities` | 1 |
| F5 | High | Stray 2-letter state codes `Co`, `TX` orphan facilities | data | 1 |
| F6 | Medium | Hidden services with high coverage (CBT 2,949 / MAT 1,964 / Trauma 2,254 / Aftercare 2,434 / 12-Step 1,374) have no UI filter | SearchResults, RehabCenters | 2 |
| F7 | Medium | Insurance filters `united`, `kaiser` always return 0; `aetna`/`cigna`/`humana`/`bcbs`/`anthem` ≤2 — no facet counts to warn | SearchResults, RehabCenters | 2 |
| F8 | Medium | Filter mapping duplicated across pages | search pages | 2 |
| F9 | Medium | `googleRating`/`googleReviewCount` read by client but never returned by snapshot → "Sort by reviews" no-ops | snapshot + view | 2 |
| F10 | Low | Amenity filter is description-text matching only; no `facility_amenities` table | data model | 3 (deferred) |
| F11 | Low | `?page=N` past end renders empty (no clamp) | SearchResults | 1 |
| F12 | Low | No facet counts on filter UI | UX | 2 |
| F13 | Low | No real Haversine distance | architecture | 3 (deferred, requires lat/lng backfill) |
| F14 | Low | All 3,800 rows in one ~12 MB JSON; no paginated API | architecture | 3 (deferred) |
| F15 | Low | `verified=true` is universal (3,802/3,803) → Verified-only filter is a no-op | data | 2 |

## 9 — Phased plan (executing this PR)

- **Phase 1 (this commit)** — F1, F2, F3, F4, F5, F11 + cache bust.
- **Phase 2 (this commit)** — F6, F7, F8, F9, F12, F15. Centralize filter mapping into `src/lib/searchFilters.ts`. Add facet counts. Surface CBT/MAT/Trauma/Aftercare/12-Step as filter options.
- **Phase 3 (deferred — flagged in fixes doc)** — F10 (amenities table), F13 (Haversine), F14 (server-side pagination + filtering). These are architectural and require migration + UX redesign; not launch blockers.
- **Phase 4** — already in place (empty states, clear chips, mobile drawer). Light polish only.
- **Phase 5** — smoke checklist appended to fixes doc; observability (zero-result query log, facet count parity) flagged as follow-up.

See `docs/search-fixes-2026-05-21.md` for the change log and residual risk per fix.
