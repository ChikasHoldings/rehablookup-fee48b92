import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import {
  User,
  MapPin,
  Calendar,
  Activity,
  Heart,
  Pill,
  DollarSign,
  Shield,
  Clock,
  CheckCircle2,
  XCircle,
  MessageSquare,
  ArrowRight,
  Hourglass,
  Send,
  Loader2,
  FileText,
  AlertCircle,
} from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

// ── Types ──────────────────────────────────────────────

interface ConciergeInquiry {
  id: string;
  user_name?: string;
  level_of_care?: string | null;
  payment_type?: string | null;
  timeline_urgency?: string | null;
  preferred_state?: string | null;
  preferred_city?: string | null;
  status?: string;
  age_range?: string | null;
  gender?: string | null;
  primary_concern?: string | null;
  insurance_carrier?: string | null;
  detox_needed?: string | null;
  co_occurring_concerns?: unknown | null;
  substance_use_duration?: string | null;
  budget_range?: string | null;
  seeker_confirmed?: boolean;
  seeker_confirmed_at?: string | null;
  placement_confirmed?: boolean;
  placement_confirmed_at?: string | null;
  placed_facility_id?: string | null;
  intake_data?: unknown | null;
  preferred_language?: string | null;
  preferred_environment?: string | null;
  faith_based_preference?: string | null;
  holistic_interest?: boolean | null;
  mobility_needs?: string | null;
  substance_use_frequency?: string | null;
  prior_treatment_history?: boolean | null;
  prior_treatment_notes?: string | null;
  current_medications?: string | null;
  current_living_situation?: string | null;
  assessment_preference?: string | null;
  amenity_preferences?: unknown | null;
  notes?: string | null;
  created_at?: string;
}

interface Introduction {
  id: string;
  facility_id: string;
  inquiry_id: string;
  created_at: string;
  provider_response?: string | null;
  provider_responded_at?: string | null;
  provider_notes?: string | null;
  concierge_inquiries?: ConciergeInquiry | null;
}

interface PlacementDetailModalProps {
  introduction: Introduction | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  facilityId: string;
  onRespond?: (response: string, notes?: string) => void;
  isResponding?: boolean;
  hasPro?: boolean;
}

// ── Helpers ────────────────────────────────────────────

