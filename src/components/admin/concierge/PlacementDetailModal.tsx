import { useState, useEffect } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  ClipboardList, Users, Send, Settings, DollarSign, MessageSquare,
  CalendarCheck, X, Mail, Phone, MapPin, Clock, CheckCircle,
  HeartHandshake, Building2, UserCheck, History,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { useCaseTransition } from "@/hooks/useCaseTransition";
import { toast } from "sonner";
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
import { getCaseBlocker } from "./placementActionUtils";
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

import { STATUS_CONFIG } from "./placementPipelineConfig";

export function PlacementDetailModal({
  caseData,
  open,
  onClose,
  onRefresh,
  advisorNames,
  facilityMap,
}: PlacementDetailModalProps) {
  const { adminRole, user } = useAdminAuth();
  const isAdvisor = adminRole === "advisor";
  const canManageBilling = !isAdvisor;
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    if (open) setActiveTab("overview");
  }, [open, caseData?.id]);

  // Auto-transition: intake_submitted → intake_reviewed
  useEffect(() => {
    if (open && caseData?.status === "intake_submitted") {
      supabase.functions.invoke("auto-status-transition", {
        body: { inquiryId: caseData.id, trigger: "admin_viewed", actorType: "admin" },
      }).then(() => onRefresh()).catch(console.error);
    }
  }, [open, caseData?.id, caseData?.status]);

  // Advance status (uses centralized transition hook)
  const advanceStatus = useCaseTransition();

  const handleAdvanceStatus = (nextStatus: string) => {
    if (!caseData) return;
    advanceStatus.mutate({
      caseId: caseData.id,
      fromStatus: caseData.status,
      toStatus: nextStatus,
      via: "stepper",
      onSuccess: onRefresh,
    });
  };

  // Fetch introductions count
  const { data: introsCount } = useQuery({
    queryKey: ["placement-intros-count", caseData?.id],
    queryFn: async () => {
      const { count } = await supabase
        .from("concierge_introductions")
        .select("id", { count: "exact", head: true })
        .eq("inquiry_id", caseData!.id);
      return count || 0;
    },
    enabled: !!caseData?.id,
  });

  // Fetch pending intro responses
  const { data: pendingIntrosCount } = useQuery({
    queryKey: ["placement-pending-intros", caseData?.id],
    queryFn: async () => {
      const { count } = await supabase
        .from("concierge_introductions")
        .select("id", { count: "exact", head: true })
        .eq("inquiry_id", caseData!.id)
        .is("provider_response", null);
      return count || 0;
    },
    enabled: !!caseData?.id,
  });

  // Fetch tours count
  const { data: toursCount } = useQuery({
    queryKey: ["placement-tours-count", caseData?.id],
    queryFn: async () => {
      const { count } = await supabase
        .from("concierge_tour_requests")
        .select("id", { count: "exact", head: true })
        .eq("inquiry_id", caseData!.id);
      return count || 0;
    },
    enabled: !!caseData?.id,
  });

  // Fetch active tours
  const { data: activeToursCount } = useQuery({
    queryKey: ["placement-active-tours", caseData?.id],
    queryFn: async () => {
      const { count } = await supabase
        .from("concierge_tour_requests")
        .select("id", { count: "exact", head: true })
        .eq("inquiry_id", caseData!.id)
        .not("status", "in", '("cancelled","completed")');
      return count || 0;
    },
    enabled: !!caseData?.id,
  });

  // Unread messages count
  const { data: unreadMsgCount } = useQuery({
    queryKey: ["placement-unread-msgs", caseData?.id],
    queryFn: async () => {
      const { data: threads } = await supabase
        .from("concierge_threads")
        .select("id, last_message_at, admin_last_read_at")
        .eq("inquiry_id", caseData!.id);
      if (!threads) return 0;
      return threads.filter(t =>
        t.last_message_at && (!t.admin_last_read_at || new Date(t.last_message_at) > new Date(t.admin_last_read_at))
      ).length;
    },
    enabled: !!caseData?.id,
  });

  if (!caseData) return null;

  const isPaid = caseData.payment_status === "paid" || caseData.payment_status === "succeeded";
  const advisorName = caseData.assigned_advisor_id ? advisorNames[caseData.assigned_advisor_id] || "Assigned" : "Unassigned";
  const placedFacility = caseData.placed_facility_id ? facilityMap[caseData.placed_facility_id] : null;
  const isAdmitted = caseData.admission_status === "admitted" || caseData.placement_confirmed;

  // Tabs follow the placement workflow chronology
  const tabs = [
    { value: "overview", icon: ClipboardList, label: "Overview", badge: 0 },
    { value: "matching", icon: Users, label: "Match", badge: caseData.match_count || 0 },
    { value: "introductions", icon: Send, label: "Intros", badge: pendingIntrosCount || 0 },
    { value: "messages", icon: MessageSquare, label: "Coord", badge: unreadMsgCount || 0 },
    { value: "tours", icon: CalendarCheck, label: "Tours", badge: activeToursCount || 0 },
    ...(canManageBilling ? [{ value: "billing", icon: DollarSign, label: "Billing", badge: 0 }] : []),
    { value: "timeline", icon: History, label: "Timeline", badge: 0 },
    { value: "actions", icon: Settings, label: "Manage", badge: 0 },
  ];

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-4xl h-[90vh] flex flex-col p-0 gap-0 overflow-hidden">
        {/* Sticky Header */}
        <div className="flex-shrink-0 border-b bg-card px-5 py-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shrink-0">
                <HeartHandshake className="h-5 w-5 text-primary-foreground" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-lg font-semibold truncate">{caseData.user_name}</h2>
                  <Badge variant="outline" className={cn("text-[10px]", STATUS_CONFIG[caseData.status]?.color || "")}>
                    {STATUS_CONFIG[caseData.status]?.label || caseData.status}
                  </Badge>
                  <Badge variant="outline" className={cn("text-[10px]",
                    isPaid ? "bg-success/10 text-success border-success/30" : "bg-destructive/10 text-destructive border-destructive/30"
                  )}>
                    {isPaid ? "✓ Paid" : "⚠ Unpaid"}
                  </Badge>
                  {isAdmitted && (
                    <Badge variant="outline" className="bg-success/10 text-success border-success/30 text-[10px] gap-1">
                      <CheckCircle className="h-3 w-3" />Admitted
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
                  <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{caseData.user_email}</span>
                  <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{caseData.user_phone}</span>
                  {(caseData.preferred_city || caseData.preferred_state) && (
                    <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />
                      {[caseData.preferred_city, caseData.preferred_state || caseData.desired_location_state].filter(Boolean).join(", ")}
                    </span>
                  )}
                  <span className="flex items-center gap-1"><UserCheck className="h-3 w-3" />{advisorName}</span>
                </div>
              </div>
            </div>
            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* SLA + Stepper */}
          <div className="mt-3 space-y-2">
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
            {/* Stage Action Bar — always visible */}
            <div className="mt-3">
              <StageActionBar caseData={caseData} onRefresh={onRefresh} onSwitchTab={setActiveTab} />
            </div>
          </div>
        </div>

        {/* Tabs — workflow-ordered with attention badges */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-shrink-0 px-5 pt-3 border-b bg-card overflow-x-auto scrollbar-hide">
            <TabsList className="h-9 bg-transparent p-0 gap-0 w-auto inline-flex">
              {tabs.map(tab => (
                <TabsTrigger key={tab.value} value={tab.value}
                  className="gap-1.5 px-3 py-1.5 text-xs rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none relative">
                  <tab.icon className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">{tab.label}</span>
                  {tab.badge > 0 && (
                    <Badge
                      variant={tab.value === "messages" ? "destructive" : "secondary"}
                      className="h-4 min-w-[16px] px-1 text-[9px] ml-0.5"
                    >
                      {tab.badge}
                    </Badge>
                  )}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          <ScrollArea className="flex-1">
            <div className="p-1">
              <TabsContent value="overview" className="m-0">
                <PlacementOverviewPanel
                  caseData={caseData}
                  advisorName={advisorName}
                  placedFacility={placedFacility}
                  introsCount={introsCount || 0}
                  toursCount={toursCount || 0}
                  onSwitchTab={setActiveTab}
                />
              </TabsContent>
              <TabsContent value="matching" className="m-0">
                <ConciergePlacementTab caseData={caseData} onRefresh={onRefresh} />
              </TabsContent>
              <TabsContent value="introductions" className="m-0">
                <ConciergeIntroductionsTab caseData={caseData} onRefresh={onRefresh} />
              </TabsContent>
              <TabsContent value="messages" className="m-0">
                <MessagesTab caseData={caseData} />
              </TabsContent>
              <TabsContent value="tours" className="m-0">
                <ToursTab caseData={caseData} />
              </TabsContent>
              {canManageBilling && (
                <TabsContent value="billing" className="m-0">
                  <InvoiceManagementTab caseData={caseData} />
                </TabsContent>
              )}
              <TabsContent value="timeline" className="m-0">
                <div className="p-4">
                  <CaseTimelineEvents caseData={caseData} />
                </div>
              </TabsContent>
              <TabsContent value="actions" className="m-0">
                <ConciergeActionsTab
                  caseData={caseData}
                  onRefresh={onRefresh}
                  onClose={onClose}
                  isAdvisor={isAdvisor}
                  onSwitchTab={setActiveTab}
                />
              </TabsContent>
            </div>
          </ScrollArea>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

/** Overview tab with Next Steps guidance + intake summary */
function PlacementOverviewPanel({
  caseData,
  advisorName,
  placedFacility,
  introsCount,
  toursCount,
  onSwitchTab,
}: {
  caseData: ConciergeInquiry;
  advisorName: string;
  placedFacility: any;
  introsCount: number;
  toursCount: number;
  onSwitchTab: (tab: string) => void;
}) {
  const isAdmitted = caseData.admission_status === "admitted" || caseData.placement_confirmed;

  return (
    <div className="p-4 space-y-5">
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

      {/* Next Steps — the key guidance engine */}
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
        <KpiCard label="Tours" value={toursCount} onClick={() => onSwitchTab("tours")} />
        <KpiCard label="Tour Status" value={caseData.tour_coordination_status?.replace(/_/g, " ") || "—"} />
        <KpiCard label="Admission" value={caseData.admission_status || "—"} />
        <KpiCard label="Fee" value={caseData.provider_fee_cents ? `$${(caseData.provider_fee_cents / 100).toFixed(0)}` : "—"} />
      </div>

      {/* Contact & Seeker Details */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="rounded-xl border bg-card p-4 space-y-3">
          <h4 className="text-sm font-semibold flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" />Seeker Details
          </h4>
          <InfoRow label="Name" value={caseData.user_name} />
          <InfoRow label="Email" value={caseData.user_email} />
          <InfoRow label="Phone" value={caseData.user_phone} />
          <InfoRow label="Best Time to Call" value={caseData.best_time_to_call} />
          <InfoRow label="Relationship" value={caseData.relationship_to_seeker} />
          <InfoRow label="Decision Maker" value={caseData.decision_maker_name} />
          <InfoRow label="Emergency Contact" value={caseData.emergency_contact_name} />
          <InfoRow label="Referral Source" value={caseData.referral_source} />
        </div>

        <div className="rounded-xl border bg-card p-4 space-y-3">
          <h4 className="text-sm font-semibold flex items-center gap-2">
            <ClipboardList className="h-4 w-4 text-chart-3" />Treatment Needs
          </h4>
          <InfoRow label="Primary Concern" value={caseData.primary_concern} />
          <InfoRow label="Level of Care" value={caseData.level_of_care} />
          <InfoRow label="Detox Needed" value={caseData.detox_needed} />
          <InfoRow label="Prior Treatment" value={caseData.prior_treatment_history ? "Yes" : caseData.prior_treatment_history === false ? "No" : null} />
          <InfoRow label="Prior Notes" value={caseData.prior_treatment_notes} />
          <InfoRow label="Substance Duration" value={caseData.substance_use_duration} />
          <InfoRow label="Frequency" value={caseData.substance_use_frequency} />
          <InfoRow label="Co-Occurring" value={Array.isArray(caseData.co_occurring_concerns) ? (caseData.co_occurring_concerns as string[]).join(", ") : null} />
          <InfoRow label="Current Medications" value={caseData.current_medications} />
          <InfoRow label="Mobility Needs" value={caseData.mobility_needs} />
        </div>
      </div>

      {/* Preferences & Logistics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="rounded-xl border bg-card p-4 space-y-3">
          <h4 className="text-sm font-semibold flex items-center gap-2">
            <MapPin className="h-4 w-4 text-indigo-500" />Preferences
          </h4>
          <InfoRow label="Preferred City" value={caseData.preferred_city} />
          <InfoRow label="Preferred State" value={caseData.preferred_state || caseData.desired_location_state} />
          <InfoRow label="Environment" value={caseData.preferred_environment} />
          <InfoRow label="Gender" value={caseData.gender} />
          <InfoRow label="Age Range" value={caseData.age_range} />
          <InfoRow label="Faith-Based" value={caseData.faith_based_preference} />
          <InfoRow label="Holistic" value={caseData.holistic_interest ? "Yes" : null} />
          <InfoRow label="Language" value={caseData.preferred_language} />
          <InfoRow label="Willing to Travel" value={caseData.willing_to_travel ? "Yes" : caseData.willing_to_travel === false ? "No" : null} />
        </div>

        <div className="rounded-xl border bg-card p-4 space-y-3">
          <h4 className="text-sm font-semibold flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-warning" />Insurance & Payment
          </h4>
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
      </div>

      {/* Case Meta */}
      <div className="rounded-xl border bg-card p-4 space-y-3">
        <h4 className="text-sm font-semibold flex items-center gap-2">
          <Clock className="h-4 w-4 text-muted-foreground" />Case Metadata
        </h4>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
          <div>
            <p className="text-xs text-muted-foreground">Created</p>
            <p className="font-medium tabular-nums">{format(new Date(caseData.created_at), "MMM d, yyyy h:mm a")}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Last Updated</p>
            <p className="font-medium tabular-nums">{formatDistanceToNow(new Date(caseData.updated_at), { addSuffix: true })}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Timeline Urgency</p>
            <p className="font-medium capitalize">{caseData.timeline_urgency || "—"}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Advisor</p>
            <p className="font-medium">{advisorName}</p>
          </div>
        </div>
        {caseData.admin_notes && (
          <div className="mt-2 p-3 rounded-lg bg-muted/50 border">
            <p className="text-xs text-muted-foreground font-medium mb-1">Admin Notes</p>
            <p className="text-sm whitespace-pre-wrap">{caseData.admin_notes}</p>
          </div>
        )}
      </div>
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

function InfoRow({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <div className="flex justify-between py-0.5 gap-3">
      <span className="text-xs text-muted-foreground whitespace-nowrap">{label}</span>
      <span className="text-xs font-medium text-right break-words">{value}</span>
    </div>
  );
}
