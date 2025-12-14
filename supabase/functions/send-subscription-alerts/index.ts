import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Plan configuration
const PLAN_CONFIG: Record<string, { lead_limit: number; name: string }> = {
  basic: { lead_limit: 0, name: "Basic Listing" },
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

    // Get all profiles to check subscriptions
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
        // Check Stripe subscription
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

        logStep("Checking user", { 
          email: profile.email, 
          plan, 
          daysUntilExpiry,
          leadLimit: planConfig.lead_limit 
        });

        // Check subscription expiring alerts (7 days, 3 days, 1 day)
        const expiryAlertDays = [7, 3, 1];
        for (const days of expiryAlertDays) {
          if (daysUntilExpiry === days) {
            const alertKey = `sub_expiry_${days}days_${currentMonth}`;
            
            // Check if alert already sent
            const { data: existingAlert } = await supabaseClient
              .from("subscription_alerts")
              .select("id")
              .eq("user_id", profile.user_id)
              .eq("alert_key", alertKey)
              .single();

            if (!existingAlert) {
              // Send email
              const { error: emailError } = await resend.emails.send({
                from: "RehabLookup <notifications@resend.dev>",
                to: [profile.email],
                subject: `Your ${planConfig.name} subscription renews in ${days} day${days > 1 ? "s" : ""}`,
                html: `
                  <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                    <h2 style="color: #1B365D;">Subscription Renewal Reminder</h2>
                    <p>Hi ${profile.first_name || "there"},</p>
                    <p>Your <strong>${planConfig.name}</strong> subscription will automatically renew in <strong>${days} day${days > 1 ? "s" : ""}</strong> on ${subscriptionEnd.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}.</p>
                    <p>To manage your subscription or update your payment method, visit your billing settings.</p>
                    <div style="margin: 30px 0;">
                      <a href="https://rehablookup.com/provider/billing" style="background-color: #1B365D; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Manage Subscription</a>
                    </div>
                    <p style="color: #666; font-size: 14px;">If you have any questions, please contact our support team.</p>
                    <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;" />
                    <p style="color: #999; font-size: 12px;">RehabLookup - Connecting people with treatment centers</p>
                  </div>
                `,
              });

              if (!emailError) {
                // Record alert sent
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

        // Check lead limit alerts (80%, 90%, 100%)
        if (planConfig.lead_limit > 0) {
          // Get lead count for current month
          const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
          
          // Get facilities for this user
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

            logStep("Checking lead usage", { 
              email: profile.email, 
              leadCount, 
              limit: planConfig.lead_limit,
              usagePercent: usagePercent.toFixed(1) 
            });

            // Check thresholds
            const thresholds = [
              { percent: 100, key: "reached", subject: "Lead limit reached", message: "You've reached your monthly lead limit." },
              { percent: 90, key: "90percent", subject: "90% of lead limit used", message: "You've used 90% of your monthly leads." },
              { percent: 80, key: "80percent", subject: "80% of lead limit used", message: "You've used 80% of your monthly leads." },
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
                  const { error: emailError } = await resend.emails.send({
                    from: "RehabLookup <notifications@resend.dev>",
                    to: [profile.email],
                    subject: `${threshold.subject} - ${planConfig.name} Plan`,
                    html: `
                      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                        <h2 style="color: ${threshold.percent === 100 ? "#dc2626" : "#f59e0b"};">${threshold.subject}</h2>
                        <p>Hi ${profile.first_name || "there"},</p>
                        <p>${threshold.message}</p>
                        <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
                          <p style="margin: 0; font-size: 24px; font-weight: bold; color: #1B365D;">
                            ${leadCount || 0} / ${planConfig.lead_limit} leads
                          </p>
                          <p style="margin: 5px 0 0; color: #666;">used this month</p>
                        </div>
                        ${threshold.percent === 100 ? `
                          <p style="color: #dc2626; font-weight: 500;">New leads will not be delivered until your limit resets or you upgrade your plan.</p>
                        ` : `
                          <p>Consider upgrading your plan to receive more leads and grow your business.</p>
                        `}
                        <div style="margin: 30px 0;">
                          <a href="https://rehablookup.com/provider/billing" style="background-color: #1B365D; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                            ${threshold.percent === 100 ? "Upgrade Now" : "View Plans"}
                          </a>
                        </div>
                        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;" />
                        <p style="color: #999; font-size: 12px;">RehabLookup - Connecting people with treatment centers</p>
                      </div>
                    `,
                  });

                  if (!emailError) {
                    await supabaseClient.from("subscription_alerts").insert({
                      user_id: profile.user_id,
                      alert_type: threshold.percent === 100 ? "lead_limit_reached" : "lead_limit_warning",
                      alert_key: alertKey,
                    });
                    alertsSent.push({ type: `lead_${threshold.key}`, email: profile.email });
                    logStep("Sent lead limit alert", { email: profile.email, threshold: threshold.percent });
                  }
                }
                break; // Only send highest threshold alert
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
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
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
