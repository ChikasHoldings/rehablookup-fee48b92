/**
 * Concierge funnel analytics — shared payload shape so dashboards can join
 * `concierge_intake_prefilled → concierge_intake_started → concierge_intake_submitted`
 * by `dedup_key` without bespoke logic per event.
 *
 * No PII is ever sent. Only:
 *   • presence flags (`has_*`)
 *   • applied-field flags (`applied_*`)
 *   • lowercased treatment/insurance hints (truncated to 32 chars)
 *   • attribution `source` from `?from=`
 *   • channel ("checkout" | "sms") for the submitted event
 *
 * Dispatches GA4 (`gtag`) and Meta Pixel (`fbq`) custom events. Both are
 * best-effort — caller should not block on failures.
 */

export interface ConciergePrefillContext {
  /** Stable session-scoped key tying prefilled → started → submitted. */
  dedup_key: string;
  /** Attribution source from `?from=` (e.g., "homepage_hero"). */
  source: string;
  has_location: boolean;
  has_treatment: boolean;
  has_insurance: boolean;
  treatment_hint?: string;
  insurance_hint?: string;
  applied_city: boolean;
  applied_state: boolean;
  applied_zip: boolean;
  applied_insurance_carrier: boolean;
  applied_payment_type: boolean;
  applied_level_of_care: boolean;
  applied_any_field: boolean;
}

export type ConciergeFunnelEvent =
  | "concierge_intake_prefilled"
  | "concierge_intake_started"
  | "concierge_intake_submitted";

const META_PIXEL_NAMES: Record<ConciergeFunnelEvent, string> = {
  concierge_intake_prefilled: "ConciergeIntakePrefilled",
  concierge_intake_started: "ConciergeIntakeStarted",
  concierge_intake_submitted: "ConciergeIntakeSubmitted",
};

export function emitConciergeFunnelEvent(
  event: ConciergeFunnelEvent,
  payload: Record<string, unknown>,
): void {
  try {
    (window as any)?.gtag?.("event", event, payload);
    (window as any)?.fbq?.("trackCustom", META_PIXEL_NAMES[event], payload);
  } catch {
    // analytics is best-effort; never block intake flow
  }
}

/**
 * FNV-1a 32-bit. Deterministic, no deps. Used to derive `dedup_key`.
 */
export function fnv1a32(input: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
  }
  return h.toString(16).padStart(8, "0");
}

/**
 * Reads (and lazily creates) the per-tab session id. sessionStorage is the
 * right scope: resets when the tab closes, persists across reloads + bfcache.
 */
export function getOrCreateConciergeSessionId(): string {
  const KEY = "rl_session_id";
  try {
    const existing = sessionStorage.getItem(KEY);
    if (existing) return existing;
    const fresh =
      (crypto as any)?.randomUUID?.() ||
      `s_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
    sessionStorage.setItem(KEY, fresh);
    return fresh;
  } catch {
    // Privacy mode / sandboxed iframe — fall back to per-call ephemeral id.
    return `s_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
  }
}
