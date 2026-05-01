import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2?target=denonext";
import { Resend } from "https://esm.sh/resend@2.0.0?target=denonext";
import { sendEmailWithRetry } from "../_shared/resilient-email-sender.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: unknown) => {
  console.log(`[SEND-SEEKER-EMAILS] ${step}`, details ? JSON.stringify(details) : "");
};

type EmailType = 
  | "welcome"
  | "welcome_followup"
  | "request_confirmation"
  | "request_followup"
  | "facility_contacted_you"
  | "tips_finding_treatment"
  | "weekly_digest"
  | "account_reminder"
  | "placement_intro";

interface SeekerEmailRequest {
  type: EmailType;
  seekerId: string;
  email?: string;
  metadata?: Record<string, unknown>;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      logStep("Error: RESEND_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "Email service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const resend = new Resend(resendApiKey);
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { type, seekerId, email, metadata }: SeekerEmailRequest = await req.json();
    logStep("Received request", { type, seekerId, hasEmail: !!email });

    // Get seeker email if not provided
    let seekerEmail = email;
    let seekerProfile: any = null;
    let notificationPrefs: any = null;

    if (!seekerEmail && seekerId) {
      const { data: authUser } = await supabase.auth.admin.getUserById(seekerId);
      seekerEmail = authUser?.user?.email;
    }

    if (seekerId) {
      // Fetch profile and notification preferences in parallel
      const [profileResult, prefsResult] = await Promise.all([
        supabase
          .from("seeker_profiles")
          .select("*")
          .eq("user_id", seekerId)
          .single(),
        supabase
          .from("notification_preferences")
          .select("*")
          .eq("user_id", seekerId)
          .maybeSingle()
      ]);
      seekerProfile = profileResult.data;
      notificationPrefs = prefsResult.data;
    }

    if (!seekerEmail) {
      logStep("Error: No email found for seeker");
      return new Response(
        JSON.stringify({ error: "Seeker email not found" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check notification preferences - map email types to preference keys
    const emailTypePreferenceMap: Record<string, keyof typeof defaultPrefs> = {
      "welcome": "email_lead_alerts", // Always send welcome
      "welcome_followup": "email_product_updates",
      "request_confirmation": "email_lead_alerts",
      "request_followup": "followup_reminders_enabled",
      "facility_contacted_you": "email_lead_alerts",
      "tips_finding_treatment": "email_product_updates",
      "weekly_digest": "email_weekly_digest",
      "account_reminder": "email_product_updates",
      "placement_intro": "email_product_updates",
    };

    const defaultPrefs = {
      email_lead_alerts: true,
      email_weekly_digest: true,
      email_product_updates: false,
      browser_notifications: true,
      followup_reminders_enabled: true,
    };

    const prefs = { ...defaultPrefs, ...notificationPrefs };
    const prefKey = emailTypePreferenceMap[type];
    
    // Skip email if preference is disabled (except for critical welcome email)
    if (type !== "welcome" && prefKey && !prefs[prefKey]) {
      logStep("Email skipped due to user preferences", { type, prefKey, enabled: prefs[prefKey] });
      return new Response(
        JSON.stringify({ success: true, skipped: true, reason: "User preference disabled" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const displayName = seekerProfile?.display_name || seekerProfile?.first_name || "there";
    logStep("Seeker info", { email: seekerEmail, displayName, prefsEnabled: prefs[prefKey] ?? true });

    let subject = "";
    let html = "";

    switch (type) {
      case "welcome":
        subject = "Welcome to RehabLookup – We're Here to Help 💙";
        html = generateWelcomeEmail(displayName);
        break;

      case "welcome_followup":
        subject = "Quick Tips to Find the Right Treatment Center";
        html = generateWelcomeFollowupEmail(displayName);
        break;

      case "request_confirmation":
        const facilityName = metadata?.facilityName as string || "the treatment center";
        subject = `Your Request to ${facilityName} Was Sent`;
        html = generateRequestConfirmationEmail(displayName, facilityName, metadata);
        break;

      case "request_followup":
        subject = "Have You Heard Back? Here's What to Do Next";
        html = generateRequestFollowupEmail(displayName, metadata);
        break;

      case "facility_contacted_you":
        const contactFacility = metadata?.facilityName as string || "A treatment center";
        subject = `${contactFacility} Responded to Your Request`;
        html = generateFacilityContactedEmail(displayName, contactFacility, metadata);
        break;

      case "tips_finding_treatment":
        subject = "5 Things to Ask When Choosing a Treatment Center";
        html = generateTipsEmail(displayName);
        break;

      case "weekly_digest":
        subject = "Your Weekly Treatment Search Update";
        html = generateWeeklyDigestEmail(displayName, metadata);
        break;

      case "account_reminder":
        subject = "We Miss You – Continue Your Treatment Search";
        html = generateAccountReminderEmail(displayName);
        break;

      case "placement_intro":
        subject = "Need Help Finding the Right Treatment Center? We Can Place You";
        html = generatePlacementIntroEmail(displayName);
        break;

      default:
        logStep("Unknown email type", { type });
        return new Response(
          JSON.stringify({ error: "Unknown email type" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }

    const idempotencyKey = seekerId
      ? `seeker-${type}-${seekerId}`
      : `seeker-${type}-${seekerEmail}`;

    const { emailId: emailResult, error: emailError } = await sendEmailWithRetry(supabase, resend, {
      from: "RehabLookup <no-reply@rehablookup.com>",
      to: [seekerEmail],
      subject,
      html,
      headers: {
        "List-Unsubscribe": `<mailto:no-reply@rehablookup.com?subject=unsubscribe>`,
        "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
      },
    }, {
      emailType: `seeker_${type}`,
      idempotencyKey,
    });

    if (emailError) {
      logStep("Error sending email", emailError);
      return new Response(
        JSON.stringify({ error: "Failed to send email", details: emailError }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create in-app notification for certain email types (respect browser_notifications preference)
    const shouldCreateInAppNotification = prefs.browser_notifications !== false;
    if (seekerId && shouldCreateInAppNotification && ["facility_contacted_you", "request_confirmation", "welcome", "placement_intro"].includes(type)) {
      let notificationTitle = subject;
      let notificationMessage = "";
      let notificationLink: string | null = null;
      
      switch (type) {
        case "welcome":
          notificationTitle = "Welcome to RehabLookup! 💙";
          notificationMessage = "We're here to help you find the right treatment center. Start by browsing facilities or saving your favorites.";
          notificationLink = "/account";
          break;
        case "facility_contacted_you":
          notificationTitle = `${metadata?.facilityName || "A facility"} responded`;
          notificationMessage = `${metadata?.facilityName || "A facility"} has responded to your request. Check your phone and email for their message.`;
          notificationLink = "/account/requests";
          break;
        case "request_confirmation":
          notificationTitle = "Request Sent Successfully";
          notificationMessage = `Your request to ${metadata?.facilityName || "the facility"} has been sent. They typically respond within 24-48 hours.`;
          notificationLink = "/account/requests";
          break;
        case "placement_intro":
          notificationTitle = "Get Placed in a Treatment Center 🏥";
          notificationMessage = "Our Treatment Placement service can help you find and get admitted to the right facility. An advisor will personally coordinate your placement.";
          notificationLink = "/concierge";
          break;
      }

      await supabase.from("seeker_notifications").insert({
        user_id: seekerId,
        type: type,
        title: notificationTitle,
        message: notificationMessage,
        link: notificationLink,
        metadata: metadata || {},
      });
      logStep("In-app notification created", { type, seekerId });
    }

    logStep("Email sent successfully", { type, to: seekerEmail, resendId: emailResult });

    return new Response(
      JSON.stringify({ success: true, messageId: emailResult }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    logStep("Error in send-seeker-emails", { error: error.message });
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// Email Template Functions

function generateWelcomeEmail(name: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #f4f6f9; -webkit-font-smoothing: antialiased;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f6f9;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08);">
          
          <!-- Header -->
          <tr>
            <td style="background-color: #1B365D; background: #1B365D; padding: 40px 32px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-family: Arial, Helvetica, sans-serif; font-size: 28px; font-weight: 700;">
                Welcome to RehabLookup
              </h1>
              <p style="margin: 12px 0 0 0; color: #ffffff; font-family: Arial, Helvetica, sans-serif; font-size: 16px;">
                Your journey to recovery starts here
              </p>
            </td>
          </tr>
          
          <!-- Body -->
          <tr>
            <td style="padding: 40px 32px;">
              <p style="margin: 0 0 20px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 18px; color: #1B365D; font-weight: 600;">
                Hi ${name},
              </p>
              
              <p style="margin: 0 0 20px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 16px; color: #475569; line-height: 1.6;">
                Thank you for joining RehabLookup. We understand that seeking treatment for yourself or a loved one can be overwhelming, and we're here to make this process easier.
              </p>
              
              <div style="background: #f0f9ff; border-left: 4px solid #1B365D; padding: 20px; border-radius: 8px; margin: 24px 0;">
                <p style="margin: 0 0 12px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 16px; color: #1B365D; font-weight: 600;">
                  Here's what you can do:
                </p>
                <ul style="margin: 0; padding-left: 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 15px; color: #475569; line-height: 1.8;">
                  <li>Browse verified treatment centers near you</li>
                  <li>Send requests directly to facilities</li>
                  <li>Compare programs, amenities, and specialties</li>
                  <li>Read reviews from real patients</li>
                  <li>Save your favorites for easy access</li>
                </ul>
              </div>
              
              <!-- Placement Service Introduction -->
              <div style="background: #f0fdf4; border: 1px solid #bbf7d0; padding: 20px; border-radius: 12px; margin: 24px 0;">
                <p style="margin: 0 0 8px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 16px; color: #166534; font-weight: 600;">
                  🏥 Need Help Getting Placed?
                </p>
                <p style="margin: 0 0 12px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 14px; color: #475569; line-height: 1.6;">
                  If searching on your own feels overwhelming, our Treatment Placement service can help. A dedicated advisor will personally match you with the right facility based on your needs, insurance, and preferences — and coordinate your admission.
                </p>
                <table role="presentation" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="background-color: #166534; border-radius: 6px;">
                      <a href="https://rehablookup.com/concierge" style="display: inline-block; padding: 10px 24px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 14px; font-weight: 600; color: #ffffff; text-decoration: none;">
                        Learn About Treatment Placement →
                      </a>
                    </td>
                  </tr>
                </table>
              </div>
              
              <p style="margin: 24px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 16px; color: #475569; line-height: 1.6;">
                <strong>Remember:</strong> Taking the first step is the hardest part, and you've already done that. We're proud of you.
              </p>
              
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin: 32px auto;">
                <tr>
                  <td style="background-color: #1B365D; background: #1B365D; border-radius: 8px;">
                    <a href="https://rehablookup.com/account" style="display: inline-block; padding: 16px 32px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 16px; font-weight: 600; color: #ffffff; text-decoration: none;">
                      Start Your Search
                    </a>
                  </td>
                </tr>
              </table>
              
              <p style="margin: 24px 0 0 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 15px; color: #64748b; line-height: 1.6;">
                If you have any questions, just reply to this email. We're here to help.
              </p>
              
              <p style="margin: 20px 0 0 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 15px; color: #475569;">
                With hope,<br>
                <strong>The RehabLookup Team</strong>
              </p>
            </td>
          </tr>
          
          ${generateEmailFooter()}
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function generateWelcomeFollowupEmail(name: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #f4f6f9; -webkit-font-smoothing: antialiased;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f6f9;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08);">
          
          <!-- Header -->
          <tr>
            <td style="background-color: #1B365D; background: #1B365D; padding: 36px 32px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-family: Arial, Helvetica, sans-serif; font-size: 24px; font-weight: 700;">
                Tips for Your Treatment Search
              </h1>
            </td>
          </tr>
          
          <!-- Body -->
          <tr>
            <td style="padding: 40px 32px;">
              <p style="margin: 0 0 20px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 18px; color: #1B365D; font-weight: 600;">
                Hi ${name},
              </p>
              
              <p style="margin: 0 0 20px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 16px; color: #475569; line-height: 1.6;">
                Finding the right treatment center is one of the most important decisions you'll make. Here are some tips to help you make an informed choice:
              </p>
              
              <!-- Tip 1 -->
              <div style="background: #f8fafc; padding: 20px; border-radius: 12px; margin: 16px 0;">
                <p style="margin: 0 0 8px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 16px; color: #1B365D; font-weight: 600;">
                  1. Check Their Credentials
                </p>
                <p style="margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 14px; color: #64748b; line-height: 1.5;">
                  Look for accreditation from JCAHO, CARF, or state licensing. This ensures quality care standards.
                </p>
              </div>
              
              <!-- Tip 2 -->
              <div style="background: #f8fafc; padding: 20px; border-radius: 12px; margin: 16px 0;">
                <p style="margin: 0 0 8px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 16px; color: #1B365D; font-weight: 600;">
                  2. Ask About Their Approach
                </p>
                <p style="margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 14px; color: #64748b; line-height: 1.5;">
                  Different centers use different methods. Ask about evidence-based treatments like CBT, DBT, or MAT.
                </p>
              </div>
              
              <!-- Tip 3 -->
              <div style="background: #f8fafc; padding: 20px; border-radius: 12px; margin: 16px 0;">
                <p style="margin: 0 0 8px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 16px; color: #1B365D; font-weight: 600;">
                  3. Understand the Costs
                </p>
                <p style="margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 14px; color: #64748b; line-height: 1.5;">
                  Ask about insurance acceptance, payment plans, and what's included in the program cost.
                </p>
              </div>
              
              <!-- Tip 4 -->
              <div style="background: #f8fafc; padding: 20px; border-radius: 12px; margin: 16px 0;">
                <p style="margin: 0 0 8px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 16px; color: #1B365D; font-weight: 600;">
                  4. Consider Aftercare
                </p>
                <p style="margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 14px; color: #64748b; line-height: 1.5;">
                  Recovery doesn't end at discharge. Look for centers with strong aftercare and alumni programs.
                </p>
              </div>
              
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin: 32px auto;">
                <tr>
                  <td style="background-color: #1B365D; background: #1B365D; border-radius: 8px;">
                    <a href="https://rehablookup.com/account" style="display: inline-block; padding: 16px 32px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 16px; font-weight: 600; color: #ffffff; text-decoration: none;">
                      Browse Treatment Centers
                    </a>
                  </td>
                </tr>
              </table>
              
              <p style="margin: 20px 0 0 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 15px; color: #475569;">
                You've got this,<br>
                <strong>The RehabLookup Team</strong>
              </p>
            </td>
          </tr>
          
          ${generateEmailFooter()}
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function generateRequestConfirmationEmail(name: string, facilityName: string, metadata?: Record<string, unknown>): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #f4f6f9; -webkit-font-smoothing: antialiased;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f6f9;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08);">
          
          <!-- Header -->
          <tr>
            <td style="background-color: #059669; background: #059669; padding: 36px 32px; text-align: center;">
              <div style="width: 64px; height: 64px; background: rgba(255,255,255,0.2); border-radius: 50%; margin: 0 auto 16px; display: flex; align-items: center; justify-content: center;">
                <span style="font-size: 32px;">✓</span>
              </div>
              <h1 style="margin: 0; color: #ffffff; font-family: Arial, Helvetica, sans-serif; font-size: 24px; font-weight: 700;">
                Your Request Was Sent!
              </h1>
            </td>
          </tr>
          
          <!-- Body -->
          <tr>
            <td style="padding: 40px 32px;">
              <p style="margin: 0 0 20px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 18px; color: #1B365D; font-weight: 600;">
                Hi ${name},
              </p>
              
              <p style="margin: 0 0 20px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 16px; color: #475569; line-height: 1.6;">
                Great news! Your request to <strong>${facilityName}</strong> has been sent successfully. The facility will review your information and reach out to you soon.
              </p>
              
              <div style="background: #f0fdf4; border: 1px solid #bbf7d0; padding: 20px; border-radius: 12px; margin: 24px 0;">
                <p style="margin: 0 0 12px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 15px; color: #166534; font-weight: 600;">
                  What happens next?
                </p>
                <ul style="margin: 0; padding-left: 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 14px; color: #166534; line-height: 1.8;">
                  <li>The facility typically responds within 24-48 hours</li>
                  <li>They may call, email, or text you</li>
                  <li>Prepare any questions you have about their program</li>
                </ul>
              </div>
              
              <p style="margin: 24px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 16px; color: #475569; line-height: 1.6;">
                <strong>Tip:</strong> Don't put all your eggs in one basket. Consider reaching out to 2-3 facilities to compare options.
              </p>
              
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin: 32px auto;">
                <tr>
                  <td style="background-color: #1B365D; background: #1B365D; border-radius: 8px;">
                    <a href="https://rehablookup.com/account/requests" style="display: inline-block; padding: 16px 32px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 16px; font-weight: 600; color: #ffffff; text-decoration: none;">
                      View Your Requests
                    </a>
                  </td>
                </tr>
              </table>
              
              <p style="margin: 20px 0 0 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 15px; color: #475569;">
                Rooting for you,<br>
                <strong>The RehabLookup Team</strong>
              </p>
            </td>
          </tr>
          
          ${generateEmailFooter()}
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function generateRequestFollowupEmail(name: string, metadata?: Record<string, unknown>): string {
  const daysSince = metadata?.daysSince || 3;
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #f4f6f9; -webkit-font-smoothing: antialiased;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f6f9;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08);">
          
          <!-- Header -->
          <tr>
            <td style="background-color: #1B365D; background: #1B365D; padding: 36px 32px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-family: Arial, Helvetica, sans-serif; font-size: 24px; font-weight: 700;">
                Checking In On Your Search
              </h1>
            </td>
          </tr>
          
          <!-- Body -->
          <tr>
            <td style="padding: 40px 32px;">
              <p style="margin: 0 0 20px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 18px; color: #1B365D; font-weight: 600;">
                Hi ${name},
              </p>
              
              <p style="margin: 0 0 20px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 16px; color: #475569; line-height: 1.6;">
                It's been ${daysSince} days since you sent a request to a treatment center. We wanted to check in and see how things are going.
              </p>
              
              <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 20px; border-radius: 8px; margin: 24px 0;">
                <p style="margin: 0 0 12px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 15px; color: #92400e; font-weight: 600;">
                  Haven't heard back yet?
                </p>
                <ul style="margin: 0; padding-left: 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 14px; color: #92400e; line-height: 1.8;">
                  <li>Try calling the facility directly – sometimes that's faster</li>
                  <li>Check your spam folder for their response</li>
                  <li>Consider reaching out to additional facilities</li>
                </ul>
              </div>
              
              <p style="margin: 24px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 16px; color: #475569; line-height: 1.6;">
                Remember, finding the right fit takes time. Don't get discouraged – the right facility is out there.
              </p>
              
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin: 32px auto;">
                <tr>
                  <td style="background-color: #1B365D; background: #1B365D; border-radius: 8px; margin-right: 8px;">
                    <a href="https://rehablookup.com/account" style="display: inline-block; padding: 16px 24px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 15px; font-weight: 600; color: #ffffff; text-decoration: none;">
                      Find More Centers
                    </a>
                  </td>
                </tr>
              </table>
              
              <p style="margin: 20px 0 0 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 15px; color: #475569;">
                We're here for you,<br>
                <strong>The RehabLookup Team</strong>
              </p>
            </td>
          </tr>
          
          ${generateEmailFooter()}
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function generateFacilityContactedEmail(name: string, facilityName: string, metadata?: Record<string, unknown>): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #f4f6f9; -webkit-font-smoothing: antialiased;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f6f9;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08);">
          
          <!-- Header -->
          <tr>
            <td style="background-color: #7c3aed; background: #7c3aed; padding: 36px 32px; text-align: center;">
              <div style="width: 64px; height: 64px; background: rgba(255,255,255,0.2); border-radius: 50%; margin: 0 auto 16px; display: flex; align-items: center; justify-content: center;">
                <span style="font-size: 32px;">📬</span>
              </div>
              <h1 style="margin: 0; color: #ffffff; font-family: Arial, Helvetica, sans-serif; font-size: 24px; font-weight: 700;">
                You Have a Response!
              </h1>
            </td>
          </tr>
          
          <!-- Body -->
          <tr>
            <td style="padding: 40px 32px;">
              <p style="margin: 0 0 20px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 18px; color: #1B365D; font-weight: 600;">
                Hi ${name},
              </p>
              
              <p style="margin: 0 0 20px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 16px; color: #475569; line-height: 1.6;">
                Great news! <strong>${facilityName}</strong> has responded to your inquiry. Check your phone and email for their message.
              </p>
              
              <div style="background: #f5f3ff; border: 1px solid #c4b5fd; padding: 20px; border-radius: 12px; margin: 24px 0;">
                <p style="margin: 0 0 12px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 15px; color: #5b21b6; font-weight: 600;">
                  Questions to ask them:
                </p>
                <ul style="margin: 0; padding-left: 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 14px; color: #5b21b6; line-height: 1.8;">
                  <li>What types of treatment do you specialize in?</li>
                  <li>Do you accept my insurance?</li>
                  <li>What's the average length of stay?</li>
                  <li>What does a typical day look like?</li>
                </ul>
              </div>
              
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin: 32px auto;">
                <tr>
                  <td style="background-color: #1B365D; background: #1B365D; border-radius: 8px;">
                    <a href="https://rehablookup.com/account/requests" style="display: inline-block; padding: 16px 32px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 16px; font-weight: 600; color: #ffffff; text-decoration: none;">
                      View Your Requests
                    </a>
                  </td>
                </tr>
              </table>
              
              <p style="margin: 20px 0 0 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 15px; color: #475569;">
                Good luck,<br>
                <strong>The RehabLookup Team</strong>
              </p>
            </td>
          </tr>
          
          ${generateEmailFooter()}
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function generateTipsEmail(name: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #f4f6f9; -webkit-font-smoothing: antialiased;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f6f9;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08);">
          
          <!-- Header -->
          <tr>
            <td style="background-color: #1B365D; background: #1B365D; padding: 36px 32px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-family: Arial, Helvetica, sans-serif; font-size: 24px; font-weight: 700;">
                5 Questions to Ask Treatment Centers
              </h1>
            </td>
          </tr>
          
          <!-- Body -->
          <tr>
            <td style="padding: 40px 32px;">
              <p style="margin: 0 0 20px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 18px; color: #1B365D; font-weight: 600;">
                Hi ${name},
              </p>
              
              <p style="margin: 0 0 24px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 16px; color: #475569; line-height: 1.6;">
                When speaking with treatment centers, asking the right questions can help you find the best fit:
              </p>
              
              <div style="margin: 20px 0;">
                <div style="display: flex; margin-bottom: 16px;">
                  <div style="min-width: 32px; height: 32px; background: #1B365D; border-radius: 50%; color: #fff; font-weight: bold; text-align: center; line-height: 32px; margin-right: 16px;">1</div>
                  <div>
                    <p style="margin: 0 0 4px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 15px; color: #1B365D; font-weight: 600;">
                      "What's your staff-to-patient ratio?"
                    </p>
                    <p style="margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 14px; color: #64748b;">
                      More staff often means more personalized attention.
                    </p>
                  </div>
                </div>
                
                <div style="display: flex; margin-bottom: 16px;">
                  <div style="min-width: 32px; height: 32px; background: #1B365D; border-radius: 50%; color: #fff; font-weight: bold; text-align: center; line-height: 32px; margin-right: 16px;">2</div>
                  <div>
                    <p style="margin: 0 0 4px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 15px; color: #1B365D; font-weight: 600;">
                      "What happens after I complete the program?"
                    </p>
                    <p style="margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 14px; color: #64748b;">
                      Aftercare support is crucial for long-term success.
                    </p>
                  </div>
                </div>
                
                <div style="display: flex; margin-bottom: 16px;">
                  <div style="min-width: 32px; height: 32px; background: #1B365D; border-radius: 50%; color: #fff; font-weight: bold; text-align: center; line-height: 32px; margin-right: 16px;">3</div>
                  <div>
                    <p style="margin: 0 0 4px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 15px; color: #1B365D; font-weight: 600;">
                      "How do you handle co-occurring disorders?"
                    </p>
                    <p style="margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 14px; color: #64748b;">
                      Many people need treatment for both addiction and mental health.
                    </p>
                  </div>
                </div>
                
                <div style="display: flex; margin-bottom: 16px;">
                  <div style="min-width: 32px; height: 32px; background: #1B365D; border-radius: 50%; color: #fff; font-weight: bold; text-align: center; line-height: 32px; margin-right: 16px;">4</div>
                  <div>
                    <p style="margin: 0 0 4px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 15px; color: #1B365D; font-weight: 600;">
                      "Can my family be involved in treatment?"
                    </p>
                    <p style="margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 14px; color: #64748b;">
                      Family involvement can significantly improve outcomes.
                    </p>
                  </div>
                </div>
                
                <div style="display: flex; margin-bottom: 16px;">
                  <div style="min-width: 32px; height: 32px; background: #1B365D; border-radius: 50%; color: #fff; font-weight: bold; text-align: center; line-height: 32px; margin-right: 16px;">5</div>
                  <div>
                    <p style="margin: 0 0 4px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 15px; color: #1B365D; font-weight: 600;">
                      "What's included in the cost?"
                    </p>
                    <p style="margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 14px; color: #64748b;">
                      Understand what you're paying for to avoid surprises.
                    </p>
                  </div>
                </div>
              </div>
              
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin: 32px auto;">
                <tr>
                  <td style="background-color: #1B365D; background: #1B365D; border-radius: 8px;">
                    <a href="https://rehablookup.com/account" style="display: inline-block; padding: 16px 32px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 16px; font-weight: 600; color: #ffffff; text-decoration: none;">
                      Find Treatment Centers
                    </a>
                  </td>
                </tr>
              </table>
              
              <p style="margin: 20px 0 0 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 15px; color: #475569;">
                Wishing you strength,<br>
                <strong>The RehabLookup Team</strong>
              </p>
            </td>
          </tr>
          
          ${generateEmailFooter()}
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function generateWeeklyDigestEmail(name: string, metadata?: Record<string, unknown>): string {
  const requestCount = metadata?.requestCount || 0;
  const newFacilities = metadata?.newFacilities || 0;
  
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #f4f6f9; -webkit-font-smoothing: antialiased;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f6f9;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08);">
          
          <!-- Header -->
          <tr>
            <td style="background-color: #1B365D; background: #1B365D; padding: 36px 32px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-family: Arial, Helvetica, sans-serif; font-size: 24px; font-weight: 700;">
                Your Weekly Update
              </h1>
            </td>
          </tr>
          
          <!-- Body -->
          <tr>
            <td style="padding: 40px 32px;">
              <p style="margin: 0 0 20px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 18px; color: #1B365D; font-weight: 600;">
                Hi ${name},
              </p>
              
              <p style="margin: 0 0 24px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 16px; color: #475569; line-height: 1.6;">
                Here's a summary of your treatment search activity this week:
              </p>
              
              <!-- Stats -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin: 24px 0;">
                <tr>
                  <td style="width: 50%; padding: 16px; background: #f8fafc; border-radius: 12px 0 0 12px; text-align: center;">
                    <p style="margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 32px; color: #1B365D; font-weight: 700;">
                      ${requestCount}
                    </p>
                    <p style="margin: 4px 0 0 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 14px; color: #64748b;">
                      Requests Sent
                    </p>
                  </td>
                  <td style="width: 50%; padding: 16px; background: #f0f9ff; border-radius: 0 12px 12px 0; text-align: center;">
                    <p style="margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 32px; color: #1B365D; font-weight: 700;">
                      ${newFacilities}
                    </p>
                    <p style="margin: 4px 0 0 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 14px; color: #64748b;">
                      New Facilities
                    </p>
                  </td>
                </tr>
              </table>
              
              ${requestCount === 0 ? `
              <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 20px; border-radius: 8px; margin: 24px 0;">
                <p style="margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 15px; color: #92400e; line-height: 1.6;">
                  You haven't sent any requests yet. Browse treatment centers and reach out – most respond within 24 hours!
                </p>
              </div>
              ` : ''}
              
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin: 32px auto;">
                <tr>
                  <td style="background-color: #1B365D; background: #1B365D; border-radius: 8px;">
                    <a href="https://rehablookup.com/account" style="display: inline-block; padding: 16px 32px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 16px; font-weight: 600; color: #ffffff; text-decoration: none;">
                      Continue Your Search
                    </a>
                  </td>
                </tr>
              </table>
              
              <p style="margin: 20px 0 0 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 15px; color: #475569;">
                Stay strong,<br>
                <strong>The RehabLookup Team</strong>
              </p>
            </td>
          </tr>
          
          ${generateEmailFooter()}
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function generateAccountReminderEmail(name: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #f4f6f9; -webkit-font-smoothing: antialiased;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f6f9;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08);">
          
          <!-- Header -->
          <tr>
            <td style="background-color: #1B365D; background: #1B365D; padding: 36px 32px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-family: Arial, Helvetica, sans-serif; font-size: 24px; font-weight: 700;">
                We're Still Here for You
              </h1>
            </td>
          </tr>
          
          <!-- Body -->
          <tr>
            <td style="padding: 40px 32px;">
              <p style="margin: 0 0 20px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 18px; color: #1B365D; font-weight: 600;">
                Hi ${name},
              </p>
              
              <p style="margin: 0 0 20px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 16px; color: #475569; line-height: 1.6;">
                We noticed you haven't visited RehabLookup in a while. Life can get busy, and we understand that finding treatment takes courage and time.
              </p>
              
              <p style="margin: 0 0 20px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 16px; color: #475569; line-height: 1.6;">
                Whether you're still searching, have found help, or just need more time – we're here whenever you're ready.
              </p>
              
              <div style="background: #f0f9ff; border-left: 4px solid #1B365D; padding: 20px; border-radius: 8px; margin: 24px 0;">
                <p style="margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 15px; color: #1B365D; line-height: 1.6;">
                  <strong>Remember:</strong> There's no wrong time to seek help. Every day is a new opportunity to take that step.
                </p>
              </div>
              
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin: 32px auto;">
                <tr>
                  <td style="background-color: #1B365D; background: #1B365D; border-radius: 8px;">
                    <a href="https://rehablookup.com/account" style="display: inline-block; padding: 16px 32px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 16px; font-weight: 600; color: #ffffff; text-decoration: none;">
                      Continue Your Search
                    </a>
                  </td>
                </tr>
              </table>
              
              <p style="margin: 20px 0 0 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 15px; color: #475569;">
                With hope,<br>
                <strong>The RehabLookup Team</strong>
              </p>
            </td>
          </tr>
          
          ${generateEmailFooter()}
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function generatePlacementIntroEmail(name: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #f4f6f9; -webkit-font-smoothing: antialiased;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f6f9;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08);">
          
          <!-- Header -->
          <tr>
            <td style="background-color: #1B365D; background: #1B365D; padding: 40px 32px; text-align: center;">
              <div style="font-size: 48px; margin-bottom: 12px;">🏥</div>
              <h1 style="margin: 0; color: #ffffff; font-family: Arial, Helvetica, sans-serif; font-size: 24px; font-weight: 700;">
                Let Us Help You Get Placed
              </h1>
              <p style="margin: 12px 0 0 0; color: #cbd5e1; font-family: Arial, Helvetica, sans-serif; font-size: 15px;">
                Personalized treatment placement, handled for you
              </p>
            </td>
          </tr>
          
          <!-- Body -->
          <tr>
            <td style="padding: 40px 32px;">
              <p style="margin: 0 0 20px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 18px; color: #1B365D; font-weight: 600;">
                Hi ${name},
              </p>
              
              <p style="margin: 0 0 20px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 16px; color: #475569; line-height: 1.6;">
                Finding the right treatment center can be overwhelming — comparing programs, verifying insurance, and coordinating admission takes time you may not have. That's why we created our <strong>Treatment Placement</strong> service.
              </p>
              
              <div style="background: #f0fdf4; border-left: 4px solid #166534; padding: 20px; border-radius: 8px; margin: 24px 0;">
                <p style="margin: 0 0 12px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 16px; color: #166534; font-weight: 600;">
                  How it works:
                </p>
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="padding: 8px 0; font-size: 15px; color: #475569; line-height: 1.6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                      <strong style="color: #166534;">1.</strong> Tell us about your needs and preferences
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; font-size: 15px; color: #475569; line-height: 1.6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                      <strong style="color: #166534;">2.</strong> A dedicated advisor finds and vets the best-fit facilities
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; font-size: 15px; color: #475569; line-height: 1.6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                      <strong style="color: #166534;">3.</strong> We coordinate insurance verification and admission
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; font-size: 15px; color: #475569; line-height: 1.6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                      <strong style="color: #166534;">4.</strong> You get placed at the right center, stress-free
                    </td>
                  </tr>
                </table>
              </div>
              
              <div style="background: #f8fafc; padding: 20px; border-radius: 12px; margin: 24px 0;">
                <p style="margin: 0 0 8px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 14px; color: #1B365D; font-weight: 600;">
                  Why families choose Treatment Placement:
                </p>
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                  <tr><td style="padding: 6px 0; font-size: 14px; color: #475569; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">✅ Save hours of research and phone calls</td></tr>
                  <tr><td style="padding: 6px 0; font-size: 14px; color: #475569; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">✅ Advisor-matched to your specific needs</td></tr>
                  <tr><td style="padding: 6px 0; font-size: 14px; color: #475569; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">✅ Insurance verification handled for you</td></tr>
                  <tr><td style="padding: 6px 0; font-size: 14px; color: #475569; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">✅ Smooth admission coordination</td></tr>
                </table>
              </div>
              
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin: 32px auto;">
                <tr>
                  <td style="background-color: #166534; background: #166534; border-radius: 8px;">
                    <a href="https://rehablookup.com/concierge" style="display: inline-block; padding: 16px 32px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 16px; font-weight: 600; color: #ffffff; text-decoration: none;">
                      Get Placed Now →
                    </a>
                  </td>
                </tr>
              </table>
              
              <p style="margin: 24px 0 0 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 14px; color: #64748b; line-height: 1.6; text-align: center;">
                You can also continue browsing treatment centers on your own — our directory is always free to use.
              </p>
              
              <p style="margin: 20px 0 0 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 15px; color: #475569;">
                With hope,<br>
                <strong>The RehabLookup Team</strong>
              </p>
            </td>
          </tr>
          
          ${generateEmailFooter()}
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function generateEmailFooter(): string {
  return `
          <!-- Footer -->
          <tr>
            <td style="background-color: #1B365D; background: #1B365D; padding: 28px 32px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding-bottom: 12px;">
                    <p style="margin: 0; font-family: Arial, Helvetica, sans-serif; font-size: 18px; font-weight: 700; color: #ffffff;">
                      RehabLookup
                    </p>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding-bottom: 16px;">
                    <p style="margin: 0; font-family: Arial, Helvetica, sans-serif; font-size: 13px; color: #cbd5e1;">
                      Connecting families with trusted treatment providers
                    </p>
                  </td>
                </tr>
                <tr>
                  <td align="center">
                    <p style="margin: 0; font-family: Arial, Helvetica, sans-serif; font-size: 12px; color: #94a3b8;">
                      <a href="https://rehablookup.com/account/settings" style="color: #93c5fd; text-decoration: underline;">Manage email preferences</a>
                       · 
                      <a href="https://rehablookup.com" style="color: #93c5fd; text-decoration: underline;">Visit RehabLookup</a>
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>`;
}
