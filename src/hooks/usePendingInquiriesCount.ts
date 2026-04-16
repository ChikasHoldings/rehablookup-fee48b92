import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getCachedSession } from "@/lib/sessionCache";

/**
 * Hook to track pending (new/uncontacted) inquiries count across all provider facilities.
 * Uses a security definer function to bypass the RLS unlock restriction on the leads table,
 * ensuring accurate counts of ALL new leads (not just unlocked ones).
 * 
 * Polling-based: leads and lead_unlocks were removed from Realtime for PII security.
 */
export function usePendingInquiriesCount() {
  const query = useQuery({
    queryKey: ["pending-inquiries-count"],
    queryFn: async () => {
      const session = await getCachedSession();
      if (!session) return { count: 0 };

      // Use security definer function for accurate count (bypasses RLS unlock restriction)
      const { data: count, error } = await supabase.rpc("get_pending_leads_count", {
        p_user_id: session.user.id,
      });

      if (error) {
        console.error("[usePendingInquiriesCount] Error counting leads:", error);
        return { count: 0 };
      }

      return { count: Number(count) || 0 };
    },
    staleTime: 1000 * 30, // 30 seconds
    gcTime: 1000 * 60 * 5, // 5 minutes
    refetchInterval: 30000, // Poll every 30 seconds
    refetchOnWindowFocus: true,
  });

  return {
    count: query.data?.count || 0,
    isLoading: query.isLoading,
    refetch: query.refetch,
  };
}
