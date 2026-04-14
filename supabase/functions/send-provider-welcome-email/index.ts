import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { Resend } from "https://esm.sh/resend@2.0.0";
import {
  emailStart,
  emailHeader,
  emailBodyStart,
  emailBodyEnd,
  emailGreeting,
  emailParagraph,
  proInsightsBox,
  ctaButton,
  emailFooter,
  emailEnd,
  type PlanType,
} from "../_shared/email-templates.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: unknown) => {
  console.log(`[SEND-PROVIDER-WELCOME-EMAIL] ${step}`, details ? JSON.stringify(details) : "");
};

interface WelcomeEmailRequest {
  facilityId: string;
  facilityName: string;
  providerEmail: string;
  providerFirstName: string;
  selectedPlan: string;
}

function generateWelcomeEmail(
  providerFirstName: string,
  facilityName: string,
  selectedPlan: string
): string {
  const isPro = selectedPlan === "pro" || selectedPlan === "professional" || selectedPlan === "featured";
  const plan: PlanType = isPro ? "pro" : "free";
  const planDisplayName = isPro ? "Pro" : "Free";

  const primaryColor = "#1B365D";
  const accentColor = "#CDA223";
  const accentBg = "#fef9e7";
  const proBadgeColor = isPro ? "#7c3aed" : "#64748b";

  let email = emailStart('#f4f6f9');
  email += emailHeader(`Welcome to RehabLookup!`, plan, { 
    subtitle: "Start receiving inquiries and placement opportunities" 
  });
  email += emailBodyStart();
  email += emailGreeting(providerFirstName);
  email += emailParagraph(`Thank you for registering <strong style="color: ${primaryColor};">${facilityName}</strong> on RehabLookup. We're thrilled to help you connect with families actively seeking treatment.`);

  // How it works section
  email += `
              <p style="margin: 0 0 16px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 16px; font-weight: 700; color: ${primaryColor};">
                How RehabLookup Works
              </p>
  `;

  const steps = [
    { num: "1", title: "List your facility", desc: "Showcase your programs, services, and insurance accepted" },
    { num: "2", title: "Receive inquiries", desc: "Families find you directly from your listing page" },
    { num: "3", title: "Unlock leads", desc: "Purchase credits to view full contact details" },
    { num: "4", title: "Join placements", desc: "Opt into our placement network for pre-screened referrals" },
  ];

  email += `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 28px;">`;
  for (const step of steps) {
    email += `
                <tr>
                  <td style="padding: 10px 0;">
                    <table role="presentation" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="width: 36px; vertical-align: top;">
                          <span style="display: inline-block; width: 28px; height: 28px; background: ${isPro ? '#ede9fe' : '#dbeafe'}; border-radius: 50%; text-align: center; line-height: 28px; font-size: 13px; font-weight: 700; color: ${isPro ? '#7c3aed' : primaryColor};">${step.num}</span>
                        </td>
                        <td style="padding-left: 12px;">
                          <p style="margin: 0 0 2px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 15px; font-weight: 600; color: ${primaryColor};">${step.title}</p>
                          <p style="margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 13px; color: #64748b; line-height: 1.5;">${step.desc}</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
    `;
  }
  email += `</table>`;

  // Free vs Pro comparison
  email += `
              <p style="margin: 0 0 16px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 16px; font-weight: 700; color: ${primaryColor};">
                Your Plan: ${planDisplayName}
              </p>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 24px;">
                <tr>
                  <td style="width: 50%; vertical-align: top; padding-right: 8px;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background: ${!isPro ? '#f0f7ff' : '#f8fafc'}; border: ${!isPro ? '2px solid ' + primaryColor : '1px solid #e2e8f0'}; border-radius: 12px;">
                      <tr><td style="padding: 16px;">
                        <p style="margin: 0 0 4px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 14px; font-weight: 700; color: ${primaryColor};">Free</p>
                        <p style="margin: 0 0 12px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 20px; font-weight: 700; color: ${primaryColor};">$0<span style="font-size: 12px; font-weight: 400; color: #64748b;">/mo</span></p>
                        <p style="margin: 0 0 4px 0; font-size: 12px; color: #64748b;">✓ 1 facility listing</p>
                        <p style="margin: 0 0 4px 0; font-size: 12px; color: #64748b;">✓ Direct inquiries</p>
                        <p style="margin: 0 0 4px 0; font-size: 12px; color: #64748b;">✓ Placement network</p>
                        <p style="margin: 0; font-size: 12px; color: #64748b;">✓ Performance tracking</p>
                      </td></tr>
                    </table>
                  </td>
                  <td style="width: 50%; vertical-align: top; padding-left: 8px;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background: ${isPro ? '#faf5ff' : '#f8fafc'}; border: ${isPro ? '2px solid #7c3aed' : '1px solid #e2e8f0'}; border-radius: 12px;">
                      <tr><td style="padding: 16px;">
                        <p style="margin: 0 0 4px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 14px; font-weight: 700; color: #7c3aed;">Pro</p>
                        <p style="margin: 0 0 12px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 20px; font-weight: 700; color: #7c3aed;">$399<span style="font-size: 12px; font-weight: 400; color: #64748b;">/mo</span></p>
                        <p style="margin: 0 0 4px 0; font-size: 12px; color: #334155; font-weight: 500;">✓ Up to 5 listings</p>
                        <p style="margin: 0 0 4px 0; font-size: 12px; color: #334155; font-weight: 500;">✓ 20% off lead unlocks</p>
                        <p style="margin: 0 0 4px 0; font-size: 12px; color: #334155; font-weight: 500;">✓ 20% off placements</p>
                        <p style="margin: 0; font-size: 12px; color: #334155; font-weight: 500;">✓ Featured visibility</p>
                      </td></tr>
                    </table>
                  </td>
                </tr>
              </table>
  `;

  // Pro upsell for free users
  if (isPro) {
    email += proInsightsBox("Your Pro membership is active! You'll enjoy 20% off lead unlocks, up to 5 facility listings, and priority visibility in search results.");
  }

  // Welcome offer banner
  email += `
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background: linear-gradient(135deg, ${accentBg}, #fff7ed); border: 1px solid ${accentColor}40; border-radius: 12px; margin-bottom: 28px;">
                <tr>
                  <td style="padding: 20px;">
                    <p style="margin: 0 0 4px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 15px; font-weight: 700; color: ${primaryColor};">
                      🎁 Welcome Offer
                    </p>
                    <p style="margin: 0 0 14px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 13px; color: #78350f; line-height: 1.5;">
                      Get bonus credits on your first top-up! Limited-time offer for new providers.
                    </p>
                    <table role="presentation" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="background: ${accentColor}; border-radius: 8px;">
                          <a href="https://rehablookup.com/provider/billing?purchase_credits=true" style="display: inline-block; padding: 10px 24px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 14px; font-weight: 600; color: #ffffff; text-decoration: none;">
                            Claim Credits →
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
  `;

  // Pending review notice
  email += `
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 0 12px 12px 0; margin-bottom: 28px;">
                <tr>
                  <td style="padding: 16px 20px;">
                    <p style="margin: 0 0 4px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 14px; font-weight: 600; color: #92400e;">
                      ⏳ Your listing is under review
                    </p>
                    <p style="margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 13px; color: #78350f; line-height: 1.5;">
                      We'll review and approve your listing within 24-48 hours. You'll receive an email notification once it's live.
                    </p>
                  </td>
                </tr>
              </table>
  `;

  // Primary CTA
  email += ctaButton("Complete My Listing", "https://rehablookup.com/provider/listings", plan);

  // Secondary CTA
  email += `
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top: 12px; margin-bottom: 8px;">
                <tr>
                  <td align="center">
                    <a href="https://rehablookup.com/provider/dashboard" style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 14px; color: ${primaryColor}; text-decoration: underline;">
                      Go to Dashboard
                    </a>
                  </td>
                </tr>
              </table>
  `;

  if (!isPro) {
    email += `
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top: 8px; margin-bottom: 8px;">
                <tr>
                  <td align="center">
                    <a href="https://rehablookup.com/provider/pro-upgrade" style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 14px; color: #7c3aed; font-weight: 600; text-decoration: underline;">
                      ⭐ Upgrade to Pro
                    </a>
                  </td>
                </tr>
              </table>
    `;
  }

  email += emailBodyEnd();
  email += emailFooter({ includeNotificationSettings: false });
  email += emailEnd();

  return email;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      logStep("ERROR", "RESEND_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "Email service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const resend = new Resend(resendApiKey);

    const { facilityId, facilityName, providerEmail, providerFirstName, selectedPlan }: WelcomeEmailRequest = await req.json();
    logStep("Received request", { facilityId, facilityName, providerEmail, selectedPlan });

    const emailHtml = generateWelcomeEmail(providerFirstName, facilityName, selectedPlan);

    const isPro = selectedPlan === "pro" || selectedPlan === "professional" || selectedPlan === "featured";
    const subjectPrefix = isPro ? "⭐ " : "";

    const { error: emailError } = await resend.emails.send({
      from: "RehabLookup <no-reply@rehablookup.com>",
      to: [providerEmail],
      subject: `${subjectPrefix}Welcome to RehabLookup, ${providerFirstName}!`,
      html: emailHtml,
    });

    if (emailError) {
      logStep("Error sending welcome email", emailError);
      return new Response(
        JSON.stringify({ error: "Failed to send welcome email", details: emailError }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    logStep("Welcome email sent successfully", { to: providerEmail });

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
