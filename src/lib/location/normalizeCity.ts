/**
 * Canonical city-name normalization.
 *
 * This module deliberately does NOT introduce a second city normalizer.
 * `src/lib/cityNameMatch.ts` already implements the correct, narrow rule
 * set (Saint/Sainte/Fort/Mount/Point prefix expansion + punctuation and
 * whitespace folding) and is already trusted by every React SEO page. We
 * re-export it here so the canonical layer has one obvious entry point,
 * and so the Node build generators — which previously used their own raw
 * `toLowerCase().replace(/\s+/g,"-")` slug and therefore disagreed with
 * the browser — can consume exactly the same function.
 *
 * Why this matters, from live data:
 *
 *   "Saint Charles", Illinois   → 2 facilities
 *   "St Charles",    Illinois   → 1 facility
 *
 * They are one city. Raw lowercasing splits them into two, so the
 * `/rehab-centers/illinois/...` inventory was being computed against a
 * partial set. The same split left five prerendered city pages —
 * st-paul, st-louis, st-charles, st-george, st-clair-shores — shipping
 * ZERO crawler-visible facility inventory while real facilities existed
 * in those cities.
 *
 * What we deliberately do NOT do: fuzzy/Levenshtein matching, nickname
 * expansion ("NYC" → "New York"), or anything else that could collapse
 * two genuinely different municipalities into one. Only deterministic
 * equivalences the data actually supports.
 */

export { normalizeCityName, citiesMatch, cityInList } from "../cityNameMatch.ts";

import { normalizeCityName } from "../cityNameMatch.ts";

/**
 * Canonical slug-shaped match key for a city name.
 *
 * NOTE: this is a MATCHING key, not a URL. Published city-page URLs are
 * unchanged by this phase — `/rehab-centers/missouri/st-charles` keeps
 * its slug. What changes is that both the page slug and the facility's
 * recorded city fold to the same key ("saint-charles") so the page finds
 * its facilities. No redirects, no slug migration.
 */
export function cityMatchKey(name: string | null | undefined): string {
  return normalizeCityName(name).replace(/\s+/g, "-");
}

/**
 * Canonical match key for a value that arrived as a URL slug
 * ("st-charles", "los-angeles"). Hyphens are read as word separators
 * before normalization so slug and free-text forms converge.
 */
export function cityMatchKeyFromSlug(slug: string | null | undefined): string {
  if (!slug) return "";
  return cityMatchKey(String(slug).replace(/-+/g, " "));
}
