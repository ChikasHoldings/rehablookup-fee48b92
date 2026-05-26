/**
 * Utility for sorting facilities by Pro status.
 * 
 * Order: Pro (featured/paid) > Free
 * 
 * This ensures Pro providers appear before free listings
 * across all pages in the platform.
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
 * Four-tier organic rank for the search-results ordering. Lower = higher.
 *   0  paid/editorial Featured (true ad inventory — also fed by the rails)
 *   1  Pro-claimed (subscriber, not Featured)
 *   2  free-claimed (claimed listing, no Pro)
 *   3  unclaimed
 *
 * Proximity is the PRIMARY sort on location searches; this rank is the
 * secondary tie-break within each distance band (see SearchResults).
 */
export function getPlanRank(facility: FacilityWithRank): number {
  if (facility.isFeaturedPaid) return 0;
  if (facility.isPro) return 1;
  if (facility.isClaimed) return 2;
  return 3;
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
