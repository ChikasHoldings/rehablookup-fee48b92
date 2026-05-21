// ⚠ AUTO-GENERATED HEADER ⚠
// _shared modules have been inlined into this file so that
// `supabase functions deploy --use-api` (server-side bundler)
// can deploy without resolving local relative imports. The
// canonical sources live under supabase/functions/_shared/ —
// don't edit the inlined copies below; edit the originals and
// re-run `python3 scripts/inline-shared.py send-message-notifications`.

// ── URL imports (dedup'd) ──────────────────────────────────
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4?target=denonext";
import { Resend } from "https://esm.sh/resend@2.0.0?target=denonext";

// ── inlined from _shared/message-email-templates.ts ─────────────
/**
 * Message Notification Email Templates
 * Branded styling matching concierge notification templates
 */

// ============================================================================
// TYPES
// ============================================================================

export interface MessageEmailData {
  seekerName: string;
  seekerEmail: string;
  facilityName?: string;
  senderName: string;
  senderType: "seeker" | "facility" | "advisor";
  messagePreview: string;
  threadType: "advisor" | "facility";
}

// ============================================================================
// SHARED COMPONENTS
// ============================================================================

const BRAND_COLORS = {
  primary: "#1B365D",
  primaryLight: "#2C4A7F",
  accent: "#0EA5E9",
  success: "#10B981",
  warning: "#F59E0B",
  error: "#EF4444",
  background: "#F8FAFC",
  cardBg: "#FFFFFF",
  textPrimary: "#1E293B",
  textSecondary: "#64748B",
  border: "#E2E8F0",
};

function emailWrapper(content: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: ${BRAND_COLORS.background}; -webkit-font-smoothing: antialiased;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: ${BRAND_COLORS.background}; padding: 32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; width: 100%;">
          ${content}
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;
}

function emailHeader(title: string, subtitle?: string, icon?: string): string {
  const iconHtml = icon 
    ? `<div style="font-size: 48px; margin-bottom: 16px;">${icon}</div>` 
    : '';
  const subtitleHtml = subtitle 
    ? `<p style="margin: 8px 0 0 0; color: #ffffff; font-family: Arial, Helvetica, sans-serif; font-size: 14px;">${subtitle}</p>` 
    : '';

  return `
          <tr>
            <td style="background-color: ${BRAND_COLORS.primary}; background: ${BRAND_COLORS.primary}; padding: 32px; border-radius: 12px 12px 0 0; text-align: center;">
              ${iconHtml}
              <p style="margin: 0 0 8px 0; font-size: 12px; color: #ffffff; font-family: Arial, Helvetica, sans-serif; text-transform: uppercase; letter-spacing: 1px;">REHABLOOKUP CONCIERGE</p>
              <h1 style="margin: 0; font-size: 24px; color: #ffffff; font-family: Arial, Helvetica, sans-serif; font-weight: 600;">
                ${title}
              </h1>
              ${subtitleHtml}
            </td>
          </tr>
`;
}

function emailBody(content: string): string {
  return `
          <tr>
            <td style="background: ${BRAND_COLORS.cardBg}; padding: 32px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; border-left: 1px solid ${BRAND_COLORS.border}; border-right: 1px solid ${BRAND_COLORS.border};">
              ${content}
            </td>
          </tr>
`;
}

function emailFooter(): string {
  return `
          <tr>
            <td style="background-color: ${BRAND_COLORS.primary}; background: ${BRAND_COLORS.primary}; padding: 24px; border-radius: 0 0 12px 12px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <p style="margin: 0 0 8px 0; font-size: 18px; font-weight: 600; color: #ffffff; font-family: Arial, Helvetica, sans-serif;">RehabLookup Concierge</p>
                    <p style="margin: 0 0 16px 0; font-size: 13px; color: #cbd5e1; font-family: Arial, Helvetica, sans-serif;">Personalized treatment matching</p>
                    <p style="margin: 0; font-family: Arial, Helvetica, sans-serif;">
                      <a href="https://rehablookup.com" style="color: #93c5fd; text-decoration: none; font-size: 12px;">Website</a>
                      <span style="color: #64748b; margin: 0 8px;">|</span>
                      <a href="mailto:placement@rehablookup.com" style="color: #93c5fd; text-decoration: none; font-size: 12px;">Support</a>
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
`;
}

