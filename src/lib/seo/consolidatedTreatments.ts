/**
 * Treatment/specialty slugs whose state and city pages were consolidated into
 * the location hubs on 2026-11-24 (vercel.json 301s
 * /treatment-types/{slug}/:state[/:city] → /rehab-centers/:state[/:city]).
 *
 * No facility attribute records these specialties, so every such page was a
 * template over the same listings as the state or city hub. The national
 * guides (/treatment-types/{slug}) remain. Link builders use this list so the
 * site never links to a URL that only redirects.
 */
export const LOCATION_CONSOLIDATED_TREATMENT_SLUGS: ReadonlySet<string> = new Set([
  "faith-based-rehab",
  "fentanyl-rehab",
  "free-rehab",
  "luxury-rehab",
  "mens-rehab",
  "sober-living",
  "veterans-rehab",
  "womens-rehab",
  "holistic-therapy",
  "holistic",
]);

export function isLocationConsolidated(slug: string | null | undefined): boolean {
  return !!slug && LOCATION_CONSOLIDATED_TREATMENT_SLUGS.has(slug);
}

/** State-level destination for a treatment link: the state hub when consolidated. */
export function treatmentStateHref(slug: string, stateSlug: string): string {
  return isLocationConsolidated(slug) ? `/rehab-centers/${stateSlug}` : `/treatment-types/${slug}/${stateSlug}`;
}
