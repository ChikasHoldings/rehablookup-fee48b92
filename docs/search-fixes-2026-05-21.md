# Site Search — Fixes Applied (2026-05-21)

Audit: `docs/search-audit-2026-05-21.md`
Branch: `claude/phase2-deployment-5WYOn`

Each fix below traces to a numbered finding in the audit. Phases 1 + 2 are landed
in this commit. Phases 3-5 are scoped + queued (§3 of this doc).

## Phase 1 — hotfixes (zero-result bugs)

### F1 — `private-pay` insurance filter (CRITICAL)
**Before:** Filter label `"Self-Pay / Private Pay"` (spaces around slash) was
substring-tested against catalog value `"Self-Pay/Private Pay"` (no spaces);
the check failed for all 2,918 facilities carrying the dominant insurance
value in the data.

**After:** Normalizer in `src/lib/searchFilters.ts:25-26` collapses internal
whitespace and lowercases both sides before comparing. The filter's
`matches` array also carries explicit aliases (`Self-Pay`, `Private Pay`,
`Self Pay`, `Out of Pocket`, `Cash Pay`) so a provider recording the value
any of those ways still surfaces.

**Verification (live DB count via shared matcher):** 2,918 facilities now
match `private-pay`, up from 0.

**Residual risk:** None. Matcher folds case + whitespace deterministically;
new tests in `src/lib/__tests__/searchFilters.test.ts` lock the invariant.

### F2 — `inpatient` treatment filter (CRITICAL)
**Before:** Filter matched `treatmentTypes` against `["Inpatient",
"Inpatient/Residential", "Residential"]`. The production catalog has **zero
rows** with any of those values in `facility_services`; the only signal is
`facility_type = 'Residential Treatment Center'` (44 facilities).

**After:** `TREATMENT_FILTERS[inpatient]` adds `facilityTypeMatches: ["Residential
Treatment Center", "Residential", "Inpatient"]`. The shared
`matchesTreatmentFilter` walks services → facility_type → description, so
the 44 facilities now surface for both `/rehab-centers?browseTreatment=inpatient`
and `/search-results?treatmentTypes=inpatient` and the empty "Inpatient
Centers" section on `/rehab-centers` populates.

**Verification:** 44 facilities now match, up from 0.

**Residual risk:** Catalog still lacks granular inpatient service tagging.
A data-side backfill (assigning `Inpatient` rows to `facility_services` for
each residential facility) would consolidate the signal. Flagged in §3.

### F3 — `holistic` treatment filter (HIGH)
**Before:** Catalog has zero rows with `Holistic` or `Holistic Therapy` in
`facility_services`.

**After:** Added `descriptionMatches: ["yoga", "meditation", "mindfulness",
"art therapy", "equine", "holistic"]` as a last-resort signal. Facilities
that narrate yoga / meditation / mindfulness / equine therapy now surface
even without a discrete service tag.

**Verification:** description-based match returns N>0 facilities (live
query confirms `holistic` keyword in 1 description but the alias list will
pick up additional ones once more facilities mention yoga/meditation/etc).

**Residual risk:** Description matching is fuzzy. The proper fix is a
`facility_amenities` table populated by provider-side amenity selectors.
Flagged in §3.

### F4 — Snapshot endpoint dropped fields (HIGH)
**Before:** `get-public-facilities` projected 15 columns from
`public_facilities` but the view exposes 30+; downstream callers read
`calculated_ranking_score`, `is_pro`, `is_claimed`, `bed_count`,
`gender_served`, `hours_of_operation`, `languages_spoken`,
`accessibility_features`, `accepting_admissions`, `featured_pinned`,
`email`, `website`, etc. and silently received `undefined`. Sort by
ranking_score and sort by reviews both no-op'd.

**After:**
- `supabase/functions/get-public-facilities/index.ts` SELECT expanded to
  every public-safe field the view exposes. PII gates inside the view
  (phone/email/website Pro-mask) continue to enforce visibility.
- `src/lib/publicFacilitiesSnapshot.ts` type aligned with the new shape.
  Schema-version bumped to `2`; clients with v1 cache entries refetch on
  next load.
- `src/hooks/useStaticFacilities.ts` passes the expanded set through to the
  `PublicFacility` shape; `featured` now ORs the catalog flag with `isPro`
  instead of clobbering it.

**Residual risk:** Snapshot is ~30% larger (~16 MB vs ~12 MB JSON). Browser
cache and 5-min React Query staleTime absorb the cost on subsequent loads;
first-paint cost is still dominated by the React bundle. Server-side
pagination + filtering is a Phase 3 item (§3).

