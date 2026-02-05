import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { Resend } from "https://esm.sh/resend@4.0.0";

const VERSION = "1.0.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  const timestamp = new Date().toISOString();
  console.log(`[ABANDONED-PLACEMENT] [${VERSION}] [${timestamp}] ${step}${details ? ` - ${JSON.stringify(details)}` : ""}`);
};

// High-conversion email template
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
  const facilityFee = caseType === 'domestic' ? '$1,000' : '$4,500';
  
  const subject = `${firstName}, your placement request is almost ready – complete it now`;
  
  const html = `
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
            <td style="background-color: #1B365D; background: #1B365D; padding: 32px; border-radius: 12px 12px 0 0; text-align: center;">
              <p style="margin: 0 0 8px 0; font-size: 12px; color: #ffffff; font-family: Arial, Helvetica, sans-serif; text-transform: uppercase; letter-spacing: 1px;">REHABLOOKUP</p>
              <h1 style="margin: 0; font-size: 26px; color: #ffffff; font-family: Arial, Helvetica, sans-serif; font-weight: 600;">
                You're One Step Away
              </h1>
              <p style="margin: 12px 0 0 0; color: #ffffff; font-family: Arial, Helvetica, sans-serif; font-size: 15px;">
                Your personalized placement matches are waiting
              </p>
            </td>
          </tr>
          
          <!-- Body -->
          <tr>
            <td style="background: #ffffff; padding: 32px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; border-left: 1px solid #e5e7eb; border-right: 1px solid #e5e7eb;">
              
              <p style="margin: 0 0 20px 0; color: #374151; font-size: 16px; line-height: 1.6;">
                Hi ${firstName},
              </p>
              
              <p style="margin: 0 0 24px 0; color: #374151; font-size: 15px; line-height: 1.6;">
                We noticed you started a placement request but didn't complete the final step. <strong>Your information has been saved</strong>, and we're ready to start matching you with the right treatment facilities.
              </p>
              
              <!-- What We Saved Box -->
              ${intakeSummary.levelOfCare || intakeSummary.primaryConcern || intakeSummary.location ? `
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 12px; margin-bottom: 24px;">
                <tr>
                  <td style="padding: 20px;">
                    <p style="margin: 0 0 12px 0; font-size: 14px; font-weight: 600; color: #1B365D;">📋 Your Request Summary</p>
                    ${intakeSummary.primaryConcern ? `<p style="margin: 0 0 8px 0; font-size: 14px; color: #6b7280;"><strong>Primary Concern:</strong> ${intakeSummary.primaryConcern}</p>` : ''}
                    ${intakeSummary.levelOfCare ? `<p style="margin: 0 0 8px 0; font-size: 14px; color: #6b7280;"><strong>Level of Care:</strong> ${intakeSummary.levelOfCare}</p>` : ''}
                    ${intakeSummary.location ? `<p style="margin: 0 0 8px 0; font-size: 14px; color: #6b7280;"><strong>Location:</strong> ${intakeSummary.location}</p>` : ''}
                    ${intakeSummary.urgency ? `<p style="margin: 0; font-size: 14px; color: #6b7280;"><strong>Timeline:</strong> ${intakeSummary.urgency}</p>` : ''}
                  </td>
                </tr>
              </table>
              ` : ''}
              
              <!-- Why Complete Now Box -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #ecfdf5; background: #ecfdf5; border: 2px solid #10b981; border-radius: 12px; margin-bottom: 24px;">
                <tr>
                  <td style="padding: 24px;">
                    <p style="margin: 0 0 16px 0; font-size: 16px; font-weight: 700; color: #065f46;">✨ Why Complete Your Placement?</p>
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding: 0 0 12px 0;">
                          <p style="margin: 0; font-size: 14px; color: #047857; line-height: 1.5;">
                            <strong>✓ Expert Matching</strong> – Our advisors personally review your needs and match you with facilities that specialize in your situation
                          </p>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 0 0 12px 0;">
                          <p style="margin: 0; font-size: 14px; color: #047857; line-height: 1.5;">
                            <strong>✓ Verified Facilities Only</strong> – Every facility in our network is vetted for quality, licensing, and patient outcomes
                          </p>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 0 0 12px 0;">
                          <p style="margin: 0; font-size: 14px; color: #047857; line-height: 1.5;">
                            <strong>✓ No Sales Pressure</strong> – We're not a treatment center. We work for you, not the facilities
                          </p>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 0;">
                          <p style="margin: 0; font-size: 14px; color: #047857; line-height: 1.5;">
                            <strong>✓ Concierge Support</strong> – Our team handles the coordination so you can focus on what matters
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              
              <!-- Pricing Clarity -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background: #fef3c7; border: 1px solid #fcd34d; border-radius: 8px; margin-bottom: 24px;">
                <tr>
                  <td style="padding: 16px;">
                    <p style="margin: 0; font-size: 14px; color: #92400e; line-height: 1.5;">
                      <strong>💰 Simple Pricing:</strong> Your placement service fee is just <strong>${fee}</strong>. No hidden costs. Facilities pay us when they accept you – not the other way around.
                    </p>
                  </td>
                </tr>
              </table>
              
              <!-- Urgency Message -->
              <p style="margin: 0 0 28px 0; color: #374151; font-size: 15px; line-height: 1.6; text-align: center;">
                <em>Time is often critical when seeking treatment. Complete your placement request now and let us help you find the right care.</em>
              </p>
              
              <!-- CTA Button -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <a href="${resumeUrl}" style="display: inline-block; background-color: #1B365D; background: #1B365D; color: #ffffff; padding: 16px 40px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px;">
                      Complete My Placement Request →
                    </a>
                  </td>
                </tr>
              </table>
              
              <!-- Support Note -->
              <p style="margin: 28px 0 0 0; color: #6b7280; font-size: 13px; line-height: 1.6; text-align: center;">
                Questions? Reply to this email or call us at <strong>(888) 555-HELP</strong><br>
                We're here to help you find the right path forward.
              </p>
              
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #1B365D; background: #1B365D; padding: 24px 32px; border-radius: 0 0 12px 12px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="text-align: center;">
                    <p style="margin: 0 0 12px 0; color: #ffffff; font-family: Arial, Helvetica, sans-serif; font-size: 14px; font-weight: 600;">
                      RehabLookup
                    </p>
                    <p style="margin: 0 0 16px 0; color: #93c5fd; font-family: Arial, Helvetica, sans-serif; font-size: 12px;">
                      Connecting families with quality care
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
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    
    // Find domestic abandoned carts (payment_status = 'pending', created 1-24 hours ago, no email sent)
    const { data: abandonedDomestic, error: domesticError } = await supabase
      .from("concierge_inquiries")
      .select("id, user_email, user_name, primary_concern, level_of_care, preferred_state, preferred_city, timeline_urgency, created_at")
      .eq("payment_status", "pending")
      .is("abandoned_cart_email_sent_at", null)
      .lt("created_at", oneHourAgo.toISOString())
      .gt("created_at", twentyFourHoursAgo.toISOString())
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
      .lt("created_at", oneHourAgo.toISOString())
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
          resumeUrl: `https://rehablookup.com/placement?resume=${inquiry.id}`,
        });

        const { error: sendError } = await resend.emails.send({
          from: "RehabLookup Placement <placement@rehablookup.com>",
          to: [inquiry.user_email],
          subject: emailData.subject,
          html: emailData.html,
        });

        if (sendError) {
          throw new Error(sendError.message);
        }

        // Update the inquiry to mark email sent
        await supabase
          .from("concierge_inquiries")
          .update({ abandoned_cart_email_sent_at: now.toISOString() })
          .eq("id", inquiry.id);

        // Log in tracking table
        await supabase.from("placement_abandoned_cart_emails").insert({
          inquiry_id: inquiry.id,
          email: inquiry.user_email,
          email_type: "abandoned_cart",
          metadata: { case_type: 'domestic' },
        });

        emailsSent.push(inquiry.user_email);
        logStep("Sent domestic abandoned cart email", { email: inquiry.user_email, inquiryId: inquiry.id });
        
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
          resumeUrl: `https://rehablookup.com/international-placement?resume=${caseData.id}`,
        });

        const { error: sendError } = await resend.emails.send({
          from: "RehabLookup Placement <placement@rehablookup.com>",
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

        // Log in tracking table
        await supabase.from("placement_abandoned_cart_emails").insert({
          international_case_id: caseData.id,
          email: caseData.seeker_email,
          email_type: "abandoned_cart",
          metadata: { case_type: 'international' },
        });

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
