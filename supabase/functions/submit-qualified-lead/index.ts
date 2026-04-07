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
  facilityId: string; // Required - all inquiries must target a facility
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

// ============ INPUT SANITIZATION ============
function sanitizeEmail(email: string): string {
  return email.toLowerCase().trim().slice(0, 255);
}

function sanitizePhone(phone: string): string {
  // Remove all non-digit characters and limit length
  return phone.replace(/\D/g, "").slice(0, 15);
}

function sanitizeName(name: string): string {
  // Remove potentially dangerous characters, limit length
  return name.trim().replace(/[<>{}[\]\\]/g, "").slice(0, 100);
}

function sanitizeMessage(message: string | undefined): string | undefined {
  if (!message) return undefined;
  // Limit length and remove script tags
  return message.trim().replace(/<script[^>]*>.*?<\/script>/gi, "").slice(0, 2000) || undefined;
}

// ============ DUPLICATE CHECK ============
// deno-lint-ignore no-explicit-any
async function checkForDuplicate(
  supabase: any,
  email: string,
  phone: string,
  facilityId: string,
  requestId: string
): Promise<{ isDuplicate: boolean; reason?: string }> {
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  
  // Check by email first
  const { data: emailLeads, error: emailError } = await supabase
    .from("leads")
    .select("id")
    .eq("facility_id", facilityId)
    .eq("email", email)
    .gte("created_at", twentyFourHoursAgo)
    .limit(1);
  
  if (emailError) {
    log(requestId, "WARN", "Duplicate check error (email)", { error: emailError.message });
  }
  
  if (emailLeads && emailLeads.length > 0) {
    log(requestId, "WARN", "Duplicate submission detected (email)", { facilityId });
    return { isDuplicate: true, reason: "You've already submitted an inquiry to this facility recently." };
  }
  
  // Check by phone if provided
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
                If you have any questions in the meantime, feel free to contact us at <a href="mailto:Support@rehablookup.com" style="color: #0f766e; text-decoration: none;">Support@rehablookup.com</a>.
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
    : details.urgency === 'flexible' ? '🔵 Flexible'
    : '⚪ Pending assessment';
  
  // Format level of care
  const levelOfCareDisplay = details.levelOfCare?.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) || '—';
  
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
                          <table role="presentation" cellpadding="0" cellspacing="0">
                            <tr>
                              <td style="width: 24px; color: #64748b;">📧</td>
                              <td style="font-size: 14px; color: #334155;">${maskedEmail}</td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0;">
                          <table role="presentation" cellpadding="0" cellspacing="0">
                            <tr>
                              <td style="width: 24px; color: #64748b;">📱</td>
                              <td style="font-size: 14px; color: #334155;">${maskedPhone}</td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0;">
                          <table role="presentation" cellpadding="0" cellspacing="0">
                            <tr>
                              <td style="width: 24px; color: #64748b;">🏥</td>
                              <td style="font-size: 14px; color: #334155;">${levelOfCareDisplay}</td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      ${details.insuranceType ? `
                      <tr>
                        <td style="padding: 8px 0;">
                          <table role="presentation" cellpadding="0" cellspacing="0">
                            <tr>
                              <td style="width: 24px; color: #64748b;">💳</td>
                              <td style="font-size: 14px; color: #334155;">${details.insuranceType}</td>
                            </tr>
                          </table>
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
Deno.serve(async (req) => {
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

    const rawData: InquiryRequest = await req.json();
    
    // Sanitize all inputs immediately
    const data = {
      ...rawData,
      name: sanitizeName(rawData.name || ""),
      email: sanitizeEmail(rawData.email || ""),
      phone: sanitizePhone(rawData.phone || ""),
      message: sanitizeMessage(rawData.message),
      firstName: rawData.firstName ? sanitizeName(rawData.firstName) : undefined,
      lastName: rawData.lastName ? sanitizeName(rawData.lastName) : undefined,
    };
    
    log(requestId, "INFO", "Inquiry data received", { 
      facilityId: data.facilityId,
      email: data.email?.substring(0, 3) + "***",
    });

    // Validation - facility_id is now REQUIRED
    if (!data.facilityId) {
      log(requestId, "ERROR", "Missing facility_id - all inquiries must target a facility");
      return new Response(
        JSON.stringify({ success: false, error: "facility_id is required for all inquiries" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate facility_id format (UUID)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(data.facilityId)) {
      log(requestId, "ERROR", "Invalid facility_id format");
      return new Response(
        JSON.stringify({ success: false, error: "Invalid facility ID" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validation - basic required fields
    if (!data.name || !data.email || !data.phone) {
      log(requestId, "ERROR", "Missing required fields");
      return new Response(
        JSON.stringify({ success: false, error: "Name, email, and phone are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(data.email)) {
      log(requestId, "ERROR", "Invalid email format");
      return new Response(
        JSON.stringify({ success: false, error: "Please provide a valid email address" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate phone (at least 10 digits)
    if (data.phone.length < 10) {
      log(requestId, "ERROR", "Invalid phone format");
      return new Response(
        JSON.stringify({ success: false, error: "Please provide a valid phone number" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify facility exists and is active
    const { data: facility, error: facilityError } = await supabase
      .from("facilities")
      .select("id, name, email, user_id, status, suspended, reply_email, reply_email_verified")
      .eq("id", data.facilityId)
      .maybeSingle();

    if (facilityError || !facility) {
      log(requestId, "ERROR", "Facility not found", { facilityId: data.facilityId });
      return new Response(
        JSON.stringify({ success: false, error: "Facility not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (facility.status !== "approved" || facility.suspended) {
      log(requestId, "ERROR", "Facility not accepting inquiries", { facilityId: data.facilityId });
      return new Response(
        JSON.stringify({ success: false, error: "This facility is not currently accepting inquiries" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check for duplicates using sanitized data
    const duplicateCheck = await checkForDuplicate(supabase, data.email, data.phone, data.facilityId, requestId);
    if (duplicateCheck.isDuplicate) {
      return new Response(
        JSON.stringify({ success: false, error: duplicateCheck.reason }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Global rate limit: max 10 submissions per email per hour (across all facilities)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count: globalEmailCount } = await supabase
      .from("leads")
      .select("*", { count: "exact", head: true })
      .eq("email", data.email)
      .gte("created_at", oneHourAgo);

    if (globalEmailCount && globalEmailCount >= 10) {
      log(requestId, "WARN", "Global rate limit exceeded", { email: data.email.substring(0, 3) + "***" });
      return new Response(
        JSON.stringify({ success: false, error: "Too many inquiries. Please wait before submitting again." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Calculate expiry timestamps for redistribution
    const now = new Date();
    const exclusiveUntil = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours
    const extendedUntil = new Date(now.getTime() + 72 * 60 * 60 * 1000); // 72 hours total

    // Insert lead with redistribution fields and enhanced intake data (using sanitized data)
    const { data: lead, error: insertError } = await supabase
      .from("leads")
      .insert({
        facility_id: data.facilityId,
        name: data.name,
        email: data.email,
        phone: data.phone,
        preferred_contact: data.preferredContact || "phone",
        message: data.message,
        urgency: data.urgency || null,
        level_of_care: data.levelOfCare || null,
        insurance_type: data.insuranceType || null,
        insurance_provider: data.insuranceProvider || null,
        location_zip: data.locationZip || null,
        location_city_state: data.locationCityState || null,
        primary_substance: data.primarySubstance || [],
        dual_diagnosis: data.dualDiagnosis || null,
        who_seeking_help: data.whoSeekingHelp || null,
        source: data.source || "facility_profile",
        status: "new",
        // Redistribution fields
        original_facility_id: data.facilityId,
        exclusive_until: exclusiveUntil.toISOString(),
        extended_until: extendedUntil.toISOString(),
        redistribution_status: "exclusive",
        // Enhanced intake fields
        age_range: data.ageRange || null,
        gender: data.gender || null,
        relationship_to_patient: data.relationshipToPatient || null,
        previous_treatment: data.previousTreatment || null,
        previous_treatment_details: data.previousTreatmentDetails || null,
        co_occurring_conditions: data.coOccurringConditions || null,
        employment_status: data.employmentStatus || null,
        veteran_status: data.veteranStatus || null,
        legal_involvement: data.legalInvolvement || null,
        readiness_level: data.readinessLevel || null,
        best_time_to_call: data.bestTimeToCall || null,
        budget_preference: data.budgetPreference || null,
        special_needs: data.specialNeeds || [],
      })
      .select("id")
      .single();

    if (insertError) {
      log(requestId, "ERROR", "Failed to insert lead", { error: insertError.message });
      return new Response(
        JSON.stringify({ success: false, error: "Failed to submit inquiry. Please try again." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
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

    // Send seeker confirmation email
    const firstName = data.name.split(" ")[0];
    try {
      await resend.emails.send({
        from: "RehabLookup <no-reply@rehablookup.com>",
        to: data.email,
        subject: `Your inquiry to ${facility.name} has been received`,
        html: getSeekerConfirmationEmail(data.name, facility.name),
      });
      log(requestId, "INFO", "Seeker email sent", { email: data.email });
    } catch (e) {
      log(requestId, "WARN", "Failed to send seeker email", { error: String(e) });
    }

    // Send facility notification email
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
          from: "RehabLookup <no-reply@rehablookup.com>",
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

    // ========== SMS NOTIFICATION ==========
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
    }

    // ========== IN-APP NOTIFICATION ==========
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
    }

    log(requestId, "INFO", "Inquiry submitted successfully", { leadId: lead.id, facilityName: facility.name });

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
    return new Response(
      JSON.stringify({ success: false, error: "An unexpected error occurred. Please try again." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
