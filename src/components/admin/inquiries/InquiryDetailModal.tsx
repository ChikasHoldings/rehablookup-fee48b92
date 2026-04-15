import { useState, useMemo, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  User, Mail, Phone, MapPin, Calendar, Building2,
  MessageSquare, Shield, FileText, CheckCircle,
  Lock, Unlock, Share2, Clock, Zap, Star, Loader2,
  Save, StickyNote, Handshake, Activity,
  CreditCard, Eye, ArrowRightLeft, AlertTriangle,
  Send, Flag,
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { formatSourceLabel } from "@/lib/sourceLabels";

interface InquiryDetailModalProps {
  lead: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  facilityMap: Map<string, any>;
  facilities: Array<{ id: string; name: string; city: string; state: string }>;
  onLeadUpdated: () => void;
}

export function InquiryDetailModal({ lead, open, onOpenChange, facilityMap, facilities, onLeadUpdated }: InquiryDetailModalProps) {
  const [activeTab, setActiveTab] = useState("overview");
  const [noteText, setNoteText] = useState("");
  const [savingNote, setSavingNote] = useState(false);
  const queryClient = useQueryClient();

  // Fetch unlock details
  const { data: unlockData } = useQuery({
    queryKey: ["inquiry-unlock-detail", lead?.id],
    queryFn: async () => {
      if (!lead?.id) return [];
      const { data } = await supabase
        .from("lead_unlocks")
        .select("id, facility_id, provider_id, unlocked_at, unlock_price_cents, payment_method")
        .eq("lead_id", lead.id)
        .order("unlocked_at", { ascending: false });
      return data || [];
    },
    enabled: !!lead?.id && open,
  });

  // Fetch distribution details
  const { data: distributions } = useQuery({
    queryKey: ["inquiry-distributions", lead?.id],
    queryFn: async () => {
      if (!lead?.id) return [];
      const { data } = await supabase
        .from("lead_distributions")
        .select("id, facility_id, is_original, distributed_at, unlocked_at, notification_sent, notification_sent_at")
        .eq("lead_id", lead.id)
        .order("distributed_at", { ascending: true });
      return data || [];
    },
    enabled: !!lead?.id && open,
  });

  // Fetch facility owner (provider)
  const { data: providerInfo } = useQuery({
    queryKey: ["inquiry-provider", lead?.facility_id],
    queryFn: async () => {
      if (!lead?.facility_id) return null;
      const { data: facility } = await supabase
        .from("facilities")
        .select("id, name, city, state, user_id, phone, email, status")
        .eq("id", lead.facility_id)
        .single();
      if (!facility) return null;
      const { data: profile } = await supabase
        .from("profiles")
        .select("first_name, last_name, email, phone")
        .eq("user_id", facility.user_id)
        .single();
      return { facility, provider: profile };
    },
    enabled: !!lead?.facility_id && open,
  });

  // Fetch lead notes
  const { data: leadNotes, refetch: refetchNotes } = useQuery({
    queryKey: ["inquiry-notes", lead?.id],
    queryFn: async () => {
      if (!lead?.id) return [];
      const { data } = await supabase
        .from("lead_notes")
        .select("id, note, created_at, user_id")
        .eq("lead_id", lead.id)
        .order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!lead?.id && open,
  });

  // Related placement
  const { data: relatedPlacement } = useQuery({
    queryKey: ["inquiry-placement-link", lead?.email],
    queryFn: async () => {
      if (!lead?.email) return null;
      const { data } = await supabase
        .from("concierge_inquiries")
        .select("id, status, created_at, primary_concern, assigned_advisor_id, placed_facility_id, placement_confirmed")
        .eq("user_email", lead.email)
        .order("created_at", { ascending: false })
        .limit(1);
      return data?.[0] || null;
    },
    enabled: !!lead?.email && open,
  });

  // === MUTATIONS ===

  // Reassign lead to another facility
  const reassignMutation = useMutation({
    mutationFn: async (facilityId: string) => {
      const { error } = await supabase.from("leads").update({ facility_id: facilityId }).eq("id", lead.id);
      if (error) throw error;
    },
    onSuccess: () => {
      onLeadUpdated();
      queryClient.invalidateQueries({ queryKey: ["inquiry-provider", lead?.facility_id] });
      toast.success("Lead reassigned successfully");
    },
    onError: () => toast.error("Failed to reassign lead"),
  });

  // Mark as contacted
  const markContactedMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("leads").update({
        provider_response_status: "contacted",
        provider_responded_at: new Date().toISOString(),
      }).eq("id", lead.id);
      if (error) throw error;
    },
    onSuccess: () => { onLeadUpdated(); toast.success("Marked as contacted"); },
    onError: () => toast.error("Failed to update status"),
  });

  // Flag issue
  const flagIssueMutation = useMutation({
    mutationFn: async (flag: string) => {
      const { error } = await supabase.from("leads").update({ quality_flag: flag }).eq("id", lead.id);
      if (error) throw error;
    },
    onSuccess: () => { onLeadUpdated(); toast.success("Flag updated"); },
    onError: () => toast.error("Failed to flag"),
  });

  // Save note
  const handleSaveNote = async () => {
    if (!noteText.trim() || !lead?.id) return;
    setSavingNote(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      await supabase.from("lead_notes").insert({ lead_id: lead.id, user_id: user.id, note: noteText.trim() });
      setNoteText("");
      refetchNotes();
      toast.success("Note saved");
    } catch { toast.error("Failed to save note"); }
    finally { setSavingNote(false); }
  };

  const assignedFacility = lead?.facility_id ? facilityMap.get(lead.facility_id) : providerInfo?.facility;
  const originalFacility = lead?.original_facility_id ? facilityMap.get(lead.original_facility_id) : null;
  const isUnlocked = (unlockData?.length || 0) > 0;
  const isRedistributed = lead?.redistribution_status === "extended";
  const getInitials = () => lead?.name?.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2) || "?";

  // Build activity timeline
  const timeline = useMemo(() => {
    if (!lead) return [];
    const events: Array<{ date: string; label: string; detail?: string; icon: any; color: string }> = [];

    events.push({ date: lead.created_at, label: "Inquiry Submitted", detail: `${lead.inquiry_type || "Request Info"} via ${formatSourceLabel(lead.source)}`, icon: MessageSquare, color: "bg-primary/10 text-primary" });
    if (lead.assigned_at) events.push({ date: lead.assigned_at, label: "Lead Created & Assigned", detail: assignedFacility?.name || "Facility", icon: Building2, color: "bg-chart-3/10 text-chart-3" });

    distributions?.forEach((d: any) => {
      if (!d.is_original) events.push({ date: d.distributed_at, label: "Redistributed", detail: facilityMap.get(d.facility_id)?.name || "Provider", icon: Share2, color: "bg-info/10 text-info" });
      if (d.notification_sent_at) events.push({ date: d.notification_sent_at, label: "Provider Notified", detail: facilityMap.get(d.facility_id)?.name, icon: Send, color: "bg-muted text-muted-foreground" });
    });

    unlockData?.forEach((u: any) => {
      events.push({ date: u.unlocked_at, label: "Lead Unlocked", detail: `$${(u.unlock_price_cents / 100).toFixed(2)} via ${u.payment_method}`, icon: Unlock, color: "bg-success/10 text-success" });
    });

    if (lead.provider_responded_at) events.push({ date: lead.provider_responded_at, label: "Provider Responded", detail: lead.provider_response_status, icon: CheckCircle, color: "bg-success/10 text-success" });
    if (lead.lead_expired_at) events.push({ date: lead.lead_expired_at, label: "Lead Expired", detail: "Exclusive window ended", icon: Clock, color: "bg-muted text-muted-foreground" });
    if (relatedPlacement) events.push({ date: relatedPlacement.created_at, label: "Converted to Placement", detail: relatedPlacement.primary_concern || "Case created", icon: Handshake, color: "bg-purple-500/10 text-purple-600" });

    return events.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [lead, unlockData, distributions, relatedPlacement, assignedFacility, facilityMap]);

  if (!lead) return null;

  const tabs = [
    { value: "overview", label: "Overview", icon: Eye },
    { value: "lead", label: "Lead Details", icon: Shield },
    { value: "actions", label: "Actions", icon: Zap },
    { value: "timeline", label: "Timeline", icon: Activity, badge: timeline.length },
    { value: "notes", label: "Notes", icon: StickyNote, badge: leadNotes?.length || 0 },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl h-[92vh] p-0 flex flex-col overflow-hidden">
        {/* Header */}
        <DialogHeader className="p-5 pb-3 flex-shrink-0 border-b">
          <div className="flex items-start gap-4">
            <Avatar className="h-12 w-12 border-2 border-background shadow-lg flex-shrink-0">
              <AvatarFallback className="bg-primary/10 text-primary text-base font-bold">{getInitials()}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <DialogTitle className="text-lg">{lead.name}</DialogTitle>
                {lead.urgency === "immediate" && (
                  <Badge variant="destructive" className="gap-1 h-5 text-xs"><Zap className="h-3 w-3" />Urgent</Badge>
                )}
              </div>
              <DialogDescription className="flex items-center gap-2 text-sm mt-0.5 flex-wrap">
                <span className="flex items-center gap-1"><Mail className="h-3.5 w-3.5" />{lead.email}</span>
                {lead.phone && <span className="flex items-center gap-1"><Phone className="h-3.5 w-3.5" />{lead.phone}</span>}
                <span>• {format(new Date(lead.created_at), "MMM d, yyyy h:mm a")}</span>
              </DialogDescription>
              <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                <Badge variant="outline" className={cn("h-5 text-xs",
                  lead.status === "new" && "bg-info/10 text-info border-info/30",
                  lead.status === "contacted" && "bg-chart-3/10 text-chart-3 border-chart-3/30",
                  lead.status === "converted" && "bg-success/10 text-success border-success/30",
                  lead.status === "expired" && "bg-muted text-muted-foreground border-border",
                  lead.status === "closed" && "bg-muted text-muted-foreground border-border",
                )}>{lead.status}</Badge>
                <Badge variant="secondary" className="h-5 text-xs gap-1">
                  <MessageSquare className="h-3 w-3" />{lead.inquiry_type === "request_callback" ? "Callback" : lead.inquiry_type === "tour_request" ? "Tour" : "Info"}
                </Badge>
                {isUnlocked ? (
                  <Badge variant="outline" className="bg-success/10 text-success border-success/30 gap-1 h-5 text-xs"><Unlock className="h-3 w-3" />Unlocked</Badge>
                ) : (
                  <Badge variant="outline" className="bg-muted text-muted-foreground border-border gap-1 h-5 text-xs"><Lock className="h-3 w-3" />Locked</Badge>
                )}
                {isRedistributed && (
                  <Badge variant="outline" className="bg-info/10 text-info border-info/30 gap-1 h-5 text-xs"><Share2 className="h-3 w-3" />Redistributed</Badge>
                )}
                {relatedPlacement && (
                  <Badge variant="outline" className="bg-purple-500/10 text-purple-600 border-purple-500/30 gap-1 h-5 text-xs"><Handshake className="h-3 w-3" />Placement</Badge>
                )}
                {lead.quality_flag && (
                  <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/30 gap-1 h-5 text-xs"><Flag className="h-3 w-3" />{lead.quality_flag}</Badge>
                )}
              </div>
            </div>
          </div>
        </DialogHeader>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <div className="px-5 border-b flex-shrink-0">
            <TabsList className="h-10 w-max justify-start bg-transparent border-none p-0 gap-0.5">
              {tabs.map((tab) => (
                <TabsTrigger key={tab.value} value={tab.value} className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none bg-transparent px-2.5 pb-2.5 text-xs gap-1.5 whitespace-nowrap">
                  <tab.icon className="h-3.5 w-3.5" />{tab.label}
                  {tab.badge !== undefined && tab.badge > 0 && <Badge variant="secondary" className="ml-0.5 h-4 text-[10px] px-1">{tab.badge}</Badge>}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          <div className="flex-1 overflow-y-auto">
            {/* ===== OVERVIEW TAB ===== */}
            <TabsContent value="overview" className="m-0 data-[state=inactive]:hidden">
              <div className="p-5 space-y-5">
                {/* KPI Strip */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { label: "Lead Score", value: lead.lead_score ?? "—", icon: Star, color: "text-warning" },
                    { label: "Credit Cost", value: lead.credit_cost ? `$${(lead.credit_cost / 100).toFixed(0)}` : "—", icon: CreditCard, color: "text-primary" },
                    { label: "Unlocks", value: unlockData?.length || 0, icon: Unlock, color: "text-success" },
                    { label: "Distributions", value: distributions?.length || 0, icon: Share2, color: "text-info" },
                  ].map((kpi) => (
                    <div key={kpi.label} className="p-3 rounded-xl border bg-card text-center">
                      <kpi.icon className={cn("h-4 w-4 mx-auto mb-1", kpi.color)} />
                      <p className="text-xl font-bold tabular-nums">{kpi.value}</p>
                      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{kpi.label}</p>
                    </div>
                  ))}
                </div>

                {/* Info Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Seeker */}
                  <InfoCard title="Client Details" icon={User} rows={[
                    ["Name", lead.name], ["Email", lead.email], ["Phone", lead.phone],
                    ["Location", lead.location_city_state || lead.location_zip],
                    ["Who Seeking", lead.who_seeking_help], ["Age Range", lead.age_range],
                    ["Gender", lead.gender], ["Preferred Contact", lead.preferred_contact],
                  ]} />
                  {/* Facility + Provider */}
                  <InfoCard title="Facility & Provider" icon={Building2} rows={[
                    ["Facility", assignedFacility?.name],
                    ["Location", assignedFacility ? `${assignedFacility.city}, ${assignedFacility.state}` : null],
                    ["Facility Status", providerInfo?.facility?.status],
                    ["Provider Name", providerInfo?.provider ? `${providerInfo.provider.first_name || ""} ${providerInfo.provider.last_name || ""}`.trim() : null],
                    ["Provider Email", providerInfo?.provider?.email],
                    ["Provider Phone", providerInfo?.provider?.phone],
                    ["Original Facility", originalFacility?.name || (lead.original_facility_id ? "Unknown" : null)],
                  ]} />
                  {/* Inquiry */}
                  <InfoCard title="Inquiry Details" icon={FileText} rows={[
                    ["Type", lead.inquiry_type === "request_callback" ? "Request Callback" : lead.inquiry_type === "tour_request" ? "Tour Request" : "Request Info"],
                    ["Source", formatSourceLabel(lead.source)],
                    ["Urgency", lead.urgency], ["Level of Care", lead.level_of_care],
                    ["Insurance", lead.insurance_type],
                    ["Substances", lead.primary_substance?.join(", ")],
                    ["Lead Score", lead.lead_score ? `${lead.lead_score} (${lead.lead_score_label || ""})` : null],
                    ["Submitted", format(new Date(lead.created_at), "MMM d, yyyy h:mm a")],
                  ]} />
                  {/* Lead Lifecycle */}
                  <div className="p-4 rounded-xl border bg-card">
                    <h4 className="font-semibold mb-3 flex items-center gap-2 text-sm">
                      <Shield className="h-4 w-4 text-primary" />Lead Lifecycle
                    </h4>
                    <div className="space-y-2.5 text-sm">
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Status</span>
                        <Badge variant="outline" className={cn("text-xs",
                          lead.status === "new" && "bg-info/10 text-info border-info/30",
                          lead.status === "contacted" && "bg-chart-3/10 text-chart-3 border-chart-3/30",
                          lead.status === "converted" && "bg-success/10 text-success border-success/30",
                        )}>{lead.status}</Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Unlocked</span>
                        {isUnlocked ? (
                          <Badge variant="outline" className="bg-success/10 text-success border-success/30 gap-1 text-xs">
                            <Unlock className="h-3 w-3" />Yes — {format(new Date(unlockData![0].unlocked_at), "MMM d, h:mm a")}
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs"><Lock className="h-3 w-3 mr-1" />No</Badge>
                        )}
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Distribution</span>
                        <Badge variant="outline" className={cn("text-xs",
                          lead.redistribution_status === "exclusive" && "bg-warning/10 text-warning border-warning/30",
                          lead.redistribution_status === "extended" && "bg-info/10 text-info border-info/30",
                        )}>{lead.redistribution_status || "—"}</Badge>
                      </div>
                      {lead.exclusive_until && (
                        <div className="flex justify-between"><span className="text-muted-foreground">Exclusive Until</span><span className="font-medium">{format(new Date(lead.exclusive_until), "MMM d, h:mm a")}</span></div>
                      )}
                      <div className="flex justify-between"><span className="text-muted-foreground">Provider Response</span><span className="font-medium">{lead.provider_response_status || "—"}</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">Quality Flag</span><span className="font-medium">{lead.quality_flag || "None"}</span></div>
                    </div>
                  </div>
                </div>

                {/* Message */}
                {lead.message && (
                  <div className="p-4 rounded-xl border bg-card">
                    <h4 className="font-semibold mb-2 flex items-center gap-2 text-sm"><MessageSquare className="h-4 w-4 text-primary" />Submitted Message</h4>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">{lead.message}</p>
                  </div>
                )}

                {/* Placement Conversion */}
                {relatedPlacement && (
                  <div className="p-4 rounded-xl border-2 border-purple-500/30 bg-purple-500/5">
                    <h4 className="font-semibold mb-2 flex items-center gap-2 text-sm"><Handshake className="h-4 w-4 text-purple-600" />Converted to Placement</h4>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div><span className="text-muted-foreground block text-xs">Case ID</span><span className="font-mono text-xs">{relatedPlacement.id.slice(0, 8)}</span></div>
                      <div><span className="text-muted-foreground block text-xs">Status</span><Badge variant="outline" className="text-xs mt-0.5">{relatedPlacement.status}</Badge></div>
                      <div><span className="text-muted-foreground block text-xs">Concern</span><span className="text-xs">{relatedPlacement.primary_concern || "—"}</span></div>
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* ===== LEAD DETAILS TAB ===== */}
            <TabsContent value="lead" className="m-0 data-[state=inactive]:hidden">
              <div className="p-5 space-y-5">
                {/* Unlock History */}
                <div className="p-4 rounded-xl border bg-card">
                  <h4 className="font-semibold mb-3 flex items-center gap-2 text-sm">
                    <Unlock className="h-4 w-4 text-success" />Unlock History
                    <Badge variant="secondary" className="h-4 text-[10px] px-1">{unlockData?.length || 0}</Badge>
                  </h4>
                  {(unlockData?.length || 0) > 0 ? (
                    <div className="space-y-2">
                      {unlockData!.map((u: any) => {
                        const uFac = facilityMap.get(u.facility_id);
                        return (
                          <div key={u.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="h-8 w-8 rounded-full bg-success/10 flex items-center justify-center flex-shrink-0">
                                <Unlock className="h-4 w-4 text-success" />
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-medium truncate">{uFac?.name || "Unknown Facility"}</p>
                                <p className="text-xs text-muted-foreground">${(u.unlock_price_cents / 100).toFixed(2)} via {u.payment_method}</p>
                              </div>
                            </div>
                            <span className="text-xs text-muted-foreground whitespace-nowrap">{format(new Date(u.unlocked_at), "MMM d, h:mm a")}</span>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-6">No unlocks yet</p>
                  )}
                </div>

                {/* Distribution History */}
                <div className="p-4 rounded-xl border bg-card">
                  <h4 className="font-semibold mb-3 flex items-center gap-2 text-sm">
                    <Share2 className="h-4 w-4 text-info" />Distribution History
                    <Badge variant="secondary" className="h-4 text-[10px] px-1">{distributions?.length || 0}</Badge>
                  </h4>
                  {(distributions?.length || 0) > 0 ? (
                    <div className="space-y-2">
                      {distributions!.map((d: any) => {
                        const dFac = facilityMap.get(d.facility_id);
                        return (
                          <div key={d.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className={cn("h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0", d.is_original ? "bg-warning/10" : "bg-info/10")}>
                                {d.is_original ? <Star className="h-4 w-4 text-warning" /> : <Share2 className="h-4 w-4 text-info" />}
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-medium truncate">{dFac?.name || "Unknown"}</p>
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                  <span>{d.is_original ? "Original" : "Redistributed"}</span>
                                  {d.unlocked_at && <Badge variant="outline" className="text-[10px] h-4 bg-success/10 text-success border-success/30">Unlocked</Badge>}
                                  {d.notification_sent && <Badge variant="outline" className="text-[10px] h-4">Notified</Badge>}
                                </div>
                              </div>
                            </div>
                            <span className="text-xs text-muted-foreground whitespace-nowrap">{format(new Date(d.distributed_at), "MMM d, h:mm a")}</span>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-6">No distributions recorded</p>
                  )}
                </div>
              </div>
            </TabsContent>

            {/* ===== ACTIONS TAB ===== */}
            <TabsContent value="actions" className="m-0 data-[state=inactive]:hidden">
              <div className="p-5 space-y-5">
                {/* Reassign Lead */}
                <div className="p-4 rounded-xl border bg-card">
                  <h4 className="font-semibold mb-3 flex items-center gap-2 text-sm">
                    <ArrowRightLeft className="h-4 w-4 text-primary" />Reassign Lead
                  </h4>
                  <p className="text-xs text-muted-foreground mb-3">Move this lead to a different facility. The provider will be notified.</p>
                  <div className="flex items-center gap-3">
                    <div className="flex-1">
                      <Select onValueChange={(val) => reassignMutation.mutate(val)} disabled={reassignMutation.isPending}>
                        <SelectTrigger><SelectValue placeholder="Select facility..." /></SelectTrigger>
                        <SelectContent className="max-h-60">
                          {facilities.slice(0, 100).map((f) => (
                            <SelectItem key={f.id} value={f.id} disabled={f.id === lead.facility_id}>
                              {f.name}{f.id === lead.facility_id ? " (Current)" : ""} — {f.city}, {f.state}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    {reassignMutation.isPending && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                  </div>
                </div>

                {/* Mark Contacted */}
                <div className="p-4 rounded-xl border bg-card">
                  <h4 className="font-semibold mb-3 flex items-center gap-2 text-sm">
                    <CheckCircle className="h-4 w-4 text-chart-3" />Mark as Contacted
                  </h4>
                  <p className="text-xs text-muted-foreground mb-3">
                    Current response status: <span className="font-medium text-foreground">{lead.provider_response_status || "None"}</span>
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => markContactedMutation.mutate()}
                    disabled={markContactedMutation.isPending || lead.provider_response_status === "contacted"}
                    className="gap-1.5"
                  >
                    {markContactedMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle className="h-3.5 w-3.5" />}
                    Mark Contacted
                  </Button>
                </div>

                {/* Flag Issue */}
                <div className="p-4 rounded-xl border bg-card">
                  <h4 className="font-semibold mb-3 flex items-center gap-2 text-sm">
                    <AlertTriangle className="h-4 w-4 text-warning" />Flag Issue
                  </h4>
                  <p className="text-xs text-muted-foreground mb-3">
                    Current flag: <span className="font-medium text-foreground">{lead.quality_flag || "None"}</span>
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {["spam", "duplicate", "low_quality", "test", "invalid_contact"].map((flag) => (
                      <Button
                        key={flag}
                        size="sm"
                        variant={lead.quality_flag === flag ? "default" : "outline"}
                        onClick={() => flagIssueMutation.mutate(lead.quality_flag === flag ? "" : flag)}
                        disabled={flagIssueMutation.isPending}
                        className="text-xs capitalize"
                      >
                        {flag.replace("_", " ")}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Quick Add Note */}
                <div className="p-4 rounded-xl border bg-card">
                  <h4 className="font-semibold mb-3 flex items-center gap-2 text-sm">
                    <StickyNote className="h-4 w-4 text-primary" />Quick Note
                  </h4>
                  <Textarea value={noteText} onChange={(e) => setNoteText(e.target.value)} placeholder="Add admin note..." className="min-h-[70px] text-sm" />
                  <div className="flex justify-end mt-2">
                    <Button size="sm" onClick={handleSaveNote} disabled={savingNote || !noteText.trim()} className="gap-1.5">
                      {savingNote ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}Save
                    </Button>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* ===== TIMELINE TAB ===== */}
            <TabsContent value="timeline" className="m-0 data-[state=inactive]:hidden">
              <div className="p-5">
                {timeline.length > 0 ? (
                  <div className="relative space-y-0">
                    {timeline.map((event, index) => {
                      const IconComp = event.icon;
                      return (
                        <div key={index} className="flex gap-3 pb-4 relative">
                          {index < timeline.length - 1 && <div className="absolute left-[15px] top-8 bottom-0 w-px bg-border" />}
                          <div className={cn("h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0 z-10", event.color)}>
                            <IconComp className="h-4 w-4" />
                          </div>
                          <div className="flex-1 min-w-0 pt-0.5">
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <p className="text-sm font-medium">{event.label}</p>
                                {event.detail && <p className="text-xs text-muted-foreground">{event.detail}</p>}
                              </div>
                              <span className="text-xs text-muted-foreground whitespace-nowrap flex-shrink-0">{format(new Date(event.date), "MMM d, h:mm a")}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-16">
                    <Activity className="h-10 w-10 mx-auto mb-2 text-muted-foreground/30" />
                    <p className="text-muted-foreground font-medium">No timeline events</p>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* ===== NOTES TAB ===== */}
            <TabsContent value="notes" className="m-0 data-[state=inactive]:hidden">
              <div className="p-5 space-y-4">
                <div className="p-4 rounded-xl border bg-card">
                  <h4 className="font-semibold mb-2 flex items-center gap-2 text-sm"><StickyNote className="h-4 w-4 text-primary" />Add Note</h4>
                  <Textarea value={noteText} onChange={(e) => setNoteText(e.target.value)} placeholder="Add internal note about this inquiry..." className="min-h-[80px] text-sm" />
                  <div className="flex justify-end mt-2">
                    <Button size="sm" onClick={handleSaveNote} disabled={savingNote || !noteText.trim()} className="gap-1.5">
                      {savingNote ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}Save Note
                    </Button>
                  </div>
                </div>
                {(leadNotes?.length || 0) > 0 ? (
                  <div className="space-y-2">
                    {leadNotes!.map((note: any) => (
                      <div key={note.id} className="p-3 rounded-lg border bg-card">
                        <p className="text-sm">{note.note}</p>
                        <p className="text-xs text-muted-foreground mt-1.5">{format(new Date(note.created_at), "MMM d, yyyy h:mm a")}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <StickyNote className="h-10 w-10 mx-auto mb-2 text-muted-foreground/30" />
                    <p className="text-muted-foreground font-medium">No notes yet</p>
                  </div>
                )}
              </div>
            </TabsContent>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

// Reusable info card
function InfoCard({ title, icon: Icon, rows }: { title: string; icon: any; rows: [string, any][] }) {
  return (
    <div className="p-4 rounded-xl border bg-card">
      <h4 className="font-semibold mb-3 flex items-center gap-2 text-sm">
        <Icon className="h-4 w-4 text-primary" />{title}
      </h4>
      <div className="space-y-2.5 text-sm">
        {rows.map(([label, value]) => (
          <div key={label} className="flex justify-between items-start">
            <span className="text-muted-foreground">{label}</span>
            <span className="font-medium text-right max-w-[60%] break-all">{value || "—"}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
