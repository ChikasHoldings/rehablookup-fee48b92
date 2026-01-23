import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface IntroductionRequest {
  inquiryId: string;
  facilityId: string;
  introductionId: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("[SEND-CONCIERGE-INTRODUCTION] Function started");

    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (!resendKey) {
      throw new Error("RESEND_API_KEY not configured");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const resend = new Resend(resendKey);
    const { inquiryId, facilityId, introductionId }: IntroductionRequest = await req.json();

    console.log("[SEND-CONCIERGE-INTRODUCTION] Processing:", { inquiryId, facilityId });

    // Fetch inquiry details
    const { data: inquiry, error: inquiryError } = await supabase
      .from("concierge_inquiries")
      .select("*")
      .eq("id", inquiryId)
      .single();

    if (inquiryError || !inquiry) {
      throw new Error("Inquiry not found: " + inquiryError?.message);
    }

    // Fetch facility details
    const { data: facility, error: facilityError } = await supabase
      .from("facilities")
      .select("id, name, city, state, concierge_admissions_email, concierge_admissions_contact, email, reply_email")
      .eq("id", facilityId)
      .single();

    if (facilityError || !facility) {
      throw new Error("Facility not found: " + facilityError?.message);
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
    const responseUrl = `${supabaseUrl.replace('.supabase.co', '.lovable.app')}/provider/concierge/respond/${introductionId}`;

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
            <td style="background: linear-gradient(135deg, #1B365D 0%, #2C4A7F 100%); padding: 32px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 24px; font-weight: 700;">
                New Concierge Case Introduction
              </h1>
              <p style="margin: 12px 0 0 0; color: rgba(255,255,255,0.9); font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 15px;">
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
                    <a href="${responseUrl}" style="display: inline-block; background: linear-gradient(135deg, #1B365D 0%, #2C4A7F 100%); color: #ffffff; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 16px; font-weight: 600; text-decoration: none; padding: 14px 32px; border-radius: 8px;">
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
            <td style="background: #1B365D; padding: 24px; text-align: center;">
              <p style="margin: 0 0 8px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 18px; font-weight: 700; color: #ffffff;">
                RehabLookup Concierge
              </p>
              <p style="margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 13px; color: rgba(255,255,255,0.7);">
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
      from: "RehabLookup Concierge <concierge@rehablookup.com>",
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
        type: "concierge_introduction",
        title: "New Concierge Introduction",
        message: `A potential client (${levelOfCare}) has been matched to your facility. Review and respond in your Concierge Network.`,
        link: "/provider/concierge",
        metadata: { inquiry_id: inquiryId, introduction_id: introductionId },
      });
    }

    return new Response(JSON.stringify({ 
      success: true, 
      emailId: emailData?.id,
      sentTo: recipientEmail 
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("[SEND-CONCIERGE-INTRODUCTION] ERROR:", errorMessage);
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
};

serve(handler);
