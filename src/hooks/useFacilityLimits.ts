import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
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
  const { data: proStatus, isLoading: proLoading } = useProStatus();
  const { facilities, isLoading: facilitiesLoading } = useProviderFacilities();

  // Fetch purchased slot count
  const { data: purchasedSlots = 0, isLoading: slotsLoading } = useQuery({
    queryKey: ["purchased-listing-slots"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return 0;

      const { data, error } = await supabase
        .from("purchased_listing_slots")
        .select("id")
        .eq("user_id", user.id)
        .eq("status", "completed");

      if (error) {
        console.error("Error fetching purchased slots:", error);
        return 0;
      }

      return data?.length ?? 0;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

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
    };
  }, [proStatus?.isPro, facilities?.length, purchasedSlots, proLoading, facilitiesLoading, slotsLoading]);
}

/**
 * Get facility limit for a plan tier.
 * Exported for use in non-hook contexts.
 */
export function getFacilityLimit(planTier: "pro" | "free"): number {
  return PLAN_LIMITS[planTier];
}
