/**
 * Structured metrics / log counters for `email_rejected` outcomes.
 *
 * Every recipient guard rejection emits a single line that is trivially
 * queryable in Supabase Edge Function logs (and any downstream sink that
 * scrapes them). The shape is stable so dashboards can pivot on it
 * without parsing free-form messages:
 *
 *   {
 *     metric: "email_rejected",
 *     reason: "format" | "disposable" | "role",
 *     fn: "send-provider-welcome-email" | "send-provider-welcome-offer-email" | ...,
 *     domain: "<lowercased domain or 'unknown'>",
 *     count: 1,
 *     shortId, facilityId
 *   }
 *
 * Per-instance running totals are also kept so a single warm container
 * can emit a heartbeat-style "rollup" line if ever desired. Counters are
 * intentionally process-local (Deno isolates) — the per-event lines are
 * the source of truth for cross-instance aggregation.
 *
 * IMPORTANT: PII safety — we record the *domain* of a rejected address,
 * never the full email. The local part is never logged here.
 */

import type { RecipientReason } from "./recipient-email-guard.ts";

// Process-local counters. Resets on cold start; that is fine because the
// per-event log lines are aggregated downstream.
const counters: Record<RecipientReason, number> = {
  format: 0,
  disposable: 0,
  role: 0,
};

export interface RejectionMetricContext {
  /** Edge function emitting the rejection (e.g. "send-provider-welcome-email"). */
  fn: string;
  /** Rejection bucket from `checkRecipientEmail`. */
  reason: RecipientReason;
  /** Raw recipient email — only the domain portion is logged. */
  email: string;
  /** Optional correlation IDs. Logged when present. */
  shortId?: string;
  facilityId?: string;
  /** Optional sub-detail (e.g. "10minutemail.com" for disposable). Safe to log. */
  detail?: string;
}

function safeDomainOf(email: string): string {
  if (typeof email !== "string") return "unknown";
  const at = email.lastIndexOf("@");
  if (at < 0 || at === email.length - 1) return "unknown";
  return email.slice(at + 1).trim().toLowerCase() || "unknown";
}

/**
 * Emit a structured `email_rejected` counter line and bump the in-process
 * total. Returns the snapshot of running totals so callers can include
 * them in their own log payloads if they wish.
 */
export function recordEmailRejection(
  ctx: RejectionMetricContext,
): { format: number; disposable: number; role: number; total: number } {
  counters[ctx.reason] = (counters[ctx.reason] ?? 0) + 1;
  const total = counters.format + counters.disposable + counters.role;

  // Single-line, machine-parseable counter. console.log so it lands in
  // the standard edge-function log stream (no PII beyond the domain).
  console.log(
    JSON.stringify({
      metric: "email_rejected",
      reason: ctx.reason,
      fn: ctx.fn,
      domain: safeDomainOf(ctx.email),
      count: 1,
      runningTotal: counters[ctx.reason],
      shortId: ctx.shortId,
      facilityId: ctx.facilityId,
      detail: ctx.detail,
    }),
  );

  return {
    format: counters.format,
    disposable: counters.disposable,
    role: counters.role,
    total,
  };
}

/** Read-only snapshot of the in-process counters. Useful for tests. */
export function getEmailRejectionCounters(): Readonly<
  Record<RecipientReason, number>
> {
  return { ...counters };
}

/** Reset counters. For tests only. */
export function _resetEmailRejectionCountersForTests(): void {
  counters.format = 0;
  counters.disposable = 0;
  counters.role = 0;
}
