import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const VERSION = "1.0.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const generateRequestId = () => `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

const logStep = (requestId: string, step: string, details?: Record<string, unknown>) => {
  const timestamp = new Date().toISOString();
  console.log(`[SEND-CONCIERGE-INTRO] [${VERSION}] [${requestId}] [${timestamp}] ${step}${details ? ` - ${JSON.stringify(details)}` : ""}`);
};

// UUID validation
const isValidUUID = (str: string): boolean => {
  if (!str || typeof str !== "string") return false;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
};

interface IntroductionRequest {
  inquiryId: string;
  facilityId: string;
  introductionId: string;
}

Deno.serve(async (req) => {
  const requestId = generateRequestId();
  
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    logStep(requestId, "Function started", { version: VERSION });

    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (!resendKey) {
      throw new Error("RESEND_API_KEY not configured");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !supabaseKey || !supabaseAnonKey) {
      throw new Error("Supabase configuration missing");
    }

    // Authenticate caller - must be admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const anonClient = createClient(supabaseUrl, supabaseAnonKey);
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await anonClient.auth.getUser(token);
    if (userError || !userData.user) throw new Error("Authentication failed");

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify admin role
    const { data: adminRole } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userData.user.id)
      .eq('role', 'admin')
      .maybeSingle();

    if (!adminRole) {
      throw new Error("Only administrators can send introductions");
    }

    logStep(requestId, "Admin authenticated", { adminId: userData.user.id });

    const resend = new Resend(resendKey);
    
    const body = await req.json();
    const { inquiryId, facilityId, introductionId }: IntroductionRequest = body;

    // Strict UUID validation
    if (!isValidUUID(inquiryId)) {
      throw new Error("Invalid inquiry ID format");
    }
    if (!isValidUUID(facilityId)) {
      throw new Error("Invalid facility ID format");
    }
    if (!isValidUUID(introductionId)) {
      throw new Error("Invalid introduction ID format");
    }

    logStep(requestId, "Processing", { inquiryId, facilityId, introductionId });

    // Fetch inquiry details
    const { data: inquiry, error: inquiryError } = await supabase
      .from("concierge_inquiries")
      .select("*")
      .eq("id", inquiryId)
      .single();

    if (inquiryError || !inquiry) {
      throw new Error("Inquiry not found");
    }

    // Fetch facility details
    const { data: facility, error: facilityError } = await supabase
      .from("facilities")
      .select("id, name, city, state, concierge_admissions_email, concierge_admissions_contact, email, reply_email, user_id")
      .eq("id", facilityId)
      .single();

    if (facilityError || !facility) {
      throw new Error("Facility not found");
    }

    // Determine recipient email - prioritize concierge email, then reply_email, then regular email
    const recipientEmail = facility.concierge_admissions_email || facility.reply_email || facility.email;
    
    if (!recipientEmail) {
      console.log("[SEND-CONCIERGE-INTRODUCTION] No email configured for facility:", facility.name);
      return new Response(JSON.stringify({ 
        success: false, 
        message: "No email configured for this facility" 
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const contactName = facility.concierge_admissions_contact || "Admissions Team";
    const responseUrl = `https://rehablookup.com/provider/placement-network`;

    // Format case details for email
    const levelOfCare = inquiry.level_of_care || "Not specified";
    const insuranceInfo = inquiry.insurance_carrier 
      ? `${inquiry.insurance_carrier}${inquiry.insurance_member_id ? ` (ID: ${inquiry.insurance_member_id})` : ""}`
      : inquiry.payment_type === "self_pay" ? "Self-Pay" : "Not specified";
    const location = inquiry.preferred_state 
      ? `${inquiry.preferred_city || "Any city"}, ${inquiry.preferred_state}`
      : "Flexible";
    const gender = inquiry.gender || "Not specified";
    const ageRange = inquiry.age_range || "Not specified";
    const urgency = inquiry.timeline_urgency || "Standard";
    const primaryConcern = inquiry.primary_concern || "Not specified";

    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New Concierge Introduction</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f6f9; -webkit-font-smoothing: antialiased;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f6f9;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08);">
          
          <!-- Header -->
          <tr>
            <td style="background-color: #1B365D; background: #1B365D; padding: 32px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-family: Arial, Helvetica, sans-serif; font-size: 24px; font-weight: 700;">
                New Concierge Case Introduction
              </h1>
              <p style="margin: 12px 0 0 0; color: #ffffff; font-family: Arial, Helvetica, sans-serif; font-size: 15px;">
                A potential client has been matched to your facility
              </p>
            </td>
          </tr>
          
          <!-- Body -->
          <tr>
            <td style="padding: 32px;">
              <p style="margin: 0 0 20px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 16px; color: #1a1a1a;">
                Hi ${contactName},
              </p>
              
              <p style="margin: 0 0 24px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 15px; color: #4b5563; line-height: 1.6;">
                RehabLookup's Concierge Service has identified <strong>${facility.name}</strong> as a potential match for a family seeking treatment. Please review the case details below.
              </p>
              
              <!-- Case Details Box -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background: #f8fafc; border-radius: 12px; margin-bottom: 24px;">
                <tr>
                  <td style="padding: 24px;">
                    <h3 style="margin: 0 0 16px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 16px; font-weight: 600; color: #1B365D;">
                      Case Summary
                    </h3>
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding: 8px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 14px; color: #6b7280; width: 140px; vertical-align: top;">Level of Care:</td>
                        <td style="padding: 8px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 14px; color: #1a1a1a; font-weight: 500;">${levelOfCare}</td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 14px; color: #6b7280; vertical-align: top;">Primary Concern:</td>
                        <td style="padding: 8px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 14px; color: #1a1a1a; font-weight: 500;">${primaryConcern}</td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 14px; color: #6b7280; vertical-align: top;">Insurance/Payment:</td>
                        <td style="padding: 8px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 14px; color: #1a1a1a; font-weight: 500;">${insuranceInfo}</td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 14px; color: #6b7280; vertical-align: top;">Preferred Location:</td>
                        <td style="padding: 8px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 14px; color: #1a1a1a; font-weight: 500;">${location}</td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 14px; color: #6b7280; vertical-align: top;">Gender:</td>
                        <td style="padding: 8px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 14px; color: #1a1a1a; font-weight: 500;">${gender}</td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 14px; color: #6b7280; vertical-align: top;">Age Range:</td>
                        <td style="padding: 8px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 14px; color: #1a1a1a; font-weight: 500;">${ageRange}</td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 14px; color: #6b7280; vertical-align: top;">Timeline:</td>
                        <td style="padding: 8px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 14px; color: #1a1a1a; font-weight: 500;">${urgency}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              
              <!-- CTA Button -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 24px;">
                <tr>
                  <td align="center">
                    <a href="${responseUrl}" style="display: inline-block; background-color: #1B365D; background: #1B365D; color: #ffffff; font-family: Arial, Helvetica, sans-serif; font-size: 16px; font-weight: 600; text-decoration: none; padding: 14px 32px; border-radius: 8px;">
                      Respond to This Introduction
                    </a>
                  </td>
                </tr>
              </table>
              
              <p style="margin: 0 0 16px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 14px; color: #6b7280; line-height: 1.6;">
                You can also respond by replying directly to this email with your availability and interest level.
              </p>
              
              <!-- Note Box -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background: #fef3c7; border-radius: 8px; margin-bottom: 24px;">
                <tr>
                  <td style="padding: 16px;">
                    <p style="margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 13px; color: #92400e;">
                      <strong>Note:</strong> Full contact details will be provided once you indicate interest and the client confirms they'd like to connect with your facility.
                    </p>
                  </td>
                </tr>
              </table>
              
              <p style="margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 14px; color: #6b7280;">
                Questions? Contact our Concierge team at <a href="mailto:concierge@rehablookup.com" style="color: #1B365D;">concierge@rehablookup.com</a>
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #1B365D; background: #1B365D; padding: 24px; text-align: center;">
              <p style="margin: 0 0 8px 0; font-family: Arial, Helvetica, sans-serif; font-size: 18px; font-weight: 700; color: #ffffff;">
                RehabLookup Concierge
              </p>
              <p style="margin: 0; font-family: Arial, Helvetica, sans-serif; font-size: 13px; color: #cbd5e1;">
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

    const { error: emailError, data: emailData } = await resend.emails.send({
      from: "RehabLookup Concierge <no-reply@rehablookup.com>",
      to: [recipientEmail],
      subject: `New Concierge Case Introduction - ${levelOfCare}`,
      html: emailHtml,
      reply_to: "concierge@rehablookup.com",
    });

    if (emailError) {
      console.error("[SEND-CONCIERGE-INTRODUCTION] Email error:", emailError);
      throw emailError;
    }

    console.log("[SEND-CONCIERGE-INTRODUCTION] Email sent successfully to:", recipientEmail);

    // Log case event for introduction sent
    await supabase.from("concierge_case_events").insert({
      inquiry_id: inquiryId,
      event_type: "introduction_sent",
      event_data: { facility_id: facilityId, facility_name: facility.name },
      actor_type: "admin",
    });

    // Create provider notification
    const { data: facilityFull } = await supabase
      .from("facilities")
      .select("user_id")
      .eq("id", facilityId)
      .single();

    if (facilityFull?.user_id) {
      await supabase.from("provider_notifications").insert({
        user_id: facilityFull.user_id,
        type: "placement_introduction",
        title: "New Placement Introduction",
        message: `A potential client (${levelOfCare}) has been matched to your facility. Review and respond in your Placement Network.`,
        link: "/provider/placement-network",
        metadata: { inquiry_id: inquiryId, introduction_id: introductionId },
      });
    }

    logStep(requestId, "Email sent successfully", { sentTo: recipientEmail, emailId: emailData?.id });

    return new Response(JSON.stringify({ 
      success: true, 
      emailId: emailData?.id,
      sentTo: recipientEmail,
      requestId,
      _version: VERSION,
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep(requestId, "ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage, requestId, _version: VERSION }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
