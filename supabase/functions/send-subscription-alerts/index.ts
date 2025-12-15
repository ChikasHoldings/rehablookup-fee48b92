import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PLAN_CONFIG: Record<string, { lead_limit: number; name: string }> = {
  basic: { lead_limit: 0, name: "Basic" },
  professional: { lead_limit: 25, name: "Professional" },
  featured: { lead_limit: 75, name: "Featured" },
};

const PRODUCT_TO_PLAN: Record<string, string> = {
  "prod_TbalLOPujTIoUe": "professional",
  "prod_TbalOeJZA2ZoJl": "featured",
};

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[SUBSCRIPTION-ALERTS] ${step}${detailsStr}`);
};

serve(async (req) => {
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
        const plan = PRODUCT_TO_PLAN[productId] || "basic";
        const planConfig = PLAN_CONFIG[plan];

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
              
              const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
</head>
<body style="margin: 0; padding: 0; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 20px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; width: 100%;">
          
          <tr>
            <td style="background: linear-gradient(135deg, #1B365D 0%, #2C4A7F 100%); padding: 24px 32px; border-radius: 8px 8px 0 0;">
              <p style="margin: 0; font-size: 11px; color: rgba(255,255,255,0.7); font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">REHABLOOKUP</p>
              <h1 style="margin: 8px 0 0 0; font-size: 22px; color: #ffffff; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-weight: 600;">
                Subscription Renewal
              </h1>
            </td>
          </tr>
          
          <tr>
            <td style="background: #ffffff; padding: 32px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; border-left: 1px solid #e5e7eb; border-right: 1px solid #e5e7eb;">
              
              <p style="margin: 0 0 20px 0; color: #374151; font-size: 15px; line-height: 1.6;">
                Hi ${profile.first_name || "there"},
              </p>
              
              <p style="margin: 0 0 24px 0; color: #374151; font-size: 15px; line-height: 1.6;">
                Your <strong>${planConfig.name}</strong> plan renews in <strong>${days} day${days > 1 ? "s" : ""}</strong> on ${renewalDate}.
              </p>
              
              <p style="margin: 0 0 24px 0; color: #6b7280; font-size: 14px; line-height: 1.6;">
                No action needed if you want to continue. To update your payment method or change plans, visit your billing settings.
              </p>
              
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <a href="https://rehablookup.com/provider/billing" style="display: inline-block; background: #1B365D; color: #ffffff; padding: 14px 32px; border-radius: 6px; text-decoration: none; font-weight: 600; font-size: 15px;">
                      Manage Subscription
                    </a>
                  </td>
                </tr>
              </table>
              
            </td>
          </tr>
          
          <tr>
            <td style="background: #f8fafc; padding: 20px 32px; border-radius: 0 0 8px 8px; border: 1px solid #e5e7eb; border-top: none;">
              <p style="margin: 0; font-size: 12px; color: #6b7280; text-align: center; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                RehabLookup | <a href="https://rehablookup.com/provider/settings" style="color: #1B365D; text-decoration: underline;">Notification settings</a>
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

              const { error: emailError } = await resend.emails.send({
                from: "RehabLookup <noreply@resend.dev>",
                to: [profile.email],
                subject: `Your ${planConfig.name} plan renews in ${days} day${days > 1 ? "s" : ""}`,
                html: emailHtml,
              });

              if (!emailError) {
                await supabaseClient.from("subscription_alerts").insert({
                  user_id: profile.user_id,
                  alert_type: "subscription_expiring",
                  alert_key: alertKey,
                });
                alertsSent.push({ type: `expiry_${days}days`, email: profile.email });
                logStep("Sent expiry alert", { email: profile.email, days });
              } else {
                logStep("Failed to send expiry email", { email: profile.email, error: emailError });
              }
            }
          }
        }

        // Lead limit alerts
        if (planConfig.lead_limit > 0) {
          const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
          
          const { data: facilities } = await supabaseClient
            .from("facilities")
            .select("id")
            .eq("user_id", profile.user_id);

          if (facilities && facilities.length > 0) {
            const facilityIds = facilities.map(f => f.id);
            
            const { count: leadCount } = await supabaseClient
              .from("leads")
              .select("*", { count: "exact", head: true })
              .in("facility_id", facilityIds)
              .gte("created_at", startOfMonth);

            const usagePercent = ((leadCount || 0) / planConfig.lead_limit) * 100;

            logStep("Checking lead usage", { email: profile.email, leadCount, limit: planConfig.lead_limit });

            const thresholds = [
              { percent: 100, key: "reached", subject: "Lead limit reached", isUrgent: true },
              { percent: 90, key: "90percent", subject: "90% of leads used", isUrgent: false },
              { percent: 80, key: "80percent", subject: "80% of leads used", isUrgent: false },
            ];

            for (const threshold of thresholds) {
              if (usagePercent >= threshold.percent) {
                const alertKey = `lead_limit_${threshold.key}_${currentMonth}`;
                
                const { data: existingAlert } = await supabaseClient
                  .from("subscription_alerts")
                  .select("id")
                  .eq("user_id", profile.user_id)
                  .eq("alert_key", alertKey)
                  .single();

                if (!existingAlert) {
                  const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
</head>
<body style="margin: 0; padding: 0; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 20px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; width: 100%;">
          
          <tr>
            <td style="background: ${threshold.isUrgent ? "linear-gradient(135deg, #dc2626 0%, #991b1b 100%)" : "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)"}; padding: 24px 32px; border-radius: 8px 8px 0 0;">
              <p style="margin: 0; font-size: 11px; color: rgba(255,255,255,0.7); font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">REHABLOOKUP</p>
              <h1 style="margin: 8px 0 0 0; font-size: 22px; color: #ffffff; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-weight: 600;">
                ${threshold.subject}
              </h1>
            </td>
          </tr>
          
          <tr>
            <td style="background: #ffffff; padding: 32px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; border-left: 1px solid #e5e7eb; border-right: 1px solid #e5e7eb;">
              
              <p style="margin: 0 0 20px 0; color: #374151; font-size: 15px; line-height: 1.6;">
                Hi ${profile.first_name || "there"},
              </p>
              
              <table width="100%" cellpadding="0" cellspacing="0" style="background: #f8fafc; border-radius: 6px; margin-bottom: 24px;">
                <tr>
                  <td style="padding: 20px; text-align: center;">
                    <p style="margin: 0 0 4px 0; font-size: 28px; font-weight: 600; color: #1B365D;">${leadCount || 0} / ${planConfig.lead_limit}</p>
                    <p style="margin: 0; font-size: 14px; color: #6b7280;">leads used this month</p>
                  </td>
                </tr>
              </table>
              
              ${threshold.isUrgent ? `
              <p style="margin: 0 0 24px 0; color: #991b1b; font-size: 14px; line-height: 1.6;">
                New qualified leads will not be delivered until your limit resets next month or you upgrade your plan.
              </p>
              ` : `
              <p style="margin: 0 0 24px 0; color: #374151; font-size: 15px; line-height: 1.6;">
                Consider upgrading to receive more leads and grow your business.
              </p>
              `}
              
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <a href="https://rehablookup.com/provider/billing" style="display: inline-block; background: #1B365D; color: #ffffff; padding: 14px 32px; border-radius: 6px; text-decoration: none; font-weight: 600; font-size: 15px;">
                      ${threshold.isUrgent ? "Upgrade Now" : "View Plans"}
                    </a>
                  </td>
                </tr>
              </table>
              
            </td>
          </tr>
          
          <tr>
            <td style="background: #f8fafc; padding: 20px 32px; border-radius: 0 0 8px 8px; border: 1px solid #e5e7eb; border-top: none;">
              <p style="margin: 0; font-size: 12px; color: #6b7280; text-align: center; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                RehabLookup | <a href="https://rehablookup.com/provider/settings" style="color: #1B365D; text-decoration: underline;">Notification settings</a>
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

                  const { error: emailError } = await resend.emails.send({
                    from: "RehabLookup <noreply@resend.dev>",
                    to: [profile.email],
                    subject: `${threshold.subject} - ${planConfig.name} Plan`,
                    html: emailHtml,
                  });

                  if (!emailError) {
                    await supabaseClient.from("subscription_alerts").insert({
                      user_id: profile.user_id,
                      alert_type: threshold.isUrgent ? "lead_limit_reached" : "lead_limit_warning",
                      alert_key: alertKey,
                    });
                    alertsSent.push({ type: `lead_${threshold.key}`, email: profile.email });
                    logStep("Sent lead limit alert", { email: profile.email, threshold: threshold.percent });
                  }
                }
                break;
              }
            }
          }
        }
      } catch (userError) {
        logStep("Error processing user", { email: profile.email, error: String(userError) });
      }
    }

    logStep("Completed", { alertsSent: alertsSent.length });

    return new Response(
      JSON.stringify({ 
        success: true, 
        alertsSent,
        message: `Processed ${profiles.length} users, sent ${alertsSent.length} alerts` 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
