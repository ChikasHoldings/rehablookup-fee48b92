import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { DollarSign, RefreshCw, Loader2, CheckCircle2, AlertTriangle, FileText } from "lucide-react";
import { format } from "date-fns";
import type { Database } from "@/integrations/supabase/types";

type ConciergeInquiry = Database["public"]["Tables"]["concierge_inquiries"]["Row"];

interface BillingStatusCardProps {
  caseData: ConciergeInquiry;
  onRefresh: () => void;
}

const FEE_STATUS_BADGE: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  paid: { label: "Paid", variant: "default" },
  invoiced: { label: "Invoiced", variant: "secondary" },
  pending: { label: "Pending", variant: "outline" },
  failed: { label: "Failed", variant: "destructive" },
  waived: { label: "Waived", variant: "outline" },
};

export function BillingStatusCard({ caseData, onRefresh }: BillingStatusCardProps) {
  const queryClient = useQueryClient();
  const isPlaced = ["admitted", "billed", "completed"].includes(caseData.status) || caseData.placement_confirmed;

  const { data: invoice, isLoading } = useQuery({
    queryKey: ["case-invoice", caseData.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("placement_invoices")
        .select("id, amount_cents, status, fee_type, due_at, paid_at, receipt_url, stripe_payment_intent_id, waived, waive_reason, created_at, discount_percent, discount_reason, override_amount_cents, override_reason")
        .eq("inquiry_id", caseData.id)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!isPlaced,
  });

  const { data: advisorEarning } = useQuery({
    queryKey: ["case-advisor-earning", caseData.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("advisor_earnings")
        .select("id, advisor_id, commission_cents, commission_rate, placement_fee_cents, status, paid_at")
        .eq("inquiry_id", caseData.id)
        .maybeSingle();

      if (error) return null;
      return data;
    },
    enabled: !!isPlaced,
  });

  const retryBillingMutation = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const response = await supabase.functions.invoke("charge-placement-fee", {
        body: {
          inquiryId: caseData.id,
          facilityId: caseData.placed_facility_id,
          feeType: "flat_fee",
          isInternational: caseData.payment_amount_cents >= 29900,
        },
      });

      if (response.error) throw response.error;
      if (response.data?.error) throw new Error(response.data.error);

      await supabase.from("concierge_case_events").insert({
        inquiry_id: caseData.id,
        event_type: "charge_retried",
        event_data: { result: response.data },
        actor_id: user.id,
        actor_type: "admin",
      });

      return response.data;
    },
    onSuccess: (data) => {
      toast.success(data?.charged ? "Payment collected successfully!" : "Invoice created/updated.");
      queryClient.invalidateQueries({ queryKey: ["case-invoice", caseData.id] });
      queryClient.invalidateQueries({ queryKey: ["case-events", caseData.id] });
      queryClient.invalidateQueries({ queryKey: ["placement-invoices"] });
      onRefresh();
    },
    onError: (error) => {
      toast.error("Billing retry failed: " + error.message);
      // Log charge_failed event — best-effort, awaited
      (async () => {
        try {
          const { data: { user: currentUser } } = await supabase.auth.getUser();
          await supabase.from("concierge_case_events").insert({
            inquiry_id: caseData.id,
            event_type: "charge_failed",
            event_data: { error: error.message },
            actor_id: currentUser?.id || null,
            actor_type: "admin",
          });
          queryClient.invalidateQueries({ queryKey: ["case-events", caseData.id] });
        } catch { /* best-effort */ }
      })();
    },
  });

  // Don't render for non-placed cases
  if (!isPlaced) return null;

  if (isLoading) {
    return <Skeleton className="h-24 w-full" />;
  }

  const feeStatus = caseData.provider_fee_status || (invoice ? invoice.status : "missing");
  const statusConfig = FEE_STATUS_BADGE[feeStatus] || { label: feeStatus || "Unknown", variant: "outline" as const };
  const isMissing = !invoice && !caseData.provider_fee_status;
  const isFailed = feeStatus === "failed";
  const isPaid = feeStatus === "paid";
  const isWaived = invoice?.waived;
  const displayAmount = invoice
    ? (invoice.override_amount_cents || invoice.amount_cents)
    : caseData.provider_fee_cents;

  return (
    <Card className={
      isPaid ? "border-emerald-200 bg-emerald-50/50 dark:border-emerald-800 dark:bg-emerald-950/20" :
      isFailed || isMissing ? "border-destructive/30 bg-destructive/5" :
      "border-amber-200 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-950/20"
    }>
      <CardHeader className="py-3">
        <CardTitle className="text-sm font-medium flex items-center justify-between">
          <span className="flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            Provider Billing
          </span>
          <Badge variant={statusConfig.variant}>{isWaived ? "Waived" : statusConfig.label}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="py-2 space-y-3">
        {displayAmount ? (
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Fee Amount</span>
            <span className="font-semibold">${(displayAmount / 100).toLocaleString()}</span>
          </div>
        ) : null}

        {invoice?.fee_type && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Type</span>
            <span>{invoice.fee_type === "international_flat_fee" ? "International" : "Domestic"}</span>
          </div>
        )}

        {invoice?.discount_percent ? (
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Discount</span>
            <span className="text-emerald-600">{invoice.discount_percent}% — {invoice.discount_reason}</span>
          </div>
        ) : null}

        {invoice?.due_at && !isPaid && !isWaived && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Due Date</span>
            <span>{format(new Date(invoice.due_at), "MMM d, yyyy")}</span>
          </div>
        )}

        {invoice?.paid_at && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Paid</span>
            <span className="flex items-center gap-1.5 text-emerald-600">
              <CheckCircle2 className="h-3.5 w-3.5" />
              {format(new Date(invoice.paid_at), "MMM d, yyyy")}
            </span>
          </div>
        )}

        {isWaived && invoice?.waive_reason && (
          <div className="text-sm text-muted-foreground bg-muted p-2 rounded">
            <span className="font-medium">Waive Reason:</span> {invoice.waive_reason}
          </div>
        )}

        {invoice?.override_amount_cents && invoice?.override_reason && (
          <div className="text-sm text-muted-foreground bg-muted p-2 rounded">
            <span className="font-medium">Override:</span> {invoice.override_reason}
          </div>
        )}

        {/* Advisor Earning */}
        {advisorEarning && (
          <div className="border-t pt-2 mt-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Advisor Commission ({advisorEarning.commission_rate}%)</span>
              <span className="font-medium">${(advisorEarning.commission_cents / 100).toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between text-xs mt-1">
              <span className="text-muted-foreground">Status</span>
              <Badge variant={advisorEarning.status === "paid" ? "default" : "outline"} className="text-xs">
                {advisorEarning.status}
              </Badge>
            </div>
          </div>
        )}

        {/* Missing billing alert */}
        {isMissing && (
          <div className="flex items-start gap-2 text-sm text-destructive">
            <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
            <span>No invoice found for this placed case. Click retry to generate billing.</span>
          </div>
        )}

        {isFailed && (
          <div className="flex items-start gap-2 text-sm text-destructive">
            <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
            <span>Payment failed. Retry or manage via the Invoice Management tab.</span>
          </div>
        )}

        {/* Retry / Actions */}
        {(isMissing || isFailed) && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" size="sm" className="w-full" disabled={retryBillingMutation.isPending}>
                {retryBillingMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-1.5" />
                )}
                Retry Billing
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Retry billing for this placement?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will attempt to charge the provider's payment method or generate a new invoice if no payment method is on file.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={() => retryBillingMutation.mutate()}>
                  Retry Billing
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}

        {invoice?.receipt_url && (
          <Button variant="ghost" size="sm" className="w-full" asChild>
            <a href={invoice.receipt_url} target="_blank" rel="noopener noreferrer">
              <FileText className="h-4 w-4 mr-1.5" />
              View Receipt
            </a>
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
