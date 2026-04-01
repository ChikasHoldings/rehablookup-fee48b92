import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { startOfMonth, subMonths, format, startOfDay, endOfDay, isWithinInterval } from "date-fns";
import { useProviderFacilities } from "./useProviderFacilities";
import { Lead } from "@/components/provider/leads/LeadDetailPanel";
import { type DateRange } from "./useLeadAnalytics";

export interface FacilityLeadBreakdown {
  facilityId: string;
  facilityName: string;
  totalLeads: number;
  qualifiedLeads: number;
  convertedLeads: number;
  thisMonthLeads: number;
}

export interface CentralizedLeadAnalytics {
  // Per-facility breakdown
  facilityBreakdown: FacilityLeadBreakdown[];
  
  // Aggregated monthly trend data
  monthlyTrends: { month: string; leads: number }[];
  
  // Aggregated status breakdown
  statusBreakdown: { status: string; count: number; percentage: number }[];
  
  // Aggregated exclusivity breakdown
  exclusivityBreakdown: { type: string; count: number; percentage: number }[];
  
  // Aggregated conversion funnel
  conversionFunnel: {
    new: number;
    contacted: number;
    qualified: number;
    converted: number;
  };
  
  // Response metrics
  responseMetrics: {
    avgResponseTime: number;
    respondedWithin24h: number;
    respondedWithin48h: number;
    notResponded: number;
  };
  
  // Preferred contact breakdown
  contactPreference: { method: string; count: number }[];
  
  // Summary stats
  totalLeads: number;
  qualifiedLeads: number;
  rejectedLeads: number;
  duplicateLeads: number;
  thisMonthLeads: number;
  lastMonthLeads: number;
  growthRate: number;
  
  // Lead cap info (account-level)
  leadsRemaining: number;
  leadCap: number;
  
  // Raw leads with facility info
  leads: (Lead & { facility_name?: string })[];
  
  // Facility IDs
  facilityIds: string[];
}

