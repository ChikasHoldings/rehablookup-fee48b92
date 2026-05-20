import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  AlertTriangle, Users, Eye, Building2,
  CheckCircle2, ChevronRight, Flame, Timer, Bot,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { getStageConfig, STATUS_CONFIG } from "./placementPipelineConfig";
import { getCaseNextAction, type ActionPriority } from "./placementActionUtils";
import { cn } from "@/lib/utils";

interface CaseRow {
  id: string;
  user_name: string;
  status: string;
  payment_status: string;
  assigned_advisor_id: string | null;
  match_count: number | null;
  placement_confirmed?: boolean | null;
  tour_coordination_status?: string;
  seeker_confirmed?: boolean | null;
  created_at: string;
  updated_at: string;
  introductions_sent_at?: string | null;
  matched_at?: string | null;
  timeline_urgency?: string | null;
}

interface PlacementOpsDashboardProps {
  cases: CaseRow[];
  onCaseClick: (caseId: string) => void;
  advisorNames: Record<string, string>;
  isAdvisor?: boolean;
  currentAdvisorId?: string;
}

// How many hours before a case is considered "stuck" per stage.
// Stages from the retired paid-placement workflow (admission_in_progress,
// admitted, billed) are intentionally omitted — legacy rows fall
// through and are surfaced via the "Close legacy case" prompt
// instead of being tracked as stuck.
const STUCK_THRESHOLDS: Record<string, number> = {
  intake_submitted: 4,
  intake_reviewed: 8,
  advisor_assigned: 12,
  matching_providers: 24,
  matched: 24,
  provider_prequalification: 48,
  providers_accepted: 24,
  presented_to_seeker: 72,
  seeker_selected: 48,
};

function hoursInCurrentStage(c: CaseRow): number {
  const updated = new Date(c.updated_at).getTime();
  return (Date.now() - updated) / (1000 * 60 * 60);
}

function isStuck(c: CaseRow): boolean {
  const threshold = STUCK_THRESHOLDS[c.status];
  if (!threshold) return false;
  return hoursInCurrentStage(c) > threshold;
}

interface CaseBucket {
  key: string;
  label: string;
  icon: React.ElementType;
  color: string;
  badgeColor: string;
  cases: CaseRow[];
  emptyMessage: string;
}

