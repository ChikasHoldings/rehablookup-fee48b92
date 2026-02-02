import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  Search,
  RefreshCw,
  Globe,
  Users,
  Receipt,
  DollarSign,
  Building2,
  CheckCircle,
  Clock,
  AlertCircle,
  ArrowRight,
  Loader2,
  CreditCard,
  XCircle,
} from "lucide-react";
import { format } from "date-fns";

type CaseStatus = 'new' | 'reviewing' | 'matching' | 'matched' | 'introductions_sent' | 'in_contact' | 'admitted' | 'closed' | 'all';

const STATUS_CONFIG: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: React.ElementType }> = {
  new: { label: "New", variant: "default", icon: AlertCircle },
  reviewing: { label: "Reviewing", variant: "secondary", icon: Clock },
  matching: { label: "Matching", variant: "secondary", icon: Search },
  matched: { label: "Matched", variant: "outline", icon: CheckCircle },
  introductions_sent: { label: "Intros Sent", variant: "outline", icon: ArrowRight },
  in_contact: { label: "In Contact", variant: "secondary", icon: Users },
  admitted: { label: "Admitted", variant: "default", icon: Building2 },
  closed: { label: "Closed", variant: "destructive", icon: XCircle },
};

const INVOICE_STATUS_CONFIG: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending: { label: "Pending", variant: "outline" },
  sent: { label: "Sent", variant: "secondary" },
  paid: { label: "Paid", variant: "default" },
  overdue: { label: "Overdue", variant: "destructive" },
  waived: { label: "Waived", variant: "secondary" },
};

interface InternationalCase {
  id: string;
  client_name: string;
  client_email: string;
  client_phone: string;
  client_country: string;
  status: string;
  payment_status: string;
  payment_amount_cents: number;
  refund_type: string | null;
  intake_data: Record<string, unknown>;
  intake_submitted_at: string | null;
  assigned_advisor_id: string | null;
  admin_notes: string | null;
  matched_facility_ids: string[] | null;
  accepted_facility_id: string | null;
  admission_confirmed_at: string | null;
  facility_fee_cents: number | null;
  facility_fee_status: string | null;
  created_at: string;
}

interface InternationalInvoice {
  id: string;
  case_id: string;
  facility_id: string;
  provider_id: string;
  amount_cents: number;
  status: string;
  issued_at: string | null;
  paid_at: string | null;
  waive_reason: string | null;
  created_at: string;
  facility?: { name: string };
  case?: { client_name: string; client_country: string };
}

