/**
 * Canonical location layer — ONE source of truth for RehabLookup
 * geography, shared by public search, programmatic SEO pages, and the
 * Node build generators that emit crawler-facing inventory.
 *
 * Import from here (`@/lib/location`) in app code. Node build scripts
 * import the individual `.ts` files directly with explicit extensions,
 * which Node 22 strips on the fly — that is what lets the generators run
 * the exact same rules as the browser instead of re-implementing them.
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
} from "./locationTypes.ts";

export {
  US_STATES,
  isValidState,
  normalizeState,
  stateDisplayName,
  stateSlugFor,
  statesMatch,
} from "./normalizeState.ts";

export {
  citiesMatch,
  cityInList,
  cityMatchKey,
  cityMatchKeyFromSlug,
  normalizeCityName,
} from "./normalizeCity.ts";

export { isValidZip, normalizeZip, zipsMatch } from "./normalizeZip.ts";

export { describeScope, isResolvedScope, parseLocation } from "./parseLocation.ts";

export {
  countExact,
  filterExact,
  matchesExactly,
  relateToScope,
  splitByLocation,
} from "./matchLocation.ts";
