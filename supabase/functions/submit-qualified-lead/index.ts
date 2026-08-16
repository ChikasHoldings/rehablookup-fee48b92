// ⚠ AUTO-GENERATED HEADER ⚠
// _shared modules have been inlined into this file so that
// `supabase functions deploy --use-api` (server-side bundler)
// can deploy without resolving local relative imports. The
// canonical sources live under supabase/functions/_shared/ —
// don't edit the inlined copies below; edit the originals and
// re-run `python3 scripts/inline-shared.py submit-qualified-lead`.

// ── URL imports (dedup'd) ──────────────────────────────────
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2?target=denonext";
import { Resend } from "https://esm.sh/resend@2.0.0?target=denonext";

// ── inlined from _shared/resilient-email-sender.ts ─────────────
/**
 * Resilient Email Sender
 * 
 * Wraps Resend with:
 * - Automatic retry with exponential backoff (up to 3 attempts)
 * - Suppressed email checking
 * - Full send tracking (sent/failed/retried/dlq) via email_tracking_events
 * - Dead-letter logging for persistent failures
 * 
 * Usage:
 *   import { sendEmailWithRetry } from "../_shared/resilient-email-sender.ts";
 *   const result = await sendEmailWithRetry(supabase, resend, { ...emailParams }, { emailType: "provider_welcome" });
 */

interface EmailParams {
  from: string;
  to: string | string[];
  subject: string;
  html: string;
  headers?: Record<string, string>;
  replyTo?: string | string[];
}

interface SendOptions {
  /** Category for tracking (e.g., "provider_welcome", "lead_notification"). REQUIRED. */
  emailType: string;
  /**
   * Unique key for idempotency. STRONGLY RECOMMENDED for any event-driven
   * email so retries (function re-invocations, cron re-runs, webhook re-deliveries)
   * never produce duplicate sends. Format: `<event>-<id>` (e.g. `lead-new-${leadId}-${facilityId}`).
   */
  idempotencyKey?: string;
  /** Max retry attempts (default: 3) */
  maxRetries?: number;
  /** Whether to check suppressed_emails before sending (default: true) */
  checkSuppression?: boolean;
  /** Additional metadata to store with the tracking event */
  metadata?: Record<string, unknown>;
}

/**
 * Default inter-send delay for bulk email loops (ms).
 * Keeps sends well under Resend's 10 req/s rate limit.
 * Import and use: `await sleep(BULK_SEND_DELAY_MS)` after each send in a loop.
 */
export const BULK_SEND_DELAY_MS = 200;

/** Default max emails per single function invocation */
export const BULK_BATCH_LIMIT = 50;

interface SendResult {
  success: boolean;
  /** True if the email was already sent (idempotency dedup) */
  deduplicated?: boolean;
  /** True if the recipient is suppressed */
  suppressed?: boolean;
  /** Resend email ID on success */
  emailId?: string;
  /** Error message on failure */
  error?: string;
  /** Number of attempts made */
  attempts: number;
  /** Whether the email was sent to dead-letter after all retries */
  deadLettered?: boolean;
  /** ISO timestamp of the original "sent" event when deduplicated. */
  firstSentAt?: string;
}

// SupabaseClient generic enough for service role usage
// deno-lint-ignore no-explicit-any
type SupabaseClient = any;

const LOG_PREFIX = "[RESILIENT-EMAIL]";

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Send an email with retry logic, tracking, and suppression checking.
 */
export async function sendEmailWithRetry(
  supabase: SupabaseClient,
  resend: InstanceType<typeof Resend>,
  params: EmailParams,
  options: SendOptions = { emailType: "general" }
): Promise<SendResult> {
  const {
    emailType = "general",
    idempotencyKey,
    maxRetries = 3,
    checkSuppression = true,
    metadata,
  } = options;

  // Normalize to array
  const toArray = Array.isArray(params.to) ? params.to : [params.to];
  const normalizedParams = { ...params, to: toArray };
  const recipientEmail = toArray[0]?.toLowerCase();
  if (!recipientEmail) {
    return { success: false, error: "No recipient email", attempts: 0 };
  }

  // 1. Idempotency check
  if (idempotencyKey) {
    const { data: existing } = await supabase
      .from("email_tracking_events")
      .select("id, created_at")
      .eq("email_id", idempotencyKey)
      .eq("email_type", emailType)
      .eq("event_type", "sent")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (existing) {
      console.log(`${LOG_PREFIX} Dedup hit: ${idempotencyKey}`);
      return {
        success: true,
        deduplicated: true,
        attempts: 0,
        emailId: idempotencyKey,
        firstSentAt: existing.created_at ?? undefined,
      };
    }
  }

  // 2. Suppression check
  if (checkSuppression) {
    const { data: suppressed } = await supabase
      .from("suppressed_emails")
      .select("email")
      .eq("email", recipientEmail)
      .maybeSingle();

    if (suppressed) {
      console.log(`${LOG_PREFIX} Suppressed: ${recipientEmail}`);
      await trackEvent(supabase, {
        emailId: idempotencyKey || crypto.randomUUID(),
        emailType,
        eventType: "suppressed",
        recipientEmail,
        metadata: { ...metadata, reason: "suppressed_email" },
      });
      return { success: false, suppressed: true, attempts: 0 };
    }
  }

  // 3. Retry loop with exponential backoff
  const trackingId = idempotencyKey || crypto.randomUUID();
  let lastError = "";

  // Auto-generate plain-text fallback for better deliverability
  const plainText = normalizedParams.html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<\/div>/gi, "\n")
    .replace(/<\/tr>/gi, "\n")
    .replace(/<\/li>/gi, "\n")
    .replace(/<li[^>]*>/gi, "• ")
    .replace(/<a[^>]+href="([^"]*)"[^>]*>([^<]*)<\/a>/gi, "$2 ($1)")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const sendParams: Record<string, unknown> = {
        from: normalizedParams.from,
        to: normalizedParams.to,
        subject: normalizedParams.subject,
        html: normalizedParams.html,
        text: plainText,
      };
      if (normalizedParams.headers) sendParams.headers = normalizedParams.headers;
      if (normalizedParams.replyTo) sendParams.reply_to = normalizedParams.replyTo;

      // deno-lint-ignore no-explicit-any
      const { data, error } = await (resend.emails as any).send(sendParams);

      if (error) {
        lastError = error.message || JSON.stringify(error);
        console.error(`${LOG_PREFIX} Attempt ${attempt}/${maxRetries} failed:`, lastError);

        // Don't retry on permanent errors (validation, domain issues)
        if (isPermanentError(lastError)) {
          await trackEvent(supabase, {
            emailId: trackingId,
            emailType,
            eventType: "failed",
            recipientEmail,
            metadata: { ...metadata, error: lastError, attempt, permanent: true },
          });
          return { success: false, error: lastError, attempts: attempt };
        }

        // Track retry
        if (attempt < maxRetries) {
          await trackEvent(supabase, {
            emailId: trackingId,
            emailType,
            eventType: "retry",
            recipientEmail,
            metadata: { ...metadata, error: lastError, attempt },
          });
          // Exponential backoff: 1s, 2s, 4s
          await sleep(1000 * Math.pow(2, attempt - 1));
        }
        continue;
      }

      // Success
      await trackEvent(supabase, {
        emailId: trackingId,
        emailType,
        eventType: "sent",
        recipientEmail,
        metadata: { ...metadata, resendId: data?.id, attempt },
      });

      console.log(`${LOG_PREFIX} Sent to ${recipientEmail} (attempt ${attempt})`);
      return { success: true, emailId: data?.id, attempts: attempt };

    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
      console.error(`${LOG_PREFIX} Attempt ${attempt}/${maxRetries} exception:`, lastError);

      if (attempt < maxRetries) {
        await trackEvent(supabase, {
          emailId: trackingId,
          emailType,
          eventType: "retry",
          recipientEmail,
          metadata: { ...metadata, error: lastError, attempt },
        });
        await sleep(1000 * Math.pow(2, attempt - 1));
      }
    }
  }

  // All retries exhausted — dead-letter
  await trackEvent(supabase, {
    emailId: trackingId,
    emailType,
    eventType: "dlq",
    recipientEmail,
    metadata: { ...metadata, error: lastError, maxRetries },
  });

  // Persist to email_send_failures so admins can review on the daily digest.
  // Failures here must NEVER break the caller — swallow any insert error.
  try {
    await supabase.from("email_send_failures").insert({
      email_type: emailType,
      recipient_email: recipientEmail,
      subject: normalizedParams.subject,
      error_message: lastError,
      attempts: maxRetries,
      idempotency_key: idempotencyKey ?? null,
      metadata: metadata ?? null,
    });
  } catch (err) {
    console.error(`${LOG_PREFIX} DLQ insert failed:`, err);
  }

  console.error(`${LOG_PREFIX} Dead-lettered after ${maxRetries} attempts: ${recipientEmail}`);
  return { success: false, error: lastError, attempts: maxRetries, deadLettered: true };
}

/**
 * Determine if an error is permanent (no point retrying).
 */
