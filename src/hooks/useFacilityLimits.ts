import { useMemo, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getCachedSession } from "@/lib/sessionCache";
import { useProviderFacilities } from "./useProviderFacilities";

/** Plan-based listing caps. Mirrors the enforce_facility_limit() DB trigger —
 * the server is authoritative; these values exist as a fallback when the
 * allowance RPC is unavailable. */
export const FACILITY_LIMIT_FREE = 1;
export const FACILITY_LIMIT_PRO = 5;

interface FacilityAllowance {
  used: number;
  max_allowed: number;
  plan: "pro" | "free";
  grace_active: boolean;
  grace_expires_at: string | null;
}

export interface FacilityLimits {
  /** Number of facilities currently owned. */
  used: number;
  /** Max listings currently allowed (plan cap or active courtesy grant). */
  limit: number;
  /** Whether the provider may add another listing. */
  canAddMore: boolean;
  /** User's current plan tier */
  planTier: "pro" | "free";
  /** True while an admin-granted courtesy period raises the cap. */
  graceActive: boolean;
  /** Expiry of the active courtesy period, if any. */
  graceExpiresAt: string | null;
  /** Whether data is still loading */
  isLoading: boolean;
  /** Refetch facility data */
  refetch: () => void;
}

/**
 * Plan-aware facility listing limits (Free = 1, Pro = 5, or an admin-granted
 * courtesy cap — whichever is greater).
 *
 * Reads get_my_facility_allowance(), a SECURITY DEFINER RPC that computes the
 * allowance EXACTLY like the enforce_facility_limit() DB trigger (migration
 * 20260829004200), so the UI can never disagree with the server gate — that
 * disagreement is how the 2026-07-02 entitlement leak stayed invisible.
 */
export function useFacilityLimits(): FacilityLimits {
  const queryClient = useQueryClient();
  const { facilities, isLoading: facilitiesLoading, refetch: refetchFacilities } = useProviderFacilities();

  const { data: allowance, isLoading: allowanceLoading } = useQuery({
    queryKey: ["facility-allowance"],
    staleTime: 60 * 1000,
    queryFn: async (): Promise<FacilityAllowance | null> => {
      const session = await getCachedSession();
      if (!session) return null;
      const { data, error } = await supabase.rpc("get_my_facility_allowance");
      if (error) {
        console.warn("[useFacilityLimits] allowance RPC failed:", error.message);
        return null;
      }
      return data as unknown as FacilityAllowance;
    },
  });

  const refetch = useCallback(() => {
    refetchFacilities();
    queryClient.invalidateQueries({ queryKey: ["facility-allowance"] });
    queryClient.invalidateQueries({ queryKey: ["pro-status"] });
  }, [refetchFacilities, queryClient]);

  return useMemo(() => {
    const used = allowance?.used ?? facilities?.length ?? 0;
    const planTier = allowance?.plan === "pro" ? ("pro" as const) : ("free" as const);
    // Fallback to the static plan cap if the RPC is unavailable — fail toward
    // the stricter limit; the DB trigger remains authoritative either way.
    const limit =
      allowance?.max_allowed ??
      (planTier === "pro" ? FACILITY_LIMIT_PRO : FACILITY_LIMIT_FREE);
    return {
      used,
      limit,
      canAddMore: used < limit,
      planTier,
      graceActive: allowance?.grace_active === true,
      graceExpiresAt: allowance?.grace_expires_at ?? null,
      isLoading: allowanceLoading || facilitiesLoading,
      refetch,
    };
  }, [allowance, facilities?.length, allowanceLoading, facilitiesLoading, refetch]);
}
