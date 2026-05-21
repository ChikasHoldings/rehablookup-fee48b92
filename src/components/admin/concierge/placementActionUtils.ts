/**
 * Next-action logic for the placement workspace.
 *
 * Rebuilt 2026-05-20 with the current monetization model:
 *   - Concierge is a Pro add-on subscription (no per-placement fees)
 *   - Workflow terminates at seeker_selected ("Placed") → closed
 *   - Admission tracking + invoicing flows were removed alongside the
 *     paid-placement product retirement
 *
 * Legacy DB rows in admission_in_progress / admitted / billed are
 * still type-handled (they fall through to the "Placed" terminal
 * presentation) but no UI surface drives new cases into those
 * statuses.
 */
import {
  UserCheck, Play, Send, CheckCircle, AlertTriangle, XCircle,
  Shield, Eye, Flag,
} from "lucide-react";
import { getStageConfig, getStageIndex } from "./placementPipelineConfig";

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
  assigned_advisor_id: string | null;
  match_count: number | null;
  placement_confirmed?: boolean | null;
  tour_coordination_status?: string;
  seeker_confirmed?: boolean | null;
}

/** Returns the single most important next-action label for the case list table */
export function getCaseNextAction(c: CaseSnapshot): { label: string; priority: ActionPriority; owner: ActionOwner } {
  if (c.status === "closed") {
    return { label: "Closed", priority: "done", owner: "system" };
  }
  if (c.status === "completed") {
    return { label: "Complete", priority: "done", owner: "system" };
  }
  // Legacy admission / billed rows collapse into "Placed — close case"
  if (c.status === "admission_in_progress" || c.status === "admitted" || c.status === "billed") {
    return { label: "Close case", priority: "high", owner: "advisor" };
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
    priority: c.status === "seeker_selected" ? "high" : "medium",
    owner: ownerMap[config.actionOwner] || "admin",
  };
}

/** Returns a blocker label if present, null otherwise */
export function getCaseBlocker(c: CaseSnapshot): string | null {
  if (c.status === "closed" || c.status === "completed") return null;
  if (!c.assigned_advisor_id && getStageIndex(c.status) >= 2) return "No advisor";
  return null;
}

/** Full next-steps list for the detail modal */
export function getCaseNextSteps(
  caseData: CaseSnapshot,
  _introsCount: number,
  _toursCount: number,
): CaseAction[] {
  const steps: CaseAction[] = [];

  // Blockers always first
  if (!caseData.assigned_advisor_id && getStageIndex(caseData.status) >= 2) {
    steps.push({
      label: "Assign an advisor",
      tab: "actions",
      icon: UserCheck,
      priority: "blocker",
      description: "This case needs an advisor before matching can proceed.",
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
        description: "The client started but hasn't submitted their intake form yet.",
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
        description: "Review the client's intake form and advance to reviewed.",
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
        description: "Find matching treatment centers based on client criteria.",
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
        tab: "intros",
        icon: Send,
        priority: "high",
        description: "Contact qualified facilities and await their acceptance.",
        owner: "advisor",
        ownerLabel: "Advisor action",
      });
      break;

    case "providers_accepted":
      steps.push({
        label: "Present options to client",
        tab: "intros",
        icon: Send,
        priority: "high",
        description: "Share accepted facilities with the client for review.",
        owner: "advisor",
        ownerLabel: "Advisor action",
      });
      break;

    case "presented_to_seeker":
      steps.push({
        label: "Await client decision",
        tab: "decision",
        icon: Eye,
        priority: "medium",
        description: "The client is reviewing their options. Follow up if needed.",
        owner: "seeker",
        ownerLabel: "Waiting on client",
      });
      break;

    case "seeker_selected":
      steps.push({
        label: "Confirm placement and close case",
        tab: "actions",
        icon: CheckCircle,
        priority: "high",
        description: "Client has selected a facility — finalize and close the case.",
        owner: "advisor",
        ownerLabel: "Advisor action",
      });
      break;

    case "admission_in_progress":
    case "admitted":
    case "billed":
      // Legacy rows from the retired paid-placement workflow — present
      // them as ready-to-close so they stop appearing in active queues.
      steps.push({
        label: "Close legacy case",
        tab: "actions",
        icon: AlertTriangle,
        priority: "high",
        description: "This case is in a status from the retired paid-placement product. Close it to clear the queue.",
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
        description: "Placement workflow finalized. No further action needed.",
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
