import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type Tier = "pro" | "free";

export interface PerformanceCounts {
  impressions: number;
  profile_views: number;
  phone_clicks?: number;
  website_clicks?: number;
  inquiries: number;
  widget_loads?: number;
}

export interface PerformanceFacility {
  id: string;
  name: string;
  slug: string;
  city: string | null;
  state: string | null;
}

export interface PerformanceSummary {
  tier: Tier;
  facility: PerformanceFacility;
  last_refresh_at?: string | null;
  last_7_days: PerformanceCounts;
  last_30_days: PerformanceCounts;
  prev_7_days?: PerformanceCounts;
  series?: Array<{
    date: string;
    impressions: number;
    profile_views: number;
    phone_clicks: number;
    website_clicks: number;
    inquiries: number;
    widget_loads: number;
  }>;
  traffic?: Array<{ source: string; count: number }>;
  market?: {
    scope: string;
    state: string;
    rank: number;
    total: number;
    percentile: number;
    metric: string;
  } | null;
}

/**
 * Performance summary for a single facility. Backed by the
 * facility_metrics_daily rollup table — never queries the raw
 * event tables (provider_events / leads / badge_impressions /
 * analytics_events) live on every render. Pro facilities get the
 * full payload; Free facilities receive only headline counts so
 * the teaser can render without leaking the full series shape.
 */
export function useFacilityPerformance(facilityId: string | undefined) {
  return useQuery({
    queryKey: ["facility-performance", facilityId],
    enabled: !!facilityId,
    queryFn: async (): Promise<PerformanceSummary | null> => {
      const { data, error } = await supabase.rpc(
        "get_facility_performance_summary",
        { p_facility_id: facilityId! },
      );
      if (error) throw error;
      return (data as PerformanceSummary) ?? null;
    },
    // The RPC does a just-in-time refresh when the rollup is older
    // than 15 minutes. Mirror that on the client so the dashboard
    // doesn't keep re-fetching while a provider stares at it.
    staleTime: 1000 * 60 * 5,
    refetchOnWindowFocus: true,
    retry: 2,
  });
}
