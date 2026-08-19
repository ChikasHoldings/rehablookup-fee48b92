/**
 * Canonical location layer — ONE source of truth for RehabLookup
 * geography, shared by public search, programmatic SEO pages, and the
 * Node build generators that emit crawler-facing inventory.
 *
 * The rules themselves live in `./core.mjs` (plain JS, framework-free)
 * with types in `./core.d.mts`. That split exists for one reason: the
 * sitemap/static-route CI job runs Node 20, which cannot import a `.ts`
 * file at all. Keeping the implementation in plain JS means the
 * generators and the browser execute the SAME code rather than two
 * copies that drift.
 *
 * App code imports from here (`@/lib/location`). Build scripts import
 * `src/lib/location/core.mjs` directly.
 *
 * The contract in one line: a page or search labelled "Los Angeles"
 * contains Los Angeles facilities and nothing else. Nearby results may
 * exist, but only in their own bucket, with their own label, and never
 * inside the exact count.
 */

export type {
  GeoFacility,
  LocationRelation,
  LocationScope,
  LocationSplit,
  StateAbbr,
} from "./core.mjs";

export {
  // state
  US_STATES,
  isValidState,
  normalizeState,
  stateDisplayName,
  stateSlugFor,
  statesMatch,
  // city
  citiesMatch,
  cityInList,
  cityMatchKey,
  cityMatchKeyFromSlug,
  normalizeCityName,
  // zip
  isValidZip,
  normalizeZip,
  zipsMatch,
  // parsing / scope construction
  cityScope,
  describeScope,
  isResolvedScope,
  parseLocation,
  // matching
  countExact,
  filterExact,
  matchesExactly,
  relateToScope,
  splitByLocation,
  // association keys used by the SEO generators
  stateCityKey,
  stateCityKeyFromSlugs,
} from "./core.mjs";
