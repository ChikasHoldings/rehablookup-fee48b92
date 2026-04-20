/**
 * SEO Page Validation Utility
 * Determines whether a page should be indexed or noindexed based on content quality signals.
 * Used by SEO pages and sitemap generation to prevent thin/empty pages from being indexed.
 */

export type PageType =
  | "city"
  | "state"
  | "county"
  | "city-treatment"
  | "state-treatment"
  | "insurance-state"
  | "county-treatment"
  | "city-insurance"
  | "substance-city"
  | "substance-state"
  | "substance-treatment"
  | "demographic-city"
  | "demographic-state"
  | "demographic-treatment"
  | "co-occurring-city"
  | "co-occurring-state"
  | "duration-city"
  | "duration-state"
  | "payment-state"
  | "best-in-state"
  | "treatment-hub"
  | "expanded-treatment-hub"
  | "therapy-modality"
  | "comparison"
  | "educational"
  | "seeker-guide"
  | "cost-insurance";

export interface PageValidation {
  shouldIndex: boolean;
  facilityCount: number;
  hasMinimumContent: boolean;
  recommendation: "index" | "noindex" | "enhance";
  reason?: string;
}

// Minimum facility thresholds by page type
// City+treatment / city+substance / city+demographic combos are the largest source
// of thin-content soft-404s. We require >=1 directly-matched facility before indexing.
// Pure state pages and evergreen content pages always index.
const MIN_FACILITIES: Record<PageType, number> = {
  city: 0,
  state: 0,
  county: 0,
  "city-treatment": 1,
  "state-treatment": 2,
  "insurance-state": 1,
  "county-treatment": 1,
  "city-insurance": 1,
  "substance-city": 1,
  "substance-state": 2,
  "substance-treatment": 1,
  "demographic-city": 1,
  "demographic-state": 2,
  "demographic-treatment": 1,
  "co-occurring-city": 1,
  "co-occurring-state": 2,
  "duration-city": 1,
  "duration-state": 2,
  "payment-state": 2,
  "best-in-state": 3, // "Best of" lists need real depth
  "treatment-hub": 0, // Editorial hub pages always index
  "expanded-treatment-hub": 0,
  "therapy-modality": 0,
  "comparison": 0,
  "educational": 0,
  "seeker-guide": 0,
  "cost-insurance": 0,
};

// Page types that always index regardless of facility count
// (evergreen content with intrinsic value beyond local facility listings)
const ALWAYS_INDEX: PageType[] = [
  "city",
  "state",
  "county",
  "treatment-hub",
  "expanded-treatment-hub",
  "therapy-modality",
  "comparison",
  "educational",
  "seeker-guide",
  "cost-insurance",
];

const STATE_FALLBACK_INDEXABLE: PageType[] = [
  "insurance-state",
  "substance-state",
  "demographic-state",
  "co-occurring-state",
  "duration-state",
  "payment-state",
];

/**
 * Validates whether a page meets quality standards for indexing.
 */
export function validatePage(
  pageType: PageType,
  facilityCount: number,
  options?: {
    hasUniqueContent?: boolean;
    faqCount?: number;
    stateFallbackCount?: number; // facilities in the state if local count is 0
  }
): PageValidation {
  const { hasUniqueContent = true, faqCount = 0, stateFallbackCount = 0 } = options || {};

  // Always-index page types
  if (ALWAYS_INDEX.includes(pageType)) {
    return {
      shouldIndex: true,
      facilityCount,
      hasMinimumContent: true,
      recommendation: "index",
    };
  }

  const minRequired = MIN_FACILITIES[pageType];

  // Has enough direct facilities
  if (facilityCount >= minRequired) {
    return {
      shouldIndex: true,
      facilityCount,
      hasMinimumContent: hasUniqueContent,
      recommendation: "index",
    };
  }

  // State-level templates can still be valuable when local facet matching is sparse
  // but the broader state directory has enough inventory to support the content.
  if (STATE_FALLBACK_INDEXABLE.includes(pageType) && stateFallbackCount >= 3 && hasUniqueContent) {
    return {
      shouldIndex: true,
      facilityCount,
      hasMinimumContent: true,
      recommendation: "index",
      reason: `Indexed with statewide fallback inventory (${stateFallbackCount} facilities)` ,
    };
  }

  // No direct facilities but state has some — could be enhanced
  if (facilityCount === 0 && stateFallbackCount >= 3) {
    return {
      shouldIndex: false,
      facilityCount,
      hasMinimumContent: false,
      recommendation: "enhance",
      reason: `No direct facilities found, but ${stateFallbackCount} available in state`,
    };
  }

  // Truly empty — noindex
  return {
    shouldIndex: false,
    facilityCount,
    hasMinimumContent: false,
    recommendation: "noindex",
    reason: "Insufficient facility data for meaningful page",
  };
}

/**
 * Determines whether FAQ schema should be emitted.
 * Google recommends at least 3 meaningful FAQs for FAQPage schema.
 */
export function shouldEmitFAQSchema(faqs: { question: string; answer: string }[]): boolean {
  if (faqs.length < 3) return false;
  // Check that answers have meaningful length (not just one-liners)
  const meaningfulFaqs = faqs.filter((f) => f.answer.length >= 50);
  return meaningfulFaqs.length >= 3;
}

/**
 * Simple hash function for deterministic content variation.
 * Used to select template variants based on city+treatment combination.
 */
export function contentHash(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0; // Convert to 32bit integer
  }
  return Math.abs(hash);
}

/**
 * Gets a facility density classification for content variation.
 */
export function getFacilityDensity(count: number): "high" | "moderate" | "limited" | "none" {
  if (count >= 10) return "high";
  if (count >= 4) return "moderate";
  if (count >= 1) return "limited";
  return "none";
}

/**
 * Gets urban/rural classification based on population.
 */
export function getUrbanClassification(population?: number): "major-metro" | "metro" | "suburban" | "small-city" | "rural" {
  if (!population) return "small-city";
  if (population >= 500000) return "major-metro";
  if (population >= 200000) return "metro";
  if (population >= 50000) return "suburban";
  if (population >= 10000) return "small-city";
  return "rural";
}
