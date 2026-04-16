import { useState, useRef, useEffect } from "react";
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
  Lock,
  Eye,
} from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useSelectedFacilityOptional } from "@/contexts/SelectedFacilityContext";
import { useMatchScore, MatchScoreBadge } from "./MatchScoreUtils";

// ── PII-safe field lists ───────────────────────────────

/** Fields that are NEVER shown to providers before acceptance */
const PII_FIELDS = new Set([
  "user_name", "user_email", "user_phone", "email", "phone",
  "emergency_contact_name", "emergency_contact_phone",
  "decision_maker_name", "decision_maker_phone",
  "alternative_contact_name", "alternative_contact_phone",
  "employer_name", "insurance_member_id", "insurance_group_number",
]);

/** Fields safe to show in anonymized pre-qual view */
const SAFE_CLINICAL_FIELDS = new Set([
  "level_of_care", "primary_concern", "detox_needed",
  "co_occurring_concerns", "substance_use_duration",
  "substance_use_frequency", "prior_treatment_history",
  "assessment_preference", "current_medications",
  "current_living_situation", "mobility_needs",
]);

const SAFE_PREFERENCE_FIELDS = new Set([
  "payment_type", "insurance_carrier", "budget_range",
  "timeline_urgency", "preferred_state", "preferred_city",
  "preferred_environment", "preferred_language",
  "faith_based_preference", "holistic_interest",
  "amenity_preferences", "age_range", "gender",
]);

// ── Types ──────────────────────────────────────────────

interface ConciergeInquiry {
  id: string;
  user_name?: string;
  user_email?: string;
  user_phone?: string;
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
  insurance_member_id?: string | null;
  insurance_group_number?: string | null;
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
  emergency_contact_name?: string | null;
  emergency_contact_phone?: string | null;
  decision_maker_name?: string | null;
  decision_maker_phone?: string | null;
  relationship_to_seeker?: string | null;
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
  admin_disclosed_pii_at?: string | null;
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
  const [activeTab, setActiveTab] = useState<"details" | "seeker" | "messages" | "timeline">("details");
  const [providerNote, setProviderNote] = useState("");
  const inquiry = introduction?.concierge_inquiries;
  const { selectedFacility } = useSelectedFacilityOptional();
  const matchScore = useMatchScore(selectedFacility, inquiry);

  const caseId = inquiry?.id?.slice(0, 8).toUpperCase() || introduction?.id.slice(0, 8).toUpperCase() || "";
  const isPending = !introduction?.provider_response || introduction.provider_response === "pending";
  const isAccepted = introduction?.provider_response === "interested";
  const isDeclined = introduction?.provider_response === "not_available";
  const isPlaced = inquiry?.placement_confirmed === true && inquiry?.placed_facility_id === facilityId;

   // PII disclosure gate: provider accepted AND (client selected this facility OR admin disclosed PII)
  const seekerSelectedThisFacility = inquiry?.seeker_confirmed === true && inquiry?.placed_facility_id === facilityId;
  const adminDisclosed = !!introduction?.admin_disclosed_pii_at;
  const piiUnlocked = isAccepted && (seekerSelectedThisFacility || adminDisclosed);

  // ── PII gate: show full name only when PII is unlocked ──
  const hasAccepted = isAccepted || isPlaced;
  const displayName = piiUnlocked ? (inquiry?.user_name || "Client") : hasAccepted ? (inquiry?.user_name?.split(" ")[0] || "Client") : "Anonymized Client";

