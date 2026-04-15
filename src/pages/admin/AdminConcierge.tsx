import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { AdminPageHeader, AdminStatCard } from "@/components/admin/AdminPageHeader";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Search, RefreshCw, UserCheck, HeartHandshake, Building2, Receipt,
  Globe, Flag, Filter, DollarSign, FileText, LayoutGrid, List,
  CalendarCheck, Clock, Users, Send, CheckCircle, XCircle, Loader2,
  Download,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { PlacementPipelineBoard } from "@/components/admin/concierge/PlacementPipelineBoard";
import { NetworkProvidersTab } from "@/components/admin/concierge/NetworkProvidersTab";
import { AllInvoicesTab } from "@/components/admin/concierge/AllInvoicesTab";
import { InternationalCasesTab } from "@/components/admin/concierge/InternationalCasesTab";
import { PlacementDetailModal } from "@/components/admin/concierge/PlacementDetailModal";
import { cn } from "@/lib/utils";

type CaseStatus = string;

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  new: { label: "New", color: "bg-blue-500/10 text-blue-600 border-blue-500/30" },
  reviewing: { label: "Reviewing", color: "bg-amber-500/10 text-amber-600 border-amber-500/30" },
  matching: { label: "Placing", color: "bg-purple-500/10 text-purple-600 border-purple-500/30" },
  matched: { label: "Matched", color: "bg-chart-3/10 text-chart-3 border-chart-3/30" },
  introductions_sent: { label: "Intros Sent", color: "bg-indigo-500/10 text-indigo-600 border-indigo-500/30" },
  in_contact: { label: "In Contact", color: "bg-cyan-500/10 text-cyan-600 border-cyan-500/30" },
  placed: { label: "Placed", color: "bg-success/10 text-success border-success/30" },
  closed: { label: "Closed", color: "bg-muted text-muted-foreground border-border" },
};

function useDebounce(value: string, delay: number) {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debouncedValue;
}

