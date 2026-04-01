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

// ============ ZIP TO STATE MAPPING ============
// Uses full state names to match database values
const ZIP_TO_STATE: Record<string, string> = {
  "0": "Massachusetts", "1": "New York", "2": "Virginia", "3": "Florida", "4": "Michigan", 
  "5": "Texas", "6": "Illinois", "7": "Texas", "8": "Colorado", "9": "California"
};

function getStateFromZip(zip: string): string | null {
  if (!zip || zip.length < 1) return null;
  return ZIP_TO_STATE[zip[0]] || null;
}

// ============ INTERFACE ============
interface MarketingLeadRequest {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  preferredContact?: string;
  urgency?: string;
  whoSeekingHelp?: string;
  locationZip?: string;
  locationCityState?: string;
  levelOfCare?: string;
  insuranceType?: string;
  insuranceProvider?: string;
  primarySubstance?: string[];
  dualDiagnosis?: string;
  ageRange?: string;
  gender?: string;
  previousTreatment?: string;
  coOccurringConditions?: string[];
  employmentStatus?: string;
  message?: string;
  // UTM tracking
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmTerm?: string;
  utmContent?: string;
  landingPage?: string;
}

interface MatchedFacility {
  id: string;
  name: string;
  city: string;
  state: string;
  logoUrl: string | null;
  facilityType: string;
}

// ============ INPUT SANITIZATION ============
function sanitizeStr(str: unknown, maxLen = 200): string {
  if (!str || typeof str !== "string") return "";
  return str.trim().replace(/[<>]/g, "").slice(0, maxLen);
}
function sanitizeEmail(email: unknown): string {
  if (!email || typeof email !== "string") throw new Error("Invalid email");
  const cleaned = email.trim().toLowerCase().slice(0, 254);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleaned)) throw new Error("Invalid email format");
  return cleaned;
}
function sanitizePhone(phone: unknown): string {
  if (!phone || typeof phone !== "string") return "";
  return phone.replace(/[^\d+\-() ]/g, "").slice(0, 20);
}

