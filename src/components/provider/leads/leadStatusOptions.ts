import { LEAD_TRANSITIONS } from "@/lib/statusTransitions";
import type { LeadStatus } from "./LeadStatusBadge";

/**
 * Returns the valid status options a provider can manually set, based on the
 * current status. Sourced from the shared transition map so it stays in sync
 * with the DB trigger (validate_lead_status_transition).
 *
 * Extracted from LeadStatusBadge so that component file only exports a
 * component + types (Fast Refresh / react-refresh requirement).
 */
export function getStatusOptions(currentStatus?: LeadStatus): { value: LeadStatus; label: string }[] {
  // Provider-selectable statuses (excludes system-managed: new, unlocked, expired)
  const allManual: { value: LeadStatus; label: string }[] = [
    { value: "contacted", label: "Contacted" },
    { value: "in_progress", label: "In Progress" },
    { value: "responding", label: "Responding" },
    { value: "converted", label: "Converted" },
    { value: "lost", label: "Lost" },
    { value: "closed", label: "Closed" },
  ];

  if (!currentStatus) return allManual;

  const allowed = LEAD_TRANSITIONS[currentStatus] ?? [];
  return allManual.filter((o) => allowed.includes(o.value));
}
