import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getCachedSession } from "@/lib/sessionCache";

export interface FacilitySubscriptionRow {
  id: string;
  facility_id: string;
  provider_id: string | null;
  status: string | null;
  tier: string | null;
  has_featured: boolean | null;
  has_concierge_partner: boolean | null;
  billing_period: "monthly" | "annual" | null;
  paid_amount_cents: number | null;
  price_cents: number | null;
  original_annual_cents: number | null;
  discount_applied_cents: number | null;
  period_start: string | null;
  current_period_end: string | null;
  current_monthly_period_start: string | null;
  cancel_at_period_end: boolean | null;
  switch_to_monthly_at_renewal: boolean | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  started_at: string | null;
  canceled_at: string | null;
  updated_at: string | null;
}

const SELECT = [
  "id",
  "facility_id",
  "provider_id",
  "status",
  "tier",
  "has_featured",
  "has_concierge_partner",
  "billing_period",
  "paid_amount_cents",
  "price_cents",
  "original_annual_cents",
  "discount_applied_cents",
  "period_start",
  "current_period_end",
  "current_monthly_period_start",
  "cancel_at_period_end",
  "switch_to_monthly_at_renewal",
  "stripe_customer_id",
  "stripe_subscription_id",
  "started_at",
  "canceled_at",
  "updated_at",
].join(", ");

/**
 * Fetches the facility's current subscription row.
 *
 * `pollWhilePending`: when true (used right after the Stripe-Checkout
 * return), the query re-runs every 2 seconds until status becomes
 * `active`. Bounded to 90s by the caller via timeout state.
 */
export function useFacilitySubscription(
  facilityId: string | null | undefined,
  options: { pollWhilePending?: boolean } = {},
) {
  return useQuery({
    queryKey: ["facility-subscription", facilityId],
    queryFn: async (): Promise<FacilitySubscriptionRow | null> => {
      if (!facilityId) return null;
      const session = await getCachedSession();
      if (!session) return null;
      const { data, error } = await supabase
        .from("facility_subscriptions")
        // deno-lint-ignore no-explicit-any
        .select(SELECT as any)
        .eq("facility_id", facilityId)
        .maybeSingle();
      if (error) {
        console.error("[useFacilitySubscription] fetch failed", error);
        return null;
      }
      return (data as FacilitySubscriptionRow | null) ?? null;
    },
    enabled: !!facilityId,
    staleTime: 1000 * 30,
    refetchInterval: options.pollWhilePending ? 2000 : false,
  });
}

/**
 * Imperatively invalidate the cached subscription row — call this after
 * any mutation (cancel, switch, upgrade) so the dashboard re-renders
 * with the latest state.
 */
export function useInvalidateFacilitySubscription() {
  const queryClient = useQueryClient();
  return (facilityId: string | null | undefined) =>
    queryClient.invalidateQueries({ queryKey: ["facility-subscription", facilityId] });
}
