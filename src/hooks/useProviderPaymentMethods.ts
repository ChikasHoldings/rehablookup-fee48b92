import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface PaymentMethod {
  id: string;
  facility_id: string;
  type: "card" | "ach";
  stripe_payment_method_id: string;
  stripe_customer_id: string | null;
  last_four: string;
  bank_name: string | null;
  card_brand: string | null;
  exp_month: number | null;
  exp_year: number | null;
  is_default: boolean;
  is_verified: boolean;
  created_at: string;
  updated_at: string;
}

export function useProviderPaymentMethods(facilityId?: string) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["provider-payment-methods", facilityId],
    queryFn: async (): Promise<PaymentMethod[]> => {
      if (!facilityId) return [];
      
      const { data, error } = await supabase
        .from("provider_payment_methods")
        .select("*")
        .eq("facility_id", facilityId)
        .order("is_default", { ascending: false })
        .order("created_at", { ascending: false });

      if (error) {
        console.error("[useProviderPaymentMethods] Error:", error);
        return [];
      }
      
      return (data || []) as PaymentMethod[];
    },
    enabled: !!facilityId,
    staleTime: 1000 * 60 * 2, // 2 minutes
  });

  const deletePaymentMethod = useMutation({
    mutationFn: async (paymentMethodId: string) => {
      const { error } = await supabase
        .from("provider_payment_methods")
        .delete()
        .eq("id", paymentMethodId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["provider-payment-methods"] });
      toast.success("Payment method removed");
    },
    onError: () => {
      toast.error("Failed to remove payment method");
    },
  });

  const setDefaultPaymentMethod = useMutation({
    mutationFn: async (paymentMethodId: string) => {
      if (!facilityId) throw new Error("No facility selected");

      // First, unset all defaults for this facility
      await supabase
        .from("provider_payment_methods")
        .update({ is_default: false })
        .eq("facility_id", facilityId);

      // Then set the new default
      const { error } = await supabase
        .from("provider_payment_methods")
        .update({ is_default: true })
        .eq("id", paymentMethodId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["provider-payment-methods"] });
      toast.success("Default payment method updated");
    },
    onError: () => {
      toast.error("Failed to update default payment method");
    },
  });

  const defaultPaymentMethod = query.data?.find((pm) => pm.is_default) || query.data?.[0] || null;
  const hasPaymentMethod = (query.data?.length ?? 0) > 0;

  return {
    ...query,
    paymentMethods: query.data || [],
    defaultPaymentMethod,
    hasPaymentMethod,
    deletePaymentMethod,
    setDefaultPaymentMethod,
  };
}
