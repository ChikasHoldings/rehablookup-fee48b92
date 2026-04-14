import Stripe from "https://esm.sh/stripe@18.5.0";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { sendEmailWithRetry } from "../_shared/resilient-email-sender.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface AtRiskProvider {
  facilityId: string;
  facilityName: string;
  email: string;
  plan: string;
  riskScore: number;
  riskFactors: string[];
  lastActivity: string | null;
  leadsUsed: number;
  leadLimit: number;
  daysInactive: number;
}

// Pro product IDs - includes legacy IDs for backward compatibility
const PRO_PRODUCT_IDS = [
  "prod_pro_monthly",
  "prod_TbalLOPujTIoUe", 
  "prod_Tbyz1bf6iYyzYd",
  "prod_TbalOeJZA2ZoJl", 
  "prod_TbyzJVNOQL71NN",
];

// Plan configuration for the new monetization model
// Free: 1 facility, pay-per-unlock
// Pro ($399/mo): 5 facilities, 20% discount on unlocks
const getPlanConfig = (productId: string | null): { facility_limit: number; name: string; unlock_discount: number } => {
  if (productId && PRO_PRODUCT_IDS.includes(productId)) {
    return { facility_limit: 5, name: "Pro", unlock_discount: 20 };
  }
  return { facility_limit: 1, name: "Free", unlock_discount: 0 };
};

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[PROVIDER-HEALTH] ${step}${detailsStr}`);
};

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

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const resend = resendKey ? new Resend(resendKey) : null;

    // Get all active subscriptions
    const subscriptions = await stripe.subscriptions.list({ status: "active", limit: 100 });
    logStep("Fetched subscriptions", { count: subscriptions.data.length });

    const atRiskProviders: AtRiskProvider[] = [];
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

    for (const subscription of subscriptions.data) {
      const customerEmail = typeof subscription.customer === "string" 
        ? null 
        : (subscription.customer as Stripe.Customer)?.email;
      
      // Get customer email if not expanded
      let email = customerEmail;
      if (!email && typeof subscription.customer === "string") {
        try {
          const customer = await stripe.customers.retrieve(subscription.customer);
          if (!('deleted' in customer)) {
            email = customer.email;
          }
        } catch {
          logStep("Could not retrieve customer", { customerId: subscription.customer });
          continue;
        }
      }

      if (!email) continue;

      // Get facility for this provider
      const { data: profile } = await supabaseClient
        .from("profiles")
        .select("user_id, first_name, last_name")
        .eq("email", email)
        .single();

      if (!profile) continue;

      const { data: facility } = await supabaseClient
        .from("facilities")
        .select("id, name, status, suspended, updated_at")
        .eq("user_id", profile.user_id)
        .eq("status", "approved")
        .single();

      if (!facility) continue;

      // Determine plan using the new monetization model
      const productId = subscription.items.data[0]?.price?.product as string;
      const planConfig = getPlanConfig(productId);

      // Get lead count this month
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const { count: leadsThisMonth } = await supabaseClient
        .from("leads")
        .select("id", { count: "exact", head: true })
        .eq("facility_id", facility.id)
        .eq("qualified", true)
        .gte("created_at", startOfMonth.toISOString());

      // Get last lead activity
      const { data: lastLead } = await supabaseClient
        .from("leads")
        .select("created_at, status")
        .eq("facility_id", facility.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

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

      // Factor 1: Days since last login
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

      // Factor 2: Unresponded leads
      if ((unrespondedLeads || 0) >= 5) {
        riskScore += 25;
        riskFactors.push(`${unrespondedLeads} unresponded leads older than 7 days`);
      } else if ((unrespondedLeads || 0) >= 3) {
        riskScore += 15;
        riskFactors.push(`${unrespondedLeads} unresponded leads older than 7 days`);
      }

      // Factor 3: Low lead unlock activity (new pay-per-unlock model)
      // Check if provider has received leads but hasn't unlocked many
      const { count: totalLeadsReceived } = await supabaseClient
        .from("leads")
        .select("id", { count: "exact", head: true })
        .eq("facility_id", facility.id)
        .gte("created_at", startOfMonth.toISOString());
      
      const { count: unlockedLeads } = await supabaseClient
        .from("lead_unlocks")
        .select("id", { count: "exact", head: true })
        .eq("facility_id", facility.id)
        .gte("created_at", startOfMonth.toISOString());
      
      const unlockRate = (totalLeadsReceived || 0) > 0 
        ? ((unlockedLeads || 0) / (totalLeadsReceived || 1)) * 100 
        : 0;
      
      if ((totalLeadsReceived || 0) >= 3 && unlockRate < 20) {
        riskScore += 20;
        riskFactors.push(`Low lead unlock rate (${unlockRate.toFixed(0)}% of ${totalLeadsReceived} leads)`);
      }

      // Factor 4: Subscription nearing end without renewal signals
      const subscriptionEnd = new Date(subscription.current_period_end * 1000);
      const daysUntilRenewal = Math.floor((subscriptionEnd.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
      
      if (daysUntilRenewal <= 7 && daysInactive > 7) {
        riskScore += 25;
        riskFactors.push(`Subscription renews in ${daysUntilRenewal} days but inactive`);
      }

      // Factor 5: Profile not updated recently
      const facilityUpdated = facility.updated_at ? new Date(facility.updated_at) : null;
      if (facilityUpdated && facilityUpdated < fourteenDaysAgo) {
        const daysSinceUpdate = Math.floor((now.getTime() - facilityUpdated.getTime()) / (24 * 60 * 60 * 1000));
        if (daysSinceUpdate > 30) {
          riskScore += 10;
          riskFactors.push(`Profile not updated in ${daysSinceUpdate} days`);
        }
      }

      // Only flag as at-risk if score is above threshold
      if (riskScore >= 30) {
        atRiskProviders.push({
          facilityId: facility.id,
          facilityName: facility.name,
          email,
          plan: planConfig.name,
          riskScore,
          riskFactors,
          lastActivity: lastActivity?.created_at || null,
          leadsUsed: leadsThisMonth || 0,
          leadLimit: planConfig.facility_limit,
          daysInactive,
        });
      }
    }

    // Sort by risk score descending
    atRiskProviders.sort((a, b) => b.riskScore - a.riskScore);

    logStep("At-risk providers identified", { count: atRiskProviders.length });

    // Store at-risk providers data for dashboard
    // Check if we should send alert (daily limit)
    const today = new Date().toISOString().split("T")[0];
    const alertKey = `provider_health_${today}`;

    const { data: existingAlert } = await supabaseClient
      .from("subscription_alerts")
      .select("id")
      .eq("alert_key", alertKey)
      .eq("alert_type", "provider_health")
      .single();

    // Send email alert if there are high-risk providers and we haven't alerted today
    if (atRiskProviders.length > 0 && !existingAlert && resend) {
      const highRiskProviders = atRiskProviders.filter(p => p.riskScore >= 50);
      
      if (highRiskProviders.length > 0) {
        // Get admin users with subscription change notifications enabled
        const { data: adminRoles } = await supabaseClient
          .from("user_roles")
          .select("user_id")
          .eq("role", "admin");

        if (adminRoles && adminRoles.length > 0) {
          // Get admin profiles with notification preferences
          const { data: adminProfiles } = await supabaseClient
            .from("admin_user_profiles")
            .select("user_id, notify_subscription_changes")
            .in("user_id", adminRoles.map(r => r.user_id));

          // Filter admins who have notify_subscription_changes enabled (default true)
          const eligibleAdminIds = adminRoles
            .filter(role => {
              const profile = adminProfiles?.find(p => p.user_id === role.user_id);
              return !profile || profile.notify_subscription_changes !== false;
            })
            .map(r => r.user_id);

          if (eligibleAdminIds.length > 0) {
            const adminEmails: string[] = [];
            for (const userId of eligibleAdminIds) {
              const { data: userData } = await supabaseClient.auth.admin.getUserById(userId);
              if (userData?.user?.email) {
                adminEmails.push(userData.user.email);
              }
            }

            if (adminEmails.length > 0) {
              const emailHtml = `
                <!DOCTYPE html>
                <html>
                  <head>
                    <style>
                      body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                      .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                      .header { background-color: #1B365D; background: #1B365D; color: white; padding: 24px; border-radius: 12px 12px 0 0; text-align: center; }
                      .content { background: #fff; padding: 24px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px; }
                      .provider-card { background-color: #fffbeb; border: 1px solid #fcd34d; border-radius: 8px; padding: 16px; margin: 12px 0; }
                      .risk-badge { display: inline-block; background: #dc2626; color: white; padding: 2px 8px; border-radius: 4px; font-size: 12px; font-weight: bold; }
                      .risk-medium { background: #f59e0b; }
                      .factor-list { margin: 8px 0; padding-left: 20px; }
                      .factor-item { color: #6b7280; font-size: 13px; margin: 4px 0; }
                      .cta-button { display: inline-block; background: #1B365D; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; margin-top: 16px; }
                      .footer { text-align: center; margin-top: 24px; color: #6b7280; font-size: 12px; }
                    </style>
                  </head>
                  <body>
                    <div class="container">
                      <div class="header">
                        <h1 style="margin: 0; font-size: 24px;">⚠️ Provider Health Alert</h1>
                        <p style="margin: 8px 0 0 0; opacity: 0.9;">${highRiskProviders.length} provider(s) showing signs of churn risk</p>
                      </div>
                      <div class="content">
                        <p>The following providers have been flagged as at-risk based on their usage patterns:</p>
                        
                        ${highRiskProviders.slice(0, 5).map(p => `
                          <div class="provider-card">
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                              <strong>${p.facilityName}</strong>
                              <span class="risk-badge ${p.riskScore < 70 ? 'risk-medium' : ''}">Risk: ${p.riskScore}</span>
                            </div>
                            <div style="color: #6b7280; font-size: 13px; margin-bottom: 8px;">
                              ${p.email} • ${p.plan} Plan
                            </div>
                            <ul class="factor-list">
                              ${p.riskFactors.map(f => `<li class="factor-item">${f}</li>`).join('')}
                            </ul>
                          </div>
                        `).join('')}
                        
                        ${highRiskProviders.length > 5 ? `
                          <p style="color: #6b7280; font-size: 13px; text-align: center;">
                            + ${highRiskProviders.length - 5} more at-risk providers
                          </p>
                        ` : ''}

                        <p style="color: #4b5563; margin-top: 16px;">
                          <strong>Recommended Actions:</strong>
                        </p>
                        <ul style="color: #4b5563; margin: 0; padding-left: 20px;">
                          <li>Reach out to high-risk providers personally</li>
                          <li>Offer assistance with lead management</li>
                          <li>Consider retention incentives for at-risk accounts</li>
                        </ul>

                        <div style="text-align: center;">
                          <a href="https://rehablookup.com/admin/subscriptions" class="cta-button">
                            View At-Risk Providers
                          </a>
                        </div>
                      </div>
                      <div class="footer">
                        <p>This is an automated alert from RehabLookup Admin. You can manage notification preferences in your profile settings.</p>
                      </div>
                    </div>
                  </body>
                </html>
              `;

              try {
                await resend.emails.send({
                  from: "RehabLookup Admin <no-reply@rehablookup.com>",
                  to: adminEmails,
                  subject: `⚠️ ${highRiskProviders.length} Provider(s) At Risk of Churning`,
                  html: emailHtml,
                });

                logStep("Alert email sent", { adminCount: adminEmails.length });

                // Record that we sent this alert
                await supabaseClient.from("subscription_alerts").insert({
                  alert_type: "provider_health",
                  alert_key: alertKey,
                  user_id: adminRoles[0].user_id,
                });
              } catch (emailError) {
                logStep("Failed to send email", { error: String(emailError) });
              }
            }
          } else {
            logStep("No admins have subscription change notifications enabled");
          }
        }
      }
    }

    // Create admin notification for high-risk providers
    if (atRiskProviders.length > 0) {
      const highRiskCount = atRiskProviders.filter(p => p.riskScore >= 50).length;
      
      if (highRiskCount > 0 && !existingAlert) {
        await supabaseClient.from("admin_notifications").insert({
          type: "provider_health",
          title: "At-Risk Providers Detected",
          message: `${highRiskCount} provider(s) showing signs of potential churn. Review the subscriptions dashboard for details.`,
          metadata: { 
            atRiskCount: atRiskProviders.length,
            highRiskCount,
            topRiskFactors: atRiskProviders.slice(0, 3).flatMap(p => p.riskFactors),
          },
        });
      }
    }

    return new Response(JSON.stringify({
      success: true,
      atRiskProviders,
      totalChecked: subscriptions.data.length,
      alertSent: !existingAlert && atRiskProviders.filter(p => p.riskScore >= 50).length > 0,
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
