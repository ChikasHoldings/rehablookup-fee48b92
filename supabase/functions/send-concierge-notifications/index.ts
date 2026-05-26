// ⚠ AUTO-GENERATED HEADER ⚠
// _shared modules have been inlined into this file so that
// `supabase functions deploy --use-api` (server-side bundler)
// can deploy without resolving local relative imports. The
// canonical sources live under supabase/functions/_shared/ —
// don't edit the inlined copies below; edit the originals and
// re-run `python3 scripts/inline-shared.py send-concierge-notifications`.

// ── URL imports (dedup'd) ──────────────────────────────────
import { Resend } from "https://esm.sh/resend@2.0.0?target=denonext";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2?target=denonext";

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

// ── send-concierge-notifications entrypoint body ─────────────────────────
const VERSION = "1.1.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CONCIERGE-NOTIFICATIONS] ${step}${detailsStr}`);
};

type NotificationType =
  | 'intake_received'      // Seeker: Your request was received
  | 'matches_found'        // Seeker: We found facilities for you
  | 'introductions_sent'   // Seeker: Your advisor has contacted facilities
  | 'facilities_ready_for_review' // Seeker: Provider options are ready for your review
  | 'provider_interested'  // Admin: A provider accepted the candidate
  | 'provider_declined'    // Admin: A provider declined the candidate
  | 'seeker_confirmed'     // Provider: Seeker confirmed admission
  | 'seeker_rejected_provider' // Admin: Seeker rejected a provider option
  | 'provider_confirmed'   // Seeker: Provider confirmed your admission
  | 'placement_complete'   // Both: Congratulations on the placement!
  | 'invoice_issued'       // Provider: Your placement fee invoice
  | 'invoice_paid'         // Provider: Payment received
  | 'signup_prompt'        // Seeker (no account): Create account to track
  | 'advisor_claimed'      // Admin: Advisor claimed/was assigned to a case
  | 'tour_completed'       // Both: Tour has been completed
  | 'admission_updated'    // Both: Admission status changed
  | 'move_in_scheduled'    // Both: Move-in date has been set
  | 'moved_in'             // Both: Client has moved in
  | 'seeker_cancelled'     // Admin/advisor: seeker cancelled their request
  | 'case_closed_by_admin'; // Seeker: an admin closed your case

interface NotificationRequest {
  type: NotificationType;
  inquiryId: string;
  facilityId?: string;
  invoiceId?: string;
  metadata?: Record<string, unknown>;
}

interface InquiryData {
  id: string;
  user_name: string;
  user_email: string;
  user_phone: string;
  level_of_care: string | null;
  primary_concern: string | null;
  preferred_state: string | null;
  preferred_city: string | null;
  insurance_carrier: string | null;
  payment_type: string | null;
  match_count: number | null;
  placed_facility_id: string | null;
  user_id: string | null;
}

