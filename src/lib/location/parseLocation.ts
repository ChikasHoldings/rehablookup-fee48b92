/**
 * Parse a free-text location query into a canonical `LocationScope`.
 *
 * Supported forms:
 *
 *   "90210"                → { zip }
 *   "90210-1234"           → { zip }            (folds to 5-digit base)
 *   "Los Angeles, CA"      → { city, state }
 *   "Los Angeles, Calif…"  → { city, state }
 *   "California" / "CA"    → { state }
 *   "Washington, DC"       → { city: Washington, state: DC }
 *   "Orange County, CA"    → { county, state }
 *   "Los Angeles"          → { city-any-state }
 *   "asdfgh"               → { unresolved }
 *
 * Two hard rules:
 *
 * 1. An unrecognised query becomes `unresolved` — never a silent
 *    "match everything". `unresolved` matches NOTHING, which is what
 *    stops a typo from quietly returning the national catalogue.
 *
 * 2. A bare city name does NOT get a state guessed for it. It becomes
 *    `city-any-state`, which matches that city name in every state and
 *    says so. "Richmond" is six different cities in the live catalogue
 *    and "Springfield" must not silently choose one.
 */

import type { LocationScope } from "./locationTypes.ts";
import { normalizeState } from "./normalizeState.ts";
import { normalizeZip } from "./normalizeZip.ts";
import { normalizeCityName } from "./normalizeCity.ts";

/** Strips a trailing "County" token: "Orange County" → "Orange". */
const stripCountySuffix = (s: string): string | null => {
  const m = s.trim().match(/^(.+?)\s+count(?:y|ies)$/i);
  return m ? m[1].trim() : null;
};

/**
 * Parse a raw location query. Returns a scope that is always safe to
 * hand straight to `matchLocation` — including `unresolved`, which
 * deliberately matches nothing.
 */
export function parseLocation(raw: string | null | undefined): LocationScope {
  const input = String(raw ?? "").trim().replace(/\s+/g, " ");
  if (!input) return { type: "unresolved", raw: "" };

  // 1) ZIP — checked first so "90210" is never read as a city name.
  const zip = normalizeZip(input);
  if (zip) return { type: "zip", zip };

  // A bare digit run that is not a valid ZIP ("902", "1234567") is not a
  // place. Refuse it rather than treating it as a city called "902".
  if (/^\d+$/.test(input)) return { type: "unresolved", raw: input };

  // 2) "<place>, <state>" — the comma is an explicit separator, so split
  //    on the LAST comma to tolerate "Brooklyn, New York, NY".
  const lastComma = input.lastIndexOf(",");
  if (lastComma > 0) {
    const head = input.slice(0, lastComma).trim();
    const tail = input.slice(lastComma + 1).trim();
    const state = normalizeState(tail);
    if (state && head) {
      const county = stripCountySuffix(head);
      if (county) return { type: "county", county, state };
      return { type: "city", city: head, state };
    }
    // Comma present but the tail is not a real state. Fall through — the
    // whole string still gets a chance to resolve, and if it doesn't it
    // ends as `unresolved` rather than as a bogus city.
  }

  // 3) Whole input is a state ("California", "CA", "District of Columbia").
  const wholeState = normalizeState(input);
  if (wholeState) {
    // "Washington DC" reads more naturally as the city of Washington in
    // DC than as the district-as-state. Same facility set either way in
    // the live catalogue, but the label is the one the user typed.
    if (wholeState === "DC" && /washington/i.test(input)) {
      return { type: "city", city: "Washington", state: "DC" };
    }
    return { type: "state", state: wholeState };
  }

  // 4) "<county> County" with no state — we cannot place a county
  //    without a state, and inventing one would be a guess.
  const bareCounty = stripCountySuffix(input);
  if (bareCounty) return { type: "unresolved", raw: input };

  // 5) A city name with no state context. Matches that city in any
  //    state, and callers label it accordingly.
  if (normalizeCityName(input)) {
    return { type: "city-any-state", city: input };
  }

  return { type: "unresolved", raw: input };
}

/**
 * Human label for a scope — used for result headings so the copy can
 * never claim a geography the scope doesn't actually cover.
 */
export function describeScope(scope: LocationScope): string {
  switch (scope.type) {
    case "city":
      return `${scope.city}, ${scope.state}`;
    case "city-any-state":
      return scope.city;
    case "state":
      return scope.state;
    case "zip":
      return `ZIP ${scope.zip}`;
    case "county":
      return `${scope.county} County, ${scope.state}`;
    case "unresolved":
      return scope.raw;
  }
}

/** True when the scope can actually select facilities. */
export function isResolvedScope(scope: LocationScope): boolean {
  return scope.type !== "unresolved";
}