export function PlacementOpsDashboard({
  cases, onCaseClick, advisorNames, isAdvisor = false, currentAdvisorId,
}: PlacementOpsDashboardProps) {
  const activeCases = useMemo(
    () => cases.filter(c => !["completed", "closed"].includes(c.status)),
    [cases]
  );

  const buckets = useMemo((): CaseBucket[] => {
    const stuck = activeCases.filter(c => isStuck(c));
    const awaitingProvider = activeCases.filter(c =>
      ["matched", "provider_prequalification", "providers_accepted"].includes(c.status)
    );
    const awaitingSeeker = activeCases.filter(c =>
      ["presented_to_seeker"].includes(c.status)
    );
    const placed = activeCases.filter(c =>
      // Includes legacy admission_* / billed rows so they don't get
      // lost on the dashboard until they're closed out.
      ["seeker_selected", "admission_in_progress", "admitted", "billed"].includes(c.status)
    );
    const completed = cases.filter(c => c.status === "completed");

    return [
      {
        key: "stuck",
        label: "Stuck / Needs Attention",
        icon: Flame,
        color: "text-destructive",
        badgeColor: "bg-destructive/10 text-destructive border-destructive/30",
        cases: stuck.sort((a, b) => hoursInCurrentStage(b) - hoursInCurrentStage(a)),
        emptyMessage: "No stuck cases — all moving smoothly",
      },
      {
        key: "provider",
        label: "Awaiting Provider Response",
        icon: Building2,
        color: "text-orange-600",
        badgeColor: "bg-orange-500/10 text-orange-600 border-orange-500/30",
        cases: awaitingProvider,
        emptyMessage: "No cases awaiting provider response",
      },
      {
        key: "seeker",
        label: "Awaiting Client Decision",
        icon: Eye,
        color: "text-indigo-600",
        badgeColor: "bg-indigo-500/10 text-indigo-600 border-indigo-500/30",
        cases: awaitingSeeker,
        emptyMessage: "No cases awaiting client decision",
      },
      {
        key: "placed",
        label: "Placed — Ready to Close",
        icon: CheckCircle2,
        color: "text-emerald-600",
        badgeColor: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30",
        cases: placed,
        emptyMessage: "No placed cases pending close",
      },
      {
        key: "completed",
        label: "Completed Placements",
        icon: CheckCircle2,
        color: "text-success",
        badgeColor: "bg-success/10 text-success border-success/30",
        cases: completed.slice(0, 10),
        emptyMessage: "No completed placements yet",
      },
    ];
  }, [activeCases, cases]);

  // Top-level stats
  const totalActive = activeCases.length;
  const stuckCount = buckets[0].cases.length;
  const needsAction = activeCases.filter(c => {
    const action = getCaseNextAction(c);
    return action.priority === "blocker" || action.priority === "high";
  }).length;
  const placedReady = buckets[3].cases.length;
  const autoProcessing = activeCases.filter(c =>
    ["intake_submitted", "matching_providers", "matched"].includes(c.status)
  ).length;

  return (
    <div className="space-y-4">
      {/* Summary Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <SummaryCard
          label="Active Placements"
          value={totalActive}
          icon={Users}
          color="text-primary"
        />
        <SummaryCard
          label="Needs Action"
          value={needsAction}
          icon={AlertTriangle}
          color="text-warning"
          pulse={needsAction > 0}
        />
        <SummaryCard
          label="Stuck Cases"
          value={stuckCount}
          icon={Flame}
          color="text-destructive"
          pulse={stuckCount > 0}
        />
        <SummaryCard
          label="Placed — Ready to Close"
          value={placedReady}
          icon={CheckCircle2}
          color="text-emerald-600"
        />
        <SummaryCard
          label="Auto-Processing"
          value={autoProcessing}
          icon={Bot}
          color="text-violet-600"
        />
      </div>

      {/* Case Buckets */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
        {buckets.map((bucket) => (
          <Card key={bucket.key} className={cn(
            "flex flex-col",
            bucket.cases.length > 0 && bucket.key === "stuck" && "border-destructive/30"
          )}>
            <CardHeader className="py-3 px-4">
              <CardTitle className="text-sm font-medium flex items-center justify-between">
                <span className={cn("flex items-center gap-2", bucket.color)}>
                  <bucket.icon className="h-4 w-4" />
                  {bucket.label}
                </span>
                <Badge variant="outline" className={cn("text-[10px]", bucket.badgeColor)}>
                  {bucket.cases.length}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0 px-4 pb-3 flex-1">
              {bucket.cases.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">{bucket.emptyMessage}</p>
              ) : (
                <ScrollArea className={bucket.cases.length > 4 ? "h-[280px]" : ""}>
                  <div className="space-y-1.5">
                    {bucket.cases.map((c) => (
                      <CaseRow
                        key={c.id}
                        caseData={c}
                        onClick={() => onCaseClick(c.id)}
                        advisorName={c.assigned_advisor_id ? advisorNames[c.assigned_advisor_id] : undefined}
                        showStuckTime={bucket.key === "stuck"}
                      />
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ─── Sub-components ───

function SummaryCard({
  label, value, icon: Icon, color, pulse,
}: { label: string; value: number; icon: React.ElementType; color: string; pulse?: boolean }) {
  return (
    <Card className="relative overflow-hidden">
      <CardContent className="py-3 px-4 flex items-center gap-3">
        <div className={cn("p-2 rounded-lg bg-muted", pulse && "animate-pulse")}>
          <Icon className={cn("h-4 w-4", color)} />
        </div>
        <div>
          <p className={cn("text-xl font-bold tabular-nums", color)}>{value}</p>
          <p className="text-[10px] text-muted-foreground leading-tight">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function CaseRow({
  caseData: c, onClick, advisorName, showStuckTime,
}: {
  caseData: CaseRow;
  onClick: () => void;
  advisorName?: string;
  showStuckTime?: boolean;
}) {
  const action = getCaseNextAction(c);
  const stageConfig = STATUS_CONFIG[c.status];

  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-muted/50 transition-colors text-left group"
    >
      {/* Priority dot */}
      <div className={cn("h-2 w-2 rounded-full shrink-0",
        action.priority === "blocker" ? "bg-destructive animate-pulse" :
        action.priority === "high" ? "bg-warning" :
        action.priority === "done" ? "bg-success" :
        "bg-primary/40"
      )} />

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium truncate max-w-[120px]">{c.user_name}</span>
          <Badge variant="outline" className={cn("text-[9px] px-1 py-0 h-4 shrink-0", stageConfig?.color || "")}>
            {stageConfig?.label || c.status}
          </Badge>
        </div>
        <div className="flex items-center gap-1.5 mt-0.5">
          <span className={cn("text-[10px]",
            action.priority === "blocker" ? "text-destructive font-medium" :
            "text-muted-foreground"
          )}>
            {action.label}
          </span>
          {advisorName && (
            <>
              <span className="text-muted-foreground/30">·</span>
              <span className="text-[10px] text-muted-foreground truncate max-w-[60px]">{advisorName}</span>
            </>
          )}
        </div>
      </div>

      {/* Time */}
      <div className="shrink-0 text-right">
        {showStuckTime ? (
          <div className="flex items-center gap-1 text-destructive">
            <Timer className="h-3 w-3" />
            <span className="text-[10px] font-medium tabular-nums">
              {Math.round(hoursInCurrentStage(c))}h
            </span>
          </div>
        ) : (
          <span className="text-[10px] text-muted-foreground">
            {formatDistanceToNow(new Date(c.updated_at), { addSuffix: true })}
          </span>
        )}
      </div>

      <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/30 group-hover:text-muted-foreground shrink-0" />
    </button>
  );
}
