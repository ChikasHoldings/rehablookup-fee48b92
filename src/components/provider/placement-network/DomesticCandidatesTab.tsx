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
  ArrowRight,
  ChevronDown,
  Info,
} from "lucide-react";
import { IntroductionCard } from "./IntroductionCard";
import { PlacementDetailModal } from "./PlacementDetailModal";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

// Proper type definitions for type safety
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
        .select(
          `
          id, facility_id, inquiry_id, created_at,
          provider_response, provider_responded_at, provider_notes,
          concierge_inquiries (
            id, user_name, level_of_care, payment_type, timeline_urgency, preferred_state,
            preferred_city, status, age_range, gender, primary_concern, insurance_carrier,
            detox_needed, co_occurring_concerns, substance_use_duration, budget_range,
            seeker_confirmed, seeker_confirmed_at, placement_confirmed, placement_confirmed_at, placed_facility_id
          )
        `
        )
        .eq("facility_id", selectedFacility.id)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("[DomesticCandidatesTab] Query error:", error.message);
        throw new Error(`Failed to load introductions: ${error.message}`);
      }
      return (data || []) as Introduction[];
    },
    enabled: !!selectedFacility?.id,
    staleTime: 30000,
    retry: 2,
  });

  // Realtime subscription
  useEffect(() => {
    if (!selectedFacility?.id) return;
    const channel = supabase
      .channel(`provider-intros-${selectedFacility.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "concierge_introductions",
          filter: `facility_id=eq.${selectedFacility.id}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["placement-introductions", selectedFacility.id] });
        }
      )
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

  // Categorize introductions
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
        <div className="grid grid-cols-3 gap-3">
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
        </div>
        <Skeleton className="h-40" />
        <Skeleton className="h-40" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ─── KPI Stats ─── */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard
          icon={<Bell className="h-4 w-4" />}
          value={pendingIntroductions.length}
          label="Pending"
          accent="amber"
          highlight={pendingIntroductions.length > 0}
        />
        <StatCard
          icon={<CheckCircle className="h-4 w-4" />}
          value={acceptedCount}
          label="Accepted"
          accent="emerald"
        />
        <StatCard
          icon={<XCircle className="h-4 w-4" />}
          value={declinedCount}
          label="Declined"
          accent="muted"
        />
      </div>

      {/* ─── Collapsible Fee Info ─── */}
      <Collapsible open={feeInfoOpen} onOpenChange={setFeeInfoOpen}>
        <CollapsibleTrigger className="w-full">
          <div className="flex items-center justify-between px-4 py-2.5 rounded-lg border bg-muted/30 hover:bg-muted/50 transition-colors">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Info className="h-3.5 w-3.5" />
              <span>
                Placement fee: <strong className="text-foreground">{hasPro ? "$800" : "$1,000"}</strong> per confirmed admission
                {hasPro && <span className="text-primary ml-1">(Pro discount)</span>}
              </span>
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

      {/* ─── Confirmed Admissions ─── */}
      {confirmedPlacements.length > 0 && (
        <Section
          icon={<UserCheck className="h-4 w-4 text-emerald-500" />}
          title="Confirmed Admissions"
          count={confirmedPlacements.length}
          accentClass="text-emerald-500"
        >
          <div className="space-y-2">
            {confirmedPlacements.slice(0, 5).map((intro) => (
              <CaseRow
                key={`confirmed-${intro.id}`}
                caseId={intro.concierge_inquiries?.id || intro.id}
                onClick={() => { setSelectedIntro(intro); setModalOpen(true); }}
                badge={
                  <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800 text-[11px]">
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
        </Section>
      )}

      {/* ─── Active — Awaiting Confirmation ─── */}
      {activePlacements.length > 0 && (
        <Section
          icon={<Hourglass className="h-4 w-4 text-amber-500" />}
          title="Awaiting Confirmation"
          count={activePlacements.length}
          accentClass="text-amber-500"
          subtitle="You accepted — our team is coordinating next steps"
        >
          <div className="space-y-2">
            {activePlacements.map((intro) => (
              <CaseRow
                key={`active-${intro.id}`}
                caseId={intro.concierge_inquiries?.id || intro.id}
                onClick={() => { setSelectedIntro(intro); setModalOpen(true); }}
                badge={
                  <Badge variant="outline" className="border-amber-300 text-amber-600 dark:text-amber-400 text-[11px]">
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
          </div>
        </Section>
      )}

      {/* ─── Pending Candidates ─── */}
      <Section
        icon={<Users className="h-4 w-4 text-primary" />}
        title="Pending Candidates"
        count={pendingIntroductions.length > 0 ? pendingIntroductions.length : undefined}
        accentClass="text-primary"
        badge={pendingIntroductions.length > 0 ? (
          <Badge variant="destructive" className="text-[10px] h-5">{pendingIntroductions.length} new</Badge>
        ) : undefined}
      >
        {pendingIntroductions.length === 0 ? (
          <div className="rounded-xl border border-dashed py-10 text-center">
            <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
              <Bell className="h-5 w-5 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium text-foreground">No pending candidates</p>
            <p className="text-xs text-muted-foreground mt-1">
              New domestic candidates matched to your facility will appear here
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {pendingIntroductions.map((intro) => (
              <IntroductionCard
                key={intro.id}
                introduction={intro}
                facilityId={selectedFacility?.id || ""}
                onRespond={(response, notes) => respondMutation.mutate({ id: intro.id, response, notes })}
                isResponding={respondMutation.isPending}
                hasPro={hasPro}
                onClick={() => { setSelectedIntro(intro); setModalOpen(true); }}
              />
            ))}
          </div>
        )}
      </Section>

      {/* ─── Past Responses ─── */}
      {respondedIntroductions.length > 0 && (
        <Collapsible>
          <CollapsibleTrigger className="w-full">
            <div className="flex items-center justify-between py-2">
              <h3 className="text-sm font-medium text-muted-foreground">
                Past Responses ({respondedIntroductions.length})
              </h3>
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            </div>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="space-y-2 mt-2">
              {respondedIntroductions.slice(0, 10).map((intro) => (
                <CaseRow
                  key={intro.id}
                  caseId={intro.concierge_inquiries?.id || intro.id}
                  onClick={() => { setSelectedIntro(intro); setModalOpen(true); }}
                  className="bg-muted/20"
                  badge={
                    <Badge
                      variant={intro.provider_response === "interested" ? "default" : "secondary"}
                      className="text-[11px]"
                    >
                      {intro.provider_response === "interested" ? (
                        <><CheckCircle className="h-3 w-3 mr-1" /> Accepted</>
                      ) : (
                        <><XCircle className="h-3 w-3 mr-1" /> Declined</>
                      )}
                    </Badge>
                  }
                  meta={
                    intro.provider_responded_at
                      ? format(new Date(intro.provider_responded_at), "MMM d, yyyy")
                      : undefined
                  }
                />
              ))}
            </div>
          </CollapsibleContent>
        </Collapsible>
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

/* ─── Reusable Sub-components ─── */

function StatCard({
  icon,
  value,
  label,
  accent,
  highlight,
}: {
  icon: React.ReactNode;
  value: number;
  label: string;
  accent: "amber" | "emerald" | "muted";
  highlight?: boolean;
}) {
  const colors = {
    amber: "text-amber-500",
    emerald: "text-emerald-500",
    muted: "text-muted-foreground",
  };

  return (
    <Card className={cn(
      "transition-colors",
      highlight && "border-amber-300 dark:border-amber-800 bg-amber-50/30 dark:bg-amber-950/10"
    )}>
      <CardContent className="p-3 sm:p-4">
        <div className="flex items-center gap-2 mb-1">
          <div className={colors[accent]}>{icon}</div>
          <span className="text-xl sm:text-2xl font-bold">{value}</span>
        </div>
        <p className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wider font-medium">{label}</p>
      </CardContent>
    </Card>
  );
}

function Section({
  icon,
  title,
  count,
  accentClass,
  subtitle,
  badge,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  count?: number;
  accentClass?: string;
  subtitle?: string;
  badge?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-3">
      <div>
        <div className="flex items-center gap-2">
          {icon}
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
          {count !== undefined && (
            <span className={cn("text-xs font-semibold", accentClass)}>{count}</span>
          )}
          {badge}
        </div>
        {subtitle && (
          <p className="text-xs text-muted-foreground mt-0.5 ml-6">{subtitle}</p>
        )}
      </div>
      {children}
    </div>
  );
}

function CaseRow({
  caseId,
  badge,
  meta,
  onClick,
  className,
}: {
  caseId: string;
  badge: React.ReactNode;
  meta?: string;
  onClick: () => void;
  className?: string;
}) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "flex items-center justify-between px-4 py-3 rounded-lg border cursor-pointer hover:bg-muted/50 transition-colors gap-3",
        className
      )}
    >
      <div className="flex items-center gap-3 min-w-0">
        {badge}
        <span className="text-sm font-medium truncate">
          Case #{caseId.slice(0, 8).toUpperCase()}
        </span>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {meta && <span className="text-xs text-muted-foreground">{meta}</span>}
        <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
      </div>
    </div>
  );
}
