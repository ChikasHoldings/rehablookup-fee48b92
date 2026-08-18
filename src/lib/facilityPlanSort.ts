/**
 * Facility ordering helpers.
 *
 * getPlanRank() is the live one — Featured (labeled sponsored) → claimed →
 * unclaimed. Pro does NOT buy organic position; see the note on getPlanRank.
 *
 * The getPlanPriority / sortByPlanHierarchy* helpers below still encode the
 * retired "Pro before Free" ordering. They have no callers anywhere in src/
 * and are kept only so an external import does not break; do not wire them
 * into a new surface without revisiting the commercial contract first.
 */

// Support both new model (pro/free) and legacy values (featured/professional) for backward compatibility
export type PlanTier = 'pro' | 'free' | 'featured' | 'professional';

interface FacilityWithPlan {
  planTier?: PlanTier;
  featured?: boolean;
  isPro?: boolean;
  name?: string;
}

interface FacilityWithRank {
  /** Raw paid/editorial Featured signal (NOT the `featured || isPro` display
   *  flag). Concierge holders also surface here once their featured signal is
   *  present. */
  isFeaturedPaid?: boolean;
  isPro?: boolean;
  isClaimed?: boolean;
}

/**
 * Three-tier organic rank for the search-results ordering. Lower = higher.
 *   0  paid/editorial Featured (true ad inventory, labeled as sponsored)
 *   1  claimed listing
 *   2  unclaimed listing
 *
 * Proximity is the PRIMARY sort on location searches; this rank is the
 * secondary tie-break within each distance band (see SearchResults).
 *
 * Pro USED TO BE its own tier here, ranking a subscriber above an equally
 * relevant free-claimed listing. That made organic position a thing money
 * buys, which contradicts the commercial contract ("ORGANIC RANK = never for
 * sale") and the copy now shipped on ~46k indexable pages ("organic directory
 * position is determined independently and is never purchased"). The tier is
 * gone: Pro and free listings that are both claimed now rank identically.
 *
 * What remains is deliberate and defensible:
 *   • Featured stays tier 0 because it IS advertising — separately purchased
 *     and labeled as sponsored wherever it appears, which is the one form of
 *     paid position the contract allows.
 *   • Claimed outranks unclaimed because claiming is FREE and signals an
 *     operator maintaining accurate data. That is a quality signal available
 *     to every facility at no cost, not a purchased one.
 */
export function getPlanRank(facility: FacilityWithRank): number {
  if (facility.isFeaturedPaid) return 0;
  if (facility.isClaimed) return 1;
  return 2;
}

/**
 * Get the numeric priority for a plan tier.
 * Lower number = higher priority (shows first)
 */
export function getPlanPriority(facility: FacilityWithPlan): number {
  // Check isPro first (new model)
  if (facility.isPro) return 0;
  
  // Check planTier (support both new and legacy)
  if (facility.planTier === 'pro' || facility.planTier === 'featured' || facility.planTier === 'professional') return 0;
  
  // Fallback to individual flags 
  if (facility.featured) return 0;
  
  return 1; // Free plan
}

/**
 * Sort facilities by plan hierarchy: Pro → Free
 * Within each tier, maintains alphabetical order
 */
export function sortByPlanHierarchy<T extends FacilityWithPlan>(facilities: T[]): T[] {
  return [...facilities].sort((a, b) => {
    const priorityA = getPlanPriority(a);
    const priorityB = getPlanPriority(b);
    
    // Sort by plan priority first
    if (priorityA !== priorityB) {
      return priorityA - priorityB;
    }
    
    // Within same tier, sort alphabetically by name
    const nameA = a.name || '';
    const nameB = b.name || '';
    return nameA.localeCompare(nameB);
  });
}

/**
 * Sort facilities by plan hierarchy with a secondary sort criteria
 */
export function sortByPlanHierarchyWithSecondary<T extends FacilityWithPlan>(
  facilities: T[],
  secondarySort: (a: T, b: T) => number
): T[] {
  return [...facilities].sort((a, b) => {
    const priorityA = getPlanPriority(a);
    const priorityB = getPlanPriority(b);
    
    // Sort by plan priority first
    if (priorityA !== priorityB) {
      return priorityA - priorityB;
    }
    
    // Within same tier, use secondary sort
    return secondarySort(a, b);
  });
}

/**
 * Get a human-readable label for the plan tier
 */
export function getPlanLabel(tier: PlanTier | 'featured' | 'professional' | undefined): string {
  switch (tier) {
    case 'pro':
    case 'featured':
    case 'professional':
      return 'Pro Provider';
    case 'free':
    default:
      return 'Free Listing';
  }
}
