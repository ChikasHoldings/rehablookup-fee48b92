import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getCachedSession } from "@/lib/sessionCache";
import { useCallback } from "react";

export interface ProStatusData {
  isPro: boolean;
  status: 'active' | 'canceled' | 'past_due' | 'inactive';
  unlockDiscountPercent: number;
  currentPeriodEnd: string | null;
  facilityId: string | null;
  stripeSubscriptionId: string | null;
  cancelAtPeriodEnd: boolean;
}

const DEFAULT_PRO_STATUS: ProStatusData = {
  isPro: false,
  status: 'inactive',
  unlockDiscountPercent: 0,
  currentPeriodEnd: null,
  facilityId: null,
  stripeSubscriptionId: null,
  cancelAtPeriodEnd: false,
};

export function useProStatus(facilityId?: string) {
  const query = useQuery({
    queryKey: ["pro-status", facilityId],
    queryFn: async (): Promise<ProStatusData> => {
      try {
        const session = await getCachedSession();
        if (!session) return DEFAULT_PRO_STATUS;

        // Query pro_subscriptions table with existing columns only
        let queryBuilder = supabase
          .from("pro_subscriptions")
          .select("id, provider_id, facility_id, status, stripe_subscription_id, current_period_end, unlock_discount_percent, cancel_at_period_end, created_at, updated_at")
          .eq("provider_id", session.user.id);

        if (facilityId) {
          queryBuilder = queryBuilder.eq("facility_id", facilityId);
        }

        // Use order + limit(1) instead of maybeSingle() to handle providers
        // with multiple facilities that may each have a pro_subscription row
        const { data: rows, error } = await queryBuilder
          .order("current_period_end", { ascending: false, nullsFirst: false })
          .limit(1);

        const data = rows?.[0] ?? null;

        if (error) {
          console.error("[useProStatus] Database error:", error.message);
          return DEFAULT_PRO_STATUS;
        }

        if (!data) return DEFAULT_PRO_STATUS;

        // Validate subscription is truly active
        const now = new Date();
        const periodEnd = data.current_period_end ? new Date(data.current_period_end) : null;
        const isWithinPeriod = !periodEnd || periodEnd > now;
        const isActive = data.status === 'active' && isWithinPeriod;

        return {
          isPro: isActive,
          status: (data.status || 'inactive') as ProStatusData['status'],
          unlockDiscountPercent: isActive ? (data.unlock_discount_percent ?? 20) : 0,
          currentPeriodEnd: data.current_period_end,
          facilityId: data.facility_id,
          stripeSubscriptionId: data.stripe_subscription_id,
          cancelAtPeriodEnd: (data as Record<string, unknown>).cancel_at_period_end === true,
        };
      } catch (err) {
        console.error("[useProStatus] Unexpected error:", err);
        return DEFAULT_PRO_STATUS;
      }
    },
    enabled: true,
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchOnWindowFocus: true,
    retry: 2,
  });

  const refetchProStatus = useCallback(() => {
    return query.refetch();
  }, [query]);

  return {
    ...query,
    refetchProStatus,
  };
}
