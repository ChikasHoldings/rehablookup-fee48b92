import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

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

  return {
    ...query,
    balance: query.data?.balance_cents ?? 0,
    balanceFormatted: `$${((query.data?.balance_cents ?? 0) / 100).toFixed(2)}`,
    transactions: query.data?.transactions ?? [],
    purchaseCredits,
  };
}
