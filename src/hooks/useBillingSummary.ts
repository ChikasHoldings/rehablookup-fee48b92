import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface BillingPaymentMethod {
  brand: string;
  last4: string;
  expMonth: number;
  expYear: number;
}

export interface BillingInvoice {
  id: string;
  number: string | null;
  created: number; // unix seconds
  amountPaid: number; // cents
  amountDue: number; // cents
  currency: string;
  status: string | null;
  hostedInvoiceUrl: string | null;
  invoicePdf: string | null;
}

export interface BillingSummary {
  paymentMethod: BillingPaymentMethod | null;
  invoices: BillingInvoice[];
  hasCustomer: boolean;
}

/**
 * Real Stripe-backed payment method + recent invoices for the facility,
 * via the get-billing-summary edge function (read-only; ownership-checked
 * server-side). Powers the in-app payment-method + invoices display on the
 * Billing page. Returns an empty summary for facilities with no Stripe
 * customer yet (Free / never subscribed).
 */
export function useBillingSummary(facilityId: string | null | undefined, enabled = true) {
  return useQuery({
    queryKey: ["billing-summary", facilityId],
    queryFn: async (): Promise<BillingSummary> => {
      const { data, error } = await supabase.functions.invoke("get-billing-summary", {
        body: { facility_id: facilityId },
      });
      if (error) throw new Error(error.message || "Failed to load billing details");
      if ((data as { error?: string })?.error) throw new Error((data as { error: string }).error);
      const d = data as Partial<BillingSummary>;
      return {
        paymentMethod: d.paymentMethod ?? null,
        invoices: d.invoices ?? [],
        hasCustomer: d.hasCustomer ?? false,
      };
    },
    enabled: enabled && !!facilityId,
    staleTime: 1000 * 60 * 2,
    retry: 1,
  });
}
