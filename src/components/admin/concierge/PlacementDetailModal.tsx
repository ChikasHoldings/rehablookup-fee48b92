import { useState, useEffect } from "react";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  ClipboardList, Users, Send, Settings, DollarSign, MessageSquare,
  CalendarCheck, X, Mail, Phone, MapPin, Clock, CheckCircle,
  HeartHandshake, Building2, UserCheck, History, Eye, User,
  FileText, Home, Activity,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { useCaseTransition } from "@/hooks/useCaseTransition";
import { format, formatDistanceToNow } from "date-fns";
import { PlacementProgressStepper } from "./PlacementProgressStepper";
import { CaseSlaDetailBanner } from "./CaseSlaAlerts";
import { ConciergeIntakeTab } from "./ConciergeIntakeTab";
import { ConciergePlacementTab } from "./ConciergePlacementTab";
import { ConciergeIntroductionsTab } from "./ConciergeIntroductionsTab";
import { ConciergeActionsTab } from "./ConciergeActionsTab";
import { InvoiceManagementTab } from "./InvoiceManagementTab";
import { MessagesTab } from "./MessagesTab";
import { ToursTab } from "./ToursTab";
import { CaseTimelineEvents } from "./CaseTimelineEvents";
import { PlacementNextSteps } from "./PlacementNextSteps";
import { StageActionBar } from "./StageActionBar";
import { STATUS_CONFIG, getStageConfig } from "./placementPipelineConfig";
import { cn } from "@/lib/utils";
import type { Database } from "@/integrations/supabase/types";

type ConciergeInquiry = Database["public"]["Tables"]["concierge_inquiries"]["Row"];

interface PlacementDetailModalProps {
  caseData: ConciergeInquiry | undefined;
  open: boolean;
  onClose: () => void;
  onRefresh: () => void;
  advisorNames: Record<string, string>;
  facilityMap: Record<string, any>;
}

