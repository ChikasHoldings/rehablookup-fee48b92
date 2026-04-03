import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSeekerSession } from "@/hooks/useSeekerSession";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  FileText,
  Send,
  Search,
  Users,
  Sparkles,
} from "lucide-react";
import { AdvisorMessaging } from "./AdvisorMessaging";

interface SeekerPlacementModalProps {
  caseData: {
    id: string;
    status: string;
    created_at: string;
    user_name: string;
    level_of_care: string | null;
    payment_type: string | null;
    insurance_carrier: string | null;
    timeline_urgency: string | null;
    preferred_state: string | null;
    preferred_city: string | null;
    seeker_confirmed: boolean;
    placement_confirmed: boolean;
    placement_confirmed_at: string | null;
    placed_facility_id: string | null;
  } | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const formatLabel = (value: string | null | undefined, fallback = "Not specified") => {
  if (!value) return fallback;
  return value.replace(/[_-]/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
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

const TIMELINE_STEPS = [
  { key: "new", label: "Submitted", icon: Send },
  { key: "reviewing", label: "Review", icon: Search },
  { key: "matching", label: "Matching", icon: Users },
  { key: "introductions_sent", label: "Intros", icon: Send },
  { key: "in_contact", label: "Contact", icon: MessageSquare },
  { key: "placed", label: "Placed", icon: CheckCircle2 },
];

function DetailRow({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string | null | undefined }) {
  if (!value || value === "Not specified") return null;
  return (
    <div className="flex items-start gap-3 py-2">
      <Icon className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="text-xs text-muted-foreground uppercase tracking-wide">{label}</p>
        <p className="text-sm font-medium break-words">{value}</p>
      </div>
    </div>
  );
}

export function SeekerPlacementModal({ caseData, open, onOpenChange }: SeekerPlacementModalProps) {
  const { userId: currentUserId } = useSeekerSession();
  
  // Fetch full case data
  const { data: fullCase } = useQuery({
    queryKey: ["seeker-case-detail", caseData?.id],
    queryFn: async () => {
      if (!caseData?.id || !currentUserId) return null;

      const { data, error } = await supabase
        .from("concierge_inquiries")
        .select(`
          id, status, created_at, user_name, level_of_care, payment_type,
          insurance_carrier, timeline_urgency, preferred_state, preferred_city,
          age_range, gender, primary_concern, detox_needed, co_occurring_concerns,
          substance_use_duration, substance_use_frequency, budget_range,
          preferred_language, preferred_environment, faith_based_preference,
          holistic_interest, mobility_needs, current_living_situation,
          prior_treatment_history, prior_treatment_notes, current_medications,
          assessment_preference, amenity_preferences, notes,
          seeker_confirmed, placement_confirmed, placement_confirmed_at,
          placed_facility_id, matched_facility_ids, admin_matched_facility_ids,
          intake_submitted_at, matched_at, introductions_sent_at
        `)
        .eq("id", caseData.id)
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: open && !!caseData?.id,
    staleTime: 60000,
  });

  // Fetch case events
  const { data: caseEvents } = useQuery({
    queryKey: ["seeker-case-events", caseData?.id],
    queryFn: async () => {
      if (!caseData?.id) return [];
      const { data, error } = await supabase
        .from("concierge_case_events")
        .select("id, event_type, created_at, actor_type")
        .eq("inquiry_id", caseData.id)
        .order("created_at", { ascending: true })
        .limit(30);
      if (error) throw error;
      return data || [];
    },
    enabled: open && !!caseData?.id,
    staleTime: 60000,
  });

  // Fetch placed facility name
  const { data: placedFacility } = useQuery({
    queryKey: ["seeker-placed-facility", caseData?.placed_facility_id],
    queryFn: async () => {
      if (!caseData?.placed_facility_id) return null;
      const { data } = await supabase
        .from("facilities")
        .select("name, city, state")
        .eq("id", caseData.placed_facility_id)
        .maybeSingle();
      return data;
    },
    enabled: open && !!caseData?.placed_facility_id,
  });

  const inq = fullCase || caseData;
  if (!inq) return null;

  const locationText = [inq.preferred_city, inq.preferred_state].filter(Boolean).join(", ") || "Flexible";
  const isPlaced = inq.status === "placed";
  const isClosed = inq.status === "closed";

  const currentStepIndex = TIMELINE_STEPS.findIndex(s => s.key === inq.status);
  const effectiveIndex = ["matched", "introductions_sent"].includes(inq.status)
    ? TIMELINE_STEPS.findIndex(s => s.key === "introductions_sent")
    : inq.status === "in_contact"
      ? TIMELINE_STEPS.findIndex(s => s.key === "in_contact")
      : currentStepIndex;

  const formatCoOccurring = (concerns: unknown) => {
    if (!concerns) return null;
    if (Array.isArray(concerns)) return concerns.map((c) => formatLabel(String(c))).join(", ");
    if (typeof concerns === "object") {
      const entries = Object.entries(concerns as Record<string, boolean>).filter(([, v]) => v);
      return entries.map(([k]) => formatLabel(k)).join(", ");
    }
    return String(concerns);
  };

  const coOccurringText = fullCase ? formatCoOccurring(fullCase.co_occurring_concerns) : null;

  const getNextStepMessage = () => {
    switch (inq.status) {
      case "new": return "Your case has been submitted. An advisor will review it shortly.";
      case "reviewing": return "An advisor is reviewing your case and identifying the best options.";
      case "matching": return "We're matching you with treatment centers that fit your needs.";
      case "matched": return "Facilities have been identified. We're sending introductions on your behalf.";
      case "introductions_sent": return "Introductions have been sent. We're waiting for responses.";
      case "in_contact": return "Your advisor is coordinating with interested facilities.";
      case "placed": return "Congratulations! Your placement has been confirmed.";
      case "closed": return "This case has been closed.";
      default: return "Your case is being processed.";
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl w-[95vw] max-h-[90vh] sm:max-h-[85vh] p-0 gap-0 overflow-hidden flex flex-col">
        {/* Header */}
        <DialogHeader className="p-4 sm:p-5 pb-3 border-b bg-muted/30 flex-shrink-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <DialogTitle className="text-base sm:text-lg font-bold">
                Case #{inq.id.slice(0, 8).toUpperCase()}
              </DialogTitle>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                Submitted {format(new Date(inq.created_at), "MMM d, yyyy")}
              </p>
            </div>
            <div className="flex flex-col items-end gap-1 shrink-0">
              {isPlaced ? (
                <Badge variant="default">
                  <CheckCircle2 className="h-3 w-3 mr-1" /> Placed
                </Badge>
              ) : isClosed ? (
                <Badge variant="secondary">
                  <XCircle className="h-3 w-3 mr-1" /> Closed
                </Badge>
              ) : (
                <Badge variant="outline" className="border-primary text-primary">
                  <Clock className="h-3 w-3 mr-1" /> In Progress
                </Badge>
              )}
            </div>
          </div>
        </DialogHeader>

        {/* Tabs + Content */}
        <Tabs defaultValue="overview" className="flex-1 flex flex-col overflow-hidden">
          <div className="px-4 sm:px-5 pt-3 border-b flex-shrink-0">
            <TabsList className="w-full grid grid-cols-3">
              <TabsTrigger value="overview" className="text-xs gap-1">
                <Activity className="h-3.5 w-3.5" />
                <span className="hidden xs:inline">Overview</span>
              </TabsTrigger>
              <TabsTrigger value="details" className="text-xs gap-1">
                <FileText className="h-3.5 w-3.5" />
                <span className="hidden xs:inline">Details</span>
              </TabsTrigger>
              <TabsTrigger value="advisor" className="text-xs gap-1">
                <MessageSquare className="h-3.5 w-3.5" />
                <span className="hidden xs:inline">Advisor</span>
              </TabsTrigger>
            </TabsList>
          </div>

          <ScrollArea className="flex-1">
            {/* === OVERVIEW TAB === */}
            <TabsContent value="overview" className="p-4 sm:p-5 space-y-4 mt-0">
              {/* Progress Steps */}
              <div className="bg-muted/30 rounded-lg p-3 sm:p-4 border">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Placement Progress</p>
                <div className="flex items-center gap-1">
                  {TIMELINE_STEPS.map((s, i) => {
                    const done = i <= effectiveIndex && !isClosed;
                    return (
                      <div key={s.key} className="flex-1 flex flex-col items-center gap-1">
                        <div className={`h-2 w-full rounded-full transition-colors ${done ? "bg-primary" : "bg-muted"}`} />
                        <span className={`text-[9px] sm:text-[10px] text-center leading-tight ${done ? "text-foreground font-medium" : "text-muted-foreground"}`}>
                          {s.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
                <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground bg-background rounded-md px-3 py-2">
                  <ArrowRight className="h-3 w-3 shrink-0 text-primary" />
                  <span>{getNextStepMessage()}</span>
                </div>
              </div>

              {/* Placed Facility */}
              {isPlaced && placedFacility && (
                <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="h-4 w-4 text-primary" />
                    <span className="font-semibold text-sm">Your Treatment Center</span>
                  </div>
                  <p className="text-sm font-medium">{placedFacility.name}</p>
                  <p className="text-xs text-muted-foreground">{placedFacility.city}, {placedFacility.state}</p>
                  {caseData?.placement_confirmed_at && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Confirmed {format(new Date(caseData.placement_confirmed_at), "MMM d, yyyy")}
                    </p>
                  )}
                </div>
              )}

              {/* Quick Summary */}
              <div className="border rounded-lg overflow-hidden">
                <div className="bg-muted/50 px-4 py-2.5 border-b">
                  <h3 className="font-semibold text-sm">Case Summary</h3>
                </div>
                <div className="p-3 sm:p-4 grid sm:grid-cols-2 gap-x-6">
                  <DetailRow icon={Activity} label="Level of Care" value={formatLabel(inq.level_of_care)} />
                  <DetailRow icon={DollarSign} label="Payment" value={formatLabel(inq.payment_type)} />
                  <DetailRow icon={Shield} label="Insurance" value={inq.insurance_carrier} />
                  <DetailRow icon={Clock} label="Timeline" value={formatUrgency(inq.timeline_urgency)} />
                  <DetailRow icon={MapPin} label="Location" value={locationText} />
                </div>
              </div>

              {/* Timeline */}
              {caseEvents && caseEvents.length > 0 && (
                <div className="border rounded-lg overflow-hidden">
                  <div className="bg-muted/50 px-4 py-2.5 border-b">
                    <h3 className="font-semibold text-sm flex items-center gap-2">
                      <Clock className="h-4 w-4" /> Activity Timeline
                    </h3>
                  </div>
                  <div className="p-3 sm:p-4 space-y-0">
                    {caseEvents.map((ev) => (
                      <div key={ev.id} className="flex items-start gap-3 py-2">
                        <Activity className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium capitalize">
                            {ev.event_type.replace(/_/g, " ")}
                          </p>
                        </div>
                        <span className="text-xs text-muted-foreground shrink-0">
                          {format(new Date(ev.created_at), "MMM d, h:mm a")}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </TabsContent>

            {/* === DETAILS TAB === */}
            <TabsContent value="details" className="p-4 sm:p-5 space-y-4 mt-0">
              {fullCase ? (
                <>
                  {/* Clinical */}
                  <div className="border rounded-lg overflow-hidden">
                    <div className="bg-muted/50 px-4 py-2.5 border-b">
                      <h3 className="font-semibold text-sm flex items-center gap-2">
                        <Activity className="h-4 w-4" /> Clinical Details
                      </h3>
                    </div>
                    <div className="p-3 sm:p-4 grid sm:grid-cols-2 gap-x-6">
                      <DetailRow icon={Activity} label="Level of Care" value={formatLabel(fullCase.level_of_care)} />
                      <DetailRow icon={Heart} label="Primary Concern" value={formatLabel(fullCase.primary_concern)} />
                      <DetailRow icon={Pill} label="Detox Needed" value={formatLabel(fullCase.detox_needed)} />
                      <DetailRow icon={Clock} label="Use Duration" value={formatLabel(fullCase.substance_use_duration)} />
                      <DetailRow icon={Clock} label="Use Frequency" value={formatLabel(fullCase.substance_use_frequency)} />
                      <DetailRow icon={Activity} label="Assessment" value={formatLabel(fullCase.assessment_preference)} />
                      {fullCase.prior_treatment_history && (
                        <DetailRow icon={FileText} label="Prior Treatment" value="Yes" />
                      )}
                      <DetailRow icon={FileText} label="Treatment Notes" value={fullCase.prior_treatment_notes} />
                      <DetailRow icon={Pill} label="Medications" value={fullCase.current_medications} />
                      {coOccurringText && (
                        <div className="sm:col-span-2">
                          <DetailRow icon={Heart} label="Co-Occurring Concerns" value={coOccurringText} />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Demographics */}
                  <div className="border rounded-lg overflow-hidden">
                    <div className="bg-muted/50 px-4 py-2.5 border-b">
                      <h3 className="font-semibold text-sm flex items-center gap-2">
                        <User className="h-4 w-4" /> Profile
                      </h3>
                    </div>
                    <div className="p-3 sm:p-4 grid sm:grid-cols-2 gap-x-6">
                      <DetailRow icon={Calendar} label="Age Range" value={formatLabel(fullCase.age_range)} />
                      <DetailRow icon={User} label="Gender" value={formatLabel(fullCase.gender)} />
                      <DetailRow icon={MessageSquare} label="Language" value={formatLabel(fullCase.preferred_language)} />
                      <DetailRow icon={MapPin} label="Location" value={locationText} />
                      <DetailRow icon={MapPin} label="Environment" value={formatLabel(fullCase.preferred_environment)} />
                      <DetailRow icon={Shield} label="Mobility Needs" value={formatLabel(fullCase.mobility_needs)} />
                      <DetailRow icon={Activity} label="Living Situation" value={formatLabel(fullCase.current_living_situation)} />
                    </div>
                  </div>

                  {/* Payment & Preferences */}
                  <div className="border rounded-lg overflow-hidden">
                    <div className="bg-muted/50 px-4 py-2.5 border-b">
                      <h3 className="font-semibold text-sm flex items-center gap-2">
                        <DollarSign className="h-4 w-4" /> Payment & Preferences
                      </h3>
                    </div>
                    <div className="p-3 sm:p-4 grid sm:grid-cols-2 gap-x-6">
                      <DetailRow icon={DollarSign} label="Payment Type" value={formatLabel(fullCase.payment_type)} />
                      <DetailRow icon={Shield} label="Insurance" value={fullCase.insurance_carrier} />
                      <DetailRow icon={DollarSign} label="Budget Range" value={formatLabel(fullCase.budget_range)} />
                      <DetailRow icon={Clock} label="Timeline" value={formatUrgency(fullCase.timeline_urgency)} />
                      <DetailRow icon={Heart} label="Faith-Based" value={formatLabel(fullCase.faith_based_preference)} />
                      {fullCase.holistic_interest && (
                        <DetailRow icon={Heart} label="Holistic Interest" value="Yes" />
                      )}
                    </div>
                  </div>

                  {/* Notes */}
                  {fullCase.notes && (
                    <div className="border rounded-lg overflow-hidden">
                      <div className="bg-muted/50 px-4 py-2.5 border-b">
                        <h3 className="font-semibold text-sm">Your Notes</h3>
                      </div>
                      <div className="p-3 sm:p-4">
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap">{fullCase.notes}</p>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="space-y-3">
                  <Skeleton className="h-40 w-full" />
                  <Skeleton className="h-40 w-full" />
                </div>
              )}
            </TabsContent>

            {/* === ADVISOR TAB === */}
            <TabsContent value="advisor" className="p-4 sm:p-5 mt-0">
              {caseData?.id ? (
                <AdvisorMessaging inquiryId={caseData.id} />
              ) : (
                <div className="text-center py-10 text-muted-foreground">
                  <MessageSquare className="h-10 w-10 mx-auto mb-3 opacity-40" />
                  <p className="text-sm">No case selected</p>
                </div>
              )}
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
