/**
 * City-name normalization for facility-to-city matching.
 *
 * The rules now live in the canonical location layer
 * (`src/lib/location/core.mjs`) and are re-exported here unchanged, so
 * this module's eleven existing callers keep working exactly as before
 * while search, the SEO pages and the Node build generators all share
 * ONE implementation instead of three that disagree.
 *
 * The behaviour is identical to what this file implemented directly:
 *
 *   "St. Louis"        → "saint louis"
 *   "Saint Louis"      → "saint louis"
 *   "St Louis"         → "saint louis"
 *   "Ft. Worth"        → "fort worth"
 *   "Mt. Pleasant"     → "mount pleasant"
 *   "St-Louis"         → "saint louis"   (handles hyphen)
 *   "  Saint  Louis  " → "saint louis"   (collapses whitespace)
 *
 * Facilities come from multiple sources with inconsistent conventions
 * (SAMHSA bulk import uses "St. Louis"; static seed data uses "Saint
 * Louis"; provider self-submission is free text), and a plain
 * `.toLowerCase()` comparison silently drops one spelling from the
 * other's city page.
 *
 * Kept narrow on purpose: only the high-frequency Saint/Fort/Mount/Point
 * abbreviations plus punctuation normalization. We don't translate
 * "NYC" → "New York" or other nicknames, and we don't do fuzzy matching
 * — either could merge genuinely different municipalities.
 *
 * Use `citiesMatch(a, b)` for boolean comparison, and `cityInList` to
 * test a facility's city against a `majorCities` array.
 */

export { normalizeCityName, citiesMatch, cityInList } from "./location/core.mjs";
