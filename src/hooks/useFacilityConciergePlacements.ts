import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ConciergePlacementRow {
  id: string;
  case_kind: string;
  user_name: string;
  status: string;
  placed_facility_id: string;
  placement_confirmed: boolean | null;
  placement_confirmed_at: string | null;
  level_of_care: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Past concierge placements that landed at this facility — fetched via
 * `get_provider_facility_placements` (SECURITY DEFINER + ownership
 * check). Returns admitted / billed / completed cases only, newest
 * confirmed first.
 *
 * Used by `ConciergeManagementPanel` to give Concierge subscribers a
 * read-only history of who our advisors placed with them.
 */
export function useFacilityConciergePlacements(facilityId: string | null | undefined) {
  return useQuery({
    queryKey: ["facility-concierge-placements", facilityId],
    queryFn: async (): Promise<ConciergePlacementRow[]> => {
      if (!facilityId) return [];
      const { data, error } = await supabase.rpc("get_provider_facility_placements", {
        p_facility_id: facilityId,
      });
      if (error) {
        console.error("[useFacilityConciergePlacements] fetch failed", error);
        throw new Error(error.message || "Failed to load placement history");
      }
      return (data ?? []) as ConciergePlacementRow[];
    },
    enabled: !!facilityId,
    staleTime: 1000 * 60 * 5,
  });
}
