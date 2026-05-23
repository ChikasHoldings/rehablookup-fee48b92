# Proximity Sort — follow-up plan (full distance)

Status: **partial implementation shipped 2026-05-23.** This doc captures
what's missing to deliver true mile-accurate distance sorting (vs.
the categorical 5-tier approximation we ship today).

## What ships today (quick-win, 2026-05-23)

- `useGeoLocation` cache promoted from sessionStorage → localStorage with
  a 7-day TTL. Repeat visitors get instant geo resolution before first
  paint, so the proximity-tier sort applies on the very first frame
  instead of after a 200-800 ms ipapi.co round-trip.
- `useZipcodeLookup` now retains `latitude` / `longitude` from the
  Zippopotam.us response. Previously we threw them away.
- `/search-results` adds a loading guard: when sort is "proximity",
  no location was typed, no seeker profile location, AND geo-IP is
  still in flight → render the results skeleton instead of the
  plan-priority-sorted "nationwide" fallback. Avoids the brief
  out-of-state flash for first-time visitors.
- `/search-results` shows a "Showing facilities near {city, state}"
  banner when results were sorted by geo-IP detection (not user input).

## What's still missing — schema + backfill

Today's proximity uses 5 categorical tiers (exact ZIP / city / state /
nearby-state / nationwide). It does NOT use real distance because the
`facilities` table has no `latitude` / `longitude` columns.

To deliver true distance-based sorting we need:

### 1. Schema: add lat/lng to `facilities`

```sql
ALTER TABLE public.facilities
  ADD COLUMN latitude double precision,
  ADD COLUMN longitude double precision;

CREATE INDEX facilities_lat_lng_idx
  ON public.facilities (latitude, longitude)
  WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

-- Optional: PostGIS GEOGRAPHY column for proper great-circle queries
-- vs. Haversine in the client. Decision deferred until we know whether
-- distance filtering needs to happen server-side (e.g. for the
-- "within 25 miles" filter on /search-results).
```

### 2. Backfill (3,803 approved facilities + ~3,000 unapproved)

Two sources, in priority order:

1. **`staged_samhsa` join** — the SAMHSA import already has lat/lng
   on `staged_samhsa.latitude` / `staged_samhsa.longitude`. Join on
   the SAMHSA license/registration ID (column TBD — verify
   `staged_samhsa` schema first). Covers ~70% of the directory based
   on a spot check.
2. **Google Maps Geocoding API** for the rest. Estimated
   ~1,200 facilities @ $5/1k = $6 one-time. Requires
   `GOOGLE_MAPS_GEOCODING_API_KEY` on the geocode edge function.
   Rate-limit: 50 req/s, so ~30s of wall time.

A new edge function (`backfill-facility-coords`) batches addresses
through the Geocoding API, writes results back to `facilities`,
records failures in a `facility_geocode_failures` audit table for
manual review. Run once at backfill time, then run nightly to catch
new facilities.

### 3. Public snapshot — propagate to `public_facilities`

The `public_facilities` view (used by `useStaticFacilities` for the
SPA's anon read path) needs the new columns. Add them to the SELECT
list and to the generated TS types via `npm run gen:types`.

### 4. Client wiring — Haversine helper + sort

Add `src/lib/distance.ts` with:

```ts
export function haversineDistanceMiles(
  lat1: number, lon1: number, lat2: number, lon2: number,
): number {
  // Standard great-circle Haversine. ~0.5% error vs Vincenty,
  // acceptable for sort-key purposes.
  const R = 3958.8; // earth radius, miles
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}
```

Then in `SearchResults.tsx` `getProximityScore`, when both user and
facility have lat/lng, use Haversine miles as the score directly
(lower = closer). Fall back to the existing 5-tier categorical for
records without coordinates. Distance becomes the primary sort key,
plan priority + ranking score remain as tiebreakers.

Surface distance in the UI: the existing `SearchResultCard` proximity
badge can become "12 mi" / "47 mi" / "1,200 mi" when distance is known
rather than the current categorical label.

### 5. "Within X miles" distance filter

The filter sidebar already has a `?distance=` param (10/25/50/100
miles) but today it's a no-op because no real distance exists. Wire
it to: `facility.distance <= selectedMiles`.

## Acceptance criteria for the full feature

- `facilities.latitude` / `facilities.longitude` populated on every
  approved row.
- Anon SELECT on `public_facilities` returns lat/lng columns.
- A New York visitor sees New York facilities in positions 1-N, not
  Texas. (Spot-check: open `/search-results` from a Vercel preview
  region in NY, confirm.)
- The proximity badge on `SearchResultCard` shows mile-accurate
  distance for any facility where both user and facility have coords.
- The "within 25 miles" filter actually constrains by distance.
- E2E test in `tests/visual/proximity-sort.spec.ts` that mocks
  `useGeoLocation` to return NY coords and asserts the first 20 cards
  are within 100 miles of NYC.

## Estimated effort

- Schema migration: 10 min
- Edge function + backfill: 4-6 hours (Google API integration,
  SAMHSA join, retry/audit table)
- Client wiring: 2 hours (Haversine helper, sort, badge update)
- E2E test + verification: 2 hours
- **Total: ~1 dev-day** plus a ~$6 Google Maps Geocoding bill.

## Why not ship it now

The schema change is small but the backfill operation is one-shot
work that's better done end-to-end in a single PR with explicit
verification (anon SELECT works, sample of 50 NY facilities lat/lng
spot-checked against Maps, latency under 100ms). Splitting it across
two sessions creates a window where the columns exist but are
half-populated, which would silently demote uncoded facilities to
the categorical-tier fallback.
