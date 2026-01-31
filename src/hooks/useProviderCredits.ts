import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useRef } from "react";
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
      const { data: { session } } = await supabase.auth.getSession();
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

      // Get recent transactions
      const { data: transactionsData, error: transactionsError } = await supabase
        .from("credit_transactions")
        .select("*")
        .eq("provider_id", session.user.id)
        .order("created_at", { ascending: false })
        .limit(20);

      if (transactionsError) {
        console.error("[useProviderCredits] Error fetching transactions:", transactionsError);
      }

      return {
        balance_cents: creditsData?.balance_cents ?? 0,
        transactions: (transactionsData ?? []) as CreditTransaction[],
      };
    },
    enabled: true,
    staleTime: 1000 * 60 * 2, // 2 minutes
    refetchOnWindowFocus: true,
  });

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
        `Your credit balance is running low ($${(currentBalance / 100).toFixed(2)}). Consider adding more credits to continue unlocking leads.`,
        { 
          duration: 8000,
          action: {
            label: "Add Credits",
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
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["provider-credits"] });
    },
  });

  const isLowCredits = (query.data?.balance_cents ?? 0) > 0 && 
                       (query.data?.balance_cents ?? 0) < LOW_CREDITS_THRESHOLD;

  return {
    ...query,
    balance: query.data?.balance_cents ?? 0,
    balanceFormatted: `$${((query.data?.balance_cents ?? 0) / 100).toFixed(2)}`,
    transactions: query.data?.transactions ?? [],
    purchaseCredits,
    isLowCredits,
  };
}