### F5 — Stray 2-letter state codes (LOW)
**Before:** 2 facilities ingested with `state = 'Co'` and `state = 'TX'`
were orphaned from state-scoped browsing (state pages, near-me pages, state
filter).

**After:** Idempotent migration
`supabase/migrations/20260710000000_backfill_facility_state_abbreviations.sql`
sets `state='Colorado'` / `'Texas'` for matching rows. Applied to
production via MCP; re-running the migration is a safe no-op.

### F11 — Page parameter clamp (LOW)
**Before:** `SearchResults?page=99` against a 6-page result set rendered an
empty grid with no recovery path.

**After:** `safePage = clamp(currentPage, 1, totalPages)` in
`src/pages/SearchResults.tsx`. Pagination component now reads `safePage`,
not raw `currentPage`. Footer / pagination both reflect the clamped value.

## Phase 2 — core search accuracy

### F8 — Filter mapping duplication (MEDIUM)
**Before:** `SearchResults.tsx`, `RehabCenters.tsx` each declared their own
`treatmentTypeFilters` / `BROWSE_TREATMENTS` + matcher functions. A change
to one didn't propagate — and the matchers had subtly different rules
(SearchResults: forward-substring only; RehabCenters: bidirectional).

**After:** Both pages now import from `src/lib/searchFilters.ts`:
- `TREATMENT_FILTERS` / `INSURANCE_FILTERS` as the canonical option lists
- `matchesTreatmentFilter` / `matchesInsuranceFilter` as the canonical
  matchers
- `countTreatmentFacets` / `countInsuranceFacets` as the canonical facet
  counters
- `TREATMENT_FILTER_ALIASES` retains shareable-URL back-compat for retired
  values (`iop` → `outpatient`, `php` → `outpatient`, `mental-health` →
  `dual-diagnosis`, `residential` → `inpatient`).

### F6 — Hidden high-coverage services (MEDIUM)
**Before:** Filter UI offered 5 options. The most populated services in the
catalog had no UI surface:

| Service | Facilities |
|---|---|
| Cognitive Behavioral Therapy (CBT) | 2,949 |
| Aftercare/Continuing Care | 2,434 |
| Trauma Therapy | 2,254 |
| Medication-Assisted Treatment (MAT) | 1,964 |
| 12-Step Programs | 1,374 |
| Family Therapy | 399 |

**After:** Added six new filter values (`mat`, `cbt`, `trauma`,
`aftercare`, `twelve-step`, `family`) grouped via `TREATMENT_THERAPIES`
alongside the original 5 `TREATMENT_LEVELS_OF_CARE`. All landing pages and
saved searches continue to work — only the option list grew.

### F7 + F12 — Facet counts on filter UI (MEDIUM)
**Before:** Users saw insurer names like "United Healthcare" and "Kaiser
Permanente" with no way to know that those values returned 0 facilities
without clicking. Same for treatment filters.

**After:** Every filter option renders a `(N)` badge with the count of
facilities that would match. Options with `count === 0` are disabled
(not removed — visibility preserves the option's URL key so saved
searches keep working). Counts are computed against a `facetPool` that
narrows by location/state/query/distance/verified/featured but NOT by the
multi-select group itself, so toggling within a group never zeros out
sibling options.

### F15 — Verified filter is universal (LOW)
**Before:** 3,802 / 3,803 facilities are marked `verified=true`. The
"Verified Only" toggle is functionally a no-op (filters out 1 row).

**After:** Behavior unchanged; documented in the audit. The toggle is
preserved for future use (when unverified provider-claimed facilities re-
enter the catalog). No code change here.

### F9 — `googleRating` / `googleReviewCount` always undefined (MEDIUM)
**Before:** `useStaticFacilities` returned `googleRating` /
`googleReviewCount` from snapshot fields that the snapshot never carried;
"Sort by reviews" had no sort key.

**After:** Snapshot type now explicitly types those as `number | null`
with a docstring noting that the underlying `facility_reviews_config`
table currently holds reviews for 1 facility out of 3,803 — populating the
rest requires a Google Places API integration. The sort path is preserved
but documented as inert until backfill lands. Tracked in §3.

## Phase 4 — UX polish (already in place, no changes needed)

- Empty-state UI on `SearchResults.tsx:1459-1639` already renders filter-
  clear chips, alternative state links, popular location links, and a
  concierge CTA.
