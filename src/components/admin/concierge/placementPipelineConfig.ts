/**
 * Single source of truth for the placement pipeline.
 *
 * Rebuilt 2026-05-20 to match the current monetization model:
 *   - No paid-placement product (international + per-admission billing
 *     were retired with placement_invoices + admission_verifications)
 *   - Concierge is a Pro add-on subscription; we coordinate intake →
 *     match → intros → seeker selection. Whether the seeker actually
 *     moves in is between them and the facility, so admission /
 *     billing stages were removed from the workflow.
 *
 * Legacy DB rows with statuses `admission_in_progress`, `admitted`,
 * `billed` still type-check (kept in the union) and collapse into the
 * "Placed" visual stage so any existing data renders correctly until
 * a separate migration consolidates them.
 */

import {
  ClipboardCheck, Search, UserCheck, Users, Shield, CheckCircle,
  Send, Eye, Flag, XCircle, FileEdit,
} from "lucide-react";

export type PlacementStage =
  | "new"
  | "pending_intake"
  | "intake_submitted"
  | "intake_reviewed"
  | "advisor_assigned"
  | "matching_providers"
  | "matched"
  | "provider_prequalification"
  | "providers_accepted"
  | "presented_to_seeker"
  | "seeker_selected"
  // Legacy DB enum members — retained so historical rows type-check.
  | "admission_in_progress"
  | "admitted"
  | "billed"
  | "completed"
  | "closed";

/** Visual groups shown in UI — each maps to 1+ DB statuses */
export type VisualStage = "intake" | "reviewing" | "matching" | "presented" | "placed" | "completed";

export interface VisualStageConfig {
  key: VisualStage;
  label: string;
  icon: React.ElementType;
  color: string;
  badgeColor: string;
  dbStatuses: PlacementStage[];
}

export const VISUAL_STAGES: VisualStageConfig[] = [
  {
    key: "intake",
    label: "Intake",
    icon: ClipboardCheck,
    color: "border-t-primary",
    badgeColor: "bg-blue-500/10 text-blue-600 border-blue-500/30",
    dbStatuses: ["new", "pending_intake", "intake_submitted"],
  },
  {
    key: "reviewing",
    label: "Reviewing",
    icon: Search,
    color: "border-t-amber-500",
    badgeColor: "bg-amber-500/10 text-amber-600 border-amber-500/30",
    dbStatuses: ["intake_reviewed", "advisor_assigned"],
  },
  {
    key: "matching",
    label: "Matching",
    icon: Users,
    color: "border-t-purple-500",
    badgeColor: "bg-purple-500/10 text-purple-600 border-purple-500/30",
    dbStatuses: ["matching_providers", "matched", "provider_prequalification", "providers_accepted"],
  },
  {
    key: "presented",
    label: "Presented",
    icon: Send,
    color: "border-t-indigo-500",
    badgeColor: "bg-indigo-500/10 text-indigo-600 border-indigo-500/30",
    dbStatuses: ["presented_to_seeker"],
  },
  {
    key: "placed",
    label: "Placed",
    icon: CheckCircle,
    color: "border-t-emerald-500",
    badgeColor: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30",
    // The new terminal "placed" state. Includes legacy admission /
    // billing rows so they collapse here visually even though the
    // workflow no longer pushes new cases through those stages.
    dbStatuses: ["seeker_selected", "admission_in_progress", "admitted", "billed"],
  },
  {
    key: "completed",
    label: "Completed",
    icon: Flag,
    color: "border-t-success",
    badgeColor: "bg-success/10 text-success border-success/30",
    dbStatuses: ["completed"],
  },
];

/** Map a DB status to its visual group */
export function getVisualStage(dbStatus: string): VisualStageConfig {
  return VISUAL_STAGES.find(vs => vs.dbStatuses.includes(dbStatus as PlacementStage)) || VISUAL_STAGES[0];
}

export function getVisualStageIndex(dbStatus: string): number {
  return VISUAL_STAGES.findIndex(vs => vs.dbStatuses.includes(dbStatus as PlacementStage));
}

// ─── Granular stage config (kept for transition logic) ───

export interface StageConfig {
  key: PlacementStage;
  label: string;
  shortLabel: string;
  description: string;
  icon: React.ElementType;
  color: string;
  badgeColor: string;
  nextAction: string;
  actionOwner: "admin" | "advisor" | "seeker" | "facility" | "system";
  tabTarget: string;
}

/**
 * Stages that drive the UI stepper + status dropdowns. Admission and
 * billing stages were removed when the paid-placement product was
 * retired; legacy DB rows still type-check via PlacementStage but
 * don't appear in this list (so they're never offered as a target
 * status for a new transition).
 */
