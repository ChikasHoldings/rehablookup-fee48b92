// TODO(monetization rebuild): the pay-per-lead-unlock model was dropped
// in the foundation PR. The `lead_unlocks` table no longer exists. This
// hook is stubbed to keep callers compiling and rendering empty states
// until the dependent UI is removed in a follow-up PR.
//
// Hook stays exported with the same signature so LeadDetailPanel /
// LeadDetailDrawer / UnlockLeadButton don't crash at runtime; every
// returned value is the "no unlock activity" baseline.

import { useMutation } from "@tanstack/react-query";

export interface LeadUnlock {
  id: string;
  lead_id: string;
  facility_id: string;
  unlock_price_cents: number;
  unlocked_at: string;
  payment_method?: string;
  provider_id?: string;
}

const NOOP_LEAD_UNLOCKS: LeadUnlock[] = [];

export function useLeadUnlocks(_facilityId?: string) {
  const unlockLead = useMutation({
    mutationFn: async () => {
      throw new Error(
        "Lead unlocking has been retired — facility subscriptions deliver leads directly. " +
          "If you reached this code path, file an issue.",
      );
    },
  });

  return {
    data: NOOP_LEAD_UNLOCKS,
    unlocks: NOOP_LEAD_UNLOCKS,
    isLoading: false,
    isFetching: false,
    isError: false as const,
    error: null,
    refetch: async () => ({ data: NOOP_LEAD_UNLOCKS }),
    isLeadUnlocked: (_leadId: string) => true, // Pro tier: every lead is "unlocked" by default
    getUnlockDetails: (_leadId: string): LeadUnlock | undefined => undefined,
    unlockLead,
    isUnlocking: false,
  };
}
