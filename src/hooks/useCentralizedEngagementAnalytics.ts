import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { startOfDay, endOfDay, subDays, format, isWithinInterval } from "date-fns";
import { useProviderFacilities } from "./useProviderFacilities";
import { type DateRange } from "./useLeadAnalytics";

export interface FacilityEngagementBreakdown {
  facilityId: string;
  facilityName: string;
  listingViews: number; // Combined from facility_views
  clickToCalls: number;
  websiteClicks: number;
}

export interface CentralizedEngagementAnalytics {
  // Per-facility breakdown
  facilityBreakdown: FacilityEngagementBreakdown[];
  
  // Totals (all-time from facility_views)
  totalListingViews: number;
  totalClickToCalls: number;
  totalWebsiteClicks: number;
  
  // Current period
  periodListingViews: number;
  periodClickToCalls: number;
  periodWebsiteClicks: number;
  
  // Growth rates
  listingViewGrowth: number;
  clickToCallGrowth: number;
  websiteClickGrowth: number;
  
  // Daily trends
  dailyTrends: {
    date: string;
    listingViews: number;
    clickToCalls: number;
    websiteClicks: number;
  }[];
  
  // Conversion rates
  viewToCallRate: number;
  viewToWebsiteRate: number;
  
  // Facility IDs
  facilityIds: string[];
  
  // Legacy fields for backward compatibility
  totalImpressions: number;
  totalProfileViews: number;
  periodImpressions: number;
  periodProfileViews: number;
  impressionGrowth: number;
  profileViewGrowth: number;
  impressionToViewRate: number;
}

interface ProviderEvent {
  id: string;
  facility_id: string;
  event_type: string;
  session_id: string;
  page_context: string;
  created_at: string;
}

interface FacilityView {
  facility_id: string;
  view_date: string;
  view_count: number;
}

