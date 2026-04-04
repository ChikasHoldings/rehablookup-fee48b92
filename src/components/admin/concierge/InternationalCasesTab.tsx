import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  Search,
  Globe,
  DollarSign,
  CheckCircle,
  CreditCard,
  Filter,
} from "lucide-react";
import { format } from "date-fns";
import { InternationalCaseDetailSheet } from "@/components/admin/international/InternationalCaseDetailSheet";

type CaseStatus = 'new' | 'reviewing' | 'matching' | 'matched' | 'introductions_sent' | 'in_contact' | 'admitted' | 'closed' | 'all';

const STATUS_CONFIG: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  new: { label: "New", variant: "default" },
  reviewing: { label: "Reviewing", variant: "secondary" },
  matching: { label: "Placing", variant: "secondary" },
  matched: { label: "Facilities Found", variant: "outline" },
  introductions_sent: { label: "Intros Sent", variant: "outline" },
  in_contact: { label: "In Contact", variant: "secondary" },
  admitted: { label: "Admitted", variant: "default" },
  closed: { label: "Closed", variant: "destructive" },
};

const INVOICE_STATUS_CONFIG: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending: { label: "Pending", variant: "outline" },
  sent: { label: "Sent", variant: "secondary" },
  paid: { label: "Paid", variant: "default" },
  overdue: { label: "Overdue", variant: "destructive" },
  waived: { label: "Waived", variant: "secondary" },
};

const URGENCY_OPTIONS = ["immediate", "1-2 weeks", "30 days", "flexible"];
const BUDGET_OPTIONS = ["<10k", "10-25k", "25-50k", "50-100k", "100k+"];
const STYLE_OPTIONS = ["standard", "luxury", "executive", "discreet_vip"];

interface InternationalCase {
  id: string;
  user_id: string | null;
  client_name: string;
  client_email: string;
  client_phone: string | null;
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
  facility_fee_cents: number;
  facility_fee_status: string | null;
  facility_invoice_id: string | null;
  preferred_language: string | null;
  priority: string | null;
  created_at: string;
  updated_at: string;
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

export function InternationalCasesTab() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<CaseStatus>("all");
  const [urgencyFilter, setUrgencyFilter] = useState<string>("all");
  const [budgetFilter, setBudgetFilter] = useState<string>("all");
  const [styleFilter, setStyleFilter] = useState<string>("all");
  const [advisorFilter, setAdvisorFilter] = useState<string>("all");
  const [selectedCase, setSelectedCase] = useState<InternationalCase | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [waiveDialogInvoice, setWaiveDialogInvoice] = useState<string | null>(null);
  const [waiveReason, setWaiveReason] = useState("");
  const [activeSubTab, setActiveSubTab] = useState<"cases" | "invoices">("cases");

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch admin staff for advisor filter
  const { data: adminStaff } = useQuery({
    queryKey: ["admin-staff-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("admin_user_profiles")
        .select("user_id, first_name, last_name, display_name, admin_role")
        .in("admin_role", ["super_admin", "manager", "advisor"])
        .eq("status", "active");
      if (error) throw error;
      return data;
    },
  });

  // Fetch cases
  const { data: cases, isLoading: casesLoading, refetch: refetchCases } = useQuery({
    queryKey: ["admin-international-cases", statusFilter],
    queryFn: async () => {
      let query = supabase
        .from("international_placement_cases")
        .select("id, user_id, client_name, client_email, client_phone, client_country, preferred_language, status, priority, intake_data, payment_status, payment_amount_cents, admin_notes, assigned_advisor_id, matched_facility_ids, created_at, updated_at")
        .order("created_at", { ascending: false });

      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as InternationalCase[];
    },
  });

