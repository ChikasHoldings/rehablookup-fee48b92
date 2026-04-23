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
  ChevronRight,
  ChevronDown,
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
  admin_disclosed_pii_at?: string | null;
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
  

  const { data: introductions, isLoading, error, refetch } = useQuery({
    queryKey: ["placement-introductions", selectedFacility?.id],
    queryFn: async () => {
      if (!selectedFacility?.id) return [];
      // SECURITY: Provider RLS on concierge_inquiries now requires admin disclosure.
      // Fetch introductions list, then enrich via the safe RPC for non-PII fields.
      const { data: intros, error } = await supabase
        .from("concierge_introductions")
        .select(`
          id, facility_id, inquiry_id, created_at,
          provider_response, provider_responded_at, provider_notes, admin_disclosed_pii_at
        `)
        .eq("facility_id", selectedFacility.id)
        .order("created_at", { ascending: false });
      if (error) throw new Error(`Failed to load introductions: ${error.message}`);

      // Pull non-PII inquiry data for ALL introductions via SECURITY DEFINER RPC
      const { data: safeInquiries, error: rpcError } = await supabase
        .rpc("get_provider_safe_inquiries", { p_facility_id: selectedFacility.id });
      if (rpcError) throw new Error(`Failed to load candidate details: ${rpcError.message}`);

      const inquiryMap = new Map((safeInquiries || []).map((i: any) => [i.id, i]));
      return (intros || []).map((intro: any) => ({
        ...intro,
        concierge_inquiries: inquiryMap.get(intro.inquiry_id) || null,
      })) as Introduction[];
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
        .select("provider_response, inquiry_id")
        .eq("id", id)
        .eq("facility_id", selectedFacility?.id)
        .maybeSingle();
      if (current?.provider_response && current.provider_response !== "pending") throw new Error("You've already responded to this candidate");
      // Inquiry status check via safe RPC (RLS no longer permits row reads of concierge_inquiries)
      if (current?.inquiry_id && selectedFacility?.id) {
        const { data: safeInquiries } = await supabase
          .rpc("get_provider_safe_inquiries", { p_facility_id: selectedFacility.id });
        const caseStatus = (safeInquiries || []).find((i: any) => i.id === current.inquiry_id)?.status;
        if (caseStatus === "closed" || caseStatus === "completed") throw new Error("This case is no longer active");
      }
      const { error } = await supabase
        .from("concierge_introductions")
        .update({ provider_response: response, provider_responded_at: new Date().toISOString(), provider_notes: notes?.trim() || null })
        .eq("id", id)
        .eq("facility_id", selectedFacility?.id);
      if (error) throw new Error(`Failed to submit response: ${error.message}`);
      const intro = introductions?.find((i) => i.id === id);
      const inquiryId = intro?.inquiry_id;
      if (!inquiryId) return;

      // Log case event for the provider response
      try {
        const { data: { user } } = await supabase.auth.getUser();
        await supabase.from("concierge_case_events").insert({
          inquiry_id: inquiryId,
          event_type: response === "interested" ? "provider_accepted" : "provider_declined",
          event_data: {
            facility_id: selectedFacility?.id,
            introduction_id: id,
            notes: notes?.trim() || null,
          },
          actor_id: user?.id || null,
          actor_type: "provider",
        });
      } catch (e) { console.error("Failed to log case event:", e); }

      if (response === "interested") {
        try { await supabase.functions.invoke("auto-status-transition", { body: { inquiryId, trigger: "provider_interested", actorType: "provider" } }); } catch (e) { console.error(e); }
        try { await supabase.functions.invoke("send-concierge-notifications", { body: { type: "provider_interested", inquiryId, facilityId: selectedFacility?.id } }); } catch (e) { console.error(e); }
      } else {
        try { await supabase.functions.invoke("send-concierge-notifications", { body: { type: "provider_declined", inquiryId, facilityId: selectedFacility?.id } }); } catch (e) { console.error(e); }
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["placement-introductions"] });
      toast.success(`Candidate ${variables.response === "interested" ? "accepted" : "declined"} successfully`);
    },
    onError: (error: Error) => { toast.error(error.message || "Failed to submit response"); },
  });

  const pendingIntroductions = introductions?.filter((i) => !i.provider_response || i.provider_response === "pending") || [];
  const confirmedPlacements = introductions?.filter(
    (i) => i.concierge_inquiries?.placement_confirmed === true && i.concierge_inquiries?.placed_facility_id === selectedFacility?.id
  ) || [];
  const confirmedIds = new Set(confirmedPlacements.map((i) => i.id));
  const activePlacements = introductions?.filter(
    (i) => i.provider_response === "interested" && !confirmedIds.has(i.id) && i.concierge_inquiries?.status !== "closed" && i.concierge_inquiries?.status !== "completed"
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
        <CardContent className="py-12 text-center">
          <AlertCircle className="h-10 w-10 text-destructive mx-auto mb-3" />
          <p className="font-semibold text-destructive">Failed to load candidates</p>
          <p className="text-sm text-muted-foreground mt-1 mb-4">{error instanceof Error ? error.message : "An unexpected error occurred"}</p>
          <button onClick={() => refetch()} className="text-sm text-primary hover:underline font-medium">Try again</button>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-32 w-full rounded-xl" />
        <div className="grid grid-cols-3 gap-4"><Skeleton className="h-24 rounded-xl" /><Skeleton className="h-24 rounded-xl" /><Skeleton className="h-24 rounded-xl" /></div>
        <Skeleton className="h-40 w-full rounded-xl" />
      </div>
    );
  }

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-0">
        {/* ── Header ── */}
        <div className="px-5 sm:px-6 py-5 border-b bg-gradient-to-br from-primary/5 via-background to-background">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="h-11 w-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <MapPin className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-base font-bold text-foreground">Domestic Placements</h2>
              <p className="text-sm text-muted-foreground mt-0.5">Pre-screened U.S. clients matched to your facility</p>
            </div>
          </div>
        </div>

        {/* ── Stats ── */}
        <div className="grid grid-cols-3 border-b">
          <StatCard icon={Bell} iconColor="text-amber-500" bgColor="bg-amber-500/10" value={pendingIntroductions.length} label="Pending" highlight={pendingIntroductions.length > 0} />
          <StatCard icon={CheckCircle} iconColor="text-emerald-500" bgColor="bg-emerald-500/10" value={acceptedCount} label="Accepted" border />
          <StatCard icon={XCircle} iconColor="text-muted-foreground" bgColor="bg-muted" value={declinedCount} label="Declined" border />
        </div>

        {/* ── Confirmed Admissions ── */}
        {confirmedPlacements.length > 0 && (
          <div className="border-b">
            <div className="flex items-center gap-2.5 px-5 py-3 border-b bg-emerald-500/5">
              <UserCheck className="h-4 w-4 text-emerald-600" />
              <h3 className="text-sm font-semibold text-foreground">Confirmed Admissions</h3>
              <Badge className="bg-emerald-600 text-white border-emerald-600 text-xs h-5 ml-auto">{confirmedPlacements.length}</Badge>
            </div>
            <div className="divide-y">
              {confirmedPlacements.slice(0, 5).map((intro) => (
                <CandidateRow
                  key={`confirmed-${intro.id}`}
                  intro={intro}
                  onClick={() => { setSelectedIntro(intro); setModalOpen(true); }}
                  statusBadge={<Badge className="bg-emerald-600 text-white border-emerald-600 text-xs"><CheckCircle className="h-3 w-3 mr-1" />Placed</Badge>}
                  meta={intro.concierge_inquiries?.placement_confirmed_at ? format(new Date(intro.concierge_inquiries.placement_confirmed_at), "MMM d, yyyy") : undefined}
                />
              ))}
            </div>
          </div>
        )}

        {/* ── Candidates (Pending + In Progress) ── */}
        <div className="border-b">
          <div className="flex items-center gap-2.5 px-5 py-3 border-b bg-primary/5">
            <Users className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">Candidates</h3>
            {candidateCount > 0 && (
              <Badge variant="destructive" className="text-xs h-5 ml-auto">{candidateCount} new</Badge>
            )}
          </div>

          {candidateCount === 0 ? (
            <div className="py-12 text-center px-6">
              <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
                <MapPin className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="font-semibold text-foreground text-sm">No pending candidates</p>
              <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">When domestic clients are matched to your facility, they'll appear here.</p>
            </div>
          ) : (
            <div className="divide-y">
              {activePlacements.map((intro) => (
                <CandidateRow
                  key={`active-${intro.id}`}
                  intro={intro}
                  onClick={() => { setSelectedIntro(intro); setModalOpen(true); }}
                  statusBadge={<Badge className="bg-amber-500 text-white border-amber-500 text-xs"><Clock className="h-3 w-3 mr-1" />In Progress</Badge>}
                  meta={intro.provider_responded_at ? `Accepted ${format(new Date(intro.provider_responded_at), "MMM d")}` : undefined}
                />
              ))}
              {pendingIntroductions.map((intro) => (
                <CandidateRow
                  key={`pending-${intro.id}`}
                  intro={intro}
                  onClick={() => { setSelectedIntro(intro); setModalOpen(true); }}
                  statusBadge={<Badge variant="destructive" className="text-xs"><Bell className="h-3 w-3 mr-1" />New</Badge>}
                  meta={format(new Date(intro.created_at), "MMM d")}
                  showActions
                  onRespond={(response, notes) => respondMutation.mutate({ id: intro.id, response, notes })}
                  isResponding={respondMutation.isPending}
                />
              ))}
            </div>
          )}
        </div>

        {/* ── Past Responses ── */}
        {respondedIntroductions.length > 0 && (
          <Collapsible>
            <CollapsibleTrigger className="w-full">
              <div className="flex items-center justify-between px-5 py-3 hover:bg-muted/30 transition-colors">
                <h3 className="text-sm font-semibold text-muted-foreground">Past Responses ({respondedIntroductions.length})</h3>
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="divide-y border-t">
                {respondedIntroductions.slice(0, 10).map((intro) => (
                  <div key={intro.id} className="flex items-center justify-between px-5 py-3.5 gap-3 hover:bg-muted/30 transition-colors cursor-pointer"
                    onClick={() => { setSelectedIntro(intro); setModalOpen(true); }}>
                    <div className="flex items-center gap-3 min-w-0">
                      <Badge variant={intro.provider_response === "interested" ? "default" : "secondary"} className="shrink-0 gap-1 text-xs">
                        {intro.provider_response === "interested" ? <><CheckCircle className="h-3 w-3" /> Accepted</> : <><XCircle className="h-3 w-3" /> Declined</>}
                      </Badge>
                      <span className="text-sm truncate">{intro.concierge_inquiries?.preferred_state || "U.S."} · {intro.concierge_inquiries?.primary_concern || "Treatment"}</span>
                    </div>
                    <span className="text-xs text-muted-foreground shrink-0">{intro.provider_responded_at && format(new Date(intro.provider_responded_at), "MMM d, yyyy")}</span>
                  </div>
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}
      </CardContent>

      <PlacementDetailModal
        introduction={selectedIntro}
        open={modalOpen}
        onOpenChange={(open) => { setModalOpen(open); if (!open) setSelectedIntro(null); }}
        facilityId={selectedFacility?.id || ""}
        onRespond={selectedIntro && (!selectedIntro.provider_response || selectedIntro.provider_response === "pending")
          ? (response, notes) => { respondMutation.mutate({ id: selectedIntro.id, response, notes }); setModalOpen(false); setSelectedIntro(null); }
          : undefined}
        isResponding={respondMutation.isPending}
        hasPro={hasPro}
      />
    </Card>
  );
}

/* ═══════════════════════════════════════════════ */

function StatCard({ icon: Icon, iconColor, bgColor, value, label, highlight, border }: {
  icon: React.ElementType; iconColor: string; bgColor: string; value: number; label: string; highlight?: boolean; border?: boolean;
}) {
  return (
    <div className={cn("p-4 sm:p-5 transition-colors", highlight && "bg-amber-50/30 dark:bg-amber-950/10", border && "border-l")}>
      <div className="flex items-center gap-3">
        <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center shrink-0", bgColor)}>
          <Icon className={cn("h-5 w-5", iconColor)} />
        </div>
        <div>
          <p className="text-2xl font-bold leading-none">{value}</p>
          <p className="text-xs text-muted-foreground mt-1 font-medium uppercase tracking-wider">{label}</p>
        </div>
      </div>
    </div>
  );
}

function CandidateRow({ intro, statusBadge, meta, onClick, showActions, onRespond, isResponding }: {
  intro: Introduction; statusBadge: React.ReactNode; meta?: string; onClick: () => void;
  showActions?: boolean; onRespond?: (response: string, notes?: string) => void; isResponding?: boolean;
}) {
  const inquiry = intro.concierge_inquiries;
  const urgency = inquiry?.timeline_urgency as string;
  const urgencyConf = URGENCY_CONFIG[urgency] || URGENCY_CONFIG.flexible;

  return (
    <div className="px-5 py-4 hover:bg-muted/30 transition-colors cursor-pointer group" onClick={onClick}>
      <div className="flex items-center gap-4">
        <div className="h-11 w-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
          <MapPin className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5 flex-wrap">
            <span className="font-semibold text-foreground text-sm">
              {inquiry?.preferred_state || "U.S."}{inquiry?.preferred_city ? `, ${inquiry.preferred_city}` : ""}
            </span>
            {statusBadge}
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>{inquiry?.primary_concern || "Treatment"}</span>
            <span className="text-muted-foreground/30">·</span>
            <span className="capitalize">{inquiry?.level_of_care?.replace(/_/g, " ") || "Level TBD"}</span>
            {inquiry?.insurance_carrier && (
              <><span className="text-muted-foreground/30">·</span><span>{inquiry.insurance_carrier}</span></>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <div className="text-right hidden sm:block">
            <Badge variant="outline" className={cn("text-xs", urgencyConf.className)}>{urgencyConf.label}</Badge>
            {meta && <p className="text-xs text-muted-foreground mt-1">{meta}</p>}
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
        </div>
      </div>
      {showActions && onRespond && (
        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-dashed ml-[60px]" onClick={(e) => e.stopPropagation()}>
          <button onClick={() => onRespond("not_available")} disabled={isResponding}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold border hover:bg-muted/50 transition-colors text-muted-foreground">
            <XCircle className="h-3.5 w-3.5" /> Not a Fit
          </button>
          <button onClick={() => onRespond("interested")} disabled={isResponding}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">
            {isResponding ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle className="h-3.5 w-3.5" />} I'm Interested
          </button>
        </div>
      )}
    </div>
  );
}
