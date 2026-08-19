# RehabLookup Phase 3A — Public Search Contract Audit

Starting `main`: `f31fd7dbf6155f2191fec09549bba8eee450e666` (re-fetched; no intervening commits).

Audit performed BEFORE any code change. Everything below describes `main` as it stood.

---

## 1. Public search entry points

| Surface | File | Writes |
|---|---|---|
| `/search-results` inline form | `src/components/search/SearchResultsForm.tsx` | `location`, `treatmentTypes` (single), `insuranceTypes` (single); deletes `distance`, `page` |
| `/search-results` sidebar + mobile sheet | `src/pages/SearchResults.tsx` | `treatmentTypes`, `insuranceTypes`, `amenities`, `verified`, `featuredOnly`, `sort`, `page` |
| Hero search form | `src/components/search/SearchForm.tsx` | `location`, **`treatment`** (comma list), **`insurance`** (comma list) |
| Inline mini search (SEO templates) | `src/components/seo/InlineMiniSearch.tsx` | `location`, **`treatment`** |
| 404 recovery box | `src/pages/NotFound.tsx` | `location`, **`treatment`**, **`insurance`**, `from=404` |
| Find-Treatment mega menu | `src/components/mega-menus/FindTreatmentMegaMenu.tsx` | `q` |
| Concierge → search redirect | `src/App.tsx` (`ConciergeToSearchRedirect`) | carries `location`, `treatment`, `insurance`, `state`, `q` |
| Browse page tiles | `src/pages/RehabCenters.tsx` | **`treatmentType`** (singular) ×8, `sort` |
| Holistic treatment page | `src/pages/treatment-types/HolisticTherapy.tsx` | **`type=holistic`** |
| Fentanyl near-me | `src/pages/near-me/FentanylRehabNearMe.tsx` | `state`, **`treatment=Detox`** (label, not slug) |
| Medicaid / Free near-me | `src/pages/near-me/{MedicaidRehabNearMe,FreeRehabNearMe}.tsx` | `state`, **`insurance=Medicaid`** (label) |
| Result card CTA | `src/components/cards/SearchResultCard.tsx` | `location` (exact `city, state`) |
| City/State/County/Comparison/Profile pages | various | `location` only |

## 2. Query params `SearchResults` READS

`location`, `treatment`, `insurance`, `type`, `state`, `q`, `page`, `sort`,
`treatmentTypes`, `insuranceTypes`, `amenities`, `verified`, `featuredOnly`, `from`.

`distance` is read by nothing (already inert). **`treatmentType` (singular) is read by nothing.**

## 3. Duplicate / legacy filter dimensions (defects)

1. **`treatment` AND `treatmentTypes` were two independent AND-ed constraints.**
   `?treatment=detox&treatmentTypes=outpatient` required detox AND outpatient — a
   hidden second filter no UI surface displayed.
2. **`insurance` AND `insuranceTypes`** — same defect.
3. **`type=` was a third, wholly hidden treatment dimension**, AND-ed on top of both
   of the above, never shown in the sidebar, chips, or active-filter count.
4. **`treatmentType` (singular) written 8× by `RehabCenters.tsx` is read by nobody.**
   `/search-results?treatmentType=detox` returned the entire unfiltered catalogue
   while the link promised detox facilities.
5. Legacy writers emit **labels**, not slugs (`treatment=Detox`, `insurance=Medicaid`).
   These happen to resolve through `resolveTreatmentFilterKey`'s label fallback.

## 4. Treatment UI state vs actual treatment membership

- Sidebar `Select` bound to `selectedTreatmentTypes[0]` — a multi-value URL rendered
  as if only the first value were active.
- `SearchResultsForm` read only `treatmentTypes.split(",")[0]` and on submit wrote
  that single value back, **silently destroying every other selected treatment**.
- `treatment=` and `type=` contributed to membership with **no UI representation at all**.

## 5. Insurance UI state vs actual insurance membership

- Sidebar multi-select toggle buttons were correct for `insuranceTypes`.
- `insurance=` (legacy) contributed to membership with no UI representation.
- `SearchResultsForm` collapsed multi-value `insuranceTypes` to its first value on submit.

## 6. `type=` behavior

`typeFilterMap` matched **raw service-name strings** with `c.treatmentTypes.includes(...)`:

```
drug / alcohol   → ["Detox","Inpatient","Outpatient"]
mental-health    → ["Dual Diagnosis"]
residential      → ["Inpatient"]
outpatient       → ["Outpatient"]
holistic         → ["Inpatient","Outpatient"]
```

Exact-string `includes` bypasses the canonical matcher entirely, so
`type=residential` **missed every `facility_type='Residential Treatment Center'`
record** (the production catalogue has zero `facility_services` rows named
`Inpatient`/`Residential` — the exact defect `TREATMENT_FILTERS.inpatient`'s
`facilityTypeMatches` fallback exists to fix). `type=residential` and
`treatmentTypes=inpatient` therefore returned different sets.

`type=holistic → ["Inpatient","Outpatient"]` is a pre-existing mapping defect
(holistic is neither) — **reported, preserved, deferred** (out of Phase 3A scope).

