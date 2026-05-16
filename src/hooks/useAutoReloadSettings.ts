// TODO(monetization rebuild): the credit auto-reload feature was
// dropped in the foundation PR — `provider_auto_reload_settings` no
// longer exists. Stub kept so AutoReloadSettings.tsx still compiles
// and renders a "feature retired" empty state until the dependent UI
// is removed in a follow-up PR.

import { useMutation } from "@tanstack/react-query";

export interface AutoReloadSettings {
  id: string;
  provider_id: string;
  facility_id: string | null;
  enabled: boolean;
  threshold_cents: number;
  reload_amount_cents: number;
}

const VALID_RELOAD_AMOUNTS = [20000, 50000, 100000];
const VALID_THRESHOLDS = [2500, 5000, 10000, 25000];

export function useAutoReloadSettings(_facilityId?: string) {
  const upsertSettings = useMutation({
    mutationFn: async () => {
      throw new Error(
        "Auto-reload retired — annual subscriptions don't need it.",
      );
    },
  });

  return {
    settings: null as AutoReloadSettings | null,
    isLoading: false,
    upsertSettings,
    isUpdating: false,
    VALID_RELOAD_AMOUNTS,
    VALID_THRESHOLDS,
  };
}
