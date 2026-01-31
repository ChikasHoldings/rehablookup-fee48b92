import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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
  
  const { data: recentLeads, error } = await supabase
    .from("leads")
    .select("id")
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
function getSeekerConfirmationEmail(name: string, facilityName: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
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
                Hi ${name},
              </p>
              <p style="margin: 0 0 20px; color: #475569; font-size: 16px; line-height: 1.6;">
                Thank you for reaching out. Your inquiry has been sent to <strong>${facilityName}</strong>.
              </p>
              <p style="margin: 0 0 20px; color: #475569; font-size: 16px; line-height: 1.6;">
                A representative will contact you soon using your preferred contact method.
              </p>
              <div style="background-color: #f0fdfa; border-left: 4px solid #14b8a6; padding: 20px; margin: 30px 0; border-radius: 0 8px 8px 0;">
                <p style="margin: 0; color: #0f766e; font-size: 14px;">
                  <strong>What happens next?</strong><br>
                  The facility will review your inquiry and reach out within 24-48 hours.
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
</html>`;
}

function getFacilityNotificationEmail(
  leadName: string,
  leadEmail: string,
  leadPhone: string,
  facilityName: string,
  details: { urgency?: string; levelOfCare?: string; insuranceType?: string; message?: string; preferredContact?: string }
): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
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
              <p style="margin: 0 0 20px; color: #1e293b; font-size: 16px;">
                You have received a new inquiry through RehabLookup.
              </p>
              
              <div style="background-color: #f8fafc; border-radius: 8px; padding: 24px; margin: 20px 0;">
                <h3 style="margin: 0 0 16px; color: #1e293b; font-size: 18px;">Contact Information</h3>
                <p style="margin: 0 0 8px; color: #475569; font-size: 15px;"><strong>Name:</strong> ${leadName}</p>
                <p style="margin: 0 0 8px; color: #475569; font-size: 15px;"><strong>Email:</strong> <a href="mailto:${leadEmail}" style="color: #2563eb;">${leadEmail}</a></p>
                <p style="margin: 0 0 8px; color: #475569; font-size: 15px;"><strong>Phone:</strong> <a href="tel:${leadPhone}" style="color: #2563eb;">${leadPhone}</a></p>
                <p style="margin: 0; color: #475569; font-size: 15px;"><strong>Preferred Contact:</strong> ${details.preferredContact || 'Phone'}</p>
              </div>
              
              <div style="background-color: #f0f9ff; border-radius: 8px; padding: 24px; margin: 20px 0;">
                <h3 style="margin: 0 0 16px; color: #1e293b; font-size: 18px;">Inquiry Details</h3>
                ${details.urgency ? `<p style="margin: 0 0 8px; color: #475569; font-size: 15px;"><strong>Urgency:</strong> ${details.urgency}</p>` : ''}
                ${details.levelOfCare ? `<p style="margin: 0 0 8px; color: #475569; font-size: 15px;"><strong>Level of Care:</strong> ${details.levelOfCare}</p>` : ''}
                ${details.insuranceType ? `<p style="margin: 0 0 8px; color: #475569; font-size: 15px;"><strong>Insurance:</strong> ${details.insuranceType}</p>` : ''}
                ${details.message ? `<p style="margin: 16px 0 0; color: #475569; font-size: 15px;"><strong>Message:</strong><br>${details.message}</p>` : ''}
              </div>
              
              <div style="text-align: center; margin-top: 30px;">
                <a href="https://rehablookup.com/provider/inquiries" style="display: inline-block; background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
                  View in Dashboard
                </a>
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
    log(requestId, "INFO", "Inquiry data received", { 
      facilityId: data.facilityId,
      email: data.email?.substring(0, 3) + "***"
    });

    // Validation
    if (!data.facilityId) {
      log(requestId, "ERROR", "Missing facilityId");
      return new Response(
        JSON.stringify({ success: false, error: "Facility ID is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!data.name || !data.email || !data.phone) {
      log(requestId, "ERROR", "Missing required fields");
      return new Response(
        JSON.stringify({ success: false, error: "Name, email, and phone are required" }),
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

    // Check for duplicates
    const duplicateCheck = await checkForDuplicate(supabase, data.email, data.phone, data.facilityId, requestId);
    if (duplicateCheck.isDuplicate) {
      return new Response(
        JSON.stringify({ success: false, error: duplicateCheck.reason }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Insert lead
    const { data: lead, error: insertError } = await supabase
      .from("leads")
      .insert({
        facility_id: data.facilityId,
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
        source: data.source || "facility_profile",
        status: "new",
        assigned_at: new Date().toISOString(),
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

    // Send emails
    const firstName = data.name.split(" ")[0];

    // Seeker confirmation
    try {
      await resend.emails.send({
        from: "RehabLookup <notifications@rehablookup.com>",
        to: data.email,
        subject: `Your inquiry to ${facility.name} has been received`,
        html: getSeekerConfirmationEmail(firstName, facility.name),
      });
      log(requestId, "INFO", "Seeker email sent", { email: data.email });
    } catch (e) {
      log(requestId, "WARN", "Failed to send seeker email", { error: String(e) });
    }

    // Facility notification
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