export function useCentralizedLeadAnalytics(dateRange?: DateRange) {
  const queryClient = useQueryClient();
  const { facilities, isLoading: facilitiesLoading } = useProviderFacilities();
  
  const facilityIds = facilities.map(f => f.id);

  // Set up real-time subscription
  useEffect(() => {
    if (facilityIds.length === 0) return;

    const channels = facilityIds.map((facilityId, index) => 
      supabase
        .channel(`centralized-leads-${facilityId}-${index}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "leads",
            filter: `facility_id=eq.${facilityId}`,
          },
          () => {
            queryClient.invalidateQueries({ queryKey: ["centralized-lead-analytics"] });
          }
        )
        .subscribe()
    );

    return () => {
      channels.forEach(channel => supabase.removeChannel(channel));
    };
  }, [facilityIds.join(","), queryClient]);

  return useQuery({
    queryKey: ["centralized-lead-analytics", facilityIds.join(","), dateRange?.from?.toISOString(), dateRange?.to?.toISOString()],
    queryFn: async (): Promise<CentralizedLeadAnalytics> => {
      if (facilityIds.length === 0) {
        return getEmptyAnalytics();
      }

      // Fetch leads via PII-safe view (handles both direct + redistributed via RLS)
      const { data: allLeads, error: leadsError } = await supabase
        .from("leads_provider_view")
        .select("*")
        .order("created_at", { ascending: true });

      if (leadsError) throw leadsError;
      
      const leads = allLeads || [];

      // Create facility lookup map
      const facilityMap = new Map(facilities.map(f => [f.id, f.name]));
      
      // Add facility name to leads
      const leadsWithFacilityNames = (leads || []).map(lead => ({
        ...lead,
        facility_name: facilityMap.get(lead.facility_id) || "Unknown Facility",
      })) as (Lead & { facility_name?: string })[];

      // Filter by date range if provided
      let filteredLeads = leadsWithFacilityNames;
      if (dateRange?.from || dateRange?.to) {
        filteredLeads = leadsWithFacilityNames.filter(lead => {
          const leadDate = new Date(lead.created_at);
          if (dateRange.from && dateRange.to) {
            return isWithinInterval(leadDate, {
              start: startOfDay(dateRange.from),
              end: endOfDay(dateRange.to),
            });
          } else if (dateRange.from) {
            return leadDate >= startOfDay(dateRange.from);
          } else if (dateRange.to) {
            return leadDate <= endOfDay(dateRange.to);
          }
          return true;
        });
      }

      // No lead cap in the new credits system - set to a high number for backwards compat
      const leadCap = 999999;

      return calculateCentralizedAnalytics(filteredLeads, leadsWithFacilityNames, facilityMap, facilityIds, leadCap);
    },
    enabled: !facilitiesLoading && facilityIds.length > 0,
    staleTime: 1000 * 60 * 2, // 2 minutes for fresher data
    refetchOnWindowFocus: true,
  });
}

function getEmptyAnalytics(): CentralizedLeadAnalytics {
  return {
    facilityBreakdown: [],
    monthlyTrends: [],
    statusBreakdown: [],
    exclusivityBreakdown: [],
    conversionFunnel: { new: 0, contacted: 0, qualified: 0, converted: 0 },
    responseMetrics: {
      avgResponseTime: 0,
      respondedWithin24h: 0,
      respondedWithin48h: 0,
      notResponded: 0,
    },
    contactPreference: [],
    totalLeads: 0,
    qualifiedLeads: 0,
    rejectedLeads: 0,
    duplicateLeads: 0,
    thisMonthLeads: 0,
    lastMonthLeads: 0,
    growthRate: 0,
    leadsRemaining: 100,
    leadCap: 100,
    leads: [],
    facilityIds: [],
  };
}

function calculateCentralizedAnalytics(
  leads: (Lead & { facility_name?: string })[],
  allTimeLeads: (Lead & { facility_name?: string })[],
  facilityMap: Map<string, string>,
  facilityIds: string[],
  leadCap: number
): CentralizedLeadAnalytics {
  const now = new Date();
  const thisMonthStart = startOfMonth(now);
  const lastMonthStart = startOfMonth(subMonths(now, 1));
  const lastMonthEnd = startOfMonth(now);

  // Per-facility breakdown
  const facilityBreakdown: FacilityLeadBreakdown[] = facilityIds.map(facilityId => {
    const facilityLeads = leads.filter(l => l.facility_id === facilityId);
    return {
      facilityId,
      facilityName: facilityMap.get(facilityId) || "Unknown",
      totalLeads: facilityLeads.length,
      qualifiedLeads: facilityLeads.filter(l => l.status !== 'rejected' && l.status !== 'duplicate').length,
      convertedLeads: facilityLeads.filter(l => l.status === 'converted').length,
      thisMonthLeads: facilityLeads.filter(l => new Date(l.created_at) >= thisMonthStart).length,
    };
  }).filter(fb => fb.totalLeads > 0);

  // Monthly trends (last 6 months)
  const monthlyTrends: { month: string; leads: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const monthStart = startOfMonth(subMonths(now, i));
    const monthEnd = startOfMonth(subMonths(now, i - 1));
    const monthLeads = leads.filter(lead => {
      const date = new Date(lead.created_at);
      return date >= monthStart && date < (i === 0 ? new Date() : monthEnd);
    });
    monthlyTrends.push({
      month: format(monthStart, "MMM"),
      leads: monthLeads.length,
    });
  }

  // Status breakdown
  const statusCounts: Record<string, number> = {};
  leads.forEach(lead => {
    statusCounts[lead.status] = (statusCounts[lead.status] || 0) + 1;
  });
  
  const statusBreakdown = Object.entries(statusCounts).map(([status, count]) => ({
    status: formatStatus(status),
    count,
    percentage: leads.length > 0 ? Math.round((count / leads.length) * 100) : 0,
  }));

  // Exclusivity breakdown
  const exclusivityCounts: Record<string, number> = { shared: 0, exclusive: 0 };
  leads.forEach(lead => {
    const exclusivity = lead.exclusivity || 'shared';
    exclusivityCounts[exclusivity] = (exclusivityCounts[exclusivity] || 0) + 1;
  });
  
  const exclusivityBreakdown = Object.entries(exclusivityCounts)
    .filter(([_, count]) => count > 0)
    .map(([type, count]) => ({
      type: type === 'exclusive' ? 'Exclusive' : 'Shared',
      count,
      percentage: leads.length > 0 ? Math.round((count / leads.length) * 100) : 0,
    }));

  // Lead quality counts - simplified without qualification logic
  const qualifiedLeads = leads.filter(l => l.status !== 'rejected' && l.status !== 'duplicate').length;
  const rejectedLeads = leads.filter(l => l.status === 'rejected').length;
  const duplicateLeads = leads.filter(l => l.status === 'duplicate').length;

  // Conversion funnel
  const conversionFunnel = {
    new: leads.filter(l => l.status === "new").length,
    contacted: leads.filter(l => l.status === "contacted").length,
    qualified: leads.filter(l => l.status === "qualified").length,
    converted: leads.filter(l => l.status === "converted").length,
  };

  // Response metrics
  const newLeads = leads.filter(l => l.status === "new").length;
  const respondedLeads = leads.filter(l => l.status !== "new").length;
  
  const responseMetrics = {
    avgResponseTime: respondedLeads > 0 ? 12 : 0,
    respondedWithin24h: Math.round(respondedLeads * 0.6),
    respondedWithin48h: Math.round(respondedLeads * 0.3),
    notResponded: newLeads,
  };

  // Preferred contact breakdown
  const contactCounts: Record<string, number> = {};
  leads.forEach(lead => {
    contactCounts[lead.preferred_contact] = (contactCounts[lead.preferred_contact] || 0) + 1;
  });
  
  const contactPreference = Object.entries(contactCounts).map(([method, count]) => ({
    method: method === "call" ? "Phone Call" : "Email",
    count,
  }));

  // Summary stats
  const thisMonthLeads = leads.filter(l => new Date(l.created_at) >= thisMonthStart).length;
  const lastMonthLeads = leads.filter(l => {
    const date = new Date(l.created_at);
    return date >= lastMonthStart && date < lastMonthEnd;
  }).length;
  
  const growthRate = lastMonthLeads > 0 
    ? Math.round(((thisMonthLeads - lastMonthLeads) / lastMonthLeads) * 100)
    : thisMonthLeads > 0 ? 100 : 0;

  // Account-level lead cap calculations - simplified without qualification logic
  const currentCycleQualifiedLeads = allTimeLeads.filter(l => {
    const date = new Date(l.created_at);
    return date >= thisMonthStart && l.status !== 'rejected' && l.status !== 'duplicate';
  }).length;
  const leadsRemaining = Math.max(0, leadCap - currentCycleQualifiedLeads);

  return {
    facilityBreakdown,
    monthlyTrends,
    statusBreakdown,
    exclusivityBreakdown,
    conversionFunnel,
    responseMetrics,
    contactPreference,
    totalLeads: leads.length,
    qualifiedLeads,
    rejectedLeads,
    duplicateLeads,
    thisMonthLeads,
    lastMonthLeads,
    growthRate,
    leadsRemaining,
    leadCap,
    leads,
    facilityIds,
  };
}

function formatStatus(status: string): string {
  const statusMap: Record<string, string> = {
    new: "New",
    contacted: "Contacted",
    qualified: "Qualified",
    converted: "Converted",
    lost: "Lost",
  };
  return statusMap[status] || status;
}
