import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  startOfMonth,
  subMonths,
  format,
  startOfDay,
  endOfDay,
  isWithinInterval,
  subDays,
  differenceInCalendarDays,
} from "date-fns";
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
  facilityBreakdown: FacilityLeadBreakdown[];
  monthlyTrends: { month: string; leads: number }[];
  statusBreakdown: { status: string; count: number; percentage: number }[];
  exclusivityBreakdown: { type: string; count: number; percentage: number }[];
  conversionFunnel: {
    new: number;
    contacted: number;
    qualified: number;
    converted: number;
  };
  responseMetrics: {
    avgResponseTime: number;
    respondedWithin24h: number;
    respondedWithin48h: number;
    notResponded: number;
  };
  contactPreference: { method: string; count: number }[];
  totalLeads: number;
  allTimeLeads: number;
  qualifiedLeads: number;
  rejectedLeads: number;
  duplicateLeads: number;
  thisMonthLeads: number;
  lastMonthLeads: number;
  growthRate: number;
  leadsRemaining: number;
  leadCap: number;
  leads: (Lead & { facility_name?: string })[];
  facilityIds: string[];
}

export function useCentralizedLeadAnalytics(dateRange?: DateRange, filterFacilityId?: string) {
  const queryClient = useQueryClient();
  const { facilities, isLoading: facilitiesLoading } = useProviderFacilities();

  const facilityIds = filterFacilityId
    ? facilities.filter(f => f.id === filterFacilityId).map(f => f.id)
    : facilities.map((f) => f.id);

  // Poll for lead updates every 60 seconds (leads removed from Realtime for PII security)
  useEffect(() => {
    if (facilityIds.length === 0) return;

    const interval = setInterval(() => {
      queryClient.invalidateQueries({ queryKey: ["centralized-lead-analytics"] });
    }, 60000);

    return () => clearInterval(interval);
  }, [facilityIds.join(","), queryClient]);

  return useQuery({
    queryKey: [
      "centralized-lead-analytics",
      facilityIds.join(","),
      dateRange?.from?.toISOString(),
      dateRange?.to?.toISOString(),
      filterFacilityId || "all",
    ],
    queryFn: async (): Promise<CentralizedLeadAnalytics> => {
      if (facilityIds.length === 0) {
        return getEmptyAnalytics();
      }

      const { data: allLeads, error: leadsError } = await supabase
        .from("leads_provider_view")
        .select("id, facility_id, name, status, created_at, urgency, level_of_care, source, location_city_state, insurance_type, is_unlocked, inquiry_type, who_seeking_help, provider_response_status, provider_responded_at, primary_substance")
        .in("facility_id", facilityIds)
        .order("created_at", { ascending: true })
        .limit(2000);

      if (leadsError) throw leadsError;

      const leads = allLeads || [];
      const facilityMap = new Map(facilities.map((f) => [f.id, f.name]));

      const leadsWithFacilityNames = leads.map((lead) => ({
        ...lead,
        facility_name: facilityMap.get(lead.facility_id) || "Unknown Facility",
      })) as (Lead & { facility_name?: string })[];

      let filteredLeads = leadsWithFacilityNames;
      if (dateRange?.from || dateRange?.to) {
        filteredLeads = leadsWithFacilityNames.filter((lead) => {
          const leadDate = new Date(lead.created_at);
          if (dateRange.from && dateRange.to) {
            return isWithinInterval(leadDate, {
              start: startOfDay(dateRange.from),
              end: endOfDay(dateRange.to),
            });
          }
          if (dateRange.from) {
            return leadDate >= startOfDay(dateRange.from);
          }
          if (dateRange.to) {
            return leadDate <= endOfDay(dateRange.to);
          }
          return true;
        });
      }

      const leadCap = 999999;

      return calculateCentralizedAnalytics(
        filteredLeads,
        leadsWithFacilityNames,
        facilityMap,
        facilityIds,
        leadCap,
        dateRange
      );
    },
    enabled: !facilitiesLoading && facilityIds.length > 0,
    staleTime: 1000 * 60 * 2,
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
    allTimeLeads: 0,
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
  leadCap: number,
  dateRange?: DateRange
): CentralizedLeadAnalytics {
  const now = new Date();
  const hasAllTimeSelection = Boolean(dateRange && !dateRange.from && !dateRange.to);
  const thisMonthStart = startOfMonth(now);
  const trendSourceLeads = leads;

  const facilityBreakdown: FacilityLeadBreakdown[] = facilityIds
    .map((facilityId) => {
      const facilityLeads = leads.filter((lead) => lead.facility_id === facilityId);
      return {
        facilityId,
        facilityName: facilityMap.get(facilityId) || "Unknown",
        totalLeads: facilityLeads.length,
        qualifiedLeads: facilityLeads.filter((lead) => lead.status !== "rejected" && lead.status !== "duplicate").length,
        convertedLeads: facilityLeads.filter((lead) => lead.status === "converted").length,
        thisMonthLeads: facilityLeads.length,
      };
    })
    .filter((facility) => facility.totalLeads > 0);

  const monthlyTrends: { month: string; leads: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const monthStart = startOfMonth(subMonths(now, i));
    const monthEnd = startOfMonth(subMonths(now, i - 1));
    const monthLeads = trendSourceLeads.filter((lead) => {
      const date = new Date(lead.created_at);
      return date >= monthStart && date < (i === 0 ? new Date() : monthEnd);
    });
    monthlyTrends.push({
      month: format(monthStart, "MMM"),
      leads: monthLeads.length,
    });
  }

  const statusCounts: Record<string, number> = {};
  leads.forEach((lead) => {
    statusCounts[lead.status] = (statusCounts[lead.status] || 0) + 1;
  });

  const statusBreakdown = Object.entries(statusCounts).map(([status, count]) => ({
    status: formatStatus(status),
    count,
    percentage: leads.length > 0 ? Math.round((count / leads.length) * 100) : 0,
  }));

  const exclusivityCounts: Record<string, number> = { shared: 0, exclusive: 0 };
  leads.forEach((lead) => {
    const exclusivity = lead.exclusivity || "shared";
    exclusivityCounts[exclusivity] = (exclusivityCounts[exclusivity] || 0) + 1;
  });

  const exclusivityBreakdown = Object.entries(exclusivityCounts)
    .filter(([, count]) => count > 0)
    .map(([type, count]) => ({
      type: type === "exclusive" ? "Exclusive" : "Shared",
      count,
      percentage: leads.length > 0 ? Math.round((count / leads.length) * 100) : 0,
    }));

  const qualifiedLeads = leads.filter((lead) => lead.status !== "rejected" && lead.status !== "duplicate").length;
  const rejectedLeads = leads.filter((lead) => lead.status === "rejected").length;
  const duplicateLeads = leads.filter((lead) => lead.status === "duplicate").length;

  const conversionFunnel = {
    new: leads.filter((lead) => lead.status === "new").length,
    contacted: leads.filter((lead) => lead.status === "contacted").length,
    qualified: leads.filter((lead) => lead.status === "qualified").length,
    converted: leads.filter((lead) => lead.status === "converted").length,
  };

  const newLeads = leads.filter((lead) => lead.status === "new").length;

  // Calculate real response metrics from provider_responded_at
  let totalResponseHours = 0;
  let respondedCount = 0;
  let within24h = 0;
  let within48h = 0;

  leads.forEach((lead) => {
    const respondedAt = (lead as any).provider_responded_at;
    if (respondedAt) {
      respondedCount++;
      const createdDate = new Date(lead.created_at);
      const respondedDate = new Date(respondedAt);
      const diffHours = (respondedDate.getTime() - createdDate.getTime()) / (1000 * 60 * 60);
      totalResponseHours += Math.max(0, diffHours);
      if (diffHours <= 24) within24h++;
      else if (diffHours <= 48) within48h++;
    }
  });

  const responseMetrics = {
    avgResponseTime: respondedCount > 0 ? Math.round(totalResponseHours / respondedCount) : 0,
    respondedWithin24h: within24h,
    respondedWithin48h: within48h,
    notResponded: newLeads,
  };

  const contactCounts: Record<string, number> = {};
  leads.forEach((lead) => {
    contactCounts[lead.preferred_contact] = (contactCounts[lead.preferred_contact] || 0) + 1;
  });

  const contactPreference = Object.entries(contactCounts).map(([method, count]) => ({
    method: method === "call" ? "Phone Call" : "Email",
    count,
  }));

  const earliestLeadDate = allTimeLeads.length > 0
    ? new Date(Math.min(...allTimeLeads.map((lead) => new Date(lead.created_at).getTime())))
    : thisMonthStart;

  const periodStart = dateRange?.from
    ? startOfDay(dateRange.from)
    : hasAllTimeSelection
      ? startOfDay(earliestLeadDate)
      : thisMonthStart;
  const periodEnd = dateRange?.to
    ? endOfDay(dateRange.to)
    : hasAllTimeSelection
      ? endOfDay(now)
      : endOfDay(now);
  const periodLength = Math.max(1, differenceInCalendarDays(periodEnd, periodStart) + 1);
  const previousPeriodStart = startOfDay(subDays(periodStart, periodLength));
  const previousPeriodEnd = endOfDay(subDays(periodStart, 1));

  const previousPeriodLeads = hasAllTimeSelection
    ? 0
    : allTimeLeads.filter((lead) => {
        const date = new Date(lead.created_at);
        return isWithinInterval(date, {
          start: previousPeriodStart,
          end: previousPeriodEnd,
        });
      }).length;

  const thisMonthLeads = leads.length;
  const lastMonthLeads = previousPeriodLeads;
  const growthRate = hasAllTimeSelection ? 0 : calculateGrowth(thisMonthLeads, lastMonthLeads);

  const currentCycleQualifiedLeads = allTimeLeads.filter((lead) => {
    const date = new Date(lead.created_at);
    return date >= thisMonthStart && lead.status !== "rejected" && lead.status !== "duplicate";
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
    allTimeLeads: allTimeLeads.length,
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

function calculateGrowth(current: number, previous: number): number {
  if (previous === 0) {
    return current > 0 ? 100 : 0;
  }

  return Math.round(((current - previous) / previous) * 100);
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
