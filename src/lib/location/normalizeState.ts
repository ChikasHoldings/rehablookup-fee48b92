/**
 * Canonical US state normalizer.
 *
 * Deterministic, table-driven, and bidirectional:
 *
 *   "California" → "CA"      "CA" → "CA"      "  california " → "CA"
 *   "New York"   → "NY"      "ny" → "NY"
 *   "District of Columbia" → "DC"            "Washington, D.C." → "DC"
 *
 * Two rules that matter:
 *
 * 1. NO fuzzy matching. An unknown or invalid state stays invalid
 *    (`null`) rather than being guessed at. Guessing a state is how a
 *    search silently escapes the geography it claims to cover.
 *
 * 2. District of Columbia is a first-class entry. The previous
 *    `usStatesWithAbbr` table held exactly 50 states and omitted DC,
 *    while the live catalogue carries 18 approved facilities recorded as
 *    `state = "District of Columbia"`. Every one of them failed state
 *    normalization, so a "Washington, DC" search matched nothing — which
 *    then tripped the zero-result widening path and returned the entire
 *    nationwide catalogue under a "Washington, DC" label. Including DC
 *    here is what makes that market addressable at all.
 *
 * The live `facilities` table stores state as a FULL NAME for 100% of
 * approved rows ("California", never "CA"), but provider self-submission
 * is free text, so both directions are supported on both sides of every
 * comparison.
 */

import type { StateAbbr } from "./locationTypes.ts";

/** 50 states + District of Columbia. Abbreviations are USPS codes. */
export const US_STATES: readonly { name: string; abbr: StateAbbr }[] = [
  { name: "Alabama", abbr: "AL" },
  { name: "Alaska", abbr: "AK" },
  { name: "Arizona", abbr: "AZ" },
  { name: "Arkansas", abbr: "AR" },
  { name: "California", abbr: "CA" },
  { name: "Colorado", abbr: "CO" },
  { name: "Connecticut", abbr: "CT" },
  { name: "Delaware", abbr: "DE" },
  { name: "District of Columbia", abbr: "DC" },
  { name: "Florida", abbr: "FL" },
  { name: "Georgia", abbr: "GA" },
  { name: "Hawaii", abbr: "HI" },
  { name: "Idaho", abbr: "ID" },
  { name: "Illinois", abbr: "IL" },
  { name: "Indiana", abbr: "IN" },
  { name: "Iowa", abbr: "IA" },
  { name: "Kansas", abbr: "KS" },
  { name: "Kentucky", abbr: "KY" },
  { name: "Louisiana", abbr: "LA" },
  { name: "Maine", abbr: "ME" },
  { name: "Maryland", abbr: "MD" },
  { name: "Massachusetts", abbr: "MA" },
  { name: "Michigan", abbr: "MI" },
  { name: "Minnesota", abbr: "MN" },
  { name: "Mississippi", abbr: "MS" },
  { name: "Missouri", abbr: "MO" },
  { name: "Montana", abbr: "MT" },
  { name: "Nebraska", abbr: "NE" },
  { name: "Nevada", abbr: "NV" },
  { name: "New Hampshire", abbr: "NH" },
  { name: "New Jersey", abbr: "NJ" },
  { name: "New Mexico", abbr: "NM" },
  { name: "New York", abbr: "NY" },
  { name: "North Carolina", abbr: "NC" },
  { name: "North Dakota", abbr: "ND" },
  { name: "Ohio", abbr: "OH" },
  { name: "Oklahoma", abbr: "OK" },
  { name: "Oregon", abbr: "OR" },
  { name: "Pennsylvania", abbr: "PA" },
  { name: "Rhode Island", abbr: "RI" },
  { name: "South Carolina", abbr: "SC" },
  { name: "South Dakota", abbr: "SD" },
  { name: "Tennessee", abbr: "TN" },
  { name: "Texas", abbr: "TX" },
  { name: "Utah", abbr: "UT" },
  { name: "Vermont", abbr: "VT" },
  { name: "Virginia", abbr: "VA" },
  { name: "Washington", abbr: "WA" },
  { name: "West Virginia", abbr: "WV" },
  { name: "Wisconsin", abbr: "WI" },
  { name: "Wyoming", abbr: "WY" },
];

/**
 * Alternate spellings that are UNAMBIGUOUS. Kept deliberately tiny — this
 * is an exact-alias table, not a fuzzy matcher. "Washington DC" resolves
 * to DC (the district) rather than WA (the state) because the trailing
 * "DC" is explicit; a bare "Washington" stays WA, matching USPS.
 */
const STATE_ALIASES: Record<string, StateAbbr> = {
  "washington dc": "DC",
  "washington d c": "DC",
  "d c": "DC",
  "district of columbia": "DC",
  "washington district of columbia": "DC",
};

/** Lowercase, collapse whitespace, drop periods/commas. No fuzz. */
const foldStateKey = (raw: string): string =>
  raw
    .toLowerCase()
    .replace(/[.,]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const BY_NAME = new Map<string, StateAbbr>();
const BY_ABBR = new Map<string, StateAbbr>();
const ABBR_TO_NAME = new Map<StateAbbr, string>();
for (const s of US_STATES) {
  BY_NAME.set(foldStateKey(s.name), s.abbr);
  BY_ABBR.set(s.abbr.toLowerCase(), s.abbr);
  ABBR_TO_NAME.set(s.abbr, s.name);
}

/**
 * Canonicalize any state input to its USPS abbreviation, or `null` when
 * the input is not a real US state/district.
 *
 * Accepts full names, abbreviations, and the explicit DC aliases above.
 * Case and surrounding whitespace are irrelevant. Everything else is
 * rejected rather than guessed.
 */
export function normalizeState(input: string | null | undefined): StateAbbr | null {
  if (!input) return null;
  const key = foldStateKey(String(input));
  if (!key) return null;
  const alias = STATE_ALIASES[key];
  if (alias) return alias;
  const byName = BY_NAME.get(key);
  if (byName) return byName;
  // Only a bare 2-letter token may be read as an abbreviation, so a city
  // called "Ok" or a stray "in" inside free text can't become a state.
  if (key.length === 2) {
    const byAbbr = BY_ABBR.get(key);
    if (byAbbr) return byAbbr;
  }
  return null;
}

/** Full display name for a state, or `null` if not a real state. */
export function stateDisplayName(input: string | null | undefined): string | null {
  const abbr = normalizeState(input);
  return abbr ? (ABBR_TO_NAME.get(abbr) ?? null) : null;
}

/** True when both inputs resolve to the SAME real state. */
export function statesMatch(
  a: string | null | undefined,
  b: string | null | undefined,
): boolean {
  const na = normalizeState(a);
  const nb = normalizeState(b);
  if (!na || !nb) return false;
  return na === nb;
}

/** True when the input names a real US state or DC. */
export function isValidState(input: string | null | undefined): boolean {
  return normalizeState(input) !== null;
}

/** URL slug for a state, e.g. "new-york", "district-of-columbia". */
export function stateSlugFor(input: string | null | undefined): string | null {
  const name = stateDisplayName(input);
  return name ? name.toLowerCase().replace(/\s+/g, "-") : null;
}