const fmt = (value: string | null | undefined, fallback = "Not specified") => {
  if (!value) return fallback;
  return value.replace(/[_-]/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
};

const fmtCoOccurring = (concerns: unknown) => {
  if (!concerns) return null;
  if (Array.isArray(concerns)) return concerns.map((c) => fmt(String(c))).join(", ");
  if (typeof concerns === "object") {
    return Object.entries(concerns as Record<string, boolean>)
      .filter(([, v]) => v)
      .map(([k]) => fmt(k))
      .join(", ");
  }
  return String(concerns);
};

const fmtAmenities = (amenities: unknown) => {
  if (!amenities) return null;
  if (Array.isArray(amenities)) return amenities.map((a) => fmt(String(a))).join(", ");
  if (typeof amenities === "object") {
    return Object.entries(amenities as Record<string, boolean>)
      .filter(([, v]) => v)
      .map(([k]) => fmt(k))
      .join(", ");
  }
  return String(amenities);
};

const fmtUrgency = (u: string | null | undefined) => {
  const map: Record<string, string> = {
    immediate: "Immediate",
    within_week: "Within 1 Week",
    within_month: "Within 1 Month",
    flexible: "Flexible",
  };
  return map[u || ""] || "Flexible";
};

// ── Sub-components ─────────────────────────────────────

function InfoItem({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string | null | undefined }) {
  if (!value || value === "Not specified") return null;
  return (
    <div className="flex items-start gap-2.5 py-1.5">
      <Icon className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="text-[11px] text-muted-foreground uppercase tracking-wider leading-none mb-0.5">{label}</p>
        <p className="text-sm font-medium break-words leading-snug">{value}</p>
      </div>
    </div>
  );
}

function Section({ title, icon: Icon, children }: { title: string; icon: React.ElementType; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border overflow-hidden">
      <div className="bg-muted/40 px-4 py-2 border-b flex items-center gap-2">
        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</h3>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

function StatusChip({ status }: { status: string | undefined }) {
  const config: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; className?: string }> = {
    new: { label: "New", variant: "secondary" },
    reviewing: { label: "Under Review", variant: "outline", className: "border-primary/40 text-primary" },
    matching: { label: "Finding Matches", variant: "outline", className: "border-accent-foreground/30 text-accent-foreground" },
    matched: { label: "Matched", variant: "outline", className: "border-primary/40 text-primary" },
    introductions_sent: { label: "Introductions Sent", variant: "outline", className: "border-primary/30 text-primary" },
    in_contact: { label: "In Contact", variant: "outline", className: "border-primary/40 text-primary" },
    placed: { label: "Placed", variant: "default" },
    closed: { label: "Closed", variant: "secondary" },
  };
  const c = config[status || ""] || { label: fmt(status), variant: "secondary" as const };
  return <Badge variant={c.variant} className={cn("text-[10px]", c.className)}>{c.label}</Badge>;
}

// ── Tab panel with its own scroll ──────────────────────

function TabPanel({ active, children }: { active: boolean; children: React.ReactNode }) {
  if (!active) return null;
  return (
    <div className="absolute inset-0 overflow-y-auto overscroll-contain">
      <div className="p-4 sm:p-5">{children}</div>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────

export function PlacementDetailModal({
  introduction,
  open,
  onOpenChange,
  facilityId,
  onRespond,
  isResponding = false,
  hasPro = false,
}: PlacementDetailModalProps) {
  const [activeTab, setActiveTab] = useState<"details" | "messages" | "timeline">("details");
  const [providerNote, setProviderNote] = useState("");
  const inquiry = introduction?.concierge_inquiries;
  const caseId = inquiry?.id?.slice(0, 8).toUpperCase() || introduction?.id.slice(0, 8).toUpperCase() || "";
  const firstName = inquiry?.user_name?.split(" ")[0] || "Client";
  const isPending = !introduction?.provider_response || introduction.provider_response === "pending";
  const isAccepted = introduction?.provider_response === "interested";
  const isDeclined = introduction?.provider_response === "not_available";
  const isPlaced = inquiry?.placement_confirmed === true && inquiry?.placed_facility_id === facilityId;

  // Fetch full inquiry
  const { data: fullInquiry } = useQuery({
    queryKey: ["placement-detail", introduction?.inquiry_id],
    queryFn: async () => {
      if (!introduction?.inquiry_id) return null;
      const { data, error } = await supabase
        .from("concierge_inquiries")
        .select(`
          id, user_name, level_of_care, payment_type, timeline_urgency, preferred_state,
          preferred_city, status, age_range, gender, primary_concern, insurance_carrier,
          detox_needed, co_occurring_concerns, substance_use_duration, budget_range,
          seeker_confirmed, seeker_confirmed_at, placement_confirmed, placement_confirmed_at,
          placed_facility_id, intake_data, preferred_language, preferred_environment,
          faith_based_preference, holistic_interest, mobility_needs, substance_use_frequency,
          prior_treatment_history, prior_treatment_notes, current_medications,
          current_living_situation, assessment_preference, amenity_preferences, notes, created_at
        `)
        .eq("id", introduction.inquiry_id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: open && !!introduction?.inquiry_id,
    staleTime: 60000,
  });

  // Fetch messages
  const { data: messages, isLoading: messagesLoading } = useQuery({
    queryKey: ["placement-messages", introduction?.inquiry_id, facilityId],
    queryFn: async () => {
      if (!introduction?.inquiry_id) return [];
      const { data: thread } = await supabase
        .from("concierge_threads")
        .select("id")
        .eq("inquiry_id", introduction.inquiry_id)
        .eq("facility_id", facilityId)
        .maybeSingle();
      if (!thread?.id) return [];
      const { data: msgs, error } = await supabase
        .from("concierge_messages")
        .select("id, sender_type, content, created_at")
        .eq("thread_id", thread.id)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return msgs || [];
    },
    enabled: open && !!introduction?.inquiry_id,
    staleTime: 30000,
  });

  // Fetch case events
  const { data: caseEvents } = useQuery({
    queryKey: ["placement-events", introduction?.inquiry_id],
    queryFn: async () => {
      if (!introduction?.inquiry_id) return [];
      const { data, error } = await supabase
        .from("concierge_case_events")
        .select("id, event_type, event_data, created_at, actor_type")
        .eq("inquiry_id", introduction.inquiry_id)
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data || [];
    },
    enabled: open && !!introduction?.inquiry_id,
    staleTime: 60000,
  });

  const inq = fullInquiry || inquiry;
  const locationText = [inq?.preferred_city, inq?.preferred_state].filter(Boolean).join(", ") || "Flexible";
  const coOccurringText = fmtCoOccurring(inq?.co_occurring_concerns);
  const amenitiesText = fmtAmenities(inq?.amenity_preferences);
  const intakeData = inq?.intake_data && typeof inq.intake_data === "object" ? (inq.intake_data as Record<string, unknown>) : null;

  const steps = [
    { label: "Created", done: true },
    { label: "Sent", done: true },
    { label: "Review", done: !isPending },
    { label: "Coordinating", done: isAccepted || isPlaced },
    { label: "Confirmed", done: isPlaced },
  ];

  const nextStepText = isPlaced
    ? "Admission confirmed — thank you!"
    : isDeclined
    ? "You declined this candidate."
    : isAccepted
    ? "Advisor is coordinating with the client."
    : "Review and respond to this candidate.";

  const tabs = [
    { key: "details" as const, label: "Details", icon: FileText },
    { key: "messages" as const, label: "Messages", icon: MessageSquare, count: messages?.length },
    { key: "timeline" as const, label: "Timeline", icon: Clock },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl w-[95vw] p-0 gap-0 overflow-hidden flex flex-col h-[85vh] sm:h-[80vh] [&>button]:top-3.5 [&>button]:right-3.5 [&>button]:z-[60]">

        {/* ─── Compact Header ─── */}
        <DialogHeader className="px-5 pt-4 pb-3 border-b flex-shrink-0">
          <div className="flex items-center justify-between gap-3 pr-6">
            <div className="min-w-0">
              <DialogTitle className="text-base font-bold tracking-tight">
                Case #{caseId}
              </DialogTitle>
              <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1.5">
                <User className="h-3 w-3 shrink-0" />
                {firstName} · {introduction?.created_at && format(new Date(introduction.created_at), "MMM d, yyyy")}
              </p>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <StatusChip status={inq?.status} />
              {isPending && <Badge variant="destructive" className="text-[10px] h-5">Action Needed</Badge>}
              {isAccepted && !isPlaced && (
                <Badge variant="outline" className="text-[10px] h-5 gap-1">
                  <Hourglass className="h-3 w-3" /> Awaiting
                </Badge>
              )}
              {isPlaced && (
                <Badge variant="default" className="text-[10px] h-5 gap-1">
                  <CheckCircle2 className="h-3 w-3" /> Placed
                </Badge>
              )}
            </div>
          </div>
        </DialogHeader>

        {/* ─── Tab Bar (custom, not Radix) ─── */}
        <div className="flex border-b flex-shrink-0 px-5">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                "flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium border-b-2 transition-colors -mb-px",
                activeTab === tab.key
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/30"
              )}
            >
              <tab.icon className="h-3.5 w-3.5" />
              {tab.label}
              {tab.count !== undefined && tab.count > 0 && (
                <span className="ml-1 bg-muted text-muted-foreground rounded-full text-[10px] h-4 min-w-[16px] px-1 flex items-center justify-center">
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ─── Tab Content (each independently scrollable) ─── */}
        <div className="flex-1 min-h-0 relative">

          {/* === DETAILS === */}
          <TabPanel active={activeTab === "details"}>
            <div className="space-y-4">
              {/* Progress bar */}
              <div className="rounded-lg border bg-muted/20 p-3">
                <div className="flex gap-1 mb-2">
                  {steps.map((s, i) => (
                    <div key={i} className="flex-1">
                      <div className={cn("h-1.5 rounded-full transition-colors", s.done ? "bg-primary" : "bg-muted")} />
                      <p className={cn("text-[9px] text-center mt-1 leading-tight", s.done ? "text-foreground font-medium" : "text-muted-foreground")}>
                        {s.label}
                      </p>
                    </div>
                  ))}
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground bg-background rounded px-2.5 py-1.5 border">
                  <ArrowRight className="h-3 w-3 shrink-0 text-primary" />
                  <span>{nextStepText}</span>
                </div>
              </div>

              {/* Client Profile */}
              <Section title="Client Profile" icon={User}>
                <div className="grid grid-cols-2 gap-x-6">
                  <InfoItem icon={User} label="Name" value={firstName} />
                  <InfoItem icon={Calendar} label="Age Range" value={fmt(inq?.age_range)} />
                  <InfoItem icon={User} label="Gender" value={fmt(inq?.gender)} />
                  <InfoItem icon={MapPin} label="Location" value={locationText} />
                  <InfoItem icon={MessageSquare} label="Language" value={fmt(inq?.preferred_language)} />
                  <InfoItem icon={MapPin} label="Environment" value={fmt(inq?.preferred_environment)} />
                  <InfoItem icon={Activity} label="Living Situation" value={fmt(inq?.current_living_situation)} />
                  <InfoItem icon={Shield} label="Mobility Needs" value={fmt(inq?.mobility_needs)} />
                </div>
              </Section>

              {/* Clinical Summary */}
              <Section title="Clinical Summary" icon={Activity}>
                <div className="grid grid-cols-2 gap-x-6">
                  <InfoItem icon={Activity} label="Level of Care" value={fmt(inq?.level_of_care)} />
                  <InfoItem icon={Heart} label="Primary Concern" value={fmt(inq?.primary_concern)} />
                  <InfoItem icon={Pill} label="Detox Needed" value={fmt(inq?.detox_needed)} />
                  <InfoItem icon={Clock} label="Use Duration" value={fmt(inq?.substance_use_duration)} />
                  <InfoItem icon={Clock} label="Frequency" value={fmt(inq?.substance_use_frequency)} />
                  <InfoItem icon={Activity} label="Assessment" value={fmt(inq?.assessment_preference)} />
                  {inq?.prior_treatment_history && <InfoItem icon={FileText} label="Prior Treatment" value="Yes" />}
                  <InfoItem icon={FileText} label="Treatment Notes" value={inq?.prior_treatment_notes} />
                  <InfoItem icon={Pill} label="Medications" value={inq?.current_medications} />
                </div>
                {coOccurringText && (
                  <div className="mt-1">
                    <InfoItem icon={Heart} label="Co-Occurring" value={coOccurringText} />
                  </div>
                )}
              </Section>

              {/* Payment & Preferences */}
              <Section title="Payment & Preferences" icon={DollarSign}>
                <div className="grid grid-cols-2 gap-x-6">
                  <InfoItem icon={DollarSign} label="Payment" value={fmt(inq?.payment_type)} />
                  <InfoItem icon={Shield} label="Insurance" value={inq?.insurance_carrier} />
                  <InfoItem icon={DollarSign} label="Budget" value={fmt(inq?.budget_range)} />
                  <InfoItem icon={Clock} label="Timeline" value={fmtUrgency(inq?.timeline_urgency)} />
                  <InfoItem icon={Heart} label="Faith-Based" value={fmt(inq?.faith_based_preference)} />
                  {inq?.holistic_interest && <InfoItem icon={Heart} label="Holistic" value="Yes" />}
                </div>
                {amenitiesText && (
                  <div className="mt-1">
                    <InfoItem icon={FileText} label="Amenities" value={amenitiesText} />
                  </div>
                )}
              </Section>

              {/* Additional intake data */}
              {intakeData && Object.keys(intakeData).length > 0 && (
                <Section title="Additional Details" icon={FileText}>
                  <div className="grid grid-cols-2 gap-x-6">
                    {Object.entries(intakeData)
                      .filter(([key]) => !["email", "phone", "user_email", "user_phone"].includes(key))
                      .filter(([, val]) => val !== null && val !== undefined && val !== "")
                      .slice(0, 20)
                      .map(([key, val]) => (
                        <InfoItem
                          key={key}
                          icon={FileText}
                          label={fmt(key)}
                          value={typeof val === "object" ? JSON.stringify(val) : String(val)}
                        />
                      ))}
                  </div>
                </Section>
              )}

              {/* Client Notes */}
              {inq?.notes && (
                <Section title="Client Notes" icon={FileText}>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{inq.notes}</p>
                </Section>
              )}

              {/* Fee notice */}
              <div className="rounded-lg bg-muted/30 border px-3 py-2.5 flex items-start gap-2 text-xs text-muted-foreground">
                <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                <span>
                  <strong className="text-foreground">Fee:</strong> {hasPro ? "$800" : "$1,000"} — charged only on confirmed admission.
                  {hasPro && <span className="text-primary ml-1">Pro discount</span>}
                </span>
              </div>

              {/* Actions (pending) */}
              {isPending && onRespond && (
                <div className="space-y-3 pt-1">
                  <Textarea
                    placeholder="Optional note to advisor..."
                    value={providerNote}
                    onChange={(e) => setProviderNote(e.target.value)}
                    className="text-sm resize-none"
                    rows={2}
                  />
                  <div className="flex gap-3">
                    <Button className="flex-1 gap-2" onClick={() => onRespond("interested", providerNote.trim() || undefined)} disabled={isResponding}>
                      {isResponding ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                      Accept
                    </Button>
                    <Button variant="outline" className="flex-1 gap-2" onClick={() => onRespond("not_available", providerNote.trim() || undefined)} disabled={isResponding}>
                      {isResponding ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
                      Decline
                    </Button>
                  </div>
                </div>
              )}

              {/* Response summary */}
              {!isPending && (
                <div className={cn("rounded-lg p-3.5 border", isPlaced ? "bg-primary/5 border-primary/20" : "bg-muted/30")}>
                  <div className="flex items-center gap-2 mb-0.5">
                    {isPlaced ? <CheckCircle2 className="h-4 w-4 text-primary" /> : isAccepted ? <Hourglass className="h-4 w-4 text-muted-foreground" /> : <XCircle className="h-4 w-4 text-muted-foreground" />}
                    <span className="font-medium text-sm">
                      {isPlaced ? "Admission Confirmed" : isAccepted ? "Accepted — Awaiting Confirmation" : "Declined"}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground pl-6">
                    {isPlaced
                      ? `Confirmed ${inquiry?.placement_confirmed_at ? format(new Date(inquiry.placement_confirmed_at), "MMM d, yyyy") : ""}`
                      : `Responded ${introduction?.provider_responded_at ? format(new Date(introduction.provider_responded_at), "MMM d, yyyy 'at' h:mm a") : ""}`}
                  </p>
                  {introduction?.provider_notes && (
                    <p className="text-xs text-muted-foreground mt-1.5 pl-6 italic">"{introduction.provider_notes}"</p>
                  )}
                </div>
              )}
            </div>
          </TabPanel>

          {/* === MESSAGES === */}
          <TabPanel active={activeTab === "messages"}>
            {messagesLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-12 w-3/4" />
                <Skeleton className="h-12 w-2/3 ml-auto" />
                <Skeleton className="h-12 w-3/4" />
              </div>
            ) : messages && messages.length > 0 ? (
              <div className="space-y-3">
                <p className="text-xs text-muted-foreground mb-3">Messages between you and the placement advisor.</p>
                {messages.map((msg) => {
                  const isYou = msg.sender_type === "provider" || msg.sender_type === "facility";
                  return (
                    <div key={msg.id} className={cn("flex", isYou ? "justify-end" : "justify-start")}>
                      <div className={cn(
                        "max-w-[80%] rounded-lg px-3.5 py-2.5 text-sm",
                        isYou ? "bg-primary text-primary-foreground rounded-br-sm" : "bg-muted rounded-bl-sm"
                      )}>
                        <p className="text-[10px] opacity-70 mb-0.5">{isYou ? "You" : "Advisor"}</p>
                        <p className="whitespace-pre-wrap break-words leading-relaxed">{msg.content}</p>
                        <p className="text-[10px] opacity-50 mt-1.5 text-right">{format(new Date(msg.created_at), "MMM d, h:mm a")}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-3">
                  <MessageSquare className="h-5 w-5 text-muted-foreground" />
                </div>
                <p className="text-sm font-medium text-muted-foreground">No messages yet</p>
                <p className="text-xs text-muted-foreground/70 mt-1 max-w-xs">
                  Messages from the placement advisor will appear here once coordination begins.
                </p>
              </div>
            )}
          </TabPanel>

          {/* === TIMELINE === */}
          <TabPanel active={activeTab === "timeline"}>
            <div className="space-y-0">
              {/* Core milestones */}
              <TimelineEntry
                label="Case Sent to You"
                date={introduction?.created_at}
                icon={<Send className="h-3.5 w-3.5 text-primary" />}
              />
              {introduction?.provider_responded_at && (
                <TimelineEntry
                  label={isAccepted ? "You Accepted" : "You Declined"}
                  date={introduction.provider_responded_at}
                  icon={isAccepted ? <CheckCircle2 className="h-3.5 w-3.5 text-primary" /> : <XCircle className="h-3.5 w-3.5 text-muted-foreground" />}
                />
              )}
              {inquiry?.placement_confirmed_at && isPlaced && (
                <TimelineEntry
                  label="Admission Confirmed"
                  date={inquiry.placement_confirmed_at}
                  icon={<CheckCircle2 className="h-3.5 w-3.5 text-primary" />}
                />
              )}

              {/* Case event log */}
              {caseEvents && caseEvents.length > 0 && (
                <>
                  <Separator className="my-4" />
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-3">Activity Log</p>
                  {caseEvents.map((ev) => (
                    <TimelineEntry
                      key={ev.id}
                      label={fmt(ev.event_type)}
                      date={ev.created_at}
                      icon={<Activity className="h-3.5 w-3.5 text-muted-foreground" />}
                      subtitle={ev.actor_type ? `by ${fmt(ev.actor_type)}` : undefined}
                    />
                  ))}
                </>
              )}

              {(!caseEvents || caseEvents.length === 0) && !introduction?.provider_responded_at && (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-3">
                    <Clock className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <p className="text-sm text-muted-foreground">Timeline updates as the case progresses.</p>
                </div>
              )}
            </div>
          </TabPanel>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Timeline entry ─────────────────────────────────────

function TimelineEntry({ label, date, icon, subtitle }: { label: string; date?: string | null; icon: React.ReactNode; subtitle?: string }) {
  return (
    <div className="flex items-start gap-3 py-2.5 border-l-2 border-muted pl-4 ml-1.5 relative">
      <div className="absolute -left-[7px] top-3 shrink-0">{icon}</div>
      <div className="min-w-0 flex-1 ml-2">
        <p className="text-sm font-medium leading-snug">{label}</p>
        {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
      </div>
      {date && (
        <span className="text-[11px] text-muted-foreground shrink-0 tabular-nums">
          {format(new Date(date), "MMM d, h:mm a")}
        </span>
      )}
    </div>
  );
}
