import { cn } from "@/lib/utils";
import { Check, Circle, AlertTriangle, X, ChevronRight } from "lucide-react";
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { PIPELINE_STAGES, CLOSED_STAGE, getStageIndex, type PlacementStage } from "./placementPipelineConfig";

export interface PlacementCaseData {
  status: string;
  payment_status: string;
  assigned_advisor_id: string | null;
  match_count: number | null;
  introductions_sent_count: number | null;
  seeker_confirmed: boolean | null;
  tour_coordination_status: string;
  admission_status: string;
  placement_confirmed: boolean | null;
  provider_fee_status: string | null;
  closed_at: string | null;
}

interface PlacementProgressStepperProps {
  caseData: PlacementCaseData;
  onAdvance?: (nextStatus: string) => void;
  disabled?: boolean;
  compact?: boolean;
}

type StepState = "completed" | "current" | "blocked" | "future" | "skipped";

function deriveStepStates(c: PlacementCaseData): { states: StepState[]; blocker: string | null } {
  const isClosed = c.status === "closed";
  const currentIdx = getStageIndex(c.status);
  const isPaid = c.payment_status === "paid" || c.payment_status === "succeeded";

  if (isClosed) {
    // Mark steps before the point of closure as completed, rest as skipped
    const states: StepState[] = PIPELINE_STAGES.map((_, i) => {
      // Approximate how far the case got before closing
      if (i < currentIdx || (currentIdx === -1 && i === 0)) return "completed";
      return "skipped";
    });
    return { states, blocker: "Case closed" };
  }

  let blocker: string | null = null;
  const states: StepState[] = PIPELINE_STAGES.map((stage, i) => {
    if (i < currentIdx) return "completed";
    if (i === currentIdx) {
      // Check for blockers on current stage
      if (!isPaid && currentIdx > 0) {
        blocker = "Payment pending";
        return "blocked";
      }
      if (!c.assigned_advisor_id && currentIdx >= 2) {
        blocker = "No advisor assigned";
        return "blocked";
      }
      return "current";
    }
    return "future";
  });

  return { states, blocker };
}

const STATE_STYLES: Record<StepState, string> = {
  completed: "bg-success/10 text-success border-success/20",
  current: "bg-primary/10 text-primary border-primary/30 ring-1 ring-primary/30",
  blocked: "bg-destructive/10 text-destructive border-destructive/30 ring-1 ring-destructive/30",
  future: "bg-muted/50 text-muted-foreground/40 border-transparent",
  skipped: "bg-muted/30 text-muted-foreground/25 border-transparent line-through",
};

const CHEVRON_STYLES: Record<StepState, string> = {
  completed: "text-success/50",
  current: "text-primary/40",
  blocked: "text-destructive/40",
  future: "text-muted-foreground/15",
  skipped: "text-muted-foreground/15",
};

export function PlacementProgressStepper({ caseData, compact }: PlacementProgressStepperProps) {
  const { states, blocker } = deriveStepStates(caseData);
  const isClosed = caseData.status === "closed";

  if (isClosed) {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 border">
          <Badge variant="destructive" className="text-xs">Closed</Badge>
          <span className="text-sm text-muted-foreground">This case has been closed</span>
        </div>
        <div className="flex items-center gap-0.5 overflow-x-auto pb-1">
          {PIPELINE_STAGES.map((step, i) => (
            <div key={step.key} className="flex items-center shrink-0">
              <div className={cn("flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium border", STATE_STYLES[states[i]])}>
                {states[i] === "completed" ? <Check className="h-2.5 w-2.5" /> : <X className="h-2.5 w-2.5 opacity-40" />}
                <span className="whitespace-nowrap">{compact ? step.shortLabel : step.label}</span>
              </div>
              {i < PIPELINE_STAGES.length - 1 && (
                <ChevronRight className={cn("h-2.5 w-2.5 mx-0.5 shrink-0", CHEVRON_STYLES[states[i]])} />
              )}
            </div>
          ))}
        </div>
      </div>
    );
  }

  const completedCount = states.filter(s => s === "completed").length;
  const progressPct = Math.round((completedCount / PIPELINE_STAGES.length) * 100);

  return (
    <TooltipProvider delayDuration={200}>
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground font-medium">Placement Progress</span>
          <div className="flex items-center gap-2">
            {blocker && (
              <span className="flex items-center gap-1 text-destructive font-medium">
                <AlertTriangle className="h-3 w-3" />
                {blocker}
              </span>
            )}
            <span className="font-semibold text-foreground">{progressPct}%</span>
          </div>
        </div>

        <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className={cn("h-full rounded-full transition-all duration-500", blocker ? "bg-destructive/70" : "bg-primary")}
            style={{ width: `${progressPct}%` }}
          />
        </div>

        <div className="flex items-center gap-0.5 overflow-x-auto pb-1">
          {PIPELINE_STAGES.map((step, i) => {
            const state = states[i];
            return (
              <div key={step.key} className="flex items-center shrink-0">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className={cn(
                      "flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium border cursor-default transition-all",
                      STATE_STYLES[state]
                    )}>
                      {state === "completed" ? (
                        <Check className="h-2.5 w-2.5" />
                      ) : state === "blocked" ? (
                        <AlertTriangle className="h-2.5 w-2.5" />
                      ) : state === "current" ? (
                        <Circle className="h-2.5 w-2.5 fill-current" />
                      ) : null}
                      <span className="whitespace-nowrap">{compact ? step.shortLabel : step.label}</span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="max-w-[220px]">
                    <p className="font-medium">{step.label}</p>
                    <p className="text-xs text-muted-foreground">{step.description}</p>
                    {state === "completed" && <p className="text-xs text-success mt-1">✓ Completed</p>}
                    {state === "current" && <p className="text-xs text-primary mt-1">● In progress</p>}
                    {state === "blocked" && blocker && <p className="text-xs text-destructive mt-1">⚠ {blocker}</p>}
                  </TooltipContent>
                </Tooltip>
                {i < PIPELINE_STAGES.length - 1 && (
                  <ChevronRight className={cn("h-2.5 w-2.5 mx-0.5 shrink-0", CHEVRON_STYLES[state])} />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </TooltipProvider>
  );
}