function messageBox(content: string, senderLabel: string): string {
  return `
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background: #F0F9FF; border-left: 4px solid ${BRAND_COLORS.accent}; border-radius: 0 8px 8px 0; margin: 20px 0;">
                <tr>
                  <td style="padding: 20px;">
                    <p style="margin: 0 0 8px 0; font-size: 12px; color: ${BRAND_COLORS.textSecondary}; text-transform: uppercase; letter-spacing: 0.5px;">
                      ${senderLabel}
                    </p>
                    <p style="margin: 0; font-size: 15px; color: ${BRAND_COLORS.textPrimary}; line-height: 1.6; white-space: pre-wrap;">
                      "${content}"
                    </p>
                  </td>
                </tr>
              </table>
`;
}

function ctaButton(text: string, url: string, color: string = BRAND_COLORS.primary): string {
  return `
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top: 28px;">
                <tr>
                  <td align="center">
                    <a href="${url}" style="display: inline-block; background: ${color}; color: #ffffff; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 15px;">
                      ${text}
                    </a>
                  </td>
                </tr>
              </table>
`;
}

function paragraph(text: string): string {
  return `<p style="margin: 0 0 16px 0; color: ${BRAND_COLORS.textPrimary}; font-size: 15px; line-height: 1.6;">${text}</p>`;
}

function truncateMessage(message: string, maxLength: number = 200): string {
  if (message.length <= maxLength) return message;
  return message.substring(0, maxLength).trim() + "...";
}

// ============================================================================
// EMAIL TEMPLATES
// ============================================================================

/**
 * Email sent to seeker when facility or advisor sends a message
 */
export function messageToSeekerEmail(data: MessageEmailData): string {
  const firstName = data.seekerName.split(" ")[0];
  const senderLabel = data.senderType === "advisor" 
    ? "Your Placement Advisor" 
    : data.facilityName || "Treatment Center";

  const content = `
    ${paragraph(`Hi ${firstName},`)}
    ${paragraph(`You have a new message in your concierge portal.`)}
    ${messageBox(truncateMessage(data.messagePreview), senderLabel)}
    ${paragraph(`Log in to your portal to view the full message and respond.`)}
    ${ctaButton("View & Reply", "https://rehablookup.com/account/concierge", BRAND_COLORS.accent)}
  `;

  return emailWrapper(
    emailHeader("New Message", senderLabel, "💬") +
    emailBody(content) +
    emailFooter()
  );
}

/**
 * Email sent to facility when seeker sends a message
 */
export function messageToFacilityEmail(data: MessageEmailData): string {
  const content = `
    ${paragraph(`${data.seekerName} has sent you a message through the concierge portal.`)}
    ${messageBox(truncateMessage(data.messagePreview), data.seekerName)}
    ${paragraph(`Quick responses help build trust and increase conversion rates. Log in to your provider dashboard to reply.`)}
    ${ctaButton("Reply Now", "https://rehablookup.com/provider/concierge", BRAND_COLORS.primary)}
  `;

  return emailWrapper(
    emailHeader("New Seeker Message", data.seekerName, "📨") +
    emailBody(content) +
    emailFooter()
  );
}

/**
 * Email sent to admin/advisor when seeker sends a message in advisor thread
 */
