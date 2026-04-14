import Stripe from "https://esm.sh/stripe@18.5.0";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { sendEmailWithRetry, sleep, BULK_SEND_DELAY_MS, BULK_BATCH_LIMIT } from "../_shared/resilient-email-sender.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface AtRiskProvider {
  facilityId: string;
  facilityName: string;
  email: string;
  contactName: string;
  plan: "free" | "pro";
  riskScore: number;
  riskFactors: string[];
  daysInactive: number;
  leadsUnlocked: number;
  unrespondedLeads: number;
}

// Pro product IDs - includes legacy IDs for backward compatibility
const PRO_PRODUCT_IDS = [
  "prod_pro_monthly",
  "prod_TbalLOPujTIoUe", 
  "prod_Tbyz1bf6iYyzYd",
  "prod_TbalOeJZA2ZoJl", 
  "prod_TbyzJVNOQL71NN",
];

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[RETENTION-OUTREACH] ${step}${detailsStr}`);
};

// Generate personalized email based on risk factors
function generateRetentionEmail(provider: AtRiskProvider): { subject: string; html: string } {
  const primaryRiskFactor = provider.riskFactors[0] || "inactivity";
  const planLabel = provider.plan === "pro" ? "Pro" : "Free";
  
  // Determine primary concern and personalize message
  let headline = "";
  let mainMessage = "";
  let ctaText = "";
  let ctaUrl = "";
  
  if (primaryRiskFactor.includes("No login")) {
    headline = "We've missed you!";
    mainMessage = `
      <p>Hi ${provider.contactName || "there"},</p>
      <p>We noticed you haven't logged into your RehabLookup dashboard in a while. Your ${planLabel} account is still active, and there may be opportunities waiting for you.</p>
      <p>Here's what's been happening while you were away:</p>
      <ul style="color: #4b5563; padding-left: 20px;">
        <li>Your facility profile continues to be visible to those seeking treatment</li>
        <li>You have unlocked <strong>${provider.leadsUnlocked}</strong> leads this month</li>
        ${provider.unrespondedLeads > 0 ? `<li><strong>${provider.unrespondedLeads} lead(s)</strong> are waiting for your response</li>` : ''}
      </ul>
      <p>Log back in today to see what's new and make the most of your account.</p>
    `;
    ctaText = "Log In to Your Dashboard";
    ctaUrl = "https://rehablookup.com/provider/login";
  } else if (primaryRiskFactor.includes("unresponded leads")) {
    headline = "Your leads are waiting";
    mainMessage = `
      <p>Hi ${provider.contactName || "there"},</p>
      <p>You have <strong>${provider.unrespondedLeads} lead(s)</strong> that haven't been contacted yet. These are people actively seeking treatment who chose to reach out to ${provider.facilityName}.</p>
      <p><strong>Quick response times matter:</strong></p>
      <ul style="color: #4b5563; padding-left: 20px;">
        <li>Leads contacted within 24 hours convert at 2x the rate</li>
        <li>Each lead represents someone in need of help</li>
        <li>Your competitors may reach out if you don't</li>
      </ul>
      <p>Take a moment to review your leads and reach out to those still waiting.</p>
    `;
    ctaText = "View Your Leads";
    ctaUrl = "https://rehablookup.com/provider/inquiries";
  } else if (primaryRiskFactor.includes("Low lead")) {
    headline = "Make the most of your account";
    mainMessage = `
      <p>Hi ${provider.contactName || "there"},</p>
      <p>We noticed you haven't unlocked many leads recently. ${provider.plan === "pro" ? "As a Pro member, you get 20% off all lead unlocks!" : ""}</p>
      <p><strong>Here are some tips to attract more leads:</strong></p>
      <ul style="color: #4b5563; padding-left: 20px;">
        <li>Complete your facility profile with photos and detailed descriptions</li>
        <li>Update your services and specializations</li>
        <li>Add insurance providers you accept</li>
        <li>Keep your contact information current</li>
      </ul>
      <p>A complete profile can increase your visibility and lead volume significantly.</p>
    `;
    ctaText = "Update Your Profile";
    ctaUrl = "https://rehablookup.com/provider/listing";
  } else if (primaryRiskFactor.includes("renews in")) {
    headline = "Your subscription is renewing soon";
    mainMessage = `
      <p>Hi ${provider.contactName || "there"},</p>
      <p>Your ${planLabel} subscription will renew soon. We want to make sure you're getting the most value from your account.</p>
      <p><strong>This month's summary:</strong></p>
      <ul style="color: #4b5563; padding-left: 20px;">
        <li>Leads unlocked: <strong>${provider.leadsUnlocked}</strong></li>
        <li>Your facility remains visible to treatment seekers</li>
      </ul>
      <p>If you have any questions about your subscription or need assistance, our team is here to help.</p>
    `;
    ctaText = "View Your Account";
    ctaUrl = "https://rehablookup.com/provider/billing";
  } else {
    headline = "Let's reconnect";
    mainMessage = `
      <p>Hi ${provider.contactName || "there"},</p>
      <p>We wanted to check in and see how things are going with your RehabLookup ${planLabel} account.</p>
      <p>Your facility, <strong>${provider.facilityName}</strong>, continues to be visible to people seeking treatment options. We're committed to helping you connect with those in need.</p>
      <p>Is there anything we can help you with? Our support team is available to assist with:</p>
      <ul style="color: #4b5563; padding-left: 20px;">
        <li>Profile optimization tips</li>
        <li>Lead management best practices</li>
        <li>Questions about your account</li>
      </ul>
    `;
    ctaText = "Contact Support";
    ctaUrl = "https://rehablookup.com/provider/help";
  }

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #1B365D, #2d4a7c); color: white; padding: 32px 24px; border-radius: 12px 12px 0 0; text-align: center; }
          .header-icon { font-size: 48px; margin-bottom: 12px; }
          .content { background: #fff; padding: 32px 24px; border: 1px solid #e5e7eb; border-top: none; }
          .cta-section { text-align: center; padding: 24px 0; }
          .cta-button { display: inline-block; background: #C9A227; color: #1B365D; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 16px; }
          .cta-button:hover { background: #b8911f; }
          .stats-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 20px 0; }
          .stat-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e2e8f0; }
          .stat-row:last-child { border-bottom: none; }
          .stat-label { color: #64748b; }
          .stat-value { font-weight: bold; color: #1e293b; }
          .footer { background: #f9fafb; padding: 24px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px; text-align: center; }
          .footer-text { color: #6b7280; font-size: 12px; margin: 4px 0; }
          .help-link { color: #1B365D; text-decoration: underline; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="header-icon">👋</div>
            <h1 style="margin: 0; font-size: 24px;">${headline}</h1>
          </div>
          <div class="content">
            ${mainMessage}
            
            <div class="stats-card">
              <div class="stat-row">
                <span class="stat-label">Your Plan</span>
                <span class="stat-value">${planLabel}</span>
              </div>
              <div class="stat-row">
                <span class="stat-label">Leads Unlocked This Month</span>
                <span class="stat-value">${provider.leadsUnlocked}</span>
              </div>
              <div class="stat-row">
                <span class="stat-label">Facility</span>
                <span class="stat-value">${provider.facilityName}</span>
              </div>
            </div>

            <div class="cta-section">
              <a href="${ctaUrl}" class="cta-button">${ctaText}</a>
            </div>
          </div>
          <div class="footer">
            <p class="footer-text">Need help? <a href="https://rehablookup.com/provider/help" class="help-link">Contact our support team</a></p>
            <p class="footer-text">You're receiving this because you have an account with RehabLookup.</p>
            <p class="footer-text">RehabLookup • Connecting people with treatment options</p>
          </div>
        </div>
      </body>
    </html>
  `;

  const subject = `${headline} - ${provider.facilityName}`;
  
  return { subject, html };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    const resendKey = Deno.env.get("RESEND_API_KEY");

    if (!stripeKey) {
      logStep("Stripe not configured, skipping");
      return new Response(JSON.stringify({ skipped: true, reason: "Stripe not configured" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!resendKey) {
      throw new Error("RESEND_API_KEY is not configured");
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const resend = new Resend(resendKey);

    // Get all active subscriptions
    const subscriptions = await stripe.subscriptions.list({ status: "active", limit: 100 });
    logStep("Fetched subscriptions", { count: subscriptions.data.length });

    const atRiskProviders: AtRiskProvider[] = [];
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    for (const subscription of subscriptions.data) {
      // Get customer email
      let email: string | null = null;
      if (typeof subscription.customer === "string") {
        try {
          const customer = await stripe.customers.retrieve(subscription.customer);
          if (!('deleted' in customer)) {
            email = customer.email;
          }
        } catch {
          continue;
        }
      }

      if (!email) continue;

      // Get profile and facility
      const { data: profile } = await supabaseClient
        .from("profiles")
        .select("user_id, first_name, last_name")
        .eq("email", email)
        .single();

      if (!profile) continue;

      const { data: facility } = await supabaseClient
        .from("facilities")
        .select("id, name, status, updated_at")
        .eq("user_id", profile.user_id)
        .eq("status", "approved")
        .single();

      if (!facility) continue;

      // Determine plan - simplified to Free/Pro
      const productId = subscription.items.data[0]?.price?.product as string;
      const plan: "free" | "pro" = PRO_PRODUCT_IDS.includes(productId) ? "pro" : "free";

      // Get unlocked leads count this month
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const { count: leadsUnlocked } = await supabaseClient
        .from("lead_unlocks")
        .select("id", { count: "exact", head: true })
        .eq("facility_id", facility.id)
        .gte("unlocked_at", startOfMonth.toISOString());

      // Get last login activity
      const { data: lastActivity } = await supabaseClient
        .from("account_activity_log")
        .select("created_at")
        .eq("user_id", profile.user_id)
        .eq("event_type", "login")
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      // Get unresponded leads count
      const { count: unrespondedLeads } = await supabaseClient
        .from("leads")
        .select("id", { count: "exact", head: true })
        .eq("facility_id", facility.id)
        .eq("status", "new")
        .lt("created_at", sevenDaysAgo.toISOString());

      // Calculate risk factors
      const riskFactors: string[] = [];
      let riskScore = 0;

      const lastLoginDate = lastActivity?.created_at ? new Date(lastActivity.created_at) : null;
      const daysInactive = lastLoginDate 
        ? Math.floor((now.getTime() - lastLoginDate.getTime()) / (24 * 60 * 60 * 1000))
        : 999;

      if (daysInactive > 14) {
        riskScore += 30;
        riskFactors.push(`No login in ${daysInactive} days`);
      } else if (daysInactive > 7) {
        riskScore += 15;
        riskFactors.push(`No login in ${daysInactive} days`);
      }

      if ((unrespondedLeads || 0) >= 3) {
        riskScore += 25;
        riskFactors.push(`${unrespondedLeads} unresponded leads`);
      }

      // Low lead unlock activity
      if ((leadsUnlocked || 0) < 2) {
        riskScore += 20;
        riskFactors.push(`Low lead activity (${leadsUnlocked || 0} unlocked)`);
      }

      const subscriptionEnd = new Date(subscription.current_period_end * 1000);
      const daysUntilRenewal = Math.floor((subscriptionEnd.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
      
      if (daysUntilRenewal <= 7 && daysInactive > 7) {
        riskScore += 25;
        riskFactors.push(`Subscription renews in ${daysUntilRenewal} days`);
      }

      // Only include at-risk providers (score >= 30)
      if (riskScore >= 30) {
        atRiskProviders.push({
          facilityId: facility.id,
          facilityName: facility.name,
          email,
          contactName: `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'Provider',
          plan,
          riskScore,
          riskFactors,
          daysInactive,
          leadsUnlocked: leadsUnlocked || 0,
          unrespondedLeads: unrespondedLeads || 0,
        });
      }
    }

    logStep("At-risk providers identified", { count: atRiskProviders.length });

    // Check which providers haven't received a retention email recently (within 7 days)
    const emailsSent: string[] = [];
    const emailsFailed: string[] = [];

    for (const provider of atRiskProviders) {
      // Check if we already sent a retention email to this provider recently
      const alertKey = `retention_${provider.facilityId}`;
      const sevenDaysAgoStr = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();

      const { data: recentAlert } = await supabaseClient
        .from("subscription_alerts")
        .select("id")
        .eq("alert_key", alertKey)
        .eq("alert_type", "retention_outreach")
        .gte("created_at", sevenDaysAgoStr)
        .single();

      if (recentAlert) {
        logStep("Skipping provider - recent email sent", { email: provider.email });
        continue;
      }

      // Check notification preferences - respect email_product_updates opt-out
      const { data: notifPrefs } = await supabaseClient
        .from("notification_preferences")
        .select("email_product_updates")
        .eq("user_id", (await supabaseClient.from("facilities").select("user_id").eq("id", provider.facilityId).single()).data?.user_id || "")
        .maybeSingle();

      if (notifPrefs?.email_product_updates === false) {
        logStep("Skipping provider - opted out of product updates", { email: provider.email });
        continue;
      }

      // Check suppressed emails
      const { data: suppressed } = await supabaseClient
        .from("suppressed_emails")
        .select("email")
        .eq("email", provider.email)
        .maybeSingle();

      if (suppressed) {
        logStep("Skipping provider - email suppressed", { email: provider.email });
        continue;
      }

      // Generate personalized email
      const { subject, html } = generateRetentionEmail(provider);

      try {
        const unsubToken = crypto.randomUUID();
        const emailResult = await sendEmailWithRetry(supabaseClient, resend, {
          from: "RehabLookup <no-reply@rehablookup.com>",
          to: [provider.email],
          subject,
          html,
          headers: {
            "List-Unsubscribe": `<https://rehablookup.com/unsubscribe?token=${unsubToken}>`,
            "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
          },
        });

        if (emailResult.error) {
          logStep("Failed to send email", { email: provider.email, error: emailResult.error.message });
          emailsFailed.push(provider.email);
          continue;
        }

        // Get the resend email ID for tracking
        const resendId = emailResult.data?.id || null;

        // Record that we sent this email with the resend_id for tracking
        const { data: profileData } = await supabaseClient
          .from("profiles")
          .select("user_id")
          .eq("email", provider.email)
          .single();

        await supabaseClient.from("subscription_alerts").insert({
          alert_type: "retention_outreach",
          alert_key: alertKey,
          user_id: profileData?.user_id || "00000000-0000-0000-0000-000000000000",
          resend_id: resendId,
        });

        emailsSent.push(provider.email);
        logStep("Retention email sent", { email: provider.email, subject });

      } catch (err) {
        logStep("Email send error", { email: provider.email, error: String(err) });
        emailsFailed.push(provider.email);
      }
    }

    // Create admin notification summarizing outreach
    if (emailsSent.length > 0) {
      await supabaseClient.from("admin_notifications").insert({
        type: "retention_outreach",
        title: "Retention Outreach Completed",
        message: `Sent ${emailsSent.length} personalized re-engagement email(s) to at-risk providers.`,
        metadata: {
          emailsSent: emailsSent.length,
          emailsFailed: emailsFailed.length,
          providers: emailsSent,
        },
      });
    }

    return new Response(JSON.stringify({
      success: true,
      atRiskCount: atRiskProviders.length,
      emailsSent: emailsSent.length,
      emailsFailed: emailsFailed.length,
      sentTo: emailsSent,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
