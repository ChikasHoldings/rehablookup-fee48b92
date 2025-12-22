/**
 * Utility for sorting facilities by plan hierarchy.
 * 
 * Order: Featured > Professional > Free
 * 
 * This ensures paid providers always appear before free listings
 * across all pages in the platform.
 */

export type PlanTier = 'featured' | 'professional' | 'free';

interface FacilityWithPlan {
  planTier?: PlanTier;
  featured?: boolean;
  hasFeaturedSubscription?: boolean;
  hasProfessionalPlan?: boolean;
  name?: string;
}

/**
 * Get the numeric priority for a plan tier.
 * Lower number = higher priority (shows first)
 */
export function getPlanPriority(facility: FacilityWithPlan): number {
  // Check planTier first (preferred)
  if (facility.planTier === 'featured') return 0;
  if (facility.planTier === 'professional') return 1;
  if (facility.planTier === 'free') return 2;
  
  // Fallback to individual flags
  if (facility.hasFeaturedSubscription || facility.featured) return 0;
  if (facility.hasProfessionalPlan) return 1;
  
  return 2; // Free/basic plan
}

/**
 * Sort facilities by plan hierarchy: Featured → Professional → Free
 * Within each tier, maintains original order (stable sort)
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
export function getPlanLabel(tier: PlanTier | undefined): string {
  switch (tier) {
    case 'featured':
      return 'Featured Provider';
    case 'professional':
      return 'Professional Provider';
    case 'free':
    default:
      return 'Basic Listing';
  }
}
