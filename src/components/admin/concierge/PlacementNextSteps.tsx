import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  UserCheck,
  Play,
  Send,
  MessageSquare,
  CalendarCheck,
  CheckCircle,
  DollarSign,
  AlertTriangle,
  Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Database } from "@/integrations/supabase/types";

type ConciergeInquiry = Database["public"]["Tables"]["concierge_inquiries"]["Row"];

interface PlacementNextStepsProps {
  caseData: ConciergeInquiry;
  introsCount: number;
  toursCount: number;
  onSwitchTab: (tab: string) => void;
}

interface StepAction {
  label: string;
  tab: string;
  icon: React.ElementType;
  priority: "high" | "medium" | "low";
  description: string;
}

function getNextSteps(caseData: ConciergeInquiry, introsCount: number, toursCount: number): StepAction[] {
  const steps: StepAction[] = [];
  const isPaid = caseData.payment_status === "paid" || caseData.payment_status === "succeeded";

  // Payment warning — always first if unpaid
  if (!isPaid) {
    steps.push({
      label: "Payment not received",
      tab: "actions",
      icon: AlertTriangle,
      priority: "high",
      description: "Intake fee ($29) not yet paid. Avoid sending introductions until confirmed.",
    });
  }

  // Status-specific guidance
  switch (caseData.status) {
    case "new":
    case "reviewing":
      if (!caseData.assigned_advisor_id) {
        steps.push({
          label: "Assign an advisor",
          tab: "actions",
          icon: UserCheck,
          priority: "high",
          description: "This case needs an advisor before placement can begin.",
        });
      }
      steps.push({
        label: "Run placement engine",
        tab: "matching",
        icon: Play,
        priority: caseData.assigned_advisor_id ? "high" : "medium",
        description: "Find matching treatment centers based on seeker criteria.",
      });
      break;

    case "matching":
      if ((caseData.match_count || 0) === 0) {
        steps.push({
          label: "Run placement engine",
          tab: "matching",
          icon: Play,
          priority: "high",
          description: "No matches found yet. Run the engine or manually add facilities.",
        });
      } else {
        steps.push({
          label: "Send introductions to facilities",
          tab: "introductions",
          icon: Send,
          priority: "high",
          description: `${caseData.match_count} match(es) found. Send introductions to start the conversation.`,
        });
      }
      break;

    case "matched":
      if (introsCount === 0) {
        steps.push({
          label: "Send introductions",
          tab: "introductions",
          icon: Send,
          priority: "high",
          description: "Facilities are matched. Introduce them to begin coordination.",
        });
      } else {
        steps.push({
          label: "Follow up on introductions",
          tab: "introductions",
          icon: Send,
          priority: "medium",
          description: `${introsCount} introduction(s) sent. Check for provider responses.`,
        });
      }
      break;

    case "introductions_sent":
      steps.push({
        label: "Check provider responses",
        tab: "introductions",
        icon: MessageSquare,
        priority: "high",
        description: "Review which providers accepted or declined. Disclose PII for accepted.",
      });
      if (toursCount === 0) {
        steps.push({
          label: "Schedule tours",
          tab: "tours",
          icon: CalendarCheck,
          priority: "medium",
          description: "Schedule virtual or in-person tours with interested facilities.",
        });
      }
      break;

    case "in_contact":
      steps.push({
        label: "Coordinate with facilities",
        tab: "messages",
        icon: MessageSquare,
        priority: "high",
        description: "Manage communication between seeker and facilities.",
      });
      if (toursCount === 0) {
        steps.push({
          label: "Schedule a tour",
          tab: "tours",
          icon: CalendarCheck,
          priority: "medium",
          description: "Arrange facility visits to help the seeker decide.",
        });
      }
      steps.push({
        label: "Confirm placement",
        tab: "actions",
        icon: CheckCircle,
        priority: "medium",
        description: "Once seeker confirms, finalize the placement.",
      });
      break;

    case "placed":
      if (caseData.provider_fee_status !== "paid" && caseData.provider_fee_status !== "waived") {
        steps.push({
          label: "Complete billing",
          tab: "billing",
          icon: DollarSign,
          priority: "high",
          description: "Placement confirmed. Generate and send the provider invoice.",
        });
      } else {
        steps.push({
          label: "Case complete",
          tab: "overview",
          icon: CheckCircle,
          priority: "low",
          description: "Placement and billing are complete. No further action needed.",
        });
      }
      break;

    case "closed":
      steps.push({
        label: "Case closed",
        tab: "timeline",
        icon: Clock,
        priority: "low",
        description: "This case has been closed. Review the timeline for details.",
      });
      break;
  }

  return steps;
}

export function PlacementNextSteps({ caseData, introsCount, toursCount, onSwitchTab }: PlacementNextStepsProps) {
  const steps = getNextSteps(caseData, introsCount, toursCount);

  if (steps.length === 0) return null;

  return (
    <div className="rounded-xl border-2 border-primary/20 bg-primary/5 p-4 space-y-3">
      <div className="flex items-center gap-2">
        <ArrowRight className="h-4 w-4 text-primary" />
        <h4 className="text-sm font-semibold text-primary">Next Steps</h4>
      </div>
      <div className="space-y-2">
        {steps.map((step, i) => (
          <button
            key={i}
            onClick={() => onSwitchTab(step.tab)}
            className={cn(
              "w-full flex items-start gap-3 p-3 rounded-lg border text-left transition-colors",
              step.priority === "high"
                ? "bg-card border-primary/30 hover:border-primary/50 hover:bg-primary/5"
                : step.priority === "medium"
                ? "bg-card border-border hover:border-primary/30 hover:bg-muted/50"
                : "bg-muted/30 border-border/50 hover:bg-muted/50"
            )}
          >
            <div className={cn(
              "h-8 w-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5",
              step.priority === "high" ? "bg-primary/10 text-primary" :
              step.priority === "medium" ? "bg-muted text-muted-foreground" :
              "bg-muted/50 text-muted-foreground/60"
            )}>
              <step.icon className="h-4 w-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{step.label}</span>
                {step.priority === "high" && (
                  <Badge variant="outline" className="text-[9px] bg-primary/10 text-primary border-primary/30 px-1.5">
                    Action needed
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">{step.description}</p>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0 mt-1" />
          </button>
        ))}
      </div>
    </div>
  );
}
