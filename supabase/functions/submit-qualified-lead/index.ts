import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ============ LOGGING ============
const generateRequestId = () => crypto.randomUUID().slice(0, 8);

const log = (requestId: string, level: "INFO" | "WARN" | "ERROR", message: string, details?: unknown) => {
  const timestamp = new Date().toISOString();
  const detailsStr = details ? ` | ${JSON.stringify(details)}` : "";
  console.log(`[${timestamp}] [${requestId}] [${level}] ${message}${detailsStr}`);
};

// ============ INTERFACES ============
interface InquiryRequest {
  facilityId?: string; // Optional - direct inquiries may not have a facility
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
  // Enhanced intake fields
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

function maskEmail(email: string): string {
  if (!email) return "●●●@●●●.com";
  const [local, domain] = email.split("@");
  if (!domain) return "●●●@●●●.com";
  const maskedLocal = local[0] + "●●●";
  const domainParts = domain.split(".");
  const tld = domainParts[domainParts.length - 1];
  return `${maskedLocal}@●●●.${tld}`;
}

function maskPhone(): string {
  return "(●●●) ●●●-●●●●";
}

// ============ DUPLICATE CHECK ============
// deno-lint-ignore no-explicit-any
async function checkForDuplicate(
  supabase: any,
  email: string,
  phone: string,
  facilityId: string | undefined,
  requestId: string
): Promise<{ isDuplicate: boolean; reason?: string }> {
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  
  // Build query based on whether we have a facility ID
  let query = supabase
    .from("leads")
    .select("id")
    .or(`email.eq.${email},phone.eq.${phone}`)
    .gte("created_at", twentyFourHoursAgo);
  
  if (facilityId) {
    query = query.eq("facility_id", facilityId);
  } else {
    // For direct inquiries, check for any recent submission with same email/phone and no facility
    query = query.is("facility_id", null);
  }
  
  const { data: recentLeads, error } = await query.limit(1);
  
  if (error) {
    log(requestId, "WARN", "Duplicate check error", { error: error.message });
    return { isDuplicate: false };
  }
  
  if (recentLeads && recentLeads.length > 0) {
    const message = facilityId 
      ? "You've already submitted an inquiry to this facility recently."
      : "You've already submitted an inquiry recently. We'll be in touch soon!";
    log(requestId, "WARN", "Duplicate submission detected", { email, facilityId });
    return { isDuplicate: true, reason: message };
  }
  
  return { isDuplicate: false };
}

// ============ EMAIL TEMPLATES ============
function getSeekerConfirmationEmail(name: string, facilityName: string): string {
  const firstName = name.split(" ")[0];
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
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #0f766e 0%, #14b8a6 100%); padding: 32px; border-radius: 12px 12px 0 0; text-align: center;">
              <div style="font-size: 48px; margin-bottom: 16px;">✉️</div>
              <p style="margin: 0 0 8px 0; font-size: 12px; color: rgba(255,255,255,0.7); font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; text-transform: uppercase; letter-spacing: 1px;">REHABLOOKUP</p>
              <h1 style="margin: 0; font-size: 24px; color: #ffffff; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-weight: 600;">
                Inquiry Received
              </h1>
              <p style="margin: 8px 0 0 0; color: rgba(255,255,255,0.8); font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 14px;">Your message has been delivered</p>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="background: #ffffff; padding: 32px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; border-left: 1px solid #e5e7eb; border-right: 1px solid #e5e7eb;">
              <p style="margin: 0 0 20px 0; color: #374151; font-size: 16px; line-height: 1.6;">
                Hi ${firstName},
              </p>
              <p style="margin: 0 0 24px 0; color: #374151; font-size: 15px; line-height: 1.6;">
                Thank you for reaching out! Your inquiry has been successfully delivered to <strong style="color: #0f766e;">${facilityName}</strong>.
              </p>
              
              <!-- What's Next Box -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background: #f0fdfa; border: 1px solid #99f6e4; border-radius: 8px; margin-bottom: 24px;">
                <tr>
                  <td style="padding: 20px;">
                    <p style="margin: 0 0 12px 0; font-size: 15px; font-weight: 600; color: #0f766e;">📞 What happens next?</p>
                    <ul style="margin: 0; padding: 0 0 0 20px; color: #115e59; font-size: 14px; line-height: 1.8;">
                      <li>The facility will review your inquiry shortly</li>
                      <li>A representative will contact you within 24-48 hours</li>
                      <li>They'll reach out using your preferred contact method</li>
                    </ul>
                  </td>
                </tr>
              </table>
              
              <p style="margin: 0 0 24px 0; color: #6b7280; font-size: 14px; line-height: 1.6;">
                If you have any questions in the meantime, feel free to reply to this email or contact us at <a href="mailto:help@rehablookup.com" style="color: #0f766e; text-decoration: none;">help@rehablookup.com</a>.
              </p>
            </td>
          </tr>
          <!-- Footer -->
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

function getDirectInquirySeekerEmail(name: string): string {
  const firstName = name.split(" ")[0];
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
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #0f766e 0%, #14b8a6 100%); padding: 32px; border-radius: 12px 12px 0 0; text-align: center;">
              <div style="font-size: 48px; margin-bottom: 16px;">💚</div>
              <p style="margin: 0 0 8px 0; font-size: 12px; color: rgba(255,255,255,0.7); font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; text-transform: uppercase; letter-spacing: 1px;">REHABLOOKUP</p>
              <h1 style="margin: 0; font-size: 24px; color: #ffffff; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-weight: 600;">
                We're Here to Help
              </h1>
              <p style="margin: 8px 0 0 0; color: rgba(255,255,255,0.8); font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 14px;">Your request has been received</p>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="background: #ffffff; padding: 32px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; border-left: 1px solid #e5e7eb; border-right: 1px solid #e5e7eb;">
              <p style="margin: 0 0 20px 0; color: #374151; font-size: 16px; line-height: 1.6;">
                Hi ${firstName},
              </p>
              <p style="margin: 0 0 24px 0; color: #374151; font-size: 15px; line-height: 1.6;">
                Thank you for reaching out. We've received your inquiry and our team is reviewing your information to find the best treatment options for your needs.
              </p>
              
              <!-- What's Next Box -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background: #f0fdfa; border: 1px solid #99f6e4; border-radius: 8px; margin-bottom: 24px;">
                <tr>
                  <td style="padding: 20px;">
                    <p style="margin: 0 0 12px 0; font-size: 15px; font-weight: 600; color: #0f766e;">📞 What happens next?</p>
                    <ul style="margin: 0; padding: 0 0 0 20px; color: #115e59; font-size: 14px; line-height: 1.8;">
                      <li>Our team will review your request</li>
                      <li>We'll match you with suitable facilities in your area</li>
                      <li>A care coordinator will reach out within 24-48 hours</li>
                    </ul>
                  </td>
                </tr>
              </table>
              
              <p style="margin: 0 0 24px 0; color: #6b7280; font-size: 14px; line-height: 1.6;">
                If you have any urgent questions, please don't hesitate to contact us at <a href="mailto:help@rehablookup.com" style="color: #0f766e; text-decoration: none;">help@rehablookup.com</a>.
              </p>
            </td>
          </tr>
          <!-- Footer -->
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
  _leadEmail: string,
  _leadPhone: string,
  facilityName: string,
  details: { urgency?: string; levelOfCare?: string; insuranceType?: string; message?: string; preferredContact?: string }
): string {
  // PRIVACY: Mask all contact information - providers must unlock to see full details
  const maskedName = maskLeadName(leadName);
  const maskedEmail = maskEmail(_leadEmail);
  const maskedPhone = maskPhone();
  const firstName = leadName.split(" ")[0];
  
  // Format urgency display
  const urgencyDisplay = details.urgency === 'immediate' ? '🔴 Immediate' 
    : details.urgency === 'within_week' ? '🟡 Within a week'
    : details.urgency === 'within_month' ? '🟢 Within a month'
    : '⚪ Not specified';
  
  // Format level of care
  const levelOfCareDisplay = details.levelOfCare?.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) || 'Not specified';
  
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
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #1B365D 0%, #2C4A7F 100%); padding: 32px; border-radius: 12px 12px 0 0; text-align: center;">
              <div style="font-size: 48px; margin-bottom: 16px;">🔔</div>
              <p style="margin: 0 0 8px 0; font-size: 12px; color: rgba(255,255,255,0.7); font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; text-transform: uppercase; letter-spacing: 1px;">REHABLOOKUP</p>
              <h1 style="margin: 0; font-size: 24px; color: #ffffff; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-weight: 600;">
                New Inquiry Received
              </h1>
              <p style="margin: 8px 0 0 0; color: rgba(255,255,255,0.8); font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 14px;">${facilityName}</p>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="background: #ffffff; padding: 32px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; border-left: 1px solid #e5e7eb; border-right: 1px solid #e5e7eb;">
              <p style="margin: 0 0 24px 0; color: #374151; font-size: 15px; line-height: 1.6;">
                Great news! Someone is interested in your facility and has submitted an inquiry through RehabLookup.
              </p>
              
              <!-- Lead Preview Card -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%); border: 1px solid #e2e8f0; border-radius: 12px; margin-bottom: 24px;">
                <tr>
                  <td style="padding: 24px;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="vertical-align: top; width: 60px;">
                          <div style="width: 50px; height: 50px; background: linear-gradient(135deg, #1B365D 0%, #2C4A7F 100%); border-radius: 50%; color: #ffffff; font-size: 18px; font-weight: 600; text-align: center; line-height: 50px;">
                            ${firstName[0]?.toUpperCase() || '?'}
                          </div>
                        </td>
                        <td style="vertical-align: top; padding-left: 16px;">
                          <p style="margin: 0 0 4px 0; font-size: 18px; font-weight: 600; color: #1e293b;">${maskedName}</p>
                          <p style="margin: 0; font-size: 13px; color: #64748b;">New inquiry • ${urgencyDisplay}</p>
                        </td>
                      </tr>
                    </table>
                    
