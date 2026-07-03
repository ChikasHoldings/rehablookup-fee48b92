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
  featured_current_period_end: string | null;
  concierge_current_period_end: string | null;
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
  "featured_current_period_end",
  "concierge_current_period_end",
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
 * Decaying polling schedule: fast at first (webhooks usually land in
 * under 10s) then back off so we don't hammer the DB if Stripe is slow.
 *
 *   attempts 1..5  →  2s  (first 10s — covers the typical case)
 *   attempts 6..15 →  4s  (next 40s — covers slow webhooks)
 *   attempts 16..30→  8s  (next ~2 min — covers Stripe queue backlog)
 *   attempts >30   →  false (give up; UI shows "Check now")
 *
 * Total covered: roughly 3 minutes. After that the user gets a clear
 * manual escalation rather than indefinite polling.
 */
function pollingIntervalFor(attemptCount: number): number | false {
  if (attemptCount < 5) return 2_000;
  if (attemptCount < 15) return 4_000;
  if (attemptCount < 30) return 8_000;
  return false;
}

/**
 * Fetches the facility's current subscription row.
 *
 * `pollWhilePending`: when true (used right after the Stripe-Checkout
 * return), the query re-runs on a decaying schedule until status becomes
 * `active` or the schedule exhausts (~3 min). When polling stops on its
 * own without a positive result, callers should surface a "Check now"
 * button so the user can manually re-arm polling.
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
        // The generated supabase-js types require a literal column list
        // typed as a tuple. We compose `SELECT` at module scope from an
        // array to keep the column inventory readable, then cast to the
        // looser `unknown` to satisfy both the runtime (which accepts a
        // plain string) and TypeScript (which wants the tuple shape).
        .select(SELECT as unknown as never)
        .eq("facility_id", facilityId)
        .maybeSingle();
      if (error) {
        // Throw so React Query surfaces isError to consumers — the page
        // can then render a real "fetch failed, retry" affordance
        // instead of silently falling back to the Free-plan card while
        // the user has a Pro subscription that just failed to load.
        // `null` is reserved for "no row yet" (legitimate Free tier).
        console.error("[useFacilitySubscription] fetch failed", error);
        throw new Error(error.message || "Failed to load subscription");
      }
      return (data as unknown as FacilitySubscriptionRow | null) ?? null;
    },
    enabled: !!facilityId,
    staleTime: 1000 * 30,
    refetchInterval: options.pollWhilePending
      ? (query) => {
          // Stop polling the moment the subscription is live Pro (active or
          // trialing — both render as Pro, so neither should keep polling).
          const data = query.state.data as FacilitySubscriptionRow | null;
          if (data?.status === "active" || data?.status === "trialing") return false;
          return pollingIntervalFor(query.state.dataUpdateCount);
        }
      : false,
    // Re-fetch when the tab regains focus so post-Stripe-return flows
    // (checkout, portal cancel/upgrade, addon purchase) reflect the
    // webhook-applied state without a hard reload. `staleTime: 30s`
    // already debounces this to one DB hit per half-minute.
    refetchOnWindowFocus: true,
    retry: 1,
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