export default function AdminInternational() {
  const [activeTab, setActiveTab] = useState("cases");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<CaseStatus>("all");
  const [selectedCase, setSelectedCase] = useState<InternationalCase | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [actionDialog, setActionDialog] = useState<{ type: string; caseId?: string; invoiceId?: string } | null>(null);
  const [actionNotes, setActionNotes] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");
  const [refundType, setRefundType] = useState<"refunded" | "credited">("refunded");

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch cases
  const { data: cases, isLoading: casesLoading, refetch: refetchCases } = useQuery({
    queryKey: ["admin-international-cases", statusFilter],
    queryFn: async () => {
      let query = supabase
        .from("international_placement_cases")
        .select("*")
        .order("created_at", { ascending: false });

      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as InternationalCase[];
    },
  });

  // Fetch invoices
  const { data: invoices, isLoading: invoicesLoading, refetch: refetchInvoices } = useQuery({
    queryKey: ["admin-international-invoices"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("international_facility_invoices")
        .select(`
          *,
          facility:facilities(name),
          case:international_placement_cases(client_name, client_country)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as unknown as InternationalInvoice[];
    },
  });

  // Fetch stats
  const { data: stats } = useQuery({
    queryKey: ["admin-international-stats"],
    queryFn: async () => {
      const { data: casesData } = await supabase
        .from("international_placement_cases")
        .select("status, payment_amount_cents, facility_fee_status");

      const counts: Record<string, number> = {
        new: 0,
        reviewing: 0,
        matching: 0,
        matched: 0,
        admitted: 0,
        closed: 0,
        total_revenue: 0,
        pending_invoices: 0,
      };

      casesData?.forEach((c) => {
        if (counts[c.status] !== undefined) counts[c.status]++;
        if (c.payment_amount_cents) counts.total_revenue += c.payment_amount_cents;
      });

      const { data: invoiceData } = await supabase
        .from("international_facility_invoices")
        .select("status, amount_cents");

      invoiceData?.forEach((inv) => {
        if (inv.status === "pending" || inv.status === "sent") {
          counts.pending_invoices += inv.amount_cents;
        }
        if (inv.status === "paid") {
          counts.total_revenue += inv.amount_cents;
        }
      });

      return counts;
    },
  });

  // Manage case mutation
  const manageCaseMutation = useMutation({
    mutationFn: async ({ action, caseId, data }: { action: string; caseId?: string; data?: Record<string, unknown> }) => {
      const { data: result, error } = await supabase.functions.invoke("manage-international-case", {
        body: { action, caseId, data },
      });
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Action completed successfully." });
      queryClient.invalidateQueries({ queryKey: ["admin-international-cases"] });
      queryClient.invalidateQueries({ queryKey: ["admin-international-invoices"] });
      queryClient.invalidateQueries({ queryKey: ["admin-international-stats"] });
      setActionDialog(null);
      setDetailOpen(false);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Action failed",
        variant: "destructive",
      });
    },
  });

  const filteredCases = cases?.filter((c) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      c.client_name?.toLowerCase().includes(q) ||
      c.client_email?.toLowerCase().includes(q) ||
      c.client_country?.toLowerCase().includes(q)
    );
  });

  const handleStatusChange = () => {
    if (!selectedCase || !selectedStatus) return;
    manageCaseMutation.mutate({
      action: "update_status",
      caseId: selectedCase.id,
      data: { status: selectedStatus, notes: actionNotes },
    });
  };

  const handleRefundCredit = () => {
    if (!selectedCase) return;
    manageCaseMutation.mutate({
      action: "refund_client_fee",
      caseId: selectedCase.id,
      data: { refundType },
    });
  };

  const handleChargeInvoice = (invoiceId: string) => {
    manageCaseMutation.mutate({
      action: "charge_facility_invoice",
      data: { invoiceId },
    });
  };

  const handleWaiveInvoice = (invoiceId: string) => {
    manageCaseMutation.mutate({
      action: "waive_facility_invoice",
      data: { invoiceId, reason: actionNotes },
    });
  };

  return (
    <div className="space-y-5">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Globe className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-semibold tracking-tight">International Placements</h1>
            <p className="text-sm text-muted-foreground">Manage global client placements and facility invoices</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={() => { refetchCases(); refetchInvoices(); }}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="text-2xl font-bold">{stats?.new || 0}</div>
            <p className="text-xs text-muted-foreground">New Cases</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="text-2xl font-bold">{stats?.reviewing || 0}</div>
            <p className="text-xs text-muted-foreground">In Review</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="text-2xl font-bold">{stats?.admitted || 0}</div>
            <p className="text-xs text-muted-foreground">Admitted</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="text-2xl font-bold text-green-600">
              ${((stats?.total_revenue || 0) / 100).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">Total Revenue</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="text-2xl font-bold text-amber-600">
              ${((stats?.pending_invoices || 0) / 100).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">Pending Invoices</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-2 max-w-xs">
          <TabsTrigger value="cases" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Cases
          </TabsTrigger>
          <TabsTrigger value="invoices" className="flex items-center gap-2">
            <Receipt className="h-4 w-4" />
            Invoices
          </TabsTrigger>
        </TabsList>

        {/* Cases Tab */}
        <TabsContent value="cases" className="space-y-4">
          <Card>
            <div className="flex items-center justify-between p-4 border-b">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by name, email, country..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 w-[280px]"
                  />
                </div>
                <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as CaseStatus)}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="All statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                      <SelectItem key={key} value={key}>{config.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <span className="text-sm text-muted-foreground">
                {filteredCases?.length || 0} cases
              </span>
            </div>
            <div className="p-4">
              {casesLoading ? (
                <div className="text-center py-8 text-muted-foreground">Loading...</div>
              ) : filteredCases?.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">No cases found</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b text-left text-sm text-muted-foreground">
                        <th className="pb-3 font-medium">Client</th>
                        <th className="pb-3 font-medium">Country</th>
                        <th className="pb-3 font-medium">Payment</th>
                        <th className="pb-3 font-medium">Status</th>
                        <th className="pb-3 font-medium">Facility Fee</th>
                        <th className="pb-3 font-medium">Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredCases?.map((c) => (
                        <tr
                          key={c.id}
                          className="border-b last:border-0 hover:bg-muted/50 cursor-pointer transition-colors"
                          onClick={() => { setSelectedCase(c); setDetailOpen(true); }}
                        >
                          <td className="py-3">
                            <div className="font-medium">{c.client_name}</div>
                            <div className="text-xs text-muted-foreground">{c.client_email}</div>
                          </td>
                          <td className="py-3">
                            <div className="flex items-center gap-1.5">
                              <Globe className="h-3.5 w-3.5 text-muted-foreground" />
                              {c.client_country}
                            </div>
                          </td>
                          <td className="py-3">
                            <Badge variant={c.payment_status === "paid" ? "default" : "secondary"}>
                              ${(c.payment_amount_cents / 100).toFixed(0)} - {c.payment_status}
                            </Badge>
                          </td>
                          <td className="py-3">
                            <Badge variant={STATUS_CONFIG[c.status]?.variant || "secondary"}>
                              {STATUS_CONFIG[c.status]?.label || c.status}
                            </Badge>
                          </td>
                          <td className="py-3">
                            {c.facility_fee_cents ? (
                              <Badge variant={c.facility_fee_status === "paid" ? "default" : "outline"}>
                                ${(c.facility_fee_cents / 100).toLocaleString()} - {c.facility_fee_status || "pending"}
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground text-sm">—</span>
                            )}
                          </td>
                          <td className="py-3 text-sm text-muted-foreground">
                            {format(new Date(c.created_at), "MMM d, yyyy")}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </Card>
        </TabsContent>

        {/* Invoices Tab */}
        <TabsContent value="invoices" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Facility Invoices ($4,500 per admission)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {invoicesLoading ? (
                <div className="text-center py-8 text-muted-foreground">Loading...</div>
              ) : invoices?.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">No invoices yet</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b text-left text-sm text-muted-foreground">
                        <th className="pb-3 font-medium">Client</th>
                        <th className="pb-3 font-medium">Facility</th>
                        <th className="pb-3 font-medium">Amount</th>
                        <th className="pb-3 font-medium">Status</th>
                        <th className="pb-3 font-medium">Date</th>
                        <th className="pb-3 font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {invoices?.map((inv) => (
                        <tr key={inv.id} className="border-b last:border-0">
                          <td className="py-3">
                            <div className="font-medium">{inv.case?.client_name || "—"}</div>
                            <div className="text-xs text-muted-foreground">{inv.case?.client_country}</div>
                          </td>
                          <td className="py-3">{inv.facility?.name || "—"}</td>
                          <td className="py-3 font-medium">
                            ${(inv.amount_cents / 100).toLocaleString()}
                          </td>
                          <td className="py-3">
                            <Badge variant={INVOICE_STATUS_CONFIG[inv.status]?.variant || "secondary"}>
                              {INVOICE_STATUS_CONFIG[inv.status]?.label || inv.status}
                            </Badge>
                          </td>
                          <td className="py-3 text-sm text-muted-foreground">
                            {inv.issued_at ? format(new Date(inv.issued_at), "MMM d, yyyy") : "—"}
                          </td>
                          <td className="py-3">
                            {(inv.status === "pending" || inv.status === "sent") && (
                              <div className="flex items-center gap-2">
                                <Button
                                  size="sm"
                                  variant="default"
                                  onClick={() => handleChargeInvoice(inv.id)}
                                  disabled={manageCaseMutation.isPending}
                                >
                                  <CreditCard className="h-3 w-3 mr-1" />
                                  Charge
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => setActionDialog({ type: "waive", invoiceId: inv.id })}
                                >
                                  Waive
                                </Button>
                              </div>
                            )}
                            {inv.status === "paid" && (
                              <span className="text-green-600 text-sm flex items-center gap-1">
                                <CheckCircle className="h-3 w-3" /> Paid
                              </span>
                            )}
                            {inv.status === "waived" && (
                              <span className="text-muted-foreground text-sm">{inv.waive_reason}</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Case Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {selectedCase && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Globe className="h-5 w-5" />
                  {selectedCase.client_name}
                </DialogTitle>
                <DialogDescription>
                  {selectedCase.client_email} • {selectedCase.client_country}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                {/* Status & Payment Info */}
                <div className="flex flex-wrap gap-2">
                  <Badge variant={STATUS_CONFIG[selectedCase.status]?.variant}>
                    {STATUS_CONFIG[selectedCase.status]?.label}
                  </Badge>
                  <Badge variant={selectedCase.payment_status === "paid" ? "default" : "outline"}>
                    $299 {selectedCase.payment_status}
                  </Badge>
                  {selectedCase.refund_type && (
                    <Badge variant="secondary">Fee {selectedCase.refund_type}</Badge>
                  )}
                </div>

                {/* Intake Data */}
                {selectedCase.intake_data && Object.keys(selectedCase.intake_data).length > 0 && (
                  <div className="bg-muted/30 rounded-lg p-4">
                    <h4 className="font-medium mb-2">Intake Information</h4>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      {Object.entries(selectedCase.intake_data).map(([key, value]) => (
                        <div key={key}>
                          <span className="text-muted-foreground capitalize">{key.replace(/_/g, " ")}:</span>{" "}
                          <span className="font-medium">{String(value)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Admin Notes */}
                {selectedCase.admin_notes && (
                  <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
                    <p className="text-sm"><strong>Notes:</strong> {selectedCase.admin_notes}</p>
                  </div>
                )}

                {/* Actions */}
                <div className="border-t pt-4 space-y-3">
                  <h4 className="font-medium">Actions</h4>
                  
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setActionDialog({ type: "status", caseId: selectedCase.id })}
                    >
                      Update Status
                    </Button>

                    {selectedCase.payment_status === "paid" && !selectedCase.refund_type && selectedCase.status === "admitted" && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setActionDialog({ type: "refund", caseId: selectedCase.id })}
                      >
                        Refund/Credit $299
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Action Dialogs */}
      <Dialog open={actionDialog?.type === "status"} onOpenChange={() => setActionDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Case Status</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>New Status</Label>
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Select status..." />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                    <SelectItem key={key} value={key}>{config.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Notes (optional)</Label>
              <Textarea
                value={actionNotes}
                onChange={(e) => setActionNotes(e.target.value)}
                placeholder="Add any notes..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActionDialog(null)}>Cancel</Button>
            <Button onClick={handleStatusChange} disabled={!selectedStatus || manageCaseMutation.isPending}>
              {manageCaseMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Update Status
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={actionDialog?.type === "refund"} onOpenChange={() => setActionDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Refund or Credit Client Fee</DialogTitle>
            <DialogDescription>
              The client paid $299 for placement coordination. Upon confirmed admission, this can be refunded or credited.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Resolution Type</Label>
              <Select value={refundType} onValueChange={(v) => setRefundType(v as "refunded" | "credited")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="refunded">Refund to original payment method</SelectItem>
                  <SelectItem value="credited">Credit for future services</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActionDialog(null)}>Cancel</Button>
            <Button onClick={handleRefundCredit} disabled={manageCaseMutation.isPending}>
              {manageCaseMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {refundType === "refunded" ? "Process Refund" : "Mark as Credited"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={actionDialog?.type === "waive"} onOpenChange={() => setActionDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Waive Facility Invoice</DialogTitle>
            <DialogDescription>
              This will mark the $4,500 facility fee as waived.
            </DialogDescription>
          </DialogHeader>
          <div>
            <Label>Reason for waiving</Label>
            <Textarea
              value={actionNotes}
              onChange={(e) => setActionNotes(e.target.value)}
              placeholder="Enter reason..."
              required
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActionDialog(null)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={() => actionDialog?.invoiceId && handleWaiveInvoice(actionDialog.invoiceId)}
              disabled={!actionNotes || manageCaseMutation.isPending}
            >
              {manageCaseMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Waive Invoice
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
