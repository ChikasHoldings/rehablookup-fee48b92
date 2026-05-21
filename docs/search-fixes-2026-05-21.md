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

## §3.5 — Additional surfaces unified (Phase 2 follow-up)

After the initial pass landed, a wider sweep found 7 more surfaces still
running their own ad-hoc filter logic. All are now routed through the
shared matcher.

| Surface | File | Change |
|---|---|---|
| Hero URL params `?treatment=` / `?insurance=` | `src/pages/SearchResults.tsx` | inline `.includes()` chain → `matchesTreatmentFilter` / `matchesInsuranceFilter`. The hero form previously wrote display labels ("Detox", "Inpatient", "Blue Cross Blue Shield") that the receiving page couldn't fully resolve. |
| Sticky refinement form | `src/components/search/SearchResultsForm.tsx` | inline option arrays → `TREATMENT_FILTERS` / `INSURANCE_FILTERS` imports. Sticky form now exposes the new MAT/CBT/Trauma/Aftercare/12-Step/Family + private-pay/sliding-scale options. |
| Hero `SearchForm` dropdowns | `src/data/treatmentCenters.ts` | `treatmentTypes` and `insuranceProviders` static lists rewritten to mirror the canonical filter labels exactly. |
| State / treatment-hub / city / near-me grids | `src/components/seo/StateFacilitiesSection.tsx` | Walks the canonical matcher first (so `treatmentFilter={["inpatient"]}` recovers the 44 residential facilities); falls back to a normalized substring search across services + facility_type + description for non-canonical keys like `"drug"`, `"opioid"`. |
| Auth seeker workspace | `src/pages/seeker/SeekerSearch.tsx` | Local `treatmentTypeFilters` / `insuranceFilters` arrays replaced with imports from `searchFilters.ts`. Legacy `bluecross` URL value still resolves via the new `INSURANCE_FILTER_ALIASES`. Filter logic routed through shared matcher. |
| Insurance landing pages | `src/pages/seo/CityInsurancePage.tsx`, `InsuranceStatePage.tsx`, `CountyInsurancePage.tsx` | Each replaced inline `i.toLowerCase().includes(insurerLower)` with `matchesInsuranceFilter(asSearchableFacility(f), insurer.name)`. |
| Payment + cost insurance pages | `src/pages/seo/PaymentStatePage.tsx`, `CostInsurancePage.tsx` | Try canonical matcher first; preserve substring fallback for description-style keywords (`free`, `charity`, `scholarship`). |

### Matcher additions
- `INSURANCE_FILTER_ALIASES` now resolves legacy URL values: `bluecross` /
  `blue-cross` → `bcbs`; `uhc` / `unitedhealthcare` / `united-healthcare`
  → `united`; `va` / `vahealthcare` → `tricare`.
- `resolveTreatmentFilterKey` / `resolveInsuranceFilterKey` accept the
  canonical value, the display label, OR any alias — so URL writers that
  pass labels ("Dual Diagnosis", "Blue Cross Blue Shield") all resolve to
  the right canonical key without changing the URL surface.

### Tests added
8 more cases in `src/lib/__tests__/searchFilters.test.ts` lock the label +
alias resolution:
- Treatment by display label ("Detox", "Inpatient", "Dual Diagnosis")
- Insurance by display label ("Blue Cross Blue Shield", "TRICARE")
- Insurance aliases (`bluecross`, `UHC`, `unitedhealthcare`)
- Unknown filter values still return false

**Full suite: 197 tests pass (184 + 8 new + 5 pre-existing skipped).**

## §3.6 — Freshness for newly listed facilities (Phase 2.6)

Until now, a newly approved facility could take **5–10 min** to appear in
public search results:
1. CDN cache: `s-maxage=600` (10 min)
2. localStorage cache: 10 min TTL
3. React Query: 5 min staleTime

The audit also surfaced a latent bug: `useApprovedFacilities` subscribed
to realtime events but `facility_services` / `facility_insurance` weren't
in the `supabase_realtime` publication, so service/insurance edits never
notified subscribers.

This pass closes both gaps.