interface FacilityData {
  id: string;
  name: string;
  city: string;
  state: string;
  email: string | null;
  reply_email: string | null;
  concierge_admissions_email: string | null;
  concierge_admissions_contact: string | null;
  user_id: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (!resendKey) throw new Error("RESEND_API_KEY not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);
    const resend = new Resend(resendKey);

    const body = await req.json();
    const { type, inquiryId, facilityId, invoiceId, metadata }: NotificationRequest = body;

    // Validate required fields
    if (!type || !inquiryId) {
      throw new Error("Notification type and inquiryId are required");
    }

    // UUID validation helper
    const isValidUUID = (str: string | undefined): boolean => {
      if (!str || typeof str !== "string") return false;
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      return uuidRegex.test(str);
    };

    // Validate UUIDs
    if (!isValidUUID(inquiryId)) {
      throw new Error("Invalid inquiry ID format");
    }
    if (facilityId && !isValidUUID(facilityId)) {
      throw new Error("Invalid facility ID format");
    }
    if (invoiceId && !isValidUUID(invoiceId)) {
      throw new Error("Invalid invoice ID format");
    }

    // Validate notification type
    const validTypes = ['intake_received', 'matches_found', 'introductions_sent', 'facilities_ready_for_review', 'provider_interested', 'provider_declined', 'seeker_confirmed', 'seeker_rejected_provider', 'provider_confirmed', 'placement_complete', 'invoice_issued', 'invoice_paid', 'signup_prompt', 'advisor_claimed', 'tour_completed', 'admission_updated', 'move_in_scheduled', 'moved_in', 'seeker_cancelled', 'case_closed_by_admin'];
    if (!validTypes.includes(type)) {
      throw new Error("Invalid notification type");
    }

    logStep("Processing notification", { type, inquiryId, facilityId });

    // Fetch inquiry data — explicit columns per project guidelines
    const { data: inquiry, error: inquiryError } = await supabase
      .from("concierge_inquiries")
      .select("id, user_name, user_email, user_phone, level_of_care, primary_concern, preferred_state, preferred_city, insurance_carrier, payment_type, match_count, placed_facility_id, user_id, assigned_advisor_id, status")
      .eq("id", inquiryId)
      .single();

    if (inquiryError || !inquiry) {
      throw new Error("Inquiry not found");
    }

    // Fetch facility if needed
    let facility: FacilityData | null = null;
    const targetFacilityId = facilityId || inquiry.placed_facility_id;
    if (targetFacilityId) {
      const { data: facilityData } = await supabase
        .from("facilities")
        .select("id, name, city, state, email, reply_email, concierge_admissions_email, concierge_admissions_contact, user_id")
        .eq("id", targetFacilityId)
        .single();
      facility = facilityData;
    }

    // Process based on notification type
    const results: Array<{ recipient: string; emailId?: string; notificationId?: string }> = [];

    switch (type) {
      case 'intake_received':
        await sendIntakeReceivedEmail(resend, inquiry, supabase, results);
        // If seeker has no account, also send signup prompt
        if (!inquiry.user_id) {
          await sendSignupPromptEmail(supabase, resend, inquiry, results);
        }
        break;

      case 'matches_found':
        await sendMatchesFoundEmail(resend, inquiry, supabase, results);
        break;

      case 'introductions_sent':
        await sendIntroductionsSentEmail(resend, inquiry, supabase, results);
        break;

      case 'facilities_ready_for_review':
        await sendFacilitiesReadyForReviewEmail(resend, inquiry, supabase, results);
        break;

      case 'provider_interested':
        if (facility) {
          await sendProviderInterestedNotification(resend, inquiry, facility, supabase, results);
        }
        break;

      case 'provider_declined':
        if (facility) {
          await sendProviderDeclinedNotification(inquiry, facility, supabase, results);
        }
        break;

      case 'seeker_confirmed':
        if (facility) {
          await sendSeekerConfirmedEmail(resend, inquiry, facility, supabase, results);
        }
        break;

      case 'provider_confirmed':
        if (facility) {
          await sendProviderConfirmedEmail(resend, inquiry, facility, supabase, results);
        }
        break;

      case 'placement_complete':
        if (facility) {
          await sendPlacementCompleteEmails(resend, inquiry, facility, supabase, results);
        }
        break;

      case 'invoice_issued':
        if (facility && invoiceId) {
          await sendInvoiceIssuedEmail(resend, inquiry, facility, invoiceId, supabase, metadata, results);
        }
        break;

      case 'invoice_paid':
        if (facility && invoiceId) {
          await sendInvoicePaidEmail(resend, inquiry, facility, invoiceId, supabase, metadata, results);
        }
        break;

      case 'signup_prompt':
        if (!inquiry.user_id) {
          await sendSignupPromptEmail(supabase, resend, inquiry, results);
        }
        break;

      case 'advisor_claimed':
        await sendAdvisorClaimedNotification(resend, inquiry, supabase, results, metadata);
        break;

      case 'seeker_rejected_provider':
        if (facility) {
          await sendSeekerRejectedProviderNotification(inquiry, facility, supabase, results, metadata);
        }
        break;

      case 'tour_completed':
        await sendAdmissionStageNotification(resend, inquiry, facility, supabase, results, 'tour_completed', metadata);
        break;

      case 'admission_updated':
        await sendAdmissionStageNotification(resend, inquiry, facility, supabase, results, 'admission_updated', metadata);
        break;

      case 'move_in_scheduled':
        await sendAdmissionStageNotification(resend, inquiry, facility, supabase, results, 'move_in_scheduled', metadata);
        break;

      case 'moved_in':
        await sendAdmissionStageNotification(resend, inquiry, facility, supabase, results, 'moved_in', metadata);
        break;

      case 'seeker_cancelled':
        await sendSeekerCancelledNotification(inquiry, supabase, results);
        break;

      case 'case_closed_by_admin':
        await sendCaseClosedByAdminNotification(resend, inquiry, supabase, results, metadata);
        break;
    }

    logStep("Notifications sent", { count: results.length, type });

    return new Response(JSON.stringify({
      success: true,
      type,
      results,
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

// ============================================================================
// EMAIL TEMPLATE HELPERS
// ============================================================================

function emailWrapper(content: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #f4f6f9; -webkit-font-smoothing: antialiased;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f6f9;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08);">
          ${content}
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function emailHeader(title: string, subtitle?: string, icon?: string): string {
  const iconHtml = icon ? `<div style="font-size: 48px; margin-bottom: 16px;">${icon}</div>` : '';
  const subtitleHtml = subtitle ? `<p style="margin: 12px 0 0 0; color: #ffffff; font-family: Arial, Helvetica, sans-serif; font-size: 15px;">${subtitle}</p>` : '';
  
  return `
<tr>
  <td style="background-color: #1B365D; background: #1B365D; padding: 32px; text-align: center;">
    ${iconHtml}
    <h1 style="margin: 0; color: #ffffff; font-family: Arial, Helvetica, sans-serif; font-size: 24px; font-weight: 700;">
      ${title}
    </h1>
    ${subtitleHtml}
  </td>
</tr>`;
}

function emailFooter(): string {
  return `
<tr>
  <td style="background-color: #1B365D; background: #1B365D; padding: 24px; text-align: center;">
    <p style="margin: 0 0 8px 0; font-family: Arial, Helvetica, sans-serif; font-size: 18px; font-weight: 700; color: #ffffff;">
      RehabLookup Concierge
    </p>
    <p style="margin: 0; font-family: Arial, Helvetica, sans-serif; font-size: 13px; color: #cbd5e1;">
      © ${new Date().getFullYear()} RehabLookup. All rights reserved.
    </p>
  </td>
</tr>`;
}

function ctaButton(text: string, url: string): string {
  return `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin: 24px 0;">
  <tr>
    <td align="center">
      <a href="${url}" style="display: inline-block; background-color: #1B365D; background: #1B365D; color: #ffffff; font-family: Arial, Helvetica, sans-serif; font-size: 16px; font-weight: 600; text-decoration: none; padding: 14px 32px; border-radius: 8px;">
        ${text}
      </a>
    </td>
  </tr>
</table>`;
}

function infoBox(content: string, bgColor = '#f0f9ff', borderColor = '#0ea5e9', textColor = '#0369a1'): string {
  return `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background: ${bgColor}; border-left: 4px solid ${borderColor}; border-radius: 0 8px 8px 0; margin: 16px 0;">
  <tr>
    <td style="padding: 16px 20px;">
      <p style="margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 14px; color: ${textColor}; line-height: 1.5;">
        ${content}
      </p>
    </td>
  </tr>
</table>`;
}

// ============================================================================
// ADMIN NOTIFICATION HELPER
// ============================================================================

async function createAdminNotification(
  supabase: any,
  notification: { type: string; title: string; message: string; metadata?: Record<string, unknown>; link?: string }
) {
  try {
    // Create a global admin notification visible to all admins
    await supabase.from('admin_notifications').insert({
      type: notification.type,
      title: notification.title,
      message: notification.message,
      metadata: notification.metadata || {},
    });
    logStep("Admin notification created", { type: notification.type });

    // Also send per-user notifications to advisors and super_admins
    const { data: adminUsers } = await supabase
      .from('admin_user_profiles')
      .select('user_id')
      .in('admin_role', ['super_admin', 'manager', 'advisor'])
      .eq('status', 'active');
    
    if (adminUsers && adminUsers.length > 0) {
      const userNotifications = adminUsers.map((admin: { user_id: string }) => ({
        user_id: admin.user_id,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        link: notification.link || null,
        metadata: notification.metadata || {},
      }));
      
      await supabase.from('admin_user_notifications').insert(userNotifications);
      logStep("Per-user admin notifications created", { count: userNotifications.length });
    }
  } catch (error) {
    logStep("Warning: Failed to create admin notification", { error: String(error) });
  }
}

// ============================================================================
// NOTIFICATION HANDLERS
// ============================================================================

async function sendIntakeReceivedEmail(
  resend: Resend,
  inquiry: InquiryData,
  supabase: any,
  results: Array<{ recipient: string; emailId?: string; notificationId?: string }>
) {
  const firstName = inquiry.user_name.split(' ')[0] || 'there';
  const caseId = inquiry.id.slice(0, 8).toUpperCase();
  
  const html = emailWrapper(`
    ${emailHeader('Your Request Has Been Received', `Case #${caseId}`, '✅')}
    <tr>
      <td style="padding: 32px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        <p style="margin: 0 0 20px 0; font-size: 16px; color: #1a1a1a;">
          Hi ${firstName},
        </p>
        <p style="margin: 0 0 24px 0; font-size: 15px; color: #4b5563; line-height: 1.6;">
          Thank you for reaching out to RehabLookup's Concierge Service. We've received your request and our team is already working to find the best treatment options for your situation.
        </p>
        
        ${infoBox(`<strong>What happens next?</strong><br><br>
          1. Our specialists will review your information<br>
          2. We'll match you with 3 pre-screened facilities<br>
          3. You'll receive personalized introductions within 24-48 hours`)}
        
        <p style="margin: 24px 0 0 0; font-size: 14px; color: #6b7280;">
          Questions? Reply to this email or contact us at <strong>placement@rehablookup.com</strong>
        </p>
      </td>
    </tr>
    ${emailFooter()}
  `);

  const { emailId: emailData, error: emailError } = await sendEmailWithRetry(supabase, resend, {
    from: "RehabLookup Concierge <no-reply@rehablookup.com>",
    to: [inquiry.user_email],
    subject: `We've Received Your Request - Case #${caseId}`,
    html,
  }, {
    emailType: "concierge_intake_received",
    idempotencyKey: `concierge-intake-${inquiry.id}`,
  });

  if (!emailError) {
    results.push({ recipient: inquiry.user_email, emailId: emailData });
  }

  // Create in-app notification for seeker
  if (inquiry.user_id) {
    const { data: notif } = await supabase.from('seeker_notifications').insert({
      user_id: inquiry.user_id,
      type: 'concierge_intake_received',
      title: 'Request Received',
      message: `Your concierge request (Case #${caseId}) has been received. We'll find matches within 24-48 hours.`,
      link: '/account/concierge',
      metadata: { inquiry_id: inquiry.id },
    }).select('id').single();
    
    if (notif) results.push({ recipient: inquiry.user_id, notificationId: notif.id });
  }

  // Admin/advisor notification for new intake
  await createAdminNotification(supabase, {
    type: 'concierge_new_intake',
    title: 'New Placement Intake',
    message: `New placement request from ${inquiry.user_name} (Case #${caseId}). Level of care: ${inquiry.level_of_care || '—'}.`,
    metadata: { inquiry_id: inquiry.id },
  });
}

async function sendMatchesFoundEmail(
  resend: Resend,
  inquiry: InquiryData,
  supabase: any,
  results: Array<{ recipient: string; emailId?: string; notificationId?: string }>
) {
  const firstName = inquiry.user_name.split(' ')[0] || 'there';
  const caseId = inquiry.id.slice(0, 8).toUpperCase();
  const matchCount = inquiry.match_count || 3;
  
  const html = emailWrapper(`
    ${emailHeader('We Found Your Matches!', `${matchCount} facilities selected for you`, '🎯')}
    <tr>
      <td style="padding: 32px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        <p style="margin: 0 0 20px 0; font-size: 16px; color: #1a1a1a;">
          Hi ${firstName},
        </p>
        <p style="margin: 0 0 24px 0; font-size: 15px; color: #4b5563; line-height: 1.6;">
          Great news! Our team has identified <strong>${matchCount} treatment facilities</strong> that match your needs. We're now reaching out to them on your behalf.
        </p>
        
        ${infoBox(`<strong>🏥 ${matchCount} Facilities Matched</strong><br><br>
          Each facility has been pre-screened for:<br>
          • Level of care you need<br>
          • Insurance/payment compatibility<br>
          • Location preferences<br>
          • Specialized services`)}
        
        <p style="margin: 24px 0; font-size: 15px; color: #4b5563; line-height: 1.6;">
          You'll receive introductions from interested facilities soon. Keep an eye on your inbox and phone for their outreach.
        </p>
        
        ${ctaButton('View Your Case', 'https://rehablookup.com/account/concierge')}
      </td>
    </tr>
    ${emailFooter()}
  `);

  const { emailId: emailData, error: emailError } = await sendEmailWithRetry(supabase, resend, {
    from: "RehabLookup Concierge <no-reply@rehablookup.com>",
    to: [inquiry.user_email],
    subject: `We Found ${matchCount} Matches for You - Case #${caseId}`,
    html,
  }, {
    emailType: "concierge_matched",
    idempotencyKey: `concierge-matched-${inquiry.id}`,
  });

  if (!emailError) {
    results.push({ recipient: inquiry.user_email, emailId: emailData });
  }

  if (inquiry.user_id) {
    const { data: notif } = await supabase.from('seeker_notifications').insert({
      user_id: inquiry.user_id,
      type: 'concierge_matches_found',
      title: 'Matches Found!',
      message: `We found ${matchCount} facilities that match your needs. Your advisor will coordinate introductions shortly.`,
      link: '/account/concierge',
      metadata: { inquiry_id: inquiry.id, match_count: matchCount },
    }).select('id').single();
    
    if (notif) results.push({ recipient: inquiry.user_id, notificationId: notif.id });
  }
}

// NEW: Introductions sent notification — tells seeker their advisor is reaching out to facilities
async function sendIntroductionsSentEmail(
  resend: Resend,
  inquiry: InquiryData,
  supabase: any,
  results: Array<{ recipient: string; emailId?: string; notificationId?: string }>
) {
  const firstName = inquiry.user_name.split(' ')[0] || 'there';
  const caseId = inquiry.id.slice(0, 8).toUpperCase();
  
  const html = emailWrapper(`
    ${emailHeader('Your Advisor is Contacting Facilities', `Case #${caseId}`, '📨')}
    <tr>
      <td style="padding: 32px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        <p style="margin: 0 0 20px 0; font-size: 16px; color: #1a1a1a;">
          Hi ${firstName},
        </p>
        <p style="margin: 0 0 24px 0; font-size: 15px; color: #4b5563; line-height: 1.6;">
          Your RehabLookup advisor has sent introductions to treatment facilities on your behalf. We're working behind the scenes to coordinate the best options for you.
        </p>
        
        ${infoBox(`<strong>What happens next?</strong><br><br>
          1. Facilities will review your case (anonymized)<br>
          2. Interested facilities will notify our team<br>
          3. Your advisor will coordinate next steps with you`)}
        
        <p style="margin: 24px 0; font-size: 15px; color: #4b5563; line-height: 1.6;">
          You don't need to do anything right now. Your advisor will reach out as soon as we have updates.
        </p>
        
        ${ctaButton('View Your Case', 'https://rehablookup.com/account/concierge')}
      </td>
    </tr>
    ${emailFooter()}
  `);

  const { emailId: emailData, error: emailError } = await sendEmailWithRetry(supabase, resend, {
    from: "RehabLookup Concierge <no-reply@rehablookup.com>",
    to: [inquiry.user_email],
    subject: `Your Advisor is Contacting Facilities - Case #${caseId}`,
    html,
  }, {
    emailType: "concierge_intros_sent",
    idempotencyKey: `concierge-intros-${inquiry.id}`,
  });

  if (!emailError) {
    results.push({ recipient: inquiry.user_email, emailId: emailData });
  }

  if (inquiry.user_id) {
    const { data: notif } = await supabase.from('seeker_notifications').insert({
      user_id: inquiry.user_id,
      type: 'concierge_introductions_sent',
      title: 'Advisor Contacting Facilities',
      message: 'Your advisor has reached out to treatment facilities on your behalf. We\'ll update you as facilities respond.',
      link: '/account/concierge',
      metadata: { inquiry_id: inquiry.id },
    }).select('id').single();
    
    if (notif) results.push({ recipient: inquiry.user_id, notificationId: notif.id });
  }
}

// Facilities ready for review — seeker can now choose from interested providers
async function sendFacilitiesReadyForReviewEmail(
  resend: Resend,
  inquiry: InquiryData,
  supabase: any,
  results: Array<{ recipient: string; emailId?: string; notificationId?: string }>
) {
  const firstName = inquiry.user_name.split(' ')[0] || 'there';
  const caseId = inquiry.id.slice(0, 8).toUpperCase();
  
  const html = emailWrapper(`
    ${emailHeader('Your Treatment Options Are Ready!', `Case #${caseId}`, '🏥')}
    <tr>
      <td style="padding: 32px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        <p style="margin: 0 0 20px 0; font-size: 16px; color: #1a1a1a;">
          Hi ${firstName},
        </p>
        <p style="margin: 0 0 24px 0; font-size: 15px; color: #4b5563; line-height: 1.6;">
          Great news! Treatment facilities have reviewed your case and are ready to work with you. Log in to review your options and choose the facility that feels right.
        </p>
        
        ${infoBox(`<strong>What you need to do:</strong><br><br>
          1. Log in and review the interested facilities<br>
          2. View each facility's profile to learn more<br>
          3. Select your preferred facility<br>
          4. Your advisor will handle everything from there`)}
        
        <p style="margin: 24px 0; font-size: 15px; color: #4b5563; line-height: 1.6;">
          Take your time reviewing the options. Your advisor is available if you have any questions.
        </p>
        
        ${ctaButton('Review Your Options', 'https://rehablookup.com/account/concierge')}
      </td>
    </tr>
    ${emailFooter()}
  `);

  const { emailId: emailData, error: emailError } = await sendEmailWithRetry(supabase, resend, {
    from: "RehabLookup Concierge <no-reply@rehablookup.com>",
    to: [inquiry.user_email],
    subject: `Your Treatment Options Are Ready - Case #${caseId}`,
    html,
  }, {
    emailType: "concierge_in_contact",
    idempotencyKey: `concierge-contact-${inquiry.id}`,
  });

  if (!emailError) {
    results.push({ recipient: inquiry.user_email, emailId: emailData });
  }

  if (inquiry.user_id) {
    const { data: notif } = await supabase.from('seeker_notifications').insert({
      user_id: inquiry.user_id,
      type: 'concierge_options_ready',
      title: 'Your Options Are Ready!',
      message: 'Treatment facilities are ready to work with you. Review your options and choose your preferred facility.',
      link: '/account/concierge',
      metadata: { inquiry_id: inquiry.id },
    }).select('id').single();
    
    if (notif) results.push({ recipient: inquiry.user_id, notificationId: notif.id });
  }
}

// ============================================================================
// ADMISSION STAGE NOTIFICATIONS
// ============================================================================

async function sendAdmissionStageNotification(
  resend: Resend,
  inquiry: InquiryData,
  facility: FacilityData | null,
  supabase: any,
  results: Array<{ recipient: string; emailId?: string; notificationId?: string }>,
  stage: 'tour_completed' | 'admission_updated' | 'move_in_scheduled' | 'moved_in',
  metadata?: Record<string, unknown>
) {
  const firstName = inquiry.user_name.split(' ')[0] || 'there';
  const caseId = inquiry.id.slice(0, 8).toUpperCase();
  const facilityName = facility?.name || 'your matched facility';

  const stageConfig: Record<string, { icon: string; title: string; seekerSubject: string; seekerBody: string; adminTitle: string; adminMsg: string; providerTitle: string; providerMsg: string }> = {
    tour_completed: {
      icon: '✅',
      title: 'Tour Completed',
      seekerSubject: `Tour Completed - Case #${caseId}`,
      seekerBody: `Your tour with <strong>${facilityName}</strong> has been marked as completed. Your advisor will be in touch with next steps regarding admission.`,
      adminTitle: 'Tour Completed',
      adminMsg: `Tour completed for Case #${caseId} at ${facilityName}. Next: coordinate admission.`,
      providerTitle: 'Tour Completed',
      providerMsg: `Tour for Case #${caseId} has been completed. Awaiting admission coordination.`,
    },
    admission_updated: {
      icon: '📋',
      title: 'Admission Update',
      seekerSubject: `Admission Update - Case #${caseId}`,
      seekerBody: `There's an update on your admission with <strong>${facilityName}</strong>. Your advisor is coordinating the details — no action needed from you right now.`,
      adminTitle: 'Admission Status Updated',
      adminMsg: `Admission status updated for Case #${caseId}. Status: ${(metadata as any)?.admission_status || 'updated'}.`,
      providerTitle: 'Admission Update',
      providerMsg: `Admission status for Case #${caseId} has been updated.`,
    },
    move_in_scheduled: {
      icon: '📅',
      title: 'Move-In Scheduled',
      seekerSubject: `Move-In Date Set - Case #${caseId}`,
      seekerBody: `Great news! A move-in date has been set for your placement at <strong>${facilityName}</strong>. Your advisor will share the details and help you prepare.`,
      adminTitle: 'Move-In Scheduled',
      adminMsg: `Move-in date set for Case #${caseId} at ${facilityName}. Date: ${(metadata as any)?.move_in_date || 'TBD'}.`,
      providerTitle: 'Move-In Scheduled',
      providerMsg: `Move-in date has been scheduled for Case #${caseId}.`,
    },
    moved_in: {
      icon: '🏠',
      title: 'Successfully Moved In',
      seekerSubject: `Welcome to ${facilityName} - Case #${caseId}`,
      seekerBody: `Congratulations! Your move-in at <strong>${facilityName}</strong> is complete. We're so proud of you for taking this step. Your advisor is here if you need anything.`,
      adminTitle: 'Client Moved In',
      adminMsg: `${inquiry.user_name} has moved in at ${facilityName} (Case #${caseId}). Placement lifecycle complete.`,
      providerTitle: 'Client Moved In',
      providerMsg: `Client for Case #${caseId} has successfully moved in. Welcome them to your program!`,
    },
  };

  const config = stageConfig[stage];
  if (!config) return;

  // Seeker email
  const seekerHtml = emailWrapper(`
    ${emailHeader(config.title, `Case #${caseId}`, config.icon)}
    <tr>
      <td style="padding: 32px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        <p style="margin: 0 0 20px 0; font-size: 16px; color: #1a1a1a;">
          Hi ${firstName},
        </p>
        <p style="margin: 0 0 24px 0; font-size: 15px; color: #4b5563; line-height: 1.6;">
          ${config.seekerBody}
        </p>
        ${ctaButton('View Your Case', 'https://rehablookup.com/account/concierge')}
      </td>
    </tr>
    ${emailFooter()}
  `);

  try {
    const { emailId: emailData, error: emailError } = await sendEmailWithRetry(supabase, resend, {
      from: "RehabLookup Concierge <no-reply@rehablookup.com>",
      to: [inquiry.user_email],
      subject: config.seekerSubject,
      html: seekerHtml,
    }, {
      emailType: `concierge_admission_${stage}`,
      idempotencyKey: `concierge-admission-${stage}-${inquiry.id}`,
    });

    if (!emailError) {
      results.push({ recipient: inquiry.user_email, emailId: emailData });
    }
  } catch (e) {
    logStep("Seeker admission email failed", { error: String(e) });
  }

  // Seeker in-app notification
  if (inquiry.user_id) {
    await supabase.from('seeker_notifications').insert({
      user_id: inquiry.user_id,
      type: `concierge_${stage}`,
      title: config.title,
      message: config.seekerBody.replace(/<[^>]*>/g, ''),
      link: '/account/concierge',
      metadata: { inquiry_id: inquiry.id, ...(metadata || {}) },
    });

    // SMS for move-in and moved-in milestones
    if (stage === 'move_in_scheduled' || stage === 'moved_in') {
      const smsMsg = stage === 'moved_in'
        ? `RehabLookup: 🏠 Congratulations on your move-in! We're rooting for your recovery.`
        : `RehabLookup: 📅 Your move-in date has been set! Check your dashboard for details.`;
      await sendSeekerSmsNotification(supabase, inquiry.user_id, smsMsg);
    }
  }

  // Admin notification
  await createAdminNotification(supabase, {
    type: `concierge_${stage}`,
    title: config.adminTitle,
    message: config.adminMsg,
    metadata: { inquiry_id: inquiry.id, facility_id: facility?.id, ...(metadata || {}) },
  });

  // Provider notification
  if (facility) {
    await supabase.from('provider_notifications').insert({
      user_id: facility.user_id,
      type: `concierge_${stage}`,
      title: config.providerTitle,
      message: config.providerMsg,
      metadata: { inquiry_id: inquiry.id, facility_id: facility.id },
    });
  }
}

// Provider interested — admin notification only (brokerage model: advisor coordinates, not direct contact)
async function sendProviderInterestedNotification(
  resend: Resend,
  inquiry: InquiryData,
  facility: FacilityData,
  supabase: any,
  results: Array<{ recipient: string; emailId?: string; notificationId?: string }>
) {
  const caseId = inquiry.id.slice(0, 8).toUpperCase();
  
  // Admin notification — advisor needs to coordinate next steps
  await createAdminNotification(supabase, {
    type: 'concierge_provider_interested',
    title: 'Provider Accepted Candidate',
    message: `${facility.name} accepted candidate for Case #${caseId}. Advisor action required: coordinate PII disclosure and next steps.`,
    metadata: { inquiry_id: inquiry.id, facility_id: facility.id, facility_name: facility.name },
  });

  // Notify all admin users individually
  const { data: adminUsers } = await supabase
    .from('admin_user_profiles')
    .select('user_id')
    .in('admin_role', ['super_admin', 'advisor']);

  if (adminUsers) {
    for (const admin of adminUsers) {
      await supabase.from('admin_user_notifications').insert({
        user_id: admin.user_id,
        type: 'concierge_provider_interested',
        title: 'Provider Accepted Candidate',
        message: `${facility.name} is interested in Case #${caseId}. Coordinate next steps.`,
        link: '/admin/concierge',
        metadata: { inquiry_id: inquiry.id, facility_id: facility.id },
      });
    }
  }

  // Seeker in-app notification (brokerage-safe language — no direct facility contact)
  if (inquiry.user_id) {
    await supabase.from('seeker_notifications').insert({
      user_id: inquiry.user_id,
      type: 'concierge_progress_update',
      title: 'Case Progress Update',
      message: 'A facility has reviewed your case and is interested. Your advisor is coordinating the next steps.',
      link: '/account/concierge',
      metadata: { inquiry_id: inquiry.id },
    });
  }

  // Email to seeker — brokerage-safe (no PII, no facility direct contact)
  const firstName = inquiry.user_name.split(' ')[0] || 'there';
  const seekerHtml = emailWrapper(`
    ${emailHeader('Good News About Your Case!', `Case #${caseId}`, '🤝')}
    <tr>
      <td style="padding: 32px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        <p style="margin: 0 0 20px 0; font-size: 16px; color: #1a1a1a;">
          Hi ${firstName},
        </p>
        <p style="margin: 0 0 24px 0; font-size: 15px; color: #4b5563; line-height: 1.6;">
          We have positive news — a treatment facility has reviewed your case and expressed interest in helping you.
        </p>
        
        ${infoBox(`<strong>Your advisor is now:</strong><br><br>
          • Verifying the facility is the right fit<br>
          • Coordinating the introduction on your behalf<br>
          • Preparing next steps for you`)}
        
        <p style="margin: 24px 0; font-size: 15px; color: #4b5563; line-height: 1.6;">
          Your advisor will reach out to you directly with details. No action needed from you right now.
        </p>
        
        ${ctaButton('View Your Case', 'https://rehablookup.com/account/concierge')}
      </td>
    </tr>
    ${emailFooter()}
  `);

  const { emailId: emailData, error: emailError } = await sendEmailWithRetry(supabase, resend, {
    from: "RehabLookup Concierge <no-reply@rehablookup.com>",
    to: [inquiry.user_email],
    subject: `Progress Update on Your Case - Case #${caseId}`,
    html: seekerHtml,
  }, {
    emailType: "concierge_provider_interested",
    idempotencyKey: `concierge-provider-interested-${inquiry.id}-${facility?.id || "unknown"}`,
  });

  if (!emailError) {
    results.push({ recipient: inquiry.user_email, emailId: emailData });
  }
}

// Provider declined — admin-only notification (with individual admin alerts)
async function sendProviderDeclinedNotification(
  inquiry: InquiryData,
  facility: FacilityData,
  supabase: any,
  results: Array<{ recipient: string; emailId?: string; notificationId?: string }>
) {
  const caseId = inquiry.id.slice(0, 8).toUpperCase();
  
  await createAdminNotification(supabase, {
    type: 'concierge_provider_declined',
    title: 'Provider Declined Candidate',
    message: `${facility.name} declined candidate for Case #${caseId}. Consider sending additional introductions.`,
    metadata: { inquiry_id: inquiry.id, facility_id: facility.id, facility_name: facility.name },
  });

  // Notify all admin users individually (advisors + super admins)
  const { data: adminUsers } = await supabase
    .from('admin_user_profiles')
    .select('user_id')
    .in('admin_role', ['super_admin', 'advisor']);

  if (adminUsers) {
    for (const admin of adminUsers) {
      await supabase.from('admin_user_notifications').insert({
        user_id: admin.user_id,
        type: 'concierge_provider_declined',
        title: 'Provider Declined Candidate',
        message: `${facility.name} declined Case #${caseId}. Consider additional introductions.`,
        link: '/admin/concierge',
        metadata: { inquiry_id: inquiry.id, facility_id: facility.id },
      });
    }
  }

  results.push({ recipient: 'admin', notificationId: 'admin_declined_alert' });
}

// Seeker cancelled their own request — alert admins/advisors so they stop
// working the case. No seeker email (they initiated the cancellation).
async function sendSeekerCancelledNotification(
  inquiry: InquiryData,
  supabase: any,
  results: Array<{ recipient: string; emailId?: string; notificationId?: string }>
) {
  const caseId = inquiry.id.slice(0, 8).toUpperCase();

  await createAdminNotification(supabase, {
    type: 'concierge_seeker_cancelled',
    title: 'Seeker Cancelled Request',
    message: `${inquiry.user_name} cancelled their placement request (Case #${caseId}). No further action needed.`,
    link: '/admin/concierge',
    metadata: { inquiry_id: inquiry.id },
  });

  results.push({ recipient: 'admin', notificationId: 'admin_cancel_alert' });
}

// Admin closed a case — notify the seeker (email + in-app) with the reason
// so a closed case never goes dark on the seeker's side.
async function sendCaseClosedByAdminNotification(
  resend: Resend,
  inquiry: InquiryData,
  supabase: any,
  results: Array<{ recipient: string; emailId?: string; notificationId?: string }>,
  metadata?: Record<string, unknown>
) {
  const firstName = inquiry.user_name.split(' ')[0] || 'there';
  const caseId = inquiry.id.slice(0, 8).toUpperCase();
  const reason = typeof metadata?.reason === 'string' && metadata.reason.trim()
    ? metadata.reason.trim()
    : null;

  const html = emailWrapper(`
    ${emailHeader('Your Concierge Case Has Been Closed', `Case #${caseId}`, '📋')}
    <tr>
      <td style="padding: 32px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        <p style="margin: 0 0 20px 0; font-size: 16px; color: #1a1a1a;">
          Hi ${firstName},
        </p>
        <p style="margin: 0 0 24px 0; font-size: 15px; color: #4b5563; line-height: 1.6;">
          Your RehabLookup Concierge case has been closed by our team.
        </p>
        ${reason ? infoBox(`<strong>Reason:</strong> ${reason}`) : ''}
        <p style="margin: 24px 0; font-size: 15px; color: #4b5563; line-height: 1.6;">
          If you still need help finding treatment, we're here for you — you can start a new request anytime, or simply reply to this email and we'll be glad to assist.
        </p>
        ${ctaButton('Start a New Request', 'https://rehablookup.com/concierge')}
      </td>
    </tr>
    ${emailFooter()}
  `);

  const { emailId: emailData, error: emailError } = await sendEmailWithRetry(supabase, resend, {
    from: "RehabLookup Concierge <no-reply@rehablookup.com>",
    to: [inquiry.user_email],
    subject: `Your Concierge Case Has Been Closed - Case #${caseId}`,
    html,
  }, {
    emailType: "concierge_case_closed",
    idempotencyKey: `concierge-case-closed-${inquiry.id}`,
  });

