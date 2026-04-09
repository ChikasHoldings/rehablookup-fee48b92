import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Hook to track pending (new/uncontacted) inquiries count across all provider facilities.
 * Uses a security definer function to bypass the RLS unlock restriction on the leads table,
 * ensuring accurate counts of ALL new leads (not just unlocked ones).
 */
export function usePendingInquiriesCount() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["pending-inquiries-count"],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return { count: 0, facilityIds: [] };

      // Get facility IDs for realtime subscriptions
      const { data: facilities, error: facilitiesError } = await supabase
        .from("facilities")
        .select("id")
        .eq("user_id", session.user.id);

      if (facilitiesError || !facilities?.length) {
        return { count: 0, facilityIds: [] };
      }

      const facilityIds = facilities.map(f => f.id);

      // Use security definer function for accurate count (bypasses RLS unlock restriction)
      const { data: count, error } = await supabase.rpc("get_pending_leads_count", {
        p_user_id: session.user.id,
      });

      if (error) {
        console.error("[usePendingInquiriesCount] Error counting leads:", error);
        return { count: 0, facilityIds };
      }

      return { count: Number(count) || 0, facilityIds };
    },
    staleTime: 1000 * 30, // 30 seconds
    gcTime: 1000 * 60 * 5, // 5 minutes
    refetchInterval: 60000, // Refetch every minute as fallback
  });

  // Subscribe to realtime lead changes
  useEffect(() => {
    const facilityIds = query.data?.facilityIds || [];
    if (facilityIds.length === 0) return;

    const channels: ReturnType<typeof supabase.channel>[] = [];

    facilityIds.forEach((facilityId, index) => {
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
            
            queryClient.invalidateQueries({ queryKey: ["pending-inquiries-count"] });
            queryClient.invalidateQueries({ queryKey: ["new-inquiries-count"] });
            queryClient.invalidateQueries({ queryKey: ["provider-leads"] });
          }
        )
        .subscribe();

      channels.push(leadsChannel);

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
