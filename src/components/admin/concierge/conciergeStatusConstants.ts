// Canonical 14-status enum for concierge_inquiries.status —
// kept in sync with statusTransitions.ts and the
// validate_concierge_status_transition Postgres trigger.
//
// Use these constants everywhere in the admin panel to avoid drift between
// dashboards, filters, and counts.

export const CANONICAL_STATUSES = [
  "pending_intake",
  "intake_submitted",
  "intake_reviewed",
  "advisor_assigned",
  "matching_providers",
  "provider_prequalification",
  "providers_accepted",
  "presented_to_seeker",
  "seeker_selected",
  "admission_in_progress",
  "admitted",
  "billed",
  "completed",
  "closed",
] as const;

export type CanonicalStatus = (typeof CANONICAL_STATUSES)[number];

// All non-terminal statuses — used to filter "active" cases.
export const ACTIVE_STATUSES = [
  "pending_intake",
  "intake_submitted",
  "intake_reviewed",
  "advisor_assigned",
  "matching_providers",
  "provider_prequalification",
  "providers_accepted",
  "presented_to_seeker",
  "seeker_selected",
  "admission_in_progress",
] as const;

// Statuses representing successful placements (revenue-bearing).
export const PLACED_STATUSES = ["admitted", "billed", "completed"] as const;

// Terminal statuses — the case is no longer active.
export const TERMINAL_STATUSES = ["completed", "closed"] as const;

// Statuses currently in the matching/intro phase (used for ops dashboards).
export const MATCHING_STATUSES = [
  "matching_providers",
  "provider_prequalification",
  "providers_accepted",
  "presented_to_seeker",
] as const;

// PostgREST `not.in` payload — wrap in parens, comma-separated, no spaces.
export const TERMINAL_STATUSES_NOT_IN = "(completed,closed)";
