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
  hasFeaturedSubscription?: boolean;
  hasProfessionalPlan?: boolean;
  name?: string;
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
  
  // Fallback to individual flags (legacy)
  if (facility.hasFeaturedSubscription || facility.hasProfessionalPlan || facility.featured) return 0;
  
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
