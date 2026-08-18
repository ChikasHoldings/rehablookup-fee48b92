/**
 * Canonical location rules — THE implementation.
 *
 * Plain ES module on purpose. Everything geographic in RehabLookup
 * resolves through this one file:
 *
 *   • the browser, via the typed wrappers in `src/lib/location/*.ts`
 *   • `src/lib/cityNameMatch.ts`, which re-exports the city helpers so
 *     its eleven existing callers keep working unchanged
 *   • the Node build generators in `scripts/`, which import it directly
 *
 * Why `.mjs` rather than `.ts`: the generators run under several Node
 * versions, and the sitemap/static-route CI job is pinned to Node 20,
 * which cannot import a `.ts` file at all (type stripping needs Node
 * 22+). Keeping the rules in plain JS means one implementation that
 * every runtime can load, instead of a copy in `scripts/` that drifts
 * away from the copy the browser uses. Types live alongside in
 * `core.d.mts`, so TypeScript callers still get full checking.
 *
 * The contract: a page or search labelled "Los Angeles" contains Los
 * Angeles facilities and nothing else. EXACT and NEARBY are different
 * concepts, and nearby is never folded into an exact count.
 */

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

/** 50 states + District of Columbia. Abbreviations are USPS codes. */
export const US_STATES = [
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
 * Alternate spellings that are UNAMBIGUOUS. Deliberately tiny — an
 * exact-alias table, not a fuzzy matcher. "Washington DC" resolves to DC
 * because the trailing "DC" is explicit; a bare "Washington" stays WA,
 * matching USPS.
 */
const STATE_ALIASES = {
  "washington dc": "DC",
  "washington d c": "DC",
  "d c": "DC",
  "district of columbia": "DC",
  "washington district of columbia": "DC",
};

/** Lowercase, collapse whitespace, drop periods/commas. No fuzz. */
const foldStateKey = (raw) =>
  String(raw)
    .toLowerCase()
    .replace(/[.,]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const BY_NAME = new Map();
const BY_ABBR = new Map();
const ABBR_TO_NAME = new Map();
for (const s of US_STATES) {
  BY_NAME.set(foldStateKey(s.name), s.abbr);
  BY_ABBR.set(s.abbr.toLowerCase(), s.abbr);
  ABBR_TO_NAME.set(s.abbr, s.name);
}

/**
 * Canonicalize any state input to its USPS abbreviation, or `null` when
 * the input is not a real US state/district.
 *
 * NO fuzzy matching: an unknown state stays invalid rather than being
 * guessed at. Guessing is how a search silently escapes the geography it
 * claims to cover.
 *
 * District of Columbia is a first-class entry. The previous 50-entry
 * table omitted it while the live catalogue carries 18 approved
 * facilities recorded as `state = "District of Columbia"` — every one of
 * them failed normalization, so a "Washington, DC" search matched
 * nothing and then tripped the zero-result widening path.
 */
export function normalizeState(input) {
  if (input === null || input === undefined || input === "") return null;
  const key = foldStateKey(input);
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
export function stateDisplayName(input) {
  const abbr = normalizeState(input);
  return abbr ? ABBR_TO_NAME.get(abbr) ?? null : null;
}

/** True when both inputs resolve to the SAME real state. */
export function statesMatch(a, b) {
  const na = normalizeState(a);
  const nb = normalizeState(b);
  if (!na || !nb) return false;
  return na === nb;
}

/** True when the input names a real US state or DC. */
export function isValidState(input) {
  return normalizeState(input) !== null;
}

/** URL slug for a state, e.g. "new-york", "district-of-columbia". */
export function stateSlugFor(input) {
  const name = stateDisplayName(input);
  return name ? name.toLowerCase().replace(/\s+/g, "-") : null;
}

// ---------------------------------------------------------------------------
// City
// ---------------------------------------------------------------------------

/**
 * Facilities arrive from sources with inconsistent naming:
 *   • SAMHSA bulk import: "St. Louis", "Ft. Worth", "Mt. Pleasant"
 *   • provider self-submission: free text
 *   • static seed data: "Saint Louis", "Fort Worth"
 *
 * A plain `.toLowerCase()` comparison silently drops every "St. Louis"
 * facility from the "Saint Louis" page and vice versa. From live data:
 * "Saint Charles", Illinois has 2 facilities and "St Charles", Illinois
 * has 1 — one city, recorded two ways.
 *
 * Kept narrow on purpose: only the high-frequency Saint/Fort/Mount/Point
 * abbreviations plus punctuation folding. No nickname expansion
 * ("NYC" → "New York") and no fuzzy/Levenshtein matching, either of
 * which could collapse two genuinely different municipalities.
 */
const PREFIX_EXPANSIONS = {
  st: "saint",
  ste: "sainte",
  ft: "fort",
  mt: "mount",
  pt: "point",
};

export function normalizeCityName(name) {
  if (!name) return "";
  const cleaned = String(name)
    .toLowerCase()
    .replace(/[.\-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!cleaned) return "";
  // Expand prefix abbreviations only in FIRST position, so "the saint"
  // doesn't match — city names start with these abbreviations always.
  const tokens = cleaned.split(" ");
  if (tokens.length > 0) {
    const first = tokens[0];
    if (PREFIX_EXPANSIONS[first]) tokens[0] = PREFIX_EXPANSIONS[first];
  }
  return tokens.join(" ");
}

/** True when two city names refer to the same city after normalization. */
export function citiesMatch(a, b) {
  const na = normalizeCityName(a);
  const nb = normalizeCityName(b);
  if (!na || !nb) return false;
  return na === nb;
}

/** True when `cityNeedle` matches ANY city in `cityHaystack`. */
export function cityInList(cityNeedle, cityHaystack) {
  const needle = normalizeCityName(cityNeedle);
  if (!needle) return false;
  for (const candidate of cityHaystack) {
    if (normalizeCityName(candidate) === needle) return true;
  }
  return false;
}

/**
 * Canonical slug-shaped MATCH key for a city name — not a URL.
 * Published city-page URLs are unchanged: `/rehab-centers/missouri/
 * st-charles` keeps its slug. What changes is that both the page slug
 * and the facility's recorded city fold to the same key
 * ("saint-charles"), so the page finds its facilities. No redirects, no
 * slug migration.
 */
export function cityMatchKey(name) {
  return normalizeCityName(name).replace(/\s+/g, "-");
}

/** Match key for a value that arrived as a URL slug ("st-charles"). */
export function cityMatchKeyFromSlug(slug) {
  if (!slug) return "";
  return cityMatchKey(String(slug).replace(/-+/g, " "));
}

// ---------------------------------------------------------------------------
// ZIP
// ---------------------------------------------------------------------------

/**
 * Audited against the live catalogue before writing any rule here
 * (3,797 approved facilities): 0 null, 3,796 clean 5-digit, 1 ZIP+4,
 * 0 malformed. Clean enough to drive exact public filtering, so ZIP is a
 * first-class exact scope rather than a hint.
 *
 * Exact ZIP means exact ZIP — no substring, no prefix bucketing. ZIP+4
 * folds to its 5-digit base on both sides, which is safe by
 * construction: the +4 identifies a delivery route inside one 5-digit
 * ZIP. A partial ZIP is not a ZIP and resolves to null rather than
 * inventing precision.
 */
export function normalizeZip(input) {
  if (input === null || input === undefined) return null;
  const trimmed = String(input).trim();
  if (!trimmed) return null;
  const m = trimmed.match(/^(\d{5})(?:-?\d{4})?$/);
  return m ? m[1] : null;
}

/** True when both inputs are valid ZIPs sharing the same 5-digit base. */
export function zipsMatch(a, b) {
  const na = normalizeZip(a);
  const nb = normalizeZip(b);
  if (!na || !nb) return false;
  return na === nb;
}

/** True when the input is a well-formed 5-digit or ZIP+4 code. */
export function isValidZip(input) {
  return normalizeZip(input) !== null;
}

// ---------------------------------------------------------------------------
// Parsing
// ---------------------------------------------------------------------------

/** Strips a trailing "County" token: "Orange County" → "Orange". */
const stripCountySuffix = (s) => {
  const m = String(s).trim().match(/^(.+?)\s+count(?:y|ies)$/i);
  return m ? m[1].trim() : null;
};

/**
 * Parse a raw location query into a canonical scope.
 *
 * Two hard rules:
 *   1. An unrecognised query becomes `unresolved` — never a silent
 *      "match everything". `unresolved` matches NOTHING, which is what
 *      stops a typo from quietly returning the national catalogue.
 *   2. A bare city name does NOT get a state guessed for it. It becomes
 *      `city-any-state`, which matches that city in every state and says
 *      so. "Richmond" is six different cities in the live catalogue.
 */
export function parseLocation(raw) {
  const input = String(raw ?? "").trim().replace(/\s+/g, " ");
  if (!input) return { type: "unresolved", raw: "" };

  // 1) ZIP first, so "90210" is never read as a city name.
  const zip = normalizeZip(input);
  if (zip) return { type: "zip", zip };

  // A digit run that is not a valid ZIP ("902", "1234567") is not a
  // place. Refuse it rather than treating it as a city called "902".
  if (/^\d+$/.test(input)) return { type: "unresolved", raw: input };

  // 2) "<place>, <state>" — split on the LAST comma so
  //    "Brooklyn, New York, NY" still resolves.
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
    // Comma present but the tail isn't a real state — fall through. The
    // whole string still gets a chance, and if it fails it ends as
    // `unresolved` rather than as a bogus city.
  }

  // 3) Whole input is a state.
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
  if (stripCountySuffix(input)) return { type: "unresolved", raw: input };

  // 5) A city name with no state context.
  if (normalizeCityName(input)) return { type: "city-any-state", city: input };

  return { type: "unresolved", raw: input };
}

/**
 * Human label for a scope — result headings use this so the copy can
 * never claim a geography the scope doesn't actually cover.
 */
export function describeScope(scope) {
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
    default:
      return scope.raw ?? "";
  }
}

/** True when the scope can actually select facilities. */
export function isResolvedScope(scope) {
  return scope.type !== "unresolved";
}

// ---------------------------------------------------------------------------
// Matching — the membership contract
// ---------------------------------------------------------------------------

/**
 * Does this facility genuinely belong to this scope?
 *
 * This is the ONLY membership test. If it returns false, the facility
 * must not be counted or listed under that scope's label.
 *
 *   city   → same normalized state AND same normalized city. No
 *            statewide fallback, no neighbouring-state fallback, no
 *            radius expansion, no substring fallback, and no
 *            "zero matches means ignore the location filter".
 *   state  → exactly that state. Never its neighbours.
 *   zip    → exactly that 5-digit ZIP.
 *   county → nothing; see below.
 *
 * Paid status is not an input. Pro, Featured and Sponsored have no
 * bearing on whether a facility is in Los Angeles, and ranking never
 * decides membership — it may only order an already-exact set.
 *
 * COUNTY LIMITATION (audited, not assumed): the `facilities` table has
 * no county column — the geographic fields are city, state, zip_code and
 * address, nothing else. There is no trustworthy facility→county
 * mapping, and this module refuses to invent one. It will not infer
 * county from a city name: a facility in the city of Orange is not
 * evidence about Orange County. County PAGES keep working through their
 * existing curated `majorCities` crosswalk, which is documented as a
 * curated approximation rather than relabelled exact inventory.
 *
 * DISTANCE LIMITATION (audited): no latitude/longitude either, so no
 * honest radius can be computed. `nearby` is therefore defined as
 * something the data can prove — same state, different city — and is
 * never folded into an exact count.
 */
export function matchesExactly(facility, scope) {
  switch (scope.type) {
    case "zip":
      return zipsMatch(facility.zipCode, scope.zip);
    case "state":
      return normalizeState(facility.state) === scope.state;
    case "city":
      // State first: the cheap check, and the one that keeps same-named
      // cities in different states apart (Saint Charles IL vs MO).
      if (normalizeState(facility.state) !== scope.state) return false;
      return citiesMatch(facility.city, scope.city);
    case "city-any-state":
      return citiesMatch(facility.city, scope.city);
    case "county":
      return false; // no facility-level county data exists
    default:
      return false; // unresolved selects nothing
  }
}

/**
 * Classify a facility as exact / nearby / none.
 *
 * `nearby` is offered only for a city scope, and only means "same state,
 * different city" — a claim the data supports. Separate bucket, never a
 * silent extension of `exact`.
 */
export function relateToScope(facility, scope) {
  if (matchesExactly(facility, scope)) return "exact";
  if (scope.type === "city" && normalizeState(facility.state) === scope.state) {
    return "nearby";
  }
  return "none";
}

/**
 * Split a facility set into exact and nearby buckets.
 *
 * `split.exact.length` is the only number that may be rendered as
 * "N facilities in <place>". `split.nearby` must be labelled as nearby
 * wherever it is shown.
 */
export function splitByLocation(facilities, scope) {
  const exact = [];
  const nearby = [];
  for (const f of facilities) {
    const rel = relateToScope(f, scope);
    if (rel === "exact") exact.push(f);
    else if (rel === "nearby") nearby.push(f);
  }
  return { exact, nearby };
}

/** The exact set only. */
export function filterExact(facilities, scope) {
  return facilities.filter((f) => matchesExactly(f, scope));
}

/**
 * Truthful count for a scope. Always equals `filterExact(...).length` —
 * there is no path by which this returns a widened number.
 */
export function countExact(facilities, scope) {
  let n = 0;
  for (const f of facilities) if (matchesExactly(f, scope)) n++;
  return n;
}

/** Canonical `state/city` association key from raw facility values. */
export function stateCityKey(stateName, cityName) {
  return `${stateSlugFor(stateName) ?? ""}/${cityMatchKey(cityName)}`;
}

/**
 * Canonical association key built from URL slugs, e.g.
 * ("missouri", "st-charles") → "missouri/saint-charles". Use this on the
 * PAGE side so both sides of the lookup fold identically.
 */
export function stateCityKeyFromSlugs(stateSlugValue, citySlugValue) {
  const stateName = String(stateSlugValue ?? "").replace(/-+/g, " ");
  return `${stateSlugFor(stateName) ?? ""}/${cityMatchKeyFromSlug(citySlugValue)}`;
}
