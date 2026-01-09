import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Users,
  Search,
  Filter,
  Eye,
  ChevronRight,
  Clock,
  CheckCircle2,
  XCircle,
  DollarSign,
  Building2,
  Phone,
  Mail,
  FileText,
  Send,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { format } from "date-fns";

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  new: { label: "New", color: "bg-blue-100 text-blue-700" },
  reviewing: { label: "Reviewing", color: "bg-yellow-100 text-yellow-700" },
  matching: { label: "Matching", color: "bg-purple-100 text-purple-700" },
  introductions_sent: { label: "Intros Sent", color: "bg-indigo-100 text-indigo-700" },
  in_contact: { label: "In Contact", color: "bg-teal-100 text-teal-700" },
  admitted: { label: "Admitted", color: "bg-emerald-100 text-emerald-700" },
  closed: { label: "Closed", color: "bg-gray-100 text-gray-700" },
  cancelled: { label: "Cancelled", color: "bg-red-100 text-red-700" },
};

export default function AdminPlacements() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedCase, setSelectedCase] = useState<any>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // Fetch all placement cases
  const { data: cases, isLoading } = useQuery({
    queryKey: ["admin-placement-cases", statusFilter],
    queryFn: async () => {
      let query = supabase
        .from("placement_cases")
        .select("*")
        .order("created_at", { ascending: false });

      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });

  // Stats
  const stats = {
    new: cases?.filter((c) => c.status === "new").length || 0,
    active: cases?.filter((c) => ["reviewing", "matching", "introductions_sent", "in_contact"].includes(c.status)).length || 0,
    admitted: cases?.filter((c) => c.status === "admitted").length || 0,
    pendingPayment: cases?.filter((c) => c.terms_status === "invoiced").length || 0,
  };

  // Filtered cases
  const filteredCases = cases?.filter((c) =>
    search
      ? c.seeker_name.toLowerCase().includes(search.toLowerCase()) ||
        c.seeker_email.toLowerCase().includes(search.toLowerCase()) ||
        c.id.includes(search)
      : true
  );

  // Update case mutation
  const updateCaseMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: any }) => {
      const { error } = await supabase
        .from("placement_cases")
        .update({ ...updates, status_updated_at: new Date().toISOString() })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-placement-cases"] });
      toast.success("Case updated");
    },
    onError: () => {
      toast.error("Failed to update case");
    },
  });

  const openCaseDetail = (caseData: any) => {
    setSelectedCase(caseData);
    setIsDetailOpen(true);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Placement Cases</h1>
          <p className="text-muted-foreground">Manage concierge placement operations</p>
        </div>
        <Button variant="outline" onClick={() => queryClient.invalidateQueries({ queryKey: ["admin-placement-cases"] })}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <Clock className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.new}</p>
                <p className="text-sm text-muted-foreground">New Cases</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-purple-100 flex items-center justify-center">
                <Users className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.active}</p>
                <p className="text-sm text-muted-foreground">Active</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.admitted}</p>
                <p className="text-sm text-muted-foreground">Admitted</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-amber-100 flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.pendingPayment}</p>
                <p className="text-sm text-muted-foreground">Pending Payment</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, email, or case ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            {Object.entries(STATUS_CONFIG).map(([value, config]) => (
              <SelectItem key={value} value={value}>
                {config.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Cases Table */}
      {isLoading ? (
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Case</TableHead>
                <TableHead>Seeker</TableHead>
                <TableHead>Care Type</TableHead>
                <TableHead>Payment</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCases && filteredCases.length > 0 ? (
                filteredCases.map((c) => (
                  <TableRow key={c.id} className="cursor-pointer hover:bg-muted/50" onClick={() => openCaseDetail(c)}>
                    <TableCell className="font-mono text-sm">
                      #{c.id.slice(0, 8).toUpperCase()}
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{c.seeker_name}</p>
                        <p className="text-xs text-muted-foreground">{c.seeker_email}</p>
                      </div>
                    </TableCell>
                    <TableCell className="capitalize">
                      {c.level_of_care?.replace(/_/g, " ") || "—"}
                    </TableCell>
                    <TableCell className="capitalize">
                      {c.payment_type?.replace(/_/g, " ") || "—"}
                    </TableCell>
                    <TableCell>
                      <Badge className={STATUS_CONFIG[c.status]?.color || ""}>
                        {STATUS_CONFIG[c.status]?.label || c.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {format(new Date(c.created_at), "MMM d, yyyy")}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm">
                        <Eye className="h-4 w-4 mr-1" />
                        View
                        <ChevronRight className="h-4 w-4 ml-1" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                    No placement cases found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Case Detail Sheet */}
      <Sheet open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
          {selectedCase && (
            <CaseDetailPanel
              caseData={selectedCase}
              onUpdate={(updates) => {
                updateCaseMutation.mutate({ id: selectedCase.id, updates });
                setSelectedCase({ ...selectedCase, ...updates });
              }}
              isUpdating={updateCaseMutation.isPending}
            />
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

// Case Detail Panel Component
interface CaseDetailPanelProps {
  caseData: any;
  onUpdate: (updates: any) => void;
  isUpdating: boolean;
}

function CaseDetailPanel({ caseData, onUpdate, isUpdating }: CaseDetailPanelProps) {
  const queryClient = useQueryClient();
  const [monetizationType, setMonetizationType] = useState(caseData.monetization_type || "commission");
  const [commissionPercent, setCommissionPercent] = useState(caseData.commission_percent?.toString() || "15");
  const [flatFeeCents, setFlatFeeCents] = useState(((caseData.flat_fee_cents || 0) / 100).toString());

  // Fetch providers in network
  const { data: networkProviders } = useQuery({
    queryKey: ["network-providers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("facilities")
        .select("id, name, city, state, concierge_accepted_care_types, concierge_availability_status")
        .eq("concierge_network_opted_in", true)
        .eq("status", "approved");

      if (error) throw error;
      return data || [];
    },
  });

  // Fetch case providers
  const { data: caseProviders } = useQuery({
    queryKey: ["case-providers", caseData.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("placement_case_providers")
        .select(`
          *,
          facilities (id, name, city, state)
        `)
        .eq("case_id", caseData.id);

      if (error) throw error;
      return data || [];
    },
  });

  // Send introduction mutation
  const sendIntroMutation = useMutation({
    mutationFn: async (facilityId: string) => {
      const { data: facility } = await supabase
        .from("facilities")
        .select("user_id")
        .eq("id", facilityId)
        .single();

      if (!facility) throw new Error("Facility not found");

      const { error } = await supabase
        .from("placement_case_providers")
        .insert({
          case_id: caseData.id,
          facility_id: facilityId,
          provider_id: facility.user_id,
          introduced_at: new Date().toISOString(),
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["case-providers", caseData.id] });
      toast.success("Introduction sent");
    },
    onError: () => {
      toast.error("Failed to send introduction");
    },
  });

  const handleSaveMonetization = () => {
    onUpdate({
      monetization_type: monetizationType,
      commission_percent: monetizationType === "commission" ? parseFloat(commissionPercent) : null,
      flat_fee_cents: monetizationType === "flat_fee" ? parseFloat(flatFeeCents) * 100 : null,
    });
  };

  const alreadyIntroduced = caseProviders?.map((p) => p.facility_id) || [];
  const specialConsiderations = caseData.special_considerations as { needs?: string[] } | null;

  return (
    <div className="space-y-6">
      <SheetHeader>
        <SheetTitle className="flex items-center justify-between">
          <span>Case #{caseData.id.slice(0, 8).toUpperCase()}</span>
          <Badge className={STATUS_CONFIG[caseData.status]?.color}>
            {STATUS_CONFIG[caseData.status]?.label}
          </Badge>
        </SheetTitle>
      </SheetHeader>

      <Tabs defaultValue="details" className="space-y-4">
        <TabsList className="w-full grid grid-cols-4">
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="providers">Providers</TabsTrigger>
          <TabsTrigger value="monetization">Monetization</TabsTrigger>
          <TabsTrigger value="actions">Actions</TabsTrigger>
        </TabsList>

        {/* Details Tab */}
        <TabsContent value="details" className="space-y-4">
          {/* Contact Info */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Contact Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-3">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{caseData.seeker_name}</span>
              </div>
              <div className="flex items-center gap-3">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <a href={`tel:${caseData.seeker_phone}`} className="text-primary hover:underline">
                  {caseData.seeker_phone}
                </a>
              </div>
              <div className="flex items-center gap-3">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <a href={`mailto:${caseData.seeker_email}`} className="text-primary hover:underline">
                  {caseData.seeker_email}
                </a>
              </div>
            </CardContent>
          </Card>

          {/* Intake Data */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Intake Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="text-muted-foreground">Who Seeking:</span>
                  <p className="font-medium capitalize">{caseData.who_seeking_help}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Age Range:</span>
                  <p className="font-medium capitalize">{caseData.age_range?.replace(/_/g, " ")}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Level of Care:</span>
                  <p className="font-medium capitalize">{caseData.level_of_care?.replace(/_/g, " ")}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Payment:</span>
                  <p className="font-medium capitalize">{caseData.payment_type?.replace(/_/g, " ")}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Urgency:</span>
                  <p className="font-medium capitalize">{caseData.urgency?.replace(/_/g, " ")}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Location Pref:</span>
                  <p className="font-medium">{caseData.preferred_states?.join(", ") || "Flexible"}</p>
                </div>
              </div>
              {caseData.primary_issue && (
                <div>
                  <span className="text-muted-foreground">Primary Issues:</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {caseData.primary_issue.map((issue: string) => (
                      <Badge key={issue} variant="secondary" className="capitalize">
                        {issue.replace(/_/g, " ")}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              {specialConsiderations?.needs && specialConsiderations.needs.length > 0 && (
                <div>
                  <span className="text-muted-foreground">Special Needs:</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {specialConsiderations.needs.map((need: string) => (
                      <Badge key={need} variant="outline" className="capitalize">
                        {need.replace(/_/g, " ")}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              {caseData.additional_notes && (
                <div>
                  <span className="text-muted-foreground">Notes:</span>
                  <p className="text-foreground mt-1">{caseData.additional_notes}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Providers Tab */}
        <TabsContent value="providers" className="space-y-4">
          {/* Already Introduced */}
          {caseProviders && caseProviders.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-muted-foreground">Introduced ({caseProviders.length})</h4>
              {caseProviders.map((cp) => (
                <Card key={cp.id}>
                  <CardContent className="p-3 flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm">{cp.facilities?.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {cp.facilities?.city}, {cp.facilities?.state}
                      </p>
                    </div>
                    <Badge variant="secondary" className="capitalize">
                      {cp.provider_response}
                    </Badge>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Available Providers */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-muted-foreground">Network Providers</h4>
            {networkProviders?.filter((p) => !alreadyIntroduced.includes(p.id)).map((provider) => (
              <Card key={provider.id}>
                <CardContent className="p-3 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">{provider.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {provider.city}, {provider.state}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => sendIntroMutation.mutate(provider.id)}
                    disabled={sendIntroMutation.isPending}
                  >
                    <Send className="h-3 w-3 mr-1" />
                    Introduce
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Monetization Tab */}
        <TabsContent value="monetization" className="space-y-4">
          <Card>
            <CardContent className="p-4 space-y-4">
              <div className="space-y-2">
                <Label>Payment Type</Label>
                <Select value={monetizationType} onValueChange={setMonetizationType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="commission">Commission (% of first month)</SelectItem>
                    <SelectItem value="flat_fee">Flat Fee</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {monetizationType === "commission" ? (
                <div className="space-y-2">
                  <Label>Commission Percentage</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      value={commissionPercent}
                      onChange={(e) => setCommissionPercent(e.target.value)}
                      className="w-24"
                    />
                    <span className="text-muted-foreground">%</span>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <Label>Flat Fee Amount</Label>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">$</span>
                    <Input
                      type="number"
                      value={flatFeeCents}
                      onChange={(e) => setFlatFeeCents(e.target.value)}
                      className="w-32"
                    />
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label>Terms Status</Label>
                <Select
                  value={caseData.terms_status || "draft"}
                  onValueChange={(v) => onUpdate({ terms_status: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="proposed">Proposed</SelectItem>
                    <SelectItem value="accepted">Accepted</SelectItem>
                    <SelectItem value="invoiced">Invoiced</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button onClick={handleSaveMonetization} disabled={isUpdating} className="w-full">
                Save Monetization Settings
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Actions Tab */}
        <TabsContent value="actions" className="space-y-4">
          <Card>
            <CardContent className="p-4 space-y-4">
              <div className="space-y-2">
                <Label>Update Status</Label>
                <Select
                  value={caseData.status}
                  onValueChange={(v) => onUpdate({ status: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(STATUS_CONFIG).map(([value, config]) => (
                      <SelectItem key={value} value={value}>
                        {config.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {caseData.status === "admitted" && (
                <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-200">
                  <div className="flex items-center gap-2 text-emerald-700 mb-2">
                    <CheckCircle2 className="h-5 w-5" />
                    <span className="font-medium">Case Admitted</span>
                  </div>
                  <p className="text-sm text-emerald-600">
                    This case has been marked as admitted. Proceed with agreement and invoicing.
                  </p>
                </div>
              )}

              <Button
                variant="outline"
                className="w-full"
                onClick={() => onUpdate({ status: "closed", closed_reason: "Manual close by admin" })}
              >
                <XCircle className="h-4 w-4 mr-2" />
                Close Case
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