  if (!emailError) {
    results.push({ recipient: inquiry.user_email, emailId: emailData });
  }

  if (inquiry.user_id) {
    const { data: notif } = await supabase.from('seeker_notifications').insert({
      user_id: inquiry.user_id,
      type: 'concierge_case_closed',
      title: 'Case Closed',
      message: reason
        ? `Your concierge case (Case #${caseId}) has been closed. Reason: ${reason}`
        : `Your concierge case (Case #${caseId}) has been closed. You can start a new request anytime.`,
      link: '/account/concierge',
      metadata: { inquiry_id: inquiry.id, ...(metadata || {}) },
    }).select('id').single();

    if (notif) results.push({ recipient: inquiry.user_id, notificationId: notif.id });
  }
}

// Signup prompt for seekers without an account
async function sendSignupPromptEmail(
  supabase: any,
  resend: Resend,
  inquiry: InquiryData,
  results: Array<{ recipient: string; emailId?: string; notificationId?: string }>
) {
  const firstName = inquiry.user_name.split(' ')[0] || 'there';
  const caseId = inquiry.id.slice(0, 8).toUpperCase();
  
  const html = emailWrapper(`
    ${emailHeader('Create Your Account to Track Your Case', `Case #${caseId}`, '🔐')}
    <tr>
      <td style="padding: 32px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        <p style="margin: 0 0 20px 0; font-size: 16px; color: #1a1a1a;">
          Hi ${firstName},
        </p>
        <p style="margin: 0 0 24px 0; font-size: 15px; color: #4b5563; line-height: 1.6;">
          Your placement request is being processed! To get real-time updates, message your advisor, and track your case progress, create a free RehabLookup account.
        </p>
        
        ${infoBox(`<strong>With an account you can:</strong><br><br>
          ✅ Track your case status in real-time<br>
          ✅ Message your advisor directly<br>
          ✅ View matched facilities<br>
          ✅ Receive instant notifications`)}
        
        <p style="margin: 24px 0; font-size: 15px; color: #4b5563; line-height: 1.6;">
          Sign up using the same email address (<strong>${inquiry.user_email}</strong>) to automatically link your case.
        </p>
        
        ${ctaButton('Create Your Free Account', 'https://rehablookup.com/seeker-auth?tab=signup&email=' + encodeURIComponent(inquiry.user_email))}
        
        <p style="margin: 24px 0 0 0; font-size: 13px; color: #9ca3af; text-align: center;">
          Don't worry — your case is being handled regardless of whether you create an account. This just gives you more visibility.
        </p>
      </td>
    </tr>
    ${emailFooter()}
  `);

  const { emailId: emailData, error: emailError } = await sendEmailWithRetry(supabase, resend, {
    from: "RehabLookup Concierge <no-reply@rehablookup.com>",
    to: [inquiry.user_email],
    subject: `Create Your Account to Track Case #${caseId}`,
    html,
  }, {
    emailType: "concierge_signup_prompt",
    idempotencyKey: `concierge-signup-prompt-${inquiry.id}`,
  });

  if (!emailError) {
    results.push({ recipient: inquiry.user_email, emailId: emailData });
  }
}

