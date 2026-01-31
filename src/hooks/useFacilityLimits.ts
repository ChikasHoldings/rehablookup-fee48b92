import { useMemo, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useProStatus } from "./useProStatus";
import { useProviderFacilities } from "./useProviderFacilities";
import { supabase } from "@/integrations/supabase/client";

export interface FacilityLimits {
  /** Maximum number of facilities allowed for current plan */
  limit: number;
  /** Base limit from plan (before purchased slots) */
  baseLimit: number;
  /** Number of additional slots purchased */
  purchasedSlots: number;
  /** Number of facilities currently used */
  used: number;
  /** Whether user can add more facilities */
  canAddMore: boolean;
  /** Whether at capacity (used === limit) */
  atCapacity: boolean;
  /** Whether user can purchase additional slots (Pro only, at capacity) */
  canPurchaseSlot: boolean;
  /** User's current plan tier */
  planTier: "pro" | "free";
  /** Whether data is still loading */
  isLoading: boolean;
  /** Refetch facility limits data */
  refetch: () => void;
}

/** Plan limits: Pro = 5 facilities, Free = 1 facility */
const PLAN_LIMITS = {
  pro: 5,
  free: 1,
} as const;

/**
 * Centralized hook for facility limit enforcement.
 * Pro users get 5 facilities + purchased slots, Free users get 1.
 */
export function useFacilityLimits(): FacilityLimits {
  const queryClient = useQueryClient();
  const { data: proStatus, isLoading: proLoading } = useProStatus();
  const { facilities, isLoading: facilitiesLoading, refetch: refetchFacilities } = useProviderFacilities();

  // Fetch purchased slot count with retry logic
  const { 
    data: purchasedSlots = 0, 
    isLoading: slotsLoading,
    refetch: refetchSlots 
  } = useQuery({
    queryKey: ["purchased-listing-slots"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log("[useFacilityLimits] No authenticated user");
        return 0;
      }

      const { data, error } = await supabase
        .from("purchased_listing_slots")
        .select("id, status, created_at")
        .eq("user_id", user.id)
        .eq("status", "completed");

      if (error) {
        console.error("[useFacilityLimits] Error fetching purchased slots:", error);
        throw error; // Let React Query handle retry
      }

      const count = data?.length ?? 0;
      console.log("[useFacilityLimits] Purchased slots count:", count);
      return count;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
  });

  // Memoized refetch function
  const refetch = useCallback(() => {
    console.log("[useFacilityLimits] Refetching all limit data");
    refetchSlots();
    refetchFacilities();
    queryClient.invalidateQueries({ queryKey: ["pro-status"] });
  }, [refetchSlots, refetchFacilities, queryClient]);

  return useMemo(() => {
    const isPro = proStatus?.isPro || false;
    const planTier = isPro ? "pro" : "free";
    const baseLimit = PLAN_LIMITS[planTier];
    // Only Pro users benefit from purchased slots
    const effectivePurchasedSlots = isPro ? purchasedSlots : 0;
    const limit = baseLimit + effectivePurchasedSlots;
    const used = facilities?.length ?? 0;
    const canAddMore = used < limit;
    const atCapacity = used >= limit;
    // Pro users at capacity can purchase additional slots
    const canPurchaseSlot = isPro && atCapacity;

    return {
      limit,
      baseLimit,
      purchasedSlots: effectivePurchasedSlots,
      used,
      canAddMore,
      atCapacity,
      canPurchaseSlot,
      planTier,
      isLoading: proLoading || facilitiesLoading || slotsLoading,
      refetch,
    };
  }, [
    proStatus?.isPro, 
    facilities?.length, 
    purchasedSlots, 
    proLoading, 
    facilitiesLoading, 
    slotsLoading,
    refetch
  ]);
}

/**
 * Get facility limit for a plan tier.
 * Exported for use in non-hook contexts.
 */
export function getFacilityLimit(planTier: "pro" | "free"): number {
  return PLAN_LIMITS[planTier];
}
