import { cn } from "@/lib/utils";
import { Check, Circle, AlertTriangle, X, ChevronRight } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";

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

interface VisualStep {
  key: string;
  label: string;
  shortLabel: string;
  description: string;
}

const VISUAL_STEPS: VisualStep[] = [
  { key: "intake_submitted", label: "Intake Submitted", shortLabel: "Intake", description: "Case submitted by seeker" },
  { key: "awaiting_review", label: "Awaiting Review", shortLabel: "Review", description: "Admin reviewing intake details" },
  { key: "advisor_assigned", label: "Advisor Assigned", shortLabel: "Advisor", description: "Case assigned to a placement advisor" },
  { key: "provider_matching", label: "Provider Matching", shortLabel: "Matching", description: "Finding suitable treatment centers" },
  { key: "provider_responses", label: "Provider Responses", shortLabel: "Responses", description: "Facilities reviewing and responding" },
  { key: "seeker_decision", label: "Seeker Decision", shortLabel: "Decision", description: "Seeker reviewing options and choosing" },
  { key: "tour_coordination", label: "Tour Coordination", shortLabel: "Tours", description: "Scheduling facility visits" },
  { key: "admission_progress", label: "Admission in Progress", shortLabel: "Admission", description: "Processing admission paperwork" },
  { key: "admitted", label: "Admitted", shortLabel: "Admitted", description: "Seeker admitted to a facility" },
  { key: "completed", label: "Completed", shortLabel: "Done", description: "Placement and billing finalized" },
];

type StepState = "completed" | "current" | "blocked" | "future" | "skipped";

function deriveStepStates(c: PlacementCaseData): { states: StepState[]; blocker: string | null } {
  const isClosed = c.status === "closed";
  const isPaid = c.payment_status === "paid" || c.payment_status === "succeeded";
  const hasAdvisor = !!c.assigned_advisor_id;
  const hasMatches = (c.match_count || 0) > 0;
  const hasIntros = (c.introductions_sent_count || 0) > 0;
  const seekerConfirmed = !!c.seeker_confirmed;
  const tourActive = c.tour_coordination_status !== "none" && c.tour_coordination_status !== "";
  const admissionActive = c.admission_status !== "none" && c.admission_status !== "" && c.admission_status !== "not_started";
  const isPlaced = c.status === "placed";
  const feeSettled = c.provider_fee_status === "paid" || c.provider_fee_status === "waived";

  // Status ordering for comparison
  const STATUS_ORDER: Record<string, number> = {
    new: 0, reviewing: 1, matching: 2, matched: 3,
    introductions_sent: 4, in_contact: 5, placed: 6, closed: 7,
  };
  const statusIdx = STATUS_ORDER[c.status] ?? -1;

  let blocker: string | null = null;

  if (isClosed) {
    // Find which step was current when closed, mark everything after as skipped
    const states: StepState[] = VISUAL_STEPS.map((_, i) => {
      // Intake is always completed if case exists
      if (i === 0) return "completed";
      // Review completed if past new
      if (i === 1) return statusIdx >= 1 ? "completed" : "skipped";
      if (i === 2) return hasAdvisor ? "completed" : "skipped";
      if (i === 3) return statusIdx >= 2 && hasMatches ? "completed" : "skipped";
      if (i === 4) return hasIntros ? "completed" : "skipped";
      if (i === 5) return seekerConfirmed ? "completed" : "skipped";
      if (i === 6) return tourActive ? "completed" : "skipped";
      if (i === 7) return admissionActive ? "completed" : "skipped";
      if (i === 8) return isPlaced ? "completed" : "skipped";
      if (i === 9) return feeSettled ? "completed" : "skipped";
      return "skipped";
    });
    return { states, blocker: "Case closed" };
  }

  const states: StepState[] = [];

  // 0: Intake Submitted — always done
  states.push("completed");

  // 1: Awaiting Review
  if (statusIdx >= 1) {
    states.push("completed");
  } else {
    states.push("current");
    if (!isPaid) blocker = "Payment pending";
    return { states: padFuture(states), blocker };
  }

  // 2: Advisor Assigned
  if (hasAdvisor) {
    states.push("completed");
  } else {
    blocker = "No advisor assigned";
    states.push("blocked");
    return { states: padFuture(states), blocker };
  }

  // 3: Provider Matching
  if (statusIdx >= 3 && hasMatches) {
    states.push("completed");
  } else if (statusIdx >= 2) {
    states.push("current");
    return { states: padFuture(states), blocker };
  } else {
    states.push("current");
    return { states: padFuture(states), blocker };
  }

  // 4: Provider Responses
  if (statusIdx >= 4 && hasIntros) {
    states.push("completed");
  } else if (statusIdx >= 3) {
    states.push("current");
    return { states: padFuture(states), blocker };
  } else {
    states.push("future");
  }

  // 5: Seeker Decision
  if (seekerConfirmed) {
    states.push("completed");
  } else if (statusIdx >= 5) {
    states.push("current");
    return { states: padFuture(states), blocker };
  } else {
    states.push("future");
  }

  // 6: Tour Coordination
  if (tourActive && statusIdx >= 5) {
    states.push("completed");
  } else if (statusIdx >= 5) {
    states.push("current");
    return { states: padFuture(states), blocker };
  } else {
    states.push("future");
  }

  // 7: Admission in Progress
  if (admissionActive || isPlaced) {
    states.push("completed");
  } else if (statusIdx >= 5) {
    states.push("current");
    return { states: padFuture(states), blocker };
  } else {
    states.push("future");
  }

  // 8: Admitted
  if (isPlaced) {
    states.push("completed");
  } else if (statusIdx >= 5) {
    states.push("current");
    return { states: padFuture(states), blocker };
  } else {
    states.push("future");
  }

  // 9: Completed
  if (isPlaced && feeSettled) {
    states.push("completed");
  } else if (isPlaced) {
    states.push("current");
    blocker = "Invoice pending";
  } else {
    states.push("future");
  }

  return { states, blocker };
}