export default function AdminConcierge() {
  const { user, adminRole } = useAdminAuth();
  const isAdvisor = adminRole === "advisor";

  const [activeTab, setActiveTab] = useState("domestic");
  const [searchInput, setSearchInput] = useState("");
  const searchQuery = useDebounce(searchInput, 350);
  const [statusFilter, setStatusFilter] = useState<CaseStatus>("all");
  const [advisorFilter, setAdvisorFilter] = useState<string>("all");
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"pipeline" | "table">("table");

  // Set advisor filter for advisor role
  useEffect(() => {
    if (isAdvisor && user?.id) setAdvisorFilter(user.id);
  }, [isAdvisor, user?.id]);

  const { data: cases, isLoading, refetch } = useQuery({
    queryKey: ["admin-concierge-cases-full"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("concierge_inquiries")
        .select("id, user_name, user_email, user_phone, status, payment_status, level_of_care, desired_location_state, preferred_state, preferred_city, match_count, assigned_advisor_id, created_at, updated_at, admission_status, tour_coordination_status, placement_confirmed, placement_confirmed_at, placed_facility_id, introductions_sent_at, introductions_sent_count, provider_fee_status, provider_fee_cents, timeline_urgency, primary_concern, closed_at")
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return data || [];
    },
  });

  const { data: adminStaff } = useQuery({
    queryKey: ["admin-staff-list"],
    queryFn: async () => {
      const { data } = await supabase
        .from("admin_user_profiles")
        .select("user_id, first_name, last_name, display_name")
        .eq("status", "active");
      return data || [];
    },
  });

  // Fetch facility names for placed cases
  const placedFacilityIds = [...new Set((cases || []).map(c => c.placed_facility_id).filter(Boolean))];
  const { data: facilityMap } = useQuery({
    queryKey: ["admin-placement-facilities", placedFacilityIds],
    queryFn: async () => {
      if (!placedFacilityIds.length) return {};
      const { data } = await supabase
        .from("facilities")
        .select("id, name, city, state")
        .in("id", placedFacilityIds as string[]);
      const map: Record<string, any> = {};
      data?.forEach(f => { map[f.id] = f; });
      return map;
    },
    enabled: placedFacilityIds.length > 0,
  });

  const { data: networkCount } = useQuery({
    queryKey: ["admin-network-provider-count"],
    queryFn: async () => {
      const { count } = await supabase
        .from("facilities")
        .select("id", { count: "exact", head: true })
        .eq("concierge_network_opted_in", true);
      return count || 0;
    },
  });

  const { data: internationalCount } = useQuery({
    queryKey: ["admin-international-count"],
    queryFn: async () => {
      const { count } = await supabase
        .from("international_placement_cases")
        .select("id", { count: "exact", head: true })
        .not("status", "eq", "closed");
      return count || 0;
    },
  });

  // Selected case full data
  const { data: selectedCase } = useQuery({
    queryKey: ["admin-concierge-case-detail", selectedCaseId],
    queryFn: async () => {
      if (!selectedCaseId) return undefined;
      const { data, error } = await supabase
        .from("concierge_inquiries")
        .select("id, user_name, user_email, user_phone, status, payment_status, payment_amount_cents, intake_data, created_at, updated_at, admin_notes, assigned_advisor_id, matched_facility_ids, admin_matched_facility_ids, placed_facility_id, placement_confirmed, placement_confirmed_at, level_of_care, primary_concern, insurance_carrier, budget_range, timeline_urgency, preferred_state, preferred_city, gender, age_range, referral_source, tour_coordination_status, admission_status, admission_notes, introductions_sent_at, introductions_sent_count, matched_at, closed_at, seeker_rating, seeker_feedback, provider_fee_cents, provider_fee_status, provider_fee_type, provider_invoice_id, draft_id, checkout_session_id, stripe_payment_intent_id, payment_type, idempotency_key, user_id, match_scores, notes, abandoned_cart_email_sent_at, alternative_contact_name, alternative_contact_phone, amenity_preferences, assessment_preference, benefits_verified, best_time_to_call, co_occurring_concerns, current_living_situation, current_medications, decision_maker_name, decision_maker_phone, desired_location_city, desired_location_state, desired_radius_miles, detox_needed, email_verified_at, emergency_contact_name, emergency_contact_phone, employer_name, faith_based_preference, form_completed_at, hipaa_consent, holistic_interest, insurance_group_number, insurance_member_id, intake_submitted_at, match_count, mobility_needs, move_in_date, needs_transport_help, payment_reminder_count, preferred_environment, preferred_language, prior_treatment_history, prior_treatment_notes, relationship_to_decision_maker, relationship_to_seeker, scholarship_interest, seeker_confirmed, seeker_confirmed_at, stripe_customer_id, substance_use_duration, substance_use_frequency, suicide_history, willing_to_travel")
        .eq("id", selectedCaseId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!selectedCaseId,
  });

  // Advisor name helper
  const getAdvisorName = (advisorId: string | null) => {
    if (!advisorId) return "—";
    const a = adminStaff?.find(s => s.user_id === advisorId);
    return a ? (a.display_name || `${a.first_name} ${a.last_name}`) : "—";
  };

  const advisorNames: Record<string, string> = {};
  adminStaff?.forEach(a => {
    advisorNames[a.user_id] = a.display_name || `${a.first_name} ${a.last_name}`;
  });

  // Filtering
  const filteredCases = (cases || []).filter(c => {
    if (statusFilter !== "all" && c.status !== statusFilter) return false;
    if (advisorFilter !== "all" && c.assigned_advisor_id !== advisorFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        c.user_name?.toLowerCase().includes(q) ||
        c.user_email?.toLowerCase().includes(q) ||
        c.user_phone?.includes(q) ||
        c.id.toLowerCase().includes(q)
      );
    }
    return true;
  });

  // Stats
  const allCases = cases || [];
  const totalCases = allCases.length;
  const activeCases = allCases.filter(c => !["placed", "closed"].includes(c.status)).length;
  const newCases = allCases.filter(c => c.status === "new").length;
  const awaitingAdvisor = allCases.filter(c => !c.assigned_advisor_id && c.status !== "closed").length;
  const matchedCases = allCases.filter(c => c.status === "matched" || c.status === "introductions_sent").length;
  const toursScheduled = allCases.filter(c => c.tour_coordination_status === "scheduled").length;
  const admittedCases = allCases.filter(c => c.admission_status === "admitted" || c.placement_confirmed).length;
  const placedCases = allCases.filter(c => c.status === "placed").length;
  const pendingBilling = allCases.filter(c => c.status === "placed" && c.provider_fee_status !== "paid" && c.provider_fee_status !== "waived").length;

  const isPaid = (status: string) => status === "paid" || status === "succeeded";

  return (
    <div className="space-y-5">
      {/* Page Header */}
      <AdminPageHeader
        icon={HeartHandshake}
        iconGradient="bg-gradient-to-br from-primary to-primary/70"
        title="Placement Operations"
        subtitle="End-to-end placement lifecycle management — intake, matching, admission & billing"
        badges={[
          { label: "Active", value: activeCases, className: "bg-primary/10 text-primary" },
          { label: "Placed", value: placedCases, className: "bg-success/10 text-success" },
        ]}
        actions={
          <div className="flex items-center gap-2">
            {!isAdvisor && (
              <>
                <Button variant="outline" size="sm" asChild>
                  <Link to="/admin/placement-revenue">
                    <DollarSign className="h-3.5 w-3.5 mr-1.5" />
                    <span className="text-xs sm:text-sm">Revenue</span>
                  </Link>
                </Button>
                <Button variant="outline" size="sm" asChild>
                  <Link to="/admin/international/agreement">
                    <FileText className="h-3.5 w-3.5 mr-1.5" />
                    <span className="text-xs sm:text-sm hidden sm:inline">Agreement</span>
                  </Link>
                </Button>
              </>
            )}
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
              <span className="text-xs sm:text-sm">Refresh</span>
            </Button>
          </div>
        }
      />

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-hide">
          <TabsList className={`inline-flex w-auto sm:grid sm:w-full ${isAdvisor ? "sm:grid-cols-2 sm:max-w-xs" : "sm:grid-cols-4 sm:max-w-lg"}`}>
            <TabsTrigger value="domestic" className="flex items-center gap-1.5 px-3 whitespace-nowrap">
              <Flag className="h-3.5 w-3.5" />
              <span className="text-xs sm:text-sm">Domestic</span>
            </TabsTrigger>
            <TabsTrigger value="international" className="flex items-center gap-1.5 px-3 whitespace-nowrap">
              <Globe className="h-3.5 w-3.5" />
              <span className="text-xs sm:text-sm">International</span>
              {!!internationalCount && (
                <Badge variant="secondary" className="ml-1 h-4 px-1 text-[10px]">{internationalCount}</Badge>
              )}
            </TabsTrigger>
            {!isAdvisor && (
              <>
                <TabsTrigger value="providers" className="flex items-center gap-1.5 px-3 whitespace-nowrap">
                  <Building2 className="h-3.5 w-3.5" />
                  <span className="text-xs sm:text-sm">Network</span>
                  {!!networkCount && (
                    <Badge variant="secondary" className="ml-1 h-4 px-1 text-[10px]">{networkCount}</Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="invoices" className="flex items-center gap-1.5 px-3 whitespace-nowrap">
                  <Receipt className="h-3.5 w-3.5" />
                  <span className="text-xs sm:text-sm">Invoices</span>
                </TabsTrigger>
              </>
            )}
          </TabsList>
        </div>

        {/* Domestic Tab */}
        <TabsContent value="domestic" className="space-y-4">
          {/* KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            <AdminStatCard label="Total Cases" value={isLoading ? "—" : totalCases} icon={HeartHandshake}
              onClick={() => setStatusFilter("all")} active={statusFilter === "all"} />
            <AdminStatCard label="New" value={isLoading ? "—" : newCases} icon={Clock} valueClassName="text-blue-600"
              onClick={() => setStatusFilter("new")} active={statusFilter === "new"} />
            <AdminStatCard label="Awaiting Advisor" value={isLoading ? "—" : awaitingAdvisor} icon={Users} valueClassName="text-warning"
              onClick={() => setStatusFilter("all")} />
            <AdminStatCard label="Matched / Intros" value={isLoading ? "—" : matchedCases} icon={Send} valueClassName="text-indigo-600"
              onClick={() => setStatusFilter("matched")} active={statusFilter === "matched"} />
            <AdminStatCard label="Tours Scheduled" value={isLoading ? "—" : toursScheduled} icon={CalendarCheck} valueClassName="text-cyan-600" />
            <AdminStatCard label="Admitted" value={isLoading ? "—" : admittedCases} icon={CheckCircle} valueClassName="text-success"
              onClick={() => setStatusFilter("placed")} active={statusFilter === "placed"} />
            <AdminStatCard label="Placed" value={isLoading ? "—" : placedCases} icon={UserCheck} valueClassName="text-success" />
            <AdminStatCard label="Pending Billing" value={isLoading ? "—" : pendingBilling} icon={DollarSign} valueClassName="text-warning" />
            <AdminStatCard label="Active" value={isLoading ? "—" : activeCases} icon={Loader2} valueClassName="text-primary" />
            <AdminStatCard label="Closed" value={isLoading ? "—" : allCases.filter(c => c.status === "closed").length}
              icon={XCircle} valueClassName="text-muted-foreground"
              onClick={() => setStatusFilter("closed")} active={statusFilter === "closed"} />
          </div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, email, phone, or case ID..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[160px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                  <SelectItem key={key} value={key}>{cfg.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={advisorFilter} onValueChange={setAdvisorFilter}>
              <SelectTrigger className="w-full sm:w-[160px]">
                <SelectValue placeholder="Advisor" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Advisors</SelectItem>
                <SelectItem value="unassigned">Unassigned</SelectItem>
                {adminStaff?.map(a => (
                  <SelectItem key={a.user_id} value={a.user_id}>
                    {a.display_name || `${a.first_name} ${a.last_name}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex items-center gap-2 self-start sm:self-auto">
              <span className="text-xs text-muted-foreground tabular-nums whitespace-nowrap">
                {filteredCases.length} cases
              </span>
              <div className="flex items-center border rounded-md overflow-hidden">
                <Button variant={viewMode === "pipeline" ? "default" : "ghost"} size="sm"
                  className="h-8 px-2.5 rounded-none" onClick={() => setViewMode("pipeline")}>
                  <LayoutGrid className="h-3.5 w-3.5" />
                </Button>
                <Button variant={viewMode === "table" ? "default" : "ghost"} size="sm"
                  className="h-8 px-2.5 rounded-none" onClick={() => setViewMode("table")}>
                  <List className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </div>

          {/* Content */}
          {viewMode === "pipeline" ? (
            <PlacementPipelineBoard
              cases={filteredCases}
              isLoading={isLoading}
              onCaseClick={(id) => setSelectedCaseId(id)}
              onRefresh={() => refetch()}
              advisorNames={advisorNames}
              isAdvisor={isAdvisor}
            />
          ) : (
            <div className="rounded-xl border bg-card overflow-hidden">
              {isLoading ? (
                <div className="p-4 space-y-3">
                  {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-12 w-full rounded-lg" />)}
                </div>
              ) : filteredCases.length === 0 ? (
                <div className="text-center py-16">
                  <HeartHandshake className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-muted-foreground font-medium">No cases found</p>
                  <p className="text-xs text-muted-foreground mt-1">Try adjusting your filters or search.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/30">
                        <th className="px-4 py-2.5 text-left font-medium text-muted-foreground text-xs">Seeker</th>
                        <th className="px-4 py-2.5 text-left font-medium text-muted-foreground text-xs">Contact</th>
                        <th className="px-4 py-2.5 text-left font-medium text-muted-foreground text-xs">Care Type</th>
                        <th className="px-4 py-2.5 text-left font-medium text-muted-foreground text-xs">Location</th>
                        <th className="px-4 py-2.5 text-left font-medium text-muted-foreground text-xs">Status</th>
                        <th className="px-4 py-2.5 text-left font-medium text-muted-foreground text-xs">Advisor</th>
                        <th className="px-4 py-2.5 text-left font-medium text-muted-foreground text-xs">Admission</th>
                        <th className="px-4 py-2.5 text-left font-medium text-muted-foreground text-xs">Tour</th>
                        <th className="px-4 py-2.5 text-left font-medium text-muted-foreground text-xs">Payment</th>
                        <th className="px-4 py-2.5 text-left font-medium text-muted-foreground text-xs">Billing</th>
                        <th className="px-4 py-2.5 text-left font-medium text-muted-foreground text-xs">Matches</th>
                        <th className="px-4 py-2.5 text-left font-medium text-muted-foreground text-xs">Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredCases.map((c) => {
                        const facility = c.placed_facility_id && facilityMap ? facilityMap[c.placed_facility_id] : null;
                        return (
                          <tr key={c.id}
                            className="border-b last:border-0 hover:bg-muted/20 cursor-pointer transition-colors"
                            onClick={() => setSelectedCaseId(c.id)}>
                            <td className="px-4 py-3">
                              <p className="font-medium truncate max-w-[140px]">{c.user_name}</p>
                              <p className="text-[10px] font-mono text-muted-foreground/60">{c.id.slice(0, 8)}</p>
                            </td>
                            <td className="px-4 py-3">
                              <p className="text-xs truncate max-w-[160px]">{c.user_email}</p>
                              <p className="text-[10px] text-muted-foreground">{c.user_phone}</p>
                            </td>
                            <td className="px-4 py-3 text-xs">{c.level_of_care || "—"}</td>
                            <td className="px-4 py-3 text-xs whitespace-nowrap">
                              {c.preferred_city ? `${c.preferred_city}, ` : ""}{c.desired_location_state || c.preferred_state || "Any"}
                            </td>
                            <td className="px-4 py-3">
                              <Badge variant="outline" className={cn("text-[10px]", STATUS_CONFIG[c.status]?.color || "")}>
                                {STATUS_CONFIG[c.status]?.label || c.status}
                              </Badge>
                            </td>
                            <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                              {getAdvisorName(c.assigned_advisor_id)}
                            </td>
                            <td className="px-4 py-3">
                              {c.admission_status === "admitted" || c.placement_confirmed ? (
                                <Badge variant="outline" className="bg-success/10 text-success border-success/30 text-[10px] gap-1">
                                  <CheckCircle className="h-3 w-3" />Admitted
                                </Badge>
                              ) : c.placed_facility_id ? (
                                <span className="text-xs text-muted-foreground">In Progress</span>
                              ) : (
                                <span className="text-xs text-muted-foreground">—</span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-xs whitespace-nowrap">
                              {c.tour_coordination_status === "scheduled" ? (
                                <Badge variant="outline" className="bg-cyan-500/10 text-cyan-600 border-cyan-500/30 text-[10px]">Scheduled</Badge>
                              ) : c.tour_coordination_status === "completed" ? (
                                <Badge variant="outline" className="bg-success/10 text-success border-success/30 text-[10px]">Done</Badge>
                              ) : c.tour_coordination_status && c.tour_coordination_status !== "not_needed" ? (
                                <span className="text-xs text-muted-foreground capitalize">{c.tour_coordination_status.replace(/_/g, " ")}</span>
                              ) : (
                                <span className="text-xs text-muted-foreground">—</span>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <Badge variant="outline" className={cn("text-[10px]",
                                isPaid(c.payment_status) ? "bg-success/10 text-success border-success/30" : "bg-destructive/10 text-destructive border-destructive/30"
                              )}>
                                {isPaid(c.payment_status) ? "✓ Paid" : "⚠ Unpaid"}
                              </Badge>
                            </td>
                            <td className="px-4 py-3">
                              {c.status === "placed" ? (
                                <Badge variant="outline" className={cn("text-[10px]",
                                  c.provider_fee_status === "paid" ? "bg-success/10 text-success border-success/30" :
                                  c.provider_fee_status === "waived" ? "bg-muted text-muted-foreground border-border" :
                                  "bg-warning/10 text-warning border-warning/30"
                                )}>
                                  {c.provider_fee_status === "paid" ? "Billed" :
                                   c.provider_fee_status === "waived" ? "Waived" : "Pending"}
                                </Badge>
                              ) : (
                                <span className="text-xs text-muted-foreground">—</span>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-1 tabular-nums text-xs">
                                {c.match_count || 0}
                                {(c.match_count || 0) > 0 && <UserCheck className="h-3.5 w-3.5 text-success" />}
                              </div>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <p className="text-xs tabular-nums">{format(new Date(c.created_at), "MMM d, yyyy")}</p>
                              <p className="text-[10px] text-muted-foreground">{formatDistanceToNow(new Date(c.updated_at), { addSuffix: true })}</p>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="international">
          <InternationalCasesTab />
        </TabsContent>

        <TabsContent value="providers">
          <NetworkProvidersTab />
        </TabsContent>

        <TabsContent value="invoices">
          <AllInvoicesTab />
        </TabsContent>
      </Tabs>

      {/* Detail Modal */}
      <PlacementDetailModal
        caseData={selectedCase}
        open={!!selectedCaseId}
        onClose={() => setSelectedCaseId(null)}
        onRefresh={() => refetch()}
        advisorNames={advisorNames}
        facilityMap={facilityMap || {}}
      />
    </div>
  );
}
