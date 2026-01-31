import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface LeadAccessInfo {
  hasAccess: boolean;
  isOriginal: boolean;
  isRedistributed: boolean;
  distributedAt?: string;
}

export function useLeadAccess(leadId?: string, facilityId?: string) {
  const { data, isLoading } = useQuery({
    queryKey: ["lead-access", leadId, facilityId],
    queryFn: async (): Promise<LeadAccessInfo | null> => {
      if (!leadId || !facilityId) return null;

      // First check if this is the original facility
      const { data: lead } = await supabase
        .from("leads")
        .select("facility_id, original_facility_id, redistribution_status")
        .eq("id", leadId)
        .maybeSingle();

      if (!lead) return null;

      // If this is the original facility (via facility_id), they have access
      if (lead.facility_id === facilityId) {
        return {
          hasAccess: true,
          isOriginal: true,
          isRedistributed: false,
        };
      }

      // Check lead_distributions for redistributed access
      const { data: distribution } = await supabase
        .from("lead_distributions")
        .select("id, is_original, distributed_at")
        .eq("lead_id", leadId)
        .eq("facility_id", facilityId)
        .maybeSingle();

      if (distribution) {
        return {
          hasAccess: true,
          isOriginal: distribution.is_original,
          isRedistributed: !distribution.is_original,
          distributedAt: distribution.distributed_at,
        };
      }

      return {
        hasAccess: false,
        isOriginal: false,
        isRedistributed: false,
      };
    },
    enabled: !!leadId && !!facilityId,
    staleTime: 1000 * 60 * 2,
  });

  return {
    accessInfo: data,
    isLoading,
    hasAccess: data?.hasAccess ?? false,
    isOriginal: data?.isOriginal ?? false,
    isRedistributed: data?.isRedistributed ?? false,
  };
}
