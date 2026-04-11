import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { startOfDay, endOfDay, subDays, format, parseISO } from "date-fns";
import { useProviderFacilities } from "./useProviderFacilities";
import { type DateRange } from "./useLeadAnalytics";

export interface FacilityEngagementBreakdown {
  facilityId: string;
  facilityName: string;
  impressions: number;
  profileViews: number;
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
    impressions: number;
    profileViews: number;
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

    return () => {
      eventChannels.forEach((channel) => supabase.removeChannel(channel));
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

      // Fetch ALL provider events (views + clicks) from the single source of truth
      const { data: allEventsData, error: eventsError } = await supabase
        .from("provider_events")
        .select("id, facility_id, event_type, session_id, page_context, created_at")
        .in("facility_id", facilityIds)
        .order("created_at", { ascending: true });

      if (eventsError) throw eventsError;

      const allEvents = (allEventsData || []) as ProviderEvent[];
      const facilityMap = new Map(facilities.map((f) => [f.id, f.name]));

      // Split events by type
      const viewEvents = allEvents.filter(e => e.event_type === "profile_view" || e.event_type === "listing_impression");
      const clickEvents = allEvents.filter(e => e.event_type === "click_to_call" || e.event_type === "website_click");
      const impressionEvents = allEvents.filter(e => e.event_type === "listing_impression");
      const profileViewEvents = allEvents.filter(e => e.event_type === "profile_view");

      const now = new Date();
      const hasAllTimeSelection = Boolean(dateRange && !dateRange.from && !dateRange.to);
      const allTimelineDates = allEvents
        .map((event) => parseISO(event.created_at))
        .filter((date) => !Number.isNaN(date.getTime()))
        .sort((a, b) => a.getTime() - b.getTime());

      const fallbackStart = subDays(now, 30);
      const rangeStart = dateRange?.from ?? (hasAllTimeSelection ? allTimelineDates[0] ?? fallbackStart : fallbackStart);
      const rangeEnd = dateRange?.to ?? (hasAllTimeSelection ? allTimelineDates[allTimelineDates.length - 1] ?? now : now);

      const rangeStartISO = startOfDay(rangeStart).toISOString();
      const rangeEndISO = endOfDay(rangeEnd).toISOString();

      const periodLength = Math.max(
        1,
        Math.ceil((endOfDay(rangeEnd).getTime() - startOfDay(rangeStart).getTime()) / DAY_IN_MS) + 1
      );
      const prevPeriodStart = subDays(startOfDay(rangeStart), periodLength);
      const prevPeriodEnd = subDays(startOfDay(rangeStart), 1);
      const prevStartISO = startOfDay(prevPeriodStart).toISOString();
      const prevEndISO = endOfDay(prevPeriodEnd).toISOString();

      const inRange = (e: ProviderEvent) => e.created_at >= rangeStartISO && e.created_at <= rangeEndISO;
      const inPrevRange = (e: ProviderEvent) => e.created_at >= prevStartISO && e.created_at <= prevEndISO;

      const currentViewEvents = viewEvents.filter(inRange);
      const prevViewEvents = viewEvents.filter(inPrevRange);
      const currentClickEvents = clickEvents.filter(inRange);
      const prevClickEvents = clickEvents.filter(inPrevRange);

      const totalListingViews = viewEvents.length;
      const totalClickToCalls = countByType(clickEvents, "click_to_call");
      const totalWebsiteClicks = countByType(clickEvents, "website_click");

      const periodListingViews = currentViewEvents.length;
      const periodClickToCalls = countByType(currentClickEvents, "click_to_call");
      const periodWebsiteClicks = countByType(currentClickEvents, "website_click");

      const prevListingViews = prevViewEvents.length;
      const prevClickToCalls = countByType(prevClickEvents, "click_to_call");
      const prevWebsiteClicks = countByType(prevClickEvents, "website_click");

      const listingViewGrowth = hasAllTimeSelection ? 0 : calculateGrowth(periodListingViews, prevListingViews);
      const clickToCallGrowth = hasAllTimeSelection ? 0 : calculateGrowth(periodClickToCalls, prevClickToCalls);
      const websiteClickGrowth = hasAllTimeSelection ? 0 : calculateGrowth(periodWebsiteClicks, prevWebsiteClicks);

      // Impressions & profile views
      const currentImpressions = impressionEvents.filter(inRange);
      const prevImpressions = impressionEvents.filter(inPrevRange);
      const currentProfileViews = profileViewEvents.filter(inRange);
      const prevProfileViewEvents = profileViewEvents.filter(inPrevRange);

      const totalImpressions = impressionEvents.length;
      const totalProfileViews = profileViewEvents.length;
      const periodImpressions = currentImpressions.length;
      const periodProfileViews = currentProfileViews.length;
      const impressionGrowth = hasAllTimeSelection ? 0 : calculateGrowth(periodImpressions, prevImpressions.length);
      const profileViewGrowth = hasAllTimeSelection ? 0 : calculateGrowth(periodProfileViews, prevProfileViewEvents.length);
      const impressionToViewRate = periodImpressions > 0 ? Math.round((periodProfileViews / periodImpressions) * 100) : 0;

      const facilityBreakdown: FacilityEngagementBreakdown[] = facilityIds
        .map((facilityId) => {
          const fEvents = allEvents.filter(e => e.facility_id === facilityId && inRange(e));

          return {
            facilityId,
            facilityName: facilityMap.get(facilityId) || "Unknown",
            impressions: fEvents.filter(e => e.event_type === "listing_impression").length,
            profileViews: fEvents.filter(e => e.event_type === "profile_view").length,
            listingViews: fEvents.filter(e => e.event_type === "profile_view" || e.event_type === "listing_impression").length,
            clickToCalls: fEvents.filter(e => e.event_type === "click_to_call").length,
            websiteClicks: fEvents.filter(e => e.event_type === "website_click").length,
          };
        })
        .filter((f) => f.listingViews > 0 || f.clickToCalls > 0 || f.websiteClicks > 0);

      const dailyTrends = buildDailyTrends(currentViewEvents, currentClickEvents, rangeStart, rangeEnd);

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
        totalImpressions,
        totalProfileViews,
        periodImpressions,
        periodProfileViews,
        impressionGrowth,
        profileViewGrowth,
        impressionToViewRate,
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
  viewEvents: ProviderEvent[],
  clickEvents: ProviderEvent[],
  rangeStart: Date,
  rangeEnd: Date
): CentralizedEngagementAnalytics["dailyTrends"] {
  const trends: CentralizedEngagementAnalytics["dailyTrends"] = [];
  const dayCount = Math.ceil((endOfDay(rangeEnd).getTime() - startOfDay(rangeStart).getTime()) / DAY_IN_MS) + 1;
  const daysToShow = Math.min(dayCount, 30);

  for (let i = 0; i < daysToShow; i++) {
    const date = subDays(endOfDay(rangeEnd), daysToShow - 1 - i);
    const dateStr = format(date, "yyyy-MM-dd");

    const dayViews = viewEvents.filter((e) => format(parseISO(e.created_at), "yyyy-MM-dd") === dateStr);
    const dayClicks = clickEvents.filter((e) => format(parseISO(e.created_at), "yyyy-MM-dd") === dateStr);

    trends.push({
      date: format(date, "MMM d"),
      impressions: dayViews.filter(e => e.event_type === "listing_impression").length,
      profileViews: dayViews.filter(e => e.event_type === "profile_view").length,
      listingViews: dayViews.length,
      clickToCalls: countByType(dayClicks, "click_to_call"),
      websiteClicks: countByType(dayClicks, "website_click"),
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
