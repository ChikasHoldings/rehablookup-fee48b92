import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ArrowRight, Clock, AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getCaseNextSteps, type CaseAction, type ActionPriority, type ActionOwner } from "./placementActionUtils";
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
  blocker: { border: "border-destructive/40", bg: "bg-destructive/5", icon: "bg-destructive/10 text-destructive" },
  high: { border: "border-primary/30", bg: "bg-card", icon: "bg-primary/10 text-primary" },
  medium: { border: "border-border", bg: "bg-card", icon: "bg-muted text-muted-foreground" },
  low: { border: "border-border/50", bg: "bg-muted/30", icon: "bg-muted/50 text-muted-foreground/60" },
  done: { border: "border-success/30", bg: "bg-success/5", icon: "bg-success/10 text-success" },
};

/** Compute how many hours since last update */
function getHoursSinceUpdate(caseData: ConciergeInquiry): number {
  const lastUpdate = caseData.updated_at || caseData.created_at;
  if (!lastUpdate) return 0;
  return (Date.now() - new Date(lastUpdate).getTime()) / (1000 * 60 * 60);
}

function getUrgencyInfo(caseData: ConciergeInquiry): { label: string; level: "overdue" | "urgent" | "normal" } | null {
  const hours = getHoursSinceUpdate(caseData);
  const status = caseData.status;

  // Closed / placed+paid = no urgency
  if (status === "closed") return null;
  if (status === "placed" && (caseData.provider_fee_status === "paid" || caseData.provider_fee_status === "waived")) return null;

  // SLA thresholds by status
  const SLA_HOURS: Record<string, number> = {
    new: 4,
    reviewing: 24,
    matching: 48,
    matched: 24,
    introductions_sent: 48,
    in_contact: 72,
    placed: 168, // 7 days for billing
  };

  const sla = SLA_HOURS[status];
  if (!sla) return null;

  if (hours > sla) {
    return { label: `Overdue — ${Math.round(hours - sla)}h past SLA`, level: "overdue" };
  }
  if (hours > sla * 0.75) {
    return { label: `Due soon — ${Math.round(sla - hours)}h remaining`, level: "urgent" };
  }
  return null;
}

export function PlacementNextSteps({ caseData, introsCount, toursCount, onSwitchTab }: PlacementNextStepsProps) {
  const steps = getCaseNextSteps(caseData, introsCount, toursCount);
  if (steps.length === 0) return null;

  const primaryStep = steps[0];
  const remainingSteps = steps.slice(1);
  const hasBlocker = primaryStep.priority === "blocker";
  const urgency = getUrgencyInfo(caseData);
  const isOverdue = urgency?.level === "overdue";

  return (
    <div className={cn(
      "rounded-xl border-2 p-4 space-y-3",
      hasBlocker ? "border-destructive/30 bg-destructive/5"
        : isOverdue ? "border-orange-400/40 bg-orange-50/50 dark:bg-orange-950/20"
        : "border-primary/20 bg-primary/5"
    )}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {hasBlocker ? (
            <AlertTriangle className="h-4 w-4 text-destructive" />
          ) : isOverdue ? (
            <Clock className="h-4 w-4 text-orange-500" />
          ) : (
            <ArrowRight className="h-4 w-4 text-primary" />
          )}
          <h4 className={cn("text-sm font-semibold",
            hasBlocker ? "text-destructive"
              : isOverdue ? "text-orange-600 dark:text-orange-400"
              : "text-primary"
          )}>
            {hasBlocker ? "Blocked — Action Required"
              : isOverdue ? "Follow-Up Overdue"
              : "Next Action"}
          </h4>
        </div>
        {urgency && (
          <Badge variant="outline" className={cn("text-[9px]",
            urgency.level === "overdue"
              ? "bg-orange-100 text-orange-700 border-orange-300 dark:bg-orange-900/30 dark:text-orange-400"
              : "bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-900/30 dark:text-amber-400"
          )}>
            <Clock className="h-2.5 w-2.5 mr-1" />
            {urgency.label}
          </Badge>
        )}
      </div>

      {/* Primary action — large, prominent */}
      <PrimaryActionCard step={primaryStep} onSwitchTab={onSwitchTab} isOverdue={isOverdue} />

      {/* Secondary actions — compact list */}
      {remainingSteps.length > 0 && (
        <div className="space-y-1.5 pt-1 border-t border-border/50">
          <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider pt-1">Also pending</p>
          {remainingSteps.map((step, i) => (
            <SecondaryActionRow key={i} step={step} onSwitchTab={onSwitchTab} />
          ))}
        </div>
      )}
    </div>
  );
}

function PrimaryActionCard({ step, onSwitchTab, isOverdue }: { step: CaseAction; onSwitchTab: (tab: string) => void; isOverdue: boolean }) {
  const styles = PRIORITY_STYLES[step.priority];
  return (
    <div className={cn("flex items-start gap-3 p-3 rounded-lg border", styles.border, styles.bg)}>
      <div className={cn("h-10 w-10 rounded-lg flex items-center justify-center shrink-0", styles.icon)}>
        <step.icon className="h-5 w-5" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-semibold">{step.label}</span>
          {step.priority === "blocker" && (
            <Badge variant="destructive" className="text-[9px] px-1.5 h-4">Blocker</Badge>
          )}
          <Badge variant="outline" className={cn("text-[9px] px-1.5 h-4", OWNER_COLORS[step.owner])}>
            {step.ownerLabel}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground mt-1">{step.description}</p>
        <Button
          size="sm"
          variant={step.priority === "blocker" ? "destructive" : "default"}
          className="mt-2 h-7 text-xs gap-1"
          onClick={() => onSwitchTab(step.tab)}
        >
          Go to {step.tab === "matching" ? "Placement" : step.tab === "introductions" ? "Intros" : step.tab === "billing" ? "Billing" : step.tab === "actions" ? "Actions" : step.tab === "tours" ? "Tours" : step.tab === "messages" ? "Messages" : step.tab}
          <ArrowRight className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}

function SecondaryActionRow({ step, onSwitchTab }: { step: CaseAction; onSwitchTab: (tab: string) => void }) {
  const styles = PRIORITY_STYLES[step.priority];
  return (
    <button
      onClick={() => onSwitchTab(step.tab)}
      className={cn(
        "w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-left transition-colors hover:bg-muted/60",
        step.priority === "blocker" && "bg-destructive/5"
      )}
    >
      <div className={cn("h-6 w-6 rounded flex items-center justify-center shrink-0", styles.icon)}>
        <step.icon className="h-3.5 w-3.5" />
      </div>
      <span className="text-xs font-medium flex-1 truncate">{step.label}</span>
      <Badge variant="outline" className={cn("text-[8px] px-1 h-3.5 shrink-0", OWNER_COLORS[step.owner])}>
        {step.ownerLabel}
      </Badge>
      <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />
    </button>
  );
}