                    <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;">
                    
                    <!-- Masked Contact Info -->
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding: 8px 0;">
                          <span style="color: #64748b; font-size: 13px;">📧 Email:</span>
                          <span style="color: #94a3b8; font-size: 13px; float: right; font-family: monospace;">${maskedEmail}</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0;">
                          <span style="color: #64748b; font-size: 13px;">📱 Phone:</span>
                          <span style="color: #94a3b8; font-size: 13px; float: right; font-family: monospace;">${maskedPhone}</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0;">
                          <span style="color: #64748b; font-size: 13px;">💬 Preferred:</span>
                          <span style="color: #475569; font-size: 13px; float: right;">${details.preferredContact === 'email' ? 'Email' : details.preferredContact === 'text' ? 'Text' : 'Phone'}</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              
              <!-- Inquiry Details -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background: #f0f9ff; border: 1px solid #bfdbfe; border-radius: 8px; margin-bottom: 24px;">
                <tr>
                  <td style="padding: 20px;">
                    <p style="margin: 0 0 12px 0; font-size: 14px; font-weight: 600; color: #1e40af;">📋 Inquiry Details</p>
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding: 6px 0; color: #475569; font-size: 14px;">
                          <strong>Level of Care:</strong> ${levelOfCareDisplay}
                        </td>
                      </tr>
                      ${details.insuranceType ? `
                      <tr>
                        <td style="padding: 6px 0; color: #475569; font-size: 14px;">
                          <strong>Insurance:</strong> ${details.insuranceType}
                        </td>
                      </tr>
                      ` : ''}
                    </table>
                  </td>
                </tr>
              </table>
              