async function sendSeekerConfirmedEmail(
  resend: Resend,
  inquiry: InquiryData,
  facility: FacilityData,
  supabase: any,
  results: Array<{ recipient: string; emailId?: string; notificationId?: string }>
) {
  const caseId = inquiry.id.slice(0, 8).toUpperCase();
  const recipientEmail = facility.concierge_admissions_email || facility.reply_email || facility.email;
  const contactName = facility.concierge_admissions_contact || "Admissions Team";
  
  if (!recipientEmail) return;
  
  const html = emailWrapper(`
    ${emailHeader('Client Confirmed Admission', `Case #${caseId}`, '✅')}
    <tr>
      <td style="padding: 32px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        <p style="margin: 0 0 20px 0; font-size: 16px; color: #1a1a1a;">
          Hi ${contactName},
        </p>
        <p style="margin: 0 0 24px 0; font-size: 15px; color: #4b5563; line-height: 1.6;">
          Great news! <strong>${inquiry.user_name}</strong> has confirmed their admission to <strong>${facility.name}</strong>.
        </p>
        
        ${infoBox(`<strong>Action Required:</strong> Please confirm the placement on your end to complete the process and trigger the placement fee.`, '#fef3c7', '#f59e0b', '#92400e')}
        
        ${ctaButton('Confirm Placement', 'https://rehablookup.com/provider/concierge')}
        
        <p style="margin: 24px 0 0 0; font-size: 14px; color: #6b7280;">
          Once both parties confirm, the placement will be finalized.
        </p>
      </td>
    </tr>
    ${emailFooter()}
  `);

  const { emailId: emailData, error: emailError } = await sendEmailWithRetry(supabase, resend, {
    from: "RehabLookup Concierge <no-reply@rehablookup.com>",
    to: [recipientEmail],
    subject: `Client Confirmed Admission - Case #${caseId}`,
    html,
  }, {
    emailType: "concierge_seeker_confirmed",
    idempotencyKey: `concierge-seeker-confirmed-${inquiry.id}`,
  });

  if (!emailError) {
    results.push({ recipient: recipientEmail, emailId: emailData });
  }

  // Provider in-app notification
  const { data: notif } = await supabase.from('provider_notifications').insert({
    user_id: facility.user_id,
    type: 'concierge_seeker_confirmed',
    title: 'Client Confirmed Admission',
    message: `${inquiry.user_name} confirmed admission. Please confirm placement to complete the process.`,
    metadata: { inquiry_id: inquiry.id, facility_id: facility.id },
  }).select('id').single();
  
  if (notif) results.push({ recipient: facility.user_id, notificationId: notif.id });

  // SMS notification to provider
  await sendProviderSmsNotification(supabase, facility.user_id, "general", {
    customMessage: `RehabLookup: ${inquiry.user_name.split(' ')[0]} confirmed admission at ${facility.name}. Please confirm placement in your dashboard.`,
  });
}

