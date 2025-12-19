import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { startOfDay, endOfDay, subDays, format, isWithinInterval } from "date-fns";
import { type DateRange } from "./useLeadAnalytics";

export interface ProviderEventAnalytics {
  // Totals
  totalImpressions: number;
  totalProfileViews: number;
  totalClickToCalls: number;
  totalWebsiteClicks: number;
  
  // Current period vs previous period
  periodImpressions: number;
  periodProfileViews: number;
  periodClickToCalls: number;
  periodWebsiteClicks: number;
  
  // Growth rates (percentage change from previous period)
  impressionGrowth: number;
  profileViewGrowth: number;
  clickToCallGrowth: number;
  websiteClickGrowth: number;
  
  // Daily trends for charts
  dailyTrends: {
    date: string;
    impressions: number;
    profileViews: number;
    clickToCalls: number;
    websiteClicks: number;
  }[];
  
  // Conversion rates
  impressionToViewRate: number; // % of impressions that led to profile views
  viewToCallRate: number; // % of profile views that led to calls
  viewToWebsiteRate: number; // % of profile views that led to website clicks
}

interface ProviderEvent {
  id: string;
  facility_id: string;
  event_type: string;
  session_id: string;
  page_context: string;
  created_at: string;
}

export function useProviderEventAnalytics(facilityId: string | undefined, dateRange?: DateRange) {
  return useQuery({
    queryKey: ["provider-event-analytics", facilityId, dateRange?.from?.toISOString(), dateRange?.to?.toISOString()],
    queryFn: async (): Promise<ProviderEventAnalytics> => {
      if (!facilityId) {
        return getEmptyAnalytics();
      }

      // Fetch all events for this facility
      const { data, error } = await supabase
        .from("provider_events")
        .select("*")
        .eq("facility_id", facilityId)
        .order("created_at", { ascending: true });

      if (error) {
        console.error("[useProviderEventAnalytics] Error fetching events:", error);
        throw error;
      }

      const events = (data || []) as ProviderEvent[];
      
      // Determine date range
      const now = new Date();
      const rangeStart = dateRange?.from || subDays(now, 30);
      const rangeEnd = dateRange?.to || now;
      
      // Calculate previous period for comparison
      const periodLength = Math.ceil((rangeEnd.getTime() - rangeStart.getTime()) / (1000 * 60 * 60 * 24));
      const prevPeriodStart = subDays(rangeStart, periodLength);
      const prevPeriodEnd = subDays(rangeStart, 1);

      // Filter events by current period
      const currentPeriodEvents = events.filter(e => {
        const eventDate = new Date(e.created_at);
        return isWithinInterval(eventDate, { start: startOfDay(rangeStart), end: endOfDay(rangeEnd) });
      });

      // Filter events by previous period
      const prevPeriodEvents = events.filter(e => {
        const eventDate = new Date(e.created_at);
        return isWithinInterval(eventDate, { start: startOfDay(prevPeriodStart), end: endOfDay(prevPeriodEnd) });
      });

      // Calculate totals for current period
      const periodImpressions = countByType(currentPeriodEvents, "listing_impression");
      const periodProfileViews = countByType(currentPeriodEvents, "profile_view");
      const periodClickToCalls = countByType(currentPeriodEvents, "click_to_call");
      const periodWebsiteClicks = countByType(currentPeriodEvents, "website_click");

      // Calculate totals for previous period
      const prevImpressions = countByType(prevPeriodEvents, "listing_impression");
      const prevProfileViews = countByType(prevPeriodEvents, "profile_view");
      const prevClickToCalls = countByType(prevPeriodEvents, "click_to_call");
      const prevWebsiteClicks = countByType(prevPeriodEvents, "website_click");

      // Calculate growth rates
      const impressionGrowth = calculateGrowth(periodImpressions, prevImpressions);
      const profileViewGrowth = calculateGrowth(periodProfileViews, prevProfileViews);
      const clickToCallGrowth = calculateGrowth(periodClickToCalls, prevClickToCalls);
      const websiteClickGrowth = calculateGrowth(periodWebsiteClicks, prevWebsiteClicks);

      // Calculate all-time totals
      const totalImpressions = countByType(events, "listing_impression");
      const totalProfileViews = countByType(events, "profile_view");
      const totalClickToCalls = countByType(events, "click_to_call");
      const totalWebsiteClicks = countByType(events, "website_click");

      // Build daily trends
      const dailyTrends = buildDailyTrends(currentPeriodEvents, rangeStart, rangeEnd);

      // Calculate conversion rates
      const impressionToViewRate = periodImpressions > 0 
        ? Math.round((periodProfileViews / periodImpressions) * 100) 
        : 0;
      const viewToCallRate = periodProfileViews > 0 
        ? Math.round((periodClickToCalls / periodProfileViews) * 100) 
        : 0;
      const viewToWebsiteRate = periodProfileViews > 0 
        ? Math.round((periodWebsiteClicks / periodProfileViews) * 100) 
        : 0;

      return {
        totalImpressions,
        totalProfileViews,
        totalClickToCalls,
        totalWebsiteClicks,
        periodImpressions,
        periodProfileViews,
        periodClickToCalls,
        periodWebsiteClicks,
        impressionGrowth,
        profileViewGrowth,
        clickToCallGrowth,
        websiteClickGrowth,
        dailyTrends,
        impressionToViewRate,
        viewToCallRate,
        viewToWebsiteRate,
      };
    },
    enabled: !!facilityId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

function countByType(events: ProviderEvent[], eventType: string): number {
  return events.filter(e => e.event_type === eventType).length;
}

function calculateGrowth(current: number, previous: number): number {
  if (previous === 0) {
    return current > 0 ? 100 : 0;
  }
  return Math.round(((current - previous) / previous) * 100);
}

function buildDailyTrends(
  events: ProviderEvent[], 
  rangeStart: Date, 
  rangeEnd: Date
): ProviderEventAnalytics["dailyTrends"] {
  const trends: ProviderEventAnalytics["dailyTrends"] = [];
  const dayCount = Math.ceil((rangeEnd.getTime() - rangeStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  
  // Limit to last 30 days for chart readability
  const daysToShow = Math.min(dayCount, 30);
  const startDate = dayCount > 30 ? subDays(rangeEnd, 29) : rangeStart;

  for (let i = 0; i < daysToShow; i++) {
    const date = subDays(rangeEnd, daysToShow - 1 - i);
    const dateStr = format(date, "yyyy-MM-dd");
    const displayDate = format(date, "MMM d");

    const dayEvents = events.filter(e => 
      format(new Date(e.created_at), "yyyy-MM-dd") === dateStr
    );

    trends.push({
      date: displayDate,
      impressions: countByType(dayEvents, "listing_impression"),
      profileViews: countByType(dayEvents, "profile_view"),
      clickToCalls: countByType(dayEvents, "click_to_call"),
      websiteClicks: countByType(dayEvents, "website_click"),
    });
  }

  return trends;
}

function getEmptyAnalytics(): ProviderEventAnalytics {
  return {
    totalImpressions: 0,
    totalProfileViews: 0,
    totalClickToCalls: 0,
    totalWebsiteClicks: 0,
    periodImpressions: 0,
    periodProfileViews: 0,
    periodClickToCalls: 0,
    periodWebsiteClicks: 0,
    impressionGrowth: 0,
    profileViewGrowth: 0,
    clickToCallGrowth: 0,
    websiteClickGrowth: 0,
    dailyTrends: [],
    impressionToViewRate: 0,
    viewToCallRate: 0,
    viewToWebsiteRate: 0,
  };
}
