/**
 * Concierge funnel analytics — shared payload shape so dashboards can join
 * `concierge_intake_prefilled → concierge_intake_started → concierge_intake_submitted`
 * by `dedup_key` without bespoke logic per event.
 *
 * No PII is ever sent. Only:
 *   • presence flags (`has_*`)
 *   • applied-field flags (`applied_*`)
 *   • sanitized treatment/insurance hints (allow-listed chars, ≤32, no PII)
 *   • attribution `source` from `?from=` (allow-listed chars, ≤40)
 *   • channel ("checkout" | "sms") for the submitted event
 *
 * Hardening (PII defense-in-depth):
 *   • `sanitizeHint` / `sanitizeSource` enforce a strict allow-list and length
 *     before values land in any payload field.
 *   • `emitConciergeFunnelEvent` runs every outgoing payload through a final
 *     recursive scrubber (`scrubPayload`) that drops any string value matching
 *     email, phone, SSN, long-digit, or street-address patterns — even if a
 *     future caller forgets to pre-sanitize.
 *
 * Dispatches GA4 (`gtag`) and Meta Pixel (`fbq`) custom events. Both are
 * best-effort — caller should not block on failures.
 */

import { z } from "zod";

export interface ConciergePrefillContext {
  /** Stable session-scoped key tying prefilled → started → submitted. */
  dedup_key: string;
  /** Attribution source from `?from=` (sanitized). */
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

// ---------- PII detection patterns ----------

/** Email-like (anything@anything.tld). */
const EMAIL_RE = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i;
/** Phone-like: 7+ digits in a row, OR digit groups separated by separators. */
const PHONE_RE = /(?:\+?\d[\s.\-()]*){7,}/;
/** SSN-like (XXX-XX-XXXX) or 9+ raw digits. */
const SSN_RE = /\b\d{3}-\d{2}-\d{4}\b|\b\d{9,}\b/;
/** Street-address-like: leading digits then a street word. */
const STREET_RE =
  /\b\d{1,6}\s+\w+\s+(st|street|ave|avenue|blvd|boulevard|rd|road|ln|lane|dr|drive|ct|court|way|pkwy|parkway|hwy|highway)\b/i;

function looksLikePII(value: string): boolean {
  if (!value) return false;
  if (EMAIL_RE.test(value)) return true;
  if (PHONE_RE.test(value)) return true;
  if (SSN_RE.test(value)) return true;
  if (STREET_RE.test(value)) return true;
  // 4+ consecutive digits anywhere are suspicious for hints (zip, phone fragment, etc.)
  if (/\d{4,}/.test(value)) return true;
  return false;
}

// ---------- Sanitizers ----------

/**
 * Sanitize a `treatment_hint` / `insurance_hint` value for analytics.
 *
 * Rules:
 *  1. Trim + lowercase.
 *  2. Strip everything outside `[a-z0-9 _-]` (drops `@`, digits-runs after PII
 *     check, punctuation, unicode, control chars, etc.).
 *  3. Collapse whitespace.
 *  4. Cap at 32 chars.
 *  5. Drop entirely if the *original* (pre-strip) value matched a PII pattern,
 *     or if the result is empty / under 2 chars.
 *
 * Returns `undefined` when the value should not be emitted.
 */
export function sanitizeHint(raw: unknown): string | undefined {
  const parsed = z
    .string()
    .max(256) // hard cap on input we'll even consider
    .safeParse(raw);
  if (!parsed.success) return undefined;
  const original = parsed.data.trim();
  if (!original) return undefined;
  if (looksLikePII(original)) return undefined;

  const cleaned = original
    .toLowerCase()
    .replace(/[^a-z0-9 _-]+/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 32);

  if (cleaned.length < 2) return undefined;
  return cleaned;
}

/**
 * Sanitize an attribution `source` (e.g. `?from=homepage_hero`).
 * Allow-list is identical to hints but cap is 40 chars and we never reject for
 * being short (a 1-char source is still a valid signal, e.g. `a/b` test arms).
 */
export function sanitizeSource(raw: unknown): string {
  const parsed = z.string().max(256).safeParse(raw);
  if (!parsed.success) return "(direct)";
  const original = parsed.data.trim();
  if (!original) return "(direct)";
  if (looksLikePII(original)) return "(direct)";

  const cleaned = original
    .toLowerCase()
    .replace(/[^a-z0-9 _-]+/g, "")
    .replace(/\s+/g, "_")
    .slice(0, 40);

  return cleaned || "(direct)";
}

// ---------- Outgoing-payload scrubber ----------

/**
 * Defense-in-depth: walk the payload one final time before dispatch and drop
 * any string leaf that looks like PII. Booleans / numbers / sanitized hints
 * pass through untouched. Keys themselves are left alone (we control them).
 */
function scrubPayload(input: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(input)) {
    if (v == null) continue;
    if (typeof v === "string") {
      // Hard length cap on every outgoing string field.
      const trimmed = v.length > 64 ? v.slice(0, 64) : v;
      if (looksLikePII(trimmed)) continue; // drop, never emit
      out[k] = trimmed;
    } else if (typeof v === "number" || typeof v === "boolean") {
      out[k] = v;
    } else {
      // Objects/arrays are not part of our payload contract — drop silently.
    }
  }
  return out;
}

export function emitConciergeFunnelEvent(
  event: ConciergeFunnelEvent,
  payload: Record<string, unknown>,
): void {
  try {
    const safe = scrubPayload(payload);
    (window as unknown as { gtag?: (...a: unknown[]) => void })?.gtag?.(
      "event",
      event,
      safe,
    );
    (window as unknown as { fbq?: (...a: unknown[]) => void })?.fbq?.(
      "trackCustom",
      META_PIXEL_NAMES[event],
      safe,
    );
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
      (crypto as unknown as { randomUUID?: () => string })?.randomUUID?.() ||
      `s_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
    sessionStorage.setItem(KEY, fresh);
    return fresh;
  } catch {
    // Privacy mode / sandboxed iframe — fall back to per-call ephemeral id.
    return `s_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
  }
}