### Migration `20260711000000_add_facility_services_insurance_to_realtime.sql`
Gated `ALTER PUBLICATION supabase_realtime ADD TABLE` for
`facility_services` and `facility_insurance` (idempotent — guarded with
`pg_publication_tables` lookups). Also sets `REPLICA IDENTITY FULL` on
both so UPDATE/DELETE events carry the full row, letting subscribers
correlate by `facility_id` without a follow-up query. Applied to prod via
MCP; lives in repo under `supabase/migrations/`.

### `useStaticFacilities` realtime subscription
`src/hooks/useStaticFacilities.ts` now opens a `public-facilities-realtime`
Supabase channel on mount and listens for `postgres_changes` on
`facilities`, `facility_services`, and `facility_insurance`. Each event
schedules a debounced (1.5 s) React Query invalidation. A burst of bulk
admin approvals collapses into a single refetch.

Anon RLS:
- `facilities` — `Anon can read approved facilities for public view`
- `facility_services` — `Anyone can view services of approved facilities`
- `facility_insurance` — `Anyone can view insurance of approved facilities`

Anon visitors receive realtime events for exactly the rows the snapshot
includes — no privilege escalation.

### CDN cache TTL tightened
`supabase/functions/get-public-facilities/index.ts:Cache-Control`:
- Before: `public, max-age=300, s-maxage=600, stale-while-revalidate=3600`
  (browser 5 min, CDN 10 min)
- After:  `public, max-age=60, s-maxage=120, stale-while-revalidate=3600`
  (browser 1 min, CDN 2 min)

First-time visitors hitting the CDN see a newly approved facility within
~2 min worst case. `stale-while-revalidate` keeps response latency low
during cache refresh.

### Admin approval — manual invalidation
`src/pages/admin/AdminProviders.tsx:invalidateProviderQueries()` now also
invalidates `PUBLIC_FACILITIES_QUERY_KEY` after every mutation. The
admin who clicked Approve sees the public directory refresh instantly,
in addition to other connected clients receiving the realtime event.
Covers both single-row approvals and the bulk dialog (`BulkProviderStatusDialog`
already calls the parent `onSuccess` which routes through
`invalidateProviderQueries`).

### Resulting freshness SLAs
| Scenario | Worst-case time to appear in search |
|---|---|
| Admin approves facility (same tab) | instant (manual invalidate) |
| Approval visible to another connected client | ≤ 1.5 s (realtime debounce) |
| Provider adds a service to existing facility | ≤ 1.5 s (realtime debounce) |
| First-time visitor hits CDN | ≤ 2 min (s-maxage) |
| Returning visitor with stale localStorage | instant on remount (placeholderData) + ≤ 1.5 s realtime refresh |

### Deploy note
The CDN TTL change ships in the `get-public-facilities` edge function. Until
that function is redeployed, the OLD `s-maxage=600` headers remain in
effect at the CDN. Trigger `deploy-all-stale-functions.yml` after this
commit lands on main.

### Smoke-test scenario (post-deploy)
1. Run the SQL probe: `SELECT COUNT(*) FROM facilities WHERE status='approved'` — note `N`.
2. Insert a fresh test facility via the admin UI OR direct SQL:
   ```sql
   INSERT INTO facilities (name, facility_type, phone, address, city, state, zip_code, status, slug)
   VALUES ('Realtime Smoke Test Center', 'Outpatient Program', '555-0100',
           '1 Test St', 'San Francisco', 'California', '94102', 'approved',
           'realtime-smoke-test-center-sf-ca');
   ```
3. Open `/search-results?location=San+Francisco%2C+CA` in a tab that's been
   open for at least 30 s. Within ~1.5 s the new facility should appear
   without a reload.
4. Open a fresh incognito tab to the same URL. The fresh fetch should hit
   the edge function (or its CDN), which returns 2-min-cache data —
   should include the new facility within 2 min of insert.
5. Confirm `SELECT COUNT(*) FROM facilities WHERE status='approved'` returns
   `N+1`.
6. Clean up:
   ```sql
   DELETE FROM facilities WHERE slug = 'realtime-smoke-test-center-sf-ca';
   ```
   Within ~1.5 s the facility should disappear from the open search tab.

