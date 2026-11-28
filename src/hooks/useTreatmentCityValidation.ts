import { useMemo } from "react";
import { useStaticFacilities } from "@/hooks/useStaticFacilities";
import { treatmentCenters } from "@/data/treatmentCenters";

/**
 * Treatment keyword matching for the state treatment pages' city lists.
 *
 * Treatment × city pages (/treatment-types/{type}/{state}/{city}) were
 * consolidated into the city hubs on 2026-11-28; state treatment pages still
 * list the cities that have matching listings and link each city hub.
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

