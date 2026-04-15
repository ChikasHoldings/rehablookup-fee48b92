import { cn } from "@/lib/utils";
import { Check, Circle, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { VISUAL_STAGES, getVisualStageIndex } from "./placementPipelineConfig";

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
  compact?: boolean;
}

export function PlacementProgressStepper({ caseData, compact }: PlacementProgressStepperProps) {
  const isClosed = caseData.status === "closed";
  const currentVisualIdx = getVisualStageIndex(caseData.status);
  const isPaid = caseData.payment_status === "paid" || caseData.payment_status === "succeeded";
  const hasBlocker = (!isPaid && currentVisualIdx > 0) || (!caseData.assigned_advisor_id && currentVisualIdx >= 1);

  if (isClosed) {
    return (
      <div className="flex items-center gap-2 p-2.5 rounded-lg bg-muted/50 border">
        <Badge variant="outline" className="bg-muted text-muted-foreground text-xs">Closed</Badge>
        <span className="text-sm text-muted-foreground">This case has been closed</span>
      </div>
    );
  }

  const completedCount = currentVisualIdx >= 0 ? currentVisualIdx : 0;
  const progressPct = caseData.status === "completed"
    ? 100
    : Math.round((completedCount / VISUAL_STAGES.length) * 100);

  return (
    <div className="space-y-2">
      {/* Progress bar */}
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground font-medium">Progress</span>
        <div className="flex items-center gap-2">
          {hasBlocker && (
            <span className="flex items-center gap-1 text-destructive text-[10px] font-medium">
              <AlertTriangle className="h-3 w-3" />
              {!isPaid && currentVisualIdx > 0 ? "Payment pending" : "No advisor"}
            </span>
          )}
          <span className="font-semibold text-foreground tabular-nums">{progressPct}%</span>
        </div>
      </div>

      <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={cn("h-full rounded-full transition-all duration-500", hasBlocker ? "bg-destructive/70" : "bg-primary")}
          style={{ width: `${progressPct}%` }}
        />
      </div>

      {/* 7 stage dots */}
      <div className="flex items-center justify-between gap-1">
        {VISUAL_STAGES.map((vs, i) => {
          const isDone = i < currentVisualIdx || (caseData.status === "completed" && i <= VISUAL_STAGES.length - 1);
          const isCurrent = i === currentVisualIdx && caseData.status !== "completed";
          const Icon = vs.icon;

          return (
            <div key={vs.key} className="flex-1 text-center">
              <div className={cn(
                "mx-auto h-7 w-7 rounded-full flex items-center justify-center mb-1 transition-colors",
                isDone ? "bg-success/15" : isCurrent ? "bg-primary/15 ring-1 ring-primary/30" : "bg-muted/50"
              )}>
                {isDone ? (
                  <Check className="h-3.5 w-3.5 text-success" />
                ) : isCurrent ? (
                  <Circle className="h-3 w-3 fill-primary text-primary" />
                ) : (
                  <Icon className="h-3 w-3 text-muted-foreground/40" />
                )}
              </div>
              {!compact && (
                <p className={cn("text-[9px] leading-tight", isDone ? "text-success font-medium" : isCurrent ? "text-primary font-semibold" : "text-muted-foreground/50")}>
                  {vs.label}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
