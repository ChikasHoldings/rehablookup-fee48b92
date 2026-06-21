// ⚠ AUTO-GENERATED HEADER ⚠
// _shared modules have been inlined into this file so that
// `supabase functions deploy --use-api` (server-side bundler)
// can deploy without resolving local relative imports. The
// canonical sources live under supabase/functions/_shared/ —
// don't edit the inlined copies below; edit the originals and
// re-run `python3 scripts/inline-shared.py send-tour-notifications`.

// ── URL imports (dedup'd) ──────────────────────────────────
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4?target=denonext";
import { Resend } from "https://esm.sh/resend@2.0.0?target=denonext";

// ── inlined from _shared/tour-email-templates.ts ─────────────
/**
 * Tour Notification Email Templates
 * Branded styling matching concierge notification templates
 */

// ============================================================================
// TYPES
// ============================================================================

export interface TourEmailData {
  seekerName: string;
  facilityName: string;
  facilityCity: string;
  facilityState: string;
  tourType: "in-person" | "virtual";
  preferredDates?: string[];
  proposedDateTime?: string;
  confirmedDateTime?: string;
  notes?: string;
  contactPreference?: string;
  facilityNotes?: string;
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

function infoBox(content: string, borderColor: string = BRAND_COLORS.accent): string {
  return `
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background: #F0F9FF; border-left: 4px solid ${borderColor}; border-radius: 0 8px 8px 0; margin: 20px 0;">
                <tr>
                  <td style="padding: 20px;">
                    ${content}
                  </td>
                </tr>
              </table>
`;
}

function successBox(content: string): string {
  return `
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background: #ECFDF5; border-left: 4px solid ${BRAND_COLORS.success}; border-radius: 0 8px 8px 0; margin: 20px 0;">
                <tr>
                  <td style="padding: 20px;">
                    ${content}
                  </td>
                </tr>
              </table>
`;
}

function warningBox(content: string): string {
  return `
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background: #FFFBEB; border-left: 4px solid ${BRAND_COLORS.warning}; border-radius: 0 8px 8px 0; margin: 20px 0;">
                <tr>
                  <td style="padding: 20px;">
                    ${content}
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

function formatTourType(type: string): string {
  return type === "virtual" ? "🎥 Virtual Tour" : "🏠 In-Person Tour";
}

function formatPreferredDates(dates: string[]): string {
  if (!dates || dates.length === 0) return "Flexible — contact to arrange";
  return dates.map(d => {
    try {
      return new Date(d).toLocaleDateString("en-US", { 
        weekday: "short", 
        month: "short", 
        day: "numeric",
        year: "numeric"
      });
    } catch {
      return d;
    }
  }).join(" • ");
}

function formatDateTime(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return dateStr;
  }
}

// ============================================================================
// EMAIL TEMPLATES
// ============================================================================

/**
 * Email sent to facility when user requests a tour
 */
export function tourRequestedFacilityEmail(data: TourEmailData): string {
  const tourDetails = `
    <p style="margin: 0 0 12px 0; font-size: 15px; color: ${BRAND_COLORS.textPrimary};">
      <strong>Seeker:</strong> ${data.seekerName}
    </p>
    <p style="margin: 0 0 12px 0; font-size: 15px; color: ${BRAND_COLORS.textPrimary};">
      <strong>Tour Type:</strong> ${formatTourType(data.tourType)}
    </p>
    <p style="margin: 0 0 12px 0; font-size: 15px; color: ${BRAND_COLORS.textPrimary};">
      <strong>Preferred Dates:</strong> ${formatPreferredDates(data.preferredDates || [])}
    </p>
    ${data.contactPreference ? `
    <p style="margin: 0 0 12px 0; font-size: 15px; color: ${BRAND_COLORS.textPrimary};">
      <strong>Contact Preference:</strong> ${data.contactPreference}
    </p>` : ''}
    ${data.notes ? `
    <p style="margin: 0; font-size: 14px; color: ${BRAND_COLORS.textSecondary}; font-style: italic;">
      "${data.notes}"
    </p>` : ''}
  `;

  const content = `
    ${paragraph(`A concierge client has requested a tour at your facility.`)}
    ${infoBox(tourDetails)}
    ${paragraph(`Please log in to your provider dashboard to propose a tour time. Quick responses help convert interested seekers into admissions.`)}
    ${ctaButton("View Tour Request", "https://rehablookup.com/provider/concierge")}
  `;

  return emailWrapper(
    emailHeader("New Tour Request", `${data.facilityName}`, "📅") +
    emailBody(content) +
    emailFooter()
  );
}

/**
 * Email sent to admin when user requests a tour
 */
export function tourRequestedAdminEmail(data: TourEmailData): string {
  const content = `
    ${paragraph(`<strong>Seeker:</strong> ${data.seekerName}`)}
    ${paragraph(`<strong>Facility:</strong> ${data.facilityName} (${data.facilityCity}, ${data.facilityState})`)}
    ${paragraph(`<strong>Tour Type:</strong> ${formatTourType(data.tourType)}`)}
    ${paragraph(`<strong>Preferred Dates:</strong> ${formatPreferredDates(data.preferredDates || [])}`)}
    ${data.notes ? paragraph(`<strong>Notes:</strong> ${data.notes}`) : ''}
  `;

  return emailWrapper(
    emailHeader("Tour Request Created", `${data.seekerName} → ${data.facilityName}`) +
    emailBody(content) +
    emailFooter()
  );
}

/**
 * Email sent to user when facility proposes a time
 */
export function tourProposedUserEmail(data: TourEmailData): string {
  const firstName = data.seekerName.split(" ")[0];
  const proposedTime = data.proposedDateTime ? formatDateTime(data.proposedDateTime) : "See details";

  const proposalBox = `
    <p style="margin: 0 0 8px 0; font-size: 14px; color: ${BRAND_COLORS.textSecondary}; text-transform: uppercase; letter-spacing: 0.5px;">
      Proposed Tour Time
    </p>
    <p style="margin: 0; font-size: 20px; font-weight: 600; color: ${BRAND_COLORS.accent};">
      ${proposedTime}
    </p>
    ${data.facilityNotes ? `
    <p style="margin: 12px 0 0 0; font-size: 14px; color: ${BRAND_COLORS.textSecondary}; font-style: italic;">
      "${data.facilityNotes}"
    </p>` : ''}
  `;

  const content = `
    ${paragraph(`Hi ${firstName},`)}
    ${paragraph(`Great news! <strong>${data.facilityName}</strong> has responded to your ${data.tourType === "virtual" ? "virtual" : "in-person"} tour request and proposed a time.`)}
    ${infoBox(proposalBox, BRAND_COLORS.accent)}
    ${paragraph(`Please log in to your concierge portal to accept this time or request a different one.`)}
    ${ctaButton("View & Respond", "https://rehablookup.com/account/concierge", BRAND_COLORS.success)}
  `;

  return emailWrapper(
    emailHeader("Tour Time Proposed", data.facilityName, "🗓️") +
    emailBody(content) +
    emailFooter()
  );
}

/**
 * Email sent to facility when user confirms tour
 */
export function tourConfirmedFacilityEmail(data: TourEmailData): string {
  const confirmedTime = data.confirmedDateTime ? formatDateTime(data.confirmedDateTime) : "See details";

  const confirmationBox = `
    <p style="margin: 0 0 8px 0; font-size: 14px; color: #059669; text-transform: uppercase; letter-spacing: 0.5px;">
      ✓ Confirmed Tour
    </p>
    <p style="margin: 0 0 12px 0; font-size: 20px; font-weight: 600; color: #065F46;">
      ${confirmedTime}
    </p>
    <p style="margin: 0 0 8px 0; font-size: 15px; color: ${BRAND_COLORS.textPrimary};">
      <strong>Seeker:</strong> ${data.seekerName}
    </p>
    <p style="margin: 0; font-size: 15px; color: ${BRAND_COLORS.textPrimary};">
      <strong>Tour Type:</strong> ${formatTourType(data.tourType)}
    </p>
  `;

  const content = `
    ${paragraph(`${data.seekerName} has accepted your proposed tour time.`)}
    ${successBox(confirmationBox)}
    ${paragraph(`Please ensure you're prepared to welcome them at the scheduled time. A positive tour experience is crucial for conversions.`)}
    ${ctaButton("View Tour Details", "https://rehablookup.com/provider/concierge")}
  `;

  return emailWrapper(
    emailHeader("Tour Confirmed!", data.facilityName, "✅") +
    emailBody(content) +
    emailFooter()
  );
}

/**
 * Email sent to facility when user cancels tour
 */
export function tourCancelledFacilityEmail(data: TourEmailData): string {
  const content = `
    ${paragraph(`${data.seekerName} has cancelled their ${data.tourType} tour request at ${data.facilityName}.`)}
    ${warningBox(`
      <p style="margin: 0; font-size: 15px; color: #92400E;">
        The seeker may have found another facility or changed their timeline. 
        Continue engaging with other concierge leads in your dashboard.
      </p>
    `)}
    ${ctaButton("View Dashboard", "https://rehablookup.com/provider/concierge")}
  `;

  return emailWrapper(
    emailHeader("Tour Cancelled", data.facilityName, "❌") +
    emailBody(content) +
    emailFooter()
  );
}

/**
 * Email sent to user when facility cancels (or declines)
 */
export function tourCancelledUserEmail(data: TourEmailData): string {
  const firstName = data.seekerName.split(" ")[0];

  const content = `
    ${paragraph(`Hi ${firstName},`)}
    ${paragraph(`Unfortunately, ${data.facilityName} is unable to accommodate your tour request at this time.`)}
    ${infoBox(`
      <p style="margin: 0; font-size: 15px; color: ${BRAND_COLORS.textPrimary};">
        Don't worry — you can request tours from other matched facilities in your concierge portal. 
        Our team is here to help you find the right treatment center.
      </p>
    `)}
    ${ctaButton("View Other Matches", "https://rehablookup.com/account/concierge")}
  `;

  return emailWrapper(
    emailHeader("Tour Update", data.facilityName, "ℹ️") +
    emailBody(content) +
    emailFooter()
  );
}

/**
 * Email sent to seeker confirming their tour is locked in.
 * Triggered when the seeker accepts a facility's proposed tour time
 * (status: tour_confirmed). Pairs with tourConfirmedFacilityEmail.
 */
export function tourConfirmedUserEmail(data: TourEmailData): string {
  const firstName = data.seekerName.split(" ")[0];
  const confirmedTime = data.confirmedDateTime ? formatDateTime(data.confirmedDateTime) : "See details";

  const confirmationBox = `
    <p style="margin: 0 0 8px 0; font-size: 14px; color: #059669; text-transform: uppercase; letter-spacing: 0.5px;">
      ✓ Tour Confirmed
    </p>
    <p style="margin: 0 0 12px 0; font-size: 20px; font-weight: 600; color: #065F46;">
      ${confirmedTime}
    </p>
    <p style="margin: 0 0 8px 0; font-size: 15px; color: ${BRAND_COLORS.textPrimary};">
      <strong>Facility:</strong> ${data.facilityName}
    </p>
    <p style="margin: 0 0 8px 0; font-size: 15px; color: ${BRAND_COLORS.textPrimary};">
      <strong>Location:</strong> ${data.facilityCity}, ${data.facilityState}
    </p>
    <p style="margin: 0; font-size: 15px; color: ${BRAND_COLORS.textPrimary};">
      <strong>Tour Type:</strong> ${formatTourType(data.tourType)}
    </p>
  `;

  const tipsBlock = `
    <p style="margin: 0 0 8px 0; font-size: 14px; font-weight: 600; color: ${BRAND_COLORS.textPrimary};">
      How to prepare:
    </p>
    <ul style="margin: 0; padding: 0 0 0 18px; font-size: 14px; color: ${BRAND_COLORS.textSecondary}; line-height: 1.7;">
      <li>Bring a list of questions about programs, length of stay, and aftercare.</li>
      <li>Have your insurance card or payment information handy.</li>
      <li>${data.tourType === "virtual"
        ? "Test your camera and microphone a few minutes early."
        : "Plan to arrive 10–15 minutes early."}</li>
      <li>Note anything that feels off — your advisor can help you compare options.</li>
    </ul>
  `;

  const content = `
    ${paragraph(`Hi ${firstName},`)}
    ${paragraph(`Your tour is locked in. <strong>${data.facilityName}</strong> is expecting you at the time below.`)}
    ${successBox(confirmationBox)}
    ${infoBox(tipsBlock)}
    ${paragraph(`If anything changes, you can reschedule or cancel from your concierge portal — or just reply to this email and our team will help.`)}
    ${ctaButton("View Tour Details", "https://rehablookup.com/account/concierge", BRAND_COLORS.success)}
  `;

  return emailWrapper(
    emailHeader("Tour Confirmed!", data.facilityName, "✅") +
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

// ── inlined from _shared/validation.ts ─────────────
// ========================================
// SHARED SERVER-SIDE VALIDATION UTILITIES
// For Edge Functions
// ========================================

/**
 * Sanitize string input - removes XSS characters and enforces max length
 */
export function sanitizeString(str: unknown, maxLength: number = 500): string {
  if (!str || typeof str !== "string") return "";
  return str
    .trim()
    .slice(0, maxLength)
    .replace(/[<>]/g, "")
    .replace(/\0/g, ""); // Remove null bytes
}

/**
 * Sanitize phone number - only allow digits and phone formatting chars
 */
export function sanitizePhone(phone: unknown): string {
  if (!phone || typeof phone !== "string") return "";
  return phone.replace(/[^\d+\-() ]/g, "").slice(0, 30);
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 254 && email.length >= 5;
}

/**
 * Sanitize and validate email
 */
export function sanitizeEmail(email: unknown): string {
  if (!email || typeof email !== "string") return "";
  const cleaned = email.trim().toLowerCase().slice(0, 254);
  if (!isValidEmail(cleaned)) {
    throw new Error("Invalid email format");
  }
  return cleaned;
}

/**
 * Validate UUID format
 */
export function isValidUUID(str: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

/**
 * Sanitize name - only allow letters, spaces, hyphens, apostrophes
 */
export function sanitizeName(name: unknown, maxLength: number = 100): string {
  if (!name || typeof name !== "string") return "";
  return name
    .trim()
    .slice(0, maxLength)
    .replace(/[^a-zA-Z\s\-'.]/g, "")
    .replace(/[<>]/g, "");
}

/**
 * Validate and sanitize array of strings
 */
export function sanitizeStringArray(arr: unknown, maxItems: number = 50, maxItemLength: number = 100): string[] {
  if (!Array.isArray(arr)) return [];
  return arr
    .slice(0, maxItems)
    .filter((item) => typeof item === "string")
    .map((item) => sanitizeString(item, maxItemLength));
}

/**
 * Validate request body size (in bytes)
 */
export function validateBodySize(body: string, maxSizeBytes: number = 100000): boolean {
  return new TextEncoder().encode(body).length <= maxSizeBytes;
}

/**
 * Parse and validate JSON body safely
 */
export function safeParseJSON<T = Record<string, unknown>>(body: string): T | null {
  try {
    return JSON.parse(body) as T;
  } catch {
    return null;
  }
}

/**
 * Rate limit check result
 */
export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: string | null;
}

/**
 * Check rate limit against database
 */
export async function checkRateLimit(
  supabase: any,
  identifier: string,
  actionType: string,
  maxAttempts: number = 10,
  windowMinutes: number = 15
): Promise<RateLimitResult> {
  const windowStart = new Date(Date.now() - windowMinutes * 60 * 1000).toISOString();

  const { count } = await supabase
    .from("rate_limit_log")
    .select("*", { count: "exact", head: true })
    .eq("identifier", identifier)
    .eq("action_type", actionType)
    .gte("created_at", windowStart);

  const currentCount = count || 0;
  const allowed = currentCount < maxAttempts;
  const resetAt = allowed ? null : new Date(Date.now() + windowMinutes * 60 * 1000).toISOString();

  return {
    allowed,
    remaining: Math.max(0, maxAttempts - currentCount),
    resetAt,
  };
}

/**
 * Log rate limit event
 */
export async function logRateLimitEvent(
  supabase: any,
  identifier: string,
  actionType: string,
  success: boolean = true,
  metadata: Record<string, unknown> = {}
): Promise<void> {
  try {
    await supabase.from("rate_limit_log").insert({
      identifier,
      action_type: actionType,
      success,
      metadata,
    });
  } catch (err) {
    console.warn("Failed to log rate limit event:", err);
  }
}

/**
 * Validate Stripe session ID format
 */
export function isValidStripeSessionId(sessionId: string): boolean {
  return /^cs_[a-zA-Z0-9_]+$/.test(sessionId) && sessionId.length < 100;
}

/**
 * Validate payment intent ID format
 */
export function isValidPaymentIntentId(piId: string): boolean {
  return /^pi_[a-zA-Z0-9_]+$/.test(piId) && piId.length < 100;
}

/**
 * Structured API error with a stable machine-readable code so callers
 * (smoke tests, monitoring, the UI) can branch on the cause without
 * pattern-matching on free-form messages.
 *
 * Throw it inside a Deno handler and convert it in the catch block via
 * `apiErrorResponse(err, corsHeaders)`.
 */
export class ApiError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly httpStatus: number = 400,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/**
 * Standard JSON error envelope.
 *
 * Shape (canonical, machine-readable):
 *   {
 *     error:   { code, message },   // legacy nested form (kept for backward compat)
 *     code:    string,              // top-level stable identifier (e.g. "invalid_email")
 *     reason:  string,              // human-readable explanation
 *     details: Record<string, unknown> | undefined, // optional structured context
 *     ...extras                     // requestId, _version, etc.
 *   }
 *
 * Use this for ALL error responses so smoke tests and clients can rely on
 * a consistent shape across functions.
 */
export function jsonError(
  code: string,
  message: string,
  status: number,
  corsHeaders: Record<string, string>,
  extras: Record<string, unknown> = {},
  details?: Record<string, unknown>,
): Response {
  const body: Record<string, unknown> = {
    error: { code, message },
    code,
    reason: message,
    ...extras,
  };
  if (details !== undefined) body.details = details;
  return new Response(
    JSON.stringify(body),
    {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status,
    },
  );
}

/**
 * Convert any thrown error into the standard envelope.
 * - ApiError → its declared code + httpStatus (+ optional details)
 * - everything else → INTERNAL_ERROR / 500
 */
export function apiErrorResponse(
  err: unknown,
  corsHeaders: Record<string, string>,
  extras: Record<string, unknown> = {},
  details?: Record<string, unknown>,
): Response {
  if (err instanceof ApiError) {
    return jsonError(err.code, err.message, err.httpStatus, corsHeaders, extras, details);
  }
  const message = err instanceof Error ? err.message : String(err);
  return jsonError("INTERNAL_ERROR", message, 500, corsHeaders, extras, details);
}

/**
 * Build standardized error response (legacy shape — prefer `jsonError`).
 */
export function errorResponse(
  message: string,
  status: number = 400,
  corsHeaders: Record<string, string>,
  details?: Record<string, unknown>
): Response {
  return new Response(
    JSON.stringify({
      error: message,
      ...(details || {}),
    }),
    {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status,
    }
  );
}

/**
 * Build standardized success response
 */
export function successResponse(
  data: Record<string, unknown>,
  corsHeaders: Record<string, string>,
  status: number = 200
): Response {
  return new Response(JSON.stringify(data), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status,
  });
}

/**
 * Sanitize intake data object comprehensively
 */
export function sanitizeIntakeData(data: Record<string, unknown>): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(data)) {
    if (value === null || value === undefined) {
      sanitized[key] = null;
    } else if (typeof value === "string") {
      // Sanitize strings based on field type
      if (key.toLowerCase().includes("email")) {
        try {
          sanitized[key] = sanitizeEmail(value);
        } catch {
          sanitized[key] = "";
        }
      } else if (key.toLowerCase().includes("phone")) {
        sanitized[key] = sanitizePhone(value);
      } else if (key.toLowerCase().includes("name") && !key.toLowerCase().includes("username")) {
        sanitized[key] = sanitizeName(value);
      } else {
        sanitized[key] = sanitizeString(value, key.toLowerCase().includes("notes") ? 2000 : 500);
      }
    } else if (typeof value === "boolean") {
      sanitized[key] = value;
    } else if (typeof value === "number") {
      // Clamp numbers to reasonable ranges
      sanitized[key] = Math.max(-999999, Math.min(999999, value));
    } else if (Array.isArray(value)) {
      sanitized[key] = sanitizeStringArray(value);
    } else if (typeof value === "object") {
      // Recursively sanitize nested objects (limited depth)
      sanitized[key] = sanitizeIntakeData(value as Record<string, unknown>);
    }
  }

  return sanitized;
}

// ── send-tour-notifications entrypoint body ─────────────────────────
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface TourNotificationRequest {
  type: "tour_requested" | "tour_proposed" | "tour_confirmed" | "tour_cancelled";
  tourId: string;
  metadata?: Record<string, unknown>;
}

// SMS helper function — round-30 retry pattern: one retry on transient
// failure (500ms backoff); on final failure, insert an admin_notifications
// row so ops can investigate Twilio outages instead of silently losing
// tour reminders / confirmations.
async function sendSMS(phone: string, message: string): Promise<boolean> {
  const twilioSid = Deno.env.get("TWILIO_ACCOUNT_SID");
  const twilioToken = Deno.env.get("TWILIO_AUTH_TOKEN");
  const twilioPhone = Deno.env.get("TWILIO_PHONE_NUMBER");

  if (!twilioSid || !twilioToken || !twilioPhone) {
    console.log("Twilio not configured, skipping SMS");
    return false;
  }

  // Format phone to E.164
  let formatted = phone.replace(/\D/g, "");
  if (formatted.length === 10) {
    formatted = `+1${formatted}`;
  } else if (!formatted.startsWith("+")) {
    formatted = `+${formatted}`;
  }

  // Truncate message to 160 chars
  const smsMessage = message.length > 160 ? message.substring(0, 157) + "..." : message;
  const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`;
  const authHeader = btoa(`${twilioSid}:${twilioToken}`);

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
          To: formatted,
          From: twilioPhone,
          Body: smsMessage,
        }),
      });
      if (response.ok) {
        console.log("SMS sent successfully to", formatted, "attempt:", attempt);
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
  // Best-effort admin surfacing. Build a local service-role client just
  // for this write so we don't have to thread supabase through every
  // caller (6 call sites in this file).
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (supabaseUrl && supabaseKey) {
      const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2.49.4?target=denonext");
      const sb = createClient(supabaseUrl, supabaseKey);
      await sb.from("admin_notifications").insert({
        type: "tour_sms_delivery_failure",
        title: "Tour SMS notification failed",
        message: `Twilio rejected a tour-notification SMS. Last error: ${lastError}`,
        metadata: { last_error: lastError } as Record<string, unknown>,
      });
    }
  } catch (adminErr) {
    console.error("admin_notifications insert failed:", adminErr);
  }
  return false;
}

