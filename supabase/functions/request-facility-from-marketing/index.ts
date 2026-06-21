import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2?target=denonext";
import { Resend } from "https://esm.sh/resend@2.0.0?target=denonext";
import { sendEmailWithRetry } from "../_shared/resilient-email-sender.ts";
import { checkRateLimit, logRateLimitAttempt, getRequestIdentifier, rateLimitResponse } from "../_shared/rate-limit.ts";

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

    // Rate limit this unauthenticated endpoint (sends a facility notification
    // email per call) by source IP to prevent spam / Resend cost.
    const rlId = getRequestIdentifier(req);
    const rl = await checkRateLimit(supabase, {
      identifier: rlId, actionType: "request_facility_from_marketing", maxAttempts: 10, windowMinutes: 60,
    });
    if (!rl.allowed) return rateLimitResponse(corsHeaders);
    await logRateLimitAttempt(supabase, rlId, "request_facility_from_marketing", true);

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
      .select(
        "id, first_name, last_name, email, phone, urgency, level_of_care, " +
        "facilities_requested, dual_diagnosis, insurance_type, " +
        "location_city_state, location_zip, message, primary_substance",
      )
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
      .select("id, name, user_id, email, reply_email, status, suspended")
      .eq("id", body.facilityId)
      .single();

    if (facilityError || !facility) {
      log(requestId, "ERROR", "Facility not found", { facilityId: body.facilityId });
      return new Response(
        JSON.stringify({ error: "Facility not found" }),
        { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Routing gates — mirror submit-qualified-lead so a marketing "Connect"
    // cannot route a raw lead + seeker PII to a facility that isn't an active,
    // approved, paying provider. Without these (this runs on the service-role
    // client, which bypasses the leads INSERT RLS), a suspended/unapproved or
    // free/canceled facility would silently receive full contact details.
    if (facility.status !== "approved" || facility.suspended === true) {
      log(requestId, "WARN", "Facility not accepting inquiries", { facilityId: body.facilityId, status: facility.status, suspended: facility.suspended });
      return new Response(
        JSON.stringify({ error: "This facility isn't accepting inquiries right now.", code: "facility_not_accepting" }),
        { status: 409, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const { data: isPro, error: proError } = await supabase.rpc("has_active_pro", { p_facility_id: body.facilityId });
    if (proError) {
      // Fail closed: if we cannot confirm Pro status, do not create a raw lead.
      log(requestId, "ERROR", "has_active_pro check failed", { facilityId: body.facilityId, error: proError.message });
      return new Response(
        JSON.stringify({ error: "Couldn't connect you to this facility right now. Please try again.", code: "eligibility_check_failed" }),
        { status: 503, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }
    if (!isPro) {
      log(requestId, "WARN", "Facility is not an active Pro provider", { facilityId: body.facilityId });
      return new Response(
        JSON.stringify({ error: "This facility isn't available for a direct connection right now.", code: "facility_not_eligible" }),
        { status: 409, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Create a lead in the main leads table (normal flow)
    const fullName = `${marketingLead.first_name} ${marketingLead.last_name}`.trim();
    
    // Deterministic idempotency key (one lead per marketing-lead × facility).
    // Backed by the partial UNIQUE index on leads.idempotency_key, so a retry
    // or concurrent double-fire collapses to the same row instead of creating
    // duplicate leads (the facilities_requested array check above is updated
    // non-atomically and can't be relied on for this).
    const idempotencyKey = `mktg-${body.marketingLeadId}-${body.facilityId}`;

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
        idempotency_key: idempotencyKey,
      })
      .select()
      .single();

    if (leadError) {
      // 23505 = duplicate idempotency_key: this marketing lead already routed to
      // this facility (retry / double-click). Report honest success, not an error.
      if ((leadError as { code?: string }).code === "23505") {
        log(requestId, "INFO", "Duplicate suppressed (already routed)", { idempotencyKey });
        return new Response(
          JSON.stringify({ success: true, alreadyRequested: true, message: "Your request has already been sent to this facility." }),
          { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }
      log(requestId, "ERROR", "Failed to create lead", { error: leadError.message });
      throw new Error("Failed to create lead");
    }

    log(requestId, "INFO", "Lead created from marketing", { leadId: newLead.id, facilityId: body.facilityId });

    // In-app provider notification so the owner gets a dashboard bell alert,
    // not just an email (mirrors submit-qualified-lead's direct insert). Without
    // this, a lead created from the marketing landing surfaced silently in the
    // provider's inquiries queue. Best-effort — the lead is already committed.
    if (facility.user_id) {
      try {
        await supabase.from("provider_notifications").insert({
          user_id: facility.user_id,
          facility_id: body.facilityId,
          type: "new_lead",
          title: "New inquiry",
          message: `${marketingLead.first_name} requested information about ${facility.name}.`,
          metadata: { link: "/provider/inquiries", lead_id: newLead.id, source: "marketing_landing" },
        });
      } catch (notifErr) {
        log(requestId, "WARN", "Failed to insert provider notification", { error: String(notifErr) });
      }
    }

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
        }, { emailType: "marketing_lead_facility_notification", idempotencyKey: `mktg-lead-${newLead.id}` });
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
                    <p style="margin: 8px 0 0 0; text-align: center; font-size: 13px; color: #64748b;">Full contact details are in your dashboard</p>
                  </td>
                </tr>
              </table>
              
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background: #f0fdf4; border: 2px solid #16a34a; border-radius: 12px; margin-bottom: 24px;">
                <tr>
                  <td style="padding: 20px; text-align: center;">
                    <p style="margin: 0 0 16px 0; font-size: 14px; color: #166534; line-height: 1.5;">
                      Open your dashboard to view the full contact details and respond.
                    </p>
                    <a href="https://rehablookup.com/provider/inquiries" style="display: inline-block; background: #1B365D; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: 600; font-size: 14px;">
                      View in Dashboard
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
