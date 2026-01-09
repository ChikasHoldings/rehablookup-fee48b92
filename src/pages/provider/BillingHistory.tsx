import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSelectedFacility } from "@/contexts/SelectedFacilityContext";
import { format } from "date-fns";
import { 
  FileText, 
  Download, 
  Receipt, 
  Calendar,
  DollarSign,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  CreditCard,
  Filter,
  ChevronDown,
  ExternalLink,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Invoice {
  id: string;
  amount_cents: number;
  status: string;
  created_at: string;
  due_at: string | null;
  paid_at: string | null;
  fee_type: string | null;
  discount_percent: number | null;
  discount_reason: string | null;
  receipt_url: string | null;
  stripe_invoice_id: string | null;
  waived: boolean | null;
  inquiry_id: string | null;
}

interface CreditTransaction {
  id: string;
  amount_cents: number;
  transaction_type: string;
  description: string | null;
  created_at: string;
  stripe_payment_intent_id: string | null;
}

const STATUS_CONFIG: Record<string, { label: string; icon: typeof CheckCircle2; className: string }> = {
  paid: { label: "Paid", icon: CheckCircle2, className: "bg-emerald-100 text-emerald-700" },
  pending: { label: "Pending", icon: Clock, className: "bg-amber-100 text-amber-700" },
  overdue: { label: "Overdue", icon: AlertCircle, className: "bg-red-100 text-red-700" },
  failed: { label: "Failed", icon: XCircle, className: "bg-red-100 text-red-700" },
  waived: { label: "Waived", icon: CheckCircle2, className: "bg-muted text-muted-foreground" },
};

export default function BillingHistoryPage() {
  const { selectedFacility } = useSelectedFacility();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [yearFilter, setYearFilter] = useState<string>("all");

  // Fetch placement invoices
  const { data: invoices, isLoading: invoicesLoading } = useQuery({
    queryKey: ["billing-invoices", selectedFacility?.id],
    queryFn: async () => {
      if (!selectedFacility?.id) return [];
      const { data, error } = await supabase
        .from("placement_invoices")
        .select("*")
        .eq("facility_id", selectedFacility.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data || []) as Invoice[];
    },
    enabled: !!selectedFacility?.id,
  });

  // Fetch credit transactions
  const { data: transactions, isLoading: transactionsLoading } = useQuery({
    queryKey: ["billing-transactions", selectedFacility?.id],
    queryFn: async () => {
      if (!selectedFacility?.id) return [];
      const { data, error } = await supabase
        .from("credit_transactions")
        .select("*")
        .eq("facility_id", selectedFacility.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data || []) as CreditTransaction[];
    },
    enabled: !!selectedFacility?.id,
  });

  // Calculate summary stats
  const stats = {
    totalPaid: invoices?.filter(i => i.status === "paid").reduce((sum, i) => sum + i.amount_cents, 0) || 0,
    pendingAmount: invoices?.filter(i => i.status === "pending" || i.status === "overdue").reduce((sum, i) => sum + i.amount_cents, 0) || 0,
    totalDiscounts: invoices?.reduce((sum, i) => {
      if (i.discount_percent && i.discount_percent > 0) {
        const original = i.amount_cents / (1 - i.discount_percent / 100);
        return sum + (original - i.amount_cents);
      }
      return sum;
    }, 0) || 0,
    invoiceCount: invoices?.length || 0,
  };

  // Get unique years from invoices
  const years = [...new Set(invoices?.map(i => new Date(i.created_at).getFullYear()) || [])];

  // Filter invoices
  const filteredInvoices = invoices?.filter(invoice => {
    const matchesStatus = statusFilter === "all" || invoice.status === statusFilter;
    const matchesYear = yearFilter === "all" || new Date(invoice.created_at).getFullYear().toString() === yearFilter;
    return matchesStatus && matchesYear;
  }) || [];

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
  };

  const getStatusBadge = (status: string, waived: boolean | null) => {
    const effectiveStatus = waived ? "waived" : status;
    const config = STATUS_CONFIG[effectiveStatus] || STATUS_CONFIG.pending;
    const StatusIcon = config.icon;
    return (
      <Badge className={config.className}>
        <StatusIcon className="h-3 w-3 mr-1" />
        {config.label}
      </Badge>
    );
  };

  const downloadStatement = (period: string) => {
    // Generate CSV for the period
    const periodInvoices = invoices?.filter(inv => {
      const date = new Date(inv.created_at);
      if (period === "ytd") return date.getFullYear() === new Date().getFullYear();
      if (period === "last-year") return date.getFullYear() === new Date().getFullYear() - 1;
      return true;
    }) || [];

    const csv = [
      ["Date", "Invoice ID", "Amount", "Status", "Fee Type", "Discount", "Paid Date"].join(","),
      ...periodInvoices.map(inv => [
        format(new Date(inv.created_at), "yyyy-MM-dd"),
        inv.id.slice(0, 8).toUpperCase(),
        (inv.amount_cents / 100).toFixed(2),
        inv.waived ? "Waived" : inv.status,
        inv.fee_type || "flat_fee",
        inv.discount_percent ? `${inv.discount_percent}%` : "-",
        inv.paid_at ? format(new Date(inv.paid_at), "yyyy-MM-dd") : "-",
      ].join(","))
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `billing-statement-${period}-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (invoicesLoading) {
    return (
      <div className="min-h-full bg-background p-6">
        <div className="max-w-6xl mx-auto space-y-6">
          <Skeleton className="h-20 w-full" />
          <div className="grid gap-4 md:grid-cols-4">
            {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24" />)}
          </div>
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-background">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Billing History</h1>
            <p className="text-muted-foreground mt-1">
              View invoices, payment receipts, and download statements
            </p>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Download Statement
                <ChevronDown className="h-4 w-4 ml-2" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => downloadStatement("ytd")}>
                Year to Date ({new Date().getFullYear()})
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => downloadStatement("last-year")}>
                Last Year ({new Date().getFullYear() - 1})
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => downloadStatement("all")}>
                All Time
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-4 mb-8">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Paid</p>
                  <p className="text-xl font-bold text-foreground">{formatCurrency(stats.totalPaid)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-amber-100 flex items-center justify-center">
                  <Clock className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Pending</p>
                  <p className="text-xl font-bold text-foreground">{formatCurrency(stats.pendingAmount)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-violet-100 flex items-center justify-center">
                  <DollarSign className="h-5 w-5 text-violet-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Pro Savings</p>
                  <p className="text-xl font-bold text-foreground">{formatCurrency(stats.totalDiscounts)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <FileText className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Invoices</p>
                  <p className="text-xl font-bold text-foreground">{stats.invoiceCount}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="invoices" className="space-y-6">
          <TabsList>
            <TabsTrigger value="invoices">Placement Invoices</TabsTrigger>
            <TabsTrigger value="credits">Credit Transactions</TabsTrigger>
          </TabsList>

          {/* Invoices Tab */}
          <TabsContent value="invoices">
            <Card>
              <CardHeader className="pb-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <CardTitle>Placement Invoices</CardTitle>
                    <CardDescription>Fees for confirmed placements through the network</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="w-[140px]">
                        <Filter className="h-4 w-4 mr-2" />
                        <SelectValue placeholder="Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="paid">Paid</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="overdue">Overdue</SelectItem>
                        <SelectItem value="failed">Failed</SelectItem>
                      </SelectContent>
                    </Select>
                    {years.length > 0 && (
                      <Select value={yearFilter} onValueChange={setYearFilter}>
                        <SelectTrigger className="w-[120px]">
                          <Calendar className="h-4 w-4 mr-2" />
                          <SelectValue placeholder="Year" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Years</SelectItem>
                          {years.map(year => (
                            <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {filteredInvoices.length === 0 ? (
                  <div className="text-center py-12">
                    <FileText className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                    <p className="text-muted-foreground">No invoices found</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Invoice #</TableHead>
                          <TableHead>Fee Type</TableHead>
                          <TableHead className="text-right">Amount</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Due Date</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredInvoices.map((invoice) => (
                          <TableRow key={invoice.id}>
                            <TableCell className="whitespace-nowrap">
                              {format(new Date(invoice.created_at), "MMM d, yyyy")}
                            </TableCell>
                            <TableCell className="font-mono text-sm">
                              INV-{invoice.id.slice(0, 8).toUpperCase()}
                            </TableCell>
                            <TableCell>
                              <span className="capitalize">{invoice.fee_type?.replace("_", " ") || "Flat Fee"}</span>
                              {invoice.discount_percent && invoice.discount_percent > 0 && (
                                <Badge variant="secondary" className="ml-2 text-xs">
                                  {invoice.discount_percent}% off
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              {formatCurrency(invoice.amount_cents)}
                            </TableCell>
                            <TableCell>
                              {getStatusBadge(invoice.status, invoice.waived)}
                            </TableCell>
                            <TableCell className="whitespace-nowrap">
                              {invoice.due_at ? format(new Date(invoice.due_at), "MMM d, yyyy") : "—"}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                {invoice.receipt_url && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => window.open(invoice.receipt_url!, "_blank")}
                                  >
                                    <Receipt className="h-4 w-4 mr-1" />
                                    Receipt
                                  </Button>
                                )}
                                {invoice.status === "paid" && !invoice.receipt_url && (
                                  <Button variant="ghost" size="sm" disabled>
                                    <CheckCircle2 className="h-4 w-4 mr-1" />
                                    Paid
                                  </Button>
                                )}
                                {(invoice.status === "pending" || invoice.status === "failed") && (
                                  <Button variant="outline" size="sm">
                                    <CreditCard className="h-4 w-4 mr-1" />
                                    Pay Now
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Credit Transactions Tab */}
          <TabsContent value="credits">
            <Card>
              <CardHeader>
                <CardTitle>Credit Transactions</CardTitle>
                <CardDescription>History of credit purchases and lead unlock charges</CardDescription>
              </CardHeader>
              <CardContent>
                {transactionsLoading ? (
                  <div className="space-y-2">
                    {[1, 2, 3].map(i => <Skeleton key={i} className="h-12" />)}
                  </div>
                ) : transactions?.length === 0 ? (
                  <div className="text-center py-12">
                    <CreditCard className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                    <p className="text-muted-foreground">No transactions yet</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead className="text-right">Amount</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {transactions?.map((tx) => (
                          <TableRow key={tx.id}>
                            <TableCell className="whitespace-nowrap">
                              {format(new Date(tx.created_at), "MMM d, yyyy h:mm a")}
                            </TableCell>
                            <TableCell>
                              <Badge variant={tx.transaction_type === "purchase" ? "default" : "secondary"}>
                                {tx.transaction_type === "purchase" ? "Purchase" : "Debit"}
                              </Badge>
                            </TableCell>
                            <TableCell>{tx.description || "Credit transaction"}</TableCell>
                            <TableCell className={`text-right font-medium ${tx.transaction_type === "purchase" ? "text-emerald-600" : "text-foreground"}`}>
                              {tx.transaction_type === "purchase" ? "+" : "-"}{formatCurrency(Math.abs(tx.amount_cents))}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
