import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect } from "react";
import { useProviderFacilities } from "./useProviderFacilities";

/**
 * @deprecated This hook is deprecated. The new monetization model uses credits instead of lead caps.
 * Use useProviderCredits for credit-based lead unlocking.
 */
export interface AccountLeadUsage {
  usedLeads: number;
  leadLimit: number;
  remainingLeads: number;
  usagePercent: number;
  isAtLimit: boolean;
  facilityIds: string[];
}

/**
 * @deprecated This hook is deprecated. Use useProviderCredits instead.
 */
export function useAccountLeadUsage() {
  const queryClient = useQueryClient();
  const { facilities, isLoading: facilitiesLoading } = useProviderFacilities();
  const facilityIds = facilities?.map(f => f.id) ?? [];

  const query = useQuery({
    queryKey: ["account-lead-usage", facilityIds.join(",")],
    queryFn: async (): Promise<AccountLeadUsage> => {
      if (!facilityIds.length) {
        return {
          usedLeads: 0,
          leadLimit: 999999,
          remainingLeads: 999999,
          usagePercent: 0,
          isAtLimit: false,
          facilityIds: [],
        };
      }

      const periodStart = new Date();
      periodStart.setDate(1);
      periodStart.setHours(0, 0, 0, 0);

      const { count, error } = await supabase
        .from("leads")
        .select("*", { count: "exact", head: true })
        .in("facility_id", facilityIds)
        .eq("qualified", true)
        .gte("created_at", periodStart.toISOString());

      if (error) throw error;

      return {
        usedLeads: count ?? 0,
        leadLimit: 999999,
        remainingLeads: 999999,
        usagePercent: 0,
        isAtLimit: false,
        facilityIds,
      };
    },
    enabled: !facilitiesLoading && facilityIds.length > 0,
    staleTime: 1000 * 60 * 5,
  });

  useEffect(() => {
    if (!facilityIds.length) return;
    const channels = facilityIds.map((facilityId, index) => 
      supabase
        .channel(`account-leads-${facilityId}-${index}`)
        .on("postgres_changes", { event: "*", schema: "public", table: "leads", filter: `facility_id=eq.${facilityId}` }, () => {
          queryClient.invalidateQueries({ queryKey: ["account-lead-usage"] });
        })
        .subscribe()
    );
    return () => { channels.forEach(channel => supabase.removeChannel(channel)); };
  }, [facilityIds.join(","), queryClient]);

  return {
    ...query.data,
    isLoading: facilitiesLoading || query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}
