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
import { ScrollArea } from "@/components/ui/scroll-area";
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
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

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

const formatLabel = (value: string | null | undefined, fallback = "Not specified") => {
  if (!value) return fallback;
  return value.replace(/[_-]/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
};

const formatCoOccurring = (concerns: unknown) => {
  if (!concerns) return null;
  if (Array.isArray(concerns)) return concerns.map((c) => formatLabel(String(c))).join(", ");
  if (typeof concerns === "object") {
    const entries = Object.entries(concerns as Record<string, boolean>).filter(([, v]) => v);
    return entries.map(([k]) => formatLabel(k)).join(", ");
  }
  return String(concerns);
};

const formatAmenities = (amenities: unknown) => {
  if (!amenities) return null;
  if (Array.isArray(amenities)) return amenities.map((a) => formatLabel(String(a))).join(", ");
  if (typeof amenities === "object") {
    const entries = Object.entries(amenities as Record<string, boolean>).filter(([, v]) => v);
    return entries.map(([k]) => formatLabel(k)).join(", ");
  }
  return String(amenities);
};

const formatUrgency = (urgency: string | null | undefined) => {
  if (!urgency) return "Flexible";
  const labels: Record<string, string> = {
    immediate: "Immediate",
    within_week: "Within 1 Week",
    within_month: "Within 1 Month",
    flexible: "Flexible",
  };
  return labels[urgency] || formatLabel(urgency);
};

function StatusBadge({ status }: { status: string | undefined }) {
  const config: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; className?: string }> = {
    new: { label: "New", variant: "secondary" },
    reviewing: { label: "Under Review", variant: "outline", className: "border-blue-400 text-blue-700" },
    matching: { label: "Finding Facilities", variant: "outline", className: "border-purple-400 text-purple-700" },
    matched: { label: "Facilities Found", variant: "outline", className: "border-indigo-400 text-indigo-700" },
    introductions_sent: { label: "Introductions Sent", variant: "outline", className: "border-amber-400 text-amber-700" },
    in_contact: { label: "In Contact", variant: "outline", className: "border-emerald-400 text-emerald-700" },
    placed: { label: "Placed", variant: "default", className: "bg-emerald-500" },
    closed: { label: "Closed", variant: "secondary" },
  };
  const c = config[status || ""] || { label: formatLabel(status), variant: "secondary" as const };
  return <Badge variant={c.variant} className={c.className}>{c.label}</Badge>;
}

function DetailRow({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string | null | undefined }) {
  if (!value || value === "Not specified") return null;
  return (
    <div className="flex items-start gap-3 py-2">
      <Icon className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground uppercase tracking-wide">{label}</p>
        <p className="text-sm font-medium capitalize">{value}</p>
      </div>
    </div>
  );
}

