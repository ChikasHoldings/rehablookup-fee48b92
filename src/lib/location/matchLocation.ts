/**
 * The exact-location contract.
 *
 * `matchesExactly` is the single predicate that decides whether a
 * facility belongs to a geographic scope. Everything that renders a
 * location-scoped count or list — public search, programmatic SEO
 * pages, the crawler-facing city inventory injector — resolves
 * membership through this one function.
 *
 * What "exact" means, and what it explicitly excludes:
 *
 *   city scope  → same normalized state AND same normalized city.
 *                 No statewide fallback. No neighbouring-state fallback.
 *                 No radius expansion. No substring fallback. No
 *                 "zero matches means ignore the location filter."
 *   state scope → exactly that state. Never its neighbours.
 *   zip scope   → exactly that 5-digit ZIP.
 *   county      → see the county note below.
 *   unresolved  → nothing. A query we couldn't place selects no
 *                 facilities rather than selecting all of them.
 *
 * Paid status is not an input here. Pro, Featured and Sponsored have no
 * bearing on whether a facility is in Los Angeles, and ranking never
 * decides geographic membership — it may only order an already-exact
 * set. A Featured San Diego facility is not a Los Angeles match.
 *
 * COUNTY LIMITATION (audited, not assumed): the `facilities` table has
 * no county column — the geographic fields are city, state, zip_code and
 * address, nothing else. There is therefore no trustworthy
 * facility→county mapping, and this module refuses to invent one. It
 * will not infer county from a city name (a facility in the city of
 * Orange is not evidence about Orange County). County scopes match
 * nothing here; county PAGES keep working through their existing
 * curated `majorCities` crosswalk, which is a curated approximation and
 * is documented as such rather than being relabelled exact inventory.
 *
 * DISTANCE LIMITATION (audited): the table has no latitude/longitude
 * either, so no honest radius can be computed. `nearby` is therefore
 * defined as a claim we can actually prove from the data — same state,
 * different city — and is never folded into an exact count.
 */

import type {
  GeoFacility,
  LocationRelation,
  LocationScope,
  LocationSplit,
} from "./locationTypes.ts";
import { citiesMatch } from "./normalizeCity.ts";
import { normalizeState } from "./normalizeState.ts";
import { zipsMatch } from "./normalizeZip.ts";

/**
 * Does this facility genuinely belong to this scope?
 *
 * This is the ONLY membership test. If it returns false, the facility
 * must not be counted or listed under that scope's label.
 */
export function matchesExactly(
  facility: GeoFacility,
  scope: LocationScope,
): boolean {
  switch (scope.type) {
    case "zip":
      return zipsMatch(facility.zipCode, scope.zip);

    case "state":
      return normalizeState(facility.state) === scope.state;

    case "city":
      // State first: it is the cheap check and the one that keeps
      // same-named cities in different states apart (Saint Charles IL
      // vs Saint Charles MO; Richmond spans six states).
      if (normalizeState(facility.state) !== scope.state) return false;
      return citiesMatch(facility.city, scope.city);

    case "city-any-state":
      return citiesMatch(facility.city, scope.city);

    case "county":
      // No facility-level county data exists. Refusing to guess.
      return false;

    case "unresolved":
      return false;
  }
}

/**
 * Classify a facility against a scope as exact / nearby / none.
 *
 * `nearby` is only ever offered for a city scope, and only means "same
 * state, different city" — a claim the data supports. It is a separate
 * bucket, never a silent extension of `exact`.
 */
export function relateToScope(
  facility: GeoFacility,
  scope: LocationScope,
): LocationRelation {
  if (matchesExactly(facility, scope)) return "exact";
  if (scope.type === "city") {
    if (normalizeState(facility.state) === scope.state) return "nearby";
  }
  return "none";
}

/**
 * Split a facility set into its exact and nearby buckets.
 *
 * `split.exact.length` is the only number that may be rendered as
 * "N facilities in <place>". `split.nearby` must be labelled as nearby
 * wherever it is shown.
 */
export function splitByLocation<T extends GeoFacility>(
  facilities: readonly T[],
  scope: LocationScope,
): LocationSplit<T> {
  const exact: T[] = [];
  const nearby: T[] = [];
  for (const f of facilities) {
    const rel = relateToScope(f, scope);
    if (rel === "exact") exact.push(f);
    else if (rel === "nearby") nearby.push(f);
  }
  return { exact, nearby };
}

/** Convenience: the exact set only. */
export function filterExact<T extends GeoFacility>(
  facilities: readonly T[],
  scope: LocationScope,
): T[] {
  return facilities.filter((f) => matchesExactly(f, scope));
}

/**
 * Truthful count for a scope. Always equals `filterExact(...).length`
 * — there is no path by which this returns a widened number.
 */
export function countExact(
  facilities: readonly GeoFacility[],
  scope: LocationScope,
): number {
  let n = 0;
  for (const f of facilities) if (matchesExactly(f, scope)) n++;
  return n;
}
