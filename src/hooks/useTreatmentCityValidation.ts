import { useMemo } from "react";
import { useStaticFacilities } from "@/hooks/useStaticFacilities";
import { treatmentCenters } from "@/data/treatmentCenters";
import { validatePage, type PageType } from "@/utils/seoPageValidator";

/**
 * Shared indexability gate for legacy `/treatment-types/{type}/{state}/{city}` pages.
 *
 * Counts facilities that match BOTH the city/state AND a treatment-type keyword.
 * Returns `validatePage()` output so the page can render `noindex` when there is
 * no real local inventory and no usable state-level fallback.
 *
 * Used to eliminate the long tail of "Crawled - currently not indexed" and
 * "Soft 404" GSC issues on combo pages where Google sees a templated layout
 * with zero real listings.
 */
/** The live directory lists ~3,800 facilities; fewer than this means a failed or partial load. */
const MIN_PLAUSIBLE_DIRECTORY_SIZE = 500;

/** Keyword match used by every treatment × city page and its state page's city list. */
function facilityMatchesTreatment(
  f: { treatmentTypes?: string[] | null; description?: string | null },
  keys: readonly string[],
): boolean {
  if (keys.length === 0) return true;
  const types = (f.treatmentTypes || []).map((t) => t.toLowerCase());
  const desc = (f.description || "").toLowerCase();
  return keys.some((k) => types.some((t) => t.includes(k)) || desc.includes(k));
}

/**
 * Treatment keywords per /treatment-types/{type}/{state}/{city} family. The
 * city page and the state page's "by city" list must use the same set, or the
 * state page would link to city pages that consolidate (redirect) away.
 */
export const TREATMENT_CITY_KEYWORDS = {
  "alcohol-rehabilitation": ["alcohol"],
  "detox-programs": ["detox", "withdrawal", "medical detoxification"],
  "drug-addiction": ["drug", "substance", "opioid", "stimulant"],
  "dual-diagnosis-treatment": ["dual diagnosis", "co-occurring", "mental health"],
  "residential-inpatient": ["inpatient", "residential"],
  "outpatient-programs": ["outpatient", "iop", "php", "intensive outpatient", "partial hospitalization"],
} as const satisfies Record<string, readonly string[]>;

/**
 * Lower-cased names of the cities in a state that have at least one listing
 * matching the treatment, i.e. the cities whose treatment × city page stays.
 * Returns null until the live directory has loaded (callers then link every
 * city, exactly as before).
 */
export function useTreatmentCitiesWithListings(
  stateName: string | undefined,
  treatmentKeywords: readonly string[],
): ReadonlySet<string> | null {
  const { data: approvedFacilities = [], isFresh } = useStaticFacilities();
  return useMemo(() => {
    if (!stateName || !isFresh || approvedFacilities.length < MIN_PLAUSIBLE_DIRECTORY_SIZE) return null;
    const stateLower = stateName.toLowerCase();
    const keys = treatmentKeywords.map((k) => k.toLowerCase()).filter(Boolean);
    const cities = new Set<string>();
    for (const f of [...treatmentCenters, ...approvedFacilities]) {
      if (f.state.toLowerCase() === stateLower && facilityMatchesTreatment(f, keys)) cities.add(f.city.toLowerCase());
    }
    return cities;
  }, [approvedFacilities, isFresh, stateName, treatmentKeywords]);
}

export function useTreatmentCityValidation(opts: {
  stateName: string | undefined;
  cityName: string | undefined;
  /** Substrings to match against facility.treatmentTypes / description (lowercased). */
  treatmentKeywords: string[];
  /** Validator page type — controls minimum facility threshold. */
  pageType?: PageType;
}) {
  const { stateName, cityName, treatmentKeywords, pageType = "city-treatment" } = opts;
  const { data: approvedFacilities = [], isFresh } = useStaticFacilities();
  // Decisions that send visitors elsewhere (thin-page consolidation) may only
  // be taken on the live directory: never on the cached placeholder, and never
  // on an empty or truncated response (a failed fetch must not look "thin").
  const ready = !!isFresh && approvedFacilities.length >= MIN_PLAUSIBLE_DIRECTORY_SIZE;

  return useMemo(() => {
    if (!stateName || !cityName) {
      return {
        directMatchCount: 0,
        stateFallbackCount: 0,
        ready,
        validation: { shouldIndex: false, facilityCount: 0, hasMinimumContent: false, recommendation: "noindex" as const },
      };
    }

    const all = [...treatmentCenters, ...approvedFacilities];
    const stateLower = stateName.toLowerCase();
    const cityLower = cityName.toLowerCase();
    const keys = treatmentKeywords.map((k) => k.toLowerCase()).filter(Boolean);

    const matchesKeyword = (f: (typeof all)[number]) => facilityMatchesTreatment(f, keys);

    const stateMatched = all.filter((f) => f.state.toLowerCase() === stateLower);
    const direct = stateMatched.filter(
      (f) => f.city.toLowerCase() === cityLower && matchesKeyword(f)
    );

    const validation = validatePage(pageType, direct.length, {
      stateFallbackCount: stateMatched.length,
    });

    return {
      directMatchCount: direct.length,
      stateFallbackCount: stateMatched.length,
      ready,
      validation,
    };
  }, [approvedFacilities, ready, stateName, cityName, treatmentKeywords, pageType]);
}
