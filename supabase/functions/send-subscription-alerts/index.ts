import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { Resend } from "https://esm.sh/resend@2.0.0";
import {
  PLAN_CONFIG,
  PRO_PRODUCT_IDS,
  getPlanStyles,
  emailStart,
  emailEnd,
  emailHeader,
  emailBodyStart,
  emailBodyEnd,
  emailGreeting,
  emailParagraph,
  proInsightsBox,
  ctaButton,
  type PlanType,
} from "../_shared/email-templates.ts";
import { sendEmailWithRetry, sleep, BULK_SEND_DELAY_MS } from "../_shared/resilient-email-sender.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[SUBSCRIPTION-ALERTS] ${step}${detailsStr}`);
};

function generateRenewalEmail(
  firstName: string,
  plan: PlanType,
  days: number,
  renewalDate: string
): string {
  const isPro = plan === 'pro';
  const planName = isPro ? "Pro" : "Free";
  
  const proInsights = isPro 
    ? proInsightsBox('Your 20% discount on lead unlocks and priority search visibility will continue after renewal.')
    : '';

  return `
${emailStart()}
${emailHeader('Subscription Renewal', plan)}
${emailBodyStart()}
              ${emailGreeting(firstName)}
              ${emailParagraph(`Your <strong>${planName}</strong> subscription renews in <strong>${days} day${days > 1 ? "s" : ""}</strong> on ${renewalDate}.`)}
              
              ${proInsights}
              
              ${emailParagraph('No action needed if you want to continue. To update your payment method or cancel, visit your billing settings.')}
              
              ${ctaButton('Manage Subscription', 'https://rehablookup.com/provider/billing', plan)}
${emailBodyEnd()}
              <tr>
                <td style="background: #f8fafc; padding: 20px 32px; border-radius: 0 0 12px 12px; border: 1px solid #e5e7eb; border-top: none;">
                  <p style="margin: 0; font-size: 12px; color: #6b7280; text-align: center; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                    RehabLookup | <a href="https://rehablookup.com/provider/settings" style="color: #1B365D; text-decoration: underline;">Notification settings</a>
                  </p>
                </td>
              </tr>
${emailEnd()}
  `;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");
    if (!resendApiKey) throw new Error("RESEND_API_KEY is not set");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const resend = new Resend(resendApiKey);

    const { data: profiles, error: profilesError } = await supabaseClient
      .from("profiles")
      .select("user_id, email, first_name, last_name");

    if (profilesError) throw new Error(`Failed to fetch profiles: ${profilesError.message}`);
    if (!profiles || profiles.length === 0) {
      logStep("No profiles found");
      return new Response(JSON.stringify({ message: "No profiles to check" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    logStep("Found profiles", { count: profiles.length });

    const alertsSent: { type: string; email: string }[] = [];
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

    for (const profile of profiles) {
      try {
        const customers = await stripe.customers.list({ email: profile.email, limit: 1 });
        if (customers.data.length === 0) continue;

        const customerId = customers.data[0].id;
        const subscriptions = await stripe.subscriptions.list({
          customer: customerId,
          status: "active",
          limit: 1,
        });

        if (subscriptions.data.length === 0) continue;

        const subscription = subscriptions.data[0];
        const subscriptionEnd = new Date(subscription.current_period_end * 1000);
        const daysUntilExpiry = Math.ceil((subscriptionEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        const productId = subscription.items.data[0].price.product as string;
        
        // Determine plan - any subscription is now "Pro"
        const isPro = PRO_PRODUCT_IDS.includes(productId) || true; // Any active subscription = Pro
        const plan: PlanType = isPro ? 'pro' : 'free';

        logStep("Checking user", { email: profile.email, plan, daysUntilExpiry });

        // Subscription renewal alerts
        const expiryAlertDays = [7, 3, 1];
        for (const days of expiryAlertDays) {
          if (daysUntilExpiry === days) {
            const alertKey = `sub_expiry_${days}days_${currentMonth}`;
            
            const { data: existingAlert } = await supabaseClient
              .from("subscription_alerts")
              .select("id")
              .eq("user_id", profile.user_id)
              .eq("alert_key", alertKey)
              .single();

            if (!existingAlert) {
              const renewalDate = subscriptionEnd.toLocaleDateString("en-US", { month: "long", day: "numeric" });
              
              const emailHtml = generateRenewalEmail(
                profile.first_name || "there",
                plan,
                days,
                renewalDate
              );

              const subjectPrefix = plan === "pro" ? "⭐ " : "";
              const planName = plan === "pro" ? "Pro" : "Free";
              
              const { error: emailError } = await sendEmailWithRetry(supabaseClient, resend, {
                from: "RehabLookup <no-reply@rehablookup.com>",
                to: [profile.email],
                subject: `${subjectPrefix}Your ${planName} subscription renews in ${days} day${days > 1 ? "s" : ""}`,
                html: emailHtml,
              }, { emailType: "subscription_alert", idempotencyKey: alertKey });

              if (!emailError) {
                await supabaseClient.from("subscription_alerts").insert({
                  user_id: profile.user_id,
                  alert_type: "subscription_expiring",
                  alert_key: alertKey,
                });

                // Create in-app provider notification
                await supabaseClient.from("provider_notifications").insert({
                  user_id: profile.user_id,
                  type: "subscription_renewal",
                  title: `Subscription Renews in ${days} Day${days > 1 ? "s" : ""}`,
                  message: `Your ${plan === "pro" ? "Pro" : ""} subscription renews on ${renewalDate}.`,
                  metadata: { link: "/provider/billing" },
                });

                alertsSent.push({ type: `expiry_${days}days`, email: profile.email });
                logStep("Sent expiry alert", { email: profile.email, days });
                await sleep(BULK_SEND_DELAY_MS);
              } else {
                logStep("Failed to send expiry email", { email: profile.email, error: emailError });
              }
            }
          }
        }

      } catch (userError) {
        logStep("Error processing user", { email: profile.email, error: userError });
      }
    }

    logStep("Completed", { alertsSent: alertsSent.length });

    return new Response(
      JSON.stringify({ success: true, alerts_sent: alertsSent }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
