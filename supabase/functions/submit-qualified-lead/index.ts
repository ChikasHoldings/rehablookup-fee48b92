import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2?target=denonext";
import { Resend } from "https://esm.sh/resend@2.0.0?target=denonext";
import { sendEmailWithRetry } from "../_shared/resilient-email-sender.ts";
import { describeEmailInput } from "../_shared/email-input-diagnostics.ts";

const VERSION = "2.1.0";
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
function maskLeadName(fullName: string): string {
  if (!fullName || fullName.trim().length === 0) return "New Lead";
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) return parts[0];
  const firstName = parts[0];
  const lastInitial = parts[parts.length - 1].charAt(0).toUpperCase();
  return `${firstName} ${lastInitial}.`;
}

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

// ---------- seeker (client) confirmation email ----------
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
  } = {}
): string {
  const firstName = name.split(" ")[0];
  const submittedAt = details.submittedAt ?? new Date();
  const safeFacility = escapeHtml(facilityName);
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
                Inquiry sent to ${safeFacility}
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
                Your inquiry has been delivered to <strong style="color: #0f766e;">${safeFacility}</strong>. Here's a copy of what you submitted so you have it for your records.
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
                    <p style="margin: 0 0 12px 0; font-size: 15px; font-weight: 600; color: #0f766e;">📞 What happens next</p>
                    <ol style="margin: 0; padding: 0 0 0 20px; color: #115e59; font-size: 14px; line-height: 1.7;">
                      <li><strong>Within a few hours:</strong> ${safeFacility} will review your inquiry.</li>
                      <li><strong>Within 24–48 hours:</strong> An admissions specialist will reach out via your preferred method (${preferredLine}).</li>
                      <li><strong>On the call:</strong> You can ask about programs, insurance coverage, and start dates — no obligation.</li>
                    </ol>
                  </td>
                </tr>
              </table>

              <p style="margin: 0 0 16px 0; color: #374151; font-size: 14px; line-height: 1.6;">
                <strong>Haven't heard back?</strong> If 48 hours pass without a response, reply to this email or contact us at <a href="mailto:Support@rehablookup.com" style="color: #0f766e; text-decoration: none;">Support@rehablookup.com</a> and we'll help connect you with another provider.
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
                      Connecting families with quality care
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
    urgency?: string;
    levelOfCare?: string;
    insuranceType?: string;
    message?: string;
    preferredContact?: string;
    submittedAt?: Date;
  }
): string {
  const maskedName = maskLeadName(leadName);
  const maskedEmail = "●●●@●●●.com";
  const maskedPhone = "(●●●) ●●●-●●●●";
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
                A potential client just submitted an inquiry through your <strong>${safeFacility}</strong> profile on RehabLookup.
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
                          <p style="margin: 0 0 4px 0; font-size: 18px; font-weight: 600; color: #1e293b;">${escapeHtml(maskedName)}</p>
                          <p style="margin: 0; font-size: 13px; color: #64748b;">New inquiry • ${urgencyDisplay}</p>
                        </td>
                      </tr>
                    </table>
                    <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size: 14px; color: #334155; line-height: 1.6;">
                      <tr><td style="padding: 6px 12px 6px 0; color: #64748b; width: 170px;">Email</td><td style="padding: 6px 0;">${maskedEmail}</td></tr>
                      <tr><td style="padding: 6px 12px 6px 0; color: #64748b;">Phone</td><td style="padding: 6px 0;">${maskedPhone}</td></tr>
                      <tr><td style="padding: 6px 12px 6px 0; color: #64748b;">Level of care</td><td style="padding: 6px 0;">${levelOfCareDisplay}</td></tr>
                      ${details.insuranceType ? `<tr><td style="padding: 6px 12px 6px 0; color: #64748b;">Insurance</td><td style="padding: 6px 0;">${escapeHtml(details.insuranceType)}</td></tr>` : ""}
                      <tr><td style="padding: 6px 12px 6px 0; color: #64748b;">Timeline</td><td style="padding: 6px 0;">${urgencyDisplay}</td></tr>
                      <tr><td style="padding: 6px 12px 6px 0; color: #64748b;">Preferred contact</td><td style="padding: 6px 0;">${preferredDisplay}</td></tr>
                    </table>
                    ${messageExcerpt ? `
                    <div style="margin-top: 16px; padding: 14px 16px; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px;">
                      <p style="margin: 0 0 6px 0; font-size: 12px; font-weight: 600; color: #475569; text-transform: uppercase; letter-spacing: 0.5px;">Message from prospect</p>
                      <p style="margin: 0; font-size: 14px; color: #334155; line-height: 1.6; white-space: pre-wrap;">${messageExcerpt}</p>
                    </div>
                    ` : ""}
                  </td>
                </tr>
              </table>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border: 2px solid #f59e0b; border-radius: 12px; margin-bottom: 24px;">
                <tr>
                  <td style="padding: 20px;">
                    <p style="margin: 0 0 8px 0; font-size: 15px; font-weight: 600; color: #92400e;">🔒 Full contact info is locked</p>
                    <p style="margin: 0 0 16px 0; font-size: 13px; color: #78350f; line-height: 1.5;">
                      Unlock this lead in your dashboard to see ${escapeHtml(firstName)}'s full name, phone, and email so you can reach out directly.
                    </p>
                    <p style="margin: 0 0 16px 0; font-size: 13px; color: #78350f; line-height: 1.6;">
                      <strong>Your next steps:</strong>
                    </p>
                    <ol style="margin: 0 0 16px 20px; padding: 0; font-size: 13px; color: #78350f; line-height: 1.7;">
                      <li>Open the lead in your provider dashboard.</li>
                      <li>Unlock to reveal contact details.</li>
                      <li>Reach out via ${preferredDisplay} within 24 hours for the best conversion rate.</li>
                    </ol>
                    <a href="https://rehablookup.com/provider/inquiries" style="display: inline-block; background: #1B365D; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: 600; font-size: 14px;">
                      🔓 Unlock lead in dashboard
                    </a>
                  </td>
                </tr>
              </table>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background: #f0f9ff; border: 1px solid #bfdbfe; border-radius: 8px; margin-bottom: 24px;">
                <tr>
                  <td style="padding: 16px;">
                    <p style="margin: 0; font-size: 13px; color: #1e40af; line-height: 1.5;">
                      💡 <strong>Tip:</strong> Providers who respond within the first hour convert up to 7× more leads than those who wait a day.
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
                      Connecting families with quality care
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

    // Extract client IP for rate limiting
    const clientIp = extractClientIp(req);

    let rawData: InquiryRequest;
    try {
      rawData = await req.json();
    } catch {
      return errorResponse(400, "invalid_body", "Invalid request body");
    }
    
    // ===== INPUT SANITIZATION =====
    const data = {
      ...rawData,
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
    
    log(requestId, "INFO", "Inquiry data received", { 
      facilityId: data.facilityId,
      hasIdempotencyKey: !!data.idempotencyKey,
    });

    // ===== VALIDATION: Required fields =====
    if (!data.facilityId) {
      return errorResponse(400, "facility_required", "facility_id is required for all inquiries", "facilityId");
    }

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(data.facilityId)) {
      return errorResponse(400, "invalid_facility_id", "Invalid facility ID", "facilityId");
    }

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

    if (!data.phone || data.phone.length < 10) {
      return errorResponse(400, "phone_invalid", "Please provide a valid phone number (minimum 10 digits)", "phone");
    }

    // ===== ENUM VALIDATION (reject invalid values) =====
    const validatedUrgency = validateEnum(data.urgency, ALLOWED_URGENCY);
    const validatedPreferredContact = validateEnum(data.preferredContact, ALLOWED_PREFERRED_CONTACT) || "phone";
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

    // ===== FACILITY VERIFICATION =====
    const { data: facility, error: facilityError } = await supabase
      .from("facilities")
      .select("id, name, email, user_id, status, suspended, reply_email, reply_email_verified")
      .eq("id", data.facilityId)
      .maybeSingle();

    if (facilityError || !facility) {
      log(requestId, "ERROR", "Facility not found", { facilityId: data.facilityId });
      return errorResponse(404, "facility_not_found", "Facility not found", "facilityId");
    }

    if (facility.status !== "approved" || facility.suspended) {
      log(requestId, "ERROR", "Facility not accepting inquiries", { facilityId: data.facilityId, status: facility.status });
      return errorResponse(400, "facility_not_accepting", "This facility is not currently accepting inquiries", "facilityId");
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

    // ===== LEAD INSERTION =====
    const now = new Date();
    const exclusiveUntil = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const extendedUntil = new Date(now.getTime() + 72 * 60 * 60 * 1000);

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
        // Redistribution fields
        original_facility_id: data.facilityId,
        exclusive_until: exclusiveUntil.toISOString(),
        extended_until: extendedUntil.toISOString(),
        redistribution_status: "exclusive",
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
      .select("id, credit_cost, lead_score_label")
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

    // Create initial distribution record
    await supabase
      .from("lead_distributions")
      .insert({
        lead_id: lead.id,
        facility_id: data.facilityId,
        is_original: true,
        distributed_at: now.toISOString(),
        notification_sent: true,
        notification_sent_at: now.toISOString(),
      });

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
    const { data: notifPrefs } = await supabase
      .from("notification_preferences")
      .select("notify_new_leads, email_lead_alerts, sms_lead_alerts, browser_notifications")
      .eq("user_id", facility.user_id)
      .maybeSingle();

    const masterEnabled = notifPrefs?.notify_new_leads ?? true;
    const emailEnabled = masterEnabled && (notifPrefs?.email_lead_alerts ?? true);
    const smsEnabled = masterEnabled && (notifPrefs?.sms_lead_alerts ?? false);
    const inAppEnabled = masterEnabled && (notifPrefs?.browser_notifications ?? true);

    log(requestId, "INFO", "Channel fan-out plan", { masterEnabled, emailEnabled, smsEnabled, inAppEnabled });

    // Send facility notification email — idempotency keyed to lead ID
    const { data: profile } = await supabase
      .from("profiles")
      .select("email")
      .eq("user_id", facility.user_id)
      .maybeSingle();

    const notificationEmail = (facility.reply_email_verified && facility.reply_email) 
      ? facility.reply_email 
      : (profile?.email || facility.email);

    if (emailEnabled && notificationEmail) {
      try {
        await sendEmailWithRetry(supabase, resend, {
          from: "RehabLookup <no-reply@rehablookup.com>",
          to: [notificationEmail],
          subject: `New Inquiry from ${firstName} - ${facility.name}`,
          html: getFacilityNotificationEmail(data.name, facility.name, {
            urgency: data.urgency,
            levelOfCare: data.levelOfCare,
            insuranceType: data.insuranceType,
            message: data.message,
            preferredContact: data.preferredContact,
          }),
        }, {
          emailType: "facility_new_lead",
          idempotencyKey: `facility-lead-${lead.id}`,
        });
        log(requestId, "INFO", "Facility email sent");
      } catch (e) {
        log(requestId, "WARN", "Failed to send facility email", { error: String(e) });
      }
    } else if (!emailEnabled) {
      log(requestId, "INFO", "Email channel disabled by preference; skipping");
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

          await fetch(`${supabaseUrl}/functions/v1/send-sms-notification`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${supabaseKey}`,
            },
            body: JSON.stringify({
              userId: facility.user_id,
              notificationType: "new_lead",
              data: {
                leadName: maskLeadName(data.name),
                leadCity: data.locationCityState?.split(",")[0]?.trim() || null,
                levelOfCare: data.levelOfCare,
                urgency: data.urgency,
                facilityName: facility.name,
              },
            }),
          });
        }
      } else {
        log(requestId, "INFO", "SMS channel disabled by preference; skipping");
      }
    } catch (smsError) {
      log(requestId, "WARN", "Failed to send SMS notification", { error: String(smsError) });
    }

    // In-app notification — enriched with high-intent + credit cost + direct link
    const intentLabel = isHighIntent ? "🔥 High-Intent" : "";
    const urgencyLabel = data.urgency && ["Urgent", "Immediately", "immediate"].includes(data.urgency) ? " — Needs help now" : "";
    const notificationTitle = isHighIntent ? "🔥 High-Intent Inquiry Received" : "New Inquiry Received";
    const notificationMessage = `${maskLeadName(data.name)} submitted an inquiry${data.levelOfCare ? ` for ${data.levelOfCare.replace(/_/g, ' ')}` : ''}${urgencyLabel}`;

    if (inAppEnabled) {
      try {
        await supabase.from("provider_notifications").insert({
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
            credit_cost: lead.credit_cost,
            lead_score_label: lead.lead_score_label,
            inquiry_type: inquiryType,
            link: `/provider/inquiries?lead=${lead.id}`,
          },
          read: false,
        });
      } catch (notifError) {
        log(requestId, "WARN", "Failed to create in-app notification", { error: String(notifError) });
      }
    } else {
      log(requestId, "INFO", "In-app channel disabled by preference; skipping");
    }


    // Track instant notification event
    try {
      await supabase.from("notification_events").insert({
        lead_id: lead.id,
        facility_id: facility.id,
        user_id: facility.user_id,
        notification_stage: "instant",
        channel: "email",
        event_type: "sent",
        notification_type: isHighIntent ? "high_intent" : "new_lead",
        metadata: { credit_cost: lead.credit_cost, urgency: data.urgency },
      });
    } catch (trackError) {
      log(requestId, "WARN", "Failed to track notification event", { error: String(trackError) });
    }

    log(requestId, "INFO", "Inquiry submitted successfully", { leadId: lead.id });

    return new Response(
      JSON.stringify({
        success: true,
        leadId: lead.id,
        facilityName: facility.name,
        message: "Your inquiry has been sent successfully!",
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    log(requestId, "ERROR", "Unhandled error", { error: error instanceof Error ? error.message : String(error) });
    return errorResponse(500, "internal_error", "An unexpected error occurred. Please try again.");
  }
});
