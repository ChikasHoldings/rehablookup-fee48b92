import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { Resend } from "https://esm.sh/resend@2.0.0";
import {
  emailStart,
  emailHeader,
  emailBodyStart,
  emailBodyEnd,
  emailGreeting,
  emailParagraph,
  featuredInsightsBox,
  professionalInfoBox,
  ctaButton,
  emailFooter,
  emailEnd,
  type PlanType,
} from "../_shared/email-templates.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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
  const plan = selectedPlan as PlanType;
  const isFeatured = plan === "featured";
  const isProfessional = plan === "professional";
  const isPaidPlan = isFeatured || isProfessional;
  const planDisplayName = plan === "basic" ? "Basic" : plan === "professional" ? "Professional" : "Featured";

  let email = emailStart('#f4f6f9');
  email += emailHeader(`Welcome to RehabLookup!`, plan, { 
    subtitle: "Your facility is now registered" 
  });
  email += emailBodyStart();
  email += emailGreeting(providerFirstName);
  email += emailParagraph(`Thank you for registering <strong style="color: #1B365D;">${facilityName}</strong> on RehabLookup. We're excited to help you connect with families seeking treatment.`);

  // Plan-specific welcome messages
  if (isFeatured) {
    email += featuredInsightsBox("You've chosen our premium tier. Once approved, you'll enjoy priority placement, exclusive leads, and maximum visibility.");
  } else if (isProfessional) {
    email += professionalInfoBox("✓ <strong>Professional Plan Selected:</strong> Once approved, you'll start receiving qualified leads directly.");
  }

  // Pending review notice
  email += `
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background: linear-gradient(135deg, #fef3c7 0%, #fef9c3 100%); border-left: 4px solid #f59e0b; border-radius: 0 12px 12px 0; margin-bottom: 28px;">
                <tr>
                  <td style="padding: 20px;">
                    <p style="margin: 0 0 6px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 15px; font-weight: 600; color: #92400e;">
                      ⏳ Pending Review
                    </p>
                    <p style="margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 14px; color: #78350f; line-height: 1.5;">
                      Your facility is being reviewed by our team. Once approved, your listing will be visible to families seeking treatment. We'll notify you as soon as you're approved!
                    </p>
                  </td>
                </tr>
              </table>
  `;

  // Plan info
  email += `
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background: #f8fafc; border-radius: 12px; margin-bottom: 28px;">
                <tr>
                  <td style="padding: 20px;">
                    <p style="margin: 0 0 8px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 14px; color: #64748b;">
                      Your Plan
                    </p>
                    <p style="margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 18px; font-weight: 600; color: ${isFeatured ? '#7c3aed' : '#1B365D'};">
                      ${planDisplayName}
                    </p>
                    <p style="margin: 8px 0 0 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 13px; color: ${isPaidPlan ? '#10b981' : '#64748b'};">
                      ${isPaidPlan ? '✓ Subscription active' : 'Upgrade anytime to receive exclusive qualified leads'}
                    </p>
                  </td>
                </tr>
              </table>
  `;

  // What's next
  const accentColor = isFeatured ? '#7c3aed' : '#1B365D';
  const bgColor = isFeatured ? '#ede9fe' : '#dbeafe';
  email += `
              <p style="margin: 0 0 16px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 16px; font-weight: 600; color: #1B365D;">
                What's Next?
              </p>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 28px;">
                <tr>
                  <td style="padding: 12px 0;">
                    <table role="presentation" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="width: 32px; vertical-align: top;">
                          <span style="display: inline-block; width: 24px; height: 24px; background: ${bgColor}; border-radius: 50%; text-align: center; line-height: 24px; font-size: 12px; font-weight: 600; color: ${accentColor};">1</span>
                        </td>
                        <td style="padding-left: 12px;">
                          <p style="margin: 0 0 4px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 15px; font-weight: 500; color: #1B365D;">Complete your profile</p>
                          <p style="margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 14px; color: #64748b;">Add photos, description, and services to attract more families</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 12px 0;">
                    <table role="presentation" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="width: 32px; vertical-align: top;">
                          <span style="display: inline-block; width: 24px; height: 24px; background: ${bgColor}; border-radius: 50%; text-align: center; line-height: 24px; font-size: 12px; font-weight: 600; color: ${accentColor};">2</span>
                        </td>
                        <td style="padding-left: 12px;">
                          <p style="margin: 0 0 4px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 15px; font-weight: 500; color: #1B365D;">Wait for approval</p>
                          <p style="margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 14px; color: #64748b;">Our team will review and approve your listing shortly</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 12px 0;">
                    <table role="presentation" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="width: 32px; vertical-align: top;">
                          <span style="display: inline-block; width: 24px; height: 24px; background: ${bgColor}; border-radius: 50%; text-align: center; line-height: 24px; font-size: 12px; font-weight: 600; color: ${accentColor};">3</span>
                        </td>
                        <td style="padding-left: 12px;">
                          <p style="margin: 0 0 4px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 15px; font-weight: 500; color: #1B365D;">Start receiving leads</p>
                          <p style="margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 14px; color: #64748b;">${isPaidPlan ? 'Qualified leads will be delivered directly to your dashboard' : 'Connect with families actively seeking treatment'}</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
  `;

  email += ctaButton("Go to Dashboard", "https://rehablookup.com/provider/dashboard", plan);
  email += emailBodyEnd();
  email += emailFooter({ includeNotificationSettings: false });
  email += emailEnd();

  return email;
}

serve(async (req) => {
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

    const isFeatured = selectedPlan === "featured";
    const subjectPrefix = isFeatured ? "⭐ " : "";

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
