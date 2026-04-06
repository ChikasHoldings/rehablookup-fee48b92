import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface LeadAccessInfo {
  hasAccess: boolean;
  isOriginal: boolean;
  isRedistributed: boolean;
  distributedAt?: string;
  redistributionStatus?: string;
}

export function useLeadAccess(leadId?: string, facilityId?: string) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["lead-access", leadId, facilityId],
    queryFn: async (): Promise<LeadAccessInfo | null> => {
      if (!leadId || !facilityId) return null;

      try {
        // Use security definer function to check access (works for both locked and unlocked leads)
        const { data: result, error: rpcError } = await supabase.rpc("check_lead_access", {
          p_lead_id: leadId,
          p_facility_id: facilityId,
        });

        if (rpcError) {
          console.error("[useLeadAccess] RPC error:", rpcError);
          return null;
        }

        if (!result || result.length === 0) {
          return {
            hasAccess: false,
            isOriginal: false,
            isRedistributed: false,
          };
        }

        const row = result[0];
        return {
          hasAccess: row.has_access,
          isOriginal: row.is_original,
          isRedistributed: row.is_redistributed,
          distributedAt: row.distributed_at,
          redistributionStatus: row.redistribution_status,
        };
      } catch (err) {
        console.error("[useLeadAccess] Unexpected error:", err);
        return null;
      }
    },
    enabled: !!leadId && !!facilityId,
    staleTime: 1000 * 60 * 2,
    retry: 2,
  });

  return {
    accessInfo: data,
    isLoading,
    error,
    hasAccess: data?.hasAccess ?? false,
    isOriginal: data?.isOriginal ?? false,
    isRedistributed: data?.isRedistributed ?? false,
    redistributionStatus: data?.redistributionStatus,
  };
}
