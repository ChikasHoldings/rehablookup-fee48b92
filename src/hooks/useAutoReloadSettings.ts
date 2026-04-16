import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getCachedSession } from "@/lib/sessionCache";
import { toast } from "sonner";

export interface AutoReloadSettings {
  id: string;
  provider_id: string;
  facility_id: string | null;
  enabled: boolean;
  threshold_cents: number;
  reload_amount_cents: number;
}

const VALID_RELOAD_AMOUNTS = [20000, 50000, 100000];
const VALID_THRESHOLDS = [2500, 5000, 10000, 25000]; // $25, $50, $100, $250

export function useAutoReloadSettings(facilityId?: string) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["auto-reload-settings"],
    queryFn: async (): Promise<AutoReloadSettings | null> => {
      const session = await getCachedSession();
      if (!session) return null;

      const { data, error } = await supabase
        .from("provider_auto_reload_settings")
        .select("id, provider_id, facility_id, enabled, threshold_cents, reload_amount_cents")
        .eq("provider_id", session.user.id)
        .maybeSingle();

      if (error) {
        console.error("[useAutoReloadSettings] Error:", error);
        return null;
      }

      return data as AutoReloadSettings | null;
    },
    staleTime: 1000 * 60 * 5,
  });

  const upsertSettings = useMutation({
    mutationFn: async ({
      enabled,
      threshold_cents,
      reload_amount_cents,
    }: {
      enabled: boolean;
      threshold_cents: number;
      reload_amount_cents: number;
    }) => {
      // Client-side validation
      if (!VALID_RELOAD_AMOUNTS.includes(reload_amount_cents)) {
        throw new Error("Invalid reload amount");
      }
      if (!VALID_THRESHOLDS.includes(threshold_cents)) {
        throw new Error("Invalid threshold amount");
      }

      const session = await getCachedSession();
      if (!session) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("provider_auto_reload_settings")
        .upsert(
          {
            provider_id: session.user.id,
            facility_id: facilityId || null,
            enabled,
            threshold_cents,
            reload_amount_cents,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "provider_id" }
        )
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["auto-reload-settings"] });
      if (data.enabled) {
        toast.success("Auto-reload enabled! Credits will reload automatically when your balance drops.");
      } else {
        toast.info("Auto-reload disabled.");
      }
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to update auto-reload settings");
    },
  });

  return {
    settings: query.data,
    isLoading: query.isLoading,
    upsertSettings,
    isUpdating: upsertSettings.isPending,
    VALID_RELOAD_AMOUNTS,
    VALID_THRESHOLDS,
  };
}
