import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ProStatusData {
  isPro: boolean;
  status: 'active' | 'canceled' | 'past_due' | 'inactive';
  unlockDiscountPercent: number;
  currentPeriodEnd: string | null;
  facilityId: string | null;
}

const DEFAULT_PRO_STATUS: ProStatusData = {
  isPro: false,
  status: 'inactive',
  unlockDiscountPercent: 0,
  currentPeriodEnd: null,
  facilityId: null,
};

export function useProStatus(facilityId?: string) {
  return useQuery({
    queryKey: ["pro-status", facilityId],
    queryFn: async (): Promise<ProStatusData> => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return DEFAULT_PRO_STATUS;

      // Query pro_subscriptions table
      let query = supabase
        .from("pro_subscriptions")
        .select("*")
        .eq("provider_id", session.user.id);

      if (facilityId) {
        query = query.eq("facility_id", facilityId);
      }

      const { data, error } = await query.maybeSingle();

      if (error) {
        console.error("[useProStatus] Error fetching pro status:", error);
        return DEFAULT_PRO_STATUS;
      }

      if (!data) return DEFAULT_PRO_STATUS;

      const isActive = data.status === 'active' && 
        (!data.current_period_end || new Date(data.current_period_end) > new Date());

      return {
        isPro: isActive,
        status: data.status as ProStatusData['status'],
        unlockDiscountPercent: isActive ? (data.unlock_discount_percent ?? 20) : 0,
        currentPeriodEnd: data.current_period_end,
        facilityId: data.facility_id,
      };
    },
    enabled: true,
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchOnWindowFocus: true,
  });
}
