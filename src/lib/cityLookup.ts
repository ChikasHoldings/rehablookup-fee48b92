import {
  getCityBySlug,
  getStateBySlug,
  type CityData,
  type StateData,
} from "@/data/locationSeoData";
import { providerCities } from "@/data/providerCityData";

/**
 * Resolve a (stateSlug, citySlug) pair into city metadata.
 *
 * Why this exists:
 * Several SEO page components (SubstanceCityPage, CoOccurringCityPage,
 * DemographicCityPage, DurationCityPage, CityTreatmentExpandedPage) used to
 * `<Navigate to="/treatment-types" replace />` whenever the requested city
 * wasn't in `locationSeoData.ts`. GSC logged those URLs as "Page with
 * redirect" and excluded them from indexing — but the cities themselves
 * were real (Malibu, Bend, Estes Park, …) and the React routes existed.
 *
 * This resolver tries three tiers in descending richness:
 *   1. `statesData[*].cities` — fully-authored SEO copy (preferred).
 *   2. `providerCities` — real population + facility-count metadata.
 *   3. Synthesized from the slug — last resort, page still renders with
 *      coherent (if templated) copy. Pages in this tier rely on the
 *      component's existing `validatePage` gate to set `noindex` when
 *      there isn't enough underlying inventory.
 */
export function resolveCity(
  stateSlug: string | undefined,
  citySlug: string | undefined,
): { state: StateData; city: CityData } | null {
  if (!stateSlug || !citySlug) return null;

  const state = getStateBySlug(stateSlug);
  if (!state) return null;

  // Tier 1 — full SEO copy. Uses `getCityBySlug` so natural-name slugs
  // (e.g. /colorado/lakewood resolving to data slug `lakewood-co`) match too.
  const seoCity = getCityBySlug(stateSlug, citySlug);
  if (seoCity) return { state, city: seoCity };

  // Tier 2 — provider/market metadata (real population, no SEO copy).
  const providerCity = providerCities.find(
    (c) => c.citySlug === citySlug && c.stateSlug === stateSlug,
  );
  if (providerCity) {
    return {
      state,
      city: {
        name: providerCity.city,
        slug: citySlug,
        population: providerCity.population,
        description: `${providerCity.city} offers addiction treatment programs including detox, residential, and outpatient services across the metro area.`,
        metaDescription: `Find drug and alcohol rehab centers in ${providerCity.city}, ${state.abbreviation}. Compare verified treatment facilities near you.`,
      },
    };
  }

  // Tier 3 — synthesized. Renders a coherent page so visitors at deep
  // links don't get 404'd, but yields no hand-authored content — the
  // calling component's `validatePage` gate decides whether to index.
  const name = titleCaseFromSlug(citySlug);
  return {
    state,
    city: {
      name,
      slug: citySlug,
      description: `${name} offers addiction treatment programs including detox, residential, and outpatient services in the surrounding ${state.name} community.`,
      metaDescription: `Find drug and alcohol rehab centers in ${name}, ${state.abbreviation}. Compare verified treatment facilities near you.`,
    },
  };
}

function titleCaseFromSlug(slug: string): string {
  return slug
    .split("-")
    .map((part) => (part.length > 0 ? part.charAt(0).toUpperCase() + part.slice(1) : part))
    .join(" ");
}
