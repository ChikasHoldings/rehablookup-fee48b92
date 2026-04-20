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
export function useTreatmentCityValidation(opts: {
  stateName: string | undefined;
  cityName: string | undefined;
  /** Substrings to match against facility.treatmentTypes / description (lowercased). */
  treatmentKeywords: string[];
  /** Validator page type — controls minimum facility threshold. */
  pageType?: PageType;
}) {
  const { stateName, cityName, treatmentKeywords, pageType = "city-treatment" } = opts;
  const { data: approvedFacilities = [] } = useStaticFacilities();

  return useMemo(() => {
    if (!stateName || !cityName) {
      return {
        directMatchCount: 0,
        stateFallbackCount: 0,
        validation: { shouldIndex: false, facilityCount: 0, hasMinimumContent: false, recommendation: "noindex" as const },
      };
    }

    const all = [...treatmentCenters, ...approvedFacilities];
    const stateLower = stateName.toLowerCase();
    const cityLower = cityName.toLowerCase();
    const keys = treatmentKeywords.map((k) => k.toLowerCase()).filter(Boolean);

    const matchesKeyword = (f: (typeof all)[number]) => {
      if (keys.length === 0) return true;
      const types = (f.treatmentTypes || []).map((t) => t.toLowerCase());
      const desc = (f.description || "").toLowerCase();
      return keys.some((k) => types.some((t) => t.includes(k)) || desc.includes(k));
    };

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
      validation,
    };
  }, [approvedFacilities, stateName, cityName, treatmentKeywords, pageType]);
}