function padFuture(states: StepState[]): StepState[] {
  while (states.length < VISUAL_STEPS.length) {
    states.push("future");
  }
  return states;
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
          {VISUAL_STEPS.map((step, i) => (
            <div key={step.key} className="flex items-center shrink-0">
              <div className={cn("flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium border", STATE_STYLES[states[i]])}>
                {states[i] === "completed" ? <Check className="h-2.5 w-2.5" /> : <X className="h-2.5 w-2.5 opacity-40" />}
                <span className="whitespace-nowrap">{compact ? step.shortLabel : step.label}</span>
              </div>
              {i < VISUAL_STEPS.length - 1 && (
                <ChevronRight className={cn("h-2.5 w-2.5 mx-0.5 shrink-0", CHEVRON_STYLES[states[i]])} />
              )}
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Calculate progress percentage
  const completedCount = states.filter(s => s === "completed").length;
  const progressPct = Math.round((completedCount / VISUAL_STEPS.length) * 100);

  return (
    <TooltipProvider delayDuration={200}>
      <div className="space-y-2">
        {/* Progress bar header */}
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground font-medium">
            Placement Progress
          </span>
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

        {/* Progress bar */}
        <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className={cn(
              "h-full rounded-full transition-all duration-500",
              blocker ? "bg-destructive/70" : "bg-primary"
            )}
            style={{ width: `${progressPct}%` }}
          />
        </div>

        {/* Step pills */}
        <div className="flex items-center gap-0.5 overflow-x-auto pb-1">
          {VISUAL_STEPS.map((step, i) => {
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
                      <span className="whitespace-nowrap">
                        {compact ? step.shortLabel : step.label}
                      </span>
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
                {i < VISUAL_STEPS.length - 1 && (
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