Deno.serve(async (req) => {
  const requestId = generateRequestId();
  
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    log(requestId, "INFO", "Processing marketing lead submission");
    
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const body: MarketingLeadRequest = await req.json();
    
    // Validate & sanitize required fields
    let sanitizedEmail: string;
    try {
      sanitizedEmail = sanitizeEmail(body.email);
    } catch {
      return new Response(
        JSON.stringify({ error: "Valid email address is required" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const firstName = sanitizeStr(body.firstName, 50);
    const lastName = sanitizeStr(body.lastName, 50);
    const phone = sanitizePhone(body.phone);

    if (!firstName || !lastName || !phone || phone.replace(/\D/g, "").length < 10) {
      return new Response(
        JSON.stringify({ error: "First name, last name, and valid phone are required" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Rate limiting: max 5 submissions per email per hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count: recentSubmissions } = await supabase
      .from("marketing_leads")
      .select("*", { count: "exact", head: true })
      .eq("email", sanitizedEmail)
      .gte("created_at", oneHourAgo);

    if (recentSubmissions && recentSubmissions >= 5) {
      log(requestId, "WARN", "Rate limit exceeded", { email: sanitizedEmail });
      return new Response(
        JSON.stringify({ error: "Too many submissions. Please try again later." }),
        { status: 429, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Determine state from ZIP or city/state
    let leadState: string | null = null;
    if (body.locationCityState) {
      const parts = body.locationCityState.split(",");
      if (parts.length > 1) {
        leadState = parts[parts.length - 1].trim().toUpperCase();
      }
    }
    if (!leadState && body.locationZip) {
      leadState = getStateFromZip(body.locationZip);
    }

    log(requestId, "INFO", "Lead location determined", { state: leadState, zip: body.locationZip });

    }

    // Store the marketing lead with sanitized data
    const { data: lead, error: insertError } = await supabase
      .from("marketing_leads")
      .insert({
        first_name: firstName,
        last_name: lastName,
        email: sanitizedEmail,
        phone: phone,
        preferred_contact: sanitizeStr(body.preferredContact, 20) || "phone",
        urgency: sanitizeStr(body.urgency, 30),
        who_seeking_help: sanitizeStr(body.whoSeekingHelp, 30),
        location_zip: sanitizeStr(body.locationZip, 10),
        location_city_state: sanitizeStr(body.locationCityState, 100),
        level_of_care: sanitizeStr(body.levelOfCare, 50),
        insurance_type: sanitizeStr(body.insuranceType, 50),
        insurance_provider: sanitizeStr(body.insuranceProvider, 100),
        primary_substance: Array.isArray(body.primarySubstance) ? body.primarySubstance.map(s => sanitizeStr(s, 50)).filter(Boolean).slice(0, 10) : [],
        dual_diagnosis: sanitizeStr(body.dualDiagnosis, 30),
        age_range: sanitizeStr(body.ageRange, 20),
        gender: sanitizeStr(body.gender, 20),
        previous_treatment: sanitizeStr(body.previousTreatment, 30),
        co_occurring_conditions: Array.isArray(body.coOccurringConditions) ? body.coOccurringConditions.map(s => sanitizeStr(s, 50)).filter(Boolean).slice(0, 10) : [],
        employment_status: sanitizeStr(body.employmentStatus, 30),
        message: sanitizeStr(body.message, 2000),
        source: "marketing",
        utm_source: sanitizeStr(body.utmSource, 100),
        utm_medium: sanitizeStr(body.utmMedium, 100),
        utm_campaign: sanitizeStr(body.utmCampaign, 100),
        utm_term: sanitizeStr(body.utmTerm, 100),
        utm_content: sanitizeStr(body.utmContent, 100),
        landing_page: sanitizeStr(body.landingPage, 500),
        status: "new",
      })
      .select()
      .single();

    if (insertError) {
      log(requestId, "ERROR", "Failed to insert marketing lead", { error: insertError.message });
      throw new Error("Failed to save lead");
    }

    log(requestId, "INFO", "Marketing lead saved", { leadId: lead.id });

    // Find matching facilities (3-5 in same state)
    let matchedFacilities: MatchedFacility[] = [];
    
    if (leadState) {
      const { data: facilities, error: facilityError } = await supabase
        .from("facilities")
        .select("id, name, city, state, logo_url, facility_type")
        .eq("state", leadState)
        .eq("status", "approved")
        .neq("suspended", true)
        .limit(15);

      if (!facilityError && facilities && facilities.length > 0) {
        // Shuffle and take 3-5
        const shuffled = facilities.sort(() => Math.random() - 0.5);
        const selected = shuffled.slice(0, Math.min(5, shuffled.length));
        
        matchedFacilities = selected.map(f => ({
          id: f.id,
          name: f.name,
          city: f.city,
          state: f.state,
          logoUrl: f.logo_url,
          facilityType: f.facility_type,
        }));

        // Update the lead with matched facility IDs
        await supabase
          .from("marketing_leads")
          .update({ matched_facility_ids: selected.map(f => f.id) })
          .eq("id", lead.id);

        log(requestId, "INFO", "Matched facilities", { count: matchedFacilities.length });
      }
    }

    // Send confirmation email to the lead
    try {
      await resend.emails.send({
        from: "RehabLookup <noreply@rehablookup.com>",
        to: [sanitizedEmail],
        subject: "We found treatment options for you",
        html: getLeadConfirmationEmail(firstName, matchedFacilities.length),
      });
      log(requestId, "INFO", "Confirmation email sent to lead");
    } catch (emailError) {
      log(requestId, "WARN", "Failed to send confirmation email", { error: String(emailError) });
    }

    return new Response(
      JSON.stringify({
        success: true,
        leadId: lead.id,
        matchedFacilities,
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );

  } catch (error) {
    log(requestId, "ERROR", "Marketing lead submission failed", { error: String(error) });
    return new Response(
      JSON.stringify({ error: "Failed to process submission" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});

// ============ EMAIL TEMPLATE ============
function getLeadConfirmationEmail(firstName: string, facilityCount: number): string {
  const facilityText = facilityCount > 0 
    ? `We found ${facilityCount} treatment centers that may be a good fit for you.`
    : "We're working on finding the best treatment options for you.";

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
              <div style="font-size: 48px; margin-bottom: 16px;">✅</div>
              <p style="margin: 0 0 8px 0; font-size: 12px; color: rgba(255,255,255,0.7); font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; text-transform: uppercase; letter-spacing: 1px;">REHABLOOKUP</p>
              <h1 style="margin: 0; font-size: 24px; color: #ffffff; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-weight: 600;">
                We Received Your Request
              </h1>
            </td>
          </tr>
          <tr>
            <td style="background: #ffffff; padding: 32px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; border-left: 1px solid #e5e7eb; border-right: 1px solid #e5e7eb;">
              <p style="margin: 0 0 20px 0; color: #374151; font-size: 16px; line-height: 1.6;">
                Hi ${firstName},
              </p>
              <p style="margin: 0 0 24px 0; color: #374151; font-size: 15px; line-height: 1.6;">
                Thank you for reaching out. ${facilityText}
              </p>
              
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background: #f0fdfa; border: 1px solid #99f6e4; border-radius: 8px; margin-bottom: 24px;">
                <tr>
                  <td style="padding: 20px;">
                    <p style="margin: 0 0 12px 0; font-size: 15px; font-weight: 600; color: #0f766e;">📞 What happens next?</p>
                    <ul style="margin: 0; padding: 0 0 0 20px; color: #115e59; font-size: 14px; line-height: 1.8;">
                      <li>Review the matched facilities on our website</li>
                      <li>Click "Request Info" to connect directly with any facility</li>
                      <li>You can also try our Concierge Service for personalized help</li>
                    </ul>
                  </td>
                </tr>
              </table>
              
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top: 28px;">
                <tr>
                  <td align="center">
                    <a href="https://rehablookup.com/concierge" style="display: inline-block; background: #0f766e; color: #ffffff; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 15px;">
                      Get Expert Help — $29
                    </a>
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
                    <p style="margin: 0 0 8px 0; color: #93c5fd; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 12px;">
                      Connecting families with quality care
                    </p>
                    <p style="margin: 0; color: rgba(255,255,255,0.5); font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 11px;">
                      Need immediate help? Call SAMHSA: 1-800-662-4357
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
