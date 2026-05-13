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

  // Only include approved facilities — pending/rejected facilities never appear in
  // provider_events (the edge function rejects non-approved facility IDs), so
  // including them just bloats the .in() filter with IDs that will never match.
  const approvedFacilities = facilities.filter(f => f.status === "approved");
  const facilityIds = filterFacilityId 
    ? approvedFacilities.filter(f => f.id === filterFacilityId).map(f => f.id)
    : approvedFacilities.map((f) => f.id);

  // Stable string key derived from the array — avoids a complex expression in the dep array
  const facilityIdsKey = facilityIds.join(",");

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
  }, [facilityIdsKey, queryClient]); // eslint-disable-line react-hooks/exhaustive-deps -- facilityIds is derived from facilityIdsKey; including it would cause duplicate subscriptions

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
      // Paginate to avoid the default 1000-row limit
      let allEventsData: ProviderEvent[] = [];
      let page = 0;
      const PAGE_SIZE = 1000;
      while (true) {
        const from = page * PAGE_SIZE;
        const to = from + PAGE_SIZE - 1;
        const { data: pageData, error: pageError } = await supabase
          .from("provider_events")
          .select("id, facility_id, event_type, session_id, page_context, created_at")
          .in("facility_id", facilityIds)
          .order("created_at", { ascending: true })
          .range(from, to);

        if (pageError) throw pageError;
        if (!pageData || pageData.length === 0) break;
        allEventsData = allEventsData.concat(pageData as ProviderEvent[]);
        if (pageData.length < PAGE_SIZE) break;
        page++;
      }

      const allEvents = allEventsData;
      const facilityMap = new Map(approvedFacilities.map((f) => [f.id, f.name]));

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
    retry: 2,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10000),
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
  // Previously capped at 30 days regardless of selected range. For ranges
  // longer than 60 days, bucket weekly so the chart still fits ~12-15 bars.
  // For <= 60 days, render daily up to the actual day count.
  const useWeeklyBucket = dayCount > 60;
  const bucketSize = useWeeklyBucket ? 7 : 1;
  const bucketCount = Math.ceil(dayCount / bucketSize);

  for (let i = 0; i < bucketCount; i++) {
    const bucketEnd = subDays(endOfDay(rangeEnd), (bucketCount - 1 - i) * bucketSize);
    const bucketStart = subDays(bucketEnd, bucketSize - 1);
    const bucketStartStr = format(startOfDay(bucketStart), "yyyy-MM-dd");
    const bucketEndStr = format(endOfDay(bucketEnd), "yyyy-MM-dd");

    const inBucket = (e: ProviderEvent) => {
      const ds = format(parseISO(e.created_at), "yyyy-MM-dd");
      return ds >= bucketStartStr && ds <= bucketEndStr;
    };

    const dayViews = viewEvents.filter(inBucket);
    const dayClicks = clickEvents.filter(inBucket);

    trends.push({
      date: format(bucketEnd, useWeeklyBucket ? "MMM d" : "MMM d"),
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
