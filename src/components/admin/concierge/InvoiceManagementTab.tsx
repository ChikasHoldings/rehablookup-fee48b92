import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  isInvoiceActionAllowed,
  explainInvoiceActionBlock,
  type InvoiceAction,
} from "@/lib/statusTransitions";
import { format } from "date-fns";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
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
import {
  DollarSign,
  MoreHorizontal,
  XCircle,
  Edit3,
  Mail,
  CheckCircle2,
  RefreshCw,
  Loader2,
  AlertTriangle,
  CreditCard,
  Building2,
} from "lucide-react";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";

type ConciergeInquiry = Database["public"]["Tables"]["concierge_inquiries"]["Row"];

function formatCurrency(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

const STATUS_CONFIG: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending: { label: "Pending", variant: "secondary" },
  sent: { label: "Sent", variant: "outline" },
  paid: { label: "Paid", variant: "default" },
  overdue: { label: "Overdue", variant: "destructive" },
  waived: { label: "Waived", variant: "secondary" },
  failed: { label: "Failed", variant: "destructive" },
};

interface InvoiceManagementTabProps {
  caseData?: ConciergeInquiry;
}

export function InvoiceManagementTab({ caseData }: InvoiceManagementTabProps) {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [actionModal, setActionModal] = useState<"waive" | "override" | null>(null);
  const [waiveReason, setWaiveReason] = useState("");
  const [overrideAmount, setOverrideAmount] = useState("");
  const [overrideReason, setOverrideReason] = useState("");
  const [selectedFacilityForCharge, setSelectedFacilityForCharge] = useState<string>("");
  const [isCharging, setIsCharging] = useState(false);

  // Fetch matched facilities for this case (for manual charge)
  const { data: matchedFacilities } = useQuery({
    queryKey: ["matched-facilities", caseData?.matched_facility_ids],
    queryFn: async () => {
      if (!caseData?.matched_facility_ids?.length) return [];
      const { data, error } = await supabase
        .from("facilities")
        .select("id, name")
        .in("id", caseData.matched_facility_ids);
      if (error) throw error;
      return data || [];
    },
    enabled: !!caseData?.matched_facility_ids?.length,
  });

  // Fetch invoices - scoped to case if provided with optimized caching
  const { data: invoices, isLoading, isFetching } = useQuery({
    queryKey: ["admin-placement-invoices", statusFilter, caseData?.id],
    queryFn: async () => {
      let query = supabase
        .from("placement_invoices")
        .select(`
          id,
          amount_cents,
          override_amount_cents,
          status,
          created_at,
          due_at,
          paid_at,
          discount_percent,
          waived,
          discount_reason,
          facility_id,
          inquiry_id,
          facilities!inner(id, name),
          concierge_inquiries!inner(id, user_name, user_email)
        `)
        .order("created_at", { ascending: false })
        .limit(50);

      // If caseData is provided, scope to that inquiry
      if (caseData?.id) {
        query = query.eq("inquiry_id", caseData.id);
      }

      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    staleTime: 60 * 1000, // Data stays fresh for 60 seconds
    gcTime: 10 * 60 * 1000, // Cache for 10 minutes
    placeholderData: (previousData) => previousData, // Show stale data while fetching
  });

  // Admin manage invoice mutation
  const manageMutation = useMutation({
    mutationFn: async ({
      invoiceId,
      action,
      reason,
      newAmount,
      currentStatus,
    }: {
      invoiceId: string;
      action: InvoiceAction;
      reason?: string;
      newAmount?: number;
      currentStatus: string;
    }) => {
      // Client-side guard mirrors validate_invoice_status_transition + admin-manage-invoice gating.
      const block = explainInvoiceActionBlock(action, currentStatus);
      if (block) throw new Error(block);

      const response = await supabase.functions.invoke("admin-manage-invoice", {
        body: { invoiceId, action, reason, newAmount },
      });
      if (response.error) throw response.error;
      return response.data;
    },
    onSuccess: (data, variables) => {
      const messages: Record<string, string> = {
        waive: "Invoice waived successfully",
        override: "Invoice amount updated",
        mark_paid: "Invoice marked as paid",
        send_reminder: "Payment reminder sent",
        retry_charge: "Payment retry initiated",
      };
      toast.success(messages[variables.action]);
      // Invalidate all invoice-related queries to ensure fresh data
      queryClient.invalidateQueries({ queryKey: ["admin-placement-invoices"] });
      queryClient.invalidateQueries({ queryKey: ["admin-all-invoices"] });
      queryClient.invalidateQueries({ queryKey: ["concierge-inquiries"] });
      setActionModal(null);
      setSelectedInvoice(null);
      setWaiveReason("");
      setOverrideAmount("");
      setOverrideReason("");
    },
    onError: (error: any) => {
      toast.error("Action failed", { description: error.message });
    },
  });

  const handleWaive = () => {
    if (!selectedInvoice || !waiveReason.trim()) return;
    manageMutation.mutate({
      invoiceId: selectedInvoice.id,
      action: "waive",
      reason: waiveReason,
    });
  };

  const handleOverride = () => {
    if (!selectedInvoice || !overrideAmount || !overrideReason.trim()) return;
    const amountCents = Math.round(parseFloat(overrideAmount) * 100);
    manageMutation.mutate({
      invoiceId: selectedInvoice.id,
      action: "override",
      reason: overrideReason,
      newAmount: amountCents,
    });
  };

  // Manual charge initiation
  const handleInitiateCharge = async () => {
    if (!caseData || !selectedFacilityForCharge) return;
    
    setIsCharging(true);
    try {
      const response = await supabase.functions.invoke("charge-placement-fee", {
        body: {
          inquiryId: caseData.id,
          facilityId: selectedFacilityForCharge,
          feeType: "flat_fee",
          adminInitiated: true,
        },
      });

      if (response.error) throw response.error;

      toast.success("Charge initiated successfully", {
        description: response.data?.charged 
          ? `Payment of ${formatCurrency(response.data.amountCents)} processed`
          : "Invoice created for manual payment",
      });
      
      queryClient.invalidateQueries({ queryKey: ["admin-placement-invoices"] });
      queryClient.invalidateQueries({ queryKey: ["concierge-inquiries"] });
      setSelectedFacilityForCharge("");
    } catch (error: any) {
      toast.error("Charge failed", { description: error.message });
    } finally {
      setIsCharging(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Placement Invoices</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                {caseData ? "Case Invoices" : "Placement Invoices"}
              </CardTitle>
              <CardDescription>Manage billing for confirmed placements</CardDescription>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Invoices</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="sent">Sent</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="overdue">Overdue</SelectItem>
                <SelectItem value="waived">Waived</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {invoices && invoices.length > 0 ? (
            <ScrollArea className="h-[500px]">
              <div className="space-y-3">
                {invoices.map((invoice: any) => (
                  <div
                    key={invoice.id}
                    className="p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">
                            {formatCurrency(invoice.override_amount_cents || invoice.amount_cents)}
                          </span>
                          {invoice.override_amount_cents && (
                            <span className="text-sm text-muted-foreground line-through">
                              {formatCurrency(invoice.amount_cents)}
                            </span>
                          )}
                          <Badge variant={STATUS_CONFIG[invoice.status]?.variant || "secondary"}>
                            {STATUS_CONFIG[invoice.status]?.label || invoice.status}
                          </Badge>
                          {invoice.waived && (
                            <Badge variant="outline" className="text-warning border-warning/30">
                              Waived
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {invoice.facilities?.name || "Unknown Facility"} •{" "}
                          {invoice.concierge_inquiries?.user_name || "Unknown Case"}
                        </p>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span>Created {format(new Date(invoice.created_at), "MMM d, yyyy")}</span>
                          {invoice.due_at && (
                            <span>
                              Due {format(new Date(invoice.due_at), "MMM d, yyyy")}
                            </span>
                          )}
                          {invoice.paid_at && (
                            <span className="text-success">
                              Paid {format(new Date(invoice.paid_at), "MMM d, yyyy")}
                            </span>
                          )}
                        </div>
                        {invoice.discount_percent > 0 && (
                          <p className="text-xs text-success">
                            {invoice.discount_percent}% discount ({invoice.discount_reason || "Pro"})
                          </p>
                        )}
                      </div>

                      {invoice.status !== "paid" && invoice.status !== "waived" && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => {
                                setSelectedInvoice(invoice);
                                setActionModal("waive");
                              }}
                            >
                              <XCircle className="mr-2 h-4 w-4" />
                              Waive Fee
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => {
                                setSelectedInvoice(invoice);
                                setOverrideAmount(((invoice.override_amount_cents || invoice.amount_cents) / 100).toString());
                                setActionModal("override");
                              }}
                            >
                              <Edit3 className="mr-2 h-4 w-4" />
                              Override Amount
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() =>
                                manageMutation.mutate({
                                  invoiceId: invoice.id,
                                  action: "mark_paid",
                                })
                              }
                            >
                              <CheckCircle2 className="mr-2 h-4 w-4" />
                              Mark as Paid
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() =>
                                manageMutation.mutate({
                                  invoiceId: invoice.id,
                                  action: "send_reminder",
                                })
                              }
                            >
                              <Mail className="mr-2 h-4 w-4" />
                              Send Reminder
                            </DropdownMenuItem>
                            {invoice.status === "failed" && (
                              <DropdownMenuItem
                                onClick={() =>
                                  manageMutation.mutate({
                                    invoiceId: invoice.id,
                                    action: "retry_charge",
                                  })
                                }
                              >
                                <RefreshCw className="mr-2 h-4 w-4" />
                                Retry Payment
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          ) : (
            <div className="text-center py-8">
              <DollarSign className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">
                {caseData ? "No invoices for this case yet" : "No invoices found"}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Admin Manual Charge Section - Only show for case view with matched facilities */}
      {caseData && matchedFacilities && matchedFacilities.length > 0 && (
        <Card className="border-primary/30 bg-primary/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              Initiate Charge
            </CardTitle>
            <CardDescription className="text-xs">
              Manually charge provider after confirming placement via phone/email
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <Label className="text-xs">Select Facility to Charge</Label>
              <Select value={selectedFacilityForCharge} onValueChange={setSelectedFacilityForCharge}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Select facility..." />
                </SelectTrigger>
                <SelectContent>
                  {matchedFacilities.map((facility: any) => (
                    <SelectItem key={facility.id} value={facility.id}>
                      <div className="flex items-center gap-2">
                        <Building2 className="h-3 w-3" />
                        {facility.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button 
                  size="sm" 
                  className="w-full"
                  disabled={!selectedFacilityForCharge || isCharging}
                >
                  {isCharging ? (
                    <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                  ) : (
                    <CreditCard className="mr-2 h-3 w-3" />
                  )}
                  Charge Provider
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Confirm Placement & Charge</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will mark the placement as confirmed and charge the provider's saved payment method.
                    Use this when you've confirmed placement via phone or email.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <div className="py-3 px-1 text-sm">
                  <p className="text-muted-foreground">
                    <strong>Facility:</strong>{" "}
                    {matchedFacilities.find((f: any) => f.id === selectedFacilityForCharge)?.name}
                  </p>
                  <p className="text-muted-foreground mt-1">
                    <strong>Fee:</strong> $1,000 (or $800 with Pro discount)
                  </p>
                </div>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleInitiateCharge}>
                    Confirm & Charge
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            <p className="text-[10px] text-muted-foreground">
              If provider has no payment method, an invoice will be created for manual collection.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Waive Modal */}
      <Dialog open={actionModal === "waive"} onOpenChange={() => setActionModal(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-warning" />
              Waive Invoice
            </DialogTitle>
            <DialogDescription>
              This will permanently waive the fee for this placement. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {selectedInvoice && (
              <div className="rounded-lg border p-3 bg-muted/50">
                <p className="font-medium">{formatCurrency(selectedInvoice.amount_cents)}</p>
                <p className="text-sm text-muted-foreground">
                  {selectedInvoice.facilities?.name}
                </p>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="waive-reason">Reason for waiving *</Label>
              <Textarea
                id="waive-reason"
                placeholder="Enter the reason for waiving this fee..."
                value={waiveReason}
                onChange={(e) => setWaiveReason(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActionModal(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleWaive}
              disabled={!waiveReason.trim() || manageMutation.isPending}
            >
              {manageMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Waive Invoice
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Override Modal */}
      <Dialog open={actionModal === "override"} onOpenChange={() => setActionModal(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit3 className="h-5 w-5" />
              Override Invoice Amount
            </DialogTitle>
            <DialogDescription>
              Change the amount due for this invoice.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {selectedInvoice && (
              <div className="rounded-lg border p-3 bg-muted/50">
                <p className="text-sm text-muted-foreground">Original amount</p>
                <p className="font-medium">{formatCurrency(selectedInvoice.amount_cents)}</p>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="override-amount">New Amount ($) *</Label>
              <Input
                id="override-amount"
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={overrideAmount}
                onChange={(e) => setOverrideAmount(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="override-reason">Reason *</Label>
              <Textarea
                id="override-reason"
                placeholder="Enter the reason for this adjustment..."
                value={overrideReason}
                onChange={(e) => setOverrideReason(e.target.value)}
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActionModal(null)}>
              Cancel
            </Button>
            <Button
              onClick={handleOverride}
              disabled={!overrideAmount || !overrideReason.trim() || manageMutation.isPending}
            >
              {manageMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Update Amount
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
