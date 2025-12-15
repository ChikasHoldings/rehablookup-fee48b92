import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { subDays, format, startOfDay, endOfDay, isWithinInterval } from "date-fns";
import { type DateRange } from "./useLeadAnalytics";

interface InteractionData {
  id: string;
  facility_id: string;
  interaction_type: string;
  interaction_date: string;
  interaction_count: number;
}

export interface InteractionAnalytics {
  totalCalls: number;
  totalWebsiteClicks: number;
  callTrends: { date: string; count: number }[];
  websiteTrends: { date: string; count: number }[];
  combinedTrends: { date: string; calls: number; website: number }[];
  thisMonthCalls: number;
  thisMonthWebsite: number;
  lastMonthCalls: number;
  lastMonthWebsite: number;
  callGrowthRate: number;
  websiteGrowthRate: number;
}

export function useInteractionAnalytics(facilityId: string | undefined, dateRange?: DateRange) {
  return useQuery({
    queryKey: ["interaction-analytics", facilityId, dateRange?.from?.toISOString(), dateRange?.to?.toISOString()],
    queryFn: async (): Promise<InteractionAnalytics> => {
      if (!facilityId) {
        return getEmptyInteractionAnalytics();
      }

      const { data, error } = await supabase
        .from("facility_interactions")
        .select("*")
        .eq("facility_id", facilityId)
        .order("interaction_date", { ascending: true });

      if (error) throw error;

      let interactions = (data || []) as InteractionData[];

      // Filter by date range if provided
      if (dateRange?.from || dateRange?.to) {
        interactions = interactions.filter(item => {
          const itemDate = new Date(item.interaction_date);
          if (dateRange.from && dateRange.to) {
            return isWithinInterval(itemDate, {
              start: startOfDay(dateRange.from),
              end: endOfDay(dateRange.to),
            });
          } else if (dateRange.from) {
            return itemDate >= startOfDay(dateRange.from);
          } else if (dateRange.to) {
            return itemDate <= endOfDay(dateRange.to);
          }
          return true;
        });
      }

      return calculateInteractionAnalytics(interactions);
    },
    enabled: !!facilityId,
    staleTime: 1000 * 60 * 5,
  });
}

function getEmptyInteractionAnalytics(): InteractionAnalytics {
  return {
    totalCalls: 0,
    totalWebsiteClicks: 0,
    callTrends: [],
    websiteTrends: [],
    combinedTrends: [],
    thisMonthCalls: 0,
    thisMonthWebsite: 0,
    lastMonthCalls: 0,
    lastMonthWebsite: 0,
    callGrowthRate: 0,
    websiteGrowthRate: 0,
  };
}

function calculateInteractionAnalytics(interactions: InteractionData[]): InteractionAnalytics {
  const now = new Date();
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

  const calls = interactions.filter(i => i.interaction_type === "call");
  const websites = interactions.filter(i => i.interaction_type === "website");

  const totalCalls = calls.reduce((sum, i) => sum + i.interaction_count, 0);
  const totalWebsiteClicks = websites.reduce((sum, i) => sum + i.interaction_count, 0);

  // This month stats
  const thisMonthCalls = calls
    .filter(i => new Date(i.interaction_date) >= thisMonthStart)
    .reduce((sum, i) => sum + i.interaction_count, 0);
  const thisMonthWebsite = websites
    .filter(i => new Date(i.interaction_date) >= thisMonthStart)
    .reduce((sum, i) => sum + i.interaction_count, 0);

  // Last month stats
  const lastMonthCalls = calls
    .filter(i => {
      const d = new Date(i.interaction_date);
      return d >= lastMonthStart && d <= lastMonthEnd;
    })
    .reduce((sum, i) => sum + i.interaction_count, 0);
  const lastMonthWebsite = websites
    .filter(i => {
      const d = new Date(i.interaction_date);
      return d >= lastMonthStart && d <= lastMonthEnd;
    })
    .reduce((sum, i) => sum + i.interaction_count, 0);

  // Growth rates
  const callGrowthRate = lastMonthCalls > 0 
    ? Math.round(((thisMonthCalls - lastMonthCalls) / lastMonthCalls) * 100)
    : thisMonthCalls > 0 ? 100 : 0;
  const websiteGrowthRate = lastMonthWebsite > 0 
    ? Math.round(((thisMonthWebsite - lastMonthWebsite) / lastMonthWebsite) * 100)
    : thisMonthWebsite > 0 ? 100 : 0;

  // Last 30 days trends
  const last30Days: { date: string; calls: number; website: number }[] = [];
  for (let i = 29; i >= 0; i--) {
    const date = subDays(now, i);
    const dateStr = format(date, "yyyy-MM-dd");
    const displayDate = format(date, "MMM d");
    
    const dayCall = calls.find(c => c.interaction_date === dateStr);
    const dayWebsite = websites.find(w => w.interaction_date === dateStr);
    
    last30Days.push({
      date: displayDate,
      calls: dayCall?.interaction_count || 0,
      website: dayWebsite?.interaction_count || 0,
    });
  }

  return {
    totalCalls,
    totalWebsiteClicks,
    callTrends: last30Days.map(d => ({ date: d.date, count: d.calls })),
    websiteTrends: last30Days.map(d => ({ date: d.date, count: d.website })),
    combinedTrends: last30Days,
    thisMonthCalls,
    thisMonthWebsite,
    lastMonthCalls,
    lastMonthWebsite,
    callGrowthRate,
    websiteGrowthRate,
  };
}
