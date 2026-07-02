import { useMemo, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useProStatus } from "./useProStatus";
import { useProviderFacilities } from "./useProviderFacilities";

/** Plan-based listing caps. Mirrors the enforce_facility_limit() DB trigger
 * (migration 20260829003700) — the server is authoritative; these values
 * exist so the UI can gate before the insert fails. */
export const FACILITY_LIMIT_FREE = 1;
export const FACILITY_LIMIT_PRO = 5;

export interface FacilityLimits {
  /** Number of facilities currently owned. */
  used: number;
  /** Max listings the current plan allows (Free 1 / Pro 5). */
  limit: number;
  /** Whether the provider may add another listing under their plan. */
  canAddMore: boolean;
  /** User's current plan tier */
  planTier: "pro" | "free";
  /** Whether data is still loading */
  isLoading: boolean;
  /** Refetch facility data */
  refetch: () => void;
}

/**
 * Plan-aware facility listing limits (Free = 1, Pro = 5).
 *
 * History: the caps were retired 2026-06-15 under a "flat-fee unlimited
 * listings" model and this hook hardcoded `canAddMore: true`. That model was
 * abandoned but the cap never came back, so Free providers could list any
 * number of facilities (2026-07-02 entitlement leak — see
 * docs/audit/pro-entitlement-leak-2026-07-02.md). The DB trigger
 * enforce_facility_limit() is the authoritative gate; this hook mirrors it
 * for the UI.
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
    const planTier = proStatus?.isPro ? ("pro" as const) : ("free" as const);
    const limit = planTier === "pro" ? FACILITY_LIMIT_PRO : FACILITY_LIMIT_FREE;
    const used = facilities?.length ?? 0;
    return {
      used,
      limit,
      canAddMore: used < limit,
      planTier,
      isLoading: proLoading || facilitiesLoading,
      refetch,
    };
  }, [proStatus?.isPro, facilities?.length, proLoading, facilitiesLoading, refetch]);
}
