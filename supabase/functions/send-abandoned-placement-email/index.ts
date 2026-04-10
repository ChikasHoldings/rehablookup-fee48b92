import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { Resend } from "https://esm.sh/resend@4.0.0";

const VERSION = "2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  const timestamp = new Date().toISOString();
  console.log(`[ABANDONED-PLACEMENT] [${VERSION}] [${timestamp}] ${step}${details ? ` - ${JSON.stringify(details)}` : ""}`);
};

// Professional high-conversion email template with navy blue branding
function buildAbandonedCartEmail(data: {
  userName: string;
  userEmail: string;
  caseType: 'domestic' | 'international';
  intakeSummary: {
    levelOfCare?: string;
    primaryConcern?: string;
    location?: string;
    urgency?: string;
  };
  resumeUrl: string;
}): { subject: string; html: string } {
  const { userName, caseType, intakeSummary, resumeUrl } = data;
  const firstName = userName.split(' ')[0] || 'there';
  
  const fee = caseType === 'domestic' ? '$29' : '$299';
  
  const subject = `${firstName}, complete your placement request – expert advisors are ready to help`;
  
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Complete Your Placement Request</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f5f5f5; -webkit-font-smoothing: antialiased; font-family: Arial, Helvetica, sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; width: 100%;">
          
          <!-- HEADER - Dark Navy Blue -->
          <tr>
            <td style="background-color: #1B365D; padding: 40px 32px; border-radius: 12px 12px 0 0; text-align: center;">
              <p style="margin: 0 0 8px 0; font-size: 13px; color: #ffffff; font-family: Arial, Helvetica, sans-serif; text-transform: uppercase; letter-spacing: 2px; font-weight: 600;">REHABLOOKUP</p>
              <h1 style="margin: 0 0 12px 0; font-size: 28px; color: #ffffff; font-family: Arial, Helvetica, sans-serif; font-weight: 700; line-height: 1.2;">
                Your Placement Request<br>is Almost Complete
              </h1>
              <p style="margin: 0; color: #E8EEF4; font-family: Arial, Helvetica, sans-serif; font-size: 16px; line-height: 1.5;">
                Expert advisors are standing by to connect you<br>with the right treatment program
              </p>
            </td>
          </tr>
          
          <!-- BODY -->
          <tr>
            <td style="background-color: #ffffff; padding: 40px 32px; font-family: Arial, Helvetica, sans-serif; border-left: 1px solid #e5e7eb; border-right: 1px solid #e5e7eb;">
              
              <p style="margin: 0 0 24px 0; color: #374151; font-size: 17px; line-height: 1.6;">
                Hi ${firstName},
              </p>
              
              <p style="margin: 0 0 28px 0; color: #374151; font-size: 16px; line-height: 1.7;">
                We noticed you started a placement request but haven't completed the final step. <strong>Your information has been saved</strong>, and our team is ready to personally review your needs and connect you with verified treatment facilities.
              </p>
              
              <!-- Saved Request Summary -->
              ${intakeSummary.levelOfCare || intakeSummary.primaryConcern || intakeSummary.location ? `
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 12px; margin-bottom: 28px;">
                <tr>
                  <td style="padding: 24px;">
                    <p style="margin: 0 0 16px 0; font-size: 15px; font-weight: 700; color: #1B365D; font-family: Arial, Helvetica, sans-serif;">📋 Your Saved Request</p>
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                      ${intakeSummary.primaryConcern ? `
                      <tr>
                        <td style="padding: 6px 0; font-size: 14px; color: #64748B; font-family: Arial, Helvetica, sans-serif; width: 140px; vertical-align: top;"><strong>Primary Concern:</strong></td>
                        <td style="padding: 6px 0; font-size: 14px; color: #334155; font-family: Arial, Helvetica, sans-serif;">${intakeSummary.primaryConcern}</td>
                      </tr>` : ''}
                      ${intakeSummary.levelOfCare ? `
                      <tr>
                        <td style="padding: 6px 0; font-size: 14px; color: #64748B; font-family: Arial, Helvetica, sans-serif; width: 140px; vertical-align: top;"><strong>Level of Care:</strong></td>
                        <td style="padding: 6px 0; font-size: 14px; color: #334155; font-family: Arial, Helvetica, sans-serif;">${intakeSummary.levelOfCare}</td>
                      </tr>` : ''}
                      ${intakeSummary.location ? `
                      <tr>
                        <td style="padding: 6px 0; font-size: 14px; color: #64748B; font-family: Arial, Helvetica, sans-serif; width: 140px; vertical-align: top;"><strong>Preferred Area:</strong></td>
                        <td style="padding: 6px 0; font-size: 14px; color: #334155; font-family: Arial, Helvetica, sans-serif;">${intakeSummary.location}</td>
                      </tr>` : ''}
                      ${intakeSummary.urgency ? `
                      <tr>
                        <td style="padding: 6px 0; font-size: 14px; color: #64748B; font-family: Arial, Helvetica, sans-serif; width: 140px; vertical-align: top;"><strong>Timeline:</strong></td>
                        <td style="padding: 6px 0; font-size: 14px; color: #334155; font-family: Arial, Helvetica, sans-serif;">${intakeSummary.urgency}</td>
                      </tr>` : ''}
                    </table>
                  </td>
                </tr>
              </table>
              ` : ''}
              
              <!-- Why Complete Section -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #F0FDF4; border: 2px solid #22C55E; border-radius: 12px; margin-bottom: 28px;">
                <tr>
                  <td style="padding: 28px;">
                    <p style="margin: 0 0 20px 0; font-size: 17px; font-weight: 700; color: #166534; font-family: Arial, Helvetica, sans-serif;">What You Get With Our Placement Service</p>
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding: 0 0 14px 0;">
                          <p style="margin: 0; font-size: 15px; color: #166534; line-height: 1.6; font-family: Arial, Helvetica, sans-serif;">
                            <strong>&#10003; A Dedicated Placement Advisor</strong> - A real person who reviews your unique situation, not an algorithm. Your advisor personally evaluates your needs, preferences, and circumstances to find the best-fit programs.
                          </p>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 0 0 14px 0;">
                          <p style="margin: 0; font-size: 15px; color: #166534; line-height: 1.6; font-family: Arial, Helvetica, sans-serif;">
                            <strong>&#10003; Verified, Quality Treatment Centers</strong> - Every facility in our network has been vetted for proper licensing, accreditation, staff qualifications, and treatment outcomes. We do the research so you don't have to.
                          </p>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 0 0 14px 0;">
                          <p style="margin: 0; font-size: 15px; color: #166534; line-height: 1.6; font-family: Arial, Helvetica, sans-serif;">
                            <strong>&#10003; No Sales Pressure, Ever</strong> - We work for you, not the facilities. Unlike brokers who push high-commission programs, our advisors recommend what is genuinely right for your situation.
                          </p>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 0 0 14px 0;">
                          <p style="margin: 0; font-size: 15px; color: #166534; line-height: 1.6; font-family: Arial, Helvetica, sans-serif;">
                            <strong>&#10003; Full Concierge Coordination</strong> - Your advisor handles all the outreach to facilities, schedules calls and tours on your behalf, verifies insurance acceptance, and manages every detail of the intake process.
                          </p>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 0;">
                          <p style="margin: 0; font-size: 15px; color: #166534; line-height: 1.6; font-family: Arial, Helvetica, sans-serif;">
                            <strong>&#10003; Fast 24-48 Hour Response</strong> - Once you submit your request, our team begins reviewing and identifying the best options for you within one to two business days.
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              
              <!-- Refund Guarantee -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #EFF6FF; border: 2px solid #3B82F6; border-radius: 12px; margin-bottom: 28px;">
                <tr>
                  <td style="padding: 24px;">
                    <p style="margin: 0 0 12px 0; font-size: 17px; font-weight: 700; color: #1E40AF; font-family: Arial, Helvetica, sans-serif;">&#128274; 100% Refundable Guarantee</p>
                    <p style="margin: 0; font-size: 15px; color: #1E40AF; line-height: 1.7; font-family: Arial, Helvetica, sans-serif;">
                      Your ${fee} placement fee is <strong>fully refundable</strong> if we are unable to connect you with a suitable treatment program. There is zero risk to you. If our advisors cannot find the right match for your needs, you get your money back. It is that simple.
                    </p>
                  </td>
                </tr>
              </table>
              
              <!-- Pricing Clarity -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #FEF9C3; border: 1px solid #FACC15; border-radius: 10px; margin-bottom: 32px;">
                <tr>
                  <td style="padding: 18px 20px;">
                    <p style="margin: 0; font-size: 15px; color: #854D0E; line-height: 1.6; font-family: Arial, Helvetica, sans-serif;">
                      <strong>Transparent Pricing:</strong> Just <strong>${fee}</strong> for our full placement service. No hidden fees, no recurring charges, no surprises. This one-time fee covers your dedicated advisor, facility matching, outreach, and coordination from start to finish.
                    </p>
                  </td>
                </tr>
              </table>
              
              <!-- Urgency Message -->
              <p style="margin: 0 0 32px 0; color: #475569; font-size: 15px; line-height: 1.7; text-align: center; font-style: italic; font-family: Arial, Helvetica, sans-serif;">
                Time is often critical when seeking treatment. Complete your placement request now and let our expert advisors help guide you to the right care.
              </p>
              
              <!-- CTA Button -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <a href="${resumeUrl}" style="display: inline-block; background-color: #1B365D; color: #ffffff; padding: 18px 48px; border-radius: 10px; text-decoration: none; font-weight: 700; font-size: 17px; font-family: Arial, Helvetica, sans-serif; letter-spacing: 0.3px;">
                      Complete My Placement Request →
                    </a>
                  </td>
                </tr>
              </table>
              
              <!-- Support Note -->
              <p style="margin: 32px 0 0 0; color: #6B7280; font-size: 14px; line-height: 1.6; text-align: center; font-family: Arial, Helvetica, sans-serif;">
                Questions? Reply to this email or contact us at<br>
                <a href="mailto:placement@rehablookup.com" style="color: #1B365D; font-weight: 600;">placement@rehablookup.com</a><br>
                We're here to help you find the right path forward.
              </p>
              
            </td>
          </tr>
          
          <!-- FOOTER - Dark Navy Blue -->
          <tr>
            <td style="background-color: #1B365D; padding: 32px; border-radius: 0 0 12px 12px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="text-align: center;">
                    <p style="margin: 0 0 8px 0; color: #ffffff; font-family: Arial, Helvetica, sans-serif; font-size: 16px; font-weight: 700;">
                      RehabLookup
                    </p>
                    <p style="margin: 0 0 16px 0; color: #E8EEF4; font-family: Arial, Helvetica, sans-serif; font-size: 13px;">
                      Connecting families with quality treatment care
                    </p>
                    <p style="margin: 0; color: #94A3B8; font-family: Arial, Helvetica, sans-serif; font-size: 12px;">
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
</html>
`;

  return { subject, html };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    logStep("Function started", { version: VERSION });

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    
    if (!supabaseUrl || !supabaseServiceKey || !resendApiKey) {
      throw new Error("Missing required environment variables");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const resend = new Resend(resendApiKey);
    
    const now = new Date();
    // 2 hours for first reminder, check form_completed_at and email_verified_at
    const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    
    // Find domestic abandoned carts - TWO TIERS:
    // Tier 1: Form completed + email verified but didn't pay (2h-24h window, up to 2 reminders)
    const { data: abandonedDomestic, error: domesticError } = await supabase
      .from("concierge_inquiries")
      .select("id, user_email, user_name, primary_concern, level_of_care, preferred_state, preferred_city, timeline_urgency, created_at, payment_reminder_count, draft_id")
      .eq("payment_status", "pending")
      .not("form_completed_at", "is", null)
      .not("email_verified_at", "is", null)
      .lt("form_completed_at", twoHoursAgo.toISOString())
      .gt("created_at", twentyFourHoursAgo.toISOString())
      .lt("payment_reminder_count", 2)
      .limit(50);

    // Tier 2: Contact info saved (draft) but never verified email (4h-48h window, 1 email max)
    const fortyEightHoursAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000);
    const fourHoursAgo = new Date(now.getTime() - 4 * 60 * 60 * 1000);
    const { data: earlyDropouts, error: earlyError } = await supabase
      .from("concierge_inquiries")
      .select("id, user_email, user_name, primary_concern, level_of_care, preferred_state, preferred_city, timeline_urgency, created_at, payment_reminder_count, draft_id")
      .eq("payment_status", "pending")
      .is("email_verified_at", null)
      .is("abandoned_cart_email_sent_at", null)
      .not("user_email", "is", null)
      .not("user_phone", "is", null)
      .lt("created_at", fourHoursAgo.toISOString())
      .gt("created_at", fortyEightHoursAgo.toISOString())
      .limit(50);

    if (domesticError) {
      logStep("Error fetching domestic abandoned carts", { error: domesticError.message });
    }

    // Find international abandoned carts
    const { data: abandonedInternational, error: internationalError } = await supabase
      .from("international_placement_cases")
      .select("id, seeker_email, seeker_name, intake_data, created_at")
      .eq("status", "pending_payment")
      .is("abandoned_cart_email_sent_at", null)
      .lt("created_at", twoHoursAgo.toISOString())
      .gt("created_at", twentyFourHoursAgo.toISOString())
      .limit(50);

    if (internationalError) {
      logStep("Error fetching international abandoned carts", { error: internationalError.message });
    }

    const emailsSent: string[] = [];
    const errors: string[] = [];

    // Process domestic abandoned carts
    for (const inquiry of abandonedDomestic || []) {
      try {
        const location = [inquiry.preferred_city, inquiry.preferred_state].filter(Boolean).join(", ");
        
        // Build resume URL with draft_id if available
        const resumeParam = inquiry.draft_id ? `resume=${inquiry.draft_id}` : `id=${inquiry.id}`;
        const resumeUrl = `https://rehablookup.com/concierge/intake?${resumeParam}`;
        
        const emailData = buildAbandonedCartEmail({
          userName: inquiry.user_name,
          userEmail: inquiry.user_email,
          caseType: 'domestic',
          intakeSummary: {
            levelOfCare: inquiry.level_of_care,
            primaryConcern: inquiry.primary_concern,
            location: location || undefined,
            urgency: inquiry.timeline_urgency,
          },
          resumeUrl,
        });

        const { error: sendError } = await resend.emails.send({
          from: "RehabLookup <no-reply@rehablookup.com>",
          to: [inquiry.user_email],
          subject: emailData.subject,
          html: emailData.html,
        });

        if (sendError) {
          throw new Error(sendError.message);
        }

        // Update the inquiry to increment reminder count
        const newCount = (inquiry.payment_reminder_count || 0) + 1;
        await supabase
          .from("concierge_inquiries")
          .update({ 
            abandoned_cart_email_sent_at: now.toISOString(),
            payment_reminder_count: newCount,
          })
          .eq("id", inquiry.id);

        emailsSent.push(inquiry.user_email);
        logStep("Sent domestic abandoned cart email", { email: inquiry.user_email, inquiryId: inquiry.id, reminderCount: newCount });
        
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        errors.push(`Domestic ${inquiry.id}: ${errorMsg}`);
        logStep("Error sending domestic email", { error: errorMsg, inquiryId: inquiry.id });
      }
    }

    // Process international abandoned carts
    for (const caseData of abandonedInternational || []) {
      try {
        const intakeData = caseData.intake_data as Record<string, unknown> || {};
        
        const emailData = buildAbandonedCartEmail({
          userName: caseData.seeker_name,
          userEmail: caseData.seeker_email,
          caseType: 'international',
          intakeSummary: {
            levelOfCare: intakeData.level_of_care as string,
            primaryConcern: intakeData.primary_concern as string,
            location: intakeData.client_country as string,
            urgency: intakeData.urgency as string,
          },
          resumeUrl: `https://rehablookup.com/international/apply?resume=${caseData.id}`,
        });

        const { error: sendError } = await resend.emails.send({
          from: "RehabLookup <no-reply@rehablookup.com>",
          to: [caseData.seeker_email],
          subject: emailData.subject,
          html: emailData.html,
        });

        if (sendError) {
          throw new Error(sendError.message);
        }

        // Update the case to mark email sent
        await supabase
          .from("international_placement_cases")
          .update({ abandoned_cart_email_sent_at: now.toISOString() })
          .eq("id", caseData.id);

        emailsSent.push(caseData.seeker_email);
        logStep("Sent international abandoned cart email", { email: caseData.seeker_email, caseId: caseData.id });
        
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        errors.push(`International ${caseData.id}: ${errorMsg}`);
        logStep("Error sending international email", { error: errorMsg, caseId: caseData.id });
      }
    }

    logStep("Processing complete", { 
      emailsSent: emailsSent.length, 
      errors: errors.length,
      domesticProcessed: abandonedDomestic?.length || 0,
      internationalProcessed: abandonedInternational?.length || 0,
    });

    return new Response(
      JSON.stringify({
        success: true,
        emailsSent: emailsSent.length,
        errors: errors.length > 0 ? errors : undefined,
        _version: VERSION,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(
      JSON.stringify({ error: errorMessage, _version: VERSION }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
