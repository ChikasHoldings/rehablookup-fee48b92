import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSelectedFacility } from "@/contexts/SelectedFacilityContext";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  MapPin,
  Clock,
  Users,
  UserCheck,
  Bell,
  CheckCircle,
  XCircle,
  AlertCircle,
  Hourglass,
  ChevronRight,
  ChevronDown,
  Info,
  DollarSign,
  Sparkles,
  Loader2,
} from "lucide-react";
import { IntroductionCard } from "./IntroductionCard";
import { PlacementDetailModal } from "./PlacementDetailModal";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

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

interface DomesticCandidatesTabProps {
  hasPro?: boolean;
}

const URGENCY_CONFIG: Record<string, { label: string; className: string }> = {
  immediate: { label: "Immediate", className: "bg-destructive/10 text-destructive border-destructive/20" },
  within_week: { label: "Within Week", className: "bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/20" },
  within_month: { label: "Within Month", className: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20" },
  flexible: { label: "Flexible", className: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20" },
};

export function DomesticCandidatesTab({ hasPro = false }: DomesticCandidatesTabProps) {
  const queryClient = useQueryClient();
  const { selectedFacility } = useSelectedFacility();
  const [selectedIntro, setSelectedIntro] = useState<Introduction | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [feeInfoOpen, setFeeInfoOpen] = useState(false);

  const { data: introductions, isLoading, error, refetch } = useQuery({
    queryKey: ["placement-introductions", selectedFacility?.id],
    queryFn: async () => {
      if (!selectedFacility?.id) return [];
      const { data, error } = await supabase
        .from("concierge_introductions")
        .select(`
          id, facility_id, inquiry_id, created_at,
          provider_response, provider_responded_at, provider_notes,
          concierge_inquiries (
            id, user_name, level_of_care, payment_type, timeline_urgency, preferred_state,
            preferred_city, status, age_range, gender, primary_concern, insurance_carrier,
            detox_needed, co_occurring_concerns, substance_use_duration, budget_range,
            seeker_confirmed, seeker_confirmed_at, placement_confirmed, placement_confirmed_at, placed_facility_id
          )
        `)
        .eq("facility_id", selectedFacility.id)
        .order("created_at", { ascending: false });
      if (error) throw new Error(`Failed to load introductions: ${error.message}`);
      return (data || []) as Introduction[];
    },
    enabled: !!selectedFacility?.id,
    staleTime: 30000,
    retry: 2,
  });

  useEffect(() => {
    if (!selectedFacility?.id) return;
    const channel = supabase
      .channel(`provider-intros-${selectedFacility.id}`)
      .on("postgres_changes", {
        event: "*", schema: "public", table: "concierge_introductions",
        filter: `facility_id=eq.${selectedFacility.id}`,
      }, () => {
        queryClient.invalidateQueries({ queryKey: ["placement-introductions", selectedFacility.id] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [selectedFacility?.id, queryClient]);

  const respondMutation = useMutation({
    mutationFn: async ({ id, response, notes }: { id: string; response: string; notes?: string }) => {
      if (!id || typeof id !== "string") throw new Error("Invalid introduction ID");
      if (!["interested", "not_available"].includes(response)) throw new Error("Invalid response value");

      const { data: current } = await supabase
        .from("concierge_introductions")
        .select("provider_response, concierge_inquiries(status)")
        .eq("id", id)
        .eq("facility_id", selectedFacility?.id)
        .maybeSingle();

      if (current?.provider_response && current.provider_response !== "pending") {
        throw new Error("You've already responded to this candidate");
      }
      const caseStatus = (current?.concierge_inquiries as any)?.status;
      if (caseStatus === "closed" || caseStatus === "placed") {
        throw new Error("This case is no longer active");
      }

      const { error } = await supabase
        .from("concierge_introductions")
        .update({
          provider_response: response,
          provider_responded_at: new Date().toISOString(),
          provider_notes: notes?.trim() || null,
        })
        .eq("id", id)
        .eq("facility_id", selectedFacility?.id);
      if (error) throw new Error(`Failed to submit response: ${error.message}`);

      const intro = introductions?.find((i) => i.id === id);
      const inquiryId = intro?.inquiry_id;

      if (inquiryId && response === "interested") {
        try {
          await supabase.functions.invoke("auto-status-transition", {
            body: { inquiryId, trigger: "provider_interested", actorType: "provider" },
          });
        } catch (e) { console.error("[DomesticCandidatesTab] Status transition error:", e); }
        try {
          await supabase.functions.invoke("send-concierge-notifications", {
            body: { type: "provider_interested", inquiryId, facilityId: selectedFacility?.id },
          });
        } catch (e) { console.error("[DomesticCandidatesTab] Notification error:", e); }
      }

      if (inquiryId && response === "not_available") {
        try {
          await supabase.functions.invoke("send-concierge-notifications", {
            body: { type: "provider_declined", inquiryId, facilityId: selectedFacility?.id },
          });
        } catch (e) { console.error("[DomesticCandidatesTab] Decline notification error:", e); }
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["placement-introductions"] });
      toast.success(`Candidate ${variables.response === "interested" ? "accepted" : "declined"} successfully`);
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to submit response");
    },
  });

  // Categorize
  const pendingIntroductions = introductions?.filter((i) => !i.provider_response || i.provider_response === "pending") || [];
  const confirmedPlacements = introductions?.filter(
    (i) => i.concierge_inquiries?.placement_confirmed === true && i.concierge_inquiries?.placed_facility_id === selectedFacility?.id
  ) || [];
  const confirmedIds = new Set(confirmedPlacements.map((i) => i.id));
  const activePlacements = introductions?.filter(
    (i) =>
      i.provider_response === "interested" &&
      !confirmedIds.has(i.id) &&
      i.concierge_inquiries?.status !== "closed" &&
      i.concierge_inquiries?.status !== "placed"
  ) || [];
  const activeIds = new Set(activePlacements.map((i) => i.id));
  const respondedIntroductions = introductions?.filter(
    (i) => i.provider_response && i.provider_response !== "pending" && !confirmedIds.has(i.id) && !activeIds.has(i.id)
  ) || [];

  const acceptedCount = introductions?.filter((i) => i.provider_response === "interested").length || 0;
  const declinedCount = introductions?.filter((i) => i.provider_response === "not_available").length || 0;
  const candidateCount = pendingIntroductions.length + activePlacements.length;

  if (error) {
    return (
      <Card className="border-destructive/30">
        <CardContent className="py-10 text-center">
          <AlertCircle className="h-10 w-10 text-destructive mx-auto mb-3" />
          <p className="font-medium text-destructive">Failed to load candidates</p>
          <p className="text-sm text-muted-foreground mt-1 mb-4">
            {error instanceof Error ? error.message : "An unexpected error occurred"}
          </p>
          <button onClick={() => refetch()} className="text-sm text-primary hover:underline font-medium">
            Try again
          </button>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-28 w-full rounded-xl" />
        <div className="grid grid-cols-3 gap-3">
          <Skeleton className="h-20 rounded-xl" />
          <Skeleton className="h-20 rounded-xl" />
          <Skeleton className="h-20 rounded-xl" />
        </div>
        <Skeleton className="h-36 w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Header Card ── */}
      <Card className="border-primary/15 bg-gradient-to-br from-primary/5 via-background to-primary/5 overflow-hidden">
        <CardContent className="p-5 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <MapPin className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-bold text-foreground">Domestic Placements</h2>
              <p className="text-sm text-muted-foreground mt-0.5">
                Pre-screened U.S. clients matched to your facility
              </p>
            </div>
            <div className="sm:text-right shrink-0">
              <p className="text-2xl font-bold text-primary">{hasPro ? "$800" : "$1,000"}</p>
              <p className="text-xs text-muted-foreground">per confirmed admission</p>
              {hasPro && (
                <Badge variant="secondary" className="mt-1 text-xs bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                  Pro: Save $200
                </Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Collapsible Fee Details ── */}
      <Collapsible open={feeInfoOpen} onOpenChange={setFeeInfoOpen}>
        <CollapsibleTrigger className="w-full">
          <div className="flex items-center justify-between px-4 py-2.5 rounded-lg border bg-muted/30 hover:bg-muted/50 transition-colors">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Info className="h-3.5 w-3.5" />
              <span>Fee details &amp; how billing works</span>
            </div>
            <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", feeInfoOpen && "rotate-180")} />
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="mt-2 px-4 py-3 rounded-lg border border-dashed bg-muted/20 text-sm text-muted-foreground space-y-1.5">
            <p>• Fee is charged <strong className="text-foreground">only</strong> after admission is confirmed by our team</p>
            <p>• Both you and the client must confirm before any charge applies</p>
            <p>• Invoices are issued with a 14-day payment window</p>
            {!hasPro && (
              <p className="text-primary/80">• Pro members save $200 per placement — upgrade in Billing</p>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* ── Stats Row ── */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard icon={Bell} iconColor="text-amber-500" bgColor="bg-amber-500/10" value={pendingIntroductions.length} label="Pending" />
        <StatCard icon={CheckCircle} iconColor="text-emerald-500" bgColor="bg-emerald-500/10" value={acceptedCount} label="Accepted" />
        <StatCard icon={XCircle} iconColor="text-muted-foreground" bgColor="bg-muted" value={declinedCount} label="Declined" />
      </div>

      {/* ── Confirmed Admissions ── */}
      {confirmedPlacements.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold flex items-center gap-2">
              <UserCheck className="h-5 w-5 text-emerald-500" />
              Confirmed Admissions
              <span className="inline-flex items-center justify-center text-xs font-bold rounded-full h-5 min-w-[20px] px-1.5 bg-emerald-500/15 text-emerald-600">
                {confirmedPlacements.length}
              </span>
            </h3>
          </div>
          <div className="space-y-3">
            {confirmedPlacements.slice(0, 5).map((intro) => (
              <CandidateRow
                key={`confirmed-${intro.id}`}
                intro={intro}
                onClick={() => { setSelectedIntro(intro); setModalOpen(true); }}
                badge={
                  <Badge className="bg-emerald-600 text-white border-emerald-600 text-xs">
                    <CheckCircle className="h-3 w-3 mr-1" /> Placed
                  </Badge>
                }
                meta={
                  intro.concierge_inquiries?.placement_confirmed_at
                    ? format(new Date(intro.concierge_inquiries.placement_confirmed_at), "MMM d, yyyy")
                    : undefined
                }
              />
            ))}
          </div>
        </section>
      )}

      {/* ── Candidates (Pending + In Progress combined) ── */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Candidates
            {candidateCount > 0 && (
              <span className="inline-flex items-center justify-center text-xs font-bold rounded-full h-5 min-w-[20px] px-1.5 bg-destructive text-destructive-foreground">
                {candidateCount}
              </span>
            )}
          </h3>
        </div>

        {candidateCount === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-10 text-center">
              <div className="h-14 w-14 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
                <MapPin className="h-7 w-7 text-muted-foreground" />
              </div>
              <p className="font-medium text-foreground">No pending candidates</p>
              <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
                When domestic clients are matched to your facility, they'll appear here for your review.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {/* In Progress first — they need attention */}
            {activePlacements.map((intro) => (
              <CandidateRow
                key={`active-${intro.id}`}
                intro={intro}
                onClick={() => { setSelectedIntro(intro); setModalOpen(true); }}
                badge={
                  <Badge className="bg-amber-500 text-white border-amber-500 text-xs">
                    <Clock className="h-3 w-3 mr-1" /> In Progress
                  </Badge>
                }
                meta={
                  intro.provider_responded_at
                    ? `Accepted ${format(new Date(intro.provider_responded_at), "MMM d")}`
                    : undefined
                }
              />
            ))}
            {/* Pending — new referrals */}
            {pendingIntroductions.map((intro) => (
              <CandidateRow
                key={`pending-${intro.id}`}
                intro={intro}
                onClick={() => { setSelectedIntro(intro); setModalOpen(true); }}
                badge={
                  <Badge variant="destructive" className="text-xs">
                    <Bell className="h-3 w-3 mr-1" /> New
                  </Badge>
                }
                meta={format(new Date(intro.created_at), "MMM d")}
                showActions
                onRespond={(response, notes) => respondMutation.mutate({ id: intro.id, response, notes })}
                isResponding={respondMutation.isPending}
              />
            ))}
          </div>
        )}
      </section>

      {/* ── Past Responses ── */}
      {respondedIntroductions.length > 0 && (
        <section>
          <h3 className="text-base font-semibold text-muted-foreground mb-3">Past Responses</h3>
          <div className="space-y-2">
            {respondedIntroductions.slice(0, 10).map((intro) => (
              <Card key={intro.id} className="bg-muted/20 border-muted">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <Badge
                        variant={intro.provider_response === "interested" ? "default" : "secondary"}
                        className="shrink-0 gap-1"
                      >
                        {intro.provider_response === "interested" ? (
                          <><CheckCircle className="h-3 w-3" /> Accepted</>
                        ) : (
                          <><XCircle className="h-3 w-3" /> Declined</>
                        )}
                      </Badge>
                      <span className="text-sm truncate">
                        {intro.concierge_inquiries?.preferred_state || "U.S."} ·{" "}
                        {intro.concierge_inquiries?.primary_concern || "Treatment"}
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground shrink-0">
                      {intro.provider_responded_at && format(new Date(intro.provider_responded_at), "MMM d, yyyy")}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* Placement Detail Modal */}
      <PlacementDetailModal
        introduction={selectedIntro}
        open={modalOpen}
        onOpenChange={(open) => {
          setModalOpen(open);
          if (!open) setSelectedIntro(null);
        }}
        facilityId={selectedFacility?.id || ""}
        onRespond={selectedIntro && (!selectedIntro.provider_response || selectedIntro.provider_response === "pending")
          ? (response, notes) => {
              respondMutation.mutate({ id: selectedIntro.id, response, notes });
              setModalOpen(false);
              setSelectedIntro(null);
            }
          : undefined
        }
        isResponding={respondMutation.isPending}
        hasPro={hasPro}
      />
    </div>
  );
}

/* ═══════════════════════════════════════════════
   SUB-COMPONENTS
   ═══════════════════════════════════════════════ */

function StatCard({
  icon: Icon,
  iconColor,
  bgColor,
  value,
  label,
}: {
  icon: React.ElementType;
  iconColor: string;
  bgColor: string;
  value: number;
  label: string;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className={cn("h-9 w-9 rounded-lg flex items-center justify-center shrink-0", bgColor)}>
            <Icon className={cn("h-4.5 w-4.5", iconColor)} />
          </div>
          <div>
            <p className="text-xl font-bold">{value}</p>
            <p className="text-xs text-muted-foreground">{label}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function CandidateRow({
  intro,
  badge,
  meta,
  onClick,
  showActions,
  onRespond,
  isResponding,
}: {
  intro: Introduction;
  badge: React.ReactNode;
  meta?: string;
  onClick: () => void;
  showActions?: boolean;
  onRespond?: (response: string, notes?: string) => void;
  isResponding?: boolean;
}) {
  const inquiry = intro.concierge_inquiries;
  const urgency = inquiry?.timeline_urgency as string;
  const urgencyConf = URGENCY_CONFIG[urgency] || URGENCY_CONFIG.flexible;

  return (
    <Card
      className="hover:border-primary/40 hover:shadow-sm transition-all cursor-pointer group"
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-center gap-4">
          {/* Icon */}
          <div className="h-11 w-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <MapPin className="h-5 w-5 text-primary" />
          </div>

          {/* Main info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="font-semibold text-foreground">
                {inquiry?.preferred_state || "U.S."}{inquiry?.preferred_city ? `, ${inquiry.preferred_city}` : ""}
              </span>
              {badge}
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>{inquiry?.primary_concern || "Treatment"}</span>
              <span className="text-muted-foreground/40">·</span>
              <span>{inquiry?.level_of_care?.replace(/_/g, " ") || "Level TBD"}</span>
              {inquiry?.insurance_carrier && (
                <>
                  <span className="text-muted-foreground/40">·</span>
                  <span>{inquiry.insurance_carrier}</span>
                </>
              )}
            </div>
          </div>

          {/* Urgency + date */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="text-right hidden sm:block">
              <Badge variant="outline" className={cn("text-xs", urgencyConf.className)}>
                {urgencyConf.label}
              </Badge>
              {meta && <p className="text-[11px] text-muted-foreground mt-1">{meta}</p>}
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
          </div>
        </div>

        {/* Inline quick actions for pending */}
        {showActions && onRespond && (
          <div
            className="flex items-center gap-2 mt-3 pt-3 border-t"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => onRespond("not_available")}
              disabled={isResponding}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium border hover:bg-muted/50 transition-colors text-muted-foreground"
            >
              <XCircle className="h-3.5 w-3.5" /> Not a Fit
            </button>
            <button
              onClick={() => onRespond("interested")}
              disabled={isResponding}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              {isResponding ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle className="h-3.5 w-3.5" />}
              I'm Interested
            </button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
