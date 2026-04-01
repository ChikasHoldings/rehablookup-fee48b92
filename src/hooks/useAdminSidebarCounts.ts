import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface AdminSidebarCounts {
  leads: number;
  pendingProviders: number;
  supportTickets: number;
  pendingReviews: number;
  placements: number;
  marketingLeads: number;
}

export function useAdminSidebarCounts() {
  return useQuery({
    queryKey: ["admin-sidebar-counts"],
    queryFn: async (): Promise<AdminSidebarCounts> => {
      // Fetch all counts in parallel
      const [
        leadsResult,
        providersResult,
        supportResult,
        reviewsResult,
        placementsResult,
        marketingResult,
      ] = await Promise.all([
        // New leads (status = "new")
        supabase
          .from("leads")
          .select("*", { count: "exact", head: true })
          .eq("status", "new"),
        
        // Pending providers
        supabase
          .from("facilities")
          .select("*", { count: "exact", head: true })
          .eq("status", "pending"),
        
        // Open support tickets
        supabase
          .from("support_tickets")
          .select("*", { count: "exact", head: true })
          .in("status", ["open", "in_progress"]),
        
        // Pending reviews
        supabase
          .from("facility_reviews")
          .select("*", { count: "exact", head: true })
          .eq("status", "pending"),
        
        // Active placements (concierge inquiries needing attention)
        supabase
          .from("concierge_inquiries")
          .select("*", { count: "exact", head: true })
          .in("status", ["new", "reviewing", "matching", "matched", "introductions_sent", "in_contact"]),
        
        // Marketing leads (new/uncontacted)
        supabase
          .from("marketing_leads")
          .select("*", { count: "exact", head: true })
          .eq("status", "new"),
      ]);

      return {
        leads: leadsResult.count || 0,
        pendingProviders: providersResult.count || 0,
        supportTickets: supportResult.count || 0,
        pendingReviews: reviewsResult.count || 0,
        placements: placementsResult.count || 0,
        marketingLeads: marketingResult.count || 0,
      };
    },
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 60 * 1000, // Refetch every minute
  });
}
