import { Badge } from "@/components/ui/badge";
import {
  ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getCaseNextSteps, type CaseAction, type ActionPriority } from "./placementActionUtils";
import type { Database } from "@/integrations/supabase/types";

type ConciergeInquiry = Database["public"]["Tables"]["concierge_inquiries"]["Row"];

interface PlacementNextStepsProps {
  caseData: ConciergeInquiry;
  introsCount: number;
  toursCount: number;
  onSwitchTab: (tab: string) => void;
}

const OWNER_COLORS: Record<string, string> = {
  admin: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  advisor: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  seeker: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  facility: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400",
  system: "bg-muted text-muted-foreground",
};

const PRIORITY_STYLES: Record<ActionPriority, { border: string; bg: string; icon: string }> = {
  blocker: { border: "border-destructive/40", bg: "bg-destructive/5 hover:bg-destructive/10", icon: "bg-destructive/10 text-destructive" },
  high: { border: "border-primary/30", bg: "bg-card hover:bg-primary/5", icon: "bg-primary/10 text-primary" },
  medium: { border: "border-border", bg: "bg-card hover:bg-muted/50", icon: "bg-muted text-muted-foreground" },
  low: { border: "border-border/50", bg: "bg-muted/30 hover:bg-muted/50", icon: "bg-muted/50 text-muted-foreground/60" },
  done: { border: "border-success/30", bg: "bg-success/5", icon: "bg-success/10 text-success" },
};

export function PlacementNextSteps({ caseData, introsCount, toursCount, onSwitchTab }: PlacementNextStepsProps) {
  const steps = getCaseNextSteps(caseData, introsCount, toursCount);

  if (steps.length === 0) return null;

  const hasBlocker = steps.some(s => s.priority === "blocker");

  return (
    <div className={cn(
      "rounded-xl border-2 p-4 space-y-3",
      hasBlocker
        ? "border-destructive/30 bg-destructive/5"
        : "border-primary/20 bg-primary/5"
    )}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ArrowRight className={cn("h-4 w-4", hasBlocker ? "text-destructive" : "text-primary")} />
          <h4 className={cn("text-sm font-semibold", hasBlocker ? "text-destructive" : "text-primary")}>
            {hasBlocker ? "Blocked — Action Required" : "Next Steps"}
          </h4>
        </div>
        <Badge variant="outline" className="text-[9px]">
          {steps.length} action{steps.length > 1 ? "s" : ""}
        </Badge>
      </div>
      <div className="space-y-2">
        {steps.map((step, i) => {
          const styles = PRIORITY_STYLES[step.priority];
          return (
            <button
              key={i}
              onClick={() => onSwitchTab(step.tab)}
              className={cn(
                "w-full flex items-start gap-3 p-3 rounded-lg border text-left transition-colors",
                styles.border, styles.bg
              )}
            >
              <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5", styles.icon)}>
                <step.icon className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium">{step.label}</span>
                  {step.priority === "blocker" && (
                    <Badge variant="destructive" className="text-[9px] px-1.5 h-4">
                      Blocker
                    </Badge>
                  )}
                  {step.priority === "high" && (
                    <Badge variant="outline" className="text-[9px] bg-primary/10 text-primary border-primary/30 px-1.5 h-4">
                      Action needed
                    </Badge>
                  )}
                  <Badge variant="outline" className={cn("text-[9px] px-1.5 h-4", OWNER_COLORS[step.owner])}>
                    {step.ownerLabel}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">{step.description}</p>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0 mt-1" />
            </button>
          );
        })}
      </div>
    </div>
  );
}
