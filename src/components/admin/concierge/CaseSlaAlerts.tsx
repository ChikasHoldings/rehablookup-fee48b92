import { useMemo } from "react";
import { differenceInHours } from "date-fns";
import { AlertTriangle, Flame, Clock, Zap, UserX, MessageSquareOff, HelpCircle, CalendarOff, Receipt } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export interface CaseSlaData {
  id: string;
  status: string;
  created_at: string;
  updated_at: string;
  matched_at?: string | null;
  introductions_sent_at?: string | null;
  timeline_urgency?: string | null;
  assigned_advisor_id?: string | null;
  payment_status?: string;
  tour_coordination_status?: string;
  admission_status?: string;
  provider_fee_status?: string | null;
  placement_confirmed?: boolean | null;
  seeker_confirmed?: boolean | null;
  introductions_sent_count?: number | null;
}

export interface SlaAlert {
  key: string;
  icon: React.ElementType;
  label: string;
  severity: "critical" | "warning" | "info";
}

/** Calculate SLA alerts for a concierge case */
export function useCaseSlaAlerts(caseData: CaseSlaData | null | undefined): SlaAlert[] {
  return useMemo(() => {
    if (!caseData) return [];
    const alerts: SlaAlert[] = [];
    const now = new Date();
    const updatedAt = new Date(caseData.updated_at);
    const createdAt = new Date(caseData.created_at);
    const hoursSinceUpdate = differenceInHours(now, updatedAt);
    const hoursSinceCreation = differenceInHours(now, createdAt);

    // Skip closed/completed cases
    if (caseData.status === "closed" || caseData.status === "completed") return [];
    const isPlacedComplete = ["admitted", "billed"].includes(caseData.status) &&
      (caseData.provider_fee_status === "paid" || caseData.provider_fee_status === "waived");
    if (isPlacedComplete) return [];

    // 1. High urgency case flag
    if (caseData.timeline_urgency === "immediate") {
      alerts.push({
        key: "urgency",
        icon: Flame,
        label: "High urgency — act now",
        severity: "critical",
      });
    }

    // 2. Overdue follow-up — inactive 12+ hours
    if (hoursSinceUpdate >= 12) {
      alerts.push({
        key: "inactive",
        icon: AlertTriangle,
        label: `Stalled ${hoursSinceUpdate}h — follow up`,
        severity: hoursSinceUpdate >= 24 ? "critical" : "warning",
      });
    }

    // 3. SLA: No first response on new cases (2h+)
    if ((caseData.status === "intake_submitted" || caseData.status === "new") && hoursSinceCreation >= 2) {
      alerts.push({
        key: "first-response",
        icon: Clock,
        label: `No response in ${hoursSinceCreation}h`,
        severity: hoursSinceCreation >= 4 ? "critical" : "warning",
      });
    }

    // 4. No advisor assigned (non-new, 4h+)
    if (!caseData.assigned_advisor_id && caseData.status !== "intake_submitted" && caseData.status !== "new" && hoursSinceCreation >= 4) {
      alerts.push({
        key: "no-advisor",
        icon: UserX,
        label: "No advisor assigned",
        severity: "warning",
      });
    }

    // 5. Matched but no introductions sent (6h+)
    if (
      ["matching_providers", "provider_prequalification", "providers_accepted", "matched", "matching"].includes(caseData.status) &&
      caseData.matched_at
    ) {
      const hoursSinceMatch = differenceInHours(now, new Date(caseData.matched_at));
      if (hoursSinceMatch >= 6 && !caseData.introductions_sent_at) {
        alerts.push({
          key: "intro-delay",
          icon: Zap,
          label: `Matched ${hoursSinceMatch}h ago — send intros`,
          severity: hoursSinceMatch >= 12 ? "critical" : "warning",
        });
      }
    }

    // 6. No provider response — intros sent 24h+ ago with no status change
    if (["presented_to_seeker", "introductions_sent"].includes(caseData.status) && caseData.introductions_sent_at) {
      const hoursSinceIntros = differenceInHours(now, new Date(caseData.introductions_sent_at));
      if (hoursSinceIntros >= 24) {
        alerts.push({
          key: "no-provider-response",
          icon: MessageSquareOff,
          label: `No provider response in ${hoursSinceIntros}h`,
          severity: hoursSinceIntros >= 48 ? "critical" : "warning",
        });
      }
    }

    // 7. Client decision pending too long — seeker_selected/presented for 48h+
    if (["seeker_selected", "presented_to_seeker", "in_contact"].includes(caseData.status) && !caseData.seeker_confirmed && hoursSinceUpdate >= 48) {
      alerts.push({
        key: "seeker-pending",
        icon: HelpCircle,
        label: "Client decision pending 48h+",
        severity: hoursSinceUpdate >= 72 ? "critical" : "warning",
      });
    }

    // 8. Tour not scheduled — seeker selected but no tour
    if (
      ["seeker_selected", "admission_in_progress", "in_contact"].includes(caseData.status) &&
      (!caseData.tour_coordination_status || caseData.tour_coordination_status === "none" || caseData.tour_coordination_status === "not_started") &&
      hoursSinceUpdate >= 24
    ) {
      alerts.push({
        key: "tour-not-scheduled",
        icon: CalendarOff,
        label: "Tour not scheduled",
        severity: "info",
      });
    }

    // 9. Billing pending after admission
    if (
      ["admitted", "billed"].includes(caseData.status) &&
      caseData.provider_fee_status !== "paid" &&
      caseData.provider_fee_status !== "waived"
    ) {
      const placedHours = hoursSinceUpdate;
      alerts.push({
        key: "billing-pending",
        icon: Receipt,
        label: placedHours >= 72 ? "Invoice overdue" : "Invoice pending",
        severity: placedHours >= 72 ? "critical" : "warning",
      });
    }

    return alerts;
  }, [caseData]);
}

