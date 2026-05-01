import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2?target=denonext";
import { Resend } from "https://esm.sh/resend@2.0.0?target=denonext";
import { sendEmailWithRetry } from "../_shared/resilient-email-sender.ts";
import { requireAdmin } from "../_shared/require-admin.ts";
import Stripe from "https://esm.sh/stripe@18.5.0?target=denonext";
import {
  getProviderPlan,
  emailStart,
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

interface ApprovalEmailRequest {
  facilityId: string;
  facilityName: string;
  userId: string;
}

function generateApprovalEmail(
  providerName: string,
  facilityName: string,
  profileUrl: string,
  plan: PlanType,
  isConciergeOptedIn: boolean = false
): string {
  const isPro = plan === "pro";

  // Use green gradient for approval success, purple for Pro
  const headerGradient = isPro 
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
                You're Live on RehabLookup${isPro ? `<span style="display: inline-block; background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%); color: #78350f; padding: 4px 12px; border-radius: 20px; font-size: 11px; font-weight: 600; margin-left: 8px;">⭐ PRO</span>` : ''}
              </h1>
            </td>
          </tr>
  `;

  email += emailBodyStart();
  email += emailGreeting(providerName);
  email += emailParagraph(`Your listing for <strong style="color: #1a1a1a;">${facilityName}</strong> has been approved. Families searching for treatment can now find and contact you directly.`);

  // Pro benefits
  if (isPro) {
    email += proInsightsBox("As a Pro member, you get 20% off lead unlocks, up to 5 facility listings, and priority visibility in search results.");
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
                      <tr><td style="padding: 8px 0; font-size: 15px; color: #166534; line-height: 1.6;">• New leads arrive in your dashboard</td></tr>
                      <tr><td style="padding: 8px 0; font-size: 15px; color: #166534; line-height: 1.6;">• Unlock leads to view contact details</td></tr>
                    </table>
                  </td>
                </tr>
              </table>
  `;

  // Free plan upsell
  if (!isPro) {
    email += `
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background: #f8fafc; border-radius: 12px; margin-bottom: 28px;">
                <tr>
                  <td style="padding: 20px;">
                    <p style="margin: 0 0 8px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 15px; font-weight: 600; color: #1B365D;">
                      💡 Upgrade to Pro
                    </p>
                    <p style="margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 14px; color: #64748b; line-height: 1.6;">
                      Get 20% off lead unlocks, add up to 5 locations, and boost your visibility.
                      <a href="https://rehablookup.com/provider/billing" style="color: #1B365D; font-weight: 500;">Learn more →</a>
                    </p>
                  </td>
                </tr>
              </table>
    `;
  }

  // Placement Network Introduction — non-intrusive, value-first
  if (!isConciergeOptedIn) {
    email += `
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; margin-bottom: 28px;">
                <tr>
                  <td style="padding: 24px;">
                    <p style="margin: 0 0 8px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 15px; font-weight: 600; color: #166534;">
                      🏥 Fill Your Beds Faster with Treatment Placement
                    </p>
                    <p style="margin: 0 0 12px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 14px; color: #475569; line-height: 1.6;">
                      Our Treatment Placement service connects your facility with families who are actively seeking care and ready to admit. Our advisors personally coordinate each placement — you only pay when a patient is successfully placed.
                    </p>
                    <table role="presentation" cellpadding="0" cellspacing="0" style="margin: 4px 0 0 0;">
                      <tr>
                        <td style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 13px; color: #166534; padding: 4px 0;">✅ No upfront costs — pay only on successful placement</td>
                      </tr>
                      <tr>
                        <td style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 13px; color: #166534; padding: 4px 0;">✅ Pre-screened, qualified referrals matched to your specialties</td>
                      </tr>
                      <tr>
                        <td style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 13px; color: #166534; padding: 4px 0;">✅ Dedicated advisor handles all coordination</td>
                      </tr>
                    </table>
                    <table role="presentation" cellpadding="0" cellspacing="0" style="margin: 16px 0 0 0;">
                      <tr>
                        <td style="background-color: #166534; border-radius: 6px;">
                          <a href="https://rehablookup.com/provider/placement" style="display: inline-block; padding: 10px 24px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 14px; font-weight: 600; color: #ffffff; text-decoration: none;">
                            Learn About Placement →
                          </a>
                        </td>
                      </tr>
                    </table>
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

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Admin-only endpoint: verify the caller is an active admin BEFORE
    // doing any work. Without this, anyone with the URL can spam approval
    // emails to arbitrary providers.
    const auth = await requireAdmin(req);
    if (!auth.ok) return auth.response;
    const { supabase, adminUserId } = auth;

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");

    if (!resendApiKey) {
      console.error("RESEND_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "Email service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body: ApprovalEmailRequest = await req.json();
    const { facilityId, facilityName, userId } = body;

    console.log("Sending approval email for facility:", { facilityId, facilityName, userId, byAdmin: adminUserId });

    const stripe = stripeSecretKey ? new Stripe(stripeSecretKey, { apiVersion: "2025-08-27.basil" }) : null;

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("first_name, last_name, email")
      .eq("user_id", userId)
      .maybeSingle();

    if (profileError || !profile) {
      console.error("Profile not found:", profileError);
      return new Response(
        JSON.stringify({ error: "Provider profile not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: facility, error: facilityError } = await supabase
      .from("facilities")
      .select("slug, city, state, concierge_network_opted_in")
      .eq("id", facilityId)
      .maybeSingle();

    if (facilityError) {
      console.error("Error fetching facility:", facilityError);
    }

    const profileUrl = facility?.slug 
      ? `https://rehablookup.com/center/${facility.slug}`
      : `https://rehablookup.com/rehab-centers`;

    const providerName = profile.first_name || "there";
    const isConciergeOptedIn = facility?.concierge_network_opted_in === true;
    
    // Get provider plan for styling
    const planInfo = await getProviderPlan(profile.email, stripe);
    console.log("Provider plan:", planInfo.plan);

    const emailHtml = generateApprovalEmail(providerName, facilityName, profileUrl, planInfo.plan, isConciergeOptedIn);

    const resend = new Resend(resendApiKey);
    const subjectPrefix = planInfo.plan === "pro" ? "⭐ " : "";
    
    const result = await sendEmailWithRetry(supabase, resend, {
      from: "RehabLookup <no-reply@rehablookup.com>",
      to: [profile.email],
      subject: `${subjectPrefix}Your listing is live: ${facilityName}`,
      html: emailHtml,
    }, {
      emailType: "facility_approval",
      idempotencyKey: `approval-${facilityId}`,
      metadata: { facilityId, facilityName },
    });

    if (!result.success && !result.deduplicated) {
      console.error("Approval email failed:", result.error, { deadLettered: result.deadLettered });
    } else {
      console.log("Approval email result:", { sent: result.success, deduplicated: result.deduplicated, attempts: result.attempts });
    }

    // Submit to IndexNow for instant search engine indexing
    if (facility?.slug) {
      const facilityUrl = `https://rehablookup.com/center/${facility.slug}`;
      try {
        const indexNowResponse = await fetch(
          `${supabaseUrl}/functions/v1/submit-indexnow`,
          {
            method: "POST",
            headers: { ...corsHeaders, "Content-Type": "application/json",
              "Authorization": `Bearer ${supabaseServiceKey}`,
            },
            body: JSON.stringify({ urls: [facilityUrl] }),
          }
        );
        const indexResult = await indexNowResponse.json();
        console.log("IndexNow: Submitted facility URL:", facilityUrl, indexResult);
      } catch (indexError) {
        console.error("IndexNow submission failed (non-blocking):", indexError);
      }
    }

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

    // Enroll provider in 7-day onboarding drip sequence
    try {
      const fullName = [profile.first_name, profile.last_name].filter(Boolean).join(" ") || "Provider";
      await fetch(
        `${supabaseUrl}/functions/v1/process-provider-drip`,
        {
          method: "POST",
          headers: { ...corsHeaders, "Content-Type": "application/json",
            "Authorization": `Bearer ${supabaseServiceKey}`,
          },
          body: JSON.stringify({
            action: "enroll",
            userId,
            facilityId,
            providerName: fullName,
            providerEmail: profile.email,
          }),
        }
      );
      console.log("Provider enrolled in onboarding drip sequence");
    } catch (dripError) {
      console.error("Drip enrollment failed (non-blocking):", dripError);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Approval email sent to ${profile.email}`,
        indexNowSubmitted: !!facility?.slug,
        dripEnrolled: true,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    console.error("Error in send-approval-email function:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
