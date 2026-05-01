// Shared slug normalization helpers.
//
// One source of truth for how facility (center), state, city, and other
// slugs are formatted in URLs, canonical tags, JSON-LD `url` fields, and
// internal `<Link to=...>` paths.
//
// Why this matters:
//   - Lowercase canonical URLs are mandatory (see Core memory). Mixed-case
//     slugs cause "Duplicate without user-selected canonical" reports in
//     Google Search Console.
//   - Trailing/leading whitespace (often introduced by admin paste-in) leads
//     to malformed URLs like `/center/foo%20` which 404 or canonicalize to
//     a different page than the one rendered.
//   - Multiple call sites used to do `name.toLowerCase().replace(/\s+/g, "-")`
//     ad-hoc — we centralize that here so SEO and routing always agree.
//
// All exports are pure, framework-agnostic, and safe to call with `null` /
// `undefined`.

/**
 * Normalize an existing slug for use in URLs and SEO tags.
 *
 * - Trims surrounding whitespace
 * - Lowercases
 * - Collapses internal whitespace runs to a single hyphen
 * - Collapses repeated hyphens to a single hyphen
 * - Strips leading/trailing hyphens
 *
 * Does NOT remove non-ASCII characters — slugs in our DB are already
 * ASCII-safe; if a caller needs to *create* a slug from arbitrary text,
 * use {@link slugifyName} instead.
 *
 * Returns an empty string for null/undefined/empty inputs.
 */
export function normalizeSlug(slug: string | null | undefined): string {
  if (!slug) return "";
  return slug
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Build a slug from a free-text name (e.g. a facility name) when no
 * persisted slug is available. Used as a fallback in card links and SEO
 * tags so we never render a broken `/center/` URL.
 *
 * - Lowercases
 * - Replaces any non `[a-z0-9]` run with a single hyphen
 * - Trims leading/trailing hyphens
 */
export function slugifyName(name: string | null | undefined): string {
  if (!name) return "";
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Resolve the canonical slug for a facility-shaped object: prefer the
 * persisted `slug` (normalized), fall back to a name-derived slug.
 *
 * Returns an empty string if neither field yields a usable slug — callers
 * should guard against this and skip rendering the link rather than
 * producing `/center/` with a trailing slash.
 */
export function resolveFacilitySlug(facility: {
  slug?: string | null;
  name?: string | null;
}): string {
  const fromSlug = normalizeSlug(facility.slug);
  if (fromSlug) return fromSlug;
  return slugifyName(facility.name);
}

/**
 * Build the canonical `/center/<slug>` URL path for a facility. Returns
 * `null` when no slug can be resolved so callers can short-circuit
 * rendering instead of producing a dead link.
 */
export function buildFacilityPath(facility: {
  slug?: string | null;
  name?: string | null;
}): string | null {
  const slug = resolveFacilitySlug(facility);
  return slug ? `/center/${slug}` : null;
}