## 7. Amenities behavior

`?amenities=private-rooms|gym|pool|meditation` filtered membership by substring
inference over `description + treatmentTypes`:

- `pool` matched `pool` / `aqua` / `swimming` — matches "pooling", "carpool",
  "liverpool" in narrative text.
- `private-rooms` matched `private` AND (`room` OR `suite`).
- `meditation` matched `meditation|yoga|mindfulness|holistic`.
- `gym` matched `gym|fitness|exercise`.

The canonical facility dataset exposes **no structured amenity attribute**. The
filter published inferred narrative substrings as structured facility attributes.

## 8. Free-text (`q=`) behavior

One concatenated haystack: `name desc city state treatments insurance zip facilityType`.
Then:
1. whole-query substring across the haystack;
2. multi-token: every token as a **bare substring** anywhere;
3. single token: `w.startsWith(token) || w.includes(token)` — **arbitrary mid-word**.

Consequences: `mat` matched `traumatic`, `format`, `automatic`; `aa` matched
`Baltimore`? (no) but matched any word containing `aa`; `iop` matched `biopsy`.
Cross-field bleed: the concatenation made `"detox chicago"` match a single field
that happened to contain both words adjacent across a field boundary. A
one-character `q` matched nearly the whole catalogue while the page claimed
`Results for "x"`.

## 9. Facet-count algorithm

`facetPool` (`preMultiPool`) was snapshotted after
`state → location → q → treatment → type → insurance` and **before**
`insuranceTypes → treatmentTypes → amenities → verified → featuredOnly`.

Defects:
- **Treatment counts ignored the active `insuranceTypes` selection** and vice-versa —
  cross-group contamination in both directions.
- **Counts ignored `verified` / `featuredOnly` entirely** (applied after the snapshot),
  contradicting the source comment which claimed they were included.
- No counts were shown for the Verified / Featured quick filters.
- Location scope was correctly exact-only (nearby excluded) — that part was sound.

## 10. OR / AND behavior

Within `treatmentTypes` → OR. Within `insuranceTypes` → OR. Across groups → AND.
**But** `treatment`, `type`, `treatmentTypes` were three separate AND-ed groups,
so `?treatment=detox&treatmentTypes=detox` was `detox AND detox` and
`?type=residential&treatmentTypes=outpatient` was an un-displayed conjunction.

## 11. Verified / Featured quick filters

`verified === true` and `featured === true` — both structured booleans, correct
membership. UI defects: no `aria-pressed`, no counts, no disabled state, and both
were excluded from the facet snapshot.

## 12. Result-card claims derived from payment/insurance data

`{insuranceCount} Insurance Plans` — the underlying `insuranceAccepted` array mixes
payer labels (Aetna, Cigna), public programs (Medicaid, Medicare, TRICARE), and
**payment methods** (`Self-Pay/Private Pay`, `Sliding Scale/Financial Assistance`).
Calling all of them "Insurance Plans" is unsupported. Sidebar group label
`Insurance` / `Insurance accepted` had the same problem.

## 13. Result-card location / proximity claims

`_proximityTier` was attached whenever `locationForSort || locationForFilter` was
truthy — and `locationForSort` is `effectiveLocation`, which falls back to the
**seeker profile and then geo-IP**. So a visitor who searched nothing saw
`Exact Match` / `In Your City` / `In Your State` badges derived from an IP lookup,
on a result set that geo-IP never filtered. `"Your"` also asserted the searched
place is the user's own.

`See Centers Nearby` / `Nearby` CTA linked to `?location=<exact city, state>` —
an exact-city query labelled with a proximity claim the catalogue cannot support.

## 14. Desktop / mobile differences

Both render the same `FilterSidebar`, so state was already shared. **But**
`FilterSidebar` and `FilterSection` were declared inside the `SearchResults`
function body — a new component *type* every render — so every filter click
unmounted and remounted the whole panel and **destroyed keyboard focus**.

## 15. Stale / unknown URL behavior

- `?treatmentTypes=defunct-old-filter` → `matchesTreatmentFilter` returns `false`
  for an unresolvable key → **every facility fails → zero results**, presented as
  "No matching centers".
- Same for `?insuranceTypes=bogus`.
- Unknown values were rendered verbatim as active filter chips.
- `?distance=` inert (correct). `?amenities=` active (incorrect).

## 16. Clear-all behavior

`setSearchParams(new URLSearchParams())` — clears everything including `sort` and
`page`. Correct and complete; preserved unchanged.

## 17. Zero-result behavior

No fallback widening (correct — Phase 2 guarantee held). Recovery affordances
existed but keyed off `selectedTreatmentTypes` / `selectedInsuranceTypes` only, so
a zero result caused by `treatment=`, `type=`, or `amenities=` offered **no way to
relax the filter that caused it**. Raw slugs (`dual-diagnosis`) were shown instead
of labels. A meaningless `q` produced zero results with no explanation.

## 18. Result count contract

`filteredCenters.length` (exact only) drives heading, toolbar range, mobile
"Show N results", pagination and the SEO description. Nearby is separate. Sound.

