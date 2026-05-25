import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { startOfDay, endOfDay, subDays } from "date-fns";
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

interface RpcSummary {
  totals: { impressions: number; profileViews: number; clickToCalls: number; websiteClicks: number };
  period: { impressions: number; profileViews: number; clickToCalls: number; websiteClicks: number };
  previous: { impressions: number; profileViews: number; clickToCalls: number; websiteClicks: number };
  facilityBreakdown: Array<{
    facilityId: string;
    facilityName: string;
    impressions: number;
    profileViews: number;
    listingViews: number;
    clickToCalls: number;
    websiteClicks: number;
  }>;
  dailyTrends: Array<{
    date: string;
    impressions: number;
    profileViews: number;
    listingViews: number;
    clickToCalls: number;
    websiteClicks: number;
  }>;
  bucketSizeDays: number;
  rangeFrom: string;
  rangeTo: string;
}

export function useCentralizedEngagementAnalytics(dateRange?: DateRange, filterFacilityId?: string) {
  const queryClient = useQueryClient();
  const { facilities, isLoading: facilitiesLoading } = useProviderFacilities();

  const approvedFacilities = facilities.filter(f => f.status === "approved");
  const facilityIds = filterFacilityId
    ? approvedFacilities.filter(f => f.id === filterFacilityId).map(f => f.id)
    : approvedFacilities.map((f) => f.id);
  const facilityIdsKey = facilityIds.join(",");

  // Realtime invalidation on event inserts/updates for any of these
  // facilities. Server-side aggregation still benefits from cache
  // invalidation so we re-call the RPC when new events land.
  //
  // Per-mount random suffix on every channel name. The previous
  // `${facilityId}-${index}` was unstable: if the facilityIds array
  // re-ordered between renders (sort change, add/remove), the index
  // shifted, the channel name shifted, and the old channels leaked
  // while the new ones tried to subscribe to an already-cached name —
  // same crash mode we keep fixing across the codebase
  // ("cannot add postgres_changes callbacks after subscribe()"). A
  // single mount-scoped suffix shared by all the per-facility
  // channels also ensures cleanup matches what was opened.
  useEffect(() => {
    if (facilityIds.length === 0) return;
    const mountSuffix = Math.random().toString(36).slice(2, 10);
    const eventChannels = facilityIds.map((facilityId) =>
      supabase
        .channel(`centralized-engagement-events-${facilityId}-${mountSuffix}`)
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
          },
        )
        .subscribe(),
    );
    return () => {
      eventChannels.forEach((channel) => {
        try {
          supabase.removeChannel(channel);
        } catch {
          /* channel may already be torn down server-side */
        }
      });
    };
  }, [facilityIdsKey, queryClient]); // eslint-disable-line react-hooks/exhaustive-deps

  return useQuery({
    queryKey: [
      "centralized-engagement-analytics",
      facilityIdsKey,
      dateRange?.from?.toISOString(),
      dateRange?.to?.toISOString(),
      filterFacilityId || "all",
    ],
    queryFn: async (): Promise<CentralizedEngagementAnalytics> => {
      if (facilityIds.length === 0) {
        return getEmptyAnalytics();
      }

      const now = new Date();
      const hasAllTimeSelection = Boolean(dateRange && !dateRange.from && !dateRange.to);
      const fallbackStart = subDays(now, 30);
      const rangeStart = dateRange?.from ?? (hasAllTimeSelection ? subDays(now, 365) : fallbackStart);
      const rangeEnd = dateRange?.to ?? now;
      const fromIso = startOfDay(rangeStart).toISOString();
      const toIso = endOfDay(rangeEnd).toISOString();

      // Server-side aggregation. The RPC checks facility ownership before
      // summing so a hostile client cannot pass other providers' facility
      // IDs into p_facility_ids and learn their analytics.
      const { data, error } = await supabase.rpc("get_provider_engagement_summary", {
        p_facility_ids: facilityIds,
        p_from: fromIso,
        p_to: toIso,
      });
      if (error) throw error;
      const summary = parseRpcSummary(data);
      if (!summary) return getEmptyAnalytics();

      const totalImpressions = summary.totals.impressions;
      const totalProfileViews = summary.totals.profileViews;
      const totalClickToCalls = summary.totals.clickToCalls;
      const totalWebsiteClicks = summary.totals.websiteClicks;
      const totalListingViews = totalImpressions + totalProfileViews;

      const periodImpressions = summary.period.impressions;
      const periodProfileViews = summary.period.profileViews;
      const periodClickToCalls = summary.period.clickToCalls;
      const periodWebsiteClicks = summary.period.websiteClicks;
      const periodListingViews = periodImpressions + periodProfileViews;

      const prevImpressions = summary.previous.impressions;
      const prevProfileViews = summary.previous.profileViews;
      const prevClickToCalls = summary.previous.clickToCalls;
      const prevWebsiteClicks = summary.previous.websiteClicks;
      const prevListingViews = prevImpressions + prevProfileViews;

      const impressionGrowth = hasAllTimeSelection ? 0 : calculateGrowth(periodImpressions, prevImpressions);
      const profileViewGrowth = hasAllTimeSelection ? 0 : calculateGrowth(periodProfileViews, prevProfileViews);
      const listingViewGrowth = hasAllTimeSelection ? 0 : calculateGrowth(periodListingViews, prevListingViews);
      const clickToCallGrowth = hasAllTimeSelection ? 0 : calculateGrowth(periodClickToCalls, prevClickToCalls);
      const websiteClickGrowth = hasAllTimeSelection ? 0 : calculateGrowth(periodWebsiteClicks, prevWebsiteClicks);

      const impressionToViewRate = periodImpressions > 0 ? Math.round((periodProfileViews / periodImpressions) * 100) : 0;
      // Denominator is profile views (not impressions+views) so this matches
      // the on-screen funnel step impressions → profileViews → calls and the
      // value CentralizedEngagementAnalytics renders. Keeps CSV == screen.
      const viewToCallRate = periodProfileViews > 0 ? Math.round((periodClickToCalls / periodProfileViews) * 100) : 0;
      const viewToWebsiteRate = periodProfileViews > 0 ? Math.round((periodWebsiteClicks / periodProfileViews) * 100) : 0;

      const facilityBreakdown: FacilityEngagementBreakdown[] = (summary.facilityBreakdown ?? [])
        .filter((f) => f.listingViews > 0 || f.clickToCalls > 0 || f.websiteClicks > 0)
        .map((f) => ({
          facilityId: f.facilityId,
          facilityName: f.facilityName,
          impressions: f.impressions,
          profileViews: f.profileViews,
          listingViews: f.listingViews,
          clickToCalls: f.clickToCalls,
          websiteClicks: f.websiteClicks,
        }));

      const dailyTrends = (summary.dailyTrends ?? []).map((d) => ({
        date: d.date,
        impressions: d.impressions,
        profileViews: d.profileViews,
        listingViews: d.listingViews,
        clickToCalls: d.clickToCalls,
        websiteClicks: d.websiteClicks,
      }));

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

function calculateGrowth(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
}

// Defensive parse of get_provider_engagement_summary's JSON return value.
// Returns null if any required block is missing so the caller can fall back
// to the empty-analytics shape instead of NaN-ing every metric downstream.
function parseRpcSummary(raw: unknown): RpcSummary | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;
  const safeBlock = (b: unknown): RpcSummary["totals"] | null => {
    if (!b || typeof b !== "object") return null;
    const block = b as Record<string, unknown>;
    return {
      impressions: Number(block.impressions ?? 0) || 0,
      profileViews: Number(block.profileViews ?? 0) || 0,
      clickToCalls: Number(block.clickToCalls ?? 0) || 0,
      websiteClicks: Number(block.websiteClicks ?? 0) || 0,
    };
  };
  const totals = safeBlock(obj.totals);
  const period = safeBlock(obj.period);
  const previous = safeBlock(obj.previous);
  if (!totals || !period || !previous) {
    console.error("[useCentralizedEngagementAnalytics] RPC returned an unexpected shape", raw);
    return null;
  }
  return {
    totals,
    period,
    previous,
    facilityBreakdown: Array.isArray(obj.facilityBreakdown) ? (obj.facilityBreakdown as RpcSummary["facilityBreakdown"]) : [],
    dailyTrends: Array.isArray(obj.dailyTrends) ? (obj.dailyTrends as RpcSummary["dailyTrends"]) : [],
    bucketSizeDays: Number(obj.bucketSizeDays ?? 1) || 1,
    rangeFrom: String(obj.rangeFrom ?? ""),
    rangeTo: String(obj.rangeTo ?? ""),
  };
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
