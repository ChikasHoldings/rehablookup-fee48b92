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
  | "city-insurance";

export interface PageValidation {
  shouldIndex: boolean;
  facilityCount: number;
  hasMinimumContent: boolean;
  recommendation: "index" | "noindex" | "enhance";
  reason?: string;
}

// Minimum facility thresholds by page type
const MIN_FACILITIES: Record<PageType, number> = {
  city: 0, // Cities always index (they have general value)
  state: 0, // States always index
  county: 0, // Counties always index
  "city-treatment": 1, // Need at least 1 relevant facility
  "state-treatment": 2, // Need at least 2 state-level facilities
  "insurance-state": 1, // Need at least 1 insurance-matched facility
  "county-treatment": 1,
  "city-insurance": 1,
};

// Page types that always index regardless of facility count
const ALWAYS_INDEX: PageType[] = ["city", "state", "county"];

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
