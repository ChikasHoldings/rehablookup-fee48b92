/**
 * Single source of truth for the 12-stage placement pipeline.
 * All UI components and logic must reference this config.
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

export interface StageConfig {
  key: PlacementStage;
  label: string;
  shortLabel: string;
  description: string;
  icon: React.ElementType;
  color: string; // Tailwind border-t color
  badgeColor: string; // Badge styling
  nextAction: string;
  actionOwner: "admin" | "advisor" | "seeker" | "facility" | "system";
  tabTarget: string; // Which modal tab to navigate to
}

export const PIPELINE_STAGES: StageConfig[] = [
  {
    key: "intake_submitted",
    label: "Intake Submitted",
    shortLabel: "Intake",
    description: "New intake form received — needs review",
    icon: ClipboardCheck,
    color: "border-t-primary",
    badgeColor: "bg-blue-500/10 text-blue-600 border-blue-500/30",
    nextAction: "Review intake",
    actionOwner: "admin",
    tabTarget: "overview",
  },
  {
    key: "intake_reviewed",
    label: "Intake Reviewed",
    shortLabel: "Reviewed",
    description: "Intake reviewed — assign an advisor",
    icon: Search,
    color: "border-t-amber-500",
    badgeColor: "bg-amber-500/10 text-amber-600 border-amber-500/30",
    nextAction: "Assign advisor",
    actionOwner: "admin",
    tabTarget: "actions",
  },
  {
    key: "advisor_assigned",
    label: "Advisor Assigned",
    shortLabel: "Advisor",
    description: "Advisor assigned — begin matching",
    icon: UserCheck,
    color: "border-t-violet-500",
    badgeColor: "bg-violet-500/10 text-violet-600 border-violet-500/30",
    nextAction: "Run matching",
    actionOwner: "advisor",
    tabTarget: "matching",
  },
  {
    key: "matching_providers",
    label: "Matching Providers",
    shortLabel: "Matching",
    description: "Running placement engine — finding facilities",
    icon: Users,
    color: "border-t-purple-500",
    badgeColor: "bg-purple-500/10 text-purple-600 border-purple-500/30",
    nextAction: "Review matches",
    actionOwner: "advisor",
    tabTarget: "matching",
  },
  {
    key: "provider_prequalification",
    label: "Provider Pre-Qualification",
    shortLabel: "Pre-Qual",
    description: "Verifying facility availability and fit",
    icon: Shield,
    color: "border-t-orange-500",
    badgeColor: "bg-orange-500/10 text-orange-600 border-orange-500/30",
    nextAction: "Confirm providers",
    actionOwner: "advisor",
    tabTarget: "introductions",
  },
  {
    key: "providers_accepted",
    label: "Providers Accepted",
    shortLabel: "Accepted",
    description: "Facilities confirmed — present to seeker",
    icon: CheckCircle,
    color: "border-t-teal-500",
    badgeColor: "bg-teal-500/10 text-teal-600 border-teal-500/30",
    nextAction: "Present to seeker",
    actionOwner: "advisor",
    tabTarget: "introductions",
  },
  {
    key: "presented_to_seeker",
    label: "Presented to Seeker",
    shortLabel: "Presented",
    description: "Options sent to seeker — awaiting decision",
    icon: Send,
    color: "border-t-indigo-500",
    badgeColor: "bg-indigo-500/10 text-indigo-600 border-indigo-500/30",
    nextAction: "Await seeker decision",
    actionOwner: "seeker",
    tabTarget: "messages",
  },
  {
    key: "seeker_selected",
    label: "Seeker Selected",
    shortLabel: "Selected",
    description: "Seeker chose a facility — coordinate admission",
    icon: Eye,
    color: "border-t-cyan-500",
    badgeColor: "bg-cyan-500/10 text-cyan-600 border-cyan-500/30",
    nextAction: "Schedule tour / begin admission",
    actionOwner: "advisor",
    tabTarget: "tours",
  },
  {
    key: "admission_in_progress",
    label: "Admission in Progress",
    shortLabel: "Admitting",
    description: "Admission paperwork and logistics underway",
    icon: Building2,
    color: "border-t-sky-500",
    badgeColor: "bg-sky-500/10 text-sky-600 border-sky-500/30",
    nextAction: "Confirm admission",
    actionOwner: "advisor",
    tabTarget: "actions",
  },
  {
    key: "admitted",
    label: "Admitted",
    shortLabel: "Admitted",
    description: "Seeker admitted to facility — send invoice",
    icon: Home,
    color: "border-t-emerald-500",
    badgeColor: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30",
    nextAction: "Send invoice",
    actionOwner: "admin",
    tabTarget: "billing",
  },
  {
    key: "billed",
    label: "Billed",
    shortLabel: "Billed",
    description: "Invoice sent — awaiting payment",
    icon: DollarSign,
    color: "border-t-lime-500",
    badgeColor: "bg-lime-500/10 text-lime-600 border-lime-500/30",
    nextAction: "Confirm payment",
    actionOwner: "admin",
    tabTarget: "billing",
  },
  {
    key: "completed",
    label: "Completed",
    shortLabel: "Done",
    description: "Placement and billing finalized",
    icon: Flag,
    color: "border-t-success",
    badgeColor: "bg-success/10 text-success border-success/30",
    nextAction: "Complete",
    actionOwner: "system",
    tabTarget: "overview",
  },
];

export const CLOSED_STAGE: StageConfig = {
  key: "closed",
  label: "Closed",
  shortLabel: "Closed",
  description: "Case closed without completion",
  icon: XCircle,
  color: "border-t-muted-foreground",
  badgeColor: "bg-muted text-muted-foreground border-border",
  nextAction: "Closed",
  actionOwner: "system",
  tabTarget: "timeline",
};

/** Valid forward transitions — mirrors DB trigger exactly */
export const VALID_TRANSITIONS: Record<PlacementStage, PlacementStage[]> = {
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

/** Get the next forward stage (non-closed) */
export function getNextStage(current: PlacementStage): PlacementStage | null {
  const allowed = VALID_TRANSITIONS[current];
  if (!allowed) return null;
  return allowed.find(s => s !== "closed") || null;
}

/** Get stage config by key */
export function getStageConfig(key: string): StageConfig {
  return PIPELINE_STAGES.find(s => s.key === key) || (key === "closed" ? CLOSED_STAGE : PIPELINE_STAGES[0]);
}

/** Get the numeric index (0-based) of a stage */
export function getStageIndex(key: string): number {
  if (key === "closed") return -1;
  if (key === "completed") return PIPELINE_STAGES.length - 1;
  const idx = PIPELINE_STAGES.findIndex(s => s.key === key);
  return idx >= 0 ? idx : -1;
}

/** All stage keys in order (excluding closed) */
export const STAGE_KEYS = PIPELINE_STAGES.map(s => s.key);

/** STATUS_CONFIG map for badges — used across components */
export const STATUS_CONFIG: Record<string, { label: string; color: string }> = Object.fromEntries([
  ...PIPELINE_STAGES.map(s => [s.key, { label: s.label, color: s.badgeColor }]),
  ["closed", { label: "Closed", color: CLOSED_STAGE.badgeColor }],
]);
