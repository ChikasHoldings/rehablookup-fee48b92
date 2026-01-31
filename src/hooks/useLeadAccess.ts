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
        // First check if this is the original facility
        const { data: lead, error: leadError } = await supabase
          .from("leads")
          .select("facility_id, original_facility_id, redistribution_status")
          .eq("id", leadId)
          .maybeSingle();

        if (leadError) {
          console.error("[useLeadAccess] Error fetching lead:", leadError);
          return null;
        }

        if (!lead) return null;

        // If this is the original facility (via facility_id), they have access
        if (lead.facility_id === facilityId) {
          return {
            hasAccess: true,
            isOriginal: true,
            isRedistributed: false,
            redistributionStatus: lead.redistribution_status,
          };
        }

        // Check lead_distributions for redistributed access
        const { data: distribution, error: distError } = await supabase
          .from("lead_distributions")
          .select("id, is_original, distributed_at")
          .eq("lead_id", leadId)
          .eq("facility_id", facilityId)
          .maybeSingle();

        if (distError) {
          console.error("[useLeadAccess] Error fetching distribution:", distError);
          return null;
        }

        if (distribution) {
          return {
            hasAccess: true,
            isOriginal: distribution.is_original,
            isRedistributed: !distribution.is_original,
            distributedAt: distribution.distributed_at,
            redistributionStatus: lead.redistribution_status,
          };
        }

        return {
          hasAccess: false,
          isOriginal: false,
          isRedistributed: false,
          redistributionStatus: lead.redistribution_status,
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