async function sendProviderConfirmedEmail(
  resend: Resend,
  inquiry: InquiryData,
  facility: FacilityData,
  supabase: any,
  results: Array<{ recipient: string; emailId?: string; notificationId?: string }>
) {
  const firstName = inquiry.user_name.split(' ')[0] || 'there';
  const caseId = inquiry.id.slice(0, 8).toUpperCase();
  
  const html = emailWrapper(`
    ${emailHeader('Facility Confirmed Your Placement', facility.name, '🎉')}
    <tr>
      <td style="padding: 32px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        <p style="margin: 0 0 20px 0; font-size: 16px; color: #1a1a1a;">
          Hi ${firstName},
        </p>
        <p style="margin: 0 0 24px 0; font-size: 15px; color: #4b5563; line-height: 1.6;">
          Wonderful news! <strong>${facility.name}</strong> has confirmed your placement. Everything is set!
        </p>
        
        ${infoBox(`<strong>Next Steps:</strong><br><br>
          • The facility will contact you with admission details<br>
          • Prepare any required documents<br>
          • Reach out if you have any questions`)}
        
        <p style="margin: 24px 0; font-size: 15px; color: #4b5563; line-height: 1.6;">
          We're so proud of you for taking this step. Your journey to recovery starts now.
        </p>
        
        ${ctaButton('View Case Details', 'https://rehablookup.com/account/concierge')}
      </td>
    </tr>
    ${emailFooter()}
  `);

  const { emailId: emailData, error: emailError } = await sendEmailWithRetry(supabase, resend, {
    from: "RehabLookup Concierge <no-reply@rehablookup.com>",
    to: [inquiry.user_email],
    subject: `${facility.name} Confirmed Your Placement - Case #${caseId}`,
    html,
  }, {
    emailType: "concierge_provider_confirmed",
    idempotencyKey: `concierge-provider-confirmed-${inquiry.id}`,
  });

  if (!emailError) {
    results.push({ recipient: inquiry.user_email, emailId: emailData });
  }

  if (inquiry.user_id) {
    const { data: notif } = await supabase.from('seeker_notifications').insert({
      user_id: inquiry.user_id,
      type: 'concierge_provider_confirmed',
      title: 'Placement Confirmed!',
      message: `${facility.name} has confirmed your placement. Congratulations on taking this important step!`,
      link: '/account/concierge',
      metadata: { inquiry_id: inquiry.id, facility_id: facility.id },
    }).select('id').single();
    
    if (notif) results.push({ recipient: inquiry.user_id, notificationId: notif.id });

    // SMS notification to seeker
    await sendSeekerSmsNotification(
      supabase,
      inquiry.user_id,
      `RehabLookup: Great news! ${facility.name} has confirmed your placement. Check your dashboard for next steps.`
    );
  }
}

