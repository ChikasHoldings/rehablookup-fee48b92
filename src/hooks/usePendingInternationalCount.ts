import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getCachedSession } from "@/lib/sessionCache";
import { useEffect, useCallback } from "react";

export function usePendingInternationalCount(facilityId?: string) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["pending-international-count", facilityId],
    queryFn: async () => {
      if (!facilityId) return 0;
      
      const session = await getCachedSession();
      if (!session) return 0;

      // Count international matches that are pending (invited but not responded)
      const { count, error } = await supabase
        .from("international_case_facility_matches")
        .select("*", { count: "exact", head: true })
        .eq("facility_id", facilityId)
        .eq("status", "invited");

      if (error) {
        console.error("[usePendingInternationalCount] Error:", error.message);
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
    queryClient.invalidateQueries({ queryKey: ["pending-international-count", facilityId] });
  }, [queryClient, facilityId]);

  // Subscribe to realtime changes
  useEffect(() => {
    if (!facilityId) return;

    const channel = supabase
      .channel(`intl-matches-count-${facilityId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "international_case_facility_matches",
          filter: `facility_id=eq.${facilityId}`,
        },
        () => {
          queryClient.invalidateQueries({ 
            queryKey: ["pending-international-count", facilityId] 
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