export function messageToAdvisorEmail(data: MessageEmailData): string {
  const content = `
    ${paragraph(`A concierge client has sent a message in their advisor thread.`)}
    ${messageBox(truncateMessage(data.messagePreview), data.seekerName)}
    ${paragraph(`Log in to the admin dashboard to respond.`)}
    ${ctaButton("View Message", "https://rehablookup.com/admin/concierge", BRAND_COLORS.primary)}
  `;

  return emailWrapper(
    emailHeader("Advisor Thread Message", data.seekerName, "📩") +
    emailBody(content) +
    emailFooter()
  );
}

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

// ── send-message-notifications entrypoint body ─────────────────────────
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface NotificationPayload {
  notificationType: "message_to_seeker" | "message_to_facility" | "message_to_advisor";
  threadId: string;
  messageContent: string;
  senderType: "seeker" | "facility" | "advisor";
}

// Helper to send SMS via Twilio. Round-30 retry pattern: one retry
// on transient failure (500ms backoff); on final failure, insert an
// admin_notifications row so ops can investigate Twilio outages
// instead of silently losing in-app message SMSes.
async function sendSMS(
  phone: string,
  message: string,
  supabase?: ReturnType<typeof createClient>,
  ctx?: { threadId?: string; recipientType?: string },
): Promise<boolean> {
  const twilioAccountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
  const twilioAuthToken = Deno.env.get("TWILIO_AUTH_TOKEN");
  const twilioPhoneNumber = Deno.env.get("TWILIO_PHONE_NUMBER");

  if (!twilioAccountSid || !twilioAuthToken || !twilioPhoneNumber) {
    console.log("Twilio not configured, skipping SMS");
    return false;
  }

  // Format phone to E.164
  let formattedPhone = phone.replace(/\D/g, "");
  if (formattedPhone.length === 10) {
    formattedPhone = `+1${formattedPhone}`;
  } else if (formattedPhone.length === 11 && formattedPhone.startsWith("1")) {
    formattedPhone = `+${formattedPhone}`;
  } else {
    formattedPhone = `+${formattedPhone}`;
  }

  try {
    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`;
    const authHeader = btoa(`${twilioAccountSid}:${twilioAuthToken}`);

    // Truncate message to SMS limit
    const truncatedMessage = message.length > 160 ? message.substring(0, 157) + "..." : message;

    let lastError: string | null = null;
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const response = await fetch(twilioUrl, {
          method: "POST",
          headers: {
            "Authorization": `Basic ${authHeader}`,
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: new URLSearchParams({
            To: formattedPhone,
            From: twilioPhoneNumber,
            Body: truncatedMessage,
          }),
        });
        if (response.ok) {
          const result = await response.json();
          console.log("SMS sent successfully:", result.sid, "attempt:", attempt);
          return true;
        }
        lastError = `HTTP ${response.status}: ${(await response.text()).slice(0, 200)}`;
      } catch (fetchErr) {
        lastError = fetchErr instanceof Error ? fetchErr.message : String(fetchErr);
      }
      if (attempt === 1) {
        await new Promise((r) => setTimeout(r, 500));
      }
    }

    console.error("SMS failed after retries:", lastError);
    if (supabase) {
      try {
        await supabase.from("admin_notifications").insert({
          type: "message_sms_delivery_failure",
          title: "In-app message SMS failed",
          message: `Twilio rejected an in-app message SMS notification. Recipient phone redacted; thread ${ctx?.threadId ?? "unknown"}. Last error: ${lastError}`,
          metadata: {
            thread_id: ctx?.threadId ?? null,
            recipient_type: ctx?.recipientType ?? null,
            last_error: lastError,
          } as Record<string, unknown>,
        });
      } catch (adminErr) {
        console.error("admin_notifications insert failed:", adminErr);
      }
    }
    return false;
  } catch (error) {
    console.error("SMS send error:", error);
    return false;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!resendApiKey || !supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing required environment variables");
    }

    const resend = new Resend(resendApiKey);
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const payload: NotificationPayload = await req.json();
    console.log("Received notification request:", payload.notificationType);

    // Fetch thread details
    const { data: thread, error: threadError } = await supabase
      .from("concierge_threads")
      .select(`
        id,
        thread_type,
        inquiry_id,
        facility_id,
        user_id,
        concierge_inquiries (
          id,
          user_name,
          user_email,
          user_phone
        ),
        facilities (
          id,
          name,
          reply_email,
          email
        )
      `)
      .eq("id", payload.threadId)
      .single();

    if (threadError || !thread) {
      console.error("Thread fetch error:", threadError);
      throw new Error("Thread not found");
    }

    const inquiry = thread.concierge_inquiries as any;
    const facility = thread.facilities as any;

    const baseEmailData: MessageEmailData = {
      seekerName: inquiry?.user_name || "Client",
      seekerEmail: inquiry?.user_email || "",
      facilityName: facility?.name,
      senderName: "",
      senderType: payload.senderType,
      messagePreview: payload.messageContent,
      threadType: thread.thread_type as "advisor" | "facility",
    };

    const emails: Array<{ to: string; subject: string; html: string }> = [];
    let smsRecipient: { phone: string; message: string } | null = null;

    const portalLink = "https://rehablookup.com/account/concierge";

    switch (payload.notificationType) {
      case "message_to_seeker": {
        // Notify seeker when facility or advisor sends message
        if (inquiry?.user_email) {
          const senderLabel = payload.senderType === "advisor" 
            ? "Your Placement Advisor" 
            : facility?.name || "Treatment Center";
          
          emails.push({
            to: inquiry.user_email,
            subject: `New message from ${senderLabel}`,
            html: messageToSeekerEmail({
              ...baseEmailData,
              senderName: senderLabel,
            }),
          });

          // Also send SMS if phone is available
          if (inquiry?.user_phone) {
            const preview = payload.messageContent.length > 80 
              ? payload.messageContent.substring(0, 77) + "..." 
              : payload.messageContent;
            smsRecipient = {
              phone: inquiry.user_phone,
              message: `RehabLookup: New message from ${senderLabel}. "${preview}" View & reply: ${portalLink}`,
            };
          }
        }
        break;
      }

      case "message_to_facility": {
        // Notify facility when seeker sends message
        const facilityEmail = facility?.reply_email || facility?.email;
        if (facilityEmail) {
          emails.push({
            to: facilityEmail,
            subject: `New message from ${inquiry?.user_name || "Concierge Client"}`,
            html: messageToFacilityEmail({
              ...baseEmailData,
              senderName: inquiry?.user_name || "Client",
            }),
          });
        }
        break;
      }

      case "message_to_advisor": {
        // Notify admin team when seeker sends message in advisor thread
        const adminEmail = "placement@rehablookup.com";
        emails.push({
          to: adminEmail,
          subject: `Advisor message from ${inquiry?.user_name || "Concierge Client"}`,
          html: messageToAdvisorEmail({
            ...baseEmailData,
            senderName: inquiry?.user_name || "Client",
          }),
        });
        break;
      }
    }

    // Send all emails
    for (const email of emails) {
      try {
        const result = await sendEmailWithRetry(supabase, resend, {
          from: "RehabLookup Concierge <no-reply@rehablookup.com>",
          to: [email.to],
          subject: email.subject,
          html: email.html,
        }, {
          emailType: `message_${payload.notificationType}`,
          idempotencyKey: `msg-${payload.threadId}-${payload.notificationType}-${Date.now().toString(36)}`,
        });
        console.log(`Email sent to ${email.to}:`, result);
      } catch (emailError) {
        console.error(`Failed to send email to ${email.to}:`, emailError);
      }
    }

    // Send SMS if applicable
    let smsSent = false;
    if (smsRecipient) {
      smsSent = await sendSMS(
        smsRecipient.phone,
        smsRecipient.message,
        supabase,
        { threadId: payload.threadId, recipientType: payload.notificationType },
      );
    }

    return new Response(
      JSON.stringify({ success: true, emailsSent: emails.length, smsSent }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error in send-message-notifications:", error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
