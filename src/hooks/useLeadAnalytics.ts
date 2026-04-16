import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { startOfMonth, subMonths, format, startOfDay, endOfDay, isWithinInterval, subDays } from "date-fns";
import { Lead } from "@/components/provider/leads/LeadDetailPanel";

// Re-export Lead for backwards compatibility
export type { Lead };

export interface DateRange {
  from: Date | undefined;
  to: Date | undefined;
}

export interface LeadAnalytics {
  // Monthly trend data
  monthlyTrends: { month: string; leads: number }[];
  
  // Status breakdown (qualified/rejected/duplicate)
  statusBreakdown: { status: string; count: number; percentage: number }[];
  
  // Exclusivity breakdown (shared/exclusive)
  exclusivityBreakdown: { type: string; count: number; percentage: number }[];
  
  // Conversion funnel
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
  
  // Lead cap info
  leadsRemaining: number;
  leadCap: number;
  
  // Date range info
  dateRangeLabel?: string;
  
  // Raw leads for conversion analysis
  leads: Lead[];
}

export function useLeadAnalytics(facilityId: string | undefined, dateRange?: DateRange) {
  return useQuery({
    queryKey: ["lead-analytics", facilityId, dateRange?.from?.toISOString(), dateRange?.to?.toISOString()],
    queryFn: async (): Promise<LeadAnalytics> => {
      if (!facilityId) {
        return getEmptyAnalytics();
      }

      // Fetch all leads for the facility
      // Use leads_provider_view instead of leads table directly
      // (RLS on leads requires unlock, which would hide new leads from analytics)
      const { data: leads, error } = await supabase
        .from("leads_provider_view")
        .select("id, facility_id, name, status, created_at, urgency, level_of_care, source, location_city_state, insurance_type, inquiry_type, primary_substance, who_seeking_help")
        .eq("facility_id", facilityId)
        .order("created_at", { ascending: true });

      if (error) throw error;

      let allLeads = (leads || []) as Lead[];
      
      // Filter by date range if provided
      if (dateRange?.from || dateRange?.to) {
        allLeads = allLeads.filter(lead => {
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
      
      return calculateAnalytics(allLeads, leads as Lead[], dateRange);
    },
    enabled: !!facilityId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

function getEmptyAnalytics(): LeadAnalytics {
  return {
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
  };
}

function calculateAnalytics(leads: Lead[], allTimeLeads: Lead[], dateRange?: DateRange): LeadAnalytics {
  const now = new Date();
  const thisMonthStart = startOfMonth(now);
  const lastMonthStart = startOfMonth(subMonths(now, 1));
  const lastMonthEnd = startOfMonth(now);

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

  // Status breakdown - use workflow status for conversion tracking
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

  // Lead quality counts
  const qualifiedLeads = leads.filter(l => l.qualified === true || l.status !== 'rejected' && l.status !== 'duplicate').length;
  const rejectedLeads = leads.filter(l => l.status === 'rejected' || l.qualified === false).length;
  const duplicateLeads = leads.filter(l => l.status === 'duplicate').length;

  // Conversion funnel
  const conversionFunnel = {
    new: leads.filter(l => l.status === "new").length,
    contacted: leads.filter(l => l.status === "contacted").length,
    qualified: leads.filter(l => l.status === "qualified").length,
    converted: leads.filter(l => l.status === "converted").length,
  };

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

  const newLeads = leads.filter(l => l.status === "new").length;
  const responseMetrics = {
    avgResponseTime: respondedCount > 0 ? Math.round(totalResponseHours / respondedCount) : 0,
    respondedWithin24h: within24h,
    respondedWithin48h: within48h,
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

  // Summary stats - current billing cycle (this month)
  const thisMonthLeads = leads.filter(l => new Date(l.created_at) >= thisMonthStart).length;
  const lastMonthLeads = leads.filter(l => {
    const date = new Date(l.created_at);
    return date >= lastMonthStart && date < lastMonthEnd;
  }).length;
  
  const growthRate = lastMonthLeads > 0 
    ? Math.round(((thisMonthLeads - lastMonthLeads) / lastMonthLeads) * 100)
    : thisMonthLeads > 0 ? 100 : 0;

  // Lead cap calculations (100 per billing cycle)
  const leadCap = 100;
  const currentCycleQualifiedLeads = allTimeLeads.filter(l => {
    const date = new Date(l.created_at);
    return date >= thisMonthStart && (l.qualified !== false && l.status !== 'rejected' && l.status !== 'duplicate');
  }).length;
  const leadsRemaining = Math.max(0, leadCap - currentCycleQualifiedLeads);

  // Generate date range label
  let dateRangeLabel: string | undefined;
  if (dateRange?.from && dateRange?.to) {
    dateRangeLabel = `${format(dateRange.from, "MMM d")} - ${format(dateRange.to, "MMM d, yyyy")}`;
  } else if (dateRange?.from) {
    dateRangeLabel = `From ${format(dateRange.from, "MMM d, yyyy")}`;
  } else if (dateRange?.to) {
    dateRangeLabel = `Until ${format(dateRange.to, "MMM d, yyyy")}`;
  }

  return {
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
    dateRangeLabel,
    leads,
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

// Preset date ranges
export const DATE_RANGE_PRESETS = [
  { label: "Current Billing Cycle", value: "billing_cycle", getRange: () => ({ from: startOfMonth(new Date()), to: new Date() }) },
  { label: "All Time", value: "all", getRange: () => ({ from: undefined, to: undefined }) },
  { label: "Last 7 Days", value: "7d", getRange: () => ({ from: subDays(new Date(), 7), to: new Date() }) },
  { label: "Last 14 Days", value: "14d", getRange: () => ({ from: subDays(new Date(), 14), to: new Date() }) },
  { label: "Last 30 Days", value: "30d", getRange: () => ({ from: subDays(new Date(), 30), to: new Date() }) },
  { label: "Last 90 Days", value: "90d", getRange: () => ({ from: subDays(new Date(), 90), to: new Date() }) },
  { label: "This Month", value: "this_month", getRange: () => ({ from: startOfMonth(new Date()), to: new Date() }) },
  { label: "Last Month", value: "last_month", getRange: () => ({ from: startOfMonth(subMonths(new Date(), 1)), to: startOfMonth(new Date()) }) },
] as const;