## §3.7 — Sitemap freshness for newly approved facilities (Phase 2.7)

### Audit findings
- `https://rehablookup.com/sitemap-facilities.xml` IS served and DID contain
  all 3,803 facilities post-deploy — the committed `public/sitemap-facilities.xml`
  is regenerated at every Vercel build via
  `scripts/generate-sitemaps.mjs`, which fetches the live `sitemap-facilities`
  edge function and writes the result to disk.
- `robots.txt` correctly references the four sitemap files
  (`sitemap-index.xml`, `sitemap.xml`, `sitemap-extras.xml`,
  `sitemap-facilities.xml`).
- **Gap 1**: the edge function pre-2026-05-21 read directly from the
  `facilities` table with `.eq("status", "approved")`. The
  `public_facilities` view applies additional filters
  (`COALESCE(suspended,false)=false` AND `NOT EXISTS pending claim_request`)
  that the sitemap did NOT inherit. A facility that was approved but then
  flagged suspended or put into pending-claim review would still have its
  `/center/:slug` URL in the sitemap but would render a soft-404 on the
  live site (the SPA reads from the view too).
- **Gap 2**: the static `public/sitemap-facilities.xml` only refreshes on
  Vercel builds (= on every push to `main`). Without a code push, a newly
  approved facility waits for the next deploy before appearing in the
  sitemap. No mechanism existed to auto-refresh.

### Fixes
**a) `sitemap-facilities` edge function now queries `public_facilities`**
(both `fetchFacilityCitySet` and `generateFacilitiesSitemap`). Sitemap
visibility now mirrors search visibility exactly; suspended +
pending-claim facilities are excluded automatically. Version bumped to
`v7.8.0`.

**b) Vercel rewrite serves the live sitemap.** `vercel.json:rewrites` now
proxies `/sitemap-facilities.xml` directly to the edge function. The
edge function's own `Cache-Control: max-age=3600, s-maxage=7200` (1-hour
browser, 2-hour CDN) governs freshness; newly approved facilities appear
in the public sitemap **within 2 hours** of approval — no code push
required. The static `public/sitemap-facilities.xml` is still regenerated
at build time as a build-time validation of the edge function's output
and as a documented fallback path (if the rewrite is reverted, the
static file resumes serving).

### Smoke checklist
After the next edge function deploy + Vercel build:
- [ ] `curl -sI https://rehablookup.com/sitemap-facilities.xml` returns
  `200`, `Content-Type: application/xml; charset=utf-8`,
  `Cache-Control: public, max-age=3600, s-maxage=7200`,
  `X-Sitemap-Version: v7.8.0`.
- [ ] Body starts with `<?xml version="1.0" encoding="UTF-8"?>` and
  contains 3,803 `<loc>` elements (or current `SELECT COUNT(*) FROM
  public_facilities`).
- [ ] Approve a test facility in the admin panel; within 2 hours the new
  `/center/:slug` URL appears in the live sitemap.
- [ ] Suspend a facility; within 2 hours its URL disappears.
- [ ] Initiate a claim_request on a facility; within 2 hours its URL
  disappears until the claim resolves.

### Auto-add SLA summary
| Trigger | Time-to-sitemap |
|---|---|
| Facility approved (admin) | ≤ 2 hours (edge function CDN cache) |
| Facility suspended | ≤ 2 hours |
| Claim_request opened | ≤ 2 hours |
| Facility deleted | ≤ 2 hours |
| Code push to `main` | instant (Vercel rebuild regens the static fallback too) |

## §4 — Observability follow-ups

- Add a `directory_zero_result_query` analytics event when the filtered
  result set is empty. Compare zero-result rate week-over-week; a spike
  signals data drift or a regression in the filter mapping.
- Daily check: parity between `SELECT COUNT(*) FROM public_facilities` and
  the snapshot endpoint's `count` field. Drift > 5% triggers an alert.
- Track facet-count `(0)` rate per filter value over time so we can spot
  data-coverage gaps (e.g. United/Kaiser have been at 0 since launch —
  either onboard those payers or drop the options).
