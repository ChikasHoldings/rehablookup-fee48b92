import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ============ LOGGING UTILITIES ============
const generateRequestId = () => crypto.randomUUID().slice(0, 8);

const log = (requestId: string, level: "INFO" | "WARN" | "ERROR", step: string, details?: unknown) => {
  const timestamp = new Date().toISOString();
  const detailsStr = details ? ` | ${JSON.stringify(details)}` : "";
  console.log(`[${timestamp}] [${requestId}] [${level}] ${step}${detailsStr}`);
};

// ============ INTERFACES ============
interface LeadInquiryRequest {
  facilityId: string; // Required - direct submission to specific facility
  inquiryType?: 'request_info' | 'request_callback';
  whoSeekingHelp: string;
  locationZip: string;
  locationCityState?: string;
  urgency: string;
  primarySubstance: string[];
  levelOfCare: string;
  dualDiagnosis: string;
  insuranceType: string;
  insuranceProvider?: string;
  budgetPreference?: string;
  specialNeeds?: string[];
  name: string;
  firstName?: string;
  lastName?: string;
  phone: string;
  email: string;
  preferredContact: string;
  message?: string;
  source?: string;
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
}

// ============ UTILITY FUNCTIONS ============
async function hashIP(ip: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(ip + Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"));
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("").substring(0, 16);
}

// ============ SPAM/DUPLICATE DETECTION ============
// deno-lint-ignore no-explicit-any
async function checkForDuplicate(
  supabase: any,
  email: string,
  phone: string,
  facilityId: string,
  requestId: string
): Promise<{ isDuplicate: boolean; reason?: string }> {
  // Check for recent submissions (within 24 hours) to same facility
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  
  const { data: recentLeads, error } = await supabase
    .from("leads")
    .select("id, created_at")
    .eq("facility_id", facilityId)
    .or(`email.eq.${email},phone.eq.${phone}`)
    .gte("created_at", twentyFourHoursAgo)
    .limit(1);
  
  if (error) {
    log(requestId, "WARN", "Duplicate check error", { error: error.message });
    return { isDuplicate: false };
  }
  
  if (recentLeads && recentLeads.length > 0) {
    log(requestId, "WARN", "Duplicate submission detected", { email, facilityId });
    return { isDuplicate: true, reason: "You've already submitted an inquiry to this facility recently." };
  }
  
  return { isDuplicate: false };
}

// ============ EMAIL TEMPLATES ============
function getSeekerConfirmationEmail(leadName: string, facilityName: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Inquiry Received</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8fafc;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8fafc; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <tr>
            <td style="padding: 40px; text-align: center; background: linear-gradient(135deg, #0f766e 0%, #14b8a6 100%); border-radius: 12px 12px 0 0;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700;">Inquiry Received</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px;">
              <p style="margin: 0 0 20px; color: #1e293b; font-size: 16px; line-height: 1.6;">
                Hi ${leadName},
              </p>
              <p style="margin: 0 0 20px; color: #475569; font-size: 16px; line-height: 1.6;">
                Thank you for reaching out. Your inquiry has been sent directly to <strong>${facilityName}</strong>.
              </p>
              <p style="margin: 0 0 20px; color: #475569; font-size: 16px; line-height: 1.6;">
                A representative from the facility will contact you soon using your preferred contact method.
              </p>
              <div style="background-color: #f0fdfa; border-left: 4px solid #14b8a6; padding: 20px; margin: 30px 0; border-radius: 0 8px 8px 0;">
                <p style="margin: 0; color: #0f766e; font-size: 14px;">
                  <strong>What happens next?</strong><br>
                  The facility will review your inquiry and reach out within 24-48 hours. If you have an urgent need, feel free to contact them directly.
                </p>
              </div>
              <p style="margin: 30px 0 0; color: #64748b; font-size: 14px; line-height: 1.6;">
                Need personalized help finding the right treatment center?<br>
                <a href="https://rehablookup.com/concierge" style="color: #0f766e; text-decoration: underline;">Try our Concierge Service</a> – we'll match you with facilities tailored to your needs.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 30px; background-color: #f8fafc; border-radius: 0 0 12px 12px; text-align: center;">
              <p style="margin: 0; color: #64748b; font-size: 12px;">
                © ${new Date().getFullYear()} RehabLookup. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}

function getFacilityNotificationEmail(
  leadName: string,
  leadEmail: string,
  leadPhone: string,
  facilityName: string,
  inquiryDetails: {
    urgency?: string;
    levelOfCare?: string;
    insuranceType?: string;
    message?: string;
    preferredContact?: string;
  }
): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New Inquiry Received</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8fafc;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8fafc; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <tr>
            <td style="padding: 40px; text-align: center; background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); border-radius: 12px 12px 0 0;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700;">New Inquiry for ${facilityName}</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px;">
              <p style="margin: 0 0 20px; color: #1e293b; font-size: 16px; line-height: 1.6;">
                You have received a new inquiry through RehabLookup.
              </p>
              
              <div style="background-color: #f8fafc; border-radius: 8px; padding: 24px; margin: 20px 0;">
                <h3 style="margin: 0 0 16px; color: #1e293b; font-size: 18px;">Contact Information</h3>
                <p style="margin: 0 0 8px; color: #475569; font-size: 15px;">
                  <strong>Name:</strong> ${leadName}
                </p>
                <p style="margin: 0 0 8px; color: #475569; font-size: 15px;">
                  <strong>Email:</strong> <a href="mailto:${leadEmail}" style="color: #2563eb;">${leadEmail}</a>
                </p>
                <p style="margin: 0 0 8px; color: #475569; font-size: 15px;">
                  <strong>Phone:</strong> <a href="tel:${leadPhone}" style="color: #2563eb;">${leadPhone}</a>
                </p>
                <p style="margin: 0; color: #475569; font-size: 15px;">
                  <strong>Preferred Contact:</strong> ${inquiryDetails.preferredContact || 'Phone'}
                </p>
              </div>
              
              <div style="background-color: #f0f9ff; border-radius: 8px; padding: 24px; margin: 20px 0;">
                <h3 style="margin: 0 0 16px; color: #1e293b; font-size: 18px;">Inquiry Details</h3>
                ${inquiryDetails.urgency ? `<p style="margin: 0 0 8px; color: #475569; font-size: 15px;"><strong>Urgency:</strong> ${inquiryDetails.urgency}</p>` : ''}
                ${inquiryDetails.levelOfCare ? `<p style="margin: 0 0 8px; color: #475569; font-size: 15px;"><strong>Level of Care:</strong> ${inquiryDetails.levelOfCare}</p>` : ''}
                ${inquiryDetails.insuranceType ? `<p style="margin: 0 0 8px; color: #475569; font-size: 15px;"><strong>Insurance:</strong> ${inquiryDetails.insuranceType}</p>` : ''}
                ${inquiryDetails.message ? `<p style="margin: 16px 0 0; color: #475569; font-size: 15px;"><strong>Message:</strong><br>${inquiryDetails.message}</p>` : ''}
              </div>
              
              <div style="text-align: center; margin-top: 30px;">
                <a href="https://rehablookup.com/provider/inquiries" style="display: inline-block; background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
                  View in Dashboard
                </a>
              </div>
              
              <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; margin: 30px 0; border-radius: 0 8px 8px 0;">
                <p style="margin: 0; color: #92400e; font-size: 14px;">
                  <strong>Tip:</strong> Responding quickly to inquiries improves your chances of helping this person find the care they need.
                </p>
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding: 30px; background-color: #f8fafc; border-radius: 0 0 12px 12px; text-align: center;">
              <p style="margin: 0; color: #64748b; font-size: 12px;">
                © ${new Date().getFullYear()} RehabLookup. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}