              <!-- Unlock CTA -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border: 2px solid #f59e0b; border-radius: 12px; margin-bottom: 24px;">
                <tr>
                  <td style="padding: 20px; text-align: center;">
                    <p style="margin: 0 0 8px 0; font-size: 15px; font-weight: 600; color: #92400e;">🔒 Full Contact Info Hidden</p>
                    <p style="margin: 0 0 16px 0; font-size: 13px; color: #78350f; line-height: 1.5;">
                      Unlock this lead in your dashboard to view full contact details and connect with this potential client.
                    </p>
                    <a href="https://rehablookup.com/provider/inquiries" style="display: inline-block; background: #1B365D; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: 600; font-size: 14px;">
                      🔓 Unlock Lead in Dashboard
                    </a>
                  </td>
                </tr>
              </table>
              
              <!-- Tip -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background: #f0f9ff; border: 1px solid #bfdbfe; border-radius: 8px; margin-bottom: 24px;">
                <tr>
                  <td style="padding: 16px;">
                    <p style="margin: 0; font-size: 13px; color: #1e40af; line-height: 1.5;">
                      💡 <strong>Tip:</strong> Quick response times lead to higher conversion rates. Try to reach out within 24 hours!
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Footer -->
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
                    <a href="https://rehablookup.com/provider/settings" style="color: #93c5fd; text-decoration: none; font-size: 12px;">Notification Settings</a>
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

// ============ MAIN HANDLER ============
serve(async (req) => {
  const requestId = generateRequestId();
  log(requestId, "INFO", "Request received", { method: req.method });

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const data: InquiryRequest = await req.json();
    const isDirectInquiry = !data.facilityId;
    
    log(requestId, "INFO", "Inquiry data received", { 
      facilityId: data.facilityId || "DIRECT",
      email: data.email?.substring(0, 3) + "***",
      isDirectInquiry,
    });

    // Validation - basic required fields
    if (!data.name || !data.email || !data.phone) {
      log(requestId, "ERROR", "Missing required fields");
      return new Response(
        JSON.stringify({ success: false, error: "Name, email, and phone are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // deno-lint-ignore no-explicit-any
    let facility: any = null;

    // If facility ID provided, verify facility exists and is active
    if (data.facilityId) {
      const { data: facilityData, error: facilityError } = await supabase
        .from("facilities")
        .select("id, name, email, user_id, status, suspended, reply_email, reply_email_verified")
        .eq("id", data.facilityId)
        .maybeSingle();

      if (facilityError || !facilityData) {
        log(requestId, "ERROR", "Facility not found", { facilityId: data.facilityId });
        return new Response(
          JSON.stringify({ success: false, error: "Facility not found" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (facilityData.status !== "approved" || facilityData.suspended) {
        log(requestId, "ERROR", "Facility not accepting inquiries", { facilityId: data.facilityId });
        return new Response(
          JSON.stringify({ success: false, error: "This facility is not currently accepting inquiries" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      facility = facilityData;
    }

    // Check for duplicates
    const duplicateCheck = await checkForDuplicate(supabase, data.email, data.phone, data.facilityId, requestId);
    if (duplicateCheck.isDuplicate) {
      return new Response(
        JSON.stringify({ success: false, error: duplicateCheck.reason }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Calculate expiry timestamps
    const now = new Date();
    const exclusiveUntil = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours
    const extendedUntil = new Date(now.getTime() + 72 * 60 * 60 * 1000); // 72 hours total

    // Insert lead with redistribution fields
    // deno-lint-ignore no-explicit-any
    const leadData: any = {
      facility_id: data.facilityId || null,
      name: data.name,
      email: data.email,
      phone: data.phone,
      preferred_contact: data.preferredContact || "phone",
      message: data.message || null,
      urgency: data.urgency || "not_sure",
      level_of_care: data.levelOfCare || null,
      insurance_type: data.insuranceType || null,
      insurance_provider: data.insuranceProvider || null,
      location_zip: data.locationZip || null,
      location_city_state: data.locationCityState || null,
      primary_substance: data.primarySubstance || [],
      dual_diagnosis: data.dualDiagnosis || null,
      who_seeking_help: data.whoSeekingHelp || null,
      source: data.source || (isDirectInquiry ? "direct" : "facility_profile"),
      status: isDirectInquiry ? "unassigned" : "new",
      assigned_at: isDirectInquiry ? null : now.toISOString(),
    };
    
    // Add redistribution fields only for facility-specific leads
    if (data.facilityId) {
      leadData.original_facility_id = data.facilityId;
      leadData.exclusive_until = exclusiveUntil.toISOString();
      leadData.extended_until = extendedUntil.toISOString();
      leadData.redistribution_status = "exclusive";
    }
    
    const { data: lead, error: insertError } = await supabase
      .from("leads")
      .insert(leadData)
      .select("id")
      .single();

    if (insertError) {
      log(requestId, "ERROR", "Failed to insert lead", { error: insertError.message });
      return new Response(
        JSON.stringify({ success: false, error: "Failed to submit inquiry. Please try again." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    log(requestId, "INFO", "Lead inserted", { leadId: lead.id, isDirectInquiry });

    // Create initial distribution record only for facility-specific leads
    if (data.facilityId) {
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
    }

    // Send emails
    const firstName = data.name.split(" ")[0];

    // Seeker confirmation - different messages for direct vs facility inquiries
    try {
      if (isDirectInquiry) {
        // Direct inquiry - send general confirmation
        await resend.emails.send({
          from: "RehabLookup <notifications@rehablookup.com>",
          to: data.email,
          subject: "We've received your request for help",
          html: getDirectInquirySeekerEmail(data.name),
        });
      } else {
        // Facility-specific inquiry
        await resend.emails.send({
          from: "RehabLookup <notifications@rehablookup.com>",
          to: data.email,
          subject: `Your inquiry to ${facility.name} has been received`,
          html: getSeekerConfirmationEmail(data.name, facility.name),
        });
      }
      log(requestId, "INFO", "Seeker email sent", { email: data.email });
    } catch (e) {
      log(requestId, "WARN", "Failed to send seeker email", { error: String(e) });
    }

    // Facility notification - only for facility-specific inquiries
    if (facility) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("email")
        .eq("user_id", facility.user_id)
        .maybeSingle();

      const notificationEmail = (facility.reply_email_verified && facility.reply_email) 
        ? facility.reply_email 
        : (profile?.email || facility.email);

      if (notificationEmail) {
        try {
          await resend.emails.send({
            from: "RehabLookup <notifications@rehablookup.com>",
            to: notificationEmail,
            subject: `New Inquiry from ${firstName} - ${facility.name}`,
            html: getFacilityNotificationEmail(data.name, data.email, data.phone, facility.name, {
              urgency: data.urgency,
              levelOfCare: data.levelOfCare,
              insuranceType: data.insuranceType,
              message: data.message,
              preferredContact: data.preferredContact,
            }),
          });
          log(requestId, "INFO", "Facility email sent", { email: notificationEmail });
        } catch (e) {
          log(requestId, "WARN", "Failed to send facility email", { error: String(e) });
        }
      }
    }

    // ========== SMS NOTIFICATION ==========
    // Check if provider has SMS alerts enabled and has verified phone (only for facility leads)
    if (facility) {
      try {
        const { data: notifPrefs } = await supabase
          .from("notification_preferences")
          .select("sms_lead_alerts")
          .eq("user_id", facility.user_id)
          .maybeSingle();

      if (notifPrefs?.sms_lead_alerts) {
        const { data: providerProfile } = await supabase
          .from("profiles")
          .select("phone, phone_verified")
          .eq("user_id", facility.user_id)
          .maybeSingle();

        if (providerProfile?.phone && providerProfile.phone_verified) {
          log(requestId, "INFO", "Triggering SMS notification for provider");
          
          // Call SMS notification function
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
          
          log(requestId, "INFO", "SMS notification triggered");
        }
      }
    } catch (smsError) {
      log(requestId, "WARN", "Failed to send SMS notification", { error: String(smsError) });
      // Don't fail the whole request if SMS fails
    }

    // ========== IN-APP NOTIFICATION ==========
    // Create provider notification for real-time bell icon updates
    try {
      await supabase.from("provider_notifications").insert({
        user_id: facility.user_id,
        facility_id: facility.id,
        type: "new_lead",
        title: "New Inquiry Received",
        message: `${maskLeadName(data.name)} submitted an inquiry${data.levelOfCare ? ` for ${data.levelOfCare.replace(/_/g, ' ')}` : ''}`,
        metadata: {
          lead_id: lead.id,
          urgency: data.urgency,
          level_of_care: data.levelOfCare,
          source: data.source || "facility_profile",
        },
        read: false,
      });
      log(requestId, "INFO", "In-app notification created");
    } catch (notifError) {
      log(requestId, "WARN", "Failed to create in-app notification", { error: String(notifError) });
      // Don't fail the whole request if notification fails
    }
    } // End of if (facility) block

    log(requestId, "INFO", "Inquiry submitted successfully", { leadId: lead.id, facilityName: facility?.name || "Direct Inquiry" });

    return new Response(
      JSON.stringify({
        success: true,
        leadId: lead.id,
        facilityName: facility?.name || null,
        message: isDirectInquiry 
          ? "Your request has been received! We'll be in touch soon."
          : "Your inquiry has been sent successfully!",
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    log(requestId, "ERROR", "Unhandled error", { error: error instanceof Error ? error.message : String(error) });
    return new Response(
      JSON.stringify({ success: false, error: "An unexpected error occurred. Please try again." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
