import { useState, useEffect } from "react";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  ClipboardList, Users, Settings, DollarSign, MessageSquare,
  CalendarCheck, X, Mail, Phone, MapPin, Clock, CheckCircle,
  HeartHandshake, Building2, UserCheck, History, User,
  Activity, Send, Home, Loader2, Play, RefreshCw, Shield,
  Eye, ArrowRight, FileText,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { format, formatDistanceToNow } from "date-fns";
import { PlacementProgressStepper } from "./PlacementProgressStepper";
import { CaseSlaDetailBanner } from "./CaseSlaAlerts";
import { ConciergeActionsTab } from "./ConciergeActionsTab";
import { InvoiceManagementTab } from "./InvoiceManagementTab";
import { MessagesTab } from "./MessagesTab";
import { ToursTab } from "./ToursTab";
import { CaseTimelineEvents } from "./CaseTimelineEvents";
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

  if (!caseData) return null;

  const isPaid = caseData.payment_status === "paid" || caseData.payment_status === "succeeded";
  const advisorName = caseData.assigned_advisor_id ? advisorNames[caseData.assigned_advisor_id] || "Assigned" : "Unassigned";
  const placedFacility = caseData.placed_facility_id ? facilityMap[caseData.placed_facility_id] : null;
  const isAdmitted = caseData.admission_status === "admitted" || caseData.placement_confirmed;
  const visualStage = getVisualStage(caseData.status);
  const VisualIcon = visualStage.icon;

  const tabs = [
    { value: "overview", icon: ClipboardList, label: "Overview" },
    { value: "providers", icon: Building2, label: "Providers" },
    { value: "admission", icon: Home, label: "Admission" },
    { value: "manage", icon: Settings, label: "Manage" },
  ];

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-4xl h-[90vh] flex flex-col p-0 gap-0 overflow-hidden">
        <VisuallyHidden>
          <DialogTitle>Placement Details — {caseData.user_name}</DialogTitle>
        </VisuallyHidden>

        {/* ─── Header ─── */}
        <div className="flex-shrink-0 border-b bg-card px-5 pt-4 pb-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shrink-0">
                <HeartHandshake className="h-5 w-5 text-primary-foreground" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-lg font-bold truncate">{caseData.user_name}</h2>
                  <Badge variant="outline" className={cn("text-[10px] font-semibold", visualStage.badgeColor)}>
                    <VisualIcon className="h-3 w-3 mr-1" />
                    {visualStage.label}
                  </Badge>
                </div>
                <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
                  <span className="font-mono text-[10px] bg-muted/50 px-1.5 py-0.5 rounded">{caseData.id.slice(0, 8).toUpperCase()}</span>
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

          {/* Progress stepper */}
          <div className="mt-3">
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

        {/* ─── Tabs ─── */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-shrink-0 px-5 border-b bg-card">
            <TabsList className="h-9 bg-transparent p-0 gap-0 w-auto inline-flex">
              {tabs.map(tab => (
                <TabsTrigger key={tab.value} value={tab.value}
                  className="gap-1.5 px-3 py-1.5 text-xs rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none">
                  <tab.icon className="h-3.5 w-3.5" />
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          <ScrollArea className="flex-1">
            <div className="p-5">
              <TabsContent value="overview" className="m-0">
                <OverviewContent caseData={caseData} advisorName={advisorName} placedFacility={placedFacility} onSwitchTab={setActiveTab} />
              </TabsContent>

              <TabsContent value="providers" className="m-0">
                <ProvidersContent caseData={caseData} onRefresh={onRefresh} />
              </TabsContent>

              <TabsContent value="admission" className="m-0">
                <AdmissionContent caseData={caseData} placedFacility={placedFacility} canManageBilling={canManageBilling} onRefresh={onRefresh} />
              </TabsContent>

              <TabsContent value="manage" className="m-0">
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
   OVERVIEW TAB
   ═══════════════════════════════════════════ */
function OverviewContent({ caseData, advisorName, placedFacility, onSwitchTab }: {
  caseData: ConciergeInquiry; advisorName: string; placedFacility: any; onSwitchTab: (t: string) => void;
}) {
  const isAdmitted = caseData.admission_status === "admitted" || caseData.placement_confirmed;

  return (
    <div className="space-y-4">
      {/* Admission Banner */}
      {isAdmitted && placedFacility && (
        <Card className="border-success/30 bg-success/5">
          <CardContent className="py-4">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="h-5 w-5 text-success" />
              <h3 className="font-semibold text-success">Admitted to {placedFacility.name}</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              {caseData.placement_confirmed_at ? format(new Date(caseData.placement_confirmed_at), "MMMM d, yyyy") : "Date not recorded"}
            </p>
          </CardContent>
        </Card>
      )}

      {caseData.status === "closed" && (
        <Card className="bg-muted/50">
          <CardContent className="py-4 flex items-center gap-3">
            <Clock className="h-5 w-5 text-muted-foreground" />
            <p className="text-sm font-medium text-muted-foreground">Case Closed {caseData.closed_at && `— ${format(new Date(caseData.closed_at), "MMM d, yyyy")}`}</p>
          </CardContent>
        </Card>
      )}

      {/* Seeker Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2"><Mail className="h-4 w-4 text-primary" />Contact</CardTitle>
          </CardHeader>
          <CardContent className="py-2">
            <InfoGrid rows={[
              ["Name", caseData.user_name],
              ["Email", caseData.user_email],
              ["Phone", caseData.user_phone],
              ["Best Time", caseData.best_time_to_call],
              ["Relationship", caseData.relationship_to_seeker],
            ]} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2"><Activity className="h-4 w-4 text-primary" />Treatment</CardTitle>
          </CardHeader>
          <CardContent className="py-2">
            <InfoGrid rows={[
              ["Primary Concern", caseData.primary_concern],
              ["Level of Care", caseData.level_of_care],
              ["Urgency", caseData.timeline_urgency],
              ["Detox Needed", caseData.detox_needed],
              ["Prior Treatment", caseData.prior_treatment_history === true ? "Yes" : caseData.prior_treatment_history === false ? "No" : null],
            ]} />
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2"><MapPin className="h-4 w-4 text-primary" />Preferences</CardTitle>
          </CardHeader>
          <CardContent className="py-2">
            <InfoGrid rows={[
              ["State", caseData.preferred_state || caseData.desired_location_state],
              ["City", caseData.preferred_city],
              ["Gender", caseData.gender],
              ["Age Range", caseData.age_range],
              ["Environment", caseData.preferred_environment],
              ["Travel OK", caseData.willing_to_travel === true ? "Yes" : caseData.willing_to_travel === false ? "No" : null],
            ]} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2"><DollarSign className="h-4 w-4 text-primary" />Insurance & Financial</CardTitle>
          </CardHeader>
          <CardContent className="py-2">
            <InfoGrid rows={[
              ["Payment Type", formatPaymentType(caseData.payment_type)],
              ["Insurance", caseData.insurance_carrier],
              ["Member ID", caseData.insurance_member_id],
              ["Budget", caseData.budget_range],
              ["Benefits Verified", caseData.benefits_verified === true ? "Yes" : caseData.benefits_verified === false ? "No" : null],
            ]} />
          </CardContent>
        </Card>
      </div>

      {/* Quick nav buttons */}
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" className="text-xs gap-1.5" onClick={() => onSwitchTab("providers")}>
          <Building2 className="h-3.5 w-3.5" />View Matched Providers
        </Button>
        <Button variant="outline" size="sm" className="text-xs gap-1.5" onClick={() => onSwitchTab("admission")}>
          <Home className="h-3.5 w-3.5" />Admission & Billing
        </Button>
        <Button variant="outline" size="sm" className="text-xs gap-1.5" onClick={() => onSwitchTab("manage")}>
          <Settings className="h-3.5 w-3.5" />Actions & Timeline
        </Button>
      </div>

      {/* Admin Notes */}
      {caseData.admin_notes && (
        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Admin Notes</CardTitle>
          </CardHeader>
          <CardContent className="py-2">
            <p className="text-sm whitespace-pre-wrap">{caseData.admin_notes}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════
   PROVIDERS TAB — Matched + Introductions + Messages
   ═══════════════════════════════════════════ */
function ProvidersContent({ caseData, onRefresh }: { caseData: ConciergeInquiry; onRefresh: () => void }) {
  const [isRunning, setIsRunning] = useState(false);
  const [sendingTo, setSendingTo] = useState<string | null>(null);

  // All matched facility IDs
  const allMatchedIds = [...new Set([
    ...(caseData.matched_facility_ids || []),
    ...(caseData.admin_matched_facility_ids || []),
  ])];

  // Fetch facility details
  const { data: matchedFacilities, isLoading: loadingFacilities } = useQuery({
    queryKey: ["placement-matched-facilities", allMatchedIds],
    queryFn: async () => {
      if (!allMatchedIds.length) return [];
      const { data, error } = await supabase.from("facilities")
        .select("id, name, city, state, facility_type, concierge_availability_status")
        .in("id", allMatchedIds);
      if (error) throw error;
      return data || [];
    },
    enabled: allMatchedIds.length > 0,
  });

  // Fetch introductions
  const { data: introductions, refetch: refetchIntros } = useQuery({
    queryKey: ["concierge-introductions", caseData.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("concierge_introductions")
        .select("*, facility:facilities(id, name, city, state)")
        .eq("inquiry_id", caseData.id)
        .order("sent_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const introFacilityIds = new Set(introductions?.map(i => i.facility_id) || []);

  // Run placement engine
  const runPlacement = async () => {
    setIsRunning(true);
    try {
      const { data, error } = await supabase.functions.invoke("match-concierge-intake", {
        body: { inquiryId: caseData.id },
      });
      if (error) throw error;
      toast.success(`Found ${data?.matchCount || 0} matches`);
      onRefresh();
    } catch (err: any) {
      toast.error("Matching failed: " + err.message);
    } finally {
      setIsRunning(false);
    }
  };

  // Send introduction
  const sendIntro = async (facilityId: string) => {
    setSendingTo(facilityId);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      // Duplicate guard
      const { data: existing } = await supabase.from("concierge_introductions")
        .select("id").eq("inquiry_id", caseData.id).eq("facility_id", facilityId).maybeSingle();
      if (existing) { toast.info("Already introduced"); setSendingTo(null); return; }

      const { data: introData, error } = await supabase.from("concierge_introductions")
        .insert({ inquiry_id: caseData.id, facility_id: facilityId, sent_by: user?.id, sent_at: new Date().toISOString() })
        .select().single();
      if (error) throw error;

      // Trigger status transition
      await supabase.functions.invoke("auto-status-transition", {
        body: { inquiryId: caseData.id, trigger: "introduction_sent", actorId: user?.id, actorType: "admin" },
      });

      // Update count
      await supabase.from("concierge_inquiries")
        .update({ introductions_sent_count: (caseData.introductions_sent_count || 0) + 1 })
        .eq("id", caseData.id);

      // Send email (best effort)
      try {
        await supabase.functions.invoke("send-concierge-introduction", {
          body: { inquiryId: caseData.id, facilityId, introductionId: introData.id },
        });
      } catch (e) { console.error("Intro email error:", e); }

      toast.success("Introduction sent");
      refetchIntros();
      onRefresh();
    } catch (err: any) {
      toast.error("Failed: " + err.message);
    } finally {
      setSendingTo(null);
    }
  };

  // Update provider response
  const updateResponse = async (introId: string, response: string) => {
    const { error } = await supabase.from("concierge_introductions")
      .update({ provider_response: response, provider_responded_at: new Date().toISOString() })
      .eq("id", introId);
    if (error) { toast.error("Update failed"); return; }

    if (response === "interested") {
      await supabase.functions.invoke("auto-status-transition", {
        body: { inquiryId: caseData.id, trigger: "provider_interested", actorType: "admin" },
      });
    }
    toast.success("Response updated");
    refetchIntros();
    onRefresh();
  };

  // Disclose PII
  const disclosePII = async (introId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase.from("concierge_introductions")
      .update({ admin_disclosed_pii_at: new Date().toISOString(), disclosed_by_admin_id: user.id })
      .eq("id", introId);
    if (error) { toast.error("Failed"); return; }

    await supabase.from("concierge_case_events").insert({
      inquiry_id: caseData.id, event_type: "pii_disclosed",
      event_data: { introduction_id: introId }, actor_id: user.id, actor_type: "admin",
    });
    toast.success("PII disclosed");
    refetchIntros();
  };

  const matchScores = (caseData.match_scores as unknown as Array<{ facilityId: string; score?: number; totalScore?: number }> | null) || [];

  return (
    <div className="space-y-5">
      {/* Run Placement Engine */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium text-sm">Placement Engine</h3>
              <p className="text-xs text-muted-foreground">
                {caseData.matched_at ? `Last run ${formatDistanceToNow(new Date(caseData.matched_at), { addSuffix: true })}` : "Not run yet"}
              </p>
            </div>
            <Button size="sm" onClick={runPlacement} disabled={isRunning}>
              {isRunning ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : caseData.matched_at ? <RefreshCw className="h-4 w-4 mr-1.5" /> : <Play className="h-4 w-4 mr-1.5" />}
              {isRunning ? "Running..." : caseData.matched_at ? "Re-run" : "Run Matching"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Matched Facilities List */}
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Building2 className="h-4 w-4 text-primary" />
            Matched Providers ({matchedFacilities?.length || 0})
          </CardTitle>
        </CardHeader>
        <CardContent className="py-2">
          {loadingFacilities ? (
            <p className="text-center py-4 text-sm text-muted-foreground">Loading...</p>
          ) : !matchedFacilities?.length ? (
            <div className="text-center py-6 text-muted-foreground">
              <Users className="h-8 w-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm font-medium">No matches yet</p>
              <p className="text-xs mt-1">Run the placement engine to find facilities</p>
            </div>
          ) : (
            <div className="divide-y">
              {matchedFacilities.map((facility, idx) => {
                const intro = introductions?.find(i => i.facility_id === facility.id);
                const scoreEntry = matchScores.find(s => s.facilityId === facility.id);
                const score = scoreEntry?.score || scoreEntry?.totalScore || 0;
                const hasIntro = !!intro;
                const response = intro?.provider_response;

                return (
                  <div key={facility.id} className="py-3 first:pt-0 last:pb-0">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 min-w-0">
                        <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                          <span className="text-xs font-bold text-primary">#{idx + 1}</span>
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-sm truncate">{facility.name}</p>
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <MapPin className="h-3 w-3" />{facility.city}, {facility.state}
                          </p>
                          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                            <Badge variant="outline" className="text-[10px] h-5">{facility.facility_type}</Badge>
                            <Badge variant={
                              facility.concierge_availability_status === "open" ? "default" :
                              facility.concierge_availability_status === "limited" ? "secondary" : "destructive"
                            } className="text-[10px] h-5">
                              {facility.concierge_availability_status || "Unknown"}
                            </Badge>
                            {score > 0 && (
                              <Badge variant="outline" className="text-[10px] h-5 bg-primary/5 text-primary border-primary/20">
                                Score: {score}/100
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-1.5 shrink-0">
                        {!hasIntro ? (
                          <Button size="sm" variant="outline" className="h-7 text-xs gap-1"
                            onClick={() => sendIntro(facility.id)} disabled={sendingTo === facility.id}>
                            {sendingTo === facility.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
                            Introduce
                          </Button>
                        ) : (
                          <IntroStatusBadge response={response} />
                        )}
                      </div>
                    </div>

                    {/* Introduction details when sent */}
                    {hasIntro && intro && (
                      <div className="mt-2 ml-11 space-y-2">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Send className="h-3 w-3" />
                          Introduced {intro.sent_at ? format(new Date(intro.sent_at), "MMM d, h:mm a") : "—"}
                        </div>

                        {/* Response dropdown */}
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">Response:</span>
                          <select
                            value={response || "pending"}
                            onChange={(e) => updateResponse(intro.id, e.target.value)}
                            className="h-7 text-xs rounded-md border bg-background px-2"
                          >
                            <option value="pending">Pending</option>
                            <option value="interested">Accepted</option>
                            <option value="not_available">Declined</option>
                            <option value="no_response">No Response</option>
                          </select>
                        </div>

                        {/* PII disclosure */}
                        {response === "interested" && (
                          <div className="flex items-center gap-2 p-2 rounded-md border bg-amber-50/50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800">
                            {intro.admin_disclosed_pii_at ? (
                              <div className="flex items-center gap-1.5 text-xs text-success">
                                <Eye className="h-3.5 w-3.5" />
                                PII disclosed {format(new Date(intro.admin_disclosed_pii_at), "MMM d")}
                              </div>
                            ) : (
                              <>
                                <Shield className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                                <span className="text-xs text-amber-800 dark:text-amber-200 flex-1">Patient info hidden</span>
                                <Button size="sm" variant="outline" className="h-6 text-[10px] gap-1" onClick={() => disclosePII(intro.id)}>
                                  <Eye className="h-3 w-3" />Disclose
                                </Button>
                              </>
                            )}
                          </div>
                        )}

                        {intro.provider_notes && (
                          <p className="text-xs p-2 bg-muted rounded-md">{intro.provider_notes}</p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Placement Criteria */}
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-sm font-medium">Matching Criteria</CardTitle>
        </CardHeader>
        <CardContent className="py-2">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
            <CriteriaChip label="Location" value={caseData.desired_location_state || caseData.preferred_state} />
            <CriteriaChip label="Care" value={caseData.level_of_care} />
            <CriteriaChip label="Payment" value={formatPaymentType(caseData.payment_type)} />
            <CriteriaChip label="Insurance" value={caseData.insurance_carrier} />
            <CriteriaChip label="Gender" value={caseData.gender} />
            <CriteriaChip label="Age" value={caseData.age_range} />
          </div>
        </CardContent>
      </Card>

      {/* Messages */}
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-primary" />Messages
          </CardTitle>
        </CardHeader>
        <CardContent className="py-0">
          <MessagesTab caseData={caseData} />
        </CardContent>
      </Card>
    </div>
  );
}

/* ═══════════════════════════════════════════
   ADMISSION TAB
   ═══════════════════════════════════════════ */
const ADMISSION_SUBSTAGES = [
  { key: "contact_initiated", label: "Contact", icon: Phone },
  { key: "screening", label: "Screening", icon: ClipboardList },
  { key: "accepted", label: "Accepted", icon: CheckCircle },
  { key: "admission_scheduled", label: "Scheduled", icon: CalendarCheck },
  { key: "admitted", label: "Admitted", icon: Home },
] as const;

function AdmissionContent({ caseData, placedFacility, canManageBilling, onRefresh }: {
  caseData: ConciergeInquiry; placedFacility: any; canManageBilling: boolean; onRefresh: () => void;
}) {
  const queryClient = useQueryClient();
  const isAdmitted = caseData.admission_status === "admitted" || caseData.placement_confirmed;
  const currentSubstatus = caseData.admission_substatus || "pending";
  const currentSubIdx = ADMISSION_SUBSTAGES.findIndex(s => s.key === currentSubstatus);
  const [noteText, setNoteText] = useState("");

  const advanceSubstatus = async (newSubstatus: string) => {
    const { error } = await supabase.from("concierge_inquiries")
      .update({
        admission_substatus: newSubstatus,
        ...(newSubstatus === "admitted" ? { admission_status: "admitted", placement_confirmed: true, placement_confirmed_at: new Date().toISOString() } : {}),
      }).eq("id", caseData.id);
    if (error) { toast.error("Failed to update"); return; }

    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from("concierge_case_events").insert({
      inquiry_id: caseData.id, event_type: "admission_substatus_changed",
      event_data: { from: currentSubstatus, to: newSubstatus },
      actor_id: user?.id || null, actor_type: "admin",
    });
    toast.success(`Updated to: ${newSubstatus.replace(/_/g, " ")}`);
    queryClient.invalidateQueries({ queryKey: ["admin-concierge-case-detail", caseData.id] });
    queryClient.invalidateQueries({ queryKey: ["admin-concierge-cases-full"] });
  };

  const addNote = async () => {
    if (!noteText.trim()) return;
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from("concierge_case_events").insert({
      inquiry_id: caseData.id, event_type: "admission_note_added",
      event_data: { note: noteText.trim() },
      actor_id: user?.id || null, actor_type: "admin",
    });
    setNoteText("");
    toast.success("Note added");
  };

  const nextSubstage = currentSubIdx < ADMISSION_SUBSTAGES.length - 1 ? ADMISSION_SUBSTAGES[currentSubIdx + 1] : null;

  return (
    <div className="space-y-5">
      {/* Admission Progress */}
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Building2 className="h-4 w-4 text-primary" />Admission Progress
          </CardTitle>
        </CardHeader>
        <CardContent className="py-3">
          <div className="flex gap-1">
            {ADMISSION_SUBSTAGES.map((stage, i) => {
              const isDone = i <= currentSubIdx;
              const StageIcon = stage.icon;
              return (
                <div key={stage.key} className="flex-1 text-center">
                  <div className={cn("h-1.5 rounded-full mb-2", isDone ? "bg-primary" : "bg-muted")} />
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
                <CheckCircle className="h-3.5 w-3.5" />Advance
              </Button>
            </div>
          )}

          {isAdmitted && (
            <div className="mt-4 rounded-lg border-2 border-success/30 bg-success/5 px-4 py-3 flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-success" />
              <p className="text-sm font-semibold text-success">Admission Complete</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Placed Facility */}
      {placedFacility && (
        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2"><Home className="h-4 w-4 text-primary" />Placed Facility</CardTitle>
          </CardHeader>
          <CardContent className="py-2">
            <InfoGrid rows={[
              ["Facility", placedFacility.name],
              ["Location", `${placedFacility.city}, ${placedFacility.state}`],
            ]} />
          </CardContent>
        </Card>
      )}

      {/* Quick Note */}
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-sm font-medium">Add Admission Note</CardTitle>
        </CardHeader>
        <CardContent className="py-2">
          <div className="flex gap-2">
            <input type="text" placeholder="Log update..." value={noteText}
              onChange={e => setNoteText(e.target.value)} onKeyDown={e => e.key === "Enter" && addNote()}
              className="flex-1 rounded-lg border bg-background px-3 py-2 text-sm" />
            <Button size="sm" onClick={addNote} disabled={!noteText.trim()}>Add</Button>
          </div>
        </CardContent>
      </Card>

      {/* Provider Fee Summary */}
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2"><DollarSign className="h-4 w-4 text-primary" />Provider Fee</CardTitle>
        </CardHeader>
        <CardContent className="py-2">
          <InfoGrid rows={[
            ["Amount", caseData.provider_fee_cents ? `$${(caseData.provider_fee_cents / 100).toFixed(2)}` : null],
            ["Status", caseData.provider_fee_status],
            ["Type", caseData.provider_fee_type],
          ]} />
        </CardContent>
      </Card>

      {/* Tours */}
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2"><CalendarCheck className="h-4 w-4 text-primary" />Tours</CardTitle>
        </CardHeader>
        <CardContent className="py-0">
          <ToursTab caseData={caseData} />
        </CardContent>
      </Card>

      {/* Billing */}
      {canManageBilling && (
        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2"><DollarSign className="h-4 w-4 text-primary" />Billing & Invoices</CardTitle>
          </CardHeader>
          <CardContent className="py-0">
            <InvoiceManagementTab caseData={caseData} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════
   Shared Utilities
   ═══════════════════════════════════════════ */

function IntroStatusBadge({ response }: { response?: string | null }) {
  if (!response || response === "pending") {
    return <Badge variant="secondary" className="text-[10px] h-5"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
  }
  if (response === "interested") {
    return <Badge variant="default" className="text-[10px] h-5 bg-success text-success-foreground"><CheckCircle className="h-3 w-3 mr-1" />Accepted</Badge>;
  }
  return <Badge variant="destructive" className="text-[10px] h-5">Declined</Badge>;
}

function CriteriaChip({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-md border bg-muted/30">
      {value ? <CheckCircle className="h-3 w-3 text-primary shrink-0" /> : <span className="h-3 w-3 rounded-full bg-muted-foreground/20 shrink-0" />}
      <span className="text-muted-foreground">{label}:</span>
      <span className="font-medium truncate">{value || "—"}</span>
    </div>
  );
}

function InfoGrid({ rows }: { rows: [string, string | null | undefined][] }) {
  const filtered = rows.filter(([, v]) => v != null && v !== "");
  if (filtered.length === 0) return <p className="text-xs text-muted-foreground py-2">No data</p>;
  return (
    <div className="space-y-0.5">
      {filtered.map(([label, value]) => (
        <div key={label} className="flex justify-between py-1 gap-3">
          <span className="text-xs text-muted-foreground whitespace-nowrap">{label}</span>
          <span className="text-xs font-medium text-right break-words">{value}</span>
        </div>
      ))}
    </div>
  );
}

function formatPaymentType(type?: string | null): string | null {
  if (!type) return null;
  const map: Record<string, string> = {
    both: "Insurance + Self-Pay",
    insurance: "Insurance",
    "self-pay": "Self-Pay / Private Pay",
    unsure: "Not sure yet",
  };
  return map[type] || type;
}
