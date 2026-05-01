import Stripe from "https://esm.sh/stripe@18.5.0?target=denonext";
import { Resend } from "https://esm.sh/resend@2.0.0?target=denonext";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2?target=denonext";
import { sendEmailWithRetry } from "../_shared/resilient-email-sender.ts";

const VERSION = "1.0.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const CHURN_THRESHOLD = 10;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    const resendKey = Deno.env.get("RESEND_API_KEY");
    
    if (!stripeKey) {
      console.log("Stripe not configured, skipping churn check");
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

    // Calculate churn rate for last 30 days
    const thirtyDaysAgo = Math.floor(Date.now() / 1000) - 30 * 24 * 60 * 60;
    
    const [activeSubscriptions, canceledSubscriptions] = await Promise.all([
      stripe.subscriptions.list({ status: "active", limit: 100 }),
      stripe.subscriptions.list({ 
        status: "canceled", 
        created: { gte: thirtyDaysAgo },
        limit: 100 
      }),
    ]);

    const totalActive = activeSubscriptions.data.length;
    const totalCanceled = canceledSubscriptions.data.length;
    const totalAtStart = totalActive + totalCanceled;
    const churnRate = totalAtStart > 0 ? (totalCanceled / totalAtStart) * 100 : 0;

    console.log(`Churn check: ${churnRate.toFixed(2)}% (${totalCanceled} canceled / ${totalAtStart} total)`);

    // Check if we already sent an alert this week
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    
    const alertKey = `churn_alert_${new Date().toISOString().split('T')[0].substring(0, 7)}`; // Monthly key
    
    const { data: existingAlert } = await supabaseClient
      .from("subscription_alerts")
      .select("id")
      .eq("alert_key", alertKey)
      .eq("alert_type", "high_churn")
      .single();

    if (existingAlert) {
      console.log("Alert already sent this month, skipping");
      return new Response(JSON.stringify({ 
        skipped: true, 
        reason: "Alert already sent this month",
        churnRate: churnRate.toFixed(2)
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (churnRate <= CHURN_THRESHOLD) {
      console.log(`Churn rate ${churnRate.toFixed(2)}% is below threshold ${CHURN_THRESHOLD}%`);
      return new Response(JSON.stringify({ 
        alertSent: false, 
        churnRate: churnRate.toFixed(2),
        threshold: CHURN_THRESHOLD
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get admin emails
    const { data: adminRoles } = await supabaseClient
      .from("user_roles")
      .select("user_id")
      .eq("role", "admin");

    if (!adminRoles || adminRoles.length === 0) {
      console.log("No admin users found");
      return new Response(JSON.stringify({ error: "No admin users found" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    // Get admin emails from profiles
    const { data: adminProfiles } = await supabaseClient
      .from("profiles")
      .select("email, first_name")
      .in("user_id", adminRoles.map(r => r.user_id));

    if (!adminProfiles || adminProfiles.length === 0) {
      console.log("No admin profiles found");
      return new Response(JSON.stringify({ error: "No admin profiles found" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    // Get recently canceled subscription details
    const canceledDetails = canceledSubscriptions.data.slice(0, 5).map((sub: Stripe.Subscription) => ({
      email: sub.customer as string,
      canceledAt: new Date((sub.canceled_at || 0) * 1000).toLocaleDateString(),
    }));

    // Send alert email to all admins
    const adminEmails = adminProfiles.map(p => p.email);
    
    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .alert-header { background: linear-gradient(135deg, #dc2626, #b91c1c); color: white; padding: 24px; border-radius: 12px 12px 0 0; text-align: center; }
            .alert-icon { font-size: 48px; margin-bottom: 12px; }
            .content { background: #fff; padding: 24px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px; }
            .metric-card { background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 16px; margin: 16px 0; text-align: center; }
            .metric-value { font-size: 36px; font-weight: bold; color: #dc2626; }
            .metric-label { color: #991b1b; font-size: 14px; }
            .stats-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin: 16px 0; }
            .stat-box { background: #f9fafb; padding: 12px; border-radius: 8px; text-align: center; }
            .stat-value { font-size: 24px; font-weight: bold; color: #1f2937; }
            .stat-label { font-size: 12px; color: #6b7280; }
            .canceled-list { background: #f9fafb; border-radius: 8px; padding: 16px; margin: 16px 0; }
            .canceled-item { padding: 8px 0; border-bottom: 1px solid #e5e7eb; }
            .canceled-item:last-child { border-bottom: none; }
            .cta-button { display: inline-block; background: #1B365D; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; margin-top: 16px; }
            .footer { text-align: center; margin-top: 24px; color: #6b7280; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="alert-header">
              <div class="alert-icon">⚠️</div>
              <h1 style="margin: 0; font-size: 24px;">High Churn Rate Alert</h1>
              <p style="margin: 8px 0 0 0; opacity: 0.9;">Provider churn has exceeded the ${CHURN_THRESHOLD}% threshold</p>
            </div>
            <div class="content">
              <div class="metric-card">
                <div class="metric-value">${churnRate.toFixed(1)}%</div>
                <div class="metric-label">Current Churn Rate (Last 30 Days)</div>
              </div>
              
              <div class="stats-grid">
                <div class="stat-box">
                  <div class="stat-value">${totalCanceled}</div>
                  <div class="stat-label">Cancellations</div>
                </div>
                <div class="stat-box">
                  <div class="stat-value">${totalActive}</div>
                  <div class="stat-label">Active Subscriptions</div>
                </div>
              </div>

              ${canceledDetails.length > 0 ? `
                <div class="canceled-list">
                  <h3 style="margin: 0 0 12px 0; font-size: 14px; color: #374151;">Recent Cancellations</h3>
                  ${canceledDetails.map((c: { email: string; canceledAt: string }) => `
                    <div class="canceled-item">
                      <span style="color: #1f2937;">${c.email}</span>
                      <span style="color: #9ca3af; float: right;">${c.canceledAt}</span>
                    </div>
                  `).join('')}
                </div>
              ` : ''}

              <p style="color: #4b5563;">
                <strong>Recommended Actions:</strong>
              </p>
              <ul style="color: #4b5563; margin: 0; padding-left: 20px;">
                <li>Review recent cancellation reasons</li>
                <li>Reach out to at-risk providers</li>
                <li>Consider retention incentives</li>
                <li>Analyze feature usage patterns</li>
              </ul>

              <div style="text-align: center;">
                <a href="https://rehablookup.com/admin/subscriptions" class="cta-button">
                  View Subscriptions Dashboard
                </a>
              </div>
            </div>
            <div class="footer">
              <p>This is an automated alert from RehabLookup Admin</p>
              <p>You're receiving this because churn rate exceeded ${CHURN_THRESHOLD}%</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const { error: emailError } = await sendEmailWithRetry(supabaseClient, resend, {
      from: "RehabLookup Admin <no-reply@rehablookup.com>",
      to: adminEmails,
      subject: `⚠️ High Churn Alert: ${churnRate.toFixed(1)}% churn rate detected`,
      html: emailHtml,
    });

    if (emailError) {
      console.error("Failed to send email:", emailError);
      throw new Error(`Email send failed: ${emailError}`);
    }

    // Record that we sent this alert
    await supabaseClient.from("subscription_alerts").insert({
      alert_type: "high_churn",
      alert_key: alertKey,
      user_id: adminRoles[0].user_id, // Use first admin as reference
    });

    // Create admin notification
    await supabaseClient.from("admin_notifications").insert({
      type: "churn_alert",
      title: "High Churn Rate Detected",
      message: `Provider churn rate has reached ${churnRate.toFixed(1)}%, exceeding the ${CHURN_THRESHOLD}% threshold. ${totalCanceled} subscriptions canceled in the last 30 days.`,
      metadata: { churnRate, totalCanceled, totalActive, threshold: CHURN_THRESHOLD },
    });

    console.log(`Churn alert sent to ${adminEmails.length} admins`);

    return new Response(JSON.stringify({ 
      alertSent: true, 
      churnRate: churnRate.toFixed(2),
      threshold: CHURN_THRESHOLD,
      adminCount: adminEmails.length
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Error in check-churn-alerts:", errorMessage);
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
