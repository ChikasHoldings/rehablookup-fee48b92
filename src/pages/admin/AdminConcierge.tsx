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
  Search, RefreshCw, HeartHandshake, Building2, Receipt,
  Globe, Flag, DollarSign, LayoutGrid, List,
  Clock, Users, CheckCircle,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { PlacementOpsDashboard } from "@/components/admin/concierge/PlacementOpsDashboard";
import { NetworkProvidersTab } from "@/components/admin/concierge/NetworkProvidersTab";
import { AllInvoicesTab } from "@/components/admin/concierge/AllInvoicesTab";
import { InternationalCasesTab } from "@/components/admin/concierge/InternationalCasesTab";
import { PlacementDetailModal } from "@/components/admin/concierge/PlacementDetailModal";
import { getCaseNextAction } from "@/components/admin/concierge/placementActionUtils";
import { CaseAlertIcons } from "@/components/admin/concierge/CaseSlaAlerts";
import { VISUAL_STAGES, getVisualStage, STATUS_CONFIG } from "@/components/admin/concierge/placementPipelineConfig";
import { cn } from "@/lib/utils";

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
  const [stageFilter, setStageFilter] = useState<string>("all");
  const [advisorFilter, setAdvisorFilter] = useState<string>("all");
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"table" | "dashboard">("table");

  useEffect(() => {
    if (isAdvisor && user?.id) setAdvisorFilter(user.id);
  }, [isAdvisor, user?.id]);

  const { data: cases, isLoading, refetch } = useQuery({
    queryKey: ["admin-concierge-cases-full"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("concierge_inquiries")
        .select("id, user_name, user_email, user_phone, status, payment_status, level_of_care, desired_location_state, preferred_state, preferred_city, match_count, assigned_advisor_id, created_at, updated_at, admission_status, admission_substatus, tour_coordination_status, placement_confirmed, placement_confirmed_at, placed_facility_id, introductions_sent_at, introductions_sent_count, provider_fee_status, provider_fee_cents, timeline_urgency, primary_concern, closed_at, seeker_confirmed, matched_at")
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

  const placedFacilityIds = [...new Set(pluckNonNull(cases, "placed_facility_id"))];
  const { data: facilityMap } = useQuery({
    queryKey: ["admin-placement-facilities", placedFacilityIds],
    queryFn: async () => {
      if (!placedFacilityIds.length) return {};
      const { data } = await supabase.from("facilities").select("id, name, city, state").in("id", placedFacilityIds as string[]);
      const map: Record<string, any> = {};
      data?.forEach(f => { map[f.id] = f; });
      return map;
    },
    enabled: placedFacilityIds.length > 0,
  });

  const { data: networkCount } = useQuery({
    queryKey: ["admin-network-provider-count"],
    queryFn: async () => {
      const { count } = await supabase.from("facilities").select("id", { count: "exact", head: true }).eq("concierge_network_opted_in", true);
      return count || 0;
    },
  });

  const { data: internationalCount } = useQuery({
    queryKey: ["admin-international-count"],
    queryFn: async () => {
      const { count } = await supabase.from("international_placement_cases").select("id", { count: "exact", head: true }).not("status", "eq", "closed");
      return count || 0;
    },
  });

  const { data: selectedCase } = useQuery({
    queryKey: ["admin-concierge-case-detail", selectedCaseId],
    queryFn: async () => {
      if (!selectedCaseId) return undefined;
      const { data, error } = await supabase
        .from("concierge_inquiries")
        .select("id, user_name, user_email, user_phone, status, payment_status, payment_amount_cents, intake_data, created_at, updated_at, admin_notes, assigned_advisor_id, matched_facility_ids, admin_matched_facility_ids, placed_facility_id, placement_confirmed, placement_confirmed_at, level_of_care, primary_concern, insurance_carrier, budget_range, timeline_urgency, preferred_state, preferred_city, gender, age_range, referral_source, tour_coordination_status, admission_status, admission_substatus, admission_notes, introductions_sent_at, introductions_sent_count, matched_at, closed_at, seeker_rating, seeker_feedback, provider_fee_cents, provider_fee_status, provider_fee_type, provider_invoice_id, draft_id, checkout_session_id, stripe_payment_intent_id, payment_type, idempotency_key, user_id, match_scores, notes, abandoned_cart_email_sent_at, alternative_contact_name, alternative_contact_phone, amenity_preferences, assessment_preference, benefits_verified, best_time_to_call, co_occurring_concerns, current_living_situation, current_medications, decision_maker_name, decision_maker_phone, desired_location_city, desired_location_state, desired_radius_miles, detox_needed, email_verified_at, emergency_contact_name, emergency_contact_phone, employer_name, faith_based_preference, form_completed_at, hipaa_consent, holistic_interest, insurance_group_number, insurance_member_id, intake_submitted_at, match_count, mobility_needs, move_in_date, needs_transport_help, payment_reminder_count, preferred_environment, preferred_language, prior_treatment_history, prior_treatment_notes, relationship_to_decision_maker, relationship_to_seeker, scholarship_interest, seeker_confirmed, seeker_confirmed_at, stripe_customer_id, substance_use_duration, substance_use_frequency, suicide_history, willing_to_travel")
        .eq("id", selectedCaseId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!selectedCaseId,
  });

  const getAdvisorName = (advisorId: string | null) => {
    if (!advisorId) return "—";
    const a = adminStaff?.find(s => s.user_id === advisorId);
    return a ? (a.display_name || `${a.first_name} ${a.last_name}`) : "—";
  };

  const advisorNames: Record<string, string> = {};
  adminStaff?.forEach(a => {
    advisorNames[a.user_id] = a.display_name || `${a.first_name} ${a.last_name}`;
  });

  // Filtering by visual stage group
  const filteredCases = (cases || []).filter(c => {
    if (stageFilter !== "all" && stageFilter !== "closed") {
      const vs = getVisualStage(c.status);
      if (vs.key !== stageFilter) return false;
    }
    if (stageFilter === "closed" && c.status !== "closed") return false;
    if (advisorFilter === "unassigned" && c.assigned_advisor_id !== null) return false;
    if (advisorFilter !== "all" && advisorFilter !== "unassigned" && c.assigned_advisor_id !== advisorFilter) return false;
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
  const activeCases = allCases.filter(c => !["completed", "closed"].includes(c.status)).length;
  const awaitingAction = allCases.filter(c => {
    const action = getCaseNextAction(c);
    return action.priority === "blocker" || action.priority === "high";
  }).length;
  const completedCases = allCases.filter(c => c.status === "completed" || c.status === "admitted").length;

  return (
    <div className="space-y-4 sm:space-y-6">
      <AdminPageHeader
        icon={HeartHandshake}
        iconGradient="bg-gradient-to-br from-primary to-primary/70"
        title="Placement Command Center"
        subtitle="Manage all placements from intake to completion"
        badges={[
          { label: "Active", value: activeCases, className: "bg-primary/10 text-primary" },
          { label: "Completed", value: completedCases, className: "bg-success/10 text-success" },
        ]}
        actions={
          <div className="flex items-center gap-2">
            {!isAdvisor && (
              <Button variant="outline" size="sm" asChild>
                <Link to="/admin/placement-revenue">
                  <DollarSign className="h-3.5 w-3.5 mr-1.5" />
                  <span className="text-xs sm:text-sm">Revenue</span>
                </Link>
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
              <span className="text-xs sm:text-sm">Refresh</span>
            </Button>
          </div>
        }
      />

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
              {!!internationalCount && <Badge variant="secondary" className="ml-1 h-4 px-1 text-[10px]">{internationalCount}</Badge>}
            </TabsTrigger>
            {!isAdvisor && (
              <>
                <TabsTrigger value="providers" className="flex items-center gap-1.5 px-3 whitespace-nowrap">
                  <Building2 className="h-3.5 w-3.5" />
                  <span className="text-xs sm:text-sm">Network</span>
                  {!!networkCount && <Badge variant="secondary" className="ml-1 h-4 px-1 text-[10px]">{networkCount}</Badge>}
                </TabsTrigger>
                <TabsTrigger value="invoices" className="flex items-center gap-1.5 px-3 whitespace-nowrap">
                  <Receipt className="h-3.5 w-3.5" />
                  <span className="text-xs sm:text-sm">Invoices</span>
                </TabsTrigger>
              </>
            )}
          </TabsList>
        </div>

        <TabsContent value="domestic" className="space-y-4">
          {/* KPI Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <AdminStatCard label="Total" value={isLoading ? "—" : totalCases} icon={HeartHandshake}
              onClick={() => setStageFilter("all")} active={stageFilter === "all"} />
            <AdminStatCard label="Active" value={isLoading ? "—" : activeCases} icon={Clock} valueClassName="text-primary" />
            <AdminStatCard label="Needs Action" value={isLoading ? "—" : awaitingAction} icon={Users} valueClassName="text-warning" />
            <AdminStatCard label="Admitted" value={isLoading ? "—" : completedCases} icon={CheckCircle} valueClassName="text-success" />
          </div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 rounded-xl border bg-card">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search by name, email, phone..." value={searchInput} onChange={(e) => setSearchInput(e.target.value)} className="pl-9" />
            </div>
            <Select value={stageFilter} onValueChange={setStageFilter}>
              <SelectTrigger className="w-full sm:w-[150px]">
                <SelectValue placeholder="Stage" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Stages</SelectItem>
                {VISUAL_STAGES.map(vs => (
                  <SelectItem key={vs.key} value={vs.key}>{vs.label}</SelectItem>
                ))}
                <SelectItem value="closed">Closed</SelectItem>
              </SelectContent>
            </Select>
            <Select value={advisorFilter} onValueChange={setAdvisorFilter}>
              <SelectTrigger className="w-full sm:w-[150px]">
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
              <span className="text-xs text-muted-foreground tabular-nums whitespace-nowrap">{filteredCases.length} cases</span>
              <div className="flex items-center border rounded-md overflow-hidden">
                <Button variant={viewMode === "table" ? "default" : "ghost"} size="sm"
                  className="h-8 px-2.5 rounded-none" onClick={() => setViewMode("table")} title="Table View">
                  <List className="h-3.5 w-3.5" />
                </Button>
                <Button variant={viewMode === "dashboard" ? "default" : "ghost"} size="sm"
                  className="h-8 px-2.5 rounded-none" onClick={() => setViewMode("dashboard")} title="Ops Dashboard">
                  <LayoutGrid className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </div>

          {/* Content */}
          {viewMode === "dashboard" ? (
            <PlacementOpsDashboard
              cases={filteredCases}
              onCaseClick={(id) => setSelectedCaseId(id)}
              advisorNames={advisorNames}
              isAdvisor={isAdvisor}
              currentAdvisorId={user?.id}
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
                  <p className="text-xs text-muted-foreground mt-1">Try adjusting your filters.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/30">
                        <th className="px-4 py-2.5 text-left font-medium text-muted-foreground text-xs">Client</th>
                        <th className="px-4 py-2.5 text-left font-medium text-muted-foreground text-xs">Advisor</th>
                        <th className="px-4 py-2.5 text-left font-medium text-muted-foreground text-xs">Stage</th>
                        <th className="px-4 py-2.5 text-left font-medium text-muted-foreground text-xs">Next Action</th>
                        <th className="px-4 py-2.5 text-left font-medium text-muted-foreground text-xs">Activity</th>
                        <th className="px-4 py-2.5 text-left font-medium text-muted-foreground text-xs w-[80px]">Alerts</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredCases.map((c) => {
                        const nextAction = getCaseNextAction(c);
                        const visualStage = getVisualStage(c.status);
                        return (
                          <tr key={c.id}
                            className="border-b last:border-0 hover:bg-primary/5 cursor-pointer transition-colors"
                            onClick={() => setSelectedCaseId(c.id)}>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div className={cn("h-2 w-2 rounded-full shrink-0",
                                  c.status === "completed" ? "bg-success" :
                                  c.status === "closed" ? "bg-muted-foreground/30" :
                                  nextAction.priority === "blocker" ? "bg-destructive animate-pulse" :
                                  "bg-primary"
                                )} />
                                <div className="min-w-0">
                                  <p className="font-medium truncate max-w-[180px]">{c.user_name}</p>
                                  <p className="text-[10px] text-muted-foreground font-mono">{c.id.slice(0, 8)}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                              {getAdvisorName(c.assigned_advisor_id) === "—" ? (
                                <Badge variant="outline" className="text-[9px] bg-destructive/10 text-destructive border-destructive/30">Unassigned</Badge>
                              ) : (
                                <span>{getAdvisorName(c.assigned_advisor_id)}</span>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <Badge variant="outline" className={cn("text-[10px]", visualStage.badgeColor)}>
                                {visualStage.label}
                              </Badge>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-1.5">
                                {nextAction.priority === "blocker" && <span className="h-2 w-2 rounded-full bg-destructive shrink-0" />}
                                {nextAction.priority === "done" && <CheckCircle className="h-3.5 w-3.5 text-success shrink-0" />}
                                <span className={cn("text-xs whitespace-nowrap",
                                  nextAction.priority === "blocker" && "text-destructive font-medium",
                                  nextAction.priority === "high" && "font-medium",
                                  nextAction.priority === "done" && "text-muted-foreground"
                                )}>{nextAction.label}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <p className="text-xs text-muted-foreground">
                                {formatDistanceToNow(new Date(c.updated_at), { addSuffix: true })}
                              </p>
                            </td>
                            <td className="px-4 py-3">
                              <CaseAlertIcons caseData={c} />
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
