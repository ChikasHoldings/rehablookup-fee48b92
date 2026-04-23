/**
 * Single source of truth for status-transition rules across the platform.
 *
 * These maps MUST stay in sync with the corresponding Postgres trigger functions:
 *   - concierge: public.validate_concierge_status_transition
 *   - leads:     public.validate_lead_status_transition
 *   - invoices:  public.validate_invoice_status_transition
 *
 * Client-side enforcement is a UX guard. The DB triggers remain the
 * authoritative gate — never weaken or bypass them based on this file.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Concierge inquiries
// ─────────────────────────────────────────────────────────────────────────────

export const CONCIERGE_STATUSES = [
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
export type ConciergeStatus = (typeof CONCIERGE_STATUSES)[number];

/** Valid forward transitions for concierge_inquiries.status. */
export const CONCIERGE_TRANSITIONS: Record<ConciergeStatus, ConciergeStatus[]> = {
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

// ─────────────────────────────────────────────────────────────────────────────
// Leads
// ─────────────────────────────────────────────────────────────────────────────

export const LEAD_STATUSES = [
  "new",
  "unlocked",
  "contacted",
  "in_progress",
  "responding",
  "converted",
  "lost",
  "closed",
  "expired",
] as const;
export type LeadStatusValue = (typeof LEAD_STATUSES)[number];

export const LEAD_TRANSITIONS: Record<LeadStatusValue, LeadStatusValue[]> = {
  new: ["contacted", "unlocked", "responding", "closed", "expired"],
  unlocked: ["contacted", "in_progress", "responding", "converted", "lost", "closed"],
  contacted: ["in_progress", "responding", "converted", "lost", "closed"],
  in_progress: ["contacted", "responding", "converted", "lost", "closed"],
  responding: ["in_progress", "contacted", "converted", "lost", "closed"],
  converted: ["closed"],
  lost: ["contacted", "in_progress", "closed"],
  closed: [],
  expired: ["unlocked", "closed"],
};

// ─────────────────────────────────────────────────────────────────────────────
// Placement invoices
// ─────────────────────────────────────────────────────────────────────────────

export const INVOICE_STATUSES = [
  "pending",
  "sent",
  "paid",
  "overdue",
  "failed",
  "waived",
  "refunded",
  "delinquent",
] as const;
export type InvoiceStatus = (typeof INVOICE_STATUSES)[number];

/** Statuses from which the trigger forbids ANY further status change. */
export const INVOICE_TERMINAL_STATUSES: ReadonlySet<InvoiceStatus> = new Set([
  "paid",
  "refunded",
  "waived",
]);

/** Admin invoice actions that mutate status server-side. */
export type InvoiceAction = "waive" | "override" | "mark_paid" | "send_reminder" | "retry_charge";

/**
 * Returns true if the given admin action is allowed against an invoice in
 * its current status. Mirrors the gating in admin-manage-invoice + the
 * validate_invoice_status_transition trigger.
 */
export function isInvoiceActionAllowed(action: InvoiceAction, currentStatus: string): boolean {
  const status = currentStatus as InvoiceStatus;

  // Terminal invoices may not be mutated at all.
  if (INVOICE_TERMINAL_STATUSES.has(status)) return false;

  switch (action) {
    case "waive":
    case "override":
    case "mark_paid":
      // Allowed from any non-terminal state.
      return true;
    case "send_reminder":
      // Reminders only meaningful while awaiting payment.
      return status === "sent" || status === "overdue" || status === "delinquent" || status === "failed";
    case "retry_charge":
      // Retries only meaningful when the prior attempt failed/lapsed.
      return status === "failed" || status === "overdue" || status === "delinquent" || status === "pending";
    default:
      return false;
  }
}

/**
 * Human-readable explanation for why a given invoice action is currently
 * disabled. Returns null when the action is allowed.
 */
export function explainInvoiceActionBlock(action: InvoiceAction, currentStatus: string): string | null {
  if (isInvoiceActionAllowed(action, currentStatus)) return null;
  if (INVOICE_TERMINAL_STATUSES.has(currentStatus as InvoiceStatus)) {
    return `Invoice is ${currentStatus} — terminal status cannot be changed`;
  }
  return `Action "${action}" is not allowed from status "${currentStatus}"`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Generic helpers
// ─────────────────────────────────────────────────────────────────────────────

export type TransitionDomain = "concierge" | "lead";

const TRANSITION_MAPS: Record<TransitionDomain, Record<string, readonly string[]>> = {
  concierge: CONCIERGE_TRANSITIONS,
  lead: LEAD_TRANSITIONS,
};

export interface TransitionResult {
  ok: boolean;
  /** Human-readable reason when ok=false; suitable for toast/inline error. */
  reason?: string;
  /** All statuses currently reachable from `from`. */
  allowed: readonly string[];
}

/**
 * Validate a status transition against the rules for the given domain.
 * Same-status updates are always allowed (no-op), matching DB triggers.
 */
export function validateTransition(
  domain: TransitionDomain,
  from: string,
  to: string,
): TransitionResult {
  const map = TRANSITION_MAPS[domain];
  const allowed = map[from] ?? [];

  if (from === to) return { ok: true, allowed };

  if (!(from in map)) {
    return {
      ok: false,
      reason: `Unknown ${domain} status "${from}"`,
      allowed,
    };
  }

  if (!allowed.includes(to)) {
    const allowedLabel = allowed.length ? allowed.join(", ") : "none (terminal state)";
    return {
      ok: false,
      reason: `Cannot change ${domain} status from "${from}" to "${to}". Allowed: ${allowedLabel}`,
      allowed,
    };
  }

  return { ok: true, allowed };
}

/** Convenience: list of statuses reachable from `from` in the given domain. */
export function getAllowedTransitions(domain: TransitionDomain, from: string): readonly string[] {
  return TRANSITION_MAPS[domain][from] ?? [];
}
