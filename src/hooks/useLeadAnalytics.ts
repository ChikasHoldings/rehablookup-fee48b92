import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { startOfMonth, subMonths, format, differenceInHours } from "date-fns";

interface Lead {
  id: string;
  name: string;
  email: string;
  phone: string;
  status: string;
  created_at: string;
  preferred_contact: string;
}

interface LeadAnalytics {
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
}

export function useLeadAnalytics(facilityId: string | undefined) {
  return useQuery({
    queryKey: ["lead-analytics", facilityId],
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

      const allLeads = (leads || []) as Lead[];
      
      return calculateAnalytics(allLeads);
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

function calculateAnalytics(leads: Lead[]): LeadAnalytics {
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

  // Summary stats
  const thisMonthLeads = leads.filter(l => new Date(l.created_at) >= thisMonthStart).length;
  const lastMonthLeads = leads.filter(l => {
    const date = new Date(l.created_at);
    return date >= lastMonthStart && date < lastMonthEnd;
  }).length;
  
  const growthRate = lastMonthLeads > 0 
    ? Math.round(((thisMonthLeads - lastMonthLeads) / lastMonthLeads) * 100)
    : thisMonthLeads > 0 ? 100 : 0;

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