// ── inlined from _shared/notification-auth.ts (keep in sync) ───────────────
// Per-actor auth for this verify_jwt=false dispatcher: service-role bearer →
// "service"; valid admin JWT → "admin"; valid non-admin JWT → "user" (the
// caller must then be verified as the tour's seeker or facility owner); else 401.
type NotifierActor = "service" | "admin" | "user";
type AuthorizeResult =
  | { ok: true; actor: NotifierActor; userId: string | null }
  | { ok: false; status: number; error: string };
async function authorizeNotifier(
  req: Request,
  admin: ReturnType<typeof createClient>,
): Promise<AuthorizeResult> {
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const authHeader = req.headers.get("Authorization") || req.headers.get("authorization") || "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (!token) return { ok: false, status: 401, error: "unauthorized" };
  if (serviceKey && token === serviceKey) return { ok: true, actor: "service", userId: null };
  const { data: { user }, error } = await admin.auth.getUser(token);
  if (error || !user) return { ok: false, status: 401, error: "unauthorized" };
  // Admin/staff = active admin-console member (super_admin/admin/advisor) OR a
  // user_roles admin — advisors are staff but are NOT in user_roles.
  const { data: staff } = await admin
    .from("admin_user_profiles").select("user_id").eq("user_id", user.id).eq("status", "active").maybeSingle();
  let isAdmin = !!staff;
  if (!isAdmin) {
    const { data: role } = await admin
      .from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle();
    isAdmin = !!role;
  }
  return { ok: true, actor: isAdmin ? "admin" : "user", userId: user.id };
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonError("method_not_allowed", "Method not allowed", 405, corsHeaders, {}, { allowed: ["POST", "OPTIONS"] });
  }

  try {
    let parsed: TourNotificationRequest;
    try {
      parsed = await req.json();
    } catch {
      return jsonError("invalid_json", "Request body is not valid JSON", 400, corsHeaders);
    }

    const { type, tourId, metadata } = parsed;
    console.log("Tour notification request:", { type, tourId });

    if (!type || !tourId) {
      const missing = [!type && "type", !tourId && "tourId"].filter(Boolean);
      return jsonError("validation_error", "Missing type or tourId", 400, corsHeaders, {}, { missing });
    }

    const ALLOWED_TYPES = ["tour_requested", "tour_proposed", "tour_confirmed", "tour_cancelled"] as const;
    if (!(ALLOWED_TYPES as readonly string[]).includes(type)) {
      return jsonError("invalid_type", "Unsupported notification type", 400, corsHeaders, {}, { field: "type", allowed: ALLOWED_TYPES });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // C7: authenticate the caller before any lookup/fan-out (verify_jwt=false
    // endpoint serves both server-to-server and browser callers).
    const authz = await authorizeNotifier(req, supabase);
    if (!authz.ok) {
      return jsonError(authz.error, "Unauthorized", authz.status, corsHeaders);
    }

    // Fetch tour request with related data
    const { data: tour, error: tourError } = await supabase
      .from("concierge_tour_requests")
      .select(`
        *,
        facility:facilities(id, name, city, state, concierge_admissions_email, concierge_admissions_phone, user_id),
        inquiry:concierge_inquiries(id, user_name, user_email, user_phone, user_id, sms_consent)
      `)
      .eq("id", tourId)
      .single();

    if (tourError || !tour) {
      console.error("Tour not found:", tourError);
      return jsonError("tour_not_found", "Tour not found", 404, corsHeaders, {}, { tourId, dbError: tourError?.message });
    }

    // C7: per-resource authorization for the non-admin "user" actor — the caller
    // must be a party to THIS tour (the seeker who owns the inquiry, or the
    // provider who owns the facility). Otherwise an authenticated stranger could
    // fan out tour emails/SMS for someone else's tour.
    if (authz.actor === "user") {
      const isSeeker = !!tour.inquiry?.user_id && tour.inquiry.user_id === authz.userId;
      const isProvider = !!tour.facility?.user_id && tour.facility.user_id === authz.userId;
      if (!isSeeker && !isProvider) {
        return jsonError("forbidden", "Forbidden", 403, corsHeaders);
      }
    }

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    const resend = resendApiKey ? new Resend(resendApiKey) : null;
    const results: Record<string, unknown> = {};

    // Build email data object
    const emailData: TourEmailData = {
      seekerName: tour.inquiry?.user_name || "Client",
      facilityName: tour.facility?.name || "Facility",
      facilityCity: tour.facility?.city || "",
      facilityState: tour.facility?.state || "",
      tourType: tour.tour_type === "virtual" ? "virtual" : "in-person",
      preferredDates: Array.isArray(tour.preferred_dates) ? tour.preferred_dates : [],
      proposedDateTime: tour.proposed_datetime || undefined,
      confirmedDateTime: tour.confirmed_datetime || undefined,
      notes: tour.notes || undefined,
      contactPreference: tour.contact_preference || undefined,
      facilityNotes: tour.facility_response_notes || undefined,
    };

    // Helper for formatted datetime
    const formatDateTime = (dt: string | null | undefined): string => {
      if (!dt) return "TBD";
      return new Date(dt).toLocaleString("en-US", {
        weekday: "short", month: "short", day: "numeric", 
        hour: "numeric", minute: "2-digit"
      });
    };

    // Send notifications based on type
    switch (type) {
      case "tour_requested": {
        // Notify facility
        const facilityEmail = tour.facility?.concierge_admissions_email;
        
        if (resend && facilityEmail) {
          try {
            const emailResult = await sendEmailWithRetry(supabase, resend, {
              from: "RehabLookup Concierge <no-reply@rehablookup.com>",
              to: [facilityEmail],
              subject: `New Tour Request - ${emailData.seekerName}`,
              html: tourRequestedFacilityEmail(emailData),
            }, {
              emailType: "tour_requested_facility",
              idempotencyKey: `tour-req-facility-${tourId}`,
            });
            results.facilityEmail = emailResult;
            console.log("Facility email sent:", emailResult);
          } catch (emailErr) {
            console.error("Failed to send facility email:", emailErr);
          }
        }

        // SMS to facility
        const facilityPhone = tour.facility?.concierge_admissions_phone;
        if (facilityPhone) {
          const smsMessage = `RehabLookup: New tour request from ${emailData.seekerName}. Type: ${tour.tour_type}. View in provider dashboard: https://rehablookup.com/provider/concierge`;
          const smsSent = await sendSMS(facilityPhone, smsMessage);
          results.facilitySMS = smsSent;
        }

        // Create in-app notification for provider. provider_notifications has
        // no `link` column — a top-level `link` threw PGRST204 and silently
        // dropped the row; the deep link comes from the registry (tour_* →
        // /provider/inquiries). Best-effort.
        if (tour.facility?.user_id) {
          try {
            await supabase.from("provider_notifications").insert({
              user_id: tour.facility.user_id,
              type: "tour_request",
              title: "New Tour Request",
              message: `${emailData.seekerName} has requested a ${tour.tour_type} tour.`,
            });
            results.providerNotification = true;
          } catch (notifErr) {
            console.warn("[send-tour-notifications] tour_request notification failed", notifErr);
          }
        }

        // Log case event
        await supabase.from("concierge_case_events").insert({
          inquiry_id: tour.inquiry?.id,
          event_type: "tour_requested",
          event_data: { facility_id: tour.facility?.id, tour_type: tour.tour_type },
          actor_type: "seeker",
        });

        // Notify admin team
        if (resend) {
          try {
            await sendEmailWithRetry(supabase, resend, {
              from: "RehabLookup Concierge <no-reply@rehablookup.com>",
              to: ["placement@rehablookup.com"],
              subject: `[Tour Requested] ${emailData.seekerName} → ${emailData.facilityName}`,
              html: tourRequestedAdminEmail(emailData),
            }, {
              emailType: "tour_requested_admin",
              idempotencyKey: `tour-req-admin-${tourId}`,
            });
            results.adminEmail = true;
          } catch (e) {
            console.error("Admin email failed:", e);
          }
        }
        break;
      }

      case "tour_proposed": {
        // Notify user that facility proposed a time
        const userEmail = tour.inquiry?.user_email;
        const userPhone = tour.inquiry?.user_phone;

        if (resend && userEmail) {
          try {
            const emailResult = await sendEmailWithRetry(supabase, resend, {
              from: "RehabLookup Concierge <no-reply@rehablookup.com>",
              to: [userEmail],
              subject: `Tour Time Proposed - ${emailData.facilityName}`,
              html: tourProposedUserEmail(emailData),
            }, {
              emailType: "tour_proposed_user",
              idempotencyKey: `tour-proposed-user-${tourId}`,
            });
            results.userEmail = emailResult;
            console.log("User email sent:", emailResult);
          } catch (e) {
            console.error("User email failed:", e);
          }
        }

        // SMS to seeker — only if they consented to SMS at intake.
        if (userPhone && tour.inquiry?.sms_consent) {
          const proposedTime = formatDateTime(tour.proposed_datetime);
          const smsMessage = `RehabLookup: ${emailData.facilityName} proposed tour for ${proposedTime}. Confirm here: https://rehablookup.com/account/concierge`;
          const smsSent = await sendSMS(userPhone, smsMessage);
          results.userSMS = smsSent;
        }

        // Create in-app notification for seeker
        if (tour.inquiry?.user_id) {
          await supabase.from("seeker_notifications").insert({
            user_id: tour.inquiry.user_id,
            type: "tour_proposed",
            title: "Tour Time Proposed",
            message: `${emailData.facilityName} has proposed a tour time: ${formatDateTime(tour.proposed_datetime)}.`,
            link: "/account/concierge",
          });
        }

        // Log case event
        await supabase.from("concierge_case_events").insert({
          inquiry_id: tour.inquiry?.id,
          event_type: "tour_proposed",
          event_data: { facility_id: tour.facility?.id, proposed_datetime: tour.proposed_datetime },
          actor_type: "provider",
        });
        break;
      }

      case "tour_confirmed": {
        // Notify facility that user accepted
        const facilityEmail = tour.facility?.concierge_admissions_email;
        const facilityPhone = tour.facility?.concierge_admissions_phone;

        if (resend && facilityEmail) {
          try {
            const emailResult = await sendEmailWithRetry(supabase, resend, {
              from: "RehabLookup Concierge <no-reply@rehablookup.com>",
              to: [facilityEmail],
              subject: `Tour Confirmed - ${emailData.seekerName}`,
              html: tourConfirmedFacilityEmail(emailData),
            }, {
              emailType: "tour_confirmed_facility",
              idempotencyKey: `tour-confirmed-facility-${tourId}`,
            });
            results.facilityEmail = emailResult;
            console.log("Facility confirmation email sent:", emailResult);
          } catch (e) {
            console.error("Facility email failed:", e);
          }
        }

        // Confirmation email to the seeker (Phase 1 transactional email)
        const seekerEmail = tour.inquiry?.user_email;
        if (resend && seekerEmail) {
          try {
            const seekerEmailResult = await sendEmailWithRetry(supabase, resend, {
              from: "RehabLookup Concierge <no-reply@rehablookup.com>",
              to: [seekerEmail],
              subject: `Your tour at ${emailData.facilityName} is confirmed`,
              html: tourConfirmedUserEmail(emailData),
            }, {
              emailType: "tour_confirmed_seeker",
              idempotencyKey: `tour-confirmed-seeker-${tourId}`,
            });
            results.seekerEmail = seekerEmailResult;
            console.log("Seeker confirmation email sent:", seekerEmailResult);
          } catch (e) {
            console.error("Seeker email failed:", e);
          }
        }

        // In-app notification for seeker
        if (tour.inquiry?.user_id) {
          await supabase.from("seeker_notifications").insert({
            user_id: tour.inquiry.user_id,
            type: "tour_confirmed",
            title: "Tour Confirmed",
            message: `Your tour at ${emailData.facilityName} is confirmed for ${formatDateTime(tour.confirmed_datetime)}.`,
            link: "/account/concierge",
            metadata: { tour_id: tourId, facility_id: tour.facility?.id },
          });
        }

        // SMS to facility
        if (facilityPhone) {
          const confirmedTime = formatDateTime(tour.confirmed_datetime);
          // Do NOT include the seeker's phone here — this SMS goes to the
          // facility's business line; seeker contact details live behind the
          // authenticated provider dashboard, not in an outbound SMS.
          const smsMessage = `RehabLookup: Tour CONFIRMED! ${emailData.seekerName} will tour on ${confirmedTime}. Details in your provider dashboard.`;
          const smsSent = await sendSMS(facilityPhone, smsMessage);
          results.facilitySMS = smsSent;
        }

        // In-app notification for provider
        if (tour.facility?.user_id) {
          const confirmedTime = formatDateTime(emailData.confirmedDateTime);
          // No `link` column on provider_notifications (registry routes tour_*
          // → /provider/inquiries). Best-effort.
          try {
            await supabase.from("provider_notifications").insert({
              user_id: tour.facility.user_id,
              type: "tour_confirmed",
              title: "Tour Confirmed",
              message: `${emailData.seekerName} confirmed the tour for ${confirmedTime}.`,
            });
          } catch (notifErr) {
            console.warn("[send-tour-notifications] tour_confirmed notification failed", notifErr);
          }
        }

        // Log case event
        await supabase.from("concierge_case_events").insert({
          inquiry_id: tour.inquiry?.id,
          event_type: "tour_confirmed",
          event_data: { facility_id: tour.facility?.id, confirmed_datetime: tour.confirmed_datetime },
          actor_type: "seeker",
        });

        // Notify admin
        if (resend) {
          try {
            await sendEmailWithRetry(supabase, resend, {
              from: "RehabLookup Concierge <no-reply@rehablookup.com>",
              to: ["placement@rehablookup.com"],
              subject: `[Tour Confirmed] ${emailData.seekerName} → ${emailData.facilityName}`,
              html: `<div style="font-family: Arial; padding: 20px;">
                <h3>Tour Confirmed</h3>
                <p><strong>Seeker:</strong> ${emailData.seekerName}</p>
                <p><strong>Facility:</strong> ${emailData.facilityName}</p>
                <p><strong>Time:</strong> ${formatDateTime(emailData.confirmedDateTime)}</p>
              </div>`,
            }, {
              emailType: "tour_confirmed_admin",
              idempotencyKey: `tour-confirmed-admin-${tourId}`,
            });
            results.adminEmail = true;
          } catch (e) {
            console.error("Admin email failed:", e);
          }
        }
        break;
      }

      case "tour_cancelled": {
        const cancelledBy = metadata?.cancelledBy as string || "user";
        
        if (cancelledBy === "user" && resend) {
          // User cancelled - notify facility
          const facilityEmail = tour.facility?.concierge_admissions_email;
          const facilityPhone = tour.facility?.concierge_admissions_phone;

          if (facilityEmail) {
            try {
              await sendEmailWithRetry(supabase, resend, {
                from: "RehabLookup Concierge <no-reply@rehablookup.com>",
                to: [facilityEmail],
                subject: `Tour Cancelled - ${emailData.seekerName}`,
                html: tourCancelledFacilityEmail(emailData),
              }, {
                emailType: "tour_cancelled_facility",
                idempotencyKey: `tour-cancelled-facility-${tourId}`,
              });
              results.facilityEmail = true;
            } catch (e) {
              console.error("Cancel email failed:", e);
            }
          }

          // SMS to facility
          if (facilityPhone) {
            const smsMessage = `RehabLookup: Tour cancelled by ${emailData.seekerName}. We'll continue matching them with other facilities.`;
            await sendSMS(facilityPhone, smsMessage);
          }

          // In-app notification for provider
          if (tour.facility?.user_id) {
            // No `link` column on provider_notifications (registry routes
            // tour_* → /provider/inquiries). Best-effort.
            try {
              await supabase.from("provider_notifications").insert({
                user_id: tour.facility.user_id,
                type: "tour_cancelled",
                title: "Tour Cancelled",
                message: `${emailData.seekerName} cancelled their tour request.`,
              });
            } catch (notifErr) {
              console.warn("[send-tour-notifications] tour_cancelled notification failed", notifErr);
            }
          }
        } else if (cancelledBy === "facility" && resend) {
          // Facility cancelled - notify user
          const userEmail = tour.inquiry?.user_email;
          const userPhone = tour.inquiry?.user_phone;

          if (userEmail) {
            try {
              await sendEmailWithRetry(supabase, resend, {
                from: "RehabLookup Concierge <no-reply@rehablookup.com>",
                to: [userEmail],
                subject: `Tour Update - ${emailData.facilityName}`,
                html: tourCancelledUserEmail(emailData),
              }, {
                emailType: "tour_cancelled_user",
                idempotencyKey: `tour-cancelled-user-${tourId}`,
              });
              results.userEmail = true;
            } catch (e) {
              console.error("User cancel email failed:", e);
            }
          }

          // SMS to seeker — only if they consented to SMS at intake.
          if (userPhone && tour.inquiry?.sms_consent) {
            const smsMessage = `RehabLookup: Unfortunately, ${emailData.facilityName} had to reschedule. View other options: https://rehablookup.com/account/concierge`;
            await sendSMS(userPhone, smsMessage);
          }

          // In-app notification for user
          if (tour.inquiry?.user_id) {
            await supabase.from("seeker_notifications").insert({
              user_id: tour.inquiry.user_id,
              type: "tour_cancelled",
              title: "Tour Update",
              message: `${emailData.facilityName} is unable to accommodate your tour.`,
              link: "/account/concierge",
            });
          }
        }

        // Log case event
        await supabase.from("concierge_case_events").insert({
          inquiry_id: tour.inquiry?.id,
          event_type: "tour_cancelled",
          event_data: { facility_id: tour.facility?.id, cancelled_by: cancelledBy },
          actor_type: cancelledBy === "user" ? "seeker" : "provider",
        });

        // Notify admin of all cancellations
        if (resend) {
          try {
            await sendEmailWithRetry(supabase, resend, {
              from: "RehabLookup Concierge <no-reply@rehablookup.com>",
              to: ["placement@rehablookup.com"],
              subject: `[Tour Cancelled] ${emailData.seekerName} → ${emailData.facilityName}`,
              html: `<div style="font-family: Arial; padding: 20px;">
                <h3>Tour Cancelled</h3>
                <p><strong>Cancelled By:</strong> ${cancelledBy}</p>
                <p><strong>Seeker:</strong> ${emailData.seekerName}</p>
                <p><strong>Facility:</strong> ${emailData.facilityName}</p>
              </div>`,
            }, {
              emailType: "tour_cancelled_admin",
              idempotencyKey: `tour-cancelled-admin-${tourId}-${cancelledBy}`,
            });
          } catch (e) {
            console.error("Admin cancel email failed:", e);
          }
        }
        break;
      }
    }

    return new Response(JSON.stringify({ success: true, results }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("Tour notification error:", error);
    const message = error instanceof Error ? error.message : String(error);
    return jsonError("internal_error", message, 500, corsHeaders);
  }
});