## 19. Ranking — REPORT ONLY, NOT TOUCHED

- Sort comparator: proximity tier → `getPlanRank` → `calculatedRankingScore` → id.
- **`Highest Rated` / `Lowest Rated` sort on `calculatedRankingScore`, not on any
  rating.** `calculatedRankingScore` is an internal composite. The label is wrong.
  **DEFERRED — explicitly out of Phase 3A scope. No change made.**
- `getPlanRank`, `calculatedRankingScore`, `pro_boost`, Featured architecture:
  untouched, zero semantic diff.

## 20. Files requiring change

- `src/lib/searchFilters.ts` — export existing resolvers + alias maps (non-semantic)
- `src/lib/publicSearchState.ts` — NEW, canonical filter-state contract
- `src/lib/publicSearchText.ts` — NEW, free-text matcher
- `src/pages/SearchResults.tsx` — consume canonical state, self-excluding facets,
  remove amenities, hoist sidebar components, zero-result truth
- `src/components/search/SearchResultsForm.tsx` — multi-value preservation, dirty tracking
- `src/components/cards/SearchResultCard.tsx` — payment wording, exact-city CTA,
  search-relative location badges
- `src/pages/RehabCenters.tsx` — `treatmentType` → canonical `treatmentTypes` (8 links)
- tests

## 21. Files explicitly NOT requiring change

`src/lib/proximitySearch.ts`, `src/lib/location/*`, `src/hooks/useStaticFacilities.ts`,
`src/lib/facilityPlanSort.ts`, `src/utils/seoPageValidator.ts`,
`src/components/search/FilterChips.tsx` (**zero consumers** — dead component; its
`Insurance accepted` heading is reported, not edited), `src/components/featured/*`,
every provider/admin file, every SEO page generator.

## 22. Test plan

See `src/lib/__tests__/publicSearchState.test.ts`,
`src/lib/__tests__/publicSearchText.test.ts`,
`src/lib/__tests__/searchFiltersFrozen.test.ts`,
`src/pages/__tests__/searchContractTruth.test.tsx`, plus the unchanged Phase 2
suites (`searchLocationTruth`, `locationTruth`, `citySeoLocationTruth`,
`countyInventoryTruth`, `facility-inventory-pipeline`).

## 23. Scope risks

- **Ranking adjacency**: the sort comparator sits inside the same `useMemo` being
  restructured. Mitigation: the comparator block is moved verbatim, byte-for-byte;
  a test asserts result ORDER is unchanged for a fixed corpus.
- **Indexability**: `hasSearchParams` composition is preserved exactly (including
  `amenities`), so no URL changes its noindex verdict.
- **Treatment/insurance semantics**: frozen by a structural snapshot test.
- **`type=holistic`** maps to inpatient+outpatient. Preserving it means the UI now
  *reveals* two treatment presets on a page titled "Holistic Therapy". That is the
  honest surfacing of an existing defect; correcting the mapping is out of scope.

---

## 24. Live-data smoke (production Supabase, read-only)

Recorded 2026-08-19 against `public_facilities` (3,794 listings). These are
**observations, not invariants** — they are not asserted anywhere in the test
suite.

### Location scopes (exact)

| Query | Exact count |
|---|---|
| Los Angeles, CA | 23 |
| Los Angeles, CA + Detox matcher | 6 |
| Los Angeles, CA + Medicaid matcher | 13 |
| New York, NY | 29 |
| Chicago, IL | 28 |
| ZIP 21215 | 11 |

### `type=` presets — before vs after routing through the shared matcher

| Preset | Before (raw `treatmentTypes.includes`) | After (canonical matcher) |
|---|---|---|
| `type=residential` | **0** | 45 |
| `type=outpatient` | 1,436 | 3,741 |
| `type=mental-health` | 1,851 | 2,114 |

`/search-results?type=residential` was a **guaranteed zero-result page on
production** — the catalogue has no `facility_services` row literally named
`Inpatient`, and the raw check never consulted `facility_type`. After Phase 3A
`type=residential` and `treatmentTypes=inpatient` are the same function call on
the same array, so their ID sets are identical by construction; the planted-data
suite asserts that equality directly.

### Amenities filter — matches across the whole catalogue

| Option | Facilities matched by the inference |
|---|---|
| Swimming Pool | 1 |
| Private Rooms | 3 |
| Meditation | 0 |
| Fitness Center | 1 |

Out of 3,794 listings. The filter was a near-total dead end, and the handful of
"matches" were narrative coincidences rather than facility attributes.

### Quick filters

| Signal | Rows |
|---|---|
| `verified = true` | 0 |
| `featured = true` | 2 |

With `verified = true` at zero catalogue-wide, the truthful facet count is `(0)`
and the option is now disabled when inactive — previously it was always
clickable and silently returned an empty page.

### Ranking — REPORT ONLY

`calculated_ranking_score` has **10 distinct values** across 3,794 listings, and
it is what the `Highest Rated` / `Lowest Rated` sort orders by. It is an
internal composite, not a rating. **Deferred; not changed in Phase 3A.**
