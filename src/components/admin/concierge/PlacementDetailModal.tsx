import { useState, useEffect } from "react";
import { toast } from "sonner";
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
import { ConciergePlacementTab } from "./ConciergePlacementTab";
import { ConciergeIntroductionsTab } from "./ConciergeIntroductionsTab";
import { ConciergeActionsTab } from "./ConciergeActionsTab";
import { InvoiceManagementTab } from "./InvoiceManagementTab";
import { MessagesTab } from "./MessagesTab";
import { ToursTab } from "./ToursTab";
import { CaseTimelineEvents } from "./CaseTimelineEvents";
import { PlacementNextSteps } from "./PlacementNextSteps";
import { StageActionBar } from "./StageActionBar";
import { STATUS_CONFIG, getVisualStage } from "./placementPipelineConfig";
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

  // Auto-transition: intake_submitted → intake_reviewed when admin views
  useEffect(() => {
    if (open && caseData?.status === "intake_submitted") {
      supabase.functions.invoke("auto-status-transition", {
        body: { inquiryId: caseData.id, trigger: "admin_viewed", actorType: "admin" },
      }).then(() => onRefresh()).catch(console.error);
    }
  }, [open, caseData?.id, caseData?.status]);

  // Counts for badges
  const { data: introsCount } = useQuery({
    queryKey: ["placement-intros-count", caseData?.id],
    queryFn: async () => {
      const { count } = await supabase.from("concierge_introductions").select("id", { count: "exact", head: true }).eq("inquiry_id", caseData!.id);
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

  if (!caseData) return null;

  const isPaid = caseData.payment_status === "paid" || caseData.payment_status === "succeeded";
  const advisorName = caseData.assigned_advisor_id ? advisorNames[caseData.assigned_advisor_id] || "Assigned" : "Unassigned";
  const placedFacility = caseData.placed_facility_id ? facilityMap[caseData.placed_facility_id] : null;
  const isAdmitted = caseData.admission_status === "admitted" || caseData.placement_confirmed;
  const visualStage = getVisualStage(caseData.status);
  const VisualIcon = visualStage.icon;

  // Simplified 5-tab layout
  const tabs = [
    { value: "overview", icon: ClipboardList, label: "Overview" },
    { value: "seeker", icon: User, label: "Seeker" },
    { value: "matching", icon: Users, label: "Matching", badge: (caseData.match_count || 0) + (introsCount || 0) },
    { value: "admission", icon: Building2, label: "Admission" },
    { value: "manage", icon: Settings, label: "Manage" },
  ];

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-5xl h-[92vh] flex flex-col p-0 gap-0 overflow-hidden">
        {/* ─── Header ─── */}
        <div className="flex-shrink-0 border-b bg-card">
          <div className="px-5 pt-4 pb-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shrink-0">
                  <HeartHandshake className="h-5 w-5 text-primary-foreground" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-lg font-bold truncate">{caseData.user_name}</h2>
                    <Badge variant="outline" className={cn("text-[10px] font-semibold", visualStage.badgeColor)}>
                      <VisualIcon className="h-3 w-3 mr-1" />
                      {visualStage.label}
                    </Badge>
                    {isAdmitted && (
                      <Badge variant="outline" className="bg-success/10 text-success border-success/30 text-[10px] gap-1">
                        <CheckCircle className="h-3 w-3" />Admitted
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground flex-wrap">
                    <span className="flex items-center gap-1 font-mono text-[10px] bg-muted/50 px-1.5 py-0.5 rounded">
                      {caseData.id.slice(0, 8).toUpperCase()}
                    </span>
                    <Separator orientation="vertical" className="h-3" />
                    <span className="flex items-center gap-1">
                      <UserCheck className="h-3 w-3" />
                      <span className={cn(!caseData.assigned_advisor_id && "text-destructive font-medium")}>{advisorName}</span>
                    </span>
                    <Separator orientation="vertical" className="h-3" />
                    <span className={cn("flex items-center gap-1", isPaid ? "text-success" : "text-destructive font-medium")}>
                      <DollarSign className="h-3 w-3" />{isPaid ? "Paid" : "Unpaid"}
                    </span>
                    <Separator orientation="vertical" className="h-3" />
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatDistanceToNow(new Date(caseData.created_at), { addSuffix: true })}
                    </span>
                  </div>
                </div>
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Progress + Action */}
          <div className="px-5 pb-3 space-y-2">
            <CaseSlaDetailBanner caseData={caseData} />
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
            <StageActionBar caseData={caseData} onRefresh={onRefresh} onSwitchTab={setActiveTab} />
          </div>
        </div>

        {/* ─── Tabs ─── */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-shrink-0 px-5 border-b bg-card">
            <TabsList className="h-9 bg-transparent p-0 gap-0 w-auto inline-flex">
              {tabs.map(tab => (
                <TabsTrigger key={tab.value} value={tab.value}
                  className="gap-1.5 px-3 py-1.5 text-xs rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none">
                  <tab.icon className="h-3.5 w-3.5" />
                  {tab.label}
                  {tab.badge && tab.badge > 0 ? (
                    <Badge variant="secondary" className="h-4 min-w-[16px] px-1 text-[9px] ml-0.5">{tab.badge}</Badge>
                  ) : null}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          <ScrollArea className="flex-1">
            <div className="p-1">
              {/* OVERVIEW */}
              <TabsContent value="overview" className="m-0">
                <OverviewTab caseData={caseData} advisorName={advisorName} placedFacility={placedFacility}
                  introsCount={introsCount || 0} toursCount={toursCount || 0} onSwitchTab={setActiveTab} />
              </TabsContent>

              {/* SEEKER */}
              <TabsContent value="seeker" className="m-0">
                <SeekerDetailsTab caseData={caseData} />
              </TabsContent>

              {/* MATCHING (includes matching + introductions + messages) */}
              <TabsContent value="matching" className="m-0">
                <MatchingTab caseData={caseData} onRefresh={onRefresh} />
              </TabsContent>

              {/* ADMISSION (includes admission tracking + billing + tours) */}
              <TabsContent value="admission" className="m-0">
                <AdmissionTab caseData={caseData} placedFacility={placedFacility} canManageBilling={canManageBilling} />
              </TabsContent>

              {/* MANAGE (actions + timeline) */}
              <TabsContent value="manage" className="m-0">
                <div className="space-y-0">
                  <ConciergeActionsTab caseData={caseData} onRefresh={onRefresh} onClose={onClose} isAdvisor={isAdvisor} onSwitchTab={setActiveTab} />
                  <div className="p-4 border-t">
                    <h4 className="text-sm font-semibold flex items-center gap-2 mb-3">
                      <History className="h-4 w-4 text-primary" />Case Timeline
                    </h4>
                    <CaseTimelineEvents caseData={caseData} />
                  </div>
                </div>
              </TabsContent>
            </div>
          </ScrollArea>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

/* ═══════════════════════════════════════════
   Overview Tab — simplified
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
            <h3 className="font-semibold text-success">Admitted</h3>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-xs text-muted-foreground">Facility</p>
              <p className="font-medium">{placedFacility?.name || "—"}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Date</p>
              <p className="font-medium">{caseData.placement_confirmed_at ? format(new Date(caseData.placement_confirmed_at), "MMM d, yyyy") : "—"}</p>
            </div>
          </div>
        </div>
      )}

      {caseData.status === "closed" && !isAdmitted && (
        <div className="p-4 rounded-xl border bg-muted/50 flex items-center gap-3">
          <Clock className="h-5 w-5 text-muted-foreground" />
          <div>
            <p className="text-sm font-medium text-muted-foreground">Case Closed</p>
            <p className="text-xs text-muted-foreground/70">
              {caseData.closed_at ? `Closed ${format(new Date(caseData.closed_at), "MMM d, yyyy")}` : "This case has been closed"}
            </p>
          </div>
        </div>
      )}

      {/* Next Action */}
      <PlacementNextSteps caseData={caseData} introsCount={introsCount} toursCount={toursCount} onSwitchTab={onSwitchTab} />

      {/* Quick Stats */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
        <KpiCard label="Matches" value={caseData.match_count || 0} onClick={() => onSwitchTab("matching")} />
        <KpiCard label="Intros" value={introsCount} onClick={() => onSwitchTab("matching")} />
        <KpiCard label="Tours" value={toursCount} onClick={() => onSwitchTab("admission")} />
        <KpiCard label="Admission" value={caseData.admission_status || "—"} onClick={() => onSwitchTab("admission")} />
        <KpiCard label="Fee" value={caseData.provider_fee_cents ? `$${(caseData.provider_fee_cents / 100).toFixed(0)}` : "—"} />
        <KpiCard label="Urgency" value={caseData.timeline_urgency || "—"} />
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <SummaryCard icon={User} title="Seeker" onClick={() => onSwitchTab("seeker")}>
          <p className="text-sm font-medium">{caseData.user_name}</p>
          <p className="text-xs text-muted-foreground">{caseData.primary_concern || "No primary concern"}</p>
          <p className="text-xs text-muted-foreground">{caseData.level_of_care || "Level of care not set"}</p>
        </SummaryCard>
        <SummaryCard icon={MapPin} title="Location" onClick={() => onSwitchTab("seeker")}>
          <p className="text-sm font-medium">
            {[caseData.preferred_city, caseData.preferred_state || caseData.desired_location_state].filter(Boolean).join(", ") || "Not specified"}
          </p>
        </SummaryCard>
        <SummaryCard icon={DollarSign} title="Insurance" onClick={() => onSwitchTab("seeker")}>
          <p className="text-sm font-medium">{caseData.insurance_carrier || "Not provided"}</p>
          <p className="text-xs text-muted-foreground">{caseData.budget_range || "No budget"}</p>
        </SummaryCard>
      </div>

      {/* Admin Notes */}
      {caseData.admin_notes && (
        <div className="rounded-xl border bg-card p-4">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Admin Notes</h4>
          <p className="text-sm whitespace-pre-wrap">{caseData.admin_notes}</p>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════
   Seeker Details Tab
   ═══════════════════════════════════════════ */
function SeekerDetailsTab({ caseData }: { caseData: ConciergeInquiry }) {
  return (
    <div className="p-5 space-y-5">
      <DetailSection icon={Mail} title="Contact">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-1">
          <InfoRow label="Full Name" value={caseData.user_name} />
          <InfoRow label="Email" value={caseData.user_email} />
          <InfoRow label="Phone" value={caseData.user_phone} />
          <InfoRow label="Best Time to Call" value={caseData.best_time_to_call} />
          <InfoRow label="Relationship" value={caseData.relationship_to_seeker} />
          <InfoRow label="Decision Maker" value={caseData.decision_maker_name} />
          <InfoRow label="Emergency Contact" value={caseData.emergency_contact_name} />
          <InfoRow label="Referral Source" value={caseData.referral_source} />
        </div>
      </DetailSection>

      <DetailSection icon={Activity} title="Treatment Needs">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-1">
          <InfoRow label="Primary Concern" value={caseData.primary_concern} />
          <InfoRow label="Level of Care" value={caseData.level_of_care} />
          <InfoRow label="Detox Needed" value={caseData.detox_needed} />
          <InfoRow label="Substance Duration" value={caseData.substance_use_duration} />
          <InfoRow label="Prior Treatment" value={caseData.prior_treatment_history ? "Yes" : caseData.prior_treatment_history === false ? "No" : null} />
          <InfoRow label="Co-Occurring" value={Array.isArray(caseData.co_occurring_concerns) ? (caseData.co_occurring_concerns as string[]).join(", ") : null} />
          <InfoRow label="Current Medications" value={caseData.current_medications} />
          <InfoRow label="Mobility Needs" value={caseData.mobility_needs} />
        </div>
      </DetailSection>

      <DetailSection icon={MapPin} title="Preferences">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-1">
          <InfoRow label="City" value={caseData.preferred_city} />
          <InfoRow label="State" value={caseData.preferred_state || caseData.desired_location_state} />
          <InfoRow label="Environment" value={caseData.preferred_environment} />
          <InfoRow label="Gender" value={caseData.gender} />
          <InfoRow label="Age Range" value={caseData.age_range} />
          <InfoRow label="Faith-Based" value={caseData.faith_based_preference} />
          <InfoRow label="Language" value={caseData.preferred_language} />
          <InfoRow label="Move-In Date" value={caseData.move_in_date} />
        </div>
      </DetailSection>

      <DetailSection icon={DollarSign} title="Insurance & Financial">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-1">
          <InfoRow label="Carrier" value={caseData.insurance_carrier} />
          <InfoRow label="Member ID" value={caseData.insurance_member_id} />
          <InfoRow label="Benefits Verified" value={caseData.benefits_verified ? "Yes" : caseData.benefits_verified === false ? "No" : null} />
          <InfoRow label="Budget Range" value={caseData.budget_range} />
          <InfoRow label="Payment Status" value={caseData.payment_status} />
          <InfoRow label="Amount" value={caseData.payment_amount_cents ? `$${(caseData.payment_amount_cents / 100).toFixed(2)}` : null} />
        </div>
      </DetailSection>
    </div>
  );
}

/* ═══════════════════════════════════════════
   Matching Tab (matching + introductions + messages combined)
   ═══════════════════════════════════════════ */
function MatchingTab({ caseData, onRefresh }: { caseData: ConciergeInquiry; onRefresh: () => void }) {
  const [subView, setSubView] = useState<"matching" | "introductions" | "messages">("matching");

  return (
    <div className="space-y-0">
      <div className="flex items-center gap-1 px-4 pt-3 pb-2 border-b">
        {(["matching", "introductions", "messages"] as const).map(v => (
          <Button key={v} variant={subView === v ? "default" : "ghost"} size="sm" className="h-7 text-xs capitalize"
            onClick={() => setSubView(v)}>
            {v === "matching" ? <Users className="h-3 w-3 mr-1" /> : v === "introductions" ? <Send className="h-3 w-3 mr-1" /> : <MessageSquare className="h-3 w-3 mr-1" />}
            {v}
          </Button>
        ))}
      </div>
      {subView === "matching" && <ConciergePlacementTab caseData={caseData} onRefresh={onRefresh} />}
      {subView === "introductions" && <ConciergeIntroductionsTab caseData={caseData} onRefresh={onRefresh} />}
      {subView === "messages" && <MessagesTab caseData={caseData} />}
    </div>
  );
}

/* ═══════════════════════════════════════════
   Admission Tab (admission + billing + tours combined)
   ═══════════════════════════════════════════ */
const ADMISSION_SUBSTAGES = [
  { key: "contact_initiated", label: "Contact Initiated", icon: Phone },
  { key: "screening", label: "Screening", icon: ClipboardList },
  { key: "accepted", label: "Accepted", icon: CheckCircle },
  { key: "admission_scheduled", label: "Scheduled", icon: CalendarCheck },
  { key: "admitted", label: "Admitted", icon: Home },
] as const;

function AdmissionTab({ caseData, placedFacility, canManageBilling }: {
  caseData: ConciergeInquiry; placedFacility: any; canManageBilling: boolean;
}) {
  const queryClient = useQueryClient();
  const isAdmitted = caseData.admission_status === "admitted" || caseData.placement_confirmed;
  const currentSubstatus = caseData.admission_substatus || "pending";
  const currentSubIdx = ADMISSION_SUBSTAGES.findIndex(s => s.key === currentSubstatus);

  const [subView, setSubView] = useState<"progress" | "tours" | "billing">("progress");
  const [noteText, setNoteText] = useState("");

  const advanceSubstatus = async (newSubstatus: string) => {
    const { error } = await supabase.from("concierge_inquiries")
      .update({
        admission_substatus: newSubstatus,
        ...(newSubstatus === "admitted" ? { admission_status: "admitted", placement_confirmed: true, placement_confirmed_at: new Date().toISOString() } : {}),
      })
      .eq("id", caseData.id);
    if (error) { toast.error("Failed to update"); return; }

    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from("concierge_case_events").insert({
      inquiry_id: caseData.id,
      event_type: "admission_substatus_changed",
      event_data: { from: currentSubstatus, to: newSubstatus },
      actor_id: user?.id || null,
      actor_type: "admin",
    });

    toast.success(`Updated to: ${newSubstatus.replace(/_/g, " ")}`);
    queryClient.invalidateQueries({ queryKey: ["admin-concierge-case-detail", caseData.id] });
    queryClient.invalidateQueries({ queryKey: ["admin-concierge-cases-full"] });
  };

  const addNote = async () => {
    if (!noteText.trim()) return;
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from("concierge_case_events").insert({
      inquiry_id: caseData.id,
      event_type: "admission_note_added",
      event_data: { note: noteText.trim() },
      actor_id: user?.id || null,
      actor_type: "admin",
    });
    setNoteText("");
    toast.success("Note added");
  };

  const nextSubstage = currentSubIdx < ADMISSION_SUBSTAGES.length - 1 ? ADMISSION_SUBSTAGES[currentSubIdx + 1] : null;

  return (
    <div className="space-y-0">
      <div className="flex items-center gap-1 px-4 pt-3 pb-2 border-b">
        <Button variant={subView === "progress" ? "default" : "ghost"} size="sm" className="h-7 text-xs" onClick={() => setSubView("progress")}>
          <Building2 className="h-3 w-3 mr-1" />Progress
        </Button>
        <Button variant={subView === "tours" ? "default" : "ghost"} size="sm" className="h-7 text-xs" onClick={() => setSubView("tours")}>
          <CalendarCheck className="h-3 w-3 mr-1" />Tours
        </Button>
        {canManageBilling && (
          <Button variant={subView === "billing" ? "default" : "ghost"} size="sm" className="h-7 text-xs" onClick={() => setSubView("billing")}>
            <DollarSign className="h-3 w-3 mr-1" />Billing
          </Button>
        )}
      </div>

      {subView === "progress" && (
        <div className="p-5 space-y-5">
          {/* Progress Tracker */}
          <div className="rounded-xl border bg-card p-4">
            <h4 className="text-sm font-semibold flex items-center gap-2 mb-4">
              <Building2 className="h-4 w-4 text-primary" />Admission Progress
            </h4>
            <div className="flex gap-1">
              {ADMISSION_SUBSTAGES.map((stage, i) => {
                const isDone = i <= currentSubIdx;
                const StageIcon = stage.icon;
                return (
                  <div key={stage.key} className="flex-1 text-center">
                    <div className={cn("h-2 rounded-full mb-2", isDone ? "bg-primary" : "bg-muted")} />
                    <div className={cn("mx-auto h-8 w-8 rounded-lg flex items-center justify-center mb-1", isDone ? "bg-primary/10" : "bg-muted/50")}>
                      <StageIcon className={cn("h-4 w-4", isDone ? "text-primary" : "text-muted-foreground")} />
                    </div>
                    <p className={cn("text-[10px] leading-tight", isDone ? "font-semibold" : "text-muted-foreground")}>{stage.label}</p>
                  </div>
                );
              })}
            </div>

            {nextSubstage && !isAdmitted && (
              <div className="mt-4 flex items-center justify-between gap-3 rounded-lg border bg-primary/5 px-4 py-3">
                <p className="text-sm font-medium">Next: {nextSubstage.label}</p>
                <Button size="sm" onClick={() => advanceSubstatus(nextSubstage.key)} className="gap-1.5">
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

          {/* Placed Facility */}
          {placedFacility && (
            <DetailSection icon={Home} title="Placed Facility">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-1">
                <InfoRow label="Facility" value={placedFacility.name} />
                <InfoRow label="Location" value={`${placedFacility.city}, ${placedFacility.state}`} />
              </div>
            </DetailSection>
          )}

          {/* Quick Note */}
          <div className="rounded-xl border bg-card p-4">
            <h4 className="text-sm font-semibold mb-2">Add Note</h4>
            <div className="flex gap-2">
              <input type="text" placeholder="Log update..." value={noteText}
                onChange={e => setNoteText(e.target.value)} onKeyDown={e => e.key === "Enter" && addNote()}
                className="flex-1 rounded-lg border bg-background px-3 py-2 text-sm" />
              <Button size="sm" onClick={addNote} disabled={!noteText.trim()}>Add</Button>
            </div>
          </div>

          {/* Fee Summary */}
          <DetailSection icon={DollarSign} title="Provider Fee">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-8 gap-y-1">
              <InfoRow label="Amount" value={caseData.provider_fee_cents ? `$${(caseData.provider_fee_cents / 100).toFixed(2)}` : null} />
              <InfoRow label="Status" value={caseData.provider_fee_status} />
              <InfoRow label="Type" value={caseData.provider_fee_type} />
            </div>
          </DetailSection>
        </div>
      )}

      {subView === "tours" && <ToursTab caseData={caseData} />}
      {subView === "billing" && canManageBilling && <InvoiceManagementTab caseData={caseData} />}
    </div>
  );
}

/* ═══════════════════════════════════════════
   Shared Components
   ═══════════════════════════════════════════ */

function DetailSection({ icon: Icon, title, children }: { icon: React.ElementType; title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <h4 className="text-sm font-semibold flex items-center gap-2 mb-3">
        <Icon className="h-4 w-4 text-primary" />{title}
      </h4>
      {children}
    </div>
  );
}

function SummaryCard({ icon: Icon, title, onClick, children }: { icon: React.ElementType; title: string; onClick?: () => void; children: React.ReactNode }) {
  return (
    <div className={cn("rounded-xl border bg-card p-4 space-y-1.5", onClick && "cursor-pointer hover:border-primary/30 hover:bg-primary/5 transition-colors")} onClick={onClick}>
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
    <div className={cn("text-center p-2.5 rounded-lg border transition-colors", isZero ? "bg-muted/20" : "bg-card", onClick && "cursor-pointer hover:bg-primary/5")} onClick={onClick}>
      <p className={cn("text-sm font-bold tabular-nums capitalize", isZero && "text-muted-foreground/50")}>{value}</p>
      <p className="text-[9px] text-muted-foreground uppercase tracking-wider mt-0.5">{label}</p>
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
