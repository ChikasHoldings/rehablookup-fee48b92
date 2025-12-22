import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { Resend } from "https://esm.sh/resend@2.0.0";
import {
  PLAN_CONFIG,
  PRODUCT_TO_PLAN,
  getPlanStyles,
  emailStart,
  emailEnd,
  emailHeader,
  emailBodyStart,
  emailBodyEnd,
  emailGreeting,
  emailParagraph,
  featuredInsightsBox,
  ctaButton,
  type PlanType,
} from "../_shared/email-templates.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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
  const planConfig = PLAN_CONFIG[plan];
  const isFeatured = plan === 'featured';
  
  const featuredBenefits = isFeatured 
    ? featuredInsightsBox('Priority placement, exclusive leads, and premium visibility will continue after renewal.')
    : '';

  return `
${emailStart()}
${emailHeader('Subscription Renewal', plan)}
${emailBodyStart()}
              ${emailGreeting(firstName)}
              ${emailParagraph(`Your <strong>${planConfig.name}</strong> plan renews in <strong>${days} day${days > 1 ? "s" : ""}</strong> on ${renewalDate}.`)}
              
              ${featuredBenefits}
              
              ${emailParagraph('No action needed if you want to continue. To update your payment method or change plans, visit your billing settings.')}
              
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

function generateLeadLimitEmail(
  firstName: string,
  plan: PlanType,
  threshold: { percent: number; key: string; subject: string; isUrgent: boolean },
  leadCount: number
): string {
  const planConfig = PLAN_CONFIG[plan];
  const isFeatured = plan === 'featured';
  const isProfessional = plan === 'professional';
  const styles = getPlanStyles(plan, { isUrgent: threshold.isUrgent });

  // For Featured providers at limit, show different messaging
  let limitMessage = '';
  if (threshold.isUrgent) {
    if (isFeatured) {
      limitMessage = `<p style="margin: 0 0 24px 0; color: #7c3aed; font-size: 14px; line-height: 1.6;">
        You've maximized your lead allocation for this month! Your leads will reset at the start of next month.
      </p>`;
    } else if (isProfessional) {
      limitMessage = `<p style="margin: 0 0 24px 0; color: #1B365D; font-size: 14px; line-height: 1.6;">
        You've used all your leads for this month. Consider upgrading to Featured for priority placement and exclusive leads.
      </p>`;
    } else {
      limitMessage = `<p style="margin: 0 0 24px 0; color: #991b1b; font-size: 14px; line-height: 1.6;">
        New qualified leads will not be delivered until your limit resets next month or you upgrade your plan.
      </p>`;
    }
  } else {
    limitMessage = emailParagraph(isFeatured || isProfessional 
      ? "You're making great progress this month!" 
      : "Consider upgrading to receive more leads and grow your business.");
  }

  // CTA button - don't show upgrade for Featured
  const ctaText = isFeatured 
    ? 'View Your Leads'
    : (threshold.isUrgent && !isProfessional ? 'Upgrade Now' : 'View Plans');
  const ctaUrl = isFeatured 
    ? 'https://rehablookup.com/provider/leads'
    : 'https://rehablookup.com/provider/billing';

  return `
${emailStart()}
${emailHeader(threshold.subject, plan, { isUrgent: threshold.isUrgent })}
${emailBodyStart()}
              ${emailGreeting(firstName)}
              
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background: #f8fafc; border-radius: 6px; margin-bottom: 24px;">
                <tr>
                  <td style="padding: 20px; text-align: center;">
                    <p style="margin: 0 0 4px 0; font-size: 28px; font-weight: 600; color: ${isFeatured ? '#7c3aed' : '#1B365D'};">${leadCount} / ${planConfig.lead_limit}</p>
                    <p style="margin: 0; font-size: 14px; color: #6b7280;">leads used this month</p>
                  </td>
                </tr>
              </table>
              
              ${limitMessage}
              
              ${ctaButton(ctaText, ctaUrl, plan)}
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
        const plan = (PRODUCT_TO_PLAN[productId] || "basic") as PlanType;
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
              
              const emailHtml = generateRenewalEmail(
                profile.first_name || "there",
                plan,
                days,
                renewalDate
              );

              const subjectPrefix = plan === "featured" ? "⭐ " : "";
              
              const { error: emailError } = await resend.emails.send({
                from: "RehabLookup <no-reply@rehablookup.com>",
                to: [profile.email],
                subject: `${subjectPrefix}Your ${planConfig.name} plan renews in ${days} day${days > 1 ? "s" : ""}`,
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
                  const emailHtml = generateLeadLimitEmail(
                    profile.first_name || "there",
                    plan,
                    threshold,
                    leadCount || 0
                  );

                  const subjectPrefix = plan === "featured" ? "⭐ " : "";

                  const { error: emailError } = await resend.emails.send({
                    from: "RehabLookup <no-reply@rehablookup.com>",
                    to: [profile.email],
                    subject: `${subjectPrefix}${threshold.subject}`,
                    html: emailHtml,
                  });

                  if (!emailError) {
                    await supabaseClient.from("subscription_alerts").insert({
                      user_id: profile.user_id,
                      alert_type: "lead_limit",
                      alert_key: alertKey,
                    });
                    alertsSent.push({ type: threshold.key, email: profile.email });
                    logStep("Sent lead limit alert", { email: profile.email, threshold: threshold.key });
                  } else {
                    logStep("Failed to send lead limit email", { email: profile.email, error: emailError });
                  }
                }
                break;
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
