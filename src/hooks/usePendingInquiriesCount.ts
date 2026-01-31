import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Hook to track pending (new/uncontacted) inquiries count across all provider facilities.
 * Updates in realtime when:
 * - New leads arrive
 * - Lead status changes (contacted, qualified, etc.)
 * - Leads are unlocked
 */
export function usePendingInquiriesCount() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["pending-inquiries-count"],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return { count: 0, facilityIds: [] };

      // Get all facility IDs for this provider
      const { data: facilities, error: facilitiesError } = await supabase
        .from("facilities")
        .select("id")
        .eq("user_id", session.user.id);

      if (facilitiesError || !facilities?.length) {
        return { count: 0, facilityIds: [] };
      }

      const facilityIds = facilities.map(f => f.id);

      // Count leads with status "new" across all facilities
      const { count, error } = await supabase
        .from("leads")
        .select("*", { count: "exact", head: true })
        .in("facility_id", facilityIds)
        .eq("status", "new");

      if (error) {
        console.error("[usePendingInquiriesCount] Error counting leads:", error);
        return { count: 0, facilityIds };
      }

      return { count: count || 0, facilityIds };
    },
    staleTime: 1000 * 30, // 30 seconds
    gcTime: 1000 * 60 * 5, // 5 minutes
    refetchInterval: 60000, // Refetch every minute as fallback
  });

  // Subscribe to realtime lead changes
  useEffect(() => {
    const facilityIds = query.data?.facilityIds || [];
    if (facilityIds.length === 0) return;

    // Create channels for each facility to track lead changes
    const channels: ReturnType<typeof supabase.channel>[] = [];

    facilityIds.forEach((facilityId, index) => {
      // Subscribe to leads table changes
      const leadsChannel = supabase
        .channel(`pending-inquiries-leads-${facilityId}-${index}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "leads",
            filter: `facility_id=eq.${facilityId}`,
          },
          (payload) => {
            console.log("[usePendingInquiriesCount] Lead change detected:", payload.eventType);
            queryClient.invalidateQueries({ queryKey: ["pending-inquiries-count"] });
            // Also invalidate related queries
            queryClient.invalidateQueries({ queryKey: ["new-inquiries-count"] });
            queryClient.invalidateQueries({ queryKey: ["provider-leads"] });
          }
        )
        .subscribe();

      channels.push(leadsChannel);

      // Subscribe to lead_unlocks table changes
      const unlocksChannel = supabase
        .channel(`pending-inquiries-unlocks-${facilityId}-${index}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "lead_unlocks",
            filter: `facility_id=eq.${facilityId}`,
          },
          (payload) => {
            console.log("[usePendingInquiriesCount] Lead unlock detected:", payload);
            queryClient.invalidateQueries({ queryKey: ["pending-inquiries-count"] });
            queryClient.invalidateQueries({ queryKey: ["new-inquiries-count"] });
            queryClient.invalidateQueries({ queryKey: ["provider-leads"] });
          }
        )
        .subscribe();

      channels.push(unlocksChannel);
    });

    return () => {
      channels.forEach(channel => {
        supabase.removeChannel(channel);
      });
    };
  }, [query.data?.facilityIds, queryClient]);

  return {
    count: query.data?.count || 0,
    isLoading: query.isLoading,
    refetch: query.refetch,
  };
}
