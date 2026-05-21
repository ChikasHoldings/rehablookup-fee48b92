import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface PartnerStatusRow {
  facility_id: string;
  geo_state: string | null;
  geo_city: string | null;
}

/**
 * For a given set of facility ids and a seeker geo, returns the subset
 * that are CURRENTLY active Placement Partners in that geo.
 *
 * Partner status is checked at the moment the hook fetches — if a
 * facility downgrades mid-introduction-flow, the badge disappears on
 * the next view. The audit row written at send time snapshots the
 * status as of that moment (see record-introduction-decision).
 */
export function useFacilityPartnerStatus(args: {
  facilityIds: string[];
  seekerState?: string | null;
  seekerCity?: string | null;
}) {
  const { facilityIds, seekerState, seekerCity } = args;
  const sortedIds = [...facilityIds].sort();
  return useQuery({
    queryKey: ["facility-partner-status", sortedIds, seekerState, seekerCity],
    queryFn: async (): Promise<Set<string>> => {
      if (sortedIds.length === 0) return new Set();
      const builder = supabase
        .from("concierge_partner_facilities")
        .select("facility_id, geo_state, geo_city")
        .in("facility_id", sortedIds)
        .eq("active", true);
      if (seekerState) builder.eq("geo_state", seekerState);
      const { data, error } = await builder;
      if (error) {
        console.error("[useFacilityPartnerStatus] fetch failed", error);
        return new Set();
      }
      const partners = new Set<string>();
      for (const row of (data ?? []) as PartnerStatusRow[]) {
        if (!seekerCity || !row.geo_city || row.geo_city === seekerCity) {
          partners.add(row.facility_id);
        }
      }
      return partners;
    },
    enabled: sortedIds.length > 0,
    staleTime: 1000 * 60 * 2,
  });
}
