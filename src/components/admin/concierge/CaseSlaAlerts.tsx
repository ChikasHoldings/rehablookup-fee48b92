import { useMemo } from "react";
import { differenceInHours, differenceInMinutes, format } from "date-fns";
import { AlertTriangle, Flame, Clock, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface CaseSlaData {
  id: string;
  status: string;
  created_at: string;
  updated_at: string;
  matched_at?: string | null;
  introductions_sent_at?: string | null;
  timeline_urgency?: string | null;
  assigned_advisor_id?: string | null;
}

interface SlaAlert {
  key: string;
  icon: typeof AlertTriangle;
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

    // Skip closed/placed cases
    if (caseData.status === "closed" || caseData.status === "placed") return [];

    // 1. High urgency case flag
    if (caseData.timeline_urgency === "immediate") {
      alerts.push({
        key: "urgency",
        icon: Flame,
        label: "High urgency — act now",
        severity: "critical",
      });
    }

    // 2. Case inactive for 12+ hours
    if (hoursSinceUpdate >= 12) {
      alerts.push({
        key: "inactive",
        icon: AlertTriangle,
        label: `Inactive ${hoursSinceUpdate}h`,
        severity: hoursSinceUpdate >= 24 ? "critical" : "warning",
      });
    }

    // 3. SLA: Time to first response (new cases older than 2 hours)
    if (caseData.status === "new" && hoursSinceCreation >= 2) {
      alerts.push({
        key: "first-response",
        icon: Clock,
        label: `No response in ${hoursSinceCreation}h`,
        severity: hoursSinceCreation >= 4 ? "critical" : "warning",
      });
    }

    // 4. SLA: No advisor assigned after 4 hours
    if (!caseData.assigned_advisor_id && hoursSinceCreation >= 4 && caseData.status !== "new") {
      alerts.push({
        key: "no-advisor",
        icon: AlertTriangle,
        label: "No advisor assigned",
        severity: "warning",
      });
    }

    // 5. SLA: Matched but no introductions sent after 6 hours
    if (
      (caseData.status === "matched" || caseData.status === "matching") &&
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

  // Show the most severe alert
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
            <span>{alert.severity === "critical" ? "🔥" : "⚠️"} {alert.label}</span>
          </div>
        );
      })}
    </div>
  );
}