export const PIPELINE_STAGES: StageConfig[] = [
  { key: "pending_intake", label: "Pending Intake", shortLabel: "Pending", description: "Intake started but not yet submitted", icon: FileEdit, color: "border-t-muted-foreground", badgeColor: "bg-slate-500/10 text-slate-600 border-slate-500/30", nextAction: "Follow up on intake", actionOwner: "admin", tabTarget: "overview" },
  { key: "intake_submitted", label: "Intake Submitted", shortLabel: "Submitted", description: "Intake received — needs review", icon: ClipboardCheck, color: "border-t-primary", badgeColor: "bg-blue-500/10 text-blue-600 border-blue-500/30", nextAction: "Review intake", actionOwner: "admin", tabTarget: "overview" },
  { key: "intake_reviewed", label: "Reviewed", shortLabel: "Reviewed", description: "Reviewed — assign advisor", icon: Search, color: "border-t-amber-500", badgeColor: "bg-amber-500/10 text-amber-600 border-amber-500/30", nextAction: "Assign advisor", actionOwner: "admin", tabTarget: "actions" },
  { key: "advisor_assigned", label: "Advisor Assigned", shortLabel: "Assigned", description: "Advisor assigned — begin matching", icon: UserCheck, color: "border-t-violet-500", badgeColor: "bg-violet-500/10 text-violet-600 border-violet-500/30", nextAction: "Run matching", actionOwner: "advisor", tabTarget: "matching" },
  { key: "matching_providers", label: "Finding Matches", shortLabel: "Matching", description: "Finding matching facilities", icon: Users, color: "border-t-purple-500", badgeColor: "bg-purple-500/10 text-purple-600 border-purple-500/30", nextAction: "Review matches", actionOwner: "advisor", tabTarget: "matching" },
  { key: "matched", label: "Matched", shortLabel: "Matched", description: "Facilities matched — sending introductions", icon: CheckCircle, color: "border-t-green-500", badgeColor: "bg-green-500/10 text-green-600 border-green-500/30", nextAction: "Send introductions", actionOwner: "system", tabTarget: "intros" },
  { key: "provider_prequalification", label: "Pre-Qualifying", shortLabel: "Pre-Qual", description: "Verifying facility fit", icon: Shield, color: "border-t-orange-500", badgeColor: "bg-orange-500/10 text-orange-600 border-orange-500/30", nextAction: "Send introductions", actionOwner: "advisor", tabTarget: "intros" },
  { key: "providers_accepted", label: "Providers Ready", shortLabel: "Ready", description: "Facilities confirmed — present to client", icon: CheckCircle, color: "border-t-teal-500", badgeColor: "bg-teal-500/10 text-teal-600 border-teal-500/30", nextAction: "Present to client", actionOwner: "advisor", tabTarget: "intros" },
  { key: "presented_to_seeker", label: "Awaiting Decision", shortLabel: "Awaiting", description: "Options sent — awaiting client decision", icon: Send, color: "border-t-indigo-500", badgeColor: "bg-indigo-500/10 text-indigo-600 border-indigo-500/30", nextAction: "Follow up with client", actionOwner: "seeker", tabTarget: "decision" },
  { key: "seeker_selected", label: "Placed", shortLabel: "Placed", description: "Client selected a facility — placement complete", icon: Eye, color: "border-t-emerald-500", badgeColor: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30", nextAction: "Close case", actionOwner: "advisor", tabTarget: "actions" },
  { key: "completed", label: "Completed", shortLabel: "Done", description: "Workflow finished", icon: Flag, color: "border-t-success", badgeColor: "bg-success/10 text-success border-success/30", nextAction: "Complete", actionOwner: "system", tabTarget: "overview" },
];

export const CLOSED_STAGE: StageConfig = {
  key: "closed", label: "Closed", shortLabel: "Closed", description: "Case closed", icon: XCircle, color: "border-t-muted-foreground", badgeColor: "bg-muted text-muted-foreground border-border", nextAction: "Closed", actionOwner: "system", tabTarget: "overview",
};

/**
 * Valid forward transitions.
 *
 * Sourced from the central status-transition module so the UI map stays
 * in sync with the DB trigger (validate_concierge_status_transition).
 */
import { CONCIERGE_TRANSITIONS } from "@/lib/statusTransitions";
export const VALID_TRANSITIONS: Record<PlacementStage, PlacementStage[]> =
  CONCIERGE_TRANSITIONS as Record<PlacementStage, PlacementStage[]>;

export function getNextStage(current: PlacementStage): PlacementStage | null {
  const allowed = VALID_TRANSITIONS[current];
  return allowed?.find(s => s !== "closed") || null;
}

export function getStageConfig(key: string): StageConfig {
  return PIPELINE_STAGES.find(s => s.key === key) || (key === "closed" ? CLOSED_STAGE : PIPELINE_STAGES[0]);
}

export function getStageIndex(key: string): number {
  if (key === "closed") return -1;
  if (key === "completed") return PIPELINE_STAGES.length - 1;
  const idx = PIPELINE_STAGES.findIndex(s => s.key === key);
  return idx >= 0 ? idx : -1;
}

export const STAGE_KEYS = PIPELINE_STAGES.map(s => s.key);

/** STATUS_CONFIG map for badges — used across components */
export const STATUS_CONFIG: Record<string, { label: string; color: string }> = Object.fromEntries([
  ...PIPELINE_STAGES.map(s => [s.key, { label: s.label, color: s.badgeColor }]),
  ["closed", { label: "Closed", color: CLOSED_STAGE.badgeColor }],
  // Legacy DB rows — keep the badges rendering so existing data
  // doesn't show as blank in lists. All collapse to the "Placed"
  // visual stage so users see a single coherent terminal state.
  ["admission_in_progress", { label: "Placed", color: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30" }],
  ["admitted", { label: "Placed", color: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30" }],
  ["billed", { label: "Placed", color: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30" }],
]);