export function PlacementDetailModal({
  caseData, open, onClose, onRefresh, advisorNames, facilityMap,
}: PlacementDetailModalProps) {
  const { adminRole } = useAdminAuth();
  const isAdvisor = adminRole === "advisor";
  const canManageBilling = !isAdvisor;
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => { if (open) setActiveTab("overview"); }, [open, caseData?.id]);

  // Auto-transition: intake_submitted → intake_reviewed
  useEffect(() => {
    if (open && caseData?.status === "intake_submitted") {
      supabase.functions.invoke("auto-status-transition", {
        body: { inquiryId: caseData.id, trigger: "admin_viewed", actorType: "admin" },
      }).then(() => onRefresh()).catch(console.error);
    }
  }, [open, caseData?.id, caseData?.status]);

  const advanceStatus = useCaseTransition();

  // Counts
  const { data: introsCount } = useQuery({
    queryKey: ["placement-intros-count", caseData?.id],
    queryFn: async () => {
      const { count } = await supabase.from("concierge_introductions").select("id", { count: "exact", head: true }).eq("inquiry_id", caseData!.id);
      return count || 0;
    },
    enabled: !!caseData?.id,
  });

  const { data: pendingIntrosCount } = useQuery({
    queryKey: ["placement-pending-intros", caseData?.id],
    queryFn: async () => {
      const { count } = await supabase.from("concierge_introductions").select("id", { count: "exact", head: true }).eq("inquiry_id", caseData!.id).is("provider_response", null);
      return count || 0;
    },
    enabled: !!caseData?.id,
  });

  const { data: toursCount } = useQuery({
    queryKey: ["placement-tours-count", caseData?.id],
    queryFn: async () => {
      const { count } = await supabase.from("concierge_tour_requests").select("id", { count: "exact", head: true }).eq("inquiry_id", caseData!.id);
      return count || 0;
    },
    enabled: !!caseData?.id,
  });

  const { data: activeToursCount } = useQuery({
    queryKey: ["placement-active-tours", caseData?.id],
    queryFn: async () => {
      const { count } = await supabase.from("concierge_tour_requests").select("id", { count: "exact", head: true }).eq("inquiry_id", caseData!.id).not("status", "in", '("cancelled","completed")');
      return count || 0;
    },
    enabled: !!caseData?.id,
  });

  const { data: unreadMsgCount } = useQuery({
    queryKey: ["placement-unread-msgs", caseData?.id],
    queryFn: async () => {
      const { data: threads } = await supabase.from("concierge_threads").select("id, last_message_at, admin_last_read_at").eq("inquiry_id", caseData!.id);
      if (!threads) return 0;
      return threads.filter(t => t.last_message_at && (!t.admin_last_read_at || new Date(t.last_message_at) > new Date(t.admin_last_read_at))).length;
    },
    enabled: !!caseData?.id,
  });

  if (!caseData) return null;

  const isPaid = caseData.payment_status === "paid" || caseData.payment_status === "succeeded";
  const advisorName = caseData.assigned_advisor_id ? advisorNames[caseData.assigned_advisor_id] || "Assigned" : "Unassigned";
  const placedFacility = caseData.placed_facility_id ? facilityMap[caseData.placed_facility_id] : null;
  const isAdmitted = caseData.admission_status === "admitted" || caseData.placement_confirmed;
  const stageConfig = getStageConfig(caseData.status);
  const StageIcon = stageConfig.icon;

  const tabs = [
    { value: "overview", icon: ClipboardList, label: "Overview", badge: 0 },
    { value: "seeker", icon: User, label: "Seeker", badge: 0 },
    { value: "matching", icon: Users, label: "Matching", badge: caseData.match_count || 0 },
    { value: "introductions", icon: Send, label: "Intros", badge: pendingIntrosCount || 0 },
    { value: "decision", icon: Eye, label: "Decision", badge: (unreadMsgCount || 0) + (activeToursCount || 0) },
    { value: "admission", icon: Building2, label: "Admission", badge: 0 },
    ...(canManageBilling ? [{ value: "billing", icon: DollarSign, label: "Billing", badge: 0 }] : []),
    { value: "timeline", icon: History, label: "Timeline", badge: 0 },
    { value: "actions", icon: Settings, label: "Manage", badge: 0 },
  ];

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-5xl h-[92vh] flex flex-col p-0 gap-0 overflow-hidden">
        {/* ─── TOP SECTION: Case Identity ─── */}
        <div className="flex-shrink-0 border-b bg-card">
          {/* Row 1: Identity bar */}
          <div className="px-5 pt-4 pb-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shrink-0">
                  <HeartHandshake className="h-5 w-5 text-primary-foreground" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-lg font-bold truncate">{caseData.user_name}</h2>
                    <Badge variant="outline" className={cn("text-[10px] font-semibold", STATUS_CONFIG[caseData.status]?.color || "")}>
                      <StageIcon className="h-3 w-3 mr-1" />
                      {STATUS_CONFIG[caseData.status]?.label || caseData.status}
                    </Badge>
                    {isAdmitted && (
                      <Badge variant="outline" className="bg-success/10 text-success border-success/30 text-[10px] gap-1">
                        <CheckCircle className="h-3 w-3" />Admitted
                      </Badge>
                    )}
                  </div>
                  {/* Key metadata row */}
                  <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground flex-wrap">
                    <span className="flex items-center gap-1 font-mono text-[10px] bg-muted/50 px-1.5 py-0.5 rounded">
                      <FileText className="h-3 w-3" />
                      {caseData.id.slice(0, 8).toUpperCase()}
                    </span>
                    <Separator orientation="vertical" className="h-3" />
                    <span className="flex items-center gap-1">
                      <UserCheck className="h-3 w-3" />
                      <span className={cn(!caseData.assigned_advisor_id && "text-destructive font-medium")}>{advisorName}</span>
                    </span>
                    <Separator orientation="vertical" className="h-3" />
                    <span className="flex items-center gap-1">
                      <DollarSign className="h-3 w-3" />
                      <span className={cn(isPaid ? "text-success" : "text-destructive font-medium")}>{isPaid ? "Paid" : "Unpaid"}</span>
                    </span>
                    <Separator orientation="vertical" className="h-3" />
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatDistanceToNow(new Date(caseData.created_at), { addSuffix: true })}
                    </span>
                    {caseData.admission_status && caseData.admission_status !== "none" && (
                      <>
                        <Separator orientation="vertical" className="h-3" />
                        <span className="flex items-center gap-1">
                          <Building2 className="h-3 w-3" />
                          <span className="capitalize">{caseData.admission_status}</span>
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Row 2: Progress Tracker + SLA */}
          <div className="px-5 pb-3 space-y-2">
            <CaseSlaDetailBanner caseData={caseData} />
            <div className="overflow-x-auto">
              <PlacementProgressStepper
                caseData={{
                  status: caseData.status,
                  payment_status: caseData.payment_status,
                  assigned_advisor_id: caseData.assigned_advisor_id,
                  match_count: caseData.match_count,
                  introductions_sent_count: caseData.introductions_sent_count,
                  seeker_confirmed: caseData.seeker_confirmed,
                  tour_coordination_status: caseData.tour_coordination_status,
                  admission_status: caseData.admission_status,
                  placement_confirmed: caseData.placement_confirmed,
                  provider_fee_status: caseData.provider_fee_status,
                  closed_at: caseData.closed_at,
                }}
                compact
              />
            </div>
          </div>

          {/* Row 3: Stage Action Bar */}
          <div className="px-5 pb-3">
            <StageActionBar caseData={caseData} onRefresh={onRefresh} onSwitchTab={setActiveTab} />
          </div>
        </div>

        {/* ─── TABS ─── */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-shrink-0 px-5 border-b bg-card overflow-x-auto scrollbar-hide">
            <TabsList className="h-9 bg-transparent p-0 gap-0 w-auto inline-flex">
              {tabs.map(tab => (
                <TabsTrigger key={tab.value} value={tab.value}
                  className="gap-1.5 px-3 py-1.5 text-xs rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none">
                  <tab.icon className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">{tab.label}</span>
                  {tab.badge > 0 && (
                    <Badge variant={tab.value === "decision" ? "destructive" : "secondary"} className="h-4 min-w-[16px] px-1 text-[9px] ml-0.5">
                      {tab.badge}
                    </Badge>
                  )}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          <ScrollArea className="flex-1">
            <div className="p-1">
              {/* OVERVIEW TAB */}
              <TabsContent value="overview" className="m-0">
                <OverviewTab
                  caseData={caseData}
                  advisorName={advisorName}
                  placedFacility={placedFacility}
                  introsCount={introsCount || 0}
                  toursCount={toursCount || 0}
                  onSwitchTab={setActiveTab}
                />
              </TabsContent>

              {/* SEEKER DETAILS TAB */}
              <TabsContent value="seeker" className="m-0">
                <SeekerDetailsTab caseData={caseData} />
              </TabsContent>

              {/* PROVIDER MATCHING TAB */}
              <TabsContent value="matching" className="m-0">
                <ConciergePlacementTab caseData={caseData} onRefresh={onRefresh} />
              </TabsContent>

              {/* INTRODUCTIONS TAB */}
              <TabsContent value="introductions" className="m-0">
                <ConciergeIntroductionsTab caseData={caseData} onRefresh={onRefresh} />
              </TabsContent>

              {/* SEEKER DECISION TAB (Messages + Tours) */}
              <TabsContent value="decision" className="m-0">
                <SeekerDecisionTab caseData={caseData} />
              </TabsContent>

              {/* ADMISSION TAB */}
              <TabsContent value="admission" className="m-0">
                <AdmissionTab caseData={caseData} placedFacility={placedFacility} />
              </TabsContent>

              {/* BILLING TAB */}
              {canManageBilling && (
                <TabsContent value="billing" className="m-0">
                  <InvoiceManagementTab caseData={caseData} />
                </TabsContent>
              )}

              {/* TIMELINE TAB */}
              <TabsContent value="timeline" className="m-0">
                <div className="p-4">
                  <CaseTimelineEvents caseData={caseData} />
                </div>
              </TabsContent>

              {/* MANAGE TAB */}
              <TabsContent value="actions" className="m-0">
                <ConciergeActionsTab caseData={caseData} onRefresh={onRefresh} onClose={onClose} isAdvisor={isAdvisor} onSwitchTab={setActiveTab} />
              </TabsContent>
            </div>
          </ScrollArea>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

/* ═══════════════════════════════════════════
   TAB: Overview
   ═══════════════════════════════════════════ */
function OverviewTab({ caseData, advisorName, placedFacility, introsCount, toursCount, onSwitchTab }: {
  caseData: ConciergeInquiry; advisorName: string; placedFacility: any; introsCount: number; toursCount: number; onSwitchTab: (tab: string) => void;
}) {
  const isAdmitted = caseData.admission_status === "admitted" || caseData.placement_confirmed;

  return (
    <div className="p-5 space-y-5">
      {/* Admission Banner */}
      {isAdmitted && (
        <div className="p-4 rounded-xl border-2 border-success/30 bg-success/5">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="h-5 w-5 text-success" />
            <h3 className="font-semibold text-success">Admitted via Placement</h3>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-xs text-muted-foreground">Facility</p>
              <p className="font-medium">{placedFacility?.name || "—"}</p>
              {placedFacility && <p className="text-xs text-muted-foreground">{placedFacility.city}, {placedFacility.state}</p>}
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Admission Date</p>
              <p className="font-medium">
                {caseData.placement_confirmed_at ? format(new Date(caseData.placement_confirmed_at), "MMM d, yyyy") : "—"}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Closed case banner */}
      {caseData.status === "closed" && !isAdmitted && (
        <div className="p-4 rounded-xl border bg-muted/50 flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
            <Clock className="h-4 w-4 text-muted-foreground" />
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Case Closed</p>
            <p className="text-xs text-muted-foreground/70">
              {caseData.closed_at ? `Closed ${format(new Date(caseData.closed_at), "MMM d, yyyy")}` : "This case has been closed"} — review the timeline for details.
            </p>
          </div>
        </div>
      )}

      {/* NEXT ACTION ENGINE — the most important panel */}
      <PlacementNextSteps
        caseData={caseData}
        introsCount={introsCount}
        toursCount={toursCount}
        onSwitchTab={onSwitchTab}
      />

      {/* KPI Strip */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
        <KpiCard label="Matches" value={caseData.match_count || 0} onClick={() => onSwitchTab("matching")} />
        <KpiCard label="Intros" value={introsCount} onClick={() => onSwitchTab("introductions")} />
        <KpiCard label="Tours" value={toursCount} onClick={() => onSwitchTab("decision")} />
        <KpiCard label="Tour Status" value={caseData.tour_coordination_status?.replace(/_/g, " ") || "—"} />
        <KpiCard label="Admission" value={caseData.admission_status || "—"} onClick={() => onSwitchTab("admission")} />
        <KpiCard label="Fee" value={caseData.provider_fee_cents ? `$${(caseData.provider_fee_cents / 100).toFixed(0)}` : "—"} />
      </div>

      {/* Quick Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <SummaryCard icon={User} title="Seeker" onClick={() => onSwitchTab("seeker")}>
          <p className="text-sm font-medium">{caseData.user_name}</p>
          <p className="text-xs text-muted-foreground">{caseData.primary_concern || "No primary concern"}</p>
          <p className="text-xs text-muted-foreground">{caseData.level_of_care || "Level of care not set"}</p>
        </SummaryCard>

        <SummaryCard icon={MapPin} title="Location Preference" onClick={() => onSwitchTab("seeker")}>
          <p className="text-sm font-medium">
            {[caseData.preferred_city, caseData.preferred_state || caseData.desired_location_state].filter(Boolean).join(", ") || "Not specified"}
          </p>
          <p className="text-xs text-muted-foreground">{caseData.preferred_environment || "Any environment"}</p>
        </SummaryCard>

        <SummaryCard icon={DollarSign} title="Insurance" onClick={() => onSwitchTab("seeker")}>
          <p className="text-sm font-medium">{caseData.insurance_carrier || "Not provided"}</p>
          <p className="text-xs text-muted-foreground">{caseData.budget_range || "No budget range"}</p>
        </SummaryCard>
      </div>

      {/* Case Metadata */}
      <div className="rounded-xl border bg-card p-4">
        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Case Metadata</h4>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
          <MetaField label="Created" value={format(new Date(caseData.created_at), "MMM d, yyyy h:mm a")} />
          <MetaField label="Last Updated" value={formatDistanceToNow(new Date(caseData.updated_at), { addSuffix: true })} />
          <MetaField label="Urgency" value={caseData.timeline_urgency || "—"} />
          <MetaField label="Advisor" value={advisorName} />
        </div>
        {caseData.admin_notes && (
          <div className="mt-3 p-3 rounded-lg bg-muted/50 border">
            <p className="text-xs text-muted-foreground font-medium mb-1">Admin Notes</p>
            <p className="text-sm whitespace-pre-wrap">{caseData.admin_notes}</p>
          </div>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   TAB: Seeker Details (clean, organized)
   ═══════════════════════════════════════════ */
function SeekerDetailsTab({ caseData }: { caseData: ConciergeInquiry }) {
  return (
    <div className="p-5 space-y-5">
      {/* Contact Information */}
      <DetailSection icon={Mail} title="Contact Information">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-1">
          <InfoRow label="Full Name" value={caseData.user_name} />
          <InfoRow label="Email" value={caseData.user_email} />
          <InfoRow label="Phone" value={caseData.user_phone} />
          <InfoRow label="Best Time to Call" value={caseData.best_time_to_call} />
          <InfoRow label="Relationship to Seeker" value={caseData.relationship_to_seeker} />
          <InfoRow label="Decision Maker" value={caseData.decision_maker_name} />
          <InfoRow label="Decision Maker Phone" value={caseData.decision_maker_phone} />
          <InfoRow label="Emergency Contact" value={caseData.emergency_contact_name} />
          <InfoRow label="Emergency Phone" value={caseData.emergency_contact_phone} />
          <InfoRow label="Alt Contact" value={caseData.alternative_contact_name} />
          <InfoRow label="Alt Phone" value={caseData.alternative_contact_phone} />
          <InfoRow label="Referral Source" value={caseData.referral_source} />
        </div>
      </DetailSection>

      {/* Treatment Needs */}
      <DetailSection icon={Activity} title="Treatment Needs">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-1">
          <InfoRow label="Primary Concern" value={caseData.primary_concern} />
          <InfoRow label="Level of Care" value={caseData.level_of_care} />
          <InfoRow label="Detox Needed" value={caseData.detox_needed} />
          <InfoRow label="Substance Duration" value={caseData.substance_use_duration} />
          <InfoRow label="Frequency" value={caseData.substance_use_frequency} />
          <InfoRow label="Prior Treatment" value={caseData.prior_treatment_history ? "Yes" : caseData.prior_treatment_history === false ? "No" : null} />
          <InfoRow label="Prior Treatment Notes" value={caseData.prior_treatment_notes} />
          <InfoRow label="Co-Occurring" value={Array.isArray(caseData.co_occurring_concerns) ? (caseData.co_occurring_concerns as string[]).join(", ") : null} />
          <InfoRow label="Current Medications" value={caseData.current_medications} />
          <InfoRow label="Mobility Needs" value={caseData.mobility_needs} />
          <InfoRow label="Suicide History" value={caseData.suicide_history} />
          <InfoRow label="Assessment Preference" value={caseData.assessment_preference} />
        </div>
      </DetailSection>

      {/* Preferences */}
      <DetailSection icon={MapPin} title="Preferences & Location">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-1">
          <InfoRow label="Preferred City" value={caseData.preferred_city} />
          <InfoRow label="Preferred State" value={caseData.preferred_state || caseData.desired_location_state} />
          <InfoRow label="Environment" value={caseData.preferred_environment} />
          <InfoRow label="Gender" value={caseData.gender} />
          <InfoRow label="Age Range" value={caseData.age_range} />
          <InfoRow label="Faith-Based" value={caseData.faith_based_preference} />
          <InfoRow label="Holistic Interest" value={caseData.holistic_interest ? "Yes" : null} />
          <InfoRow label="Preferred Language" value={caseData.preferred_language} />
          <InfoRow label="Willing to Travel" value={caseData.willing_to_travel ? "Yes" : caseData.willing_to_travel === false ? "No" : null} />
          <InfoRow label="Needs Transport" value={caseData.needs_transport_help ? "Yes" : null} />
          <InfoRow label="Current Living" value={caseData.current_living_situation} />
          <InfoRow label="Move-In Date" value={caseData.move_in_date} />
        </div>
      </DetailSection>

      {/* Insurance & Financial */}
      <DetailSection icon={DollarSign} title="Insurance & Financial">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-1">
          <InfoRow label="Insurance Carrier" value={caseData.insurance_carrier} />
          <InfoRow label="Member ID" value={caseData.insurance_member_id} />
          <InfoRow label="Group Number" value={caseData.insurance_group_number} />
          <InfoRow label="Benefits Verified" value={caseData.benefits_verified ? "Yes" : caseData.benefits_verified === false ? "No" : null} />
          <InfoRow label="Employer" value={caseData.employer_name} />
          <InfoRow label="Budget Range" value={caseData.budget_range} />
          <InfoRow label="Scholarship Interest" value={caseData.scholarship_interest ? "Yes" : null} />
          <InfoRow label="Payment Status" value={caseData.payment_status} />
          <InfoRow label="Payment Amount" value={caseData.payment_amount_cents ? `$${(caseData.payment_amount_cents / 100).toFixed(2)}` : null} />
        </div>
      </DetailSection>
    </div>
  );
}

/* ═══════════════════════════════════════════
   TAB: Seeker Decision (Messages + Tours)
   ═══════════════════════════════════════════ */
function SeekerDecisionTab({ caseData }: { caseData: ConciergeInquiry }) {
  const [subTab, setSubTab] = useState<"messages" | "tours">("messages");

  return (
    <div className="p-4 space-y-3">
      <div className="flex items-center gap-2 border-b pb-2">
        <Button variant={subTab === "messages" ? "default" : "ghost"} size="sm" className="h-7 text-xs gap-1.5"
          onClick={() => setSubTab("messages")}>
          <MessageSquare className="h-3.5 w-3.5" />Messages
        </Button>
        <Button variant={subTab === "tours" ? "default" : "ghost"} size="sm" className="h-7 text-xs gap-1.5"
          onClick={() => setSubTab("tours")}>
          <CalendarCheck className="h-3.5 w-3.5" />Tours
        </Button>
      </div>
      {subTab === "messages" ? <MessagesTab caseData={caseData} /> : <ToursTab caseData={caseData} />}
    </div>
  );
}

/* ═══════════════════════════════════════════
   TAB: Admission — Structured progress tracker
   ═══════════════════════════════════════════ */

const ADMISSION_SUBSTAGES = [
  { key: "contact_initiated", label: "Contact Initiated", description: "Advisor contacted provider admissions team", icon: Phone },
  { key: "screening", label: "Screening", description: "Provider screening seeker eligibility", icon: ClipboardList },
  { key: "accepted", label: "Accepted", description: "Provider accepted seeker for admission", icon: CheckCircle },
  { key: "admission_scheduled", label: "Admission Scheduled", description: "Move-in / intake date confirmed", icon: CalendarCheck },
  { key: "admitted", label: "Admitted", description: "Seeker admitted to facility", icon: Home },
] as const;

function AdmissionTab({ caseData, placedFacility }: { caseData: ConciergeInquiry; placedFacility: any }) {
  const queryClient = useQueryClient();
  const isAdmitted = caseData.admission_status === "admitted" || caseData.placement_confirmed;
  const currentSubstatus = caseData.admission_substatus || "pending";
  const currentSubIdx = ADMISSION_SUBSTAGES.findIndex(s => s.key === currentSubstatus);

  // Fetch admission-related case events
  const { data: admissionEvents = [] } = useQuery({
    queryKey: ["admission-events", caseData.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("concierge_case_events")
        .select("id, event_type, event_data, created_at, actor_type, actor_id")
        .eq("inquiry_id", caseData.id)
        .in("event_type", [
          "admission_substatus_changed", "provider_update", "seeker_update",
          "admission_note_added", "placement_confirmed", "provider_accepted",
          "seeker_selected", "pii_disclosed_to_provider", "status_changed",
        ])
        .order("created_at", { ascending: false })
        .limit(30);
      if (error) throw error;
      return data || [];
    },
    staleTime: 30000,
  });

  // Advance admission substatus
  const advanceSubstatus = async (newSubstatus: string) => {
    const { error } = await supabase
      .from("concierge_inquiries")
      .update({
        admission_substatus: newSubstatus,
        ...(newSubstatus === "admitted" ? {
          admission_status: "admitted",
          placement_confirmed: true,
          placement_confirmed_at: new Date().toISOString(),
        } : {}),
      })
      .eq("id", caseData.id);
    if (error) { toast.error("Failed to update admission status"); return; }

    // Log event
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from("concierge_case_events").insert({
      inquiry_id: caseData.id,
      event_type: "admission_substatus_changed",
      event_data: { from: currentSubstatus, to: newSubstatus },
      actor_id: user?.id || null,
      actor_type: "admin",
    });

    toast.success(`Admission updated to: ${newSubstatus.replace(/_/g, " ")}`);
    queryClient.invalidateQueries({ queryKey: ["admin-concierge-case-detail", caseData.id] });
    queryClient.invalidateQueries({ queryKey: ["admin-concierge-cases-full"] });
    queryClient.invalidateQueries({ queryKey: ["admission-events", caseData.id] });
  };

  // Add admission note
  const [noteText, setNoteText] = useState("");
  const [noteType, setNoteType] = useState<"provider" | "seeker" | "advisor">("advisor");
  const addNote = async () => {
    if (!noteText.trim()) return;
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from("concierge_case_events").insert({
      inquiry_id: caseData.id,
      event_type: noteType === "provider" ? "provider_update" : noteType === "seeker" ? "seeker_update" : "admission_note_added",
      event_data: { note: noteText.trim(), source: noteType },
      actor_id: user?.id || null,
      actor_type: "admin",
    });
    setNoteText("");
    toast.success("Note added");
    queryClient.invalidateQueries({ queryKey: ["admission-events", caseData.id] });
  };

  // Separate events by type
  const providerUpdates = admissionEvents.filter(e => e.event_type === "provider_update" || e.event_type === "provider_accepted");
  const seekerUpdates = admissionEvents.filter(e => e.event_type === "seeker_update" || e.event_type === "seeker_selected");
  const allTimeline = admissionEvents;

  const nextSubstage = currentSubIdx < ADMISSION_SUBSTAGES.length - 1
    ? ADMISSION_SUBSTAGES[currentSubIdx + 1]
    : null;

  return (
    <div className="p-5 space-y-5">

      {/* ── Progress Tracker ── */}
      <div className="rounded-xl border bg-card p-4">
        <h4 className="text-sm font-semibold flex items-center gap-2 mb-4">
          <Building2 className="h-4 w-4 text-primary" />
          Admission Progress
        </h4>
        <div className="flex gap-1">
          {ADMISSION_SUBSTAGES.map((stage, i) => {
            const isDone = i <= currentSubIdx;
            const isCurrent = i === currentSubIdx;
            const StageIcon = stage.icon;
            return (
              <div key={stage.key} className="flex-1 text-center">
                <div className={cn(
                  "h-2 rounded-full mb-2 transition-colors",
                  isDone ? "bg-primary" : isCurrent ? "bg-primary/40 animate-pulse" : "bg-muted"
                )} />
                <div className={cn(
                  "mx-auto h-8 w-8 rounded-lg flex items-center justify-center mb-1",
                  isDone ? "bg-primary/10" : "bg-muted/50"
                )}>
                  <StageIcon className={cn("h-4 w-4", isDone ? "text-primary" : "text-muted-foreground")} />
                </div>
                <p className={cn("text-[10px] leading-tight", isDone ? "font-semibold text-foreground" : "text-muted-foreground")}>
                  {stage.label}
                </p>
              </div>
            );
          })}
        </div>

        {/* Next action */}
        {nextSubstage && !isAdmitted && (
          <div className="mt-4 flex items-center justify-between gap-3 rounded-lg border bg-primary/5 px-4 py-3">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground">Next: {nextSubstage.label}</p>
              <p className="text-xs text-muted-foreground">{nextSubstage.description}</p>
            </div>
            <Button size="sm" onClick={() => advanceSubstatus(nextSubstage.key)} className="shrink-0 gap-1.5">
              <CheckCircle className="h-3.5 w-3.5" /> Advance
            </Button>
          </div>
        )}
        {isAdmitted && (
          <div className="mt-4 rounded-lg border-2 border-success/30 bg-success/5 px-4 py-3 flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-success" />
            <p className="text-sm font-semibold text-success">Admission Complete</p>
          </div>
        )}
      </div>

      {/* ── Status Banner ── */}
      <div className={cn(
        "p-4 rounded-xl border-2",
        isAdmitted ? "border-success/30 bg-success/5" : "border-border bg-card"
      )}>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
          <MetaField label="Admission Substatus" value={currentSubstatus.replace(/_/g, " ")} />
          <MetaField label="Placement Confirmed" value={caseData.placement_confirmed ? "Yes" : "No"} />
          <MetaField label="Confirmed At" value={caseData.placement_confirmed_at ? format(new Date(caseData.placement_confirmed_at), "MMM d, yyyy") : "—"} />
          <MetaField label="Seeker Confirmed" value={caseData.seeker_confirmed ? "Yes" : "No"} />
        </div>
      </div>

      {/* ── Placed Facility ── */}
      <DetailSection icon={Home} title="Placed Facility">
        {placedFacility ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-1">
            <InfoRow label="Facility Name" value={placedFacility.name} />
            <InfoRow label="Location" value={`${placedFacility.city}, ${placedFacility.state}`} />
            <InfoRow label="Phone" value={placedFacility.phone} />
            <InfoRow label="Email" value={placedFacility.email} />
          </div>
        ) : (
          <p className="text-sm text-muted-foreground py-3">No facility assigned yet.</p>
        )}
      </DetailSection>

      {/* ── Add Update ── */}
      <DetailSection icon={MessageSquare} title="Add Update">
        <div className="flex gap-2 mb-2">
          {(["provider", "seeker", "advisor"] as const).map(t => (
            <button
              key={t}
              onClick={() => setNoteType(t)}
              className={cn(
                "px-3 py-1 rounded-full text-xs font-medium border transition-colors capitalize",
                noteType === t ? "bg-primary text-primary-foreground border-primary" : "bg-muted/50 text-muted-foreground border-border hover:bg-muted"
              )}
            >
              {t} Update
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder={`Log ${noteType} update...`}
            value={noteText}
            onChange={e => setNoteText(e.target.value)}
            onKeyDown={e => e.key === "Enter" && addNote()}
            className="flex-1 rounded-lg border bg-background px-3 py-2 text-sm"
          />
          <Button size="sm" onClick={addNote} disabled={!noteText.trim()}>Add</Button>
        </div>
      </DetailSection>

      {/* ── Provider Updates ── */}
      <DetailSection icon={Building2} title={`Provider Updates (${providerUpdates.length})`}>
        {providerUpdates.length === 0 ? (
          <p className="text-sm text-muted-foreground py-3">No provider updates yet.</p>
        ) : (
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {providerUpdates.map(ev => (
              <EventRow key={ev.id} event={ev} />
            ))}
          </div>
        )}
      </DetailSection>

      {/* ── Seeker Updates ── */}
      <DetailSection icon={User} title={`Seeker Updates (${seekerUpdates.length})`}>
        {seekerUpdates.length === 0 ? (
          <p className="text-sm text-muted-foreground py-3">No seeker updates yet.</p>
        ) : (
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {seekerUpdates.map(ev => (
              <EventRow key={ev.id} event={ev} />
            ))}
          </div>
        )}
      </DetailSection>

      {/* ── Full Timeline ── */}
      <DetailSection icon={History} title={`Admission Timeline (${allTimeline.length})`}>
        {allTimeline.length === 0 ? (
          <p className="text-sm text-muted-foreground py-3">No admission activity yet.</p>
        ) : (
          <div className="space-y-0 max-h-64 overflow-y-auto">
            {allTimeline.map(ev => (
              <div key={ev.id} className="flex items-start gap-3 py-2.5 border-b last:border-0">
                <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center shrink-0 mt-0.5">
                  <Activity className="h-3 w-3 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium capitalize">{ev.event_type.replace(/_/g, " ")}</p>
                  {(ev.event_data as any)?.note && (
                    <p className="text-xs text-muted-foreground mt-0.5 italic">"{(ev.event_data as any).note}"</p>
                  )}
                  {(ev.event_data as any)?.from && (ev.event_data as any)?.to && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {(ev.event_data as any).from.replace(/_/g, " ")} → {(ev.event_data as any).to.replace(/_/g, " ")}
                    </p>
                  )}
                </div>
                <span className="text-[10px] text-muted-foreground shrink-0 tabular-nums">
                  {ev.created_at ? format(new Date(ev.created_at), "MMM d, h:mm a") : ""}
                </span>
              </div>
            ))}
          </div>
        )}
      </DetailSection>

      {/* ── Admission Notes ── */}
      <DetailSection icon={FileText} title="Admission Notes">
        {caseData.admission_notes ? (
          <p className="text-sm whitespace-pre-wrap">{caseData.admission_notes}</p>
        ) : (
          <p className="text-sm text-muted-foreground py-3">No admission notes recorded.</p>
        )}
      </DetailSection>

      {/* ── Provider Fee ── */}
      <DetailSection icon={DollarSign} title="Provider Fee">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-1">
          <InfoRow label="Fee Amount" value={caseData.provider_fee_cents ? `$${(caseData.provider_fee_cents / 100).toFixed(2)}` : null} />
          <InfoRow label="Fee Status" value={caseData.provider_fee_status} />
          <InfoRow label="Fee Type" value={caseData.provider_fee_type} />
        </div>
      </DetailSection>
    </div>
  );
}

function EventRow({ event }: { event: any }) {
  const note = (event.event_data as any)?.note;
  const source = (event.event_data as any)?.source;
  return (
    <div className="flex items-start gap-2 rounded-lg border bg-muted/20 px-3 py-2">
      <div className="flex-1 min-w-0">
        {note ? (
          <p className="text-sm">{note}</p>
        ) : (
          <p className="text-sm capitalize">{event.event_type.replace(/_/g, " ")}</p>
        )}
        <p className="text-[10px] text-muted-foreground mt-0.5">
          {source && <span className="capitalize font-medium">{source}</span>}
          {source && " · "}
          {event.created_at ? format(new Date(event.created_at), "MMM d, h:mm a") : ""}
        </p>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   Shared Sub-Components
   ═══════════════════════════════════════════ */

function DetailSection({ icon: Icon, title, children }: { icon: React.ElementType; title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <h4 className="text-sm font-semibold flex items-center gap-2 mb-3">
        <Icon className="h-4 w-4 text-primary" />
        {title}
      </h4>
      {children}
    </div>
  );
}

function SummaryCard({ icon: Icon, title, onClick, children }: { icon: React.ElementType; title: string; onClick?: () => void; children: React.ReactNode }) {
  return (
    <div
      className={cn("rounded-xl border bg-card p-4 space-y-1.5", onClick && "cursor-pointer hover:border-primary/30 hover:bg-primary/5 transition-colors")}
      onClick={onClick}
    >
      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
        <Icon className="h-3.5 w-3.5" />{title}
      </h4>
      {children}
    </div>
  );
}

function KpiCard({ label, value, onClick }: { label: string; value: string | number; onClick?: () => void }) {
  const isZero = value === 0 || value === "0" || value === "—" || value === "none";
  return (
    <div
      className={cn(
        "text-center p-2.5 rounded-lg border transition-colors",
        isZero ? "bg-muted/20 border-border/50" : "bg-card border-border",
        onClick && "cursor-pointer hover:bg-primary/5 hover:border-primary/30"
      )}
      onClick={onClick}
    >
      <p className={cn("text-sm font-bold tabular-nums capitalize", isZero && "text-muted-foreground/50")}>{value}</p>
      <p className="text-[9px] text-muted-foreground uppercase tracking-wider mt-0.5">{label}</p>
    </div>
  );
}

function MetaField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-medium tabular-nums capitalize">{value}</p>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <div className="flex justify-between py-1 gap-3">
      <span className="text-xs text-muted-foreground whitespace-nowrap">{label}</span>
      <span className="text-xs font-medium text-right break-words">{value}</span>
    </div>
  );
}
