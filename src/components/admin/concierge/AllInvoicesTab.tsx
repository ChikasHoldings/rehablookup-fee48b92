import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  isInvoiceActionAllowed,
  explainInvoiceActionBlock,
  type InvoiceAction,
} from "@/lib/statusTransitions";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Search,
  DollarSign,
  MoreHorizontal,
  XCircle,
  Edit3,
  Mail,
  CheckCircle2,
  RefreshCw,
  Loader2,
  Receipt,
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

export function AllInvoicesTab() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [actionModal, setActionModal] = useState<"waive" | "override" | null>(null);
  const [waiveReason, setWaiveReason] = useState("");
  const [overrideAmount, setOverrideAmount] = useState("");
  const [overrideReason, setOverrideReason] = useState("");

  // Fetch all invoices with optimized caching
  const { data: invoices, isLoading, isFetching } = useQuery({
    queryKey: ["admin-all-invoices", statusFilter],
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
          facility_id,
          inquiry_id,
          facilities!inner(id, name),
          concierge_inquiries!inner(id, user_name, user_email)
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
      queryClient.invalidateQueries({ queryKey: ["admin-all-invoices"] });
      queryClient.invalidateQueries({ queryKey: ["admin-placement-invoices"] });
      queryClient.invalidateQueries({ queryKey: ["concierge-inquiries"] });
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

  const filteredInvoices = invoices?.filter((inv: any) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      inv.facilities?.name?.toLowerCase().includes(q) ||
      inv.concierge_inquiries?.user_name?.toLowerCase().includes(q) ||
      inv.concierge_inquiries?.user_email?.toLowerCase().includes(q)
    );
  });

  const stats = {
    total: invoices?.length || 0,
    pending: invoices?.filter((i: any) => i.status === "pending" || i.status === "sent").length || 0,
    paid: invoices?.filter((i: any) => i.status === "paid").length || 0,
    totalRevenue: invoices?.filter((i: any) => i.status === "paid")
      .reduce((sum: number, i: any) => sum + (i.override_amount_cents || i.amount_cents), 0) || 0,
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex gap-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-20 flex-1" />)}
        </div>
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Stats Summary */}
      <div className="grid grid-cols-4 gap-4">
        <div className="p-4 rounded-lg border bg-card">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
            <Receipt className="h-4 w-4" />
            Total Invoices
          </div>
          <p className="text-2xl font-bold">{stats.total}</p>
        </div>
        <div className="p-4 rounded-lg border bg-card">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
            <RefreshCw className="h-4 w-4 text-warning" />
            Pending
          </div>
          <p className="text-2xl font-bold text-warning">{stats.pending}</p>
        </div>
        <div className="p-4 rounded-lg border bg-card">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
            <CheckCircle2 className="h-4 w-4 text-success" />
            Paid
          </div>
          <p className="text-2xl font-bold text-success">{stats.paid}</p>
        </div>
        <div className="p-4 rounded-lg border bg-card">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
            <DollarSign className="h-4 w-4 text-primary" />
            Revenue
          </div>
          <p className="text-2xl font-bold text-primary">{formatCurrency(stats.totalRevenue)}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search invoices..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="sent">Sent</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
            <SelectItem value="overdue">Overdue</SelectItem>
            <SelectItem value="waived">Waived</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-sm text-muted-foreground ml-auto flex items-center gap-2">
          {isFetching && !isLoading && (
            <Loader2 className="h-3 w-3 animate-spin" />
          )}
          {filteredInvoices?.length || 0} invoices
        </span>
      </div>

      {/* Invoices Table */}
      <div className="border rounded-lg">
        <ScrollArea className="h-[500px]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Amount</TableHead>
                <TableHead>Provider</TableHead>
                <TableHead>Case</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Due</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredInvoices?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No invoices found
                  </TableCell>
                </TableRow>
              ) : (
                filteredInvoices?.map((invoice: any) => (
                  <TableRow key={invoice.id}>
                    <TableCell>
                      <div>
                        <span className="font-medium">
                          {formatCurrency(invoice.override_amount_cents || invoice.amount_cents)}
                        </span>
                        {invoice.override_amount_cents && (
                          <span className="text-xs text-muted-foreground line-through ml-2">
                            {formatCurrency(invoice.amount_cents)}
                          </span>
                        )}
                        {invoice.discount_percent > 0 && (
                          <Badge variant="outline" className="ml-2 text-xs text-success">
                            -{invoice.discount_percent}%
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <p className="font-medium">{invoice.facilities?.name || "Unknown"}</p>
                    </TableCell>
                    <TableCell>
                      <p className="text-sm">{invoice.concierge_inquiries?.user_name || "Unknown"}</p>
                      <p className="text-xs text-muted-foreground">{invoice.concierge_inquiries?.user_email}</p>
                    </TableCell>
                    <TableCell>
                      <Badge variant={STATUS_CONFIG[invoice.status]?.variant || "secondary"}>
                        {STATUS_CONFIG[invoice.status]?.label || invoice.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(new Date(invoice.created_at), "MMM d, yyyy")}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {invoice.due_at
                        ? format(new Date(invoice.due_at), "MMM d, yyyy")
                        : "—"}
                    </TableCell>
                    <TableCell>
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
                                setOverrideAmount(
                                  ((invoice.override_amount_cents || invoice.amount_cents) / 100).toString()
                                );
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
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </ScrollArea>
      </div>

      {/* Waive Modal */}
      <Dialog open={actionModal === "waive"} onOpenChange={(open) => !open && setActionModal(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Waive Invoice</DialogTitle>
            <DialogDescription>
              This will mark the invoice as waived and no payment will be collected.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Reason for waiving</Label>
              <Textarea
                value={waiveReason}
                onChange={(e) => setWaiveReason(e.target.value)}
                placeholder="Enter reason..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActionModal(null)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (!selectedInvoice || !waiveReason.trim()) return;
                manageMutation.mutate({
                  invoiceId: selectedInvoice.id,
                  action: "waive",
                  reason: waiveReason,
                });
              }}
              disabled={!waiveReason.trim() || manageMutation.isPending}
            >
              {manageMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Waive Invoice
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Override Amount Modal */}
      <Dialog open={actionModal === "override"} onOpenChange={(open) => !open && setActionModal(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Override Invoice Amount</DialogTitle>
            <DialogDescription>Adjust the invoice amount and provide a reason.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>New Amount ($)</Label>
              <Input
                type="number"
                value={overrideAmount}
                onChange={(e) => setOverrideAmount(e.target.value)}
                placeholder="0.00"
                step="0.01"
                min="0"
              />
            </div>
            <div className="space-y-2">
              <Label>Reason</Label>
              <Textarea
                value={overrideReason}
                onChange={(e) => setOverrideReason(e.target.value)}
                placeholder="Enter reason for adjustment..."
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActionModal(null)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (!selectedInvoice || !overrideAmount || !overrideReason.trim()) return;
                const amountCents = Math.round(parseFloat(overrideAmount) * 100);
                manageMutation.mutate({
                  invoiceId: selectedInvoice.id,
                  action: "override",
                  reason: overrideReason,
                  newAmount: amountCents,
                });
              }}
              disabled={!overrideAmount || !overrideReason.trim() || manageMutation.isPending}
            >
              {manageMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Update Amount
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
