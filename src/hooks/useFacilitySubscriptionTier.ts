import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type FacilityTier = "free" | "pro";

/**
 * Public read of a facility's subscription tier. Used by the inquiry
 * form to show the Free-tier disclosure ("you'll connect with a care
 * coordinator…") only when the facility is on Free.
 *
 * The frontend never makes routing decisions based on this — server-
 * side re-checks the tier on submit (submit-qualified-lead branches by
 * the live DB value, not whatever the client thinks). This hook is
 * purely cosmetic.
 */
export function useFacilitySubscriptionTier(facilityId: string | null | undefined) {
  return useQuery({
    queryKey: ["facility-tier", facilityId],
    queryFn: async (): Promise<FacilityTier> => {
      if (!facilityId) return "free";
      const { data } = await supabase
        .from("facility_subscriptions")
        .select("status, tier")
        .eq("facility_id", facilityId)
        .eq("status", "active")
        .maybeSingle();
      return data?.tier === "pro" ? "pro" : "free";
    },
    enabled: !!facilityId,
    staleTime: 1000 * 60 * 5,
  });
}