// ============ MAIN HANDLER ============
serve(async (req) => {
  const requestId = generateRequestId();
  log(requestId, "INFO", "Request received", { method: req.method });

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const leadData: LeadInquiryRequest = await req.json();
    log(requestId, "INFO", "Lead data received", { 
      facilityId: leadData.facilityId,
      email: leadData.email?.substring(0, 3) + "***",
      inquiryType: leadData.inquiryType 
    });

    // ============ VALIDATION ============
    if (!leadData.facilityId) {
      log(requestId, "ERROR", "Missing facilityId");
      return new Response(
        JSON.stringify({ success: false, error: "Facility ID is required for direct inquiries" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!leadData.name || !leadData.email || !leadData.phone) {
      log(requestId, "ERROR", "Missing required fields");
      return new Response(
        JSON.stringify({ success: false, error: "Name, email, and phone are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ============ VERIFY FACILITY EXISTS AND IS APPROVED ============
    const { data: facility, error: facilityError } = await supabase
      .from("facilities")
      .select("id, name, email, user_id, status, suspended, reply_email, reply_email_verified")
      .eq("id", leadData.facilityId)
      .maybeSingle();

    if (facilityError || !facility) {
      log(requestId, "ERROR", "Facility not found", { facilityId: leadData.facilityId, error: facilityError?.message });
      return new Response(
        JSON.stringify({ success: false, error: "Facility not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (facility.status !== "approved") {
      log(requestId, "ERROR", "Facility not approved", { facilityId: leadData.facilityId, status: facility.status });
      return new Response(
        JSON.stringify({ success: false, error: "This facility is not currently accepting inquiries" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (facility.suspended === true) {
      log(requestId, "ERROR", "Facility is suspended", { facilityId: leadData.facilityId });
      return new Response(
        JSON.stringify({ success: false, error: "This facility is not currently accepting inquiries" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ============ DUPLICATE CHECK ============
    const duplicateCheck = await checkForDuplicate(supabase, leadData.email, leadData.phone, leadData.facilityId, requestId);
    if (duplicateCheck.isDuplicate) {
      log(requestId, "WARN", "Duplicate submission blocked");
      return new Response(
        JSON.stringify({ success: false, error: duplicateCheck.reason }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ============ GET IP HASH FOR SPAM TRACKING ============
    const clientIP = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || 
                     req.headers.get("x-real-ip") || 
                     "unknown";
    const ipHash = clientIP !== "unknown" ? await hashIP(clientIP) : null;

    // ============ INSERT LEAD RECORD ============
    const leadRecord = {
      facility_id: leadData.facilityId,
      name: leadData.name,
      email: leadData.email,
      phone: leadData.phone,
      preferred_contact: leadData.preferredContact || "phone",
      message: leadData.message || null,
      urgency: leadData.urgency || "not_sure",
      level_of_care: leadData.levelOfCare || null,
      insurance_type: leadData.insuranceType || null,
      insurance_provider: leadData.insuranceProvider || null,
      location_zip: leadData.locationZip || null,
      location_city_state: leadData.locationCityState || null,
      primary_substance: leadData.primarySubstance || [],
      dual_diagnosis: leadData.dualDiagnosis || null,
      budget_preference: leadData.budgetPreference || null,
      special_needs: leadData.specialNeeds || [],
      who_seeking_help: leadData.whoSeekingHelp || null,
      age_range: leadData.ageRange || null,
      gender: leadData.gender || null,
      relationship_to_patient: leadData.relationshipToPatient || null,
      previous_treatment: leadData.previousTreatment || null,
      previous_treatment_details: leadData.previousTreatmentDetails || null,
      co_occurring_conditions: leadData.coOccurringConditions || [],
      employment_status: leadData.employmentStatus || null,
      veteran_status: leadData.veteranStatus || null,
      legal_involvement: leadData.legalInvolvement || null,
      readiness_level: leadData.readinessLevel || null,
      best_time_to_call: leadData.bestTimeToCall || null,
      source: leadData.source || "facility_profile",
      inquiry_type: leadData.inquiryType || "request_info",
      status: "pending",
      qualified: true, // All direct inquiries are qualified
      exclusivity: "exclusive", // Direct inquiries go only to the specified facility
      ip_hash: ipHash,
      assigned_at: new Date().toISOString(),
    };

    const { data: insertedLead, error: insertError } = await supabase
      .from("leads")
      .insert(leadRecord)
      .select("id")
      .single();

    if (insertError) {
      log(requestId, "ERROR", "Failed to insert lead", { error: insertError.message });
      return new Response(
        JSON.stringify({ success: false, error: "Failed to submit inquiry. Please try again." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    log(requestId, "INFO", "Lead inserted successfully", { leadId: insertedLead.id });

    // ============ SEND EMAILS ============
    const firstName = leadData.firstName || leadData.name.split(" ")[0];

    // Send confirmation to seeker
    try {
      await resend.emails.send({
        from: "RehabLookup <notifications@rehablookup.com>",
        to: leadData.email,
        subject: `Your inquiry to ${facility.name} has been received`,
        html: getSeekerConfirmationEmail(firstName, facility.name),
      });
      log(requestId, "INFO", "Seeker confirmation email sent", { email: leadData.email });
    } catch (emailError) {
      log(requestId, "WARN", "Failed to send seeker confirmation email", { error: String(emailError) });
    }

    // Get provider email for notification
    const { data: profile } = await supabase
      .from("profiles")
      .select("email")
      .eq("user_id", facility.user_id)
      .maybeSingle();

    // Determine which email to send notification to
    const notificationEmail = (facility.reply_email_verified && facility.reply_email) 
      ? facility.reply_email 
      : (profile?.email || facility.email);

    if (notificationEmail) {
      try {
        await resend.emails.send({
          from: "RehabLookup <notifications@rehablookup.com>",
          to: notificationEmail,
          subject: `New Inquiry from ${firstName} - ${facility.name}`,
          html: getFacilityNotificationEmail(
            leadData.name,
            leadData.email,
            leadData.phone,
            facility.name,
            {
              urgency: leadData.urgency,
              levelOfCare: leadData.levelOfCare,
              insuranceType: leadData.insuranceType,
              message: leadData.message,
              preferredContact: leadData.preferredContact,
            }
          ),
        });
        log(requestId, "INFO", "Facility notification email sent", { email: notificationEmail });
      } catch (emailError) {
        log(requestId, "WARN", "Failed to send facility notification email", { error: String(emailError) });
      }
    }

    // ============ SUCCESS RESPONSE ============
    log(requestId, "INFO", "Lead submission completed successfully", { 
      leadId: insertedLead.id, 
      facilityId: leadData.facilityId,
      facilityName: facility.name 
    });

    return new Response(
      JSON.stringify({
        success: true,
        leadId: insertedLead.id,
        facilityName: facility.name,
        message: "Your inquiry has been sent successfully!",
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    log(requestId, "ERROR", "Unhandled error", { error: errorMessage });
    return new Response(
      JSON.stringify({ success: false, error: "An unexpected error occurred. Please try again." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
