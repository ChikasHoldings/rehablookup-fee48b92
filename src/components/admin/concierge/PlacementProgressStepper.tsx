import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Check, ChevronRight, AlertTriangle, Circle } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface PlacementProgressStepperProps {
  currentStatus: string;
  onAdvance?: (nextStatus: string) => void;
  disabled?: boolean;
  compact?: boolean;
  blocker?: string | null;
}

const STEPS = [
  { key: "new", label: "New", description: "Case submitted by seeker" },
  { key: "reviewing", label: "Reviewing", description: "Admin reviewing intake details" },
  { key: "matching", label: "Placing", description: "Finding suitable treatment centers" },
  { key: "matched", label: "Facilities Found", description: "Matching facilities identified" },
  { key: "introductions_sent", label: "Intros Sent", description: "Facilities notified about the case" },
  { key: "in_contact", label: "In Contact", description: "Coordinating between seeker and facilities" },
  { key: "placed", label: "Placed", description: "Seeker admitted to a facility" },
];

const STATUS_ORDER: Record<string, number> = {};
STEPS.forEach((s, i) => { STATUS_ORDER[s.key] = i; });

export function PlacementProgressStepper({ currentStatus, onAdvance, disabled, compact, blocker }: PlacementProgressStepperProps) {
  const currentIndex = STATUS_ORDER[currentStatus] ?? -1;
  const isClosed = currentStatus === "closed";

  if (isClosed) {
    return (
      <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 border">
        <Badge variant="destructive" className="text-xs">Closed</Badge>
        <span className="text-sm text-muted-foreground">This case has been closed</span>
      </div>
    );
  }

  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex items-center gap-0.5 overflow-x-auto pb-1">
        {STEPS.map((step, i) => {
          const isComplete = i < currentIndex;
          const isCurrent = i === currentIndex;
          const isNext = i === currentIndex + 1;
          const isFuture = i > currentIndex + 1;
          const hasBlocker = isCurrent && !!blocker;

          return (
            <div key={step.key} className="flex items-center shrink-0">
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    className={cn(
                      "flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all",
                      isComplete && "bg-success/10 text-success",
                      isCurrent && !hasBlocker && "bg-primary/10 text-primary ring-1 ring-primary/30",
                      isCurrent && hasBlocker && "bg-destructive/10 text-destructive ring-1 ring-destructive/30",
                      isNext && onAdvance && !disabled && "bg-muted hover:bg-accent cursor-pointer",
                      isFuture && "text-muted-foreground/40",
                      (!isNext || !onAdvance || disabled) && !isComplete && !isCurrent && "cursor-default"
                    )}
                    onClick={() => {
                      if (isNext && onAdvance && !disabled && step.key !== "placed") {
                        onAdvance(step.key);
                      }
                    }}
                    disabled={!isNext || !onAdvance || disabled}
                  >
                    {isComplete ? (
                      <Check className="h-3 w-3" />
                    ) : isCurrent && hasBlocker ? (
                      <AlertTriangle className="h-3 w-3" />
                    ) : isCurrent ? (
                      <Circle className="h-3 w-3 fill-current" />
                    ) : null}
                    <span className="whitespace-nowrap">
                      {compact && step.label.length > 8 ? step.label.slice(0, 6) + "…" : step.label}
                    </span>
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-[200px]">
                  <p className="font-medium">{step.label}</p>
                  <p className="text-xs text-muted-foreground">{step.description}</p>
                  {isCurrent && hasBlocker && (
                    <p className="text-xs text-destructive mt-1">⚠ {blocker}</p>
                  )}
                  {isNext && onAdvance && (
                    <p className="text-xs text-primary mt-1">Click to advance →</p>
                  )}
                </TooltipContent>
              </Tooltip>
              {i < STEPS.length - 1 && (
                <ChevronRight className={cn(
                  "h-3 w-3 mx-0.5 shrink-0",
                  i < currentIndex ? "text-success/50" : "text-muted-foreground/20"
                )} />
              )}
            </div>
          );
        })}
      </div>
    </TooltipProvider>
  );
}
