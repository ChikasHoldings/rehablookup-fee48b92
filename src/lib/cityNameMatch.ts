/**
 * City-name normalization for facility-to-city matching.
 *
 * Facilities come from multiple sources with inconsistent naming
 * conventions:
 *   • SAMHSA bulk import: "St. Louis", "Ft. Worth", "Mt. Pleasant"
 *     (with periods, abbreviated saint/fort/mount)
 *   • Provider self-submission: free-text — could be anything
 *   • Static seed data: "Saint Louis", "Fort Worth" (full words)
 *
 * Pages that filter facilities by city use a simple `.toLowerCase()`
 * comparison, which silently drops every SAMHSA "St. Louis" facility
 * from the "Saint Louis" city page (and vice versa). The same applies
 * to county pages (which match against a `majorCities` array) and
 * any other surface that maps facility.city → page slug.
 *
 * `normalizeCityName` canonicalizes both sides of the comparison:
 *
 *   "St. Louis"        → "saint louis"
 *   "Saint Louis"      → "saint louis"
 *   "St Louis"         → "saint louis"
 *   "Ft. Worth"        → "fort worth"
 *   "Mt. Pleasant"     → "mount pleasant"
 *   "St-Louis"         → "saint louis"   (handles hyphen)
 *   "  Saint  Louis  " → "saint louis"   (collapses whitespace)
 *
 * Use `citiesMatch(a, b)` for boolean comparison.
 *
 * Kept narrow on purpose: only handles the high-frequency Saint/Fort/
 * Mount/Point abbreviations + punctuation normalization. We don't try
 * to translate "NYC" → "New York" or other nicknames; that would
 * over-match. SAMHSA + USPS-style names are the in-scope inputs.
 */

const PREFIX_EXPANSIONS: Record<string, string> = {
  st: "saint",
  ste: "sainte",
  ft: "fort",
  mt: "mount",
  pt: "point",
};

export function normalizeCityName(name: string | null | undefined): string {
  if (!name) return "";
  // Lowercase, replace common separators (hyphens, periods) with spaces,
  // then collapse multiple whitespace to single space, then trim.
  const cleaned = name
    .toLowerCase()
    .replace(/[.\-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!cleaned) return "";
  // Expand prefix abbreviations word-by-word. Only expand if it's the
  // FIRST token so "the saint" doesn't match — city names start with
  // these abbreviations 100% of the time.
  const tokens = cleaned.split(" ");
  if (tokens.length > 0) {
    const first = tokens[0];
    if (PREFIX_EXPANSIONS[first]) {
      tokens[0] = PREFIX_EXPANSIONS[first];
    }
  }
  return tokens.join(" ");
}

/**
 * Returns true if two city names refer to the same city after
 * normalization. Use for any facility.city ↔ seed-data comparison.
 */
export function citiesMatch(a: string | null | undefined, b: string | null | undefined): boolean {
  const na = normalizeCityName(a);
  const nb = normalizeCityName(b);
  if (!na || !nb) return false;
  return na === nb;
}

/**
 * Returns true if `cityNeedle` matches ANY city in `cityHaystack`
 * after normalization. Used by CountyPage to test facility.city
 * against majorCities[].
 */
export function cityInList(
  cityNeedle: string | null | undefined,
  cityHaystack: readonly (string | null | undefined)[],
): boolean {
  const needle = normalizeCityName(cityNeedle);
  if (!needle) return false;
  for (const candidate of cityHaystack) {
    if (normalizeCityName(candidate) === needle) return true;
  }
  return false;
}
