import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";
import Stripe from "https://esm.sh/stripe@14.21.0";
import {
  PLAN_CONFIG,
  getProviderPlan,
  emailStart,
  emailHeader,
  emailBodyStart,
  emailBodyEnd,
  emailGreeting,
  emailParagraph,
  featuredInsightsBox,
  professionalInfoBox,
  alertBox,
  upgradePromptBox,
  ctaButton,
  emailFooter,
  emailEnd,
  type PlanType,
} from "../_shared/email-templates.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Plan configuration (for product ID lookups)
const PRODUCT_TO_PLAN: Record<string, string> = {
  "prod_TbalLOPujTIoUe": "professional",
  "prod_Tbyz1bf6iYyzYd": "professional",
  "prod_TbalOeJZA2ZoJl": "featured",
  "prod_TbyzJVNOQL71NN": "featured",
};

interface ApprovalEmailRequest {
  facilityId: string;
  facilityName: string;
  userId: string;
}

function generateApprovalEmail(
  providerName: string,
  facilityName: string,
  profileUrl: string,
  plan: PlanType
): string {
  const isFeatured = plan === "featured";
  const isProfessional = plan === "professional";
  const isPaidPlan = isFeatured || isProfessional;

  // Use green gradient for approval success
  const headerGradient = isFeatured 
    ? "linear-gradient(135deg, #7c3aed 0%, #a78bfa 100%)" 
    : "linear-gradient(135deg, #22c55e 0%, #16a34a 100%)";

  let email = emailStart('#f4f6f9');
  
  // Custom header for approval (includes checkmark icon)
  email += `
          <tr>
            <td style="background: ${headerGradient}; padding: 40px 32px; text-align: center; border-radius: 12px 12px 0 0;">
              <div style="font-size: 48px; margin-bottom: 16px;">✓</div>
              <p style="margin: 0 0 8px 0; font-size: 12px; color: rgba(255,255,255,0.7); font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; text-transform: uppercase; letter-spacing: 1px;">REHABLOOKUP</p>
              <h1 style="margin: 0; font-size: 26px; color: #ffffff; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-weight: 700;">
                You're Live on RehabLookup${isFeatured ? `<span style="display: inline-block; background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%); color: #78350f; padding: 4px 12px; border-radius: 20px; font-size: 11px; font-weight: 600; margin-left: 8px;">⭐ FEATURED</span>` : isProfessional ? `<span style="display: inline-block; background: rgba(255,255,255,0.2); color: #fff; padding: 4px 12px; border-radius: 20px; font-size: 11px; font-weight: 500; margin-left: 8px;">Professional</span>` : ''}
              </h1>
            </td>
          </tr>
  `;

  email += emailBodyStart();
  email += emailGreeting(providerName);
  email += emailParagraph(`Your listing for <strong style="color: #1a1a1a;">${facilityName}</strong> has been approved. Families searching for treatment can now find and contact you directly.`);

  // Featured benefits
  if (isFeatured) {
    email += `
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border: 2px solid #f59e0b; border-radius: 12px; margin-bottom: 28px;">
                <tr>
                  <td style="padding: 20px;">
                    <p style="margin: 0 0 12px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 15px; font-weight: 600; color: #92400e;">
                      ⭐ Your Featured Provider Benefits:
                    </p>
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                      <tr><td style="padding: 4px 0; font-size: 14px; color: #78350f;">• Priority placement at the top of search results</td></tr>
                      <tr><td style="padding: 4px 0; font-size: 14px; color: #78350f;">• Exclusive, high-intent leads</td></tr>
                      <tr><td style="padding: 4px 0; font-size: 14px; color: #78350f;">• Premium visibility with Featured badge</td></tr>
                    </table>
                  </td>
                </tr>
              </table>
    `;
  } else if (isProfessional) {
    email += professionalInfoBox("✓ <strong>Professional Plan Active:</strong> You'll receive qualified leads directly to your dashboard.");
  }

  // What happens next
  email += `
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background: #f0fdf4; border-radius: 12px; margin-bottom: 32px;">
                <tr>
                  <td style="padding: 24px;">
                    <p style="margin: 0 0 16px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 15px; font-weight: 600; color: #166534;">
                      What happens next:
                    </p>
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                      <tr><td style="padding: 8px 0; font-size: 15px; color: #166534; line-height: 1.6;">• Your profile shows up in search results</td></tr>
                      <tr><td style="padding: 8px 0; font-size: 15px; color: #166534; line-height: 1.6;">• New leads go straight to your dashboard</td></tr>
                      <tr><td style="padding: 8px 0; font-size: 15px; color: #166534; line-height: 1.6;">• You get notified when someone reaches out</td></tr>
                    </table>
                  </td>
                </tr>
              </table>
  `;

  // Basic plan upsell
  if (!isPaidPlan) {
    email += `
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background: #f8fafc; border-radius: 12px; margin-bottom: 28px;">
                <tr>
                  <td style="padding: 20px;">
                    <p style="margin: 0 0 8px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 15px; font-weight: 600; color: #1B365D;">
                      💡 Ready to receive leads?
                    </p>
                    <p style="margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 14px; color: #64748b; line-height: 1.6;">
                      Upgrade to Professional or Featured to start receiving qualified leads from families actively seeking treatment.
                      <a href="https://rehablookup.com/provider/billing" style="color: #1B365D; font-weight: 500;">View plans →</a>
                    </p>
                  </td>
                </tr>
              </table>
    `;
  }

  email += ctaButton("See Your Listing", profileUrl, plan);
  
  email += `
              <p style="margin: 24px 0 0 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 15px; color: #64748b; text-align: center;">
                <a href="https://rehablookup.com/provider/dashboard" style="color: #1B365D; text-decoration: none; font-weight: 500;">Go to Dashboard</a>
              </p>
  `;

  email += emailBodyEnd();
  email += emailFooter({ includeNotificationSettings: false });
  email += emailEnd();

  return email;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");

    if (!resendApiKey) {
      console.error("RESEND_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "Email service not configured" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const body: ApprovalEmailRequest = await req.json();
    const { facilityId, facilityName, userId } = body;

    console.log("Sending approval email for facility:", { facilityId, facilityName, userId });

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const stripe = stripeSecretKey ? new Stripe(stripeSecretKey, { apiVersion: "2023-10-16" }) : null;

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("first_name, last_name, email")
      .eq("user_id", userId)
      .maybeSingle();

    if (profileError || !profile) {
      console.error("Profile not found:", profileError);
      return new Response(
        JSON.stringify({ error: "Provider profile not found" }),
        { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const { data: facility, error: facilityError } = await supabase
      .from("facilities")
      .select("slug, city, state")
      .eq("id", facilityId)
      .maybeSingle();

    if (facilityError) {
      console.error("Error fetching facility:", facilityError);
    }

    const profileUrl = facility?.slug 
      ? `https://rehablookup.com/center/${facility.slug}`
      : `https://rehablookup.com/rehab-centers`;

    const providerName = profile.first_name || "there";
    
    // Get provider plan for styling
    const planInfo = await getProviderPlan(profile.email, stripe);
    console.log("Provider plan:", planInfo.plan);

    const emailHtml = generateApprovalEmail(providerName, facilityName, profileUrl, planInfo.plan);

    const resend = new Resend(resendApiKey);
    const subjectPrefix = planInfo.plan === "featured" ? "⭐ " : "";
    
    const emailResponse = await resend.emails.send({
      from: "RehabLookup <no-reply@rehablookup.com>",
      to: [profile.email],
      subject: `${subjectPrefix}Your listing is live: ${facilityName}`,
      html: emailHtml,
    });

    console.log("Approval email sent:", emailResponse);

    const { error: notifError } = await supabase
      .from("provider_notifications")
      .insert({
        user_id: userId,
        facility_id: facilityId,
        type: "listing_approved",
        title: "Listing Approved",
        message: `Your listing for ${facilityName} is now live!`,
        metadata: { profile_url: profileUrl },
      });

    if (notifError) {
      console.error("Failed to create notification:", notifError);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Approval email sent to ${profile.email}` 
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );

  } catch (error: unknown) {
    console.error("Error in send-approval-email function:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
