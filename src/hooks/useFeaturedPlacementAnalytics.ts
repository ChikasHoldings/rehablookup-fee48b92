import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface FeaturedPlacementMetricsRow {
  placement_type: string;
  placement_value: string;
  impressions_30d: number;
  phone_clicks_30d: number;
  /** Click-through rate as a percentage, e.g. 0.62 = 0.62%. */
  ctr_pct: number;
}

/**
 * Aggregates impressions + phone clicks for a facility's active
 * featured_placements over the last 30 days. Feeds the
 * /provider/marketing/featured manage table (PR-3 consumer) and the
 * Featured-rail performance widgets.
 *
 * Uses a single RPC-style aggregation in the client because the rows
 * are bounded (a single facility has <50 active placements). For
 * heavier loads, move this into an SQL view or RPC.
 */
export function useFeaturedPlacementAnalytics(facilityId: string | null | undefined) {
  return useQuery({
    queryKey: ["featured-placement-analytics", facilityId],
    queryFn: async (): Promise<FeaturedPlacementMetricsRow[]> => {
      if (!facilityId) return [];

      // Pull active placements + parallel impression/click aggregates.
      // Fan-out is bounded; per-bucket fetches keep the query payload
      // small without needing a dedicated RPC.
      const { data: placements, error: placementsErr } = await supabase
        .from("featured_placements")
        .select("placement_type, placement_value")
        .eq("facility_id", facilityId)
        .eq("active", true);
      if (placementsErr) {
        console.error("[useFeaturedPlacementAnalytics] placements fetch failed", placementsErr);
        return [];
      }
      if (!placements || placements.length === 0) return [];

      const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

      const rows = await Promise.all(
        placements.map(async (p) => {
          const [{ count: impressions }, { count: clicks }] = await Promise.all([
            supabase
              .from("featured_impressions")
              .select("*", { count: "exact", head: true })
              .eq("facility_id", facilityId)
              .eq("placement_type", p.placement_type)
              .eq("placement_value", p.placement_value)
              .gte("occurred_at", since),
            supabase
              .from("featured_phone_clicks")
              .select("*", { count: "exact", head: true })
              .eq("facility_id", facilityId)
              .eq("placement_type", p.placement_type)
              .eq("placement_value", p.placement_value)
              .gte("clicked_at", since),
          ]);
          const impressions_30d = impressions ?? 0;
          const phone_clicks_30d = clicks ?? 0;
          const ctr_pct = impressions_30d > 0
            ? Math.round((phone_clicks_30d / impressions_30d) * 10000) / 100
            : 0;
          return {
            placement_type: p.placement_type,
            placement_value: p.placement_value,
            impressions_30d,
            phone_clicks_30d,
            ctr_pct,
          } as FeaturedPlacementMetricsRow;
        }),
      );
      return rows;
    },
    enabled: !!facilityId,
    staleTime: 1000 * 60 * 5,
  });
}