  // Fetch full inquiry details (only clinical/preference data)
  const { data: fullInquiry } = useQuery({
    queryKey: ["placement-detail", introduction?.inquiry_id],
    queryFn: async () => {
      if (!introduction?.inquiry_id) return null;
      const { data, error } = await supabase
        .from("concierge_inquiries")
        .select(`
          id, level_of_care, payment_type, timeline_urgency, preferred_state,
          preferred_city, status, age_range, gender, primary_concern, insurance_carrier,
          detox_needed, co_occurring_concerns, substance_use_duration, budget_range,
          seeker_confirmed, seeker_confirmed_at, placement_confirmed, placement_confirmed_at,
          placed_facility_id, preferred_language, preferred_environment,
          faith_based_preference, holistic_interest, mobility_needs, substance_use_frequency,
          prior_treatment_history, prior_treatment_notes, current_medications,
          current_living_situation, assessment_preference, amenity_preferences, created_at
        `)
        .eq("id", introduction.inquiry_id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: open && !!introduction?.inquiry_id,
    staleTime: 60000,
  });

  // ── PII Query: only fetch client contact details when PII is unlocked ──
  const piiDisclosureLogged = useRef(false);
  const { data: seekerPii } = useQuery({
    queryKey: ["placement-pii", introduction?.inquiry_id, facilityId],
    queryFn: async () => {
      if (!introduction?.inquiry_id) return null;
      const { data, error } = await supabase
        .from("concierge_inquiries")
        .select(`
          user_name, user_email, user_phone, insurance_carrier,
          insurance_member_id, insurance_group_number,
          emergency_contact_name, emergency_contact_phone,
          decision_maker_name, decision_maker_phone,
          relationship_to_seeker, level_of_care, primary_concern,
          detox_needed, co_occurring_concerns, substance_use_duration,
          substance_use_frequency, prior_treatment_history, prior_treatment_notes,
          current_medications, current_living_situation, budget_range,
          timeline_urgency, notes
        `)
        .eq("id", introduction.inquiry_id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: open && !!introduction?.inquiry_id && piiUnlocked,
    staleTime: 60000,
  });

  // Log PII disclosure event once per modal open
  useEffect(() => {
    if (!piiUnlocked || !seekerPii || piiDisclosureLogged.current || !introduction?.inquiry_id) return;
    piiDisclosureLogged.current = true;

    const logDisclosure = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        // Update introduction disclosure timestamp
        await supabase
          .from("concierge_introductions")
          .update({ admin_disclosed_pii_at: new Date().toISOString() })
          .eq("id", introduction.id)
          .is("admin_disclosed_pii_at", null); // Only set once

        // Log case event
        await supabase.from("concierge_case_events").insert({
          inquiry_id: introduction.inquiry_id,
          event_type: "pii_disclosed_to_provider",
          event_data: {
            facility_id: facilityId,
            introduction_id: introduction.id,
            disclosed_fields: ["name", "email", "phone", "insurance_details", "emergency_contacts"],
          },
          actor_id: user?.id || null,
          actor_type: "provider",
        });
      } catch (e) {
        console.error("Failed to log PII disclosure:", e);
      }
    };
    logDisclosure();
  }, [piiUnlocked, seekerPii, introduction?.inquiry_id, introduction?.id, facilityId]);

  // Reset disclosure flag when modal closes
  useEffect(() => {
    if (!open) piiDisclosureLogged.current = false;
  }, [open]);

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
    enabled: open && !!introduction?.inquiry_id && hasAccepted,
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
    enabled: open && !!introduction?.inquiry_id && hasAccepted,
    staleTime: 60000,
  });

  const inq = fullInquiry || inquiry;
  const locationText = [inq?.preferred_city, inq?.preferred_state].filter(Boolean).join(", ") || "Flexible";
  const coOccurringText = fmtCoOccurring(inq?.co_occurring_concerns);
  const amenitiesText = fmtAmenities(inq?.amenity_preferences);
  const urgencyConf = URGENCY_MAP[inq?.timeline_urgency || ""] || URGENCY_MAP.flexible;

  const steps = isPending
    ? [
        { label: "Sent", done: true },
        { label: "Your Review", done: false, current: true },
        { label: "Coordinating", done: false },
        { label: "Confirmed", done: false },
      ]
    : [
        { label: "Sent", done: true },
        { label: isAccepted ? "Accepted" : "Declined", done: true },
        { label: "Coordinating", done: isAccepted || isPlaced },
        { label: "Confirmed", done: isPlaced },
      ];

