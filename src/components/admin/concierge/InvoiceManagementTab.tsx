import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
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
  DollarSign,
  MoreHorizontal,
  XCircle,
  Edit3,
  Mail,
  CheckCircle2,
  RefreshCw,
  Loader2,
  FileText,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";

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

export function InvoiceManagementTab() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [actionModal, setActionModal] = useState<"waive" | "override" | null>(null);
  const [waiveReason, setWaiveReason] = useState("");
  const [overrideAmount, setOverrideAmount] = useState("");
  const [overrideReason, setOverrideReason] = useState("");

  // Fetch invoices
  const { data: invoices, isLoading } = useQuery({
    queryKey: ["admin-placement-invoices", statusFilter],
    queryFn: async () => {
      let query = (supabase as any)
        .from("placement_invoices")
        .select(`
          *,
          facilities(id, name),
          concierge_inquiries(id, user_name, user_email)
        `)
        .order("created_at", { ascending: false })
        .limit(50);

      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });

  // Admin manage invoice mutation
  const manageMutation = useMutation({
    mutationFn: async ({
      invoiceId,
      action,
      reason,
      newAmount,
    }: {
      invoiceId: string;
      action: "waive" | "override" | "mark_paid" | "send_reminder" | "retry_charge";
      reason?: string;
      newAmount?: number;
    }) => {
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
      queryClient.invalidateQueries({ queryKey: ["admin-placement-invoices"] });
      setActionModal(null);
      setSelectedInvoice(null);
      setWaiveReason("");
      setOverrideAmount("");
      setOverrideReason("");
    },
    onError: (error) => {
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
                Placement Invoices
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
                            <Badge variant="outline" className="text-amber-600 border-amber-300">
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
                            <span className="text-emerald-600">
                              Paid {format(new Date(invoice.paid_at), "MMM d, yyyy")}
                            </span>
                          )}
                        </div>
                        {invoice.discount_percent > 0 && (
                          <p className="text-xs text-emerald-600">
                            {invoice.discount_percent}% discount ({invoice.discount_reason || "Pro"})
                          </p>
                        )}
                      </div>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {invoice.status !== "paid" && invoice.status !== "waived" && (
                            <>
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
                            </>
                          )}
                          <DropdownMenuItem disabled>
                            <FileText className="mr-2 h-4 w-4" />
                            View Details
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          ) : (
            <div className="text-center py-12">
              <DollarSign className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">No invoices found</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Waive Modal */}
      <Dialog open={actionModal === "waive"} onOpenChange={() => setActionModal(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
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
