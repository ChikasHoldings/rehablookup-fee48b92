import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSelectedFacility } from "@/contexts/SelectedFacilityContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  Globe,
  DollarSign,
  Clock,
  AlertTriangle,
  CheckCircle,
  XCircle,
  User,
  Loader2,
  Sparkles,
  MapPin,
  ChevronRight,
  ChevronDown,
  Info,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface InternationalMatch {
  id: string;
  case_id: string;
  facility_id: string;
  provider_id: string;
  status: string;
  invited_at: string;
  responded_at: string | null;
  provider_notes: string | null;
  international_placement_cases: {
    id: string;
    client_country: string;
    intake_data: Record<string, unknown>;
    priority: string | null;
    created_at: string;
  };
}

const URGENCY_CONFIG: Record<string, { label: string; className: string }> = {
  immediate: { label: "Immediate", className: "bg-destructive/10 text-destructive border-destructive/20" },
  within_week: { label: "Within Week", className: "bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/20" },
  within_month: { label: "Within Month", className: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20" },
  flexible: { label: "Flexible", className: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20" },
};

const BUDGET_LABELS: Record<string, string> = {
  "10k-25k": "$10K – $25K/mo",
  "25k-50k": "$25K – $50K/mo",
  "50k-100k": "$50K – $100K/mo",
  "100k+": "$100K+/mo",
};

export function InternationalCandidatesTab({ hasPro = false }: { hasPro?: boolean }) {
  const queryClient = useQueryClient();
  const { selectedFacility } = useSelectedFacility();
  const [selectedMatch, setSelectedMatch] = useState<InternationalMatch | null>(null);
  const [responseNotes, setResponseNotes] = useState("");
  const [feeInfoOpen, setFeeInfoOpen] = useState(false);

  const { data: matches, isLoading } = useQuery({
    queryKey: ["international-matches", selectedFacility?.id],
    queryFn: async () => {
      if (!selectedFacility?.id) return [];
      const { data, error } = await supabase
        .from("international_case_facility_matches")
        .select(`*, international_placement_cases (id, client_country, intake_data, priority, created_at)`)
        .eq("facility_id", selectedFacility.id)
        .order("invited_at", { ascending: false });
      if (error) throw error;
      return (data as unknown as InternationalMatch[]) || [];
    },
    enabled: !!selectedFacility?.id,
  });

  const respondMutation = useMutation({
    mutationFn: async ({ matchId, response, notes }: { matchId: string; response: string; notes?: string }) => {
      const { data, error } = await supabase.functions.invoke("respond-international-case", {
        body: { action: "respond", matchId, data: { response, notes } },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["international-matches"] });
      toast.success(variables.response === "accepted" ? "Interest submitted!" : "Response recorded");
      setSelectedMatch(null);
      setResponseNotes("");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to respond");
    },
  });

  const handleRespond = (action: "accepted" | "declined") => {
    if (!selectedMatch) return;
    respondMutation.mutate({ matchId: selectedMatch.id, response: action, notes: responseNotes });
  };

  const pendingMatches = matches?.filter((m) => m.status === "invited") || [];
  const respondedMatches = matches?.filter((m) => m.status !== "invited") || [];
  const acceptedCount = respondedMatches.filter((m) => m.status === "accepted").length;
  const declinedCount = respondedMatches.filter((m) => m.status === "declined").length;

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
              <Globe className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-bold text-foreground">International Placements</h2>
              <p className="text-sm text-muted-foreground mt-0.5">
                Pre-screened global clients seeking treatment in the United States
              </p>
            </div>
            <div className="sm:text-right shrink-0">
              <p className="text-2xl font-bold text-primary">{hasPro ? "$2,400" : "$3,000"}</p>
              <p className="text-xs text-muted-foreground">per confirmed admission</p>
              {hasPro && (
                <Badge variant="secondary" className="mt-1 text-xs bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                  Pro: Save $600
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
            <p>• International placements include visa coordination support</p>
            {!hasPro && (
              <p className="text-primary/80">• Pro members save $600 per placement — upgrade in Billing</p>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* ── Stats Row ── */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard icon={Globe} iconColor="text-amber-500" bgColor="bg-amber-500/10" value={pendingMatches.length} label="Pending" />
        <StatCard icon={CheckCircle} iconColor="text-emerald-500" bgColor="bg-emerald-500/10" value={acceptedCount} label="Accepted" />
        <StatCard icon={XCircle} iconColor="text-muted-foreground" bgColor="bg-muted" value={declinedCount} label="Declined" />
      </div>

      {/* ── Candidates (Pending) ── */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold flex items-center gap-2">
            <Globe className="h-5 w-5 text-primary" />
            Candidates
            {pendingMatches.length > 0 && (
              <span className="inline-flex items-center justify-center text-xs font-bold rounded-full h-5 min-w-[20px] px-1.5 bg-destructive text-destructive-foreground">
                {pendingMatches.length}
              </span>
            )}
          </h3>
        </div>

        {pendingMatches.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-10 text-center">
              <div className="h-14 w-14 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
                <Globe className="h-7 w-7 text-muted-foreground" />
              </div>
              <p className="font-medium text-foreground">No pending candidates</p>
              <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
                When international clients are matched to your facility, they'll appear here for your review.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {pendingMatches.map((match) => (
              <CandidateRow key={match.id} match={match} onRespond={() => setSelectedMatch(match)} />
            ))}
          </div>
        )}
      </section>

      {/* ── Past Responses ── */}
      {respondedMatches.length > 0 && (
        <section>
          <h3 className="text-base font-semibold text-muted-foreground mb-3">Past Responses</h3>
          <div className="space-y-2">
            {respondedMatches.map((match) => (
              <Card key={match.id} className="bg-muted/20 border-muted">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <Badge
                        variant={match.status === "accepted" ? "default" : "secondary"}
                        className="shrink-0 gap-1"
                      >
                        {match.status === "accepted" ? (
                          <><CheckCircle className="h-3 w-3" /> Accepted</>
                        ) : (
                          <><XCircle className="h-3 w-3" /> Declined</>
                        )}
                      </Badge>
                      <span className="text-sm truncate">
                        {match.international_placement_cases?.client_country} ·{" "}
                        {(match.international_placement_cases?.intake_data?.primary_concern as string) || "Treatment"}
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground shrink-0">
                      {match.responded_at && format(new Date(match.responded_at), "MMM d, yyyy")}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* ── Response Dialog ── */}
      <Dialog open={!!selectedMatch} onOpenChange={() => setSelectedMatch(null)}>
        <DialogContent className="max-w-lg p-0 gap-0 overflow-hidden [&>button]:top-3 [&>button]:right-3 [&>button]:z-[60]">
          <DialogHeader className="p-5 pb-4 border-b bg-muted/30">
            <div className="pr-8">
              <DialogTitle className="flex items-center gap-2 text-lg">
                <Globe className="h-5 w-5 text-primary" />
                International Candidate
              </DialogTitle>
              <DialogDescription className="mt-1">
                Review this anonymized profile and indicate your interest.
              </DialogDescription>
            </div>
          </DialogHeader>

          {selectedMatch && (
            <div className="p-5 space-y-5 max-h-[60vh] overflow-y-auto">
              <div className="space-y-4">
                <DetailRow icon={MapPin} label="Country" value={selectedMatch.international_placement_cases?.client_country || "—"} />
                <DetailRow
                  icon={DollarSign}
                  label="Budget"
                  value={BUDGET_LABELS[selectedMatch.international_placement_cases?.intake_data?.budget_range as string] || "Not specified"}
                />
                <DetailRow icon={Clock} label="Urgency">
                  <UrgencyBadge urgency={selectedMatch.international_placement_cases?.intake_data?.urgency as string} />
                </DetailRow>
                <DetailRow
                  icon={User}
                  label="Primary Concern"
                  value={(selectedMatch.international_placement_cases?.intake_data?.primary_concern as string) || "Substance Use"}
                />
                {selectedMatch.international_placement_cases?.intake_data?.rehab_style && (
                  <DetailRow
                    icon={Sparkles}
                    label="Preference"
                    value={(selectedMatch.international_placement_cases?.intake_data?.rehab_style as string)?.replace("_", " ")}
                    capitalize
                  />
                )}
                {selectedMatch.international_placement_cases?.intake_data?.notes && (
                  <div className="pt-3 border-t">
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {selectedMatch.international_placement_cases?.intake_data?.notes as string}
                    </p>
                  </div>
                )}
              </div>

              <div className="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-amber-800 dark:text-amber-400">
                      {hasPro ? "$2,400" : "$3,000"} Placement Fee
                    </p>
                    <p className="text-sm text-amber-700 dark:text-amber-500 mt-0.5">
                      Charged only on confirmed admission.{hasPro && " Pro discount applied."}
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium">Notes (optional)</Label>
                <Textarea
                  value={responseNotes}
                  onChange={(e) => setResponseNotes(e.target.value)}
                  placeholder="Add any notes about availability, questions, or concerns..."
                  className="mt-2 min-h-[80px]"
                />
              </div>
            </div>
          )}

          <DialogFooter className="p-5 pt-4 border-t bg-muted/20 gap-2 sm:gap-2">
            <Button
              variant="outline"
              onClick={() => handleRespond("declined")}
              disabled={respondMutation.isPending}
              className="flex-1 sm:flex-none"
            >
              <XCircle className="h-4 w-4 mr-1.5" />
              Not a Fit
            </Button>
            <Button
              onClick={() => handleRespond("accepted")}
              disabled={respondMutation.isPending}
              className="flex-1 sm:flex-none"
            >
              {respondMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
              ) : (
                <CheckCircle className="h-4 w-4 mr-1.5" />
              )}
              I'm Interested
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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

function CandidateRow({ match, onRespond }: { match: InternationalMatch; onRespond: () => void }) {
  const intakeData = match.international_placement_cases?.intake_data || {};
  const urgency = intakeData.urgency as string;
  const urgencyConf = URGENCY_CONFIG[urgency] || URGENCY_CONFIG.flexible;

  return (
    <Card
      className="hover:border-primary/40 hover:shadow-sm transition-all cursor-pointer group"
      onClick={onRespond}
    >
      <CardContent className="p-4">
        <div className="flex items-center gap-4">
          <div className="h-11 w-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <Globe className="h-5 w-5 text-primary" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="font-semibold text-foreground">
                {match.international_placement_cases?.client_country}
              </span>
              {match.international_placement_cases?.priority === "vip" && (
                <Badge className="bg-gradient-to-r from-amber-500 to-yellow-500 text-white border-0 text-[10px] px-1.5 py-0">
                  <Sparkles className="h-2.5 w-2.5 mr-0.5" /> VIP
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>{(intakeData.primary_concern as string) || "Substance Use"}</span>
              <span className="text-muted-foreground/40">·</span>
              <span>{BUDGET_LABELS[intakeData.budget_range as string] || "Budget TBD"}</span>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div className="text-right hidden sm:block">
              <Badge variant="outline" className={cn("text-xs", urgencyConf.className)}>
                {urgencyConf.label}
              </Badge>
              <p className="text-[11px] text-muted-foreground mt-1">
                {format(new Date(match.invited_at), "MMM d")}
              </p>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function DetailRow({
  icon: Icon,
  label,
  value,
  capitalize: cap,
  children,
}: {
  icon: React.ElementType;
  label: string;
  value?: string;
  capitalize?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3">
      <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
      <span className="text-sm font-medium text-muted-foreground w-28 shrink-0">{label}</span>
      {children || <span className={cn("text-sm text-foreground", cap && "capitalize")}>{value}</span>}
    </div>
  );
}

function UrgencyBadge({ urgency }: { urgency?: string }) {
  const conf = URGENCY_CONFIG[urgency || ""] || URGENCY_CONFIG.flexible;
  return (
    <Badge variant="outline" className={cn("text-xs", conf.className)}>
      {conf.label}
    </Badge>
  );
}
