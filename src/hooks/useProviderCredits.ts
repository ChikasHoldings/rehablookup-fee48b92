import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getCachedSession } from "@/lib/sessionCache";
import { useEffect, useRef, useCallback } from "react";
import { toast } from "sonner";

export interface CreditBalance {
  balance_cents: number;
  facility_id: string;
}

export interface CreditTransaction {
  id: string;
  amount_cents: number;
  transaction_type: 'purchase' | 'unlock' | 'refund' | 'bonus';
  description: string | null;
  reference_id: string | null;
  created_at: string;
  base_price_cents?: number;
  discount_applied?: boolean;
  discount_amount_cents?: number;
  inquiry_type?: string;
}

export interface ProviderCreditsData {
  balance_cents: number;
  transactions: CreditTransaction[];
}

const DEFAULT_CREDITS: ProviderCreditsData = {
  balance_cents: 0,
  transactions: [],
};

// Threshold for low credits warning (in cents) - $50
const LOW_CREDITS_THRESHOLD = 5000;

export function useProviderCredits(facilityId?: string) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["provider-credits", facilityId],
    queryFn: async (): Promise<ProviderCreditsData> => {
      try {
        const session = await getCachedSession();
        if (!session) return DEFAULT_CREDITS;

        // Get credit balance
        const { data: creditsData, error: creditsError } = await supabase
          .from("provider_credits")
          .select("balance_cents, facility_id")
          .eq("provider_id", session.user.id)
          .maybeSingle();

        if (creditsError) {
          console.error("[useProviderCredits] Error fetching credits:", creditsError);
        }

        // Get recent transactions with all fields
        const { data: transactionsData, error: transactionsError } = await supabase
          .from("credit_transactions")
          .select("id, amount_cents, transaction_type, description, reference_id, created_at, base_price_cents, discount_applied, discount_amount_cents, inquiry_type")
          .eq("provider_id", session.user.id)
          .order("created_at", { ascending: false })
          .limit(50);

        if (transactionsError) {
          console.error("[useProviderCredits] Error fetching transactions:", transactionsError);
        }

        return {
          balance_cents: creditsData?.balance_cents ?? 0,
          transactions: (transactionsData ?? []) as CreditTransaction[],
        };
      } catch (err) {
        console.error("[useProviderCredits] Unexpected error:", err);
        return DEFAULT_CREDITS;
      }
    },
    enabled: true,
    staleTime: 1000 * 60 * 2, // 2 minutes
    refetchOnWindowFocus: true,
    retry: 2,
  });

  // Real-time subscription: instantly refresh on any credit_transactions or provider_credits change
  useEffect(() => {
    const session_promise = getCachedSession();
    let channel: ReturnType<typeof supabase.channel> | null = null;

    session_promise.then((session) => {
      if (!session) return;
      const userId = session.user.id;

      channel = supabase
        .channel(`billing-realtime-${userId}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "credit_transactions", filter: `provider_id=eq.${userId}` },
          () => { queryClient.invalidateQueries({ queryKey: ["provider-credits"] }); }
        )
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "provider_credits", filter: `provider_id=eq.${userId}` },
          () => { queryClient.invalidateQueries({ queryKey: ["provider-credits"] }); }
        )
        .subscribe();
    });

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, [queryClient]);

  // Track previous balance to detect when it drops below threshold
  const prevBalanceRef = useRef<number | null>(null);
  const hasWarnedRef = useRef(false);

  useEffect(() => {
    const currentBalance = query.data?.balance_cents ?? 0;
    const prevBalance = prevBalanceRef.current;

    // Only warn if:
    // 1. Balance dropped below threshold
    // 2. Previous balance was above threshold (or first load)
    // 3. Haven't warned in this session yet
    if (
      currentBalance > 0 && 
      currentBalance < LOW_CREDITS_THRESHOLD &&
      (prevBalance === null || prevBalance >= LOW_CREDITS_THRESHOLD) &&
      !hasWarnedRef.current
    ) {
      toast.warning(
        `Your credit balance is running low ($${(currentBalance / 100).toFixed(2)}). Enable auto-reload or add credits to keep unlocking leads.`,
        { 
          duration: 8000,
          action: {
            label: "Set Up Auto-Reload",
            onClick: () => window.location.href = "/provider/billing",
          },
        }
      );
      hasWarnedRef.current = true;
    }

    // Reset warning flag if balance goes back above threshold
    if (currentBalance >= LOW_CREDITS_THRESHOLD) {
      hasWarnedRef.current = false;
    }

    prevBalanceRef.current = currentBalance;
  }, [query.data?.balance_cents]);

  // Mutation to purchase credits
  const purchaseCredits = useMutation({
    mutationFn: async ({ amountCents, facilityId: fId }: { amountCents: number; facilityId: string }) => {
      const { data, error } = await supabase.functions.invoke("purchase-credits", {
        body: { amountCents, facilityId: fId },
      });
      if (error) {
        console.error("[useProviderCredits] Purchase error:", error);
        throw error;
      }
      if (data?.error) {
        throw new Error(data.error);
      }
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["provider-credits"] });
      // Log successful checkout initiation
      console.log("[useProviderCredits] Checkout initiated:", { 
        sessionId: data?.sessionId, 
        version: data?._version 
      });
    },
    onError: (error: Error) => {
      console.error("[useProviderCredits] Purchase mutation error:", error.message);
    },
  });

  // Memoized refetch function for external use
  const refetchCredits = useCallback(() => {
    return queryClient.invalidateQueries({ queryKey: ["provider-credits"] });
  }, [queryClient]);

  const isLowCredits = (query.data?.balance_cents ?? 0) > 0 && 
                       (query.data?.balance_cents ?? 0) < LOW_CREDITS_THRESHOLD;

  const hasCredits = (query.data?.balance_cents ?? 0) > 0;

  return {
    ...query,
    balance: query.data?.balance_cents ?? 0,
    balanceFormatted: `$${((query.data?.balance_cents ?? 0) / 100).toFixed(2)}`,
    transactions: query.data?.transactions ?? [],
    purchaseCredits,
    isLowCredits,
    hasCredits,
    refetchCredits,
  };
}