async function sendPlacementCompleteEmails(
  resend: Resend,
  inquiry: InquiryData,
  facility: FacilityData,
  supabase: any,
  results: Array<{ recipient: string; emailId?: string; notificationId?: string }>
) {
  const firstName = inquiry.user_name.split(' ')[0] || 'there';
  const caseId = inquiry.id.slice(0, 8).toUpperCase();
  const recipientEmail = facility.concierge_admissions_email || facility.reply_email || facility.email;
  const contactName = facility.concierge_admissions_contact || "Admissions Team";

  // Email to seeker
  const seekerHtml = emailWrapper(`
    ${emailHeader('Congratulations on Your Placement!', 'Your journey to recovery begins', '🌟')}
    <tr>
      <td style="padding: 32px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        <p style="margin: 0 0 20px 0; font-size: 16px; color: #1a1a1a;">
          Hi ${firstName},
        </p>
        <p style="margin: 0 0 24px 0; font-size: 15px; color: #4b5563; line-height: 1.6;">
          Your placement with <strong>${facility.name}</strong> is now complete! Both you and the facility have confirmed the admission.
        </p>
        
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%); border-radius: 12px; margin: 24px 0;">
          <tr>
            <td style="padding: 24px; text-align: center;">
              <p style="margin: 0 0 8px 0; font-size: 48px;">🎉</p>
              <p style="margin: 0; font-size: 18px; font-weight: 600; color: #065f46;">
                You did it!
              </p>
              <p style="margin: 8px 0 0 0; font-size: 14px; color: #047857;">
                Taking this step takes courage. We're rooting for you.
              </p>
            </td>
          </tr>
        </table>
        
        <p style="margin: 0 0 24px 0; font-size: 15px; color: #4b5563; line-height: 1.6;">
          The facility will be in touch with next steps. If you have any questions, don't hesitate to reach out to us.
        </p>
      </td>
    </tr>
    ${emailFooter()}
  `);

  const { emailId: seekerEmailData, error: seekerEmailError } = await sendEmailWithRetry(supabase, resend, {
    from: "RehabLookup Concierge <no-reply@rehablookup.com>",
    to: [inquiry.user_email],
    subject: `Congratulations! Your Placement is Complete - Case #${caseId}`,
    html: seekerHtml,
  }, {
    emailType: "concierge_placed_seeker",
    idempotencyKey: `concierge-placed-seeker-${inquiry.id}`,
  });

  if (!seekerEmailError) {
    results.push({ recipient: inquiry.user_email, emailId: seekerEmailData });
  }

  // Email to provider
  if (recipientEmail) {
    const providerHtml = emailWrapper(`
      ${emailHeader('Placement Confirmed', `Case #${caseId}`, '✅')}
      <tr>
        <td style="padding: 32px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
          <p style="margin: 0 0 20px 0; font-size: 16px; color: #1a1a1a;">
            Hi ${contactName},
          </p>
          <p style="margin: 0 0 24px 0; font-size: 15px; color: #4b5563; line-height: 1.6;">
            The placement for <strong>${inquiry.user_name}</strong> at <strong>${facility.name}</strong> is now complete. Both parties have confirmed.
          </p>
          
          ${infoBox(`<strong>Billing Note:</strong> A placement fee invoice will be generated according to your agreement terms. You can view all invoices in your provider dashboard.`)}
          
          <p style="margin: 24px 0; font-size: 15px; color: #4b5563; line-height: 1.6;">
            Thank you for being part of the RehabLookup Concierge network.
          </p>
          
          ${ctaButton('View Dashboard', 'https://rehablookup.com/provider/concierge')}
        </td>
      </tr>
      ${emailFooter()}
    `);

    const { emailId: providerEmailData, error: providerEmailError } = await sendEmailWithRetry(supabase, resend, {
      from: "RehabLookup Concierge <no-reply@rehablookup.com>",
      to: [recipientEmail],
      subject: `Placement Complete - Case #${caseId}`,
      html: providerHtml,
    }, {
      emailType: "concierge_placed_provider",
      idempotencyKey: `concierge-placed-provider-${inquiry.id}`,
    });

    if (!providerEmailError) {
      results.push({ recipient: recipientEmail, emailId: providerEmailData });
    }
  }

  // In-app notifications
  if (inquiry.user_id) {
    await supabase.from('seeker_notifications').insert({
      user_id: inquiry.user_id,
      type: 'concierge_placement_complete',
      title: 'Placement Complete!',
      message: `Your placement with ${facility.name} is confirmed. Congratulations!`,
      link: '/account/concierge',
      metadata: { inquiry_id: inquiry.id, facility_id: facility.id },
    });

    // SMS notification to seeker
    await sendSeekerSmsNotification(
      supabase,
      inquiry.user_id,
      `RehabLookup: 🎉 Congratulations! Your placement with ${facility.name} is complete. We're rooting for your recovery journey!`
    );
  }

  await supabase.from('provider_notifications').insert({
    user_id: facility.user_id,
    type: 'concierge_placement_complete',
    title: 'Placement Complete',
    message: `Placement for ${inquiry.user_name} is confirmed. Invoice will be generated.`,
    metadata: { inquiry_id: inquiry.id, facility_id: facility.id },
  });

  // SMS notification to provider
  await sendProviderSmsNotification(supabase, facility.user_id, "general", {
    customMessage: `RehabLookup: Placement complete! ${inquiry.user_name.split(' ')[0]} admitted to ${facility.name}. Invoice will be generated.`,
  });

  // Admin notification for placement completion
  const completeCaseId = inquiry.id.slice(0, 8).toUpperCase();
  await createAdminNotification(supabase, {
    type: 'concierge_placement_complete',
    title: 'Placement Completed',
    message: `${inquiry.user_name} placed at ${facility.name} (Case #${completeCaseId}). Fee invoice will be generated.`,
    metadata: { inquiry_id: inquiry.id, facility_id: facility.id },
  });
}

