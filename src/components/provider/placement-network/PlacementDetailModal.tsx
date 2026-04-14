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
import { useSelectedFacilityOptional } from "@/contexts/SelectedFacilityContext";
import { useMatchScore, MatchScoreBadge } from "./MatchScoreUtils";

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

const fmt = (value: string | null | undefined, fallback = "—") => {
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

const URGENCY_MAP: Record<string, { label: string; className: string }> = {
  immediate: { label: "Immediate", className: "bg-destructive/10 text-destructive border-destructive/20" },
  within_week: { label: "Within 1 Week", className: "bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/20" },
  within_month: { label: "Within 1 Month", className: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20" },
  flexible: { label: "Flexible", className: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20" },
};

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  new: { label: "New", className: "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20" },
  reviewing: { label: "Under Review", className: "bg-primary/10 text-primary border-primary/20" },
  matching: { label: "Finding Matches", className: "bg-violet-500/10 text-violet-700 dark:text-violet-400 border-violet-500/20" },
  matched: { label: "Matched", className: "bg-primary/10 text-primary border-primary/20" },
  introductions_sent: { label: "Introductions Sent", className: "bg-sky-500/10 text-sky-700 dark:text-sky-400 border-sky-500/20" },
  in_contact: { label: "In Contact", className: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20" },
  placed: { label: "Placed", className: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20" },
  closed: { label: "Closed", className: "bg-muted text-muted-foreground border-muted" },
};

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
  const { selectedFacility } = useSelectedFacilityOptional();
  const matchScore = useMatchScore(selectedFacility, inquiry);
  const caseId = inquiry?.id?.slice(0, 8).toUpperCase() || introduction?.id.slice(0, 8).toUpperCase() || "";
  const firstName = inquiry?.user_name?.split(" ")[0] || "Client";
  const isPending = !introduction?.provider_response || introduction.provider_response === "pending";
  const isAccepted = introduction?.provider_response === "interested";
  const isDeclined = introduction?.provider_response === "not_available";
  const isPlaced = inquiry?.placement_confirmed === true && inquiry?.placed_facility_id === facilityId;

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

  const statusConf = STATUS_CONFIG[inq?.status || ""] || { label: fmt(inq?.status), className: "bg-muted text-muted-foreground" };
  const urgencyConf = URGENCY_MAP[inq?.timeline_urgency || ""] || URGENCY_MAP.flexible;

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
      <DialogContent className="max-w-2xl w-[95vw] p-0 gap-0 overflow-hidden flex flex-col h-[85vh] sm:h-[80vh] [&>button]:top-4 [&>button]:right-4 [&>button]:z-[60]">

        {/* ─── Header ─── */}
        <DialogHeader className="px-6 pt-5 pb-4 border-b bg-muted/20 flex-shrink-0">
          <div className="flex items-start justify-between gap-4 pr-8">
            <div className="min-w-0">
              <DialogTitle className="text-lg font-bold tracking-tight flex items-center gap-2.5">
                Case #{caseId}
                <Badge variant="outline" className={cn("text-xs font-semibold", statusConf.className)}>
                  {statusConf.label}
                </Badge>
              </DialogTitle>
              <div className="flex items-center gap-3 mt-1.5 text-sm text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5" />
                  {firstName}
                </span>
                <span className="text-muted-foreground/30">·</span>
                <span className="flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5" />
                  {introduction?.created_at && format(new Date(introduction.created_at), "MMM d, yyyy")}
                </span>
                {inq?.timeline_urgency && (
                  <>
                    <span className="text-muted-foreground/30">·</span>
                    <Badge variant="outline" className={cn("text-xs", urgencyConf.className)}>
                      {urgencyConf.label}
                    </Badge>
                  </>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0 mt-0.5">
              {isPending && (
                <Badge variant="destructive" className="text-xs h-6 gap-1">
                  <AlertCircle className="h-3 w-3" /> Action Needed
                </Badge>
              )}
              {isAccepted && !isPlaced && (
                <Badge className="bg-amber-500 text-white border-amber-500 text-xs h-6 gap-1">
                  <Hourglass className="h-3 w-3" /> Awaiting
                </Badge>
              )}
              {isPlaced && (
                <Badge className="bg-emerald-600 text-white border-emerald-600 text-xs h-6 gap-1">
                  <CheckCircle2 className="h-3 w-3" /> Placed
                </Badge>
              )}
            </div>
          </div>
        </DialogHeader>

        {/* ─── Tab Bar ─── */}
        <div className="flex border-b flex-shrink-0 px-6 bg-background">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                "flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors -mb-px",
                activeTab === tab.key
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/30"
              )}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
              {tab.count !== undefined && tab.count > 0 && (
                <span className="bg-primary/10 text-primary rounded-full text-xs font-bold h-5 min-w-[20px] px-1.5 flex items-center justify-center">
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ─── Tab Content ─── */}
        <div className="flex-1 min-h-0 relative">

          {/* === DETAILS === */}
          <TabPanel active={activeTab === "details"}>
            <div className="space-y-5">
              {/* Progress stepper */}
              <div className="rounded-xl border bg-muted/20 p-4">
                <div className="flex gap-1.5 mb-3">
                  {steps.map((s, i) => (
                    <div key={i} className="flex-1">
                      <div className={cn("h-2 rounded-full transition-colors", s.done ? "bg-primary" : "bg-muted")} />
                      <p className={cn("text-xs text-center mt-1.5", s.done ? "text-foreground font-semibold" : "text-muted-foreground")}>
                        {s.label}
                      </p>
                    </div>
                  ))}
                </div>
                <div className="flex items-center gap-2.5 text-sm text-muted-foreground bg-background rounded-lg px-3 py-2 border">
                  <ArrowRight className="h-3.5 w-3.5 shrink-0 text-primary" />
                  <span>{nextStepText}</span>
                </div>
              </div>

              {/* Client Profile */}
              <SectionCard title="Client Profile" icon={User}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-1">
                  <InfoItem icon={User} label="Name" value={firstName} />
                  <InfoItem icon={Calendar} label="Age Range" value={fmt(inq?.age_range)} />
                  <InfoItem icon={User} label="Gender" value={fmt(inq?.gender)} />
                  <InfoItem icon={MapPin} label="Preferred Location" value={locationText} />
                  <InfoItem icon={MessageSquare} label="Language" value={fmt(inq?.preferred_language)} />
                  <InfoItem icon={MapPin} label="Environment" value={fmt(inq?.preferred_environment)} />
                  <InfoItem icon={Activity} label="Living Situation" value={fmt(inq?.current_living_situation)} />
                  <InfoItem icon={Shield} label="Mobility Needs" value={fmt(inq?.mobility_needs)} />
                </div>
              </SectionCard>

              {/* Clinical Summary */}
              <SectionCard title="Clinical Summary" icon={Activity}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-1">
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
                  <div className="mt-2 pt-2 border-t">
                    <InfoItem icon={Heart} label="Co-Occurring" value={coOccurringText} />
                  </div>
                )}
              </SectionCard>

              {/* Payment & Preferences */}
              <SectionCard title="Payment & Preferences" icon={DollarSign}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-1">
                  <InfoItem icon={DollarSign} label="Payment Type" value={fmt(inq?.payment_type)} />
                  <InfoItem icon={Shield} label="Insurance" value={inq?.insurance_carrier} />
                  <InfoItem icon={DollarSign} label="Budget" value={fmt(inq?.budget_range)} />
                  <InfoItem icon={Clock} label="Timeline" value={urgencyConf.label} />
                  <InfoItem icon={Heart} label="Faith-Based" value={fmt(inq?.faith_based_preference)} />
                  {inq?.holistic_interest && <InfoItem icon={Heart} label="Holistic" value="Yes" />}
                </div>
                {amenitiesText && (
                  <div className="mt-2 pt-2 border-t">
                    <InfoItem icon={FileText} label="Amenity Preferences" value={amenitiesText} />
                  </div>
                )}
              </SectionCard>

              {/* Additional intake data */}
              {intakeData && Object.keys(intakeData).length > 0 && (
                <SectionCard title="Additional Details" icon={FileText}>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-1">
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
                </SectionCard>
              )}

              {/* Client Notes */}
              {inq?.notes && (
                <SectionCard title="Client Notes" icon={FileText}>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">{inq.notes}</p>
                </SectionCard>
              )}

              {/* Fee notice */}
              <div className="rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 px-4 py-3 flex items-start gap-3">
                <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-amber-800 dark:text-amber-400">
                    {hasPro ? "$800" : "$1,000"} Placement Fee
                  </p>
                  <p className="text-sm text-amber-700 dark:text-amber-500 mt-0.5">
                    Charged only on confirmed admission.{hasPro && " Pro discount applied."}
                  </p>
                </div>
              </div>

              {/* Actions (pending) */}
              {isPending && onRespond && (
                <div className="space-y-3 pt-1">
                  <Textarea
                    placeholder="Optional note to advisor..."
                    value={providerNote}
                    onChange={(e) => setProviderNote(e.target.value)}
                    className="text-sm resize-none rounded-xl"
                    rows={2}
                  />
                  <div className="flex gap-3">
                    <Button
                      className="flex-1 gap-2 h-11"
                      onClick={() => onRespond("interested", providerNote.trim() || undefined)}
                      disabled={isResponding}
                    >
                      {isResponding ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                      I'm Interested
                    </Button>
                    <Button
                      variant="outline"
                      className="flex-1 gap-2 h-11"
                      onClick={() => onRespond("not_available", providerNote.trim() || undefined)}
                      disabled={isResponding}
                    >
                      {isResponding ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
                      Not a Fit
                    </Button>
                  </div>
                </div>
              )}

              {/* Response summary */}
              {!isPending && (
                <div className={cn(
                  "rounded-xl p-4 border",
                  isPlaced
                    ? "bg-emerald-500/5 border-emerald-500/20"
                    : isAccepted
                    ? "bg-amber-500/5 border-amber-500/20"
                    : "bg-muted/30 border-muted"
                )}>
                  <div className="flex items-center gap-2.5 mb-1">
                    {isPlaced ? (
                      <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                    ) : isAccepted ? (
                      <Hourglass className="h-5 w-5 text-amber-600" />
                    ) : (
                      <XCircle className="h-5 w-5 text-muted-foreground" />
                    )}
                    <span className="font-semibold text-sm">
                      {isPlaced ? "Admission Confirmed" : isAccepted ? "Accepted — Awaiting Confirmation" : "Declined"}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground pl-[30px]">
                    {isPlaced
                      ? `Confirmed ${inquiry?.placement_confirmed_at ? format(new Date(inquiry.placement_confirmed_at), "MMM d, yyyy") : ""}`
                      : `Responded ${introduction?.provider_responded_at ? format(new Date(introduction.provider_responded_at), "MMM d, yyyy 'at' h:mm a") : ""}`}
                  </p>
                  {introduction?.provider_notes && (
                    <p className="text-sm text-muted-foreground mt-2 pl-[30px] italic border-l-2 border-muted ml-[14px] py-1">
                      "{introduction.provider_notes}"
                    </p>
                  )}
                </div>
              )}
            </div>
          </TabPanel>

          {/* === MESSAGES === */}
          <TabPanel active={activeTab === "messages"}>
            {messagesLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-14 w-3/4 rounded-xl" />
                <Skeleton className="h-14 w-2/3 ml-auto rounded-xl" />
                <Skeleton className="h-14 w-3/4 rounded-xl" />
              </div>
            ) : messages && messages.length > 0 ? (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground mb-4">Messages between you and the placement advisor.</p>
                {messages.map((msg) => {
                  const isYou = msg.sender_type === "provider" || msg.sender_type === "facility";
                  return (
                    <div key={msg.id} className={cn("flex", isYou ? "justify-end" : "justify-start")}>
                      <div className={cn(
                        "max-w-[80%] rounded-2xl px-4 py-3 text-sm",
                        isYou
                          ? "bg-primary text-primary-foreground rounded-br-md"
                          : "bg-muted rounded-bl-md"
                      )}>
                        <p className="text-xs font-semibold opacity-70 mb-1">{isYou ? "You" : "Advisor"}</p>
                        <p className="whitespace-pre-wrap break-words leading-relaxed">{msg.content}</p>
                        <p className="text-xs opacity-50 mt-2 text-right">{format(new Date(msg.created_at), "MMM d, h:mm a")}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="h-14 w-14 rounded-full bg-muted flex items-center justify-center mb-4">
                  <MessageSquare className="h-6 w-6 text-muted-foreground" />
                </div>
                <p className="text-sm font-semibold text-foreground">No messages yet</p>
                <p className="text-sm text-muted-foreground mt-1 max-w-xs">
                  Messages from the placement advisor will appear here once coordination begins.
                </p>
              </div>
            )}
          </TabPanel>

          {/* === TIMELINE === */}
          <TabPanel active={activeTab === "timeline"}>
            <div className="space-y-0">
              <TimelineEntry
                label="Case Sent to You"
                date={introduction?.created_at}
                icon={<Send className="h-4 w-4 text-primary" />}
              />
              {introduction?.provider_responded_at && (
                <TimelineEntry
                  label={isAccepted ? "You Accepted" : "You Declined"}
                  date={introduction.provider_responded_at}
                  icon={isAccepted ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <XCircle className="h-4 w-4 text-muted-foreground" />}
                />
              )}
              {inquiry?.placement_confirmed_at && isPlaced && (
                <TimelineEntry
                  label="Admission Confirmed"
                  date={inquiry.placement_confirmed_at}
                  icon={<CheckCircle2 className="h-4 w-4 text-emerald-600" />}
                />
              )}

              {caseEvents && caseEvents.length > 0 && (
                <>
                  <Separator className="my-5" />
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">Activity Log</p>
                  {caseEvents.map((ev) => (
                    <TimelineEntry
                      key={ev.id}
                      label={fmt(ev.event_type)}
                      date={ev.created_at}
                      icon={<Activity className="h-4 w-4 text-muted-foreground" />}
                      subtitle={ev.actor_type ? `by ${fmt(ev.actor_type)}` : undefined}
                    />
                  ))}
                </>
              )}

              {(!caseEvents || caseEvents.length === 0) && !introduction?.provider_responded_at && (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <div className="h-14 w-14 rounded-full bg-muted flex items-center justify-center mb-4">
                    <Clock className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <p className="text-sm font-semibold text-foreground">No activity yet</p>
                  <p className="text-sm text-muted-foreground mt-1">Timeline updates as the case progresses.</p>
                </div>
              )}
            </div>
          </TabPanel>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ═══════════════════════════════════════════════
   SUB-COMPONENTS
   ═══════════════════════════════════════════════ */

function TabPanel({ active, children }: { active: boolean; children: React.ReactNode }) {
  if (!active) return null;
  return (
    <div className="absolute inset-0 overflow-y-auto overscroll-contain">
      <div className="p-5 sm:p-6">{children}</div>
    </div>
  );
}

function SectionCard({ title, icon: Icon, children }: { title: string; icon: React.ElementType; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border overflow-hidden">
      <div className="bg-muted/30 px-4 py-2.5 border-b flex items-center gap-2.5">
        <Icon className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{title}</h3>
      </div>
      <div className="p-4 sm:p-5">{children}</div>
    </div>
  );
}

function InfoItem({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string | null | undefined }) {
  if (!value || value === "—") return null;
  return (
    <div className="flex items-start gap-2.5 py-2">
      <Icon className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="text-xs text-muted-foreground uppercase tracking-wider leading-none mb-1">{label}</p>
        <p className="text-sm font-medium break-words leading-snug">{value}</p>
      </div>
    </div>
  );
}

function TimelineEntry({ label, date, icon, subtitle }: { label: string; date?: string | null; icon: React.ReactNode; subtitle?: string }) {
  return (
    <div className="flex items-start gap-4 py-3 border-l-2 border-muted pl-5 ml-2 relative">
      <div className="absolute -left-[9px] top-3.5 shrink-0">{icon}</div>
      <div className="min-w-0 flex-1 ml-1">
        <p className="text-sm font-semibold leading-snug">{label}</p>
        {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
      </div>
      {date && (
        <span className="text-xs text-muted-foreground shrink-0 tabular-nums">
          {format(new Date(date), "MMM d, h:mm a")}
        </span>
      )}
    </div>
  );
}
