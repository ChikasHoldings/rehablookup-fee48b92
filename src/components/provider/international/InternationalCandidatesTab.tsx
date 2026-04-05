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
  Bell,
} from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
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
    onError: (error) => { toast.error(error.message || "Failed to respond"); },
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
      <div className="space-y-5">
        <Skeleton className="h-32 w-full rounded-xl" />
        <div className="grid grid-cols-3 gap-4"><Skeleton className="h-24 rounded-xl" /><Skeleton className="h-24 rounded-xl" /><Skeleton className="h-24 rounded-xl" /></div>
        <Skeleton className="h-40 w-full rounded-xl" />
      </div>
    );
  }

  return (
    <>
    <Card className="overflow-hidden">
      <CardContent className="p-0">
        {/* ── Header ── */}
        <div className="px-5 sm:px-6 py-5 border-b bg-gradient-to-br from-primary/5 via-background to-background">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="h-11 w-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <Globe className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-base font-bold text-foreground">International Placements</h2>
              <p className="text-sm text-muted-foreground mt-0.5">Pre-screened global clients seeking treatment in the United States</p>
            </div>
          </div>
        </div>

        {/* ── Stats ── */}
        <div className="grid grid-cols-3 border-b">
          <StatCard icon={Globe} iconColor="text-amber-500" bgColor="bg-amber-500/10" value={pendingMatches.length} label="Pending" highlight={pendingMatches.length > 0} />
          <StatCard icon={CheckCircle} iconColor="text-emerald-500" bgColor="bg-emerald-500/10" value={acceptedCount} label="Accepted" border />
          <StatCard icon={XCircle} iconColor="text-muted-foreground" bgColor="bg-muted" value={declinedCount} label="Declined" border />
        </div>

        {/* ── Candidates ── */}
        <div className="border-b">
          <div className="flex items-center gap-2.5 px-5 py-3 border-b bg-primary/5">
            <Globe className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">Candidates</h3>
            {pendingMatches.length > 0 && (
              <Badge variant="destructive" className="text-xs h-5 ml-auto">{pendingMatches.length} new</Badge>
            )}
          </div>

          {pendingMatches.length === 0 ? (
            <div className="py-12 text-center px-6">
              <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
                <Globe className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="font-semibold text-foreground text-sm">No pending candidates</p>
              <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">When international clients are matched to your facility, they'll appear here.</p>
            </div>
          ) : (
            <div className="divide-y">
              {pendingMatches.map((match) => (
                <CandidateRow key={match.id} match={match} onRespond={() => setSelectedMatch(match)} />
              ))}
            </div>
          )}
        </div>

        {/* ── Past Responses ── */}
        {respondedMatches.length > 0 && (
          <Collapsible>
            <CollapsibleTrigger className="w-full">
              <div className="flex items-center justify-between px-5 py-3 hover:bg-muted/30 transition-colors">
                <h3 className="text-sm font-semibold text-muted-foreground">Past Responses ({respondedMatches.length})</h3>
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="divide-y border-t">
                {respondedMatches.map((match) => (
                  <div key={match.id} className="flex items-center justify-between px-5 py-3.5 gap-3 hover:bg-muted/30 transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                      <Badge variant={match.status === "accepted" ? "default" : "secondary"} className="shrink-0 gap-1 text-xs">
                        {match.status === "accepted" ? <><CheckCircle className="h-3 w-3" /> Accepted</> : <><XCircle className="h-3 w-3" /> Declined</>}
                      </Badge>
                      <span className="text-sm truncate">
                        {match.international_placement_cases?.client_country} · {(match.international_placement_cases?.intake_data?.primary_concern as string) || "Treatment"}
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground shrink-0">{match.responded_at && format(new Date(match.responded_at), "MMM d, yyyy")}</span>
                  </div>
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}
      </CardContent>
    </Card>

      {/* ── Response Dialog ── */}
      <Dialog open={!!selectedMatch} onOpenChange={() => setSelectedMatch(null)}>
        <DialogContent className="max-w-lg p-0 gap-0 overflow-hidden [&>button]:top-4 [&>button]:right-4 [&>button]:z-[60]">
          <DialogHeader className="p-5 pb-4 border-b bg-muted/20">
            <div className="pr-8">
              <DialogTitle className="flex items-center gap-2 text-lg">
                <Globe className="h-5 w-5 text-primary" />
                International Candidate
              </DialogTitle>
              <DialogDescription className="mt-1">Review this anonymized profile and indicate your interest.</DialogDescription>
            </div>
          </DialogHeader>

          {selectedMatch && (
            <div className="p-5 space-y-5 max-h-[60vh] overflow-y-auto">
              {/* Profile card */}
              <Card className="bg-muted/20">
                <CardContent className="p-4 space-y-3">
                  {selectedMatch.international_placement_cases?.client_country && (
                    <DetailRow icon={MapPin} label="Country" value={selectedMatch.international_placement_cases.client_country} />
                  )}
                  {BUDGET_LABELS[selectedMatch.international_placement_cases?.intake_data?.budget_range as string] && (
                    <DetailRow icon={DollarSign} label="Budget" value={BUDGET_LABELS[selectedMatch.international_placement_cases?.intake_data?.budget_range as string]} />
                  )}
                  <DetailRow icon={Clock} label="Urgency">
                    <UrgencyBadge urgency={selectedMatch.international_placement_cases?.intake_data?.urgency as string} />
                  </DetailRow>
                  <DetailRow icon={User} label="Primary Concern" value={(selectedMatch.international_placement_cases?.intake_data?.primary_concern as string) || "Substance Use"} />
                  {selectedMatch.international_placement_cases?.intake_data?.rehab_style && (
                    <DetailRow icon={Sparkles} label="Preference" value={(selectedMatch.international_placement_cases?.intake_data?.rehab_style as string)?.replace("_", " ")} capitalize />
                  )}
                </CardContent>
              </Card>

              {selectedMatch.international_placement_cases?.intake_data?.notes && (
                <div className="rounded-xl border bg-muted/10 px-4 py-3">
                  <p className="text-sm text-muted-foreground leading-relaxed">{selectedMatch.international_placement_cases?.intake_data?.notes as string}</p>
                </div>
              )}

              {/* Fee notice */}
              <div className="rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-amber-800 dark:text-amber-400">{hasPro ? "$2,400" : "$3,000"} Placement Fee</p>
                    <p className="text-sm text-amber-700 dark:text-amber-500 mt-0.5">Charged only on confirmed admission.{hasPro && " Pro discount applied."}</p>
                  </div>
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium">Notes (optional)</Label>
                <Textarea value={responseNotes} onChange={(e) => setResponseNotes(e.target.value)}
                  placeholder="Add any notes about availability, questions, or concerns..." className="mt-2 min-h-[80px] rounded-xl" />
              </div>
            </div>
          )}

          <DialogFooter className="p-5 pt-4 border-t bg-muted/20 gap-2 sm:gap-2">
            <Button variant="outline" onClick={() => handleRespond("declined")} disabled={respondMutation.isPending} className="flex-1 sm:flex-none h-11">
              <XCircle className="h-4 w-4 mr-1.5" /> Not a Fit
            </Button>
            <Button onClick={() => handleRespond("accepted")} disabled={respondMutation.isPending} className="flex-1 sm:flex-none h-11">
              {respondMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <CheckCircle className="h-4 w-4 mr-1.5" />}
              I'm Interested
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
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

function CandidateRow({ match, onRespond }: { match: InternationalMatch; onRespond: () => void }) {
  const intakeData = match.international_placement_cases?.intake_data || {};
  const urgency = intakeData.urgency as string;
  const urgencyConf = URGENCY_CONFIG[urgency] || URGENCY_CONFIG.flexible;

  return (
    <div className="px-5 py-4 hover:bg-muted/30 transition-colors cursor-pointer group" onClick={onRespond}>
      <div className="flex items-center gap-4">
        <div className="h-11 w-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
          <Globe className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5 flex-wrap">
            <span className="font-semibold text-foreground text-sm">{match.international_placement_cases?.client_country}</span>
            {match.international_placement_cases?.priority === "vip" && (
              <Badge className="bg-gradient-to-r from-amber-500 to-yellow-500 text-white border-0 text-xs px-1.5 py-0">
                <Sparkles className="h-2.5 w-2.5 mr-0.5" /> VIP
              </Badge>
            )}
            <Badge variant="destructive" className="text-xs"><Bell className="h-3 w-3 mr-1" />New</Badge>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>{(intakeData.primary_concern as string) || "Substance Use"}</span>
            <span className="text-muted-foreground/30">·</span>
            <span>{BUDGET_LABELS[intakeData.budget_range as string] || "Budget TBD"}</span>
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <div className="text-right hidden sm:block">
            <Badge variant="outline" className={cn("text-xs", urgencyConf.className)}>{urgencyConf.label}</Badge>
            <p className="text-xs text-muted-foreground mt-1">{format(new Date(match.invited_at), "MMM d")}</p>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
        </div>
      </div>
    </div>
  );
}

function DetailRow({ icon: Icon, label, value, capitalize: cap, children }: {
  icon: React.ElementType; label: string; value?: string; capitalize?: boolean; children?: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3">
      <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
      <span className="text-sm font-medium text-muted-foreground w-28 shrink-0">{label}</span>
      {children || <span className={cn("text-sm text-foreground font-medium", cap && "capitalize")}>{value}</span>}
    </div>
  );
}

function UrgencyBadge({ urgency }: { urgency?: string }) {
  const conf = URGENCY_CONFIG[urgency || ""] || URGENCY_CONFIG.flexible;
  return <Badge variant="outline" className={cn("text-xs", conf.className)}>{conf.label}</Badge>;
}