function isPermanentError(errorMsg: string): boolean {
  const lower = errorMsg.toLowerCase();
  return (
    lower.includes("validation_error") ||
    lower.includes("verify a domain") ||
    lower.includes("invalid") && lower.includes("email") ||
    lower.includes("missing required") ||
    lower.includes("not found") ||
    lower.includes("blocked") ||
    lower.includes("spam")
  );
}

/**
 * Track an email event in email_tracking_events.
 */
async function trackEvent(
  supabase: SupabaseClient,
  params: {
    emailId: string;
    emailType: string;
    eventType: string;
    recipientEmail: string;
    metadata?: Record<string, unknown>;
  }
) {
  try {
    await supabase.from("email_tracking_events").insert({
      email_id: params.emailId,
      email_type: params.emailType,
      event_type: params.eventType,
      recipient_email: params.recipientEmail,
      event_data: params.metadata || null,
    });
  } catch (err) {
    // Never let tracking failures break email sending
    console.error(`${LOG_PREFIX} Tracking insert failed:`, err);
  }
}

// ── inlined from _shared/email-input-diagnostics.ts ─────────────
/**
 * Shared diagnostics helpers for email validation failures.
 *
 * Used to enrich `email_required` / `invalid_email` log lines with:
 *   - field         : the request field that failed (e.g. "seekerEmail")
 *   - inputType     : detected runtime type ("missing" | "string" | "number" | "object" | "array" | "null" | "boolean")
 *   - inputLength   : length of the trimmed string (when applicable)
 *   - whitespaceOnly: true when the input was a non-empty string of only whitespace
 *
 * The detected value itself is NEVER logged — only its shape — so we don't
 * leak PII into log aggregators.
 */

export type EmailInputType =
  | "missing"
  | "null"
  | "string"
  | "number"
  | "boolean"
  | "object"
  | "array";

export interface EmailInputDiagnostics {
  field: string;
  inputType: EmailInputType;
  inputLength?: number;
  whitespaceOnly?: boolean;
}

export function detectEmailInputType(value: unknown): EmailInputType {
  if (value === undefined) return "missing";
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  const t = typeof value;
  if (t === "string") return "string";
  if (t === "number") return "number";
  if (t === "boolean") return "boolean";
  return "object";
}

export function describeEmailInput(field: string, value: unknown): EmailInputDiagnostics {
  const inputType = detectEmailInputType(value);
  const diag: EmailInputDiagnostics = { field, inputType };
  if (inputType === "string") {
    const s = value as string;
    const trimmed = s.trim();
    diag.inputLength = trimmed.length;
    diag.whitespaceOnly = s.length > 0 && trimmed.length === 0;
  }
  return diag;
}

