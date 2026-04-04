import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface LeadUnlock {
  id: string;
  lead_id: string;
  facility_id: string;
  unlock_price_cents: number;
  unlocked_at: string;
  payment_method?: string;
  provider_id?: string;
}

export function useLeadUnlocks(facilityId?: string) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["lead-unlocks", facilityId],
    queryFn: async (): Promise<LeadUnlock[]> => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return [];

      let queryBuilder = supabase
        .from("lead_unlocks")
        .select("id, lead_id, facility_id, unlock_price_cents, unlocked_at, payment_method, provider_id")
        .order("unlocked_at", { ascending: false });

      if (facilityId) {
        queryBuilder = queryBuilder.eq("facility_id", facilityId);
      }

      const { data, error } = await queryBuilder;

      if (error) {
        console.error("[useLeadUnlocks] Error fetching unlocks:", error);
        return [];
      }

      return data as LeadUnlock[];
    },
    enabled: true,
    staleTime: 1000 * 60 * 2,
    refetchOnWindowFocus: true,
  });

  // Check if a specific lead is unlocked
  const isLeadUnlocked = (leadId: string): boolean => {
    return query.data?.some(unlock => unlock.lead_id === leadId) ?? false;
  };

  // Get unlock details for a lead
  const getUnlockDetails = (leadId: string): LeadUnlock | undefined => {
    return query.data?.find(unlock => unlock.lead_id === leadId);
  };

  // Mutation to unlock a lead
  const unlockLead = useMutation({
    mutationFn: async ({ 
      leadId, 
      facilityId: fId,
      paymentMethod = 'credits',
      discountSaved = 0,
    }: { 
      leadId: string; 
      facilityId: string;
      paymentMethod?: 'credits' | 'stripe';
      discountSaved?: number;
    }) => {
      const { data, error } = await supabase.functions.invoke("unlock-lead", {
        body: { leadId, facilityId: fId, paymentMethod },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return { ...data, discountSaved };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["lead-unlocks"] });
      queryClient.invalidateQueries({ queryKey: ["provider-credits"] });
      queryClient.invalidateQueries({ queryKey: ["provider-inquiries"] });
      queryClient.invalidateQueries({ queryKey: ["recent-leads"] });
      queryClient.invalidateQueries({ queryKey: ["lead-analytics"] });
      
      // Show savings toast for Pro members
      if (data.discountSaved && data.discountSaved > 0) {
        toast.success(`Lead unlocked! Pro discount saved you $${(data.discountSaved / 100).toFixed(2)}`);
      } else {
        toast.success("Lead unlocked! You can now view contact details.");
      }
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to unlock lead");
    },
  });

  return {
    ...query,
    unlocks: query.data ?? [],
    isLeadUnlocked,
    getUnlockDetails,
    unlockLead,
    isUnlocking: unlockLead.isPending,
  };
}
