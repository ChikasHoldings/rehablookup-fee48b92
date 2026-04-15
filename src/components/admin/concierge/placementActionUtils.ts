import {
  UserCheck, Play, Send, MessageSquare, CalendarCheck,
  CheckCircle, DollarSign, AlertTriangle, Clock, XCircle,
} from "lucide-react";

export type ActionPriority = "blocker" | "high" | "medium" | "low" | "done";
export type ActionOwner = "admin" | "advisor" | "system" | "seeker" | "facility";

export interface CaseAction {
  label: string;
  tab: string;
  icon: React.ElementType;
  priority: ActionPriority;
  description: string;
  owner: ActionOwner;
  ownerLabel: string;
}

interface CaseSnapshot {
  status: string;
  payment_status: string;
  assigned_advisor_id: string | null;
  match_count: number | null;
  placement_confirmed: boolean | null;
  admission_status: string;
  tour_coordination_status: string;
  provider_fee_status: string | null;
  seeker_confirmed: boolean | null;
  provider_fee_cents: number | null;
}

/** Returns the single most important next-action label for the case list table */
export function getCaseNextAction(c: CaseSnapshot): { label: string; priority: ActionPriority; owner: ActionOwner } {
  const isPaid = c.payment_status === "paid" || c.payment_status === "succeeded";

  if (c.status === "closed") {
    return { label: "Closed", priority: "done", owner: "system" };
  }

  if (c.status === "placed") {
    if (c.provider_fee_status === "paid" || c.provider_fee_status === "waived") {
      return { label: "Complete", priority: "done", owner: "system" };
    }
    return { label: "Send invoice", priority: "high", owner: "admin" };
  }

  // Blockers first
  if (!isPaid && c.status !== "new") {
    return { label: "Awaiting payment", priority: "blocker", owner: "seeker" };
  }
  if (!c.assigned_advisor_id && c.status !== "new") {
    return { label: "Assign advisor", priority: "blocker", owner: "admin" };
  }

  switch (c.status) {
    case "new":
      return { label: "Review intake", priority: "high", owner: "admin" };
    case "reviewing":
      return { label: "Run matching", priority: "high", owner: "advisor" };
    case "matching":
      return (c.match_count || 0) > 0
        ? { label: "Send intros", priority: "high", owner: "advisor" }
        : { label: "Run matching", priority: "high", owner: "advisor" };
    case "matched":
      return { label: "Send intros", priority: "high", owner: "advisor" };
    case "introductions_sent":
      return { label: "Await responses", priority: "medium", owner: "facility" };
    case "in_contact":
      if (c.tour_coordination_status === "scheduled") {
        return { label: "Tour scheduled", priority: "medium", owner: "advisor" };
      }
      return c.seeker_confirmed
        ? { label: "Confirm placement", priority: "high", owner: "admin" }
        : { label: "Coordinate tour/admission", priority: "medium", owner: "advisor" };
    default:
      return { label: "Review case", priority: "medium", owner: "admin" };
  }
}

/** Returns a blocker label if present, null otherwise */
export function getCaseBlocker(c: CaseSnapshot): string | null {
  const isPaid = c.payment_status === "paid" || c.payment_status === "succeeded";
  if (c.status === "closed" || c.status === "placed") return null;

  if (!isPaid && c.status !== "new") return "Payment pending";
  if (!c.assigned_advisor_id && !["new", "closed"].includes(c.status)) return "No advisor";
  return null;
}

/** Full next-steps list for the detail modal */
export function getCaseNextSteps(
  caseData: CaseSnapshot,
  introsCount: number,
  toursCount: number
): CaseAction[] {
  const steps: CaseAction[] = [];
  const isPaid = caseData.payment_status === "paid" || caseData.payment_status === "succeeded";

  // Blockers always first
  if (!isPaid && caseData.status !== "new") {
    steps.push({
      label: "Payment not received",
      tab: "actions",
      icon: AlertTriangle,
      priority: "blocker",
      description: "Intake fee ($29) not yet paid. Avoid sending introductions until confirmed.",
      owner: "seeker",
      ownerLabel: "Waiting on seeker",
    });
  }

  if (!caseData.assigned_advisor_id && !["new", "closed"].includes(caseData.status)) {
    steps.push({
      label: "Assign an advisor",
      tab: "actions",
      icon: UserCheck,
      priority: "blocker",
      description: "This case needs an advisor before placement can proceed.",
      owner: "admin",
      ownerLabel: "Admin action",
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
          owner: "admin",
          ownerLabel: "Admin action",
        });
      }
      steps.push({
        label: "Run placement engine",
        tab: "matching",
        icon: Play,
        priority: caseData.assigned_advisor_id ? "high" : "medium",
        description: "Find matching treatment centers based on seeker criteria.",
        owner: "advisor",
        ownerLabel: "Advisor action",
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
          owner: "advisor",
          ownerLabel: "Advisor action",
        });
      } else {
        steps.push({
          label: "Send introductions to facilities",
          tab: "introductions",
          icon: Send,
          priority: "high",
          description: `${caseData.match_count} match(es) found. Send introductions to start the conversation.`,
          owner: "advisor",
          ownerLabel: "Advisor action",
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
          owner: "advisor",
          ownerLabel: "Advisor action",
        });
      } else {
        steps.push({
          label: "Follow up on introductions",
          tab: "introductions",
          icon: Send,
          priority: "medium",
          description: `${introsCount} introduction(s) sent. Check for provider responses.`,
          owner: "advisor",
          ownerLabel: "Advisor action",
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
        owner: "advisor",
        ownerLabel: "Advisor action",
      });
      if (toursCount === 0) {
        steps.push({
          label: "Schedule tours",
          tab: "tours",
          icon: CalendarCheck,
          priority: "medium",
          description: "Schedule virtual or in-person tours with interested facilities.",
          owner: "advisor",
          ownerLabel: "Advisor action",
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
        owner: "advisor",
        ownerLabel: "Advisor action",
      });
      if (toursCount === 0) {
        steps.push({
          label: "Schedule a tour",
          tab: "tours",
          icon: CalendarCheck,
          priority: "medium",
          description: "Arrange facility visits to help the seeker decide.",
          owner: "advisor",
          ownerLabel: "Advisor action",
        });
      }
      steps.push({
        label: "Confirm placement",
        tab: "actions",
        icon: CheckCircle,
        priority: caseData.seeker_confirmed ? "high" : "medium",
        description: caseData.seeker_confirmed
          ? "Seeker has confirmed — finalize the placement now."
          : "Once seeker confirms, finalize the placement.",
        owner: "admin",
        ownerLabel: "Admin action",
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
          owner: "admin",
          ownerLabel: "Admin action",
        });
      } else {
        steps.push({
          label: "Case complete",
          tab: "overview",
          icon: CheckCircle,
          priority: "done",
          description: "Placement and billing are complete. No further action needed.",
          owner: "system",
          ownerLabel: "Complete",
        });
      }
      break;

    case "closed":
      steps.push({
        label: "Case closed",
        tab: "actions",
        icon: XCircle,
        priority: "done",
        description: "This case has been closed. Review the timeline for details.",
        owner: "system",
        ownerLabel: "Closed",
      });
      break;
  }

  return steps;
}