  const nextStepText = isPlaced
    ? "Admission confirmed — thank you!"
    : isDeclined
    ? "You declined this candidate."
    : isAccepted
    ? "Our advisor is coordinating with the client."
    : "Review this anonymized case and decide if it's a fit.";

  const tabs = [
    { key: "details" as const, label: "Case Summary", icon: FileText },
    ...(piiUnlocked ? [
      { key: "seeker" as const, label: "Client Details", icon: Eye },
    ] : []),
    ...(hasAccepted ? [
      { key: "messages" as const, label: "Messages", icon: MessageSquare, count: messages?.length },
      { key: "timeline" as const, label: "Timeline", icon: Clock },
    ] : []),
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl w-[95vw] p-0 gap-0 overflow-hidden flex flex-col h-[85vh] sm:h-[80vh] [&>button]:top-4 [&>button]:right-4 [&>button]:z-[60]">

        {/* ─── Header ─── */}
        <DialogHeader className="px-6 pt-5 pb-4 border-b bg-muted/20 flex-shrink-0">
          <div className="flex items-start justify-between gap-4 pr-8">
            <div className="min-w-0">
              <DialogTitle className="text-lg font-bold tracking-tight flex items-center gap-2.5">
                <Lock className="h-4 w-4 text-muted-foreground" />
                Case #{caseId}
              </DialogTitle>
              <div className="flex items-center gap-3 mt-1.5 text-sm text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5" />
                  {displayName}
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
              {isDeclined && (
                <Badge variant="secondary" className="text-xs h-6 gap-1">
                  <XCircle className="h-3 w-3" /> Declined
                </Badge>
              )}
            </div>
          </div>
        </DialogHeader>

        {/* ─── Match Score ─── */}
        <div className="px-6 pb-2 flex-shrink-0">
          <MatchScoreBadge score={matchScore} size="large" />
        </div>

        {/* ─── Privacy Notice (pre-acceptance) ─── */}
        {isPending && (
          <div className="mx-6 mb-2 rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 flex items-start gap-3 flex-shrink-0">
            <Shield className="h-4 w-4 text-primary mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-foreground">Anonymized Case Preview</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Personal details are hidden until you accept. Review clinical needs and preferences below.
              </p>
            </div>
          </div>
        )}

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
              {"count" in tab && (tab as any).count !== undefined && (tab as any).count > 0 && (
                <span className="bg-primary/10 text-primary rounded-full text-xs font-bold h-5 min-w-[20px] px-1.5 flex items-center justify-center">
                  {(tab as any).count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ─── Tab Content ─── */}
        <div className="flex-1 min-h-0 relative">

          {/* === CASE SUMMARY (Details) === */}
          <TabPanel active={activeTab === "details"}>
            <div className="space-y-5">
              {/* Progress stepper */}
              <div className="rounded-xl border bg-muted/20 p-4">
                <div className="flex gap-1.5 mb-3">
                  {steps.map((s, i) => (
                    <div key={i} className="flex-1">
                      <div className={cn(
                        "h-2 rounded-full transition-colors",
                        s.done ? "bg-primary" : ("current" in s && s.current) ? "bg-primary/40 animate-pulse" : "bg-muted"
                      )} />
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

              {/* Client Profile (anonymized before acceptance) */}
              <SectionCard title="Client Profile" icon={User}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-1">
                  <InfoItem icon={User} label="Name" value={displayName} />
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

              {/* ─── Accept / Decline Actions (pre-acceptance) ─── */}
              {isPending && onRespond && (
                <div className="rounded-xl border-2 border-primary/20 bg-primary/5 p-5 space-y-4">
                  <div className="flex items-center gap-2.5">
                    <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Shield className="h-4.5 w-4.5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-foreground">Is this a fit for your facility?</p>
                      <p className="text-xs text-muted-foreground">Accepting does not commit you — it allows our advisor to begin coordination.</p>
                    </div>
                  </div>
                  <Textarea
                    placeholder="Optional note to our placement advisor..."
                    value={providerNote}
                    onChange={(e) => setProviderNote(e.target.value)}
                    className="text-sm resize-none rounded-xl bg-background"
                    rows={2}
                  />
                  <div className="flex gap-3">
                    <Button
                      className="flex-1 gap-2 h-12 text-sm font-bold"
                      onClick={() => onRespond("interested", providerNote.trim() || undefined)}
                      disabled={isResponding}
                    >
                      {isResponding ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                      Accept Case
                    </Button>
                    <Button
                      variant="outline"
                      className="flex-1 gap-2 h-12 text-sm font-bold"
                      onClick={() => onRespond("not_available", providerNote.trim() || undefined)}
                      disabled={isResponding}
                    >
                      {isResponding ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
                      Decline
                    </Button>
                  </div>
                </div>
              )}

              {/* Response summary (post-response) */}
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
                      {isPlaced ? "Admission Confirmed" : isAccepted ? "Accepted — Advisor Coordinating" : "Declined"}
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

          {/* === CLIENT DETAILS (only after provider accepted + client selected) === */}
          <TabPanel active={activeTab === "seeker"}>
            {!piiUnlocked ? (
              <LockedSection message="Full client details are released after you accept the case and the placement advisor authorizes disclosure." />
            ) : !seekerPii ? (
              <div className="space-y-4">
                <Skeleton className="h-14 w-full rounded-xl" />
                <Skeleton className="h-14 w-full rounded-xl" />
              </div>
            ) : (
              <div className="space-y-5">
                {/* Disclosure notice */}
                <div className="rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/30 px-4 py-3 flex items-start gap-3">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-400">
                      {seekerSelectedThisFacility ? "Client Selected Your Facility" : "PII Authorized by Advisor"}
                    </p>
                    <p className="text-xs text-emerald-700 dark:text-emerald-500 mt-0.5">
                      Full contact and intake details are now available. This disclosure has been logged for compliance.
                    </p>
                  </div>
                </div>

                {/* Contact Information */}
                <SectionCard title="Contact Information" icon={User}>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-1">
                    <InfoItem icon={User} label="Full Name" value={seekerPii.user_name} />
                    <InfoItem icon={MessageSquare} label="Email" value={seekerPii.user_email} />
                    <InfoItem icon={Clock} label="Phone" value={seekerPii.user_phone} />
                    <InfoItem icon={User} label="Relationship" value={fmt(seekerPii.relationship_to_seeker)} />
                  </div>
                </SectionCard>

                {/* Emergency & Decision Maker */}
                {(seekerPii.emergency_contact_name || seekerPii.decision_maker_name) && (
                  <SectionCard title="Emergency & Decision Maker" icon={Shield}>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-1">
                      <InfoItem icon={User} label="Emergency Contact" value={seekerPii.emergency_contact_name} />
                      <InfoItem icon={Clock} label="Emergency Phone" value={seekerPii.emergency_contact_phone} />
                      <InfoItem icon={User} label="Decision Maker" value={seekerPii.decision_maker_name} />
                      <InfoItem icon={Clock} label="Decision Maker Phone" value={seekerPii.decision_maker_phone} />
                    </div>
                  </SectionCard>
                )}

                {/* Insurance Details */}
                <SectionCard title="Insurance Details" icon={Shield}>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-1">
                    <InfoItem icon={Shield} label="Carrier" value={seekerPii.insurance_carrier} />
                    <InfoItem icon={FileText} label="Member ID" value={seekerPii.insurance_member_id} />
                    <InfoItem icon={FileText} label="Group Number" value={seekerPii.insurance_group_number} />
                    <InfoItem icon={DollarSign} label="Budget" value={fmt(seekerPii.budget_range)} />
                  </div>
                </SectionCard>

                {/* Intake Summary */}
                <SectionCard title="Intake Summary" icon={Activity}>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-1">
                    <InfoItem icon={Activity} label="Level of Care" value={fmt(seekerPii.level_of_care)} />
                    <InfoItem icon={Heart} label="Primary Concern" value={fmt(seekerPii.primary_concern)} />
                    <InfoItem icon={Pill} label="Detox Needed" value={fmt(seekerPii.detox_needed)} />
                    <InfoItem icon={Clock} label="Use Duration" value={fmt(seekerPii.substance_use_duration)} />
                    <InfoItem icon={Clock} label="Frequency" value={fmt(seekerPii.substance_use_frequency)} />
                    <InfoItem icon={Activity} label="Living Situation" value={fmt(seekerPii.current_living_situation)} />
                    <InfoItem icon={Pill} label="Medications" value={seekerPii.current_medications} />
                    {seekerPii.prior_treatment_history && <InfoItem icon={FileText} label="Prior Treatment" value="Yes" />}
                    <InfoItem icon={FileText} label="Prior Treatment Notes" value={seekerPii.prior_treatment_notes} />
                  </div>
                  {seekerPii.co_occurring_concerns && (
                    <div className="mt-2 pt-2 border-t">
                      <InfoItem icon={Heart} label="Co-Occurring" value={fmtCoOccurring(seekerPii.co_occurring_concerns)} />
                    </div>
                  )}
                </SectionCard>

                {/* Admin / Advisor Notes */}
                {seekerPii.notes && (
                  <SectionCard title="Advisor Notes" icon={FileText}>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">{seekerPii.notes}</p>
                  </SectionCard>
                )}
              </div>
            )}
          </TabPanel>

          {/* === MESSAGES (only after acceptance) === */}
          <TabPanel active={activeTab === "messages"}>
            {!hasAccepted ? (
              <LockedSection message="Accept this case to access messaging with your placement advisor." />
            ) : messagesLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-14 w-3/4 rounded-xl" />
                <Skeleton className="h-14 w-2/3 ml-auto rounded-xl" />
              </div>
            ) : (
              <div className="flex flex-col h-full">
                {messages && messages.length > 0 ? (
                  <div className="space-y-3 mb-4">
                    <p className="text-sm text-muted-foreground mb-4">Messages between you and the placement advisor.</p>
                    {messages.map((msg) => {
                      const isYou = msg.sender_type === "provider" || msg.sender_type === "facility";
                      return (
                        <div key={msg.id} className={cn("flex", isYou ? "justify-end" : "justify-start")}>
                          <div className={cn(
                            "max-w-[80%] rounded-2xl px-4 py-3 text-sm",
                            isYou ? "bg-primary text-primary-foreground rounded-br-md" : "bg-muted rounded-bl-md"
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
                  <div className="flex flex-col items-center justify-center py-12 text-center mb-4">
                    <div className="h-14 w-14 rounded-full bg-muted flex items-center justify-center mb-4">
                      <MessageSquare className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <p className="text-sm font-semibold text-foreground">No messages yet</p>
                    <p className="text-sm text-muted-foreground mt-1 max-w-xs">
                      Send a message to your placement advisor below.
                    </p>
                  </div>
                )}
                {/* Message send input */}
                <ProviderMessageInput
                  inquiryId={introduction?.inquiry_id || ""}
                  facilityId={facilityId}
                />
              </div>
            )}
          </TabPanel>

          {/* === TIMELINE (only after acceptance) === */}
          <TabPanel active={activeTab === "timeline"}>
            {!hasAccepted ? (
              <LockedSection message="Accept this case to view the full timeline." />
            ) : (
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
              </div>
            )}
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

function LockedSection({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="h-14 w-14 rounded-full bg-muted flex items-center justify-center mb-4">
        <Lock className="h-6 w-6 text-muted-foreground" />
      </div>
      <p className="text-sm font-semibold text-foreground">Locked</p>
      <p className="text-sm text-muted-foreground mt-1 max-w-xs">{message}</p>
    </div>
  );
}