async function sendInvoiceIssuedEmail(
  resend: Resend,
  inquiry: InquiryData,
  facility: FacilityData,
  invoiceId: string,
  supabase: any,
  metadata: Record<string, unknown> | undefined,
  results: Array<{ recipient: string; emailId?: string; notificationId?: string }>
) {
  const caseId = inquiry.id.slice(0, 8).toUpperCase();
  const recipientEmail = facility.concierge_admissions_email || facility.reply_email || facility.email;
  const contactName = facility.concierge_admissions_contact || "Admissions Team";
  const amountCents = (metadata?.amount_cents as number) || 0;
  const amountFormatted = `$${(amountCents / 100).toFixed(2)}`;
  const feeType = (metadata?.fee_type as string) || 'flat_fee';
  const dueAt = metadata?.due_at ? new Date(metadata.due_at as string).toLocaleDateString() : 'Net 14';
  
  if (!recipientEmail) return;
  
  const html = emailWrapper(`
    ${emailHeader('Placement Fee Invoice', `Case #${caseId}`, '📄')}
    <tr>
      <td style="padding: 32px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        <p style="margin: 0 0 20px 0; font-size: 16px; color: #1a1a1a;">
          Hi ${contactName},
        </p>
        <p style="margin: 0 0 24px 0; font-size: 15px; color: #4b5563; line-height: 1.6;">
          An invoice has been generated for the successful placement at <strong>${facility.name}</strong>.
        </p>
        
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background: #f8fafc; border-radius: 12px; margin: 24px 0;">
          <tr>
            <td style="padding: 24px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding: 8px 0; font-size: 14px; color: #6b7280;">Case ID:</td>
                  <td style="padding: 8px 0; font-size: 14px; color: #1a1a1a; font-weight: 500; text-align: right;">#${caseId}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; font-size: 14px; color: #6b7280;">Fee Type:</td>
                  <td style="padding: 8px 0; font-size: 14px; color: #1a1a1a; font-weight: 500; text-align: right;">Flat Fee</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; font-size: 14px; color: #6b7280;">Due Date:</td>
                  <td style="padding: 8px 0; font-size: 14px; color: #1a1a1a; font-weight: 500; text-align: right;">${dueAt}</td>
                </tr>
                <tr style="border-top: 2px solid #e5e7eb;">
                  <td style="padding: 16px 0 8px 0; font-size: 16px; font-weight: 600; color: #1a1a1a;">Amount Due:</td>
                  <td style="padding: 16px 0 8px 0; font-size: 24px; font-weight: 700; color: #1B365D; text-align: right;">${amountFormatted}</td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
        
        ${ctaButton('Pay Invoice', 'https://rehablookup.com/provider/billing-history')}
        
        <p style="margin: 24px 0 0 0; font-size: 13px; color: #6b7280; text-align: center;">
          Questions about this invoice? Contact us at billing@rehablookup.com
        </p>
      </td>
    </tr>
    ${emailFooter()}
  `);

  const { emailId: emailData, error: emailError } = await sendEmailWithRetry(supabase, resend, {
    from: "RehabLookup <no-reply@rehablookup.com>",
    to: [recipientEmail],
    subject: `Placement Fee Invoice - ${amountFormatted} - Case #${caseId}`,
    html,
  }, {
    emailType: "concierge_invoice",
    idempotencyKey: `concierge-invoice-${invoiceId}`,
  });

  if (!emailError) {
    results.push({ recipient: recipientEmail, emailId: emailData });
  }

  // Provider notification
  const { data: notif } = await supabase.from('provider_notifications').insert({
    user_id: facility.user_id,
    type: 'concierge_invoice_issued',
    title: 'Invoice Issued',
    message: `Placement fee invoice for ${amountFormatted} has been issued. Due: ${dueAt}`,
    metadata: { inquiry_id: inquiry.id, invoice_id: invoiceId, amount_cents: amountCents },
  }).select('id').single();
  
  if (notif) results.push({ recipient: facility.user_id, notificationId: notif.id });
}

async function sendInvoicePaidEmail(
  resend: Resend,
  inquiry: InquiryData,
  facility: FacilityData,
  invoiceId: string,
  supabase: any,
  metadata: Record<string, unknown> | undefined,
  results: Array<{ recipient: string; emailId?: string; notificationId?: string }>
) {
  const caseId = inquiry.id.slice(0, 8).toUpperCase();
  const recipientEmail = facility.concierge_admissions_email || facility.reply_email || facility.email;
  const contactName = facility.concierge_admissions_contact || "Admissions Team";
  const amountCents = (metadata?.amount_cents as number) || 0;
  const amountFormatted = `$${(amountCents / 100).toFixed(2)}`;
  
  if (!recipientEmail) return;
  
  const html = emailWrapper(`
    ${emailHeader('Payment Received', `Thank you!`, '✅')}
    <tr>
      <td style="padding: 32px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        <p style="margin: 0 0 20px 0; font-size: 16px; color: #1a1a1a;">
          Hi ${contactName},
        </p>
        <p style="margin: 0 0 24px 0; font-size: 15px; color: #4b5563; line-height: 1.6;">
          We've received your payment of <strong>${amountFormatted}</strong> for Case #${caseId}. Thank you!
        </p>
        
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%); border-radius: 12px; margin: 24px 0;">
          <tr>
            <td style="padding: 24px; text-align: center;">
              <p style="margin: 0 0 8px 0; font-size: 36px;">💚</p>
              <p style="margin: 0; font-size: 18px; font-weight: 600; color: #065f46;">
                Payment Confirmed
              </p>
              <p style="margin: 8px 0 0 0; font-size: 24px; font-weight: 700; color: #047857;">
                ${amountFormatted}
              </p>
            </td>
          </tr>
        </table>
        
        <p style="margin: 0 0 24px 0; font-size: 15px; color: #4b5563; line-height: 1.6;">
          A receipt has been added to your billing history. Thank you for being part of the RehabLookup Concierge network.
        </p>
        
        ${ctaButton('View Billing History', 'https://rehablookup.com/provider/billing-history')}
      </td>
    </tr>
    ${emailFooter()}
  `);

  const { emailId: emailData, error: emailError } = await sendEmailWithRetry(supabase, resend, {
    from: "RehabLookup <no-reply@rehablookup.com>",
    to: [recipientEmail],
    subject: `Payment Received - ${amountFormatted} - Case #${caseId}`,
    html,
  }, {
    emailType: "concierge_invoice_paid",
    idempotencyKey: `concierge-invoice-paid-${invoiceId}`,
  });

  if (!emailError) {
    results.push({ recipient: recipientEmail, emailId: emailData });
  }

  // Provider notification
  const { data: notif } = await supabase.from('provider_notifications').insert({
    user_id: facility.user_id,
    type: 'concierge_invoice_paid',
    title: 'Payment Received',
    message: `Your payment of ${amountFormatted} for Case #${caseId} has been processed. Thank you!`,
    metadata: { inquiry_id: inquiry.id, invoice_id: invoiceId, amount_cents: amountCents },
  }).select('id').single();
  
  if (notif) results.push({ recipient: facility.user_id, notificationId: notif.id });
}

// ============================================================================
// SMS NOTIFICATION HELPERS
// ============================================================================
// ADVISOR CLAIMED NOTIFICATION
// ============================================================================