// ── submit-qualified-lead entrypoint body ─────────────────────────
// Directory cutover stage 2, as amended by the inquiry-model amendment.
//
// THE PRODUCT
//   A seeker picks ONE facility and sends it an inquiry. That inquiry is
//   delivered to that facility and to nobody else. RehabLookup does not
//   sell it, auction it, redistribute it, match it, assign an advisor to it,
//   convert it into a Concierge case, or offer the seeker an alternative
//   provider. `leads.facility_id` is the whole routing table.
//
// WHAT CHANGED IN 3.1.0
//   3.0.0 gated inquiry ELIGIBILITY on has_active_pro(): a Free, unclaimed
//   or Featured-only facility got DIRECT_CONTACT_REQUIRED and the seeker was
//   told to phone the facility themselves. That is reversed here.
//
//     • ENTITLEMENT NO LONGER DECIDES WHO MAY RECEIVE AN INQUIRY.
//       Any approved, non-suspended facility may receive one.
//     • Entitlement now decides PUBLIC PHONE VISIBILITY ONLY, and that is
//       enforced in the public read path (public_facilities.phone,
//       get-public-facilities, get-featured-rotation, the static generator)
//       — not here. This function never publishes a facility phone.
//
//   DIRECT_CONTACT_REQUIRED is therefore fully retired server-side: this
//   function no longer emits it under any condition. The client keeps a
//   defensive handler for it only to survive the rollout window in which an
//   older deployed copy of this function is still live.
//
// WHAT MUST NEVER COME BACK
//   concierge_inquiries writes, advisor assignment, concierge_case_events,
//   introductions, alternative-facility matching, notify-free-tier-inquiry-
//   redirect, process-lead-redistribution, lead_distributions inserts.
//   See docs/directory-cutover-stage-02-inquiry-model-amendment.md.
const VERSION = "3.1.0";
const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ============ STANDARDIZED ERROR ENVELOPE ============
// All non-2xx responses use this shape so the client can read either
// `data.error.message`, `data.reason`, or the top-level `code`.
function errorResponse(
  status: number,
  code: string,
  message: string,
  field?: string
) {
  return new Response(
    JSON.stringify({
      error: { code, message },
      code,
      reason: message,
      _version: VERSION,
      ...(field ? { details: { field } } : {}),
    }),
    { status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

// ============ DELIVERY STATE (3.1.0) ============
// Every accepted inquiry is stored against the ONE facility the seeker
// selected. What differs is whether a verified human recipient could be
// notified, and the seeker is told the truth either way.
//
//   "delivered_to_provider" — the listing is claimed; the inquiry was stored
//                             AND the provider was notified on their
//                             configured channels.
//   "stored_pending_claim"  — the listing is approved but UNCLAIMED
//                             (facilities.user_id IS NULL). The inquiry is
//                             still stored against that facility and stays
//                             pinned to it, and provider RLS means whoever
//                             later claims the listing inherits it. But no
//                             PII is emailed anywhere.
//
// Why an unclaimed listing is not simply mailed at facilities.email: that
// column is import provenance (SAMHSA / scrape / admin entry), not a verified
// destination belonging to someone who has proven they operate the facility.
// Mailing a seeker's name, email, phone and clinical context to an unverified
// address because a column happened to be non-empty is a PII disclosure, not
// a delivery. The inquiry is never rerouted, never sent to an alternative
// facility, never handed to an advisor, and never converted into a Concierge
// case to make the flow "work".
type DeliveryState = "delivered_to_provider" | "stored_pending_claim";

// ============ DIRECT_CONTACT_REQUIRED — FULLY RETIRED IN 3.1.0 ============
// Pro entitlement no longer gates inquiry eligibility, so no facility is
// short-circuited here any more and this function NEVER emits
// `action: "DIRECT_CONTACT_REQUIRED"`. There is deliberately no constant and
// no helper for it left in this file — reintroducing one would be a
// regression, not a feature.
//
// The CLIENT still recognises the string defensively, because during the
// controlled rollout an OLD deployed copy of this function can answer a NEW
// client. There it is treated as a non-success (no delivered state, no
// Concierge navigation, no Free phone reveal) — see RequestInfoModal.

// ============ LOGGING ============
const generateRequestId = () => crypto.randomUUID().slice(0, 8);

const log = (requestId: string, level: "INFO" | "WARN" | "ERROR", message: string, details?: unknown) => {
  const timestamp = new Date().toISOString();
  const detailsStr = details ? ` | ${JSON.stringify(details)}` : "";
  console.log(`[${timestamp}] [${VERSION}] [${requestId}] [${level}] ${message}${detailsStr}`);
};

// ============ INTERFACES ============
interface InquiryRequest {
  facilityId: string;
  name: string;
  email: string;
  phone: string;
  preferredContact?: string;
  message?: string;
  urgency?: string;
  levelOfCare?: string;
  insuranceType?: string;
  insuranceProvider?: string;
  locationZip?: string;
  locationCityState?: string;
  primarySubstance?: string[];
  dualDiagnosis?: string;
  whoSeekingHelp?: string;
  source?: string;
  firstName?: string;
  lastName?: string;
  specialNeeds?: string[];
  ageRange?: string;
  gender?: string;
  relationshipToPatient?: string;
  previousTreatment?: string;
  previousTreatmentDetails?: string;
  coOccurringConditions?: string[];
  employmentStatus?: string;
  veteranStatus?: string;
  legalInvolvement?: string;
  readinessLevel?: string;
  bestTimeToCall?: string;
  budgetPreference?: string;
  idempotencyKey?: string;
}

// ============ INPUT SANITIZATION ============
function sanitizeEmail(email: string): string {
  return email.toLowerCase().trim().slice(0, 255);
}

function sanitizePhone(phone: string): string {
  return phone.replace(/\D/g, "").slice(0, 15);
}

function sanitizeName(name: string): string {
  return name.trim().replace(/[<>{}[\]\\\/`'"]/g, "").slice(0, 100);
}

function sanitizeMessage(message: string | undefined): string | undefined {
  if (!message) return undefined;
  return message.trim()
    .replace(/<script[^>]*>.*?<\/script>/gi, "")
    .replace(/<[^>]*>/g, "")  // Strip ALL HTML tags
    .replace(/javascript:/gi, "")
    .replace(/on\w+\s*=/gi, "")
    .slice(0, 2000) || undefined;
}

function sanitizeZip(zip: string | undefined): string | undefined {
  if (!zip) return undefined;
  return zip.replace(/[^0-9-]/g, "").slice(0, 10);
}

function sanitizeGenericField(value: string | undefined, maxLen = 100): string | undefined {
  if (!value) return undefined;
  return value.trim().replace(/[<>{}[\]\\\/`'"]/g, "").slice(0, maxLen);
}

// ============ LEAD MASKING (PRIVACY) ============
// ============ DUPLICATE & RATE LIMIT CHECKS ============
// deno-lint-ignore no-explicit-any
async function checkForDuplicate(
  supabase: any,
  email: string,
  phone: string,
  facilityId: string,
  requestId: string
): Promise<{ isDuplicate: boolean; reason?: string }> {
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  
  const { data: emailLeads, error: emailError } = await supabase
    .from("leads")
    .select("id")
    .eq("facility_id", facilityId)
    .eq("email", email)
    .gte("created_at", twentyFourHoursAgo)
    .limit(1);
  
  if (emailError) {
    log(requestId, "WARN", "Duplicate check error (email)", { error: emailError });
  }
  
  if (emailLeads && emailLeads.length > 0) {
    log(requestId, "WARN", "Duplicate submission detected (email)", { facilityId });
    return { isDuplicate: true, reason: "You've already submitted an inquiry to this facility recently." };
  }
  
  if (phone && phone.length >= 10) {
    const { data: phoneLeads, error: phoneError } = await supabase
      .from("leads")
      .select("id")
      .eq("facility_id", facilityId)
      .eq("phone", phone)
      .gte("created_at", twentyFourHoursAgo)
      .limit(1);
    
    if (phoneError) {
      log(requestId, "WARN", "Duplicate check error (phone)", { error: phoneError.message });
    }
    
    if (phoneLeads && phoneLeads.length > 0) {
      log(requestId, "WARN", "Duplicate submission detected (phone)", { facilityId });
      return { isDuplicate: true, reason: "You've already submitted an inquiry to this facility recently." };
    }
  }
  
  return { isDuplicate: false };
}

// deno-lint-ignore no-explicit-any
async function checkIdempotency(supabase: any, key: string, requestId: string): Promise<{ exists: boolean; leadId?: string }> {
  if (!key) return { exists: false };
  
  const { data } = await supabase
    .from("leads")
    .select("id")
    .eq("idempotency_key", key)
    .maybeSingle();
  
  if (data) {
    log(requestId, "WARN", "Idempotent request detected", { key });
    return { exists: true, leadId: data.id };
  }
  return { exists: false };
}

// ============ BLOCKED IDENTIFIER CHECK ============
// deno-lint-ignore no-explicit-any
async function isBlocked(supabase: any, email: string, phone: string): Promise<boolean> {
  const { data: emailBlocked } = await supabase.rpc("is_identifier_blocked", { p_identifier: email });
  if (emailBlocked) return true;
  
  if (phone && phone.length >= 10) {
    const { data: phoneBlocked } = await supabase.rpc("is_identifier_blocked", { p_identifier: phone });
    if (phoneBlocked) return true;
  }
  
  return false;
}

// ============ SERVER-SIDE EMAIL VERIFICATION CHECK ============
// deno-lint-ignore no-explicit-any
async function isEmailServerVerified(supabase: any, email: string): Promise<boolean> {
  const { data } = await supabase.rpc("is_email_verified", { p_email: email });
  return data === true;
}

// ============ IP EXTRACTION ============
function extractClientIp(req: Request): string | null {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || req.headers.get("x-real-ip")
    || null;
}

// ============ EMAIL TEMPLATES ============
// ---------- shared formatting helpers ----------
function formatUrgency(urgency?: string): string {
  if (!urgency) return "Pending assessment";
  const u = urgency.toLowerCase().replace(/-/g, "_");
  if (u === "immediate" || u === "immediately" || u === "urgent") return "🔴 Immediate";
  if (u === "within_week" || u === "this_week") return "🟡 Within a week";
  if (u === "within_month" || u === "this_month") return "🟢 Within a month";
  if (u === "flexible") return "🔵 Flexible";
  return urgency;
}

function formatLevelOfCare(loc?: string): string {
  if (!loc) return "—";
  return loc.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatPreferredContact(pc?: string): string {
  if (!pc) return "Any method";
  const p = pc.toLowerCase();
  if (p === "call" || p === "phone") return "📞 Phone call";
  if (p === "text") return "💬 Text message";
  if (p === "email") return "📧 Email";
  return pc;
}

function formatSubmittedAt(d: Date): string {
  // e.g. "May 2, 2026 · 3:42 PM ET"
  try {
    return d.toLocaleString("en-US", {
      timeZone: "America/New_York",
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      timeZoneName: "short",
    });
  } catch {
    return d.toUTCString();
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// (The free-tier "a care coordinator will call you within 1 business hour"
// seeker confirmation email was removed in directory cutover stage 2. No
// non-Pro inquiry reaches this function's PII processing any more, so there
// is no seeker to send it to and no coordinator to promise.)

// ---------- seeker (client) confirmation email ----------
//
// Sent only on the ACTIVE PRO path, and only ever about the ONE facility the
// seeker selected. RehabLookup provides the directory; it does not operate a
// placement desk, so this template must not promise that staff will connect,
// match, find or arrange an alternative provider. Stage-2 verification hotfix
// #1 replaced the "contact us … and we'll help connect you with another
// provider" fallback with self-service directory navigation
// (/search-results) — the seeker chooses who to contact next.
function getSeekerConfirmationEmail(
  name: string,
  facilityName: string,
  details: {
    urgency?: string;
    levelOfCare?: string;
    insuranceType?: string;
    preferredContact?: string;
    message?: string;
    submittedAt?: Date;
    deliveryState?: DeliveryState;
  } = {}
): string {
  const firstName = name.split(" ")[0];
  const submittedAt = details.submittedAt ?? new Date();
  const safeFacility = escapeHtml(facilityName);
  // Truthful delivery language. We never claim a facility received something
  // when no verified recipient exists, and we never promise a response time,
  // a callback window, or any RehabLookup follow-up — the facility responds,
  // on its own terms, or it does not.
  const pendingClaim = details.deliveryState === "stored_pending_claim";
  const urgencyLine = formatUrgency(details.urgency);
  const careLine = formatLevelOfCare(details.levelOfCare);
  const insuranceLine = details.insuranceType ? escapeHtml(details.insuranceType) : "—";
  const preferredLine = formatPreferredContact(details.preferredContact);
  const messageExcerpt = details.message
    ? escapeHtml(details.message.length > 280 ? details.message.slice(0, 280).trim() + "…" : details.message)
    : "";

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #f5f5f5; -webkit-font-smoothing: antialiased;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; width: 100%;">
          <tr>
            <td style="background: linear-gradient(135deg, #0f766e 0%, #14b8a6 100%); padding: 32px; border-radius: 12px 12px 0 0; text-align: center;">
              <div style="font-size: 48px; margin-bottom: 16px;">✉️</div>
              <p style="margin: 0 0 8px 0; font-size: 12px; color: rgba(255,255,255,0.7); font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; text-transform: uppercase; letter-spacing: 1px;">REHABLOOKUP</p>
              <h1 style="margin: 0; font-size: 24px; color: #ffffff; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-weight: 600;">
                ${pendingClaim ? `Your inquiry for ${safeFacility}` : `Inquiry sent to ${safeFacility}`}
              </h1>
              <p style="margin: 8px 0 0 0; color: rgba(255,255,255,0.85); font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 14px;">Submitted ${formatSubmittedAt(submittedAt)}</p>
            </td>
          </tr>
          <tr>
            <td style="background: #ffffff; padding: 32px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; border-left: 1px solid #e5e7eb; border-right: 1px solid #e5e7eb;">
              <p style="margin: 0 0 16px 0; color: #111827; font-size: 16px; line-height: 1.6;">
                Hi ${escapeHtml(firstName)},
              </p>
              <p style="margin: 0 0 24px 0; color: #374151; font-size: 15px; line-height: 1.6;">
                ${pendingClaim
                  ? `Your inquiry was recorded for <strong style="color: #0f766e;">${safeFacility}</strong>. This listing is not yet managed by the facility on RehabLookup, so we cannot confirm that anyone there has seen it. If you would like to reach them now, contact the facility directly using their own website or address. Here's a copy of what you submitted so you have it for your records.`
                  : `Your inquiry was sent to <strong style="color: #0f766e;">${safeFacility}</strong>. They can respond using the contact information you provided. Here's a copy of what you submitted so you have it for your records.`}
              </p>

              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; margin-bottom: 24px;">
                <tr>
                  <td style="padding: 20px;">
                    <p style="margin: 0 0 12px 0; font-size: 12px; font-weight: 600; color: #475569; text-transform: uppercase; letter-spacing: 0.5px;">Submission details</p>
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size: 14px; color: #1e293b; line-height: 1.6;">
                      <tr><td style="padding: 4px 12px 4px 0; color: #64748b; width: 160px;">Treatment center</td><td style="padding: 4px 0;"><strong>${safeFacility}</strong></td></tr>
                      <tr><td style="padding: 4px 12px 4px 0; color: #64748b;">Level of care</td><td style="padding: 4px 0;">${careLine}</td></tr>
                      <tr><td style="padding: 4px 12px 4px 0; color: #64748b;">Insurance</td><td style="padding: 4px 0;">${insuranceLine}</td></tr>
                      <tr><td style="padding: 4px 12px 4px 0; color: #64748b;">Timeline</td><td style="padding: 4px 0;">${urgencyLine}</td></tr>
                      <tr><td style="padding: 4px 12px 4px 0; color: #64748b;">Preferred contact</td><td style="padding: 4px 0;">${preferredLine}</td></tr>
                    </table>
                    ${messageExcerpt ? `
                    <div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid #e2e8f0;">
                      <p style="margin: 0 0 6px 0; font-size: 12px; font-weight: 600; color: #475569; text-transform: uppercase; letter-spacing: 0.5px;">Your message</p>
                      <p style="margin: 0; font-size: 14px; color: #334155; line-height: 1.6; white-space: pre-wrap;">${messageExcerpt}</p>
                    </div>
                    ` : ""}
                  </td>
                </tr>
              </table>

              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background: #f0fdfa; border: 1px solid #99f6e4; border-radius: 10px; margin-bottom: 24px;">
                <tr>
                  <td style="padding: 20px;">
                    <p style="margin: 0 0 12px 0; font-size: 15px; font-weight: 600; color: #0f766e;">What happens next</p>
                    ${pendingClaim ? `
                    <ul style="margin: 0; padding: 0 0 0 20px; color: #115e59; font-size: 14px; line-height: 1.7;">
                      <li>Your inquiry stays with ${safeFacility}. It is not shared with any other facility.</li>
                      <li>If the facility claims its RehabLookup listing, your inquiry will be waiting for them.</li>
                      <li>To reach them sooner, contact ${safeFacility} directly, or keep comparing centers in the directory.</li>
                    </ul>
                    ` : `
                    <ul style="margin: 0; padding: 0 0 0 20px; color: #115e59; font-size: 14px; line-height: 1.7;">
                      <li>Your inquiry went to ${safeFacility} only. It is not shared with any other facility.</li>
                      <li>They can respond using the contact details you provided (${preferredLine}).</li>
                      <li>Anything about programs, insurance coverage, availability and cost is answered by the facility itself.</li>
                    </ul>
                    `}
                  </td>
                </tr>
              </table>

              <p style="margin: 0 0 16px 0; color: #374151; font-size: 14px; line-height: 1.6;">
                <strong>Haven't heard back?</strong> You can return to RehabLookup to <a href="https://rehablookup.com/search-results" style="color: #0f766e; text-decoration: none;">continue searching</a> and contact another treatment center directly — you choose where to reach out next.
              </p>
              <p style="margin: 0; color: #6b7280; font-size: 13px; line-height: 1.6;">
                Your information is kept confidential and is only shared with the treatment center you contacted.
              </p>
            </td>
          </tr>
          <tr>
            <td style="background: #1B365D; padding: 24px 32px; border-radius: 0 0 12px 12px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="text-align: center;">
                    <p style="margin: 0 0 12px 0; color: #ffffff; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 14px; font-weight: 600;">
                      RehabLookup
                    </p>
                    <p style="margin: 0 0 16px 0; color: #93c5fd; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 12px;">
                      A directory of treatment centers
                    </p>
                    <p style="margin: 0; color: rgba(255,255,255,0.5); font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 11px;">
                      © ${new Date().getFullYear()} RehabLookup. All rights reserved.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function getFacilityNotificationEmail(
  leadName: string,
  facilityName: string,
  details: {
    email?: string;
    phone?: string;
    urgency?: string;
    levelOfCare?: string;
    insuranceType?: string;
    message?: string;
    preferredContact?: string;
    submittedAt?: Date;
  }
): string {
  // Provider-facing copy for a NEW FACILITY INQUIRY.
  //
  // This is a directory notification, not a sales artefact. It is sent to
  // every claimed facility that receives an inquiry — Free, Featured-only and
  // Pro alike — with the seeker's contact details in full, because the whole
  // point is that the facility can reply. There is no masking, no unlock CTA,
  // no per-lead purchase, and no conversion coaching: the retired sales-era
  // copy ("View lead in dashboard", "respond within the first hour and
  // convert up to 7× more leads") has been removed, not reworded. Nothing
  // here may imply RehabLookup selected, screened, matched or vouched for
  // this facility, or that the seeker is a purchased "lead".
  const safeName = escapeHtml(leadName);
  const safeEmail = details.email ? escapeHtml(details.email) : "(not provided)";
  const safePhone = details.phone ? escapeHtml(details.phone) : "(not provided)";
  const firstName = leadName.split(" ")[0];
  const submittedAt = details.submittedAt ?? new Date();
  const safeFacility = escapeHtml(facilityName);
  const urgencyDisplay = formatUrgency(details.urgency);
  const levelOfCareDisplay = formatLevelOfCare(details.levelOfCare);
  const preferredDisplay = formatPreferredContact(details.preferredContact);
  const messageExcerpt = details.message
    ? escapeHtml(details.message.length > 320 ? details.message.slice(0, 320).trim() + "…" : details.message)
    : "";

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #f5f5f5; -webkit-font-smoothing: antialiased;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; width: 100%;">
          <tr>
            <td style="background: linear-gradient(135deg, #1B365D 0%, #2C4A7F 100%); padding: 32px; border-radius: 12px 12px 0 0; text-align: center;">
              <div style="font-size: 48px; margin-bottom: 16px;">🔔</div>
              <p style="margin: 0 0 8px 0; font-size: 12px; color: rgba(255,255,255,0.7); font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; text-transform: uppercase; letter-spacing: 1px;">REHABLOOKUP</p>
              <h1 style="margin: 0; font-size: 24px; color: #ffffff; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-weight: 600;">
                New inquiry for ${safeFacility}
              </h1>
              <p style="margin: 8px 0 0 0; color: rgba(255,255,255,0.85); font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 14px;">Submitted ${formatSubmittedAt(submittedAt)}</p>
            </td>
          </tr>
          <tr>
            <td style="background: #ffffff; padding: 32px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; border-left: 1px solid #e5e7eb; border-right: 1px solid #e5e7eb;">
              <p style="margin: 0 0 24px 0; color: #374151; font-size: 15px; line-height: 1.6;">
                Someone searching the RehabLookup directory selected <strong>${safeFacility}</strong> and sent you an inquiry. It was sent to your facility only.
              </p>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%); border: 1px solid #e2e8f0; border-radius: 12px; margin-bottom: 24px;">
                <tr>
                  <td style="padding: 24px;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="vertical-align: top; width: 60px;">
                          <div style="width: 50px; height: 50px; background: linear-gradient(135deg, #1B365D 0%, #2C4A7F 100%); border-radius: 50%; color: #ffffff; font-size: 18px; font-weight: 600; text-align: center; line-height: 50px;">
                            ${escapeHtml(firstName[0]?.toUpperCase() || '?')}
                          </div>
                        </td>
                        <td style="vertical-align: top; padding-left: 16px;">
                          <p style="margin: 0 0 4px 0; font-size: 18px; font-weight: 600; color: #1e293b;">${safeName}</p>
                          <p style="margin: 0; font-size: 13px; color: #64748b;">New inquiry • ${urgencyDisplay}</p>
                        </td>
                      </tr>
                    </table>
                    <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size: 14px; color: #334155; line-height: 1.6;">
                      <tr><td style="padding: 6px 12px 6px 0; color: #64748b; width: 170px;">Email</td><td style="padding: 6px 0;"><a href="mailto:${safeEmail}" style="color: #1B365D; text-decoration: none;">${safeEmail}</a></td></tr>
                      <tr><td style="padding: 6px 12px 6px 0; color: #64748b;">Phone</td><td style="padding: 6px 0;"><a href="tel:${safePhone}" style="color: #1B365D; text-decoration: none;">${safePhone}</a></td></tr>
                      <tr><td style="padding: 6px 12px 6px 0; color: #64748b;">Level of care</td><td style="padding: 6px 0;">${levelOfCareDisplay}</td></tr>
                      ${details.insuranceType ? `<tr><td style="padding: 6px 12px 6px 0; color: #64748b;">Insurance</td><td style="padding: 6px 0;">${escapeHtml(details.insuranceType)}</td></tr>` : ""}
                      <tr><td style="padding: 6px 12px 6px 0; color: #64748b;">Timeline</td><td style="padding: 6px 0;">${urgencyDisplay}</td></tr>
                      <tr><td style="padding: 6px 12px 6px 0; color: #64748b;">Preferred contact</td><td style="padding: 6px 0;">${preferredDisplay}</td></tr>
                    </table>
                    ${messageExcerpt ? `
                    <div style="margin-top: 16px; padding: 14px 16px; background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px;">
                      <p style="margin: 0 0 6px 0; font-size: 12px; font-weight: 600; color: #475569; text-transform: uppercase; letter-spacing: 0.5px;">📝 Personal message</p>
                      <p style="margin: 0; font-size: 13px; color: #334155; line-height: 1.6; white-space: pre-wrap;">${messageExcerpt}</p>
                    </div>
                    ` : ""}
                  </td>
                </tr>
              </table>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%); border: 2px solid #10b981; border-radius: 12px; margin-bottom: 24px;">
                <tr>
                  <td style="padding: 20px;">
                    <p style="margin: 0 0 8px 0; font-size: 15px; font-weight: 600; color: #065f46;">Respond to ${escapeHtml(firstName)}</p>
                    <p style="margin: 0 0 16px 0; font-size: 13px; color: #047857; line-height: 1.6;">
                      Reply using the contact information they provided. Their preferred contact method is <strong>${preferredDisplay}</strong>.
                    </p>
                    <a href="https://rehablookup.com/provider/inquiries" style="display: inline-block; background: #1B365D; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: 600; font-size: 14px;">
                      View inquiry
                    </a>
                  </td>
                </tr>
              </table>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background: #f0f9ff; border: 1px solid #bfdbfe; border-radius: 8px; margin-bottom: 24px;">
                <tr>
                  <td style="padding: 16px;">
                    <p style="margin: 0; font-size: 13px; color: #1e40af; line-height: 1.5;">
                      This inquiry was sent to your facility only. RehabLookup does not share it with other facilities, and does not contact the seeker on your behalf.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="background: #1B365D; padding: 24px 32px; border-radius: 0 0 12px 12px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="text-align: center;">
                    <p style="margin: 0 0 12px 0; color: #ffffff; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 14px; font-weight: 600;">
                      RehabLookup
                    </p>
                    <p style="margin: 0 0 16px 0; color: #93c5fd; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 12px;">
                      A directory of treatment centers
                    </p>
                    <a href="https://rehablookup.com/provider/settings" style="color: #93c5fd; text-decoration: none; font-size: 12px;">Notification settings</a>
                    <p style="margin: 16px 0 0 0; color: rgba(255,255,255,0.5); font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 11px;">
                      © ${new Date().getFullYear()} RehabLookup. All rights reserved.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ============ ALLOWED VALUES WHITELIST ============
const ALLOWED_URGENCY = ['immediate', 'within-week', 'within_week', 'within-month', 'within_month', 'flexible', 'Urgent', 'Immediately', 'This week', 'This month'];
const ALLOWED_PREFERRED_CONTACT = ['call', 'text', 'email', 'phone'];
const ALLOWED_SOURCES = ['facility_profile', 'direct', 'search', 'seeker_dashboard', 'marketing', 'referral'];

function validateEnum(value: string | undefined, allowed: string[]): string | undefined {
  if (!value) return undefined;
  return allowed.includes(value) ? value : undefined;
}

// ============ MAIN HANDLER ============
Deno.serve(async (req) => {
  const requestId = generateRequestId();
  log(requestId, "INFO", "Request received", { method: req.method, version: VERSION });

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // Only accept POST
  if (req.method !== "POST") {
    return errorResponse(405, "method_not_allowed", "Method not allowed");
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Round-31 bug fix: hoist `now` to top of handler. The free-tier
    // redirect flow at line ~1204 used `now.toISOString()` before the
    // Pro-tier flow declared `const now = new Date()` further down,
    // throwing ReferenceError on every Free-tier submission.
    const now = new Date();

    // Extract client IP for rate limiting
    const clientIp = extractClientIp(req);

    let rawData: InquiryRequest;
    try {
      rawData = await req.json();
    } catch {
      return errorResponse(400, "invalid_body", "Invalid request body");
    }

    // ═════════════════════════════════════════════════════════════════
    // DESTINATION RESOLUTION — runs BEFORE any PII-dependent work.
    // ═════════════════════════════════════════════════════════════════
    // Everything below (sanitising the seeker's name/email/phone, the
    // blocked-identifier lookup, the email-verification lookup, the
    // idempotency probe, the duplicate query, the PII/IP rate-limit queries,
    // the inquiry insert) only ever runs once the selected facility has been
    // resolved from trusted server-side data and confirmed to exist, be
    // approved, and not be suspended.
    //
    // The ordering requirement survives the 3.1.0 amendment even though the
    // entitlement gate is gone: an inquiry aimed at a missing, unapproved or
    // suspended facility must be rejected WITHOUT RehabLookup reading,
    // writing or logging seeker PII. Only the facility identifier is parsed
    // here; do not move PII handling above this point.
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const requestedFacilityId =
      typeof rawData?.facilityId === "string" ? rawData.facilityId.trim() : "";

    if (!requestedFacilityId) {
      return errorResponse(400, "facility_required", "facility_id is required for all inquiries", "facilityId");
    }
    if (!uuidRegex.test(requestedFacilityId)) {
      return errorResponse(400, "invalid_facility_id", "Invalid facility ID", "facilityId");
    }

    log(requestId, "INFO", "Inquiry received", {
      facilityId: requestedFacilityId,
      hasIdempotencyKey: !!rawData?.idempotencyKey,
    });

    // ===== FACILITY VERIFICATION (identity + eligibility) =====
    const { data: facility, error: facilityError } = await supabase
      .from("facilities")
      .select("id, name, email, user_id, status, suspended, reply_email, reply_email_verified")
      .eq("id", requestedFacilityId)
      .maybeSingle();

    if (facilityError || !facility) {
      log(requestId, "ERROR", "Facility not found", { facilityId: requestedFacilityId });
      return errorResponse(404, "facility_not_found", "Facility not found", "facilityId");
    }

    if (facility.status !== "approved" || facility.suspended) {
      log(requestId, "ERROR", "Facility not accepting inquiries", { facilityId: requestedFacilityId, status: facility.status });
      return errorResponse(400, "facility_not_accepting", "This facility is not currently accepting inquiries", "facilityId");
    }

    // ═════════════════════════════════════════════════════════════════
    // IMMUTABLE DESTINATION ESTABLISHED
    //
    // `requestedFacilityId` is now a confirmed, approved, non-suspended
    // facility resolved from trusted server-side data. It is the ONLY
    // destination this request can ever have. Nothing below may substitute,
    // add, fan out to, or fall back to a different facility.
    //
    // NO ENTITLEMENT GATE HERE — BY DESIGN (3.1.0).
    //   Inquiry eligibility is deliberately NOT a function of has_active_pro(),
    //   Featured, claim state, verified status, or any payment state. A Free
    //   claimed listing, a Featured-only non-Pro listing and an active Pro
    //   listing all receive the seeker's inquiry on identical terms, stored
    //   identically, with no priority lane for the paying facility. Pro is
    //   buying a product feature (public phone visibility, enforced in the
    //   public READ path), not a different seeker's inquiry.
    //
    // Delivery capability — NOT eligibility — is resolved here, before any
    // PII is touched, so the notification decision is made from facility
    // identity alone.
    const facilityIsClaimed = !!facility.user_id;
    const deliveryState: DeliveryState = facilityIsClaimed
      ? "delivered_to_provider"
      : "stored_pending_claim";

    if (!facilityIsClaimed) {
      log(requestId, "INFO", "Unclaimed listing — inquiry will be stored, provider notification suppressed", {
        facilityId: requestedFacilityId,
      });
    }

    // ═════════════════════════════════════════════════════════════════
    // SEEKER PII PROCESSING BEGINS HERE — never move it above this line.
    // ═════════════════════════════════════════════════════════════════

    // ===== INPUT SANITIZATION =====
    const data = {
      ...rawData,
      facilityId: requestedFacilityId,
      name: sanitizeName(rawData.name || ""),
      email: sanitizeEmail(rawData.email || ""),
      phone: sanitizePhone(rawData.phone || ""),
      message: sanitizeMessage(rawData.message),
      firstName: rawData.firstName ? sanitizeName(rawData.firstName) : undefined,
      lastName: rawData.lastName ? sanitizeName(rawData.lastName) : undefined,
      locationZip: sanitizeZip(rawData.locationZip),
      locationCityState: sanitizeGenericField(rawData.locationCityState, 150),
      levelOfCare: sanitizeGenericField(rawData.levelOfCare, 50),
      insuranceType: sanitizeGenericField(rawData.insuranceType, 100),
      insuranceProvider: sanitizeGenericField(rawData.insuranceProvider, 100),
      dualDiagnosis: sanitizeGenericField(rawData.dualDiagnosis, 50),
      whoSeekingHelp: sanitizeGenericField(rawData.whoSeekingHelp, 20),
      ageRange: sanitizeGenericField(rawData.ageRange, 20),
      gender: sanitizeGenericField(rawData.gender, 30),
      previousTreatment: sanitizeGenericField(rawData.previousTreatment, 20),
      previousTreatmentDetails: sanitizeGenericField(rawData.previousTreatmentDetails, 500),
      employmentStatus: sanitizeGenericField(rawData.employmentStatus, 30),
      veteranStatus: sanitizeGenericField(rawData.veteranStatus, 20),
      legalInvolvement: sanitizeGenericField(rawData.legalInvolvement, 30),
      readinessLevel: sanitizeGenericField(rawData.readinessLevel, 20),
      bestTimeToCall: sanitizeGenericField(rawData.bestTimeToCall, 30),
      budgetPreference: sanitizeGenericField(rawData.budgetPreference, 50),
      relationshipToPatient: sanitizeGenericField(rawData.relationshipToPatient, 30),
    };
    
    // ===== VALIDATION: Required fields =====
    // (facility identity was validated by the entitlement gate above)
    if (!data.name || data.name.length < 2) {
      return errorResponse(400, "name_required", "Name is required (minimum 2 characters)", "name");
    }

    if (!data.email || typeof data.email !== "string" || data.email.trim().length === 0) {
      const code = "email_required";
      const message = "Email is required";
      const diag = describeEmailInput("email", data.email);
      console.warn(JSON.stringify({ fn: "submit-qualified-lead", level: "warn", code, ...diag }));
      return new Response(
        JSON.stringify({
          error: { code, message },
          code,
          reason: message,
          _version: VERSION,
          details: { field: "email" },
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(data.email)) {
      const code = "invalid_email";
      const message = "Please provide a valid email address";
      const diag = describeEmailInput("email", data.email);
      console.warn(JSON.stringify({ fn: "submit-qualified-lead", level: "warn", code, ...diag }));
      return new Response(
        JSON.stringify({
          error: { code, message },
          code,
          reason: message,
          _version: VERSION,
          details: { field: "email" },
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Phone is OPTIONAL per the May-2026 friction-reduction directive.
    // If provided, it must be a valid 10+ digit number; if blank, we
    // fall back to email-only contact (preferredContact coerced below).
    if (data.phone && data.phone.length > 0 && data.phone.length < 10) {
      return errorResponse(400, "phone_invalid", "Please provide a valid 10-digit phone number or leave it blank", "phone");
    }

    // ===== ENUM VALIDATION (reject invalid values) =====
    const validatedUrgency = validateEnum(data.urgency, ALLOWED_URGENCY);
    // Default preferred contact channel: phone if a phone was supplied,
    // otherwise email (the only remaining always-required identifier).
    const validatedPreferredContact =
      validateEnum(data.preferredContact, ALLOWED_PREFERRED_CONTACT) ||
      (data.phone && data.phone.length >= 10 ? "phone" : "email");
    const validatedSource = validateEnum(data.source, ALLOWED_SOURCES) || "facility_profile";

    // ===== BLOCKED IDENTIFIER CHECK =====
    const blocked = await isBlocked(supabase, data.email, data.phone);
    if (blocked) {
      log(requestId, "WARN", "Blocked identifier detected", { email: data.email.substring(0, 3) + "***" });
      // Return success to not reveal blocking to abusers
      return new Response(
        JSON.stringify({ success: true, message: "Your inquiry has been sent successfully!" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ===== SERVER-SIDE EMAIL VERIFICATION ENFORCEMENT =====
    const emailVerified = await isEmailServerVerified(supabase, data.email);
    if (!emailVerified) {
      log(requestId, "WARN", "Email not verified server-side", { email: data.email.substring(0, 3) + "***" });
      return errorResponse(403, "email_not_verified", "Email address must be verified before submitting. Please verify your email first.", "email");
    }

    // ===== IDEMPOTENCY CHECK =====
    if (data.idempotencyKey) {
      const idemCheck = await checkIdempotency(supabase, data.idempotencyKey, requestId);
      if (idemCheck.exists) {
        return new Response(
          JSON.stringify({ success: true, leadId: idemCheck.leadId, message: "Your inquiry has been sent successfully!" }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // ===== DUPLICATE CHECK =====
    const duplicateCheck = await checkForDuplicate(supabase, data.email, data.phone, data.facilityId, requestId);
    if (duplicateCheck.isDuplicate) {
      return errorResponse(429, "duplicate_inquiry", duplicateCheck.reason || "Duplicate inquiry detected");
    }

    // ===== GLOBAL RATE LIMITING =====
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    
    // Per-email rate limit: 10/hour
    const { count: globalEmailCount } = await supabase
      .from("leads")
      .select("id", { count: "exact", head: true })
      .eq("email", data.email)
      .gte("created_at", oneHourAgo);

    if (globalEmailCount && globalEmailCount >= 10) {
      log(requestId, "WARN", "Global email rate limit exceeded");
      return errorResponse(429, "rate_limit_email", "Too many inquiries. Please wait before submitting again.");
    }

    // Per-facility rate limit: 5/hour (same email)
    const { count: facilityEmailCount } = await supabase
      .from("leads")
      .select("id", { count: "exact", head: true })
      .eq("email", data.email)
      .eq("facility_id", data.facilityId)
      .gte("created_at", oneHourAgo);

    if (facilityEmailCount && facilityEmailCount >= 5) {
      log(requestId, "WARN", "Per-facility email rate limit exceeded");
      return errorResponse(429, "rate_limit_facility", "Too many inquiries to this facility. Please wait before submitting again.");
    }

    // IP-based rate limit: 15/hour (if IP available)
    if (clientIp) {
      const ipHash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(clientIp + "lead-salt-v2"));
      const ipHashHex = Array.from(new Uint8Array(ipHash)).map(b => b.toString(16).padStart(2, '0')).join('');
      
      const { count: ipCount } = await supabase
        .from("leads")
        .select("id", { count: "exact", head: true })
        .eq("ip_hash", ipHashHex)
        .gte("created_at", oneHourAgo);

      if (ipCount && ipCount >= 15) {
        log(requestId, "WARN", "IP-based rate limit exceeded", { ipHash: ipHashHex.substring(0, 8) });
        return errorResponse(429, "rate_limit_ip", "Too many inquiries from this network. Please wait before submitting again.");
      }

      // Store hashed IP for tracking
      (data as Record<string, unknown>).ipHash = ipHashHex;
    }

    // ===== RETIRED: FREE-TIER CONCIERGE REDIRECT =====
    // Until directory cutover stage 2 a non-Pro facility reached this
    // point and RehabLookup took the inquiry over: it inserted a
    // `concierge_inquiries` row with routing_mode='free_tier_redirect',
    // raised a Concierge admin_notifications event, logged a
    // `concierge_case_events` case_created event, round-robin assigned an
    // `advisor`, emailed the seeker a "care coordinator will call within 1
    // business hour" confirmation, invoked notify-free-tier-inquiry-redirect,
    // and returned /inquiry/confirmation/:id.
    //
    // RehabLookup is a directory, not a placement service. That entire branch
    // is gone, and it is not coming back through a side door: as of 3.1.0 a
    // Free / Featured-only / unclaimed facility is no longer short-circuited
    // at all — it simply receives the seeker's inquiry like any other
    // facility. There is therefore NO "what do we do with a non-Pro seeker"
    // question left for a concierge/advisor/matching path to answer.
    //
    // Nothing below this comment may write concierge_inquiries, create a
    // concierge_case_events row, assign an advisor, create an introduction,
    // insert lead_distributions, call notify-free-tier-inquiry-redirect or
    // process-lead-redistribution, or surface an alternative facility.
    // See docs/directory-cutover-stage-02-inquiry-model-amendment.md.

    // ===== INQUIRY INSERTION (one row, one facility) =====
    // `leads` is historical table naming retained for backward compatibility
    // (renaming it is a needless production risk). Conceptually a row here is
    // a FACILITY INQUIRY: it is not a saleable lead, has no exclusivity or
    // redistribution window, no credit cost, and no unlock step.
    // The exclusive_until / extended_until / redistribution_status fields
    // were part of the per-lead-sale monetization (process-lead-redistribution
    // cron that rotated unfulfilled leads to other facilities for resale).
    // That product was retired in the EKRA flat-fee rebuild; the cron is
    // gone, the column writes stopped 2026-05-21. Pro leads now land in
    // ONE provider's inbox and stay there — no reassignment, no
    // redistribution window. `now` is hoisted to the top of the handler.

    // Generate idempotency key if not provided
    const idempotencyKey = data.idempotencyKey || `${data.email}-${data.facilityId}-${Date.now()}`;

    // Determine inquiry type based on preferred contact method
    const inquiryType = (validatedPreferredContact === "call" || validatedPreferredContact === "phone") 
      ? "request_callback" 
      : "request_info";

    // Detect high-intent signals
    const isHighIntent = !!(
      (data.urgency && ["Urgent", "Immediately", "immediate"].includes(data.urgency)) ||
      (validatedPreferredContact === "call" || validatedPreferredContact === "phone") ||
      (data.readinessLevel && ["high", "ready"].includes(data.readinessLevel)) ||
      (data.levelOfCare && ["detox", "residential", "inpatient"].some(t => (data.levelOfCare || "").toLowerCase().includes(t)))
    );

    const { data: lead, error: insertError } = await supabase
      .from("leads")
      .insert({
        facility_id: data.facilityId,
        name: data.name,
        email: data.email,
        phone: data.phone,
        preferred_contact: validatedPreferredContact,
        message: data.message,
        urgency: validatedUrgency || null,
        level_of_care: data.levelOfCare || null,
        insurance_type: data.insuranceType || null,
        insurance_provider: data.insuranceProvider || null,
        location_zip: data.locationZip || null,
        location_city_state: data.locationCityState || null,
        primary_substance: Array.isArray(data.primarySubstance) ? data.primarySubstance.map(s => sanitizeGenericField(s, 50)).filter(Boolean) : [],
        dual_diagnosis: data.dualDiagnosis || null,
        who_seeking_help: data.whoSeekingHelp || null,
        source: validatedSource,
        status: "new",
        email_verified: true,
        ip_hash: (data as any).ipHash || null,
        idempotency_key: idempotencyKey,
        // High-intent flag
        high_intent: isHighIntent,
        // Inquiry type for pricing
        inquiry_type: inquiryType,
        age_range: data.ageRange || null,
        gender: data.gender || null,
        relationship_to_patient: data.relationshipToPatient || null,
        previous_treatment: data.previousTreatment || null,
        previous_treatment_details: data.previousTreatmentDetails || null,
        co_occurring_conditions: Array.isArray(data.coOccurringConditions) ? data.coOccurringConditions : null,
        employment_status: data.employmentStatus || null,
        veteran_status: data.veteranStatus || null,
        legal_involvement: data.legalInvolvement || null,
        readiness_level: data.readinessLevel || null,
        best_time_to_call: data.bestTimeToCall || null,
        budget_preference: data.budgetPreference || null,
        special_needs: Array.isArray(data.specialNeeds) ? data.specialNeeds : [],
      })
      .select("id")
      .single();

    if (insertError) {
      // Check for idempotency violation (unique constraint)
      if (insertError.code === '23505' && insertError.message?.includes('idempotency')) {
        log(requestId, "WARN", "Idempotent duplicate caught by constraint");
        return new Response(
          JSON.stringify({ success: true, message: "Your inquiry has been sent successfully!" }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      log(requestId, "ERROR", "Failed to insert lead", { error: insertError.message, code: insertError.code });
      return errorResponse(500, "lead_insert_failed", "Failed to submit inquiry. Please try again.");
    }

    log(requestId, "INFO", "Lead inserted", { leadId: lead.id });

    // `lead_distributions` insert removed 2026-05-21 — the table was the
    // ledger for the retired per-lead-sale model (rotated unfulfilled leads
    // between facilities for resale). Under the EKRA flat-fee model a lead
    // routes to exactly one facility and stays there; the audit trail is
    // the `leads.facility_id` itself + the admin_audit_log row written
    // whenever an admin manually moves a lead. The historical
    // lead_distributions rows are kept in the DB for backfill / analytics
    // joins on legacy rows but no new rows are produced.

    // ===== NON-BLOCKING NOTIFICATIONS (with idempotency) =====
    // Send seeker confirmation email — idempotency keyed to lead ID
    const firstName = data.name.split(" ")[0];
    try {
      await sendEmailWithRetry(supabase, resend, {
        from: "RehabLookup <no-reply@rehablookup.com>",
        to: [data.email],
        subject: `Your inquiry to ${facility.name} has been received`,
        html: getSeekerConfirmationEmail(data.name, facility.name, {
          urgency: data.urgency,
          levelOfCare: data.levelOfCare,
          insuranceType: data.insuranceType,
          preferredContact: data.preferredContact,
          message: data.message,
          submittedAt: now,
          deliveryState,
        }),
      }, {
        emailType: "seeker_inquiry_confirmation",
        idempotencyKey: `seeker-confirm-${lead.id}`,
      });
      log(requestId, "INFO", "Seeker email sent");
    } catch (e) {
      log(requestId, "WARN", "Failed to send seeker email", { error: String(e) });
    }

    // ── Channel-aware fan-out (audit fix M3) ────────────────────────────
    // Single read of provider notification preferences gates all 3 channels
    // (email, SMS, in-app). Master switch is `notify_new_leads`. Per-channel
    // toggles: `email_lead_alerts`, `sms_lead_alerts`, `browser_notifications`
    // (re-used as the in-app toggle until a dedicated `inapp_lead_alerts`
    // column exists). Default-on for any pref that is null/undefined so an
    // unmigrated row keeps existing behaviour.
    //
    // CLAIM-GATED READ (post-rollout hotfix #1). An unclaimed listing has no
    // provider account at all — `facility.user_id` is NULL — so there are no
    // preferences to read. This used to run unconditionally as
    // `.eq("user_id", null)`: a guaranteed-empty query issued on behalf of a
    // provider that does not exist. It is skipped now, and every channel
    // below stays closed through `masterEnabled`.
    const notifPrefs = facilityIsClaimed
      ? (
          await supabase
            .from("notification_preferences")
            .select("notify_new_leads, email_lead_alerts, sms_lead_alerts, browser_notifications")
            .eq("user_id", facility.user_id)
            .maybeSingle()
        ).data
      : null;

    // An unclaimed listing has no provider account, so every channel is off:
    // `notify_new_leads` defaults to true for a missing preferences row, which
    // would otherwise open the email branch for a facility with no verified
    // human behind it.
    const masterEnabled = facilityIsClaimed && (notifPrefs?.notify_new_leads ?? true);
    const emailEnabled = masterEnabled && (notifPrefs?.email_lead_alerts ?? true);
    const smsEnabled = masterEnabled && (notifPrefs?.sms_lead_alerts ?? false);
    const inAppEnabled = masterEnabled && (notifPrefs?.browser_notifications ?? true);

    log(requestId, "INFO", "Channel fan-out plan", { masterEnabled, emailEnabled, smsEnabled, inAppEnabled });

    // Send facility notification email — idempotency keyed to lead ID.
    // Claim-gated for the same reason as the preference read above: there is
    // no provider profile to resolve for an unclaimed listing.
    const profile = facilityIsClaimed
      ? (
          await supabase
            .from("profiles")
            .select("email")
            .eq("user_id", facility.user_id)
            .maybeSingle()
        ).data
      : null;

    // Recipient resolution, most-trusted first. The `facility.email` fallback
    // is permitted ONLY for a claimed listing, where a real provider account
    // owns the row and has had the opportunity to correct it. For an unclaimed
    // listing that column is unverified import provenance, so it is never used
    // — `facilityIsClaimed` is false there and the whole branch is skipped.
    const notificationEmail = facilityIsClaimed
      ? ((facility.reply_email_verified && facility.reply_email)
          ? facility.reply_email
          : (profile?.email || facility.email))
      : null;

    // ── Provider-email outcome, as reported by the sender itself ──────────
    //
    // `sendEmailWithRetry` is the ONLY definition of success this function
    // uses. Its contract (see the inlined resilient-email-sender above):
    //   success:true  → Resend accepted the message, OR the idempotency key
    //                   already had a "sent" tracking event (deduplicated —
    //                   the mail genuinely went out on an earlier attempt).
    //   success:false → recipient suppressed, permanent Resend rejection, or
    //                   the retry budget was exhausted.
    // A thrown error is folded into the same shape below. `null` means the
    // send was never attempted: channel disabled, no recipient resolved, or
    // the listing is unclaimed. The instant-email audit row keys off exactly
    // this value — it is never re-derived from "we reached the send call".
    let providerEmailResult: SendResult | null = null;

    if (emailEnabled && notificationEmail) {
      try {
        providerEmailResult = await sendEmailWithRetry(supabase, resend, {
          from: "RehabLookup <no-reply@rehablookup.com>",
          to: [notificationEmail],
          subject: `New Inquiry from ${firstName} - ${facility.name}`,
          html: getFacilityNotificationEmail(data.name, facility.name, {
            email: data.email,
            phone: data.phone,
            urgency: data.urgency,
            levelOfCare: data.levelOfCare,
            insuranceType: data.insuranceType,
            message: data.message,
            preferredContact: data.preferredContact,
            submittedAt: now,
          }),
        }, {
          emailType: "facility_new_lead",
          idempotencyKey: `facility-lead-${lead.id}`,
        });
        if (providerEmailResult.success) {
          log(requestId, "INFO", "Facility email sent", {
            deduplicated: providerEmailResult.deduplicated ?? false,
            attempts: providerEmailResult.attempts,
          });
        } else {
          // NOT a "sent" log line, and deliberately not an admin alert: a
          // suppressed or bouncing provider address is a mailbox problem, and
          // the inquiry is already durably in `leads` + the provider inbox.
          log(requestId, "WARN", "Facility email not sent", {
            suppressed: providerEmailResult.suppressed ?? false,
            deadLettered: providerEmailResult.deadLettered ?? false,
            error: providerEmailResult.error ?? null,
          });
        }
      } catch (e) {
        providerEmailResult = { success: false, error: String(e), attempts: 0 };
        log(requestId, "WARN", "Failed to send facility email", { error: String(e) });
      }
    } else if (!facilityIsClaimed) {
      log(requestId, "INFO", "Unclaimed listing; no provider email recipient exists, skipping");
    } else if (!emailEnabled) {
      log(requestId, "INFO", "Email channel disabled by preference; skipping");
    } else {
      log(requestId, "INFO", "No provider notification email resolved; skipping");
    }

    // SMS notification (non-blocking) — gated by smsEnabled (master + sms_lead_alerts)
    try {
      if (smsEnabled) {
        const { data: providerProfile } = await supabase
          .from("profiles")
          .select("phone, phone_verified")
          .eq("user_id", facility.user_id)
          .maybeSingle();

        if (providerProfile?.phone && providerProfile.phone_verified) {
          const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
          const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

          // We DO await the response + check status so a Twilio outage or
          // mis-config doesn't silently drop the SMS. One retry on transient
          // failure; on final failure, insert an admin_notifications row so
          // ops can investigate / manually resend.
          let smsOk = false;
          let smsResult: { sent?: boolean; reason?: string; error?: string } | null = null;
          let lastError: string | null = null;
          for (let attempt = 1; attempt <= 2; attempt++) {
            try {
              const smsResp = await fetch(
                `${supabaseUrl}/functions/v1/send-sms-notification`,
                {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${supabaseKey}`,
                  },
                  body: JSON.stringify({
                    userId: facility.user_id,
                    notificationType: "new_lead",
                    data: {
                      leadName: data.name,
                      leadCity: data.locationCityState?.split(",")[0]?.trim() || null,
                      levelOfCare: data.levelOfCare,
                      urgency: data.urgency,
                      facilityName: facility.name,
                    },
                  }),
                },
              );
              smsResult = await smsResp.json().catch(() => null);
              if (smsResp.ok) {
                // send-sms-notification returns 200 even for skip cases
                // (Twilio off, opted out, phone not verified, etc.).
                // sent=true means a real SMS went out.
                smsOk = true;
                log(requestId, "INFO", "SMS notification result", {
                  attempt,
                  sent: smsResult?.sent ?? false,
                  reason: smsResult?.reason ?? null,
                });
                break;
              }
              lastError = `HTTP ${smsResp.status}: ${smsResult?.error ?? "unknown"}`;
            } catch (fetchErr) {
              lastError = fetchErr instanceof Error ? fetchErr.message : String(fetchErr);
            }
            if (attempt === 1) {
              // 500ms backoff before retry
              await new Promise((r) => setTimeout(r, 500));
            }
          }
          if (!smsOk) {
            log(requestId, "ERROR", "SMS notification failed after retries", { lastError });
            // Surface to admins via admin_notifications so a human can
            // re-send manually + investigate the underlying Twilio issue.
            try {
              await supabase.from("admin_notifications").insert({
                type: "lead_sms_delivery_failure",
                title: "Lead SMS notification failed",
                message: `Could not deliver SMS for new lead to facility "${facility.name}" (provider ${facility.user_id}). Last error: ${lastError}`,
                metadata: {
                  facility_id: facility.id,
                  provider_user_id: facility.user_id,
                  request_id: requestId,
                  last_error: lastError,
                } as Record<string, unknown>,
              });
            } catch (adminErr) {
              log(requestId, "WARN", "admin_notifications insert failed", {
                error: adminErr instanceof Error ? adminErr.message : String(adminErr),
              });
            }
          }
        } else {
          log(requestId, "INFO", "SMS skipped: provider has no verified phone");
        }
      } else {
        log(requestId, "INFO", "SMS channel disabled by preference; skipping");
      }
    } catch (smsError) {
      log(requestId, "WARN", "Failed to send SMS notification", { error: String(smsError) });
    }

    // In-app notification — Pro providers see the full lead name directly.
    const urgencyLabel = data.urgency && ["Urgent", "Immediately", "immediate"].includes(data.urgency) ? " — Needs help now" : "";
    const notificationTitle = isHighIntent ? "🔥 High-Intent Inquiry Received" : "New Inquiry Received";
    const notificationMessage = `${data.name} submitted an inquiry${data.levelOfCare ? ` for ${data.levelOfCare.replace(/_/g, ' ')}` : ''}${urgencyLabel}`;

    if (inAppEnabled) {
      try {
        const { error: notifErr } = await supabase.from("provider_notifications").insert({
          user_id: facility.user_id,
          facility_id: facility.id,
          type: isHighIntent ? "high_intent_lead" : "new_lead",
          title: notificationTitle,
          message: notificationMessage,
          metadata: {
            lead_id: lead.id,
            urgency: data.urgency,
            level_of_care: data.levelOfCare,
            location_city_state: data.locationCityState,
            source: validatedSource,
            high_intent: isHighIntent,
            inquiry_type: inquiryType,
            link: `/provider/inquiries?lead=${lead.id}`,
          },
          read: false,
        });
        if (notifErr) throw notifErr;
      } catch (notifError) {
        // Round-30 audit: this catch previously only logged to console.
        // If the insert fails (RLS, FK, constraint), the provider never
        // sees an in-app alert AND ops has no signal. Now surfaced.
        log(requestId, "WARN", "Failed to create in-app notification", { error: String(notifError) });
        try {
          await supabase.from("admin_notifications").insert({
            type: "lead_notification_failure",
            title: "Provider in-app lead notification failed",
            message: `provider_notifications insert failed for lead ${lead.id} → provider ${facility.user_id} (facility ${facility.id}). Lead row exists but provider has no in-app alert.`,
            metadata: {
              lead_id: lead.id,
              provider_user_id: facility.user_id,
              facility_id: facility.id,
              request_id: requestId,
              error: notifError instanceof Error ? notifError.message : String(notifError),
            } as Record<string, unknown>,
          });
        } catch (adminErr) {
          log(requestId, "WARN", "admin_notifications insert failed (provider notif)", {
            error: adminErr instanceof Error ? adminErr.message : String(adminErr),
          });
        }
      }
    } else {
      log(requestId, "INFO", "In-app channel disabled by preference; skipping");
    }


    // ── Instant EMAIL notification audit ────────────────────────────────
    //
    // Round-30 audit: the catch was console-log-only; billing + analytics
    // depend on this table to prove a lead was notified, so an insert failure
    // raises an admin alert.
    //
    // POST-ROLLOUT HOTFIX #1 — the row is now CONDITIONAL, for two reasons.
    //
    // 1. It used to be written unconditionally with `user_id: facility.user_id`.
    //    For an unclaimed listing that column is NULL and production's
    //    `notification_events.user_id` is NOT NULL, so EVERY inquiry to an
    //    unclaimed facility hit a guaranteed constraint violation, and the
    //    catch below then raised "Lead notification audit trail missing" — a
    //    false operational failure for a provider notification that was
    //    correctly never supposed to happen. An unclaimed listing is an
    //    expected state, not an incident.
    //
    // 2. It also hardcoded `channel:"email", event_type:"sent"` regardless of
    //    whether an email was disabled, unaddressed, suppressed or rejected.
    //    An audit table has to record what actually happened.
    //
    // Scope is deliberately unchanged: this table has always been the instant
    // EMAIL audit, so the fix makes that one record truthful rather than
    // introducing per-channel SMS/in-app event rows. `providerEmailResult`
    // carries the sender's own verdict, so there is exactly one definition of
    // "sent" in this function.
    if (!providerEmailResult?.success) {
      log(requestId, "INFO", "No provider email was sent; no instant email audit row written", {
        facilityIsClaimed,
        emailEnabled,
        emailAttempted: providerEmailResult !== null,
        suppressed: providerEmailResult?.suppressed ?? false,
      });
    } else {
      try {
        const { error: trackErr } = await supabase.from("notification_events").insert({
          lead_id: lead.id,
          facility_id: facility.id,
          user_id: facility.user_id,
          notification_stage: "instant",
          channel: "email",
          event_type: "sent",
          notification_type: isHighIntent ? "high_intent" : "new_lead",
          metadata: { urgency: data.urgency },
        });
        if (trackErr) throw trackErr;
      } catch (trackError) {
        log(requestId, "WARN", "Failed to track notification event", { error: String(trackError) });
        try {
          await supabase.from("admin_notifications").insert({
            type: "lead_notification_event_failure",
            title: "Lead notification audit trail missing",
            message: `notification_events insert failed for lead ${lead.id} → facility ${facility.id}. Lead was notified but billing/analytics audit row is missing.`,
            metadata: {
              lead_id: lead.id,
              facility_id: facility.id,
              user_id: facility.user_id,
              request_id: requestId,
              error: trackError instanceof Error ? trackError.message : String(trackError),
            } as Record<string, unknown>,
          });
        } catch (adminErr) {
          log(requestId, "WARN", "admin_notifications insert failed (notif event)", {
            error: adminErr instanceof Error ? adminErr.message : String(adminErr),
          });
        }
      }
    }

    log(requestId, "INFO", "Inquiry submitted successfully", { leadId: lead.id });

    return new Response(
      JSON.stringify({
        success: true,
        leadId: lead.id,
        facilityId: data.facilityId,
        facilityName: facility.name,
        // Lets the UI render truthful confirmation copy. An unclaimed listing
        // is stored and pinned, but nobody was notified, so the client must
        // not claim it was "sent to" anyone.
        deliveryState,
        message:
          deliveryState === "stored_pending_claim"
            ? "Your inquiry was recorded for this facility."
            : "Your inquiry was sent to this facility.",
        _version: VERSION,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    log(requestId, "ERROR", "Unhandled error", { error: error instanceof Error ? error.message : String(error) });
    return errorResponse(500, "internal_error", "An unexpected error occurred. Please try again.");
  }
});