export function useCentralizedEngagementAnalytics(dateRange?: DateRange) {
  const queryClient = useQueryClient();
  const { facilities, isLoading: facilitiesLoading } = useProviderFacilities();
  
  const facilityIds = facilities.map(f => f.id);

  // Set up real-time subscriptions for both tables
  useEffect(() => {
    if (facilityIds.length === 0) return;

    const eventChannels = facilityIds.map((facilityId, index) => 
      supabase
        .channel(`centralized-engagement-events-${facilityId}-${index}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "provider_events",
            filter: `facility_id=eq.${facilityId}`,
          },
          () => {
            queryClient.invalidateQueries({ queryKey: ["centralized-engagement-analytics"] });
          }
        )
        .subscribe()
    );

    const viewChannels = facilityIds.map((facilityId, index) => 
      supabase
        .channel(`centralized-engagement-views-${facilityId}-${index}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "facility_views",
            filter: `facility_id=eq.${facilityId}`,
          },
          () => {
            queryClient.invalidateQueries({ queryKey: ["centralized-engagement-analytics"] });
          }
        )
        .subscribe()
    );

    return () => {
      eventChannels.forEach(channel => supabase.removeChannel(channel));
      viewChannels.forEach(channel => supabase.removeChannel(channel));
    };
  }, [facilityIds.join(","), queryClient]);

  return useQuery({
    queryKey: ["centralized-engagement-analytics", facilityIds.join(","), dateRange?.from?.toISOString(), dateRange?.to?.toISOString()],
    queryFn: async (): Promise<CentralizedEngagementAnalytics> => {
      if (facilityIds.length === 0) {
        return getEmptyAnalytics();
      }

      // Fetch from facility_views (authoritative source for listing views)
      const { data: viewsData, error: viewsError } = await supabase
        .from("facility_views")
        .select("*")
        .in("facility_id", facilityIds);

      if (viewsError) {
        console.error("[useCentralizedEngagementAnalytics] Views Error:", viewsError);
        throw viewsError;
      }

      // Fetch provider_events for click-to-call and website clicks
      const { data: eventsData, error: eventsError } = await supabase
        .from("provider_events")
        .select("*")
        .in("facility_id", facilityIds)
        .in("event_type", ["click_to_call", "website_click"])
        .order("created_at", { ascending: true });

      if (eventsError) {
        console.error("[useCentralizedEngagementAnalytics] Events Error:", eventsError);
        throw eventsError;
      }

      const views = (viewsData || []) as FacilityView[];
      const events = (eventsData || []) as ProviderEvent[];
      const facilityMap = new Map(facilities.map(f => [f.id, f.name]));

      // Determine date range
      const now = new Date();
      const rangeStart = dateRange?.from || subDays(now, 30);
      const rangeEnd = dateRange?.to || now;
      
      // Calculate previous period for comparison
      const periodLength = Math.ceil((rangeEnd.getTime() - rangeStart.getTime()) / (1000 * 60 * 60 * 24));
      const prevPeriodStart = subDays(rangeStart, periodLength);
      const prevPeriodEnd = subDays(rangeStart, 1);

      // Filter views by current period
      const currentPeriodViews = views.filter(v => {
        const viewDate = new Date(v.view_date);
        return isWithinInterval(viewDate, { start: startOfDay(rangeStart), end: endOfDay(rangeEnd) });
      });

      // Filter views by previous period
      const prevPeriodViews = views.filter(v => {
        const viewDate = new Date(v.view_date);
        return isWithinInterval(viewDate, { start: startOfDay(prevPeriodStart), end: endOfDay(prevPeriodEnd) });
      });

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

      // Calculate all-time totals
      const totalListingViews = views.reduce((sum, v) => sum + (v.view_count || 0), 0);
      const totalClickToCalls = countByType(events, "click_to_call");
      const totalWebsiteClicks = countByType(events, "website_click");

      // Calculate period totals
      const periodListingViews = currentPeriodViews.reduce((sum, v) => sum + (v.view_count || 0), 0);
      const periodClickToCalls = countByType(currentPeriodEvents, "click_to_call");
      const periodWebsiteClicks = countByType(currentPeriodEvents, "website_click");

      // Calculate previous period totals
      const prevListingViews = prevPeriodViews.reduce((sum, v) => sum + (v.view_count || 0), 0);
      const prevClickToCalls = countByType(prevPeriodEvents, "click_to_call");
      const prevWebsiteClicks = countByType(prevPeriodEvents, "website_click");

      // Calculate growth rates
      const listingViewGrowth = calculateGrowth(periodListingViews, prevListingViews);
      const clickToCallGrowth = calculateGrowth(periodClickToCalls, prevClickToCalls);
      const websiteClickGrowth = calculateGrowth(periodWebsiteClicks, prevWebsiteClicks);

      // Per-facility breakdown
      const facilityBreakdown: FacilityEngagementBreakdown[] = facilityIds.map(facilityId => {
        const facilityViews = views.filter(v => v.facility_id === facilityId);
        const facilityEvents = events.filter(e => e.facility_id === facilityId);
        return {
          facilityId,
          facilityName: facilityMap.get(facilityId) || "Unknown",
          listingViews: facilityViews.reduce((sum, v) => sum + (v.view_count || 0), 0),
          clickToCalls: countByType(facilityEvents, "click_to_call"),
          websiteClicks: countByType(facilityEvents, "website_click"),
        };
      }).filter(fb => fb.listingViews > 0 || fb.clickToCalls > 0 || fb.websiteClicks > 0);

      // Build daily trends from facility_views
      const dailyTrends = buildDailyTrends(currentPeriodViews, currentPeriodEvents, rangeStart, rangeEnd);

      // Calculate conversion rates
      const viewToCallRate = periodListingViews > 0 
        ? Math.round((periodClickToCalls / periodListingViews) * 100) 
        : 0;
      const viewToWebsiteRate = periodListingViews > 0 
        ? Math.round((periodWebsiteClicks / periodListingViews) * 100) 
        : 0;

      return {
        facilityBreakdown,
        totalListingViews,
        totalClickToCalls,
        totalWebsiteClicks,
        periodListingViews,
        periodClickToCalls,
        periodWebsiteClicks,
        listingViewGrowth,
        clickToCallGrowth,
        websiteClickGrowth,
        dailyTrends,
        viewToCallRate,
        viewToWebsiteRate,
        facilityIds,
        // Legacy fields for backward compatibility
        totalImpressions: totalListingViews,
        totalProfileViews: 0,
        periodImpressions: periodListingViews,
        periodProfileViews: 0,
        impressionGrowth: listingViewGrowth,
        profileViewGrowth: 0,
        impressionToViewRate: 0,
      };
    },
    enabled: !facilitiesLoading && facilityIds.length > 0,
    staleTime: 1000 * 60 * 2,
    refetchOnWindowFocus: true,
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
  views: FacilityView[],
  events: ProviderEvent[], 
  rangeStart: Date, 
  rangeEnd: Date
): CentralizedEngagementAnalytics["dailyTrends"] {
  const trends: CentralizedEngagementAnalytics["dailyTrends"] = [];
  const dayCount = Math.ceil((rangeEnd.getTime() - rangeStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  
  const daysToShow = Math.min(dayCount, 30);

  for (let i = 0; i < daysToShow; i++) {
    const date = subDays(rangeEnd, daysToShow - 1 - i);
    const dateStr = format(date, "yyyy-MM-dd");
    const displayDate = format(date, "MMM d");

    const dayViews = views.filter(v => v.view_date === dateStr);
    const dayEvents = events.filter(e => 
      format(new Date(e.created_at), "yyyy-MM-dd") === dateStr
    );

    trends.push({
      date: displayDate,
      listingViews: dayViews.reduce((sum, v) => sum + (v.view_count || 0), 0),
      clickToCalls: countByType(dayEvents, "click_to_call"),
      websiteClicks: countByType(dayEvents, "website_click"),
    });
  }

  return trends;
}

function getEmptyAnalytics(): CentralizedEngagementAnalytics {
  return {
    facilityBreakdown: [],
    totalListingViews: 0,
    totalClickToCalls: 0,
    totalWebsiteClicks: 0,
    periodListingViews: 0,
    periodClickToCalls: 0,
    periodWebsiteClicks: 0,
    listingViewGrowth: 0,
    clickToCallGrowth: 0,
    websiteClickGrowth: 0,
    dailyTrends: [],
    viewToCallRate: 0,
    viewToWebsiteRate: 0,
    facilityIds: [],
    // Legacy fields
    totalImpressions: 0,
    totalProfileViews: 0,
    periodImpressions: 0,
    periodProfileViews: 0,
    impressionGrowth: 0,
    profileViewGrowth: 0,
    impressionToViewRate: 0,
  };
}
