import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface AdminSidebarCounts {
  leads: number;
  pendingProviders: number;
  supportTickets: number;
  pendingReviews: number;
  placements: number;
  marketingLeads: number;
  openEscalations: number;
}

export function useAdminSidebarCounts() {
  return useQuery({
    queryKey: ["admin-sidebar-counts"],
    queryFn: async (): Promise<AdminSidebarCounts> => {
      const [
        leadsResult,
        providersResult,
        supportResult,
        reviewsResult,
        placementsResult,
        marketingResult,
        escalationsResult,
      ] = await Promise.all([
        supabase
          .from("leads")
          .select("*", { count: "exact", head: true })
          .eq("status", "new"),
        supabase
          .from("facilities")
          .select("*", { count: "exact", head: true })
          .eq("status", "pending"),
        supabase
          .from("support_tickets")
          .select("*", { count: "exact", head: true })
          .in("status", ["open", "in_progress"]),
        supabase
          .from("facility_reviews")
          .select("*", { count: "exact", head: true })
          .eq("status", "pending"),
        supabase
          .from("concierge_inquiries")
          .select("*", { count: "exact", head: true })
          .in("status", ["new", "reviewing", "matching", "matched", "introductions_sent", "in_contact"]),
        supabase
          .from("marketing_leads")
          .select("*", { count: "exact", head: true })
          .eq("status", "new"),
        supabase
          .from("admin_escalations")
          .select("*", { count: "exact", head: true })
          .in("status", ["open", "in_progress"]),
      ]);

      return {
        leads: leadsResult.count || 0,
        pendingProviders: providersResult.count || 0,
        supportTickets: supportResult.count || 0,
        pendingReviews: reviewsResult.count || 0,
        placements: placementsResult.count || 0,
        marketingLeads: marketingResult.count || 0,
        openEscalations: escalationsResult.count || 0,
      };
    },
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 60 * 1000, // Refetch every minute
  });
}