  // Fetch invoices - use explicit FK reference to avoid ambiguity
  const { data: invoices, isLoading: invoicesLoading, refetch: refetchInvoices } = useQuery({
    queryKey: ["admin-international-invoices"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("international_facility_invoices")
        .select(`
          *,
          facility:facilities(name),
          case:international_placement_cases!international_facility_invoices_case_id_fkey(client_name, client_country)
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

      const counts = {
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
        if (counts[c.status as keyof typeof counts] !== undefined) {
          (counts[c.status as keyof typeof counts] as number)++;
        }
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

  // Invoice mutation
  const invoiceMutation = useMutation({
    mutationFn: async ({ action, invoiceId, reason }: { action: string; invoiceId: string; reason?: string }) => {
      const { data, error } = await supabase.functions.invoke("manage-international-case", {
        body: { 
          action: action === "charge" ? "charge_facility_invoice" : "waive_facility_invoice",
          data: { invoiceId, reason }
        },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Invoice updated successfully." });
      queryClient.invalidateQueries({ queryKey: ["admin-international-invoices"] });
      queryClient.invalidateQueries({ queryKey: ["admin-international-stats"] });
      setWaiveDialogInvoice(null);
      setWaiveReason("");
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message || "Action failed", variant: "destructive" });
    },
  });

  // Filter cases
  const filteredCases = cases?.filter((c) => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matches = 
        c.client_name?.toLowerCase().includes(q) ||
        c.client_email?.toLowerCase().includes(q) ||
        c.client_country?.toLowerCase().includes(q);
      if (!matches) return false;
    }
    
    if (urgencyFilter !== "all") {
      const caseUrgency = (c.intake_data?.urgency as string)?.toLowerCase();
      if (caseUrgency !== urgencyFilter.toLowerCase()) return false;
    }
    
    if (budgetFilter !== "all") {
      const caseBudget = c.intake_data?.budget_range as string;
      if (caseBudget !== budgetFilter) return false;
    }
    
    if (styleFilter !== "all") {
      const caseStyle = c.intake_data?.rehab_style as string;
      if (caseStyle !== styleFilter) return false;
    }
    
    if (advisorFilter !== "all") {
      if (advisorFilter === "unassigned") {
        if (c.assigned_advisor_id) return false;
      } else {
        if (c.assigned_advisor_id !== advisorFilter) return false;
      }
    }
    
    return true;
  });

  const getAdvisorName = (advisorId: string | null) => {
    if (!advisorId) return "Unassigned";
    const advisor = adminStaff?.find(a => a.user_id === advisorId);
    return advisor ? (advisor.display_name || `${advisor.first_name} ${advisor.last_name}`) : "Unknown";
  };

  const clearFilters = () => {
    setSearchQuery("");
    setStatusFilter("all");
    setUrgencyFilter("all");
    setBudgetFilter("all");
    setStyleFilter("all");
    setAdvisorFilter("all");
  };

  const hasActiveFilters = statusFilter !== "all" || urgencyFilter !== "all" || 
    budgetFilter !== "all" || styleFilter !== "all" || advisorFilter !== "all" || searchQuery;

  return (
    <div className="space-y-4">
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
            <div className="text-2xl font-bold">{(stats?.reviewing || 0) + (stats?.matching || 0)}</div>
            <p className="text-xs text-muted-foreground">In Progress</p>
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
            <div className="text-2xl font-bold text-success">
              ${((stats?.total_revenue || 0) / 100).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">Total Revenue</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="text-2xl font-bold text-warning">
              ${((stats?.pending_invoices || 0) / 100).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">Pending Invoices</p>
          </CardContent>
        </Card>
      </div>

      {/* Sub-tabs for Cases vs Invoices */}
      <div className="flex gap-2 border-b pb-2">
        <Button 
          variant={activeSubTab === "cases" ? "default" : "ghost"} 
          size="sm"
          onClick={() => setActiveSubTab("cases")}
        >
          Cases ({filteredCases?.length || 0})
        </Button>
        <Button 
          variant={activeSubTab === "invoices" ? "default" : "ghost"} 
          size="sm"
          onClick={() => setActiveSubTab("invoices")}
        >
          Invoices ({invoices?.length || 0})
        </Button>
      </div>

      {activeSubTab === "cases" && (
        <Card>
          {/* Filters Bar */}
          <div className="p-4 border-b space-y-3">
            <div className="flex items-center gap-4 flex-wrap">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, email, country..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as CaseStatus)}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                    <SelectItem key={key} value={key}>{config.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={urgencyFilter} onValueChange={setUrgencyFilter}>
                <SelectTrigger className="w-[130px]">
                  <SelectValue placeholder="Urgency" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Urgency</SelectItem>
                  {URGENCY_OPTIONS.map((opt) => (
                    <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={budgetFilter} onValueChange={setBudgetFilter}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue placeholder="Budget" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Budgets</SelectItem>
                  {BUDGET_OPTIONS.map((opt) => (
                    <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={advisorFilter} onValueChange={setAdvisorFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Advisor" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Advisors</SelectItem>
                  <SelectItem value="unassigned">Unassigned</SelectItem>
                  {adminStaff?.map((staff) => (
                    <SelectItem key={staff.user_id} value={staff.user_id}>
                      {staff.display_name || `${staff.first_name} ${staff.last_name}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {hasActiveFilters && (
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  {filteredCases?.length || 0} of {cases?.length || 0} cases
                </span>
                <Button variant="ghost" size="sm" onClick={clearFilters} className="ml-2 h-7 text-xs">
                  Clear filters
                </Button>
              </div>
            )}
          </div>

          {/* Cases Table */}
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
                      <th className="pb-3 font-medium">Urgency</th>
                      <th className="pb-3 font-medium">Budget</th>
                      <th className="pb-3 font-medium">Status</th>
                      <th className="pb-3 font-medium">Advisor</th>
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
                        <td className="py-3 text-sm">
                          {(c.intake_data?.urgency as string) || "Not set"}
                        </td>
                        <td className="py-3 text-sm">
                          {(c.intake_data?.budget_range as string) || "Not set"}
                        </td>
                        <td className="py-3">
                          <Badge variant={STATUS_CONFIG[c.status]?.variant || "secondary"}>
                            {STATUS_CONFIG[c.status]?.label || c.status}
                          </Badge>
                        </td>
                        <td className="py-3 text-sm text-muted-foreground">
                          {getAdvisorName(c.assigned_advisor_id)}
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
      )}

      {activeSubTab === "invoices" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              International Facility Invoices ($4,500 per admission)
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
                          <div className="font-medium">{inv.case?.client_name || "Client"}</div>
                          <div className="text-xs text-muted-foreground">{inv.case?.client_country}</div>
                        </td>
                        <td className="py-3">{inv.facility?.name || "Facility"}</td>
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
                                onClick={() => invoiceMutation.mutate({ action: "charge", invoiceId: inv.id })}
                                disabled={invoiceMutation.isPending}
                              >
                                <CreditCard className="h-3 w-3 mr-1" />
                                Charge
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setWaiveDialogInvoice(inv.id)}
                              >
                                Waive
                              </Button>
                            </div>
                          )}
                          {inv.status === "paid" && (
                            <span className="text-success text-sm flex items-center gap-1">
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
      )}

      {/* Case Detail Sheet */}
      <InternationalCaseDetailSheet
        caseData={selectedCase}
        open={detailOpen}
        onOpenChange={setDetailOpen}
      />

      {/* Waive Invoice Dialog */}
      <Dialog open={!!waiveDialogInvoice} onOpenChange={(open) => { if (!open) { setWaiveDialogInvoice(null); setWaiveReason(""); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Waive Facility Invoice</DialogTitle>
            <DialogDescription>
              This will mark the facility fee as waived. No payment will be collected.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
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
            <Button variant="outline" onClick={() => { setWaiveDialogInvoice(null); setWaiveReason(""); }}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => waiveDialogInvoice && invoiceMutation.mutate({ action: "waive", invoiceId: waiveDialogInvoice, reason: waiveReason })}
              disabled={!waiveReason || invoiceMutation.isPending}
            >
              Waive Invoice
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
