import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { ChevronRight, Check } from "lucide-react";

interface PlacementProgressStepperProps {
  currentStatus: string;
  onAdvance?: (nextStatus: string) => void;
  disabled?: boolean;
  compact?: boolean;
}

const STEPS = [
  { key: "new", label: "New" },
  { key: "reviewing", label: "Reviewing" },
  { key: "matching", label: "Placing" },
  { key: "matched", label: "Facilities Found" },
  { key: "introductions_sent", label: "Intros Sent" },
  { key: "in_contact", label: "In Contact" },
  { key: "placed", label: "Placed" },
];

const STATUS_ORDER: Record<string, number> = {};
STEPS.forEach((s, i) => { STATUS_ORDER[s.key] = i; });

export function PlacementProgressStepper({ currentStatus, onAdvance, disabled, compact }: PlacementProgressStepperProps) {
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
    <div className="flex items-center gap-0.5 overflow-x-auto pb-1">
      {STEPS.map((step, i) => {
        const isComplete = i < currentIndex;
        const isCurrent = i === currentIndex;
        const isNext = i === currentIndex + 1;
        const isFuture = i > currentIndex + 1;

        return (
          <div key={step.key} className="flex items-center shrink-0">
            <button
              className={cn(
                "flex items-center gap-1 px-2 py-1.5 rounded-md text-xs font-medium transition-all",
                isComplete && "bg-success/10 text-success",
                isCurrent && "bg-primary/10 text-primary ring-1 ring-primary/30",
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
              ) : null}
              {!compact && <span className="whitespace-nowrap">{step.label}</span>}
              {compact && <span className="whitespace-nowrap">{step.label.length > 8 ? step.label.slice(0, 6) + "…" : step.label}</span>}
            </button>
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
  );
}
