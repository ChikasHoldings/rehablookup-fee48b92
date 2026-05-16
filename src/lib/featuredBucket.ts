import type { PlacementType } from "@/hooks/useFeaturedRotation";

/**
 * Resolves the (placement_type, placement_value) Featured bucket for
 * a /search-results visitor based on their active filters.
 *
 * Priority order (matches the spec):
 *   1. Both state AND city → use (city, <city slug>) — most specific.
 *   2. State only          → use (state, <state slug>).
 *   3. Treatment / LoC only → use (treatment, <slug>).
 *   4. Nothing geo or LoC  → fall through to (homepage, 'national').
 *
 * Returns null when the inputs can't be confidently mapped — the caller
 * should hide the Featured rail rather than fall back further.
 */
export function resolveSearchBucket(params: {
  state?: string | null;
  citySlug?: string | null;
  treatmentSlug?: string | null;
}): { placement_type: PlacementType; placement_value: string } | null {
  const { state, citySlug, treatmentSlug } = params;

  if (state && citySlug) {
    return { placement_type: "city", placement_value: slugify(citySlug) };
  }
  if (state) {
    return { placement_type: "state", placement_value: state.toUpperCase() };
  }
  if (treatmentSlug) {
    return { placement_type: "treatment", placement_value: slugify(treatmentSlug) };
  }
  // No geo or LoC filter — render the national homepage pool. The
  // bucket cap there (6 slots) sits naturally on a generic search.
  return { placement_type: "homepage", placement_value: "national" };
}

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}
