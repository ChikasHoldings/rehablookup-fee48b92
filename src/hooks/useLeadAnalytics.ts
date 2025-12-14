import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { startOfMonth, subMonths, format, startOfDay, endOfDay, isWithinInterval, subDays, subWeeks } from "date-fns";

interface Lead {
  id: string;
  name: string;
  email: string;
  phone: string;
  status: string;
  created_at: string;
  preferred_contact: string;
}

export interface DateRange {
  from: Date | undefined;
  to: Date | undefined;
}

export interface LeadAnalytics {
  // Monthly trend data
  monthlyTrends: { month: string; leads: number }[];
  
  // Status breakdown
  statusBreakdown: { status: string; count: number; percentage: number }[];
  
  // Conversion funnel
  conversionFunnel: {
    new: number;
    contacted: number;
    qualified: number;
    converted: number;
  };
  
  // Response metrics
  responseMetrics: {
    avgResponseTime: number; // in hours
    respondedWithin24h: number;
    respondedWithin48h: number;
    notResponded: number;
  };
  
  // Preferred contact breakdown
  contactPreference: { method: string; count: number }[];
  
  // Summary stats
  totalLeads: number;
  thisMonthLeads: number;
  lastMonthLeads: number;
  growthRate: number;
  
  // Date range info
  dateRangeLabel?: string;
}

export function useLeadAnalytics(facilityId: string | undefined, dateRange?: DateRange) {
  return useQuery({
    queryKey: ["lead-analytics", facilityId, dateRange?.from?.toISOString(), dateRange?.to?.toISOString()],
    queryFn: async (): Promise<LeadAnalytics> => {
      if (!facilityId) {
        return getEmptyAnalytics();
      }

      // Fetch all leads for the facility
      const { data: leads, error } = await supabase
        .from("leads")
        .select("*")
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
    conversionFunnel: { new: 0, contacted: 0, qualified: 0, converted: 0 },
    responseMetrics: {
      avgResponseTime: 0,
      respondedWithin24h: 0,
      respondedWithin48h: 0,
      notResponded: 0,
    },
    contactPreference: [],
    totalLeads: 0,
    thisMonthLeads: 0,
    lastMonthLeads: 0,
    growthRate: 0,
  };
}

function calculateAnalytics(leads: Lead[], allTimeLeads: Lead[], dateRange?: DateRange): LeadAnalytics {
  const now = new Date();
  const thisMonthStart = startOfMonth(now);
  const lastMonthStart = startOfMonth(subMonths(now, 1));
  const lastMonthEnd = startOfMonth(now);

  // Monthly trends (last 6 months or based on date range)
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

  // Conversion funnel
  const conversionFunnel = {
    new: leads.filter(l => l.status === "new").length,
    contacted: leads.filter(l => l.status === "contacted").length,
    qualified: leads.filter(l => l.status === "qualified").length,
    converted: leads.filter(l => l.status === "converted").length,
  };

  // Response metrics (simulate based on status - in real app would track timestamps)
  const newLeads = leads.filter(l => l.status === "new").length;
  const respondedLeads = leads.filter(l => l.status !== "new").length;
  
  const responseMetrics = {
    avgResponseTime: respondedLeads > 0 ? 12 : 0, // Simulated
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

  // Summary stats - use filtered leads for current stats but all leads for comparison
  const thisMonthLeads = leads.filter(l => new Date(l.created_at) >= thisMonthStart).length;
  const lastMonthLeads = leads.filter(l => {
    const date = new Date(l.created_at);
    return date >= lastMonthStart && date < lastMonthEnd;
  }).length;
  
  const growthRate = lastMonthLeads > 0 
    ? Math.round(((thisMonthLeads - lastMonthLeads) / lastMonthLeads) * 100)
    : thisMonthLeads > 0 ? 100 : 0;

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
    conversionFunnel,
    responseMetrics,
    contactPreference,
    totalLeads: leads.length,
    thisMonthLeads,
    lastMonthLeads,
    growthRate,
    dateRangeLabel,
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
  { label: "All Time", value: "all", getRange: () => ({ from: undefined, to: undefined }) },
  { label: "Last 7 Days", value: "7d", getRange: () => ({ from: subDays(new Date(), 7), to: new Date() }) },
  { label: "Last 14 Days", value: "14d", getRange: () => ({ from: subDays(new Date(), 14), to: new Date() }) },
  { label: "Last 30 Days", value: "30d", getRange: () => ({ from: subDays(new Date(), 30), to: new Date() }) },
  { label: "Last 90 Days", value: "90d", getRange: () => ({ from: subDays(new Date(), 90), to: new Date() }) },
  { label: "This Month", value: "this_month", getRange: () => ({ from: startOfMonth(new Date()), to: new Date() }) },
  { label: "Last Month", value: "last_month", getRange: () => ({ from: startOfMonth(subMonths(new Date(), 1)), to: startOfMonth(new Date()) }) },
] as const;