const SEVERITY_STYLES: Record<SlaAlert["severity"], string> = {
  critical: "bg-destructive/10 text-destructive border-destructive/30",
  warning: "bg-warning/10 text-warning border-warning/30",
  info: "bg-primary/10 text-primary border-primary/30",
};

/** Compact SLA badge for pipeline cards */
export function CaseSlaCompactBadge({ caseData }: { caseData: CaseSlaData }) {
  const alerts = useCaseSlaAlerts(caseData);
  if (alerts.length === 0) return null;

  const top = alerts[0];
  const Icon = top.icon;

  return (
    <Badge
      variant="outline"
      className={cn(
        "text-[9px] px-1 py-0 h-4 gap-0.5 font-medium",
        SEVERITY_STYLES[top.severity],
      )}
    >
      <Icon className="h-2.5 w-2.5" />
      <span className="truncate max-w-[80px]">{top.label}</span>
    </Badge>
  );
}

/** Inline alert dots for table rows — shows up to 3 icons with tooltips */
export function CaseAlertIcons({ caseData }: { caseData: CaseSlaData }) {
  const alerts = useCaseSlaAlerts(caseData);
  if (alerts.length === 0) return null;

  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex items-center gap-0.5">
        {alerts.slice(0, 3).map((alert) => {
          const Icon = alert.icon;
          return (
            <Tooltip key={alert.key}>
              <TooltipTrigger asChild>
                <span className={cn(
                  "inline-flex items-center justify-center h-5 w-5 rounded-full",
                  alert.severity === "critical" && "bg-destructive/10 text-destructive",
                  alert.severity === "warning" && "bg-warning/10 text-warning",
                  alert.severity === "info" && "bg-primary/10 text-primary",
                )}>
                  <Icon className="h-3 w-3" />
                </span>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs max-w-[200px]">
                {alert.label}
              </TooltipContent>
            </Tooltip>
          );
        })}
        {alerts.length > 3 && (
          <span className="text-[9px] text-muted-foreground font-medium ml-0.5">+{alerts.length - 3}</span>
        )}
      </div>
    </TooltipProvider>
  );
}

/** Full SLA alert banner for case detail sheet */
export function CaseSlaDetailBanner({ caseData }: { caseData: CaseSlaData }) {
  const alerts = useCaseSlaAlerts(caseData);
  if (alerts.length === 0) return null;

  return (
    <div className="space-y-1.5">
      {alerts.map((alert) => {
        const Icon = alert.icon;
        return (
          <div
            key={alert.key}
            className={cn(
              "flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium",
              SEVERITY_STYLES[alert.severity],
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            <span>{alert.severity === "critical" ? "🔥" : alert.severity === "warning" ? "⚠️" : "ℹ️"} {alert.label}</span>
          </div>
        );
      })}
    </div>
  );
}