async function sendAdvisorClaimedNotification(
  resend: Resend,
  inquiry: InquiryData,
  supabase: any,
  results: Array<{ recipient: string; emailId?: string; notificationId?: string }>,
  metadata?: Record<string, unknown>
) {
  const caseId = inquiry.id.slice(0, 8).toUpperCase();
  const advisorName = (metadata?.advisor_name as string) || 'An advisor';
  const selfAssigned = (metadata?.self_assigned as boolean) || false;
  const action = selfAssigned ? 'claimed' : 'was assigned to';

  await createAdminNotification(supabase, {
    type: 'concierge_advisor_claimed',
    title: 'Advisor Assignment',
    message: `${advisorName} ${action} Case #${caseId} (${inquiry.user_name}).`,
    metadata: { inquiry_id: inquiry.id, advisor_id: metadata?.advisor_id },
  });

  // Seeker in-app notification
  if (inquiry.user_id) {
    await supabase.from('seeker_notifications').insert({
      user_id: inquiry.user_id,
      type: 'concierge_advisor_assigned',
      title: 'Advisor Assigned',
      message: 'A placement advisor has been assigned to your case and will be reaching out soon.',
      link: '/account/concierge',
      metadata: { inquiry_id: inquiry.id },
    });
  }

  // Seeker email — Phase 1 transactional email
  // Brokerage-safe: never expose advisor PII (name, phone, email).
  if (resend && inquiry.user_email) {
    const firstName = inquiry.user_name.split(' ')[0] || 'there';

    const seekerHtml = emailWrapper(`
      ${emailHeader('A Placement Advisor Is on Your Case', `Case #${caseId}`, '🤝')}
      <tr>
        <td style="padding: 32px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
          <p style="margin: 0 0 20px 0; font-size: 16px; color: #1a1a1a;">
            Hi ${firstName},
          </p>
          <p style="margin: 0 0 24px 0; font-size: 15px; color: #4b5563; line-height: 1.6;">
            Good news — a dedicated RehabLookup placement advisor has been assigned to your case and will be reaching out soon to help you find the right treatment.
          </p>

          ${infoBox(`<strong>What happens next:</strong><br><br>
            • Your advisor will contact you within 24 hours<br>
            • They'll review your needs, insurance, and preferences<br>
            • They'll coordinate introductions with vetted facilities on your behalf<br>
            • You'll never be contacted directly by facilities — your advisor manages everything`)}

          <p style="margin: 24px 0; font-size: 15px; color: #4b5563; line-height: 1.6;">
            No action is required from you right now. If anything changes or you have urgent questions, you can reply to this email or message your advisor through your portal.
          </p>

          ${ctaButton('View Your Case', 'https://rehablookup.com/account/concierge')}
        </td>
      </tr>
      ${emailFooter()}
    `);

    try {
      const { emailId: emailData, error: emailError } = await sendEmailWithRetry(supabase, resend, {
        from: "RehabLookup Concierge <no-reply@rehablookup.com>",
        to: [inquiry.user_email],
        subject: `A placement advisor is on your case — Case #${caseId}`,
        html: seekerHtml,
      }, {
        emailType: 'concierge_advisor_assigned_seeker',
        idempotencyKey: `concierge-advisor-assigned-${inquiry.id}`,
      });

      if (!emailError) {
        results.push({ recipient: inquiry.user_email, emailId: emailData });
      }
    } catch (e) {
      logStep('Warning: advisor-assigned seeker email failed', { error: String(e) });
    }
  }

  results.push({ recipient: 'admin', notificationId: 'advisor_claimed_alert' });
}

// ============================================================================
// SEEKER REJECTED PROVIDER NOTIFICATION
// ============================================================================

async function sendSeekerRejectedProviderNotification(
  inquiry: InquiryData,
  facility: FacilityData,
  supabase: any,
  results: Array<{ recipient: string; emailId?: string; notificationId?: string }>,
  metadata?: Record<string, unknown>
) {
  const caseId = inquiry.id.slice(0, 8).toUpperCase();
  const reason = (metadata?.reason as string) || 'No reason provided';

  await createAdminNotification(supabase, {
    type: 'concierge_seeker_rejected',
    title: 'Seeker Rejected Facility',
    message: `${inquiry.user_name} rejected ${facility.name} for Case #${caseId}. Reason: ${reason}. Consider sending additional introductions.`,
    metadata: { inquiry_id: inquiry.id, facility_id: facility.id, reason },
  });

  results.push({ recipient: 'admin', notificationId: 'seeker_rejected_alert' });
}

// ============================================================================

async function sendProviderSmsNotification(
  supabase: any,
  userId: string,
  notificationType: "new_lead" | "lead_status" | "subscription_alert" | "general",
  data: {
    leadName?: string;
    leadCity?: string;
    levelOfCare?: string;
    urgency?: string;
    facilityName?: string;
    customMessage?: string;
    alertType?: string;
  }
): Promise<boolean> {
  try {
    // Check if provider has SMS alerts enabled
    const { data: notifPrefs } = await supabase
      .from("notification_preferences")
      .select("sms_lead_alerts")
      .eq("user_id", userId)
      .maybeSingle();

    if (!notifPrefs?.sms_lead_alerts) {
      logStep("SMS alerts not enabled for provider", { userId: userId.slice(0, 8) });
      return false;
    }

    // Check if phone is verified
    const { data: profile } = await supabase
      .from("profiles")
      .select("phone, phone_verified")
      .eq("user_id", userId)
      .maybeSingle();

    if (!profile?.phone || !profile.phone_verified) {
      logStep("No verified phone for provider", { userId: userId.slice(0, 8) });
      return false;
    }

    // Call SMS notification function with retry + admin-notifications
    // fallback (round-30 pattern from submit-qualified-lead). One retry
    // on transient failure; on final failure, insert an
    // admin_notifications row so ops can re-send manually.
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    let lastError: string | null = null;
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const response = await fetch(`${supabaseUrl}/functions/v1/send-sms-notification`, {
          method: "POST",
          headers: { ...corsHeaders, "Content-Type": "application/json",
            "Authorization": `Bearer ${supabaseKey}`,
          },
          body: JSON.stringify({ userId, notificationType, data }),
        });
        if (response.ok) {
          logStep("Provider SMS notification sent successfully", {
            userId: userId.slice(0, 8),
            type: notificationType,
            attempt,
          });
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

    logStep("Provider SMS notification failed after retries", { lastError });
    try {
      await supabase.from("admin_notifications").insert({
        type: "concierge_sms_delivery_failure",
        title: "Concierge SMS notification failed",
        message: `Could not deliver concierge SMS (${notificationType}) to provider ${userId}. Last error: ${lastError}`,
        metadata: {
          provider_user_id: userId,
          notification_type: notificationType,
          last_error: lastError,
        } as Record<string, unknown>,
      });
    } catch (adminErr) {
      logStep("admin_notifications insert failed", {
        error: adminErr instanceof Error ? adminErr.message : String(adminErr),
      });
    }
    return false;
  } catch (error) {
    logStep("Provider SMS notification error", { error: error instanceof Error ? error.message : String(error) });
    return false;
  }
}

async function sendSeekerSmsNotification(
  supabase: any,
  userId: string,
  message: string
): Promise<boolean> {
  try {
    // Check if seeker has verified phone in seeker_profiles
    const { data: seekerProfile } = await supabase
      .from("seeker_profiles")
      .select("phone, phone_verified")
      .eq("user_id", userId)
      .maybeSingle();

    if (!seekerProfile?.phone || !seekerProfile.phone_verified) {
      logStep("No verified phone for seeker", { userId: userId.slice(0, 8) });
      return false;
    }

    // Format phone to E.164
    let phone = seekerProfile.phone.replace(/\D/g, "");
    if (phone.length === 10) {
      phone = `+1${phone}`;
    } else if (phone.length === 11 && phone.startsWith("1")) {
      phone = `+${phone}`;
    } else if (!phone.startsWith("+")) {
      phone = `+${phone}`;
    }

    // Validate phone format
    const phoneRegex = /^\+1\d{10}$/;
    if (!phoneRegex.test(phone)) {
      logStep("Invalid seeker phone format", { userId: userId.slice(0, 8) });
      return false;
    }

    // Send SMS directly via Twilio
    const twilioAccountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
    const twilioAuthToken = Deno.env.get("TWILIO_AUTH_TOKEN");
    const twilioPhoneNumber = Deno.env.get("TWILIO_PHONE_NUMBER");

    if (!twilioAccountSid || !twilioAuthToken || !twilioPhoneNumber) {
      logStep("Twilio credentials not configured for seeker SMS");
      return false;
    }

    // Truncate message to SMS limit
    const truncatedMessage = message.length > 160 ? message.substring(0, 157) + "..." : message;

    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`;
    const authHeader = btoa(`${twilioAccountSid}:${twilioAuthToken}`);

    // Retry once on transient Twilio failure (500/timeout). On final
    // failure, surface to ops via admin_notifications (round-30 pattern).
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
            To: phone,
            From: twilioPhoneNumber,
            Body: truncatedMessage,
          }),
        });
        if (response.ok) {
          logStep("Seeker SMS sent successfully", { userId: userId.slice(0, 8), attempt });
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

    logStep("Seeker SMS failed after retries", { lastError });
    try {
      await supabase.from("admin_notifications").insert({
        type: "concierge_sms_delivery_failure",
        title: "Concierge seeker SMS failed",
        message: `Could not deliver concierge SMS to seeker ${userId}. Last error: ${lastError}`,
        metadata: {
          seeker_user_id: userId,
          notification_type: "concierge_seeker_update",
          last_error: lastError,
        } as Record<string, unknown>,
      });
    } catch (adminErr) {
      logStep("admin_notifications insert failed", {
        error: adminErr instanceof Error ? adminErr.message : String(adminErr),
      });
    }
    return false;
  } catch (error) {
    logStep("Seeker SMS error", { error: error instanceof Error ? error.message : String(error) });
    return false;
  }
}
