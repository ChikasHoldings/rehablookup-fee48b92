/**
 * Centralized alerting for **rejected** status transitions across the platform.
 *
 * Whenever a client-side guard (mirror of a Postgres trigger) blocks a status
 * change on an invoice, placement (concierge inquiry), or lead, we record an
 * integrity alert so admins can detect and investigate:
 *   - bugs in the UI that propose impossible transitions,
 *   - drift between client and DB transition rules,
 *   - or potentially malicious / out-of-spec API usage.
 *
 * Every rejection produces three signals:
 *   1. `console.warn` with structured context (always).
 *   2. Sentry breadcrumb via `logAdminWarning` for prod observability.
 *   3. A row in `admin_notifications` so it surfaces in the bell + audit log.
 *
 * The DB triggers remain the authoritative gate. This is purely an
 * observability layer; failures here must never block the user-facing error.
 */
import { supabase } from "@/integrations/supabase/client";
import { logAdminError, logAdminWarning } from "@/lib/adminErrorLogger";

export type TransitionDomain = "invoice" | "placement" | "inquiry" | "lead";

export interface RejectedTransitionAlert {
  /** Which subsystem rejected the change. */
  domain: TransitionDomain;
  /** Where in the UI the attempt originated (component or hook name). */
  source: string;
  /** Status the record was in. */
  fromStatus: string;
  /** Status the user/system tried to move to. */
  toStatus: string;
  /** Affected row id (invoice / inquiry / lead). */
  recordId?: string | null;
  /** Optional admin action label (e.g. "mark_paid", "waive"). */
  action?: string;
  /** Reason returned by the validator, surfaced in the toast. */
  reason: string;
  /** Free-form context for debugging — kept small. */
  context?: Record<string, unknown>;
}

const DOMAIN_TITLES: Record<TransitionDomain, string> = {
  invoice: "Invoice transition rejected",
  placement: "Placement transition rejected",
  inquiry: "Inquiry transition rejected",
  lead: "Lead transition rejected",
};

/**
 * Record a rejected transition. Best-effort — never throws.
 * Returns true when the admin notification was written successfully.
 */
export async function reportRejectedTransition(
  alert: RejectedTransitionAlert,
): Promise<boolean> {
  const { domain, source, fromStatus, toStatus, recordId, action, reason, context } = alert;

  // 1. Local + Sentry breadcrumb (always, regardless of network).
  logAdminWarning(source, `Rejected ${domain} transition ${fromStatus} → ${toStatus}`, {
    domain,
    fromStatus,
    toStatus,
    recordId,
    action,
    reason,
    ...(context || {}),
  });

  // 2. Persist to admin_notifications so it shows in the bell + audit feed.
  try {
    const { data: { user } } = await supabase.auth.getUser();
    const title = DOMAIN_TITLES[domain];
    const message =
      `${source} blocked ${fromStatus} → ${toStatus}` +
      (action ? ` (action: ${action})` : "") +
      ` — ${reason}`;

    const { error } = await supabase.from("admin_notifications").insert({
      type: "transition_rejected",
      title,
      message,
      metadata: {
        domain,
        source,
        from_status: fromStatus,
        to_status: toStatus,
        record_id: recordId ?? null,
        action: action ?? null,
        reason,
        attempted_by_user_id: user?.id ?? null,
        attempted_at: new Date().toISOString(),
        ...(context || {}),
      },
    });

    if (error) {
      logAdminError(source, "transition_rejected_alert_insert_failed", error, { domain, fromStatus, toStatus });
      return false;
    }
    return true;
  } catch (err) {
    logAdminError(source, "transition_rejected_alert_threw", err, { domain, fromStatus, toStatus });
    return false;
  }
}
