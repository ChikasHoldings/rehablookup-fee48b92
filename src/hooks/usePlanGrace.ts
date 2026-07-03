import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getCachedSession } from "@/lib/sessionCache";

export interface PlanGrace {
  id: string;
  kind: string;
  max_facilities: number;
  starts_at: string;
  expires_at: string;
}

/** Active courtesy period for the signed-in provider, or null. Server-backed
 * via the SECURITY DEFINER get_my_plan_grace() RPC (admin-granted rows only —
 * nothing client-writable feeds this). */
export function usePlanGrace() {
  return useQuery({
    queryKey: ["plan-grace"],
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<PlanGrace | null> => {
      const session = await getCachedSession();
      if (!session) return null;
      const { data, error } = await supabase.rpc("get_my_plan_grace");
      if (error) {
        console.warn("[usePlanGrace] RPC failed:", error.message);
        return null;
      }
      return (data as unknown as PlanGrace) ?? null;
    },
  });
}
