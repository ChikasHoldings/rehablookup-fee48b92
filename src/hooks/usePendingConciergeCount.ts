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

  // Subscribe to realtime changes.
  //
  // Channel name carries a per-mount random suffix so successive
  // mounts of this hook (e.g., after navigate('/provider/dashboard',
  // { replace: true }) from PlanStep, or React's normal effect re-fire
  // when a dep changes) never collide on a name that's still in
  // Supabase's internal channel registry. Without the suffix,
  // supabase.channel(name) would return the existing-and-still-
  // subscribed channel, and the subsequent .on() throws "cannot add
  // postgres_changes callbacks after subscribe()" — crashing the
  // dashboard with no recovery short of a hard reload.
  useEffect(() => {
    if (!facilityId) return;

    const channelName = `concierge-intros-count-${facilityId}-${Math.random().toString(36).slice(2, 10)}`;
    const channel = supabase
      .channel(channelName)
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
      try {
        supabase.removeChannel(channel);
      } catch {
        /* removeChannel may throw if the channel was already torn down */
      }
    };
  }, [facilityId, queryClient]);

  return {
    count: query.data ?? 0,
    isLoading: query.isLoading,
    refetchCount,
  };
}
