/**
 * Single source of truth for the placement pipeline.
 * 14 granular DB statuses grouped into 7 visual stages for a clean UI.
 */

import {
  ClipboardCheck, Search, UserCheck, Users, Shield, CheckCircle,
  Send, Eye, Building2, Home, DollarSign, Flag, XCircle, FileEdit,
} from "lucide-react";

export type PlacementStage =
  | "pending_intake"
  | "intake_submitted"
  | "intake_reviewed"
  | "advisor_assigned"
  | "matching_providers"
  | "provider_prequalification"
  | "providers_accepted"
  | "presented_to_seeker"
  | "seeker_selected"
  | "admission_in_progress"
  | "admitted"
  | "billed"
  | "completed"
  | "closed";

/** Visual groups shown in UI — each maps to 1+ DB statuses */
export type VisualStage = "intake" | "reviewing" | "matching" | "presented" | "admission" | "billing" | "completed";

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
    dbStatuses: ["pending_intake", "intake_submitted"],
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
    dbStatuses: ["matching_providers", "provider_prequalification", "providers_accepted"],
  },
  {
    key: "presented",
    label: "Presented",
    icon: Send,
    color: "border-t-indigo-500",
    badgeColor: "bg-indigo-500/10 text-indigo-600 border-indigo-500/30",
    dbStatuses: ["presented_to_seeker", "seeker_selected"],
  },
  {
    key: "admission",
    label: "Admission",
    icon: Building2,
    color: "border-t-sky-500",
    badgeColor: "bg-sky-500/10 text-sky-600 border-sky-500/30",
    dbStatuses: ["admission_in_progress", "admitted"],
  },
  {
    key: "billing",
    label: "Billing",
    icon: DollarSign,
    color: "border-t-lime-500",
    badgeColor: "bg-lime-500/10 text-lime-600 border-lime-500/30",
    dbStatuses: ["billed"],
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

export const PIPELINE_STAGES: StageConfig[] = [
  { key: "pending_intake", label: "Pending Intake", shortLabel: "Pending", description: "Intake started but not yet submitted", icon: FileEdit, color: "border-t-muted-foreground", badgeColor: "bg-slate-500/10 text-slate-600 border-slate-500/30", nextAction: "Follow up on intake", actionOwner: "admin", tabTarget: "overview" },
  { key: "intake_submitted", label: "Intake Submitted", shortLabel: "Submitted", description: "Intake received — needs review", icon: ClipboardCheck, color: "border-t-primary", badgeColor: "bg-blue-500/10 text-blue-600 border-blue-500/30", nextAction: "Review intake", actionOwner: "admin", tabTarget: "seeker" },
  { key: "intake_reviewed", label: "Reviewed", shortLabel: "Reviewed", description: "Reviewed — assign advisor", icon: Search, color: "border-t-amber-500", badgeColor: "bg-amber-500/10 text-amber-600 border-amber-500/30", nextAction: "Assign advisor", actionOwner: "admin", tabTarget: "actions" },
  { key: "advisor_assigned", label: "Advisor Assigned", shortLabel: "Assigned", description: "Advisor assigned — begin matching", icon: UserCheck, color: "border-t-violet-500", badgeColor: "bg-violet-500/10 text-violet-600 border-violet-500/30", nextAction: "Run matching", actionOwner: "advisor", tabTarget: "matching" },
  { key: "matching_providers", label: "Finding Matches", shortLabel: "Matching", description: "Finding matching facilities", icon: Users, color: "border-t-purple-500", badgeColor: "bg-purple-500/10 text-purple-600 border-purple-500/30", nextAction: "Review matches", actionOwner: "advisor", tabTarget: "matching" },
  { key: "provider_prequalification", label: "Pre-Qualifying", shortLabel: "Pre-Qual", description: "Verifying facility fit", icon: Shield, color: "border-t-orange-500", badgeColor: "bg-orange-500/10 text-orange-600 border-orange-500/30", nextAction: "Send introductions", actionOwner: "advisor", tabTarget: "intros" },
  { key: "providers_accepted", label: "Providers Ready", shortLabel: "Ready", description: "Facilities confirmed — present to seeker", icon: CheckCircle, color: "border-t-teal-500", badgeColor: "bg-teal-500/10 text-teal-600 border-teal-500/30", nextAction: "Present to seeker", actionOwner: "advisor", tabTarget: "intros" },
  { key: "presented_to_seeker", label: "Awaiting Decision", shortLabel: "Awaiting", description: "Options sent — awaiting seeker decision", icon: Send, color: "border-t-indigo-500", badgeColor: "bg-indigo-500/10 text-indigo-600 border-indigo-500/30", nextAction: "Follow up with seeker", actionOwner: "seeker", tabTarget: "decision" },
  { key: "seeker_selected", label: "Seeker Selected", shortLabel: "Selected", description: "Seeker chose — coordinate admission", icon: Eye, color: "border-t-cyan-500", badgeColor: "bg-cyan-500/10 text-cyan-600 border-cyan-500/30", nextAction: "Begin admission", actionOwner: "advisor", tabTarget: "admission" },
  { key: "admission_in_progress", label: "Admitting", shortLabel: "Admitting", description: "Admission underway", icon: Building2, color: "border-t-sky-500", badgeColor: "bg-sky-500/10 text-sky-600 border-sky-500/30", nextAction: "Confirm admission", actionOwner: "advisor", tabTarget: "admission" },
  { key: "admitted", label: "Admitted", shortLabel: "Admitted", description: "Admitted — send invoice", icon: Home, color: "border-t-emerald-500", badgeColor: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30", nextAction: "Send invoice", actionOwner: "admin", tabTarget: "billing" },
  { key: "billed", label: "Billed", shortLabel: "Billed", description: "Invoice sent — awaiting payment", icon: DollarSign, color: "border-t-lime-500", badgeColor: "bg-lime-500/10 text-lime-600 border-lime-500/30", nextAction: "Confirm payment", actionOwner: "admin", tabTarget: "billing" },
  { key: "completed", label: "Completed", shortLabel: "Done", description: "Placement finalized", icon: Flag, color: "border-t-success", badgeColor: "bg-success/10 text-success border-success/30", nextAction: "Complete", actionOwner: "system", tabTarget: "overview" },
];

export const CLOSED_STAGE: StageConfig = {
  key: "closed", label: "Closed", shortLabel: "Closed", description: "Case closed", icon: XCircle, color: "border-t-muted-foreground", badgeColor: "bg-muted text-muted-foreground border-border", nextAction: "Closed", actionOwner: "system", tabTarget: "overview",
};

/** Valid forward transitions */
export const VALID_TRANSITIONS: Record<PlacementStage, PlacementStage[]> = {
  pending_intake: ["intake_submitted", "closed"],
  intake_submitted: ["intake_reviewed", "closed"],
  intake_reviewed: ["advisor_assigned", "closed"],
  advisor_assigned: ["matching_providers", "closed"],
  matching_providers: ["provider_prequalification", "closed"],
  provider_prequalification: ["providers_accepted", "closed"],
  providers_accepted: ["presented_to_seeker", "closed"],
  presented_to_seeker: ["seeker_selected", "closed"],
  seeker_selected: ["admission_in_progress", "closed"],
  admission_in_progress: ["admitted", "closed"],
  admitted: ["billed", "closed"],
  billed: ["completed"],
  completed: [],
  closed: [],
};

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
]);
