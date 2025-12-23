import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect } from "react";
import { useProviderFacilities } from "./useProviderFacilities";
import { useSubscription } from "./useSubscription";

export interface AccountLeadUsage {
  /** Total qualified leads used this month across ALL facilities */
  usedLeads: number;
  /** Monthly lead limit for the account (not per-facility) */
  leadLimit: number;
  /** Remaining leads available this month */
  remainingLeads: number;
  /** Usage percentage (0-100) */
  usagePercent: number;
  /** Whether the account has hit its limit */
  isAtLimit: boolean;
  /** Current subscription plan */
  plan: "basic" | "professional" | "featured";
  /** Lead exclusivity type */
  exclusivity: "shared" | "exclusive";
  /** Subscription end date (for billing cycle reset) */
  subscriptionEnd: string | null;
  /** Current period start date */
  currentPeriodStart: string | null;
  /** All facility IDs owned by the user */
  facilityIds: string[];
}

const CACHE_KEY = "account-lead-usage";
const CACHE_TTL = 1000 * 60 * 2; // 2 minutes

function getCachedUsage(): AccountLeadUsage | undefined {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      const { data, timestamp } = JSON.parse(cached);
      if (Date.now() - timestamp < CACHE_TTL) {
        return data as AccountLeadUsage;
      }
    }
  } catch {
    // Ignore parse errors
  }
  return undefined;
}

function cacheUsage(data: AccountLeadUsage) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({
      data,
      timestamp: Date.now(),
    }));
  } catch {
    // Ignore storage errors
  }
}

/**
 * Hook to get account-level lead usage across ALL facilities.
 * 
 * IMPORTANT: Lead limits are per-ACCOUNT, not per-facility.
 * If a provider has 3 facilities and a Professional plan (100 leads/month),
 * they get 100 leads TOTAL across all 3 facilities, not 300 leads.
 */
export function useAccountLeadUsage() {
  const queryClient = useQueryClient();
  const { facilities, isLoading: facilitiesLoading } = useProviderFacilities();
  const { data: subscription, isLoading: subscriptionLoading } = useSubscription();

  const facilityIds = facilities?.map(f => f.id) ?? [];

  const query = useQuery({
    queryKey: ["account-lead-usage", facilityIds.join(",")],
    queryFn: async (): Promise<AccountLeadUsage> => {
      console.log("[useAccountLeadUsage] Calculating account-level lead usage");
      
      if (!facilityIds.length) {
        console.log("[useAccountLeadUsage] No facilities found");
        return {
          usedLeads: 0,
          leadLimit: subscription?.lead_limit ?? 0,
          remainingLeads: subscription?.lead_limit ?? 0,
          usagePercent: 0,
          isAtLimit: false,
          plan: (subscription?.plan as "basic" | "professional" | "featured") ?? "basic",
          exclusivity: subscription?.exclusivity ?? "exclusive",
          subscriptionEnd: subscription?.subscription_end ?? null,
          currentPeriodStart: subscription?.current_period_start ?? null,
          facilityIds: [],
        };
      }

      // Get start of the current billing period
      // Use subscription start date if available, otherwise use start of current month
      let periodStart: Date;
      if (subscription?.current_period_start) {
        periodStart = new Date(subscription.current_period_start);
      } else {
        periodStart = new Date();
        periodStart.setDate(1);
        periodStart.setHours(0, 0, 0, 0);
      }

      console.log("[useAccountLeadUsage] Fetching leads for facilities:", facilityIds, "since:", periodStart.toISOString());

      // Count qualified leads across ALL facilities for the current billing period
      const { count, error } = await supabase
        .from("leads")
        .select("*", { count: "exact", head: true })
        .in("facility_id", facilityIds)
        .eq("qualified", true)
        .gte("created_at", periodStart.toISOString());

      if (error) {
        console.error("[useAccountLeadUsage] Error fetching leads:", error);
        throw error;
      }

      const usedLeads = count ?? 0;
      const leadLimit = subscription?.lead_limit ?? 0;
      const remainingLeads = Math.max(0, leadLimit - usedLeads);
      const usagePercent = leadLimit > 0 ? Math.min((usedLeads / leadLimit) * 100, 100) : 0;
      const isAtLimit = leadLimit > 0 && usedLeads >= leadLimit;

      console.log("[useAccountLeadUsage] Result:", { 
        usedLeads, 
        leadLimit, 
        remainingLeads, 
        usagePercent: Math.round(usagePercent),
        isAtLimit,
        facilityCount: facilityIds.length
      });

      const result: AccountLeadUsage = {
        usedLeads,
        leadLimit,
        remainingLeads,
        usagePercent,
        isAtLimit,
        plan: (subscription?.plan as "basic" | "professional" | "featured") ?? "basic",
        exclusivity: subscription?.exclusivity ?? "exclusive",
        subscriptionEnd: subscription?.subscription_end ?? null,
        currentPeriodStart: subscription?.current_period_start ?? null,
        facilityIds,
      };

      cacheUsage(result);
      return result;
    },
    enabled: !facilitiesLoading && !subscriptionLoading && facilityIds.length > 0,
    placeholderData: getCachedUsage,
    staleTime: 1000 * 60 * 2, // 2 minutes
    gcTime: 1000 * 60 * 60, // 1 hour
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    retry: 2,
  });

  // Real-time subscription for leads across all facilities
  useEffect(() => {
    if (!facilityIds.length) return;

    const channels = facilityIds.map((facilityId, index) => 
      supabase
        .channel(`account-leads-${facilityId}-${index}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "leads",
            filter: `facility_id=eq.${facilityId}`,
          },
          () => {
            console.log("[useAccountLeadUsage] Lead change detected, invalidating cache");
            queryClient.invalidateQueries({ queryKey: ["account-lead-usage"] });
          }
        )
        .subscribe()
    );

    return () => {
      channels.forEach(channel => supabase.removeChannel(channel));
    };
  }, [facilityIds.join(","), queryClient]);

  return {
    ...query.data,
    isLoading: facilitiesLoading || subscriptionLoading || query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}
