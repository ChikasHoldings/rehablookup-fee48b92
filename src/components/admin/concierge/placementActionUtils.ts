import {
  UserCheck, Play, Send, MessageSquare, CalendarCheck,
  CheckCircle, DollarSign, AlertTriangle, Clock, XCircle,
  Shield, Eye, Building2, Flag,
} from "lucide-react";
import { getStageConfig, getStageIndex, PIPELINE_STAGES } from "./placementPipelineConfig";

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
  placement_confirmed?: boolean | null;
  admission_status?: string;
  tour_coordination_status?: string;
  provider_fee_status?: string | null;
  seeker_confirmed?: boolean | null;
  provider_fee_cents?: number | null;
}

/** Returns the single most important next-action label for the case list table */
export function getCaseNextAction(c: CaseSnapshot): { label: string; priority: ActionPriority; owner: ActionOwner } {
  if (c.status === "closed") {
    return { label: "Closed", priority: "done", owner: "system" };
  }
  if (c.status === "completed") {
    return { label: "Complete", priority: "done", owner: "system" };
  }

  const isPaid = c.payment_status === "paid" || c.payment_status === "succeeded";

  // Blockers
  if (!isPaid && c.status !== "intake_submitted" && c.status !== "pending_intake") {
    return { label: "Awaiting payment", priority: "blocker", owner: "seeker" };
  }
  if (!c.assigned_advisor_id && getStageIndex(c.status) >= 2) {
    return { label: "Assign advisor", priority: "blocker", owner: "admin" };
  }

  // Stage-specific next action from config
  const config = getStageConfig(c.status);
  const ownerMap: Record<string, ActionOwner> = {
    admin: "admin", advisor: "advisor", seeker: "seeker", facility: "facility", system: "system",
  };

  return {
    label: config.nextAction,
    priority: c.status === "billed" || c.status === "admitted" ? "high" : "medium",
    owner: ownerMap[config.actionOwner] || "admin",
  };
}

/** Returns a blocker label if present, null otherwise */
export function getCaseBlocker(c: CaseSnapshot): string | null {
  if (c.status === "closed" || c.status === "completed") return null;
  const isPaid = c.payment_status === "paid" || c.payment_status === "succeeded";
  if (!isPaid && c.status !== "intake_submitted" && c.status !== "pending_intake") return "Payment pending";
  if (!c.assigned_advisor_id && getStageIndex(c.status) >= 2) return "No advisor";
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
  if (!isPaid && caseData.status !== "intake_submitted" && caseData.status !== "pending_intake") {
    steps.push({
      label: "Payment not received",
      tab: "actions",
      icon: AlertTriangle,
      priority: "blocker",
      description: "Intake fee not yet paid. Avoid sending introductions until confirmed.",
      owner: "seeker",
      ownerLabel: "Waiting on seeker",
    });
  }

  if (!caseData.assigned_advisor_id && getStageIndex(caseData.status) >= 2) {
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

  // Stage-specific guidance
  switch (caseData.status) {
    case "pending_intake":
      steps.push({
        label: "Follow up on incomplete intake",
        tab: "overview",
        icon: Play,
        priority: "medium",
        description: "The seeker started but hasn't submitted their intake form yet.",
        owner: "admin",
        ownerLabel: "Admin action",
      });
      break;

    case "intake_submitted":
      steps.push({
        label: "Review intake details",
        tab: "overview",
        icon: Play,
        priority: "high",
        description: "Review the seeker's intake form and advance to reviewed.",
        owner: "admin",
        ownerLabel: "Admin action",
      });
      break;

    case "intake_reviewed":
      steps.push({
        label: "Assign a placement advisor",
        tab: "actions",
        icon: UserCheck,
        priority: "high",
        description: "Assign an advisor to begin the matching process.",
        owner: "admin",
        ownerLabel: "Admin action",
      });
      break;

    case "advisor_assigned":
      steps.push({
        label: "Run placement engine",
        tab: "matching",
        icon: Play,
        priority: "high",
        description: "Find matching treatment centers based on seeker criteria.",
        owner: "advisor",
        ownerLabel: "Advisor action",
      });
      break;

    case "matching_providers":
      steps.push({
        label: "Review and pre-qualify providers",
        tab: "matching",
        icon: Shield,
        priority: "high",
        description: "Verify facility availability and fit before contacting them.",
        owner: "advisor",
        ownerLabel: "Advisor action",
      });
      break;

    case "provider_prequalification":
      steps.push({
        label: "Send introductions to providers",
        tab: "introductions",
        icon: Send,
        priority: "high",
        description: "Contact qualified facilities and await their acceptance.",
        owner: "advisor",
        ownerLabel: "Advisor action",
      });
      break;

    case "providers_accepted":
      steps.push({
        label: "Present options to seeker",
        tab: "introductions",
        icon: Send,
        priority: "high",
        description: "Share accepted facilities with the seeker for review.",
        owner: "advisor",
        ownerLabel: "Advisor action",
      });
      break;

    case "presented_to_seeker":
      steps.push({
        label: "Await seeker decision",
        tab: "messages",
        icon: Eye,
        priority: "medium",
        description: "The seeker is reviewing their options. Follow up if needed.",
        owner: "seeker",
        ownerLabel: "Waiting on seeker",
      });
      break;

    case "seeker_selected":
      steps.push({
        label: "Schedule tour or begin admission",
        tab: "tours",
        icon: CalendarCheck,
        priority: "high",
        description: "Coordinate a facility visit or start admission paperwork.",
        owner: "advisor",
        ownerLabel: "Advisor action",
      });
      break;

    case "admission_in_progress":
      steps.push({
        label: "Confirm admission",
        tab: "actions",
        icon: Building2,
        priority: "high",
        description: "Verify that the seeker has been admitted to the facility.",
        owner: "advisor",
        ownerLabel: "Advisor action",
      });
      break;

    case "admitted":
      steps.push({
        label: "Send placement invoice",
        tab: "billing",
        icon: DollarSign,
        priority: "high",
        description: "Generate and send the provider invoice for this placement.",
        owner: "admin",
        ownerLabel: "Admin action",
      });
      break;

    case "billed":
      steps.push({
        label: "Confirm payment received",
        tab: "billing",
        icon: DollarSign,
        priority: "high",
        description: "Verify payment has been received, then complete the case.",
        owner: "admin",
        ownerLabel: "Admin action",
      });
      break;

    case "completed":
      steps.push({
        label: "Case complete",
        tab: "overview",
        icon: Flag,
        priority: "done",
        description: "Placement and billing are finalized. No further action needed.",
        owner: "system",
        ownerLabel: "Complete",
      });
      break;

    case "closed":
      steps.push({
        label: "Case closed",
        tab: "timeline",
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
