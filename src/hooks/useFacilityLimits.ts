import { useMemo, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useProStatus } from "./useProStatus";
import { useProviderFacilities } from "./useProviderFacilities";

export interface FacilityLimits {
  /** Number of facilities currently owned (display only — no cap is enforced). */
  used: number;
  /** Always true — listing limits were retired with the flat-fee monetization model. */
  canAddMore: true;
  /** User's current plan tier */
  planTier: "pro" | "free";
  /** Whether data is still loading */
  isLoading: boolean;
  /** Refetch facility data */
  refetch: () => void;
}

/**
 * Tracks how many facilities a provider has. Listing caps + extra-slot
 * purchases were retired alongside the credit-based unlock model; providers
 * may now add unlimited facilities regardless of plan tier.
 */
export function useFacilityLimits(): FacilityLimits {
  const queryClient = useQueryClient();
  const { data: proStatus, isLoading: proLoading } = useProStatus();
  const { facilities, isLoading: facilitiesLoading, refetch: refetchFacilities } = useProviderFacilities();

  const refetch = useCallback(() => {
    refetchFacilities();
    queryClient.invalidateQueries({ queryKey: ["pro-status"] });
  }, [refetchFacilities, queryClient]);

  return useMemo(() => {
    const planTier = proStatus?.isPro ? "pro" : "free";
    return {
      used: facilities?.length ?? 0,
      canAddMore: true as const,
      planTier,
      isLoading: proLoading || facilitiesLoading,
      refetch,
    };
  }, [proStatus?.isPro, facilities?.length, proLoading, facilitiesLoading, refetch]);
}
