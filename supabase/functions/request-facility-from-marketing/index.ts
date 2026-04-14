import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { sendEmailWithRetry } from "../_shared/resilient-email-sender.ts";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const generateRequestId = () => crypto.randomUUID().slice(0, 8);

const log = (requestId: string, level: "INFO" | "WARN" | "ERROR", message: string, details?: unknown) => {
  const timestamp = new Date().toISOString();
  const detailsStr = details ? ` | ${JSON.stringify(details)}` : "";
  console.log(`[${timestamp}] [${requestId}] [${level}] ${message}${detailsStr}`);
};

interface RequestFacilityPayload {
  marketingLeadId: string;
  facilityId: string;
}

Deno.serve(async (req) => {
  const requestId = generateRequestId();
  
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    log(requestId, "INFO", "Processing facility request from marketing lead");
    
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const body: RequestFacilityPayload = await req.json();
    
    if (!body.marketingLeadId || !body.facilityId) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Fetch the marketing lead data
    const { data: marketingLead, error: fetchError } = await supabase
      .from("marketing_leads")
      .select("*")
      .eq("id", body.marketingLeadId)
      .single();

    if (fetchError || !marketingLead) {
      log(requestId, "ERROR", "Marketing lead not found", { id: body.marketingLeadId });
      return new Response(
        JSON.stringify({ error: "Lead not found" }),
        { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Check if already requested this facility
    const alreadyRequested = (marketingLead.facilities_requested || []).includes(body.facilityId);
    if (alreadyRequested) {
      return new Response(
        JSON.stringify({ error: "You have already requested info from this facility" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Get facility info
    const { data: facility, error: facilityError } = await supabase
      .from("facilities")
      .select("id, name, user_id, email, reply_email")
      .eq("id", body.facilityId)
      .single();

    if (facilityError || !facility) {
      log(requestId, "ERROR", "Facility not found", { facilityId: body.facilityId });
      return new Response(
        JSON.stringify({ error: "Facility not found" }),
        { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Create a lead in the main leads table (normal flow)
    const fullName = `${marketingLead.first_name} ${marketingLead.last_name}`.trim();
    
    const { data: newLead, error: leadError } = await supabase
      .from("leads")
      .insert({
        facility_id: body.facilityId,
        name: fullName,
        email: marketingLead.email,
        phone: marketingLead.phone,
        urgency: marketingLead.urgency || "flexible",
        level_of_care: marketingLead.level_of_care,
        insurance_type: marketingLead.insurance_type,
        location_zip: marketingLead.location_zip,
        location_city_state: marketingLead.location_city_state,
        primary_substance: marketingLead.primary_substance || [],
        dual_diagnosis: marketingLead.dual_diagnosis,
        message: marketingLead.message,
        source: "marketing_landing",
        status: "new",
      })
      .select()
      .single();

    if (leadError) {
      log(requestId, "ERROR", "Failed to create lead", { error: leadError.message });
      throw new Error("Failed to create lead");
    }

    log(requestId, "INFO", "Lead created from marketing", { leadId: newLead.id, facilityId: body.facilityId });

    // Update marketing lead to track requested facility
    const updatedRequested = [...(marketingLead.facilities_requested || []), body.facilityId];
    await supabase
      .from("marketing_leads")
      .update({ 
        facilities_requested: updatedRequested,
        status: "contacted"
      })
      .eq("id", body.marketingLeadId);

    // Send notification email to facility (masked - normal flow)
    const facilityEmail = facility.reply_email || facility.email;
    if (facilityEmail) {
      try {
        await sendEmailWithRetry(supabase, resend, {
          from: "RehabLookup <no-reply@rehablookup.com>",
          to: [facilityEmail],
          subject: `New Inquiry for ${facility.name}`,
          html: getFacilityNotificationEmail(marketingLead.first_name, facility.name),
        });
        log(requestId, "INFO", "Facility notification sent", { facilityEmail });
      } catch (emailError) {
        log(requestId, "WARN", "Failed to send facility email", { error: String(emailError) });
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        leadId: newLead.id,
        message: "Your request has been sent to the facility" 
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );

  } catch (error) {
    log(requestId, "ERROR", "Request facility failed", { error: String(error) });
    return new Response(
      JSON.stringify({ error: "Failed to process request" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});

function getFacilityNotificationEmail(firstName: string, facilityName: string): string {
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
            <td style="background-color: #1B365D; background: #1B365D; padding: 32px; border-radius: 12px 12px 0 0; text-align: center;">
              <div style="font-size: 48px; margin-bottom: 16px;">🔔</div>
              <p style="margin: 0 0 8px 0; font-size: 12px; color: #ffffff; font-family: Arial, Helvetica, sans-serif; text-transform: uppercase; letter-spacing: 1px;">REHABLOOKUP</p>
              <h1 style="margin: 0; font-size: 24px; color: #ffffff; font-family: Arial, Helvetica, sans-serif; font-weight: 600;">
                New Inquiry Received
              </h1>
              <p style="margin: 8px 0 0 0; color: #ffffff; font-family: Arial, Helvetica, sans-serif; font-size: 14px;">${facilityName}</p>
            </td>
          </tr>
          <tr>
            <td style="background: #ffffff; padding: 32px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; border-left: 1px solid #e5e7eb; border-right: 1px solid #e5e7eb;">
              <p style="margin: 0 0 24px 0; color: #374151; font-size: 15px; line-height: 1.6;">
                Great news! Someone is interested in your facility and has submitted an inquiry.
              </p>
              
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; margin-bottom: 24px;">
                <tr>
                  <td style="padding: 24px;">
                    <div style="width: 50px; height: 50px; background: #1B365D; border-radius: 50%; color: #ffffff; font-size: 18px; font-weight: 600; text-align: center; line-height: 50px; margin: 0 auto 16px;">
                      ${firstName[0]?.toUpperCase() || '?'}
                    </div>
                    <p style="margin: 0; text-align: center; font-size: 18px; font-weight: 600; color: #1e293b;">${firstName} is interested</p>
                    <p style="margin: 8px 0 0 0; text-align: center; font-size: 13px; color: #64748b;">Contact info hidden until unlocked</p>
                  </td>
                </tr>
              </table>
              
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background: #fef3c7; border: 2px solid #f59e0b; border-radius: 12px; margin-bottom: 24px;">
                <tr>
                  <td style="padding: 20px; text-align: center;">
                    <p style="margin: 0 0 16px 0; font-size: 14px; color: #78350f; line-height: 1.5;">
                      Unlock this lead in your dashboard to view full contact details.
                    </p>
                    <a href="https://rehablookup.com/provider/inquiries" style="display: inline-block; background: #1B365D; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: 600; font-size: 14px;">
                      🔓 View in Dashboard
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="background-color: #1B365D; background: #1B365D; padding: 24px 32px; border-radius: 0 0 12px 12px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="text-align: center;">
                    <p style="margin: 0 0 12px 0; color: #ffffff; font-family: Arial, Helvetica, sans-serif; font-size: 14px; font-weight: 600;">
                      RehabLookup
                    </p>
                    <p style="margin: 0; color: #94a3b8; font-family: Arial, Helvetica, sans-serif; font-size: 11px;">
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
