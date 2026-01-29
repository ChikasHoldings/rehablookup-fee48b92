import { useMemo } from "react";
import { useProStatus } from "./useProStatus";
import { useProviderFacilities } from "./useProviderFacilities";

export interface FacilityLimits {
  /** Maximum number of facilities allowed for current plan */
  limit: number;
  /** Number of facilities currently used */
  used: number;
  /** Whether user can add more facilities */
  canAddMore: boolean;
  /** Whether at capacity (used === limit) */
  atCapacity: boolean;
  /** User's current plan tier */
  planTier: "pro" | "free";
  /** Whether data is still loading */
  isLoading: boolean;
}

/** Plan limits: Pro = 5 facilities, Free = 1 facility */
const PLAN_LIMITS = {
  pro: 5,
  free: 1,
} as const;

/**
 * Centralized hook for facility limit enforcement.
 * Pro users get 5 facilities, Free users get 1.
 */
export function useFacilityLimits(): FacilityLimits {
  const { data: proStatus, isLoading: proLoading } = useProStatus();
  const { facilities, isLoading: facilitiesLoading } = useProviderFacilities();

  return useMemo(() => {
    const isPro = proStatus?.isPro || false;
    const planTier = isPro ? "pro" : "free";
    const limit = PLAN_LIMITS[planTier];
    const used = facilities?.length ?? 0;
    const canAddMore = used < limit;
    const atCapacity = used >= limit;

    return {
      limit,
      used,
      canAddMore,
      atCapacity,
      planTier,
      isLoading: proLoading || facilitiesLoading,
    };
  }, [proStatus?.isPro, facilities?.length, proLoading, facilitiesLoading]);
}

/**
 * Get facility limit for a plan tier.
 * Exported for use in non-hook contexts.
 */
export function getFacilityLimit(planTier: "pro" | "free"): number {
  return PLAN_LIMITS[planTier];
}