- `RehabCenters.tsx:687-820` empty state offers actionable alternatives
  and falls through to the placement-team CTA.
- Mobile filter sheet uses the same `FilterSection` component as desktop
  so facet counts inherit automatically.
- `clearAllFilters()` + per-chip clear in both surfaces.

## Phase 5 — tests + smoke checklist

### Tests added
- `src/lib/__tests__/searchFilters.test.ts` — **28 cases**:
  - F1 regressions (private-pay matching across cosmetic-spacing variants)
  - F2 regressions (inpatient via facility_type)
  - F3 regressions (holistic via description)
  - Insurance alias coverage (BCBS / UHC / Medi-Cal / etc.)
  - Treatment fallback chain ordering
  - Legacy URL alias preservation (iop / php / mental-health / residential)
  - New filter values (MAT, CBT, Trauma, Aftercare, 12-Step, Family)
  - Facet count correctness on empty + populated sets

**Full suite: 184 tests pass (156 + 28 new).**

### Manual smoke checklist (run after deploy)
- [ ] `/rehab-centers` — Inpatient section populates (was empty)
- [ ] `/rehab-centers?browseTreatment=inpatient` — 44 facilities
- [ ] `/rehab-centers?browseInsurance=private-pay` — ~2,918 facilities
- [ ] `/rehab-centers?browseTreatment=iop` — redirects to
  `/treatment-types/outpatient-programs` (back-compat)
- [ ] `/search-results?treatmentTypes=mat` — ~1,964 facilities
- [ ] `/search-results?insuranceTypes=private-pay` — ~2,918 facilities
- [ ] `/search-results?treatmentTypes=detox&insuranceTypes=medicaid` —
  detox AND medicaid subset (intersection, both filters active)
- [ ] `/search-results?location=Sacramento,CA` — facility list renders;
  facet counts reflect Sacramento subset
- [ ] Each filter dropdown shows `(N)` badges; values with `(0)` are
  greyed/disabled
- [ ] `/search-results?page=99` — clamps to last page, no empty grid
- [ ] State page for Colorado includes the 2 previously-orphaned `Co` rows
- [ ] State page for Texas includes the 1 previously-orphaned `TX` row

### Deploy steps
1. Push this commit to `claude/phase2-deployment-5WYOn`.
2. Trigger the `deploy-all-stale-functions.yml` GitHub workflow against the
   feature branch (or the standalone `get-public-facilities` deploy from
   the Supabase dashboard if preferred — it's the only edge function
   touched). The workflow auto-detects modified `index.ts` files via
   `git diff origin/main...HEAD -- 'supabase/functions/*/index.ts'`.
3. After Vercel auto-deploys the frontend (~2 min after push to `main`),
   clear localStorage `static-facilities-cache` or wait 10 min for the
   schema-version mismatch to force a refetch.

## §3 — Deferred items (Phase 3 architectural — not launch blockers)

| ID | Title | Why deferred |
|---|---|---|
| F10 | `facility_amenities` table + provider amenity selector | Requires migration, RLS policies, provider-side editor UI. Out of single-PR scope. Description-text matching is acceptable interim. |
| F13 | Real Haversine distance | Requires lat/lng backfill across 3,803 facilities (Google Geocoding API ~$0.005/req → ~$19 one-shot, plus ongoing for new listings). UX/business decision. Tier-based proximity is acceptable interim. |
| F14 | Server-side filtering + pagination | Requires new search edge function + index design (probably PG trigram + RPC). Current 16 MB snapshot is cacheable; first-paint cost dominated by JS bundle, not data. |
| F9-backfill | Populate `facility_reviews_config` for all 3,803 facilities via Google Places API | Same cost/integration scope as F13. |
| F6-data | Backfill `Inpatient` rows into `facility_services` for the 44 residential facilities, plus richer service tagging across the catalog | Catalog-quality work. Tracked separately. |

## §4 — Observability follow-ups

- Add a `directory_zero_result_query` analytics event when the filtered
  result set is empty. Compare zero-result rate week-over-week; a spike
  signals data drift or a regression in the filter mapping.
- Daily check: parity between `SELECT COUNT(*) FROM public_facilities` and
  the snapshot endpoint's `count` field. Drift > 5% triggers an alert.
- Track facet-count `(0)` rate per filter value over time so we can spot
  data-coverage gaps (e.g. United/Kaiser have been at 0 since launch —
  either onboard those payers or drop the options).