export function PlacementDetailModal({
  introduction,
  open,
  onOpenChange,
  facilityId,
  onRespond,
  isResponding = false,
  hasPro = false,
}: PlacementDetailModalProps) {
  const [providerNote, setProviderNote] = useState("");
  const inquiry = introduction?.concierge_inquiries;
  const caseId = inquiry?.id?.slice(0, 8).toUpperCase() || introduction?.id.slice(0, 8).toUpperCase() || "";
  const firstName = inquiry?.user_name?.split(" ")[0] || "Client";
  const isPending = !introduction?.provider_response || introduction.provider_response === "pending";
  const isAccepted = introduction?.provider_response === "interested";
  const isDeclined = introduction?.provider_response === "not_available";
  const isPlaced = inquiry?.placement_confirmed === true && inquiry?.placed_facility_id === facilityId;

  // Fetch full inquiry data with additional fields
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

  // Fetch advisor messages for this case (thread tied to facility)
  const { data: messages, isLoading: messagesLoading } = useQuery({
    queryKey: ["placement-messages", introduction?.inquiry_id, facilityId],
    queryFn: async () => {
      if (!introduction?.inquiry_id) return [];
      // Find the thread for this facility + inquiry
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

  // Fetch case events timeline
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
  const coOccurringText = formatCoOccurring(inq?.co_occurring_concerns);
  const amenitiesText = formatAmenities(inq?.amenity_preferences);

  // Extract intake_data fields if present
  const intakeData = inq?.intake_data && typeof inq.intake_data === "object" ? (inq.intake_data as Record<string, unknown>) : null;

  const handleAccept = () => {
    onRespond?.("interested", providerNote.trim() || undefined);
  };

  const handleDecline = () => {
    onRespond?.("not_available", providerNote.trim() || undefined);
  };

  // Determine current step for the provider
  const getProviderStep = () => {
    if (isPlaced) return { step: 4, label: "Admission Confirmed", description: "This placement has been confirmed. Thank you!" };
    if (isDeclined) return { step: 0, label: "Declined", description: "You declined this candidate." };
    if (isAccepted) return { step: 3, label: "Awaiting Confirmation", description: "Our advisor is coordinating with the client. You'll be notified once admission is confirmed." };
    if (isPending) return { step: 2, label: "Your Review", description: "Review this candidate and decide whether to accept or decline." };
    return { step: 1, label: "Sent to You", description: "This case has been sent to your facility." };
  };
  const currentStep = getProviderStep();

  const steps = [
    { label: "Case Created", done: true },
    { label: "Matched & Sent", done: true },
    { label: "Your Review", done: !isPending },
    { label: "Advisor Coordination", done: isAccepted || isPlaced },
    { label: "Admission Confirmed", done: isPlaced },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] p-0 gap-0 overflow-hidden">
        {/* Header */}
        <DialogHeader className="p-5 pb-3 border-b bg-muted/30">
          <div className="flex items-start justify-between gap-3">
            <div>
              <DialogTitle className="text-lg font-bold flex items-center gap-2">
                Case #{caseId}
              </DialogTitle>
              <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1.5">
                <User className="h-3.5 w-3.5" />
                {firstName} · Received {introduction?.created_at && format(new Date(introduction.created_at), "MMM d, yyyy 'at' h:mm a")}
              </p>
            </div>
            <div className="flex flex-col items-end gap-1.5 shrink-0">
              <StatusBadge status={inq?.status} />
              {isPending && <Badge variant="destructive" className="text-[10px]">Action Required</Badge>}
              {isAccepted && !isPlaced && (
                <Badge variant="outline" className="border-amber-400 text-amber-700 text-[10px]">
                  <Hourglass className="h-3 w-3 mr-1" /> Awaiting Confirmation
                </Badge>
              )}
              {isPlaced && (
                <Badge className="bg-emerald-500 text-[10px]">
                  <CheckCircle2 className="h-3 w-3 mr-1" /> Placed
                </Badge>
              )}
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1 max-h-[calc(90vh-80px)]">
          <Tabs defaultValue="details" className="w-full">
            <div className="px-5 pt-3 border-b">
              <TabsList className="w-full grid grid-cols-3">
                <TabsTrigger value="details" className="text-xs">
                  <FileText className="h-3.5 w-3.5 mr-1.5" /> Details
                </TabsTrigger>
                <TabsTrigger value="messages" className="text-xs">
                  <MessageSquare className="h-3.5 w-3.5 mr-1.5" /> Messages
                  {messages && messages.length > 0 && (
                    <Badge variant="secondary" className="ml-1.5 text-[10px] h-4 px-1">{messages.length}</Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="timeline" className="text-xs">
                  <Clock className="h-3.5 w-3.5 mr-1.5" /> Timeline
                </TabsTrigger>
              </TabsList>
            </div>

            {/* === DETAILS TAB === */}
            <TabsContent value="details" className="p-5 space-y-5 mt-0">
              {/* Progress Steps */}
              <div className="bg-muted/30 rounded-lg p-4 border">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Placement Progress</p>
                <div className="flex items-center gap-1">
                  {steps.map((s, i) => (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1">
                      <div className={`h-2 w-full rounded-full ${s.done ? "bg-primary" : "bg-muted"}`} />
                      <span className={`text-[10px] text-center leading-tight ${s.done ? "text-foreground font-medium" : "text-muted-foreground"}`}>
                        {s.label}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground bg-background rounded-md px-3 py-2">
                  <ArrowRight className="h-3 w-3 shrink-0 text-primary" />
                  <span><strong className="text-foreground">Next:</strong> {currentStep.description}</span>
                </div>
              </div>

              {/* Client Profile */}
              <div className="border rounded-lg overflow-hidden">
                <div className="bg-muted/50 px-4 py-2.5 border-b">
                  <h3 className="font-semibold text-sm flex items-center gap-2">
                    <User className="h-4 w-4" /> Client Profile
                  </h3>
                </div>
                <div className="p-4 grid sm:grid-cols-2 gap-x-6">
                  <DetailRow icon={User} label="Name" value={firstName} />
                  <DetailRow icon={Calendar} label="Age Range" value={formatLabel(inq?.age_range)} />
                  <DetailRow icon={User} label="Gender" value={formatLabel(inq?.gender)} />
                  <DetailRow icon={MapPin} label="Location Preference" value={locationText} />
                  <DetailRow icon={MessageSquare} label="Preferred Language" value={formatLabel(inq?.preferred_language)} />
                  <DetailRow icon={MapPin} label="Environment Preference" value={formatLabel(inq?.preferred_environment)} />
                  <DetailRow icon={Activity} label="Current Living Situation" value={formatLabel(inq?.current_living_situation)} />
                  <DetailRow icon={Shield} label="Mobility Needs" value={formatLabel(inq?.mobility_needs)} />
                </div>
              </div>

              {/* Clinical Summary */}
              <div className="border rounded-lg overflow-hidden">
                <div className="bg-muted/50 px-4 py-2.5 border-b">
                  <h3 className="font-semibold text-sm flex items-center gap-2">
                    <Activity className="h-4 w-4" /> Clinical Summary
                  </h3>
                </div>
                <div className="p-4 grid sm:grid-cols-2 gap-x-6">
                  <DetailRow icon={Activity} label="Level of Care" value={formatLabel(inq?.level_of_care)} />
                  <DetailRow icon={Heart} label="Primary Concern" value={formatLabel(inq?.primary_concern)} />
                  <DetailRow icon={Pill} label="Detox Needed" value={formatLabel(inq?.detox_needed)} />
                  <DetailRow icon={Clock} label="Substance Use Duration" value={formatLabel(inq?.substance_use_duration)} />
                  <DetailRow icon={Clock} label="Use Frequency" value={formatLabel(inq?.substance_use_frequency)} />
                  <DetailRow icon={Activity} label="Assessment Preference" value={formatLabel(inq?.assessment_preference)} />
                  {inq?.prior_treatment_history && (
                    <DetailRow icon={FileText} label="Prior Treatment" value="Yes" />
                  )}
                  <DetailRow icon={FileText} label="Prior Treatment Notes" value={inq?.prior_treatment_notes} />
                  <DetailRow icon={Pill} label="Current Medications" value={inq?.current_medications} />
                  {coOccurringText && (
                    <div className="sm:col-span-2">
                      <DetailRow icon={Heart} label="Co-Occurring Concerns" value={coOccurringText} />
                    </div>
                  )}
                </div>
              </div>

              {/* Payment & Preferences */}
              <div className="border rounded-lg overflow-hidden">
                <div className="bg-muted/50 px-4 py-2.5 border-b">
                  <h3 className="font-semibold text-sm flex items-center gap-2">
                    <DollarSign className="h-4 w-4" /> Payment & Preferences
                  </h3>
                </div>
                <div className="p-4 grid sm:grid-cols-2 gap-x-6">
                  <DetailRow icon={DollarSign} label="Payment Type" value={formatLabel(inq?.payment_type)} />
                  <DetailRow icon={Shield} label="Insurance Carrier" value={inq?.insurance_carrier} />
                  <DetailRow icon={DollarSign} label="Budget Range" value={formatLabel(inq?.budget_range)} />
                  <DetailRow icon={Clock} label="Timeline" value={formatUrgency(inq?.timeline_urgency)} />
                  <DetailRow icon={Heart} label="Faith-Based Preference" value={formatLabel(inq?.faith_based_preference)} />
                  {inq?.holistic_interest && (
                    <DetailRow icon={Heart} label="Holistic Interest" value="Yes" />
                  )}
                  {amenitiesText && (
                    <div className="sm:col-span-2">
                      <DetailRow icon={FileText} label="Amenity Preferences" value={amenitiesText} />
                    </div>
                  )}
                </div>
              </div>

              {/* Additional intake data fields */}
              {intakeData && Object.keys(intakeData).length > 0 && (
                <div className="border rounded-lg overflow-hidden">
                  <div className="bg-muted/50 px-4 py-2.5 border-b">
                    <h3 className="font-semibold text-sm flex items-center gap-2">
                      <FileText className="h-4 w-4" /> Additional Intake Details
                    </h3>
                  </div>
                  <div className="p-4 grid sm:grid-cols-2 gap-x-6">
                    {Object.entries(intakeData)
                      .filter(([key]) => !["email", "phone", "user_email", "user_phone"].includes(key))
                      .filter(([, val]) => val !== null && val !== undefined && val !== "")
                      .slice(0, 20)
                      .map(([key, val]) => (
                        <DetailRow
                          key={key}
                          icon={FileText}
                          label={formatLabel(key)}
                          value={typeof val === "object" ? JSON.stringify(val) : String(val)}
                        />
                      ))}
                  </div>
                </div>
              )}

              {/* Client Notes */}
              {inq?.notes && (
                <div className="border rounded-lg overflow-hidden">
                  <div className="bg-muted/50 px-4 py-2.5 border-b">
                    <h3 className="font-semibold text-sm">Client Notes</h3>
                  </div>
                  <div className="p-4">
                    <p className="text-sm text-muted-foreground">{inq.notes}</p>
                  </div>
                </div>
              )}

              {/* Fee Notice */}
              <div className="bg-muted/50 rounded-lg p-3 text-sm flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                <p className="text-muted-foreground">
                  <strong className="text-foreground">Placement fee:</strong> {hasPro ? "$800" : "$1,000"} — only charged upon confirmed admission by RehabLookup.
                  {hasPro && <span className="text-emerald-600 ml-1">Pro discount applied</span>}
                </p>
              </div>

              {/* Action Buttons (for pending) */}
              {isPending && onRespond && (
                <div className="space-y-3 pt-2">
                  <Textarea
                    placeholder="Optional note to advisor (e.g., bed availability, special accommodations)..."
                    value={providerNote}
                    onChange={(e) => setProviderNote(e.target.value)}
                    className="text-sm"
                    rows={2}
                  />
                  <div className="flex gap-3">
                    <Button className="flex-1 gap-2" onClick={handleAccept} disabled={isResponding}>
                      {isResponding ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                      Accept Candidate
                    </Button>
                    <Button variant="outline" className="flex-1 gap-2" onClick={handleDecline} disabled={isResponding}>
                      {isResponding ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
                      Decline
                    </Button>
                  </div>
                </div>
              )}

              {/* Response summary for already responded */}
              {!isPending && (
                <div className={`rounded-lg p-4 border ${isPlaced ? "bg-emerald-50/50 border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-800" : isAccepted ? "bg-amber-50/50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-800" : "bg-muted/30"}`}>
                  <div className="flex items-center gap-2 mb-1">
                    {isPlaced ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : isAccepted ? <Hourglass className="h-4 w-4 text-amber-500" /> : <XCircle className="h-4 w-4 text-muted-foreground" />}
                    <span className="font-medium text-sm">
                      {isPlaced ? "Admission Confirmed" : isAccepted ? "Accepted — Awaiting Confirmation" : "Declined"}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {isPlaced
                      ? `Confirmed on ${inquiry?.placement_confirmed_at ? format(new Date(inquiry.placement_confirmed_at), "MMM d, yyyy") : "—"}`
                      : `Responded on ${introduction?.provider_responded_at ? format(new Date(introduction.provider_responded_at), "MMM d, yyyy 'at' h:mm a") : "—"}`}
                  </p>
                  {introduction?.provider_notes && (
                    <p className="text-xs text-muted-foreground mt-2 italic">Note: {introduction.provider_notes}</p>
                  )}
                </div>
              )}
            </TabsContent>

            {/* === MESSAGES TAB === */}
            <TabsContent value="messages" className="p-5 mt-0">
              {messagesLoading ? (
                <div className="space-y-3">
                  <Skeleton className="h-12 w-3/4" />
                  <Skeleton className="h-12 w-2/3 ml-auto" />
                  <Skeleton className="h-12 w-3/4" />
                </div>
              ) : messages && messages.length > 0 ? (
                <div className="space-y-3">
                  <p className="text-xs text-muted-foreground mb-3">Messages between you and the placement advisor for this case.</p>
                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex ${msg.sender_type === "provider" || msg.sender_type === "facility" ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                          msg.sender_type === "provider" || msg.sender_type === "facility"
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted"
                        }`}
                      >
                        <p className="text-[10px] opacity-70 mb-0.5 capitalize">{msg.sender_type === "admin" ? "Advisor" : "You"}</p>
                        <p>{msg.content}</p>
                        <p className="text-[10px] opacity-60 mt-1">{format(new Date(msg.created_at), "MMM d, h:mm a")}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-10">
                  <MessageSquare className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-40" />
                  <p className="text-sm text-muted-foreground">No messages yet</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Messages from the placement advisor will appear here once coordination begins.
                  </p>
                </div>
              )}
            </TabsContent>

            {/* === TIMELINE TAB === */}
            <TabsContent value="timeline" className="p-5 mt-0">
              <div className="space-y-0">
                {/* Built-in timeline from introduction data */}
                <TimelineItem
                  label="Case Sent to You"
                  date={introduction?.created_at}
                  icon={<Send className="h-3.5 w-3.5" />}
                />
                {introduction?.provider_responded_at && (
                  <TimelineItem
                    label={isAccepted ? "You Accepted" : "You Declined"}
                    date={introduction.provider_responded_at}
                    icon={isAccepted ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> : <XCircle className="h-3.5 w-3.5 text-muted-foreground" />}
                  />
                )}
                {inquiry?.placement_confirmed_at && isPlaced && (
                  <TimelineItem
                    label="Admission Confirmed"
                    date={inquiry.placement_confirmed_at}
                    icon={<CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />}
                  />
                )}

                {/* Case events from DB */}
                {caseEvents && caseEvents.length > 0 && (
                  <>
                    <Separator className="my-4" />
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Case Activity Log</p>
                    {caseEvents.map((ev) => (
                      <TimelineItem
                        key={ev.id}
                        label={formatLabel(ev.event_type)}
                        date={ev.created_at}
                        icon={<Activity className="h-3.5 w-3.5 text-muted-foreground" />}
                        subtitle={ev.actor_type ? `by ${formatLabel(ev.actor_type)}` : undefined}
                      />
                    ))}
                  </>
                )}

                {(!caseEvents || caseEvents.length === 0) && !introduction?.provider_responded_at && (
                  <div className="text-center py-8">
                    <Clock className="h-8 w-8 text-muted-foreground mx-auto mb-2 opacity-40" />
                    <p className="text-sm text-muted-foreground">Timeline will update as the case progresses.</p>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

function TimelineItem({ label, date, icon, subtitle }: { label: string; date?: string | null; icon: React.ReactNode; subtitle?: string }) {
  return (
    <div className="flex items-start gap-3 py-2">
      <div className="mt-0.5 shrink-0">{icon}</div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">{label}</p>
        {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
      </div>
      {date && (
        <span className="text-xs text-muted-foreground shrink-0">
          {format(new Date(date), "MMM d, h:mm a")}
        </span>
      )}
    </div>
  );
}
