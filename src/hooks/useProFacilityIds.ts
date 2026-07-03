import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getCachedSession } from "@/lib/sessionCache";

/**
 * Returns the Set of facility_ids the current provider holds an ACTIVE Pro
 * subscription on. Mirrors the DB `has_active_pro` semantics (tier = 'pro'
 * AND (status 'active' within the current period, OR 'past_due' grace)) — the
 * same rule `useProStatus` applies for a single facility — but resolves ALL of
 * the provider's facilities in one query.
 *
 * Use this on multi-facility pages (e.g. Reviews' "All Locations" view) where
 * a Pro-gated action must be decided per row from `review.facility_id`, not
 * from a single account-wide / selected-facility Pro flag (which mis-gates a
 * mixed-tier provider: hiding the feature on a paying Pro facility, or offering
 * it on a Free facility where the server trigger then rejects it).
 */
export function useProFacilityIds() {
  return useQuery({
    queryKey: ["pro-facility-ids"],
    queryFn: async (): Promise<Set<string>> => {
      const session = await getCachedSession();
      if (!session) return new Set<string>();

      const { data, error } = await supabase
        .from("facility_subscriptions")
        .select("facility_id, tier, status, current_period_end")
        .eq("provider_id", session.user.id);

      if (error || !data) return new Set<string>();

      const now = new Date();
      const ids = new Set<string>();
      for (const row of data as Array<{
        facility_id: string | null;
        tier: string | null;
        status: string | null;
        current_period_end: string | null;
      }>) {
        if (!row.facility_id || row.tier !== "pro") continue;
        const periodEnd = row.current_period_end ? new Date(row.current_period_end) : null;
        const withinPeriod = !periodEnd || periodEnd > now;
        const isActive =
          (row.status === "active" && withinPeriod) || row.status === "past_due";
        if (isActive) ids.add(row.facility_id);
      }
      return ids;
    },
    staleTime: 1000 * 60 * 5,
  });
}
