/**
 * Type declarations for `core.mjs`.
 *
 * The rules live in plain JS so that every runtime — the browser, Node
 * 20 in the sitemap/static-route CI job, and Node 22 elsewhere — loads
 * ONE implementation. These declarations give TypeScript callers full
 * checking over that single implementation; they describe signatures
 * only and contain no logic of their own.
 */

export type StateAbbr = string;

export type LocationScope =
  | { type: "city"; city: string; state: StateAbbr }
  /** A city name with no state context — matches that city in ANY state. */
  | { type: "city-any-state"; city: string }
  | { type: "state"; state: StateAbbr }
  | { type: "zip"; zip: string }
  | { type: "county"; county: string; state: StateAbbr }
  /** Input we could not resolve to a real place. Never widens. */
  | { type: "unresolved"; raw: string };

/** The minimum a facility must expose to be placed geographically. */
export interface GeoFacility {
  city?: string | null;
  state?: string | null;
  zipCode?: string | null;
}

/**
 *   exact  — genuinely inside the requested scope
 *   nearby — same state as the requested city, different city. Truthful
 *            without coordinates: we can prove same-state, we cannot
 *            prove distance (the catalogue has no lat/lng).
 *   none   — outside the scope entirely
 */
export type LocationRelation = "exact" | "nearby" | "none";

/**
 * Split of a facility set against one scope. `exact.length` is the ONLY
 * number that may be rendered as "N facilities in <place>".
 */
export interface LocationSplit<T> {
  exact: T[];
  nearby: T[];
}

export declare const US_STATES: readonly { name: string; abbr: StateAbbr }[];

export declare function normalizeState(input: string | null | undefined): StateAbbr | null;
export declare function stateDisplayName(input: string | null | undefined): string | null;
export declare function statesMatch(a: string | null | undefined, b: string | null | undefined): boolean;
export declare function isValidState(input: string | null | undefined): boolean;
export declare function stateSlugFor(input: string | null | undefined): string | null;

export declare function normalizeCityName(name: string | null | undefined): string;
export declare function citiesMatch(a: string | null | undefined, b: string | null | undefined): boolean;
export declare function cityInList(
  cityNeedle: string | null | undefined,
  cityHaystack: readonly (string | null | undefined)[],
): boolean;
export declare function cityMatchKey(name: string | null | undefined): string;
export declare function cityMatchKeyFromSlug(slug: string | null | undefined): string;

export declare function normalizeZip(input: string | null | undefined): string | null;
export declare function zipsMatch(a: string | null | undefined, b: string | null | undefined): boolean;
export declare function isValidZip(input: string | null | undefined): boolean;

export declare function parseLocation(raw: string | null | undefined): LocationScope;
export declare function describeScope(scope: LocationScope): string;
export declare function isResolvedScope(scope: LocationScope): boolean;

export declare function matchesExactly(facility: GeoFacility, scope: LocationScope): boolean;
export declare function relateToScope(facility: GeoFacility, scope: LocationScope): LocationRelation;
export declare function splitByLocation<T extends GeoFacility>(
  facilities: readonly T[],
  scope: LocationScope,
): LocationSplit<T>;
export declare function filterExact<T extends GeoFacility>(
  facilities: readonly T[],
  scope: LocationScope,
): T[];
export declare function countExact(
  facilities: readonly GeoFacility[],
  scope: LocationScope,
): number;

export declare function stateCityKey(
  stateName: string | null | undefined,
  cityName: string | null | undefined,
): string;
export declare function stateCityKeyFromSlugs(
  stateSlugValue: string | null | undefined,
  citySlugValue: string | null | undefined,
): string;
