import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { startOfDay, endOfDay, subDays, format, parseISO } from "date-fns";
import { useProviderFacilities } from "./useProviderFacilities";
import { type DateRange } from "./useLeadAnalytics";

export interface FacilityEngagementBreakdown {
  facilityId: string;
  facilityName: string;
  listingViews: number;
  clickToCalls: number;
  websiteClicks: number;
}

export interface CentralizedEngagementAnalytics {
  facilityBreakdown: FacilityEngagementBreakdown[];
  totalListingViews: number;
  totalClickToCalls: number;
  totalWebsiteClicks: number;
  periodListingViews: number;
  periodClickToCalls: number;
  periodWebsiteClicks: number;
  listingViewGrowth: number;
  clickToCallGrowth: number;
  websiteClickGrowth: number;
  dailyTrends: {
    date: string;
    listingViews: number;
    clickToCalls: number;
    websiteClicks: number;
  }[];
  viewToCallRate: number;
  viewToWebsiteRate: number;
  facilityIds: string[];
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

// Legacy interface kept for reference; views now come from provider_events

const DAY_IN_MS = 1000 * 60 * 60 * 24;

export function useCentralizedEngagementAnalytics(dateRange?: DateRange, filterFacilityId?: string) {
  const queryClient = useQueryClient();
  const { facilities, isLoading: facilitiesLoading } = useProviderFacilities();

  const facilityIds = filterFacilityId 
    ? facilities.filter(f => f.id === filterFacilityId).map(f => f.id)
    : facilities.map((f) => f.id);

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
      eventChannels.forEach((channel) => supabase.removeChannel(channel));
      viewChannels.forEach((channel) => supabase.removeChannel(channel));
    };
  }, [facilityIds.join(","), queryClient]);

  return useQuery({
    queryKey: [
      "centralized-engagement-analytics",
      facilityIds.join(","),
      dateRange?.from?.toISOString(),
      dateRange?.to?.toISOString(),
      filterFacilityId || "all",
    ],
    queryFn: async (): Promise<CentralizedEngagementAnalytics> => {
      if (facilityIds.length === 0) {
        return getEmptyAnalytics();
      }

      const { data: viewsData, error: viewsError } = await supabase
        .from("facility_views")
        .select("facility_id, view_date, view_count")
        .in("facility_id", facilityIds);

      if (viewsError) throw viewsError;

      const { data: eventsData, error: eventsError } = await supabase
        .from("provider_events")
        .select("id, facility_id, event_type, session_id, page_context, created_at")
        .in("facility_id", facilityIds)
        .in("event_type", ["click_to_call", "website_click"])
        .order("created_at", { ascending: true });

      if (eventsError) throw eventsError;

      const views = (viewsData || []) as FacilityView[];
      const events = (eventsData || []) as ProviderEvent[];
      const facilityMap = new Map(facilities.map((f) => [f.id, f.name]));

      const now = new Date();
      const hasAllTimeSelection = Boolean(dateRange && !dateRange.from && !dateRange.to);
      const allTimelineDates = [
        ...views.map((view) => new Date(`${view.view_date}T00:00:00`)),
        ...events.map((event) => parseISO(event.created_at)),
      ]
        .filter((date) => !Number.isNaN(date.getTime()))
        .sort((a, b) => a.getTime() - b.getTime());

      const fallbackStart = subDays(now, 30);
      const rangeStart = dateRange?.from ?? (hasAllTimeSelection ? allTimelineDates[0] ?? fallbackStart : fallbackStart);
      const rangeEnd = dateRange?.to ?? (hasAllTimeSelection ? allTimelineDates[allTimelineDates.length - 1] ?? now : now);

      const rangeStartStr = format(startOfDay(rangeStart), "yyyy-MM-dd");
      const rangeEndStr = format(endOfDay(rangeEnd), "yyyy-MM-dd");

      const periodLength = Math.max(
        1,
        Math.ceil((endOfDay(rangeEnd).getTime() - startOfDay(rangeStart).getTime()) / DAY_IN_MS) + 1
      );
      const prevPeriodStart = subDays(startOfDay(rangeStart), periodLength);
      const prevPeriodEnd = subDays(startOfDay(rangeStart), 1);
      const prevStartStr = format(startOfDay(prevPeriodStart), "yyyy-MM-dd");
      const prevEndStr = format(endOfDay(prevPeriodEnd), "yyyy-MM-dd");

      const currentPeriodViews = views.filter((view) => view.view_date >= rangeStartStr && view.view_date <= rangeEndStr);
      const prevPeriodViews = views.filter((view) => view.view_date >= prevStartStr && view.view_date <= prevEndStr);

      const currentPeriodEvents = events.filter((event) => {
        const eventDateStr = format(parseISO(event.created_at), "yyyy-MM-dd");
        return eventDateStr >= rangeStartStr && eventDateStr <= rangeEndStr;
      });

      const prevPeriodEvents = events.filter((event) => {
        const eventDateStr = format(parseISO(event.created_at), "yyyy-MM-dd");
        return eventDateStr >= prevStartStr && eventDateStr <= prevEndStr;
      });

      const totalListingViews = views.reduce((sum, view) => sum + (view.view_count || 0), 0);
      const totalClickToCalls = countByType(events, "click_to_call");
      const totalWebsiteClicks = countByType(events, "website_click");

      const periodListingViews = currentPeriodViews.reduce((sum, view) => sum + (view.view_count || 0), 0);
      const periodClickToCalls = countByType(currentPeriodEvents, "click_to_call");
      const periodWebsiteClicks = countByType(currentPeriodEvents, "website_click");

      const prevListingViews = prevPeriodViews.reduce((sum, view) => sum + (view.view_count || 0), 0);
      const prevClickToCalls = countByType(prevPeriodEvents, "click_to_call");
      const prevWebsiteClicks = countByType(prevPeriodEvents, "website_click");

      const listingViewGrowth = hasAllTimeSelection ? 0 : calculateGrowth(periodListingViews, prevListingViews);
      const clickToCallGrowth = hasAllTimeSelection ? 0 : calculateGrowth(periodClickToCalls, prevClickToCalls);
      const websiteClickGrowth = hasAllTimeSelection ? 0 : calculateGrowth(periodWebsiteClicks, prevWebsiteClicks);

      const facilityBreakdown: FacilityEngagementBreakdown[] = facilityIds
        .map((facilityId) => {
          const facilityViews = currentPeriodViews.filter((view) => view.facility_id === facilityId);
          const facilityEvents = currentPeriodEvents.filter((event) => event.facility_id === facilityId);

          return {
            facilityId,
            facilityName: facilityMap.get(facilityId) || "Unknown",
            listingViews: facilityViews.reduce((sum, view) => sum + (view.view_count || 0), 0),
            clickToCalls: countByType(facilityEvents, "click_to_call"),
            websiteClicks: countByType(facilityEvents, "website_click"),
          };
        })
        .filter((facility) => facility.listingViews > 0 || facility.clickToCalls > 0 || facility.websiteClicks > 0);

      const dailyTrends = buildDailyTrends(currentPeriodViews, currentPeriodEvents, rangeStart, rangeEnd);

      const viewToCallRate = periodListingViews > 0 ? Math.round((periodClickToCalls / periodListingViews) * 100) : 0;
      const viewToWebsiteRate = periodListingViews > 0 ? Math.round((periodWebsiteClicks / periodListingViews) * 100) : 0;

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
  return events.filter((event) => event.event_type === eventType).length;
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
  const dayCount = Math.ceil((endOfDay(rangeEnd).getTime() - startOfDay(rangeStart).getTime()) / DAY_IN_MS) + 1;
  const daysToShow = Math.min(dayCount, 30);

  for (let i = 0; i < daysToShow; i++) {
    const date = subDays(endOfDay(rangeEnd), daysToShow - 1 - i);
    const dateStr = format(date, "yyyy-MM-dd");

    const dayViews = views.filter((view) => view.view_date === dateStr);
    const dayEvents = events.filter((event) => format(parseISO(event.created_at), "yyyy-MM-dd") === dateStr);

    trends.push({
      date: format(date, "MMM d"),
      listingViews: dayViews.reduce((sum, view) => sum + (view.view_count || 0), 0),
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
    totalImpressions: 0,
    totalProfileViews: 0,
    periodImpressions: 0,
    periodProfileViews: 0,
    impressionGrowth: 0,
    profileViewGrowth: 0,
    impressionToViewRate: 0,
  };
}
