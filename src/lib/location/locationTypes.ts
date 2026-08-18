/**
 * Canonical geographic vocabulary for RehabLookup.
 *
 * ONE source of truth, shared by:
 *   • public search (`SearchResults.tsx`)
 *   • programmatic SEO landing pages
 *   • the Node build generators that emit crawler-facing inventory
 *
 * The whole point of this module is that a page or search labelled
 * "Los Angeles" means Los Angeles — not Los Angeles + all of California
 * + Arizona/Nevada/Oregon + an arbitrary fallback set.
 *
 * EXACT and NEARBY are deliberately DIFFERENT concepts. `nearby` is never
 * a hidden behaviour inside an exact scope: callers that want nearby
 * results must ask for them separately and label them separately.
 *
 * Framework-free on purpose — no React, no Vite `@/` aliases, no Supabase.
 * Node 22 strips the types on import, so `scripts/*.mjs` consume the very
 * same rules the browser does rather than re-implementing them.
 */

/** Two-letter USPS code, uppercase. `"CA"`, `"NY"`, `"DC"`. */
export type StateAbbr = string;

/**
 * A geographic scope the user (or a landing page) has asked for.
 *
 * `city` always carries its state: "Springfield" alone must never pick a
 * state on the user's behalf, and "Richmond" exists in six states in the
 * live catalogue.
 */
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
 * How a facility relates to a scope.
 *
 *   exact  — genuinely inside the requested scope
 *   nearby — same state as the requested city, but a DIFFERENT city.
 *            Truthful without coordinates: we can prove same-state, we
 *            cannot prove distance (the catalogue has no lat/lng).
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
