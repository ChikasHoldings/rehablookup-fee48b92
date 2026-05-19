import { getCountyBySlug, type CountyData } from "@/data/countySeoData";
import { getStateBySlug, type StateData } from "@/data/locationSeoData";

/**
 * Resolve a (stateSlug, countySlug) pair to (state, county) data.
 *
 * Mirrors `resolveCity` from `cityLookup.ts`: a hand-curated entry in
 * `countySeoData` is preferred (richer FAQs, demographics, access notes),
 * but if Google has indexed a county slug we haven't authored yet, we
 * synthesize a minimal CountyData from the slug so the page renders
 * coherent content backed by state-level facility fallback rather than
 * 404-ing the URL.
 *
 * Why this matters:
 * `CountyPage` and `CountyTreatmentPage` previously returned `<NotFound />`
 * whenever the requested county wasn't in `countySeoData`. GSC reports
 * thousands of those URLs under "Page with redirect" / "Soft 404" because
 * the React routes are real (App.tsx:599-600) but the data set is
 * incomplete. Synthesizing fallback data lets the canonical URL render,
 * the existing `validatePage` gate decides whether to noindex.
 */
export function resolveCounty(
  stateSlug: string | undefined,
  countySlug: string | undefined,
): { state: StateData; county: CountyData } | null {
  if (!stateSlug || !countySlug) return null;

  const state = getStateBySlug(stateSlug);
  if (!state) return null;

  // Tier 1 — hand-authored county SEO data.
  const seoCounty = getCountyBySlug(stateSlug, countySlug);
  if (seoCounty) return { state, county: seoCounty };

  // Tier 2 — synthesized. Pull the state's top cities so facility
  // filtering still has something to match against; the existing
  // state-level fallback in CountyTreatmentPage keeps results meaningful.
  const name = titleCaseFromSlug(countySlug);
  const stateMajorCities = state.cities
    .slice(0, 5)
    .map((c) => c.name);
  return {
    state,
    county: {
      name,
      slug: countySlug,
      population: 0,
      seat: name,
      description: `${name} County is a ${state.name} treatment area, with facilities and providers serving residents across the surrounding region.`,
      metaDescription: `Find rehab centers in ${name} County, ${state.abbreviation}. Compare verified addiction treatment facilities near you.`,
      treatmentOverview: `${name} County offers addiction treatment including detox, residential, outpatient, and MAT programs. Facilities in and around ${name} and nearby communities provide care for substance use disorders and co-occurring conditions.`,
      demographics: `${name} County in ${state.name} has diverse treatment needs. Local and regional providers address alcohol dependency, opioid addiction, and other substance use disorders.`,
      accessNotes: `${name} County is accessible via major highways and connects to ${state.name}'s broader treatment network through nearby metro areas.`,
      majorCities: stateMajorCities,
      faqs: countyFallbackFAQs(name, state.name, state.abbreviation),
    },
  };
}

function titleCaseFromSlug(slug: string): string {
  // Strip the legacy `-<stateAbbr>` disambiguation suffix some county slugs
  // carry in data (e.g. `polk-ia` → `Polk`) so synthesized names read clean.
  const trimmed = slug.replace(/-[a-z]{2}$/i, "");
  return trimmed
    .split("-")
    .map((p) => (p.length > 0 ? p.charAt(0).toUpperCase() + p.slice(1) : p))
    .join(" ");
}

function countyFallbackFAQs(
  county: string,
  state: string,
  abbr: string,
): { question: string; answer: string }[] {
  return [
    {
      question: `What rehab options are available in ${county} County, ${abbr}?`,
      answer: `${county} County offers addiction treatment services including medical detoxification, residential inpatient programs, intensive outpatient programs (IOP), and medication-assisted treatment (MAT). Both short-term and long-term recovery options are available through providers serving the county and surrounding ${state} region.`,
    },
    {
      question: `Does insurance cover addiction treatment in ${county} County, ${state}?`,
      answer: `Yes. Under the Mental Health Parity and Addiction Equity Act, most insurance plans in ${state} must cover substance abuse treatment. This includes employer-sponsored plans, marketplace plans, Medicaid, and Medicare. Contact individual facilities to verify your specific coverage and any out-of-pocket costs.`,
    },
    {
      question: `Are there free or low-cost rehab programs in ${county} County?`,
      answer: `Residents of ${county} County can access free or reduced-cost treatment through state-funded programs, non-profit organizations, and federally qualified health centers. ${state}'s substance abuse authority and SAMHSA's helpline (1-800-662-4357) can refer you to no-cost options.`,
    },
  ];
}
