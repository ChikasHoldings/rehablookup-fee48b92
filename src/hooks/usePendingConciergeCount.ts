import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getCachedSession } from "@/lib/sessionCache";
import { useEffect, useCallback } from "react";

export function usePendingConciergeCount(facilityId?: string) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["pending-concierge-count", facilityId],
    queryFn: async () => {
      if (!facilityId) return 0;
      
      const session = await getCachedSession();
      if (!session) return 0;

      // Count introductions that haven't been responded to yet
      const { count, error } = await supabase
        .from("concierge_introductions")
        .select("*", { count: "exact", head: true })
        .eq("facility_id", facilityId)
        .is("provider_response", null);

      if (error) {
        console.error("[usePendingConciergeCount] Error:", error.message);
        return 0;
      }

      return count || 0;
    },
    enabled: !!facilityId,
    staleTime: 1000 * 30, // 30 seconds
    refetchInterval: 60000, // Refresh every minute
    retry: 2,
  });

  const refetchCount = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["pending-concierge-count", facilityId] });
  }, [queryClient, facilityId]);

  // Subscribe to realtime changes
  useEffect(() => {
    if (!facilityId) return;

    const channel = supabase
      .channel(`concierge-intros-count-${facilityId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "concierge_introductions",
          filter: `facility_id=eq.${facilityId}`,
        },
        () => {
          queryClient.invalidateQueries({ 
            queryKey: ["pending-concierge-count", facilityId] 
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [facilityId, queryClient]);

  return {
    count: query.data ?? 0,
    isLoading: query.isLoading,
    refetchCount,
  };
}
