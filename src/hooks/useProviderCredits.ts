// TODO(monetization rebuild): the per-lead-credits model was dropped
// in the foundation PR. The `provider_credits` and `credit_transactions`
// tables no longer exist. This hook is stubbed to keep callers
// (ProviderHeader, ProviderSidebar, ProROIWidget, UnlockLeadButton,
// AutoReloadSettings, Billing, Dashboard) compiling and rendering
// "no balance" / "no activity" empty states until the dependent UI is
// removed in a follow-up PR.

import { useMutation } from "@tanstack/react-query";

export interface CreditBalance {
  balance_cents: number;
  facility_id: string;
}

export interface CreditTransaction {
  id: string;
  amount_cents: number;
  transaction_type: "purchase" | "unlock" | "refund" | "bonus";
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

export function useProviderCredits(_facilityId?: string) {
  const purchaseCredits = useMutation({
    mutationFn: async () => {
      throw new Error(
        "Credit purchases retired — billing now happens via annual subscriptions.",
      );
    },
  });

  return {
    data: DEFAULT_CREDITS,
    balance: 0,
    balanceFormatted: "$0.00",
    transactions: DEFAULT_CREDITS.transactions,
    isLoading: false,
    isFetching: false,
    isError: false as const,
    error: null,
    refetch: async () => ({ data: DEFAULT_CREDITS }),
    refetchCredits: async () => ({ data: DEFAULT_CREDITS }),
    purchaseCredits,
    isPurchasing: false,
  };
}
