import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";
import Stripe from "https://esm.sh/stripe@18.5.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Plan configuration matching check-subscription
const PLAN_CONFIG: Record<string, { product_id: string | null; lead_limit: number }> = {
  basic: { product_id: null, lead_limit: 4 },
  professional: { product_id: "prod_TbalLOPujTIoUe", lead_limit: 25 },
  featured: { product_id: "prod_TbalOeJZA2ZoJl", lead_limit: 75 },
};

interface ProviderDigestInfo {
  user_id: string;
  lead_notification_frequency: string;
  digest_time: string;
  last_digest_sent_at: string | null;
  email: string;
  first_name: string;
}

interface Lead {
  id: string;
  name: string;
  email: string;
  phone: string;
  preferred_contact: string;
  message: string | null;
  created_at: string;
  facility_name: string;
}

// Get provider's subscription plan
async function getProviderPlan(providerEmail: string): Promise<{ planName: string; leadLimit: number; usedLeads: number }> {
  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
  
  if (!stripeKey) {
    return { planName: "basic", leadLimit: PLAN_CONFIG.basic.lead_limit, usedLeads: 0 };
  }

  try {
    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const customers = await stripe.customers.list({ email: providerEmail, limit: 1 });
    
    if (customers.data.length === 0) {
      return { planName: "basic", leadLimit: PLAN_CONFIG.basic.lead_limit, usedLeads: 0 };
    }

    const customerId = customers.data[0].id;
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "active",
      limit: 1,
    });

    if (subscriptions.data.length === 0) {
      return { planName: "basic", leadLimit: PLAN_CONFIG.basic.lead_limit, usedLeads: 0 };
    }

    const productId = subscriptions.data[0].items.data[0].price.product as string;
    
    if (productId === PLAN_CONFIG.professional.product_id) {
      return { planName: "professional", leadLimit: PLAN_CONFIG.professional.lead_limit, usedLeads: 0 };
    } else if (productId === PLAN_CONFIG.featured.product_id) {
      return { planName: "featured", leadLimit: PLAN_CONFIG.featured.lead_limit, usedLeads: 0 };
    }
    
    return { planName: "basic", leadLimit: PLAN_CONFIG.basic.lead_limit, usedLeads: 0 };
  } catch (error) {
    console.error("Error checking subscription:", error);
    return { planName: "basic", leadLimit: PLAN_CONFIG.basic.lead_limit, usedLeads: 0 };
  }
}

// Tier-based styling configuration
function getPlanConfig(planName: string) {
  const configs = {
    basic: {
      headerGradient: "linear-gradient(135deg, #6b7280 0%, #4b5563 100%)",
      headerEmoji: "📊",
      planBadge: "",
      tipMessage: "💡 Upgrade to Professional for priority support and 25 qualified leads/month",
      tipBg: "#f3f4f6",
      tipBorder: "#d1d5db",
      tipText: "#374151",
      leadBorderColor: "#6b7280",
      showUpgrade: true,
    },
    professional: {
      headerGradient: "linear-gradient(135deg, #1B365D 0%, #2C4A7F 100%)",
      headerEmoji: "🎯",
      planBadge: '<span style="background: #dbeafe; color: #1e40af; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600;">Professional</span>',
      tipMessage: "⚡ Pro tip: Follow up within 5 minutes to increase conversion by 400%!",
      tipBg: "#dcfce7",
      tipBorder: "#bbf7d0",
      tipText: "#166534",
      leadBorderColor: "#1B365D",
      showUpgrade: true,
    },
    featured: {
      headerGradient: "linear-gradient(135deg, #C9A227 0%, #b8860b 100%)",
      headerEmoji: "⭐",
      planBadge: '<span style="background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); color: #92400e; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; border: 1px solid #C9A227;">⭐ Featured</span>',
      tipMessage: "🌟 As a Featured provider, your leads get priority placement and maximum visibility!",
      tipBg: "#fef3c7",
      tipBorder: "#fcd34d",
      tipText: "#92400e",
      leadBorderColor: "#C9A227",
      showUpgrade: false,
    }
  };
  
  return configs[planName as keyof typeof configs] || configs.basic;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const resendApiKey = Deno.env.get("RESEND_API_KEY");

  if (!resendApiKey) {
    console.error("RESEND_API_KEY not configured");
    return new Response(
      JSON.stringify({ error: "Email service not configured" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  const resend = new Resend(resendApiKey);

  try {
    const now = new Date();
    const currentHour = now.getUTCHours().toString().padStart(2, "0") + ":00";
    const currentDay = now.getUTCDay(); // 0 = Sunday

    console.log(`[LEAD-DIGEST] Running at ${now.toISOString()}, checking for hour: ${currentHour}`);

    // Fetch providers with digest preferences matching current time
    const { data: providers, error: providersError } = await supabase
      .from("notification_preferences")
      .select(`
        user_id,
        lead_notification_frequency,
        digest_time,
        last_digest_sent_at
      `)
      .in("lead_notification_frequency", ["daily_digest", "weekly_digest"])
      .eq("digest_time", currentHour);

    if (providersError) {
      console.error("Error fetching providers:", providersError);
      throw providersError;
    }

    if (!providers || providers.length === 0) {
      console.log("[LEAD-DIGEST] No providers scheduled for this time slot");
      return new Response(
        JSON.stringify({ success: true, message: "No digests to send", count: 0 }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log(`[LEAD-DIGEST] Found ${providers.length} providers to process`);

    let digestsSent = 0;

    for (const provider of providers) {
      // For weekly digest, only send on Mondays (day 1)
      if (provider.lead_notification_frequency === "weekly_digest" && currentDay !== 1) {
        console.log(`[LEAD-DIGEST] Skipping weekly digest for ${provider.user_id} - not Monday`);
        continue;
      }

      // Get provider profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("email, first_name")
        .eq("user_id", provider.user_id)
        .maybeSingle();

      if (!profile?.email) {
        console.log(`[LEAD-DIGEST] No email found for user ${provider.user_id}`);
        continue;
      }

      // Get provider's subscription plan
      const { planName, leadLimit } = await getProviderPlan(profile.email);
      const config = getPlanConfig(planName);
      
      console.log(`[LEAD-DIGEST] Provider ${profile.email} is on ${planName} plan`);

      // Calculate the time window for leads
      const lookbackHours = provider.lead_notification_frequency === "daily_digest" ? 24 : 168; // 7 days
      const lookbackDate = new Date(now.getTime() - lookbackHours * 60 * 60 * 1000);

      // Get provider's facilities
      const { data: facilities } = await supabase
        .from("facilities")
        .select("id, name")
        .eq("user_id", provider.user_id);

      if (!facilities || facilities.length === 0) {
        console.log(`[LEAD-DIGEST] No facilities for user ${provider.user_id}`);
        continue;
      }

      const facilityIds = facilities.map(f => f.id);
      const facilityNameMap = Object.fromEntries(facilities.map(f => [f.id, f.name]));

      // Get leads since last digest or lookback window
      const sinceDate = provider.last_digest_sent_at 
        ? new Date(Math.max(new Date(provider.last_digest_sent_at).getTime(), lookbackDate.getTime()))
        : lookbackDate;

      const { data: leads, error: leadsError } = await supabase
        .from("leads")
        .select("id, name, email, phone, preferred_contact, message, created_at, facility_id")
        .in("facility_id", facilityIds)
        .gte("created_at", sinceDate.toISOString())
        .order("created_at", { ascending: false });

      if (leadsError) {
        console.error(`Error fetching leads for ${provider.user_id}:`, leadsError);
        continue;
      }

      if (!leads || leads.length === 0) {
        console.log(`[LEAD-DIGEST] No new leads for user ${provider.user_id}`);
        // Still update the last_digest_sent_at to prevent re-checking
        await supabase
          .from("notification_preferences")
          .update({ last_digest_sent_at: now.toISOString() })
          .eq("user_id", provider.user_id);
        continue;
      }

      // Count total leads this month for usage tracking
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);
      
      const { count: monthlyLeadCount } = await supabase
        .from("leads")
        .select("*", { count: "exact", head: true })
        .in("facility_id", facilityIds)
        .gte("created_at", startOfMonth.toISOString());
      
      const usedLeads = monthlyLeadCount || 0;
      const remainingLeads = leadLimit - usedLeads;
      const usagePercentage = leadLimit > 0 ? Math.round((usedLeads / leadLimit) * 100) : 0;

      console.log(`[LEAD-DIGEST] Sending digest with ${leads.length} leads to ${profile.email}`);

      // Build the email with tier-based styling
      const digestType = provider.lead_notification_frequency === "daily_digest" ? "Daily" : "Weekly";
      const periodText = provider.lead_notification_frequency === "daily_digest" ? "past 24 hours" : "past week";

      // Featured plan exclusive badge
      const featuredBadge = planName === "featured" ? `
        <div style="background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border: 2px solid #C9A227; border-radius: 8px; padding: 12px 16px; margin-bottom: 20px; text-align: center;">
          <p style="margin: 0; color: #92400e; font-weight: 600; font-size: 14px;">
            ⭐ Featured Provider Priority Digest ⭐
          </p>
        </div>
      ` : "";

      // Lead usage section
      const leadUsageSection = leadLimit > 0 ? `
        <div style="background: ${planName === "featured" ? "#fef3c7" : planName === "professional" ? "#dbeafe" : "#f3f4f6"}; border: 1px solid ${planName === "featured" ? "#fcd34d" : planName === "professional" ? "#93c5fd" : "#d1d5db"}; border-radius: 8px; padding: 16px; margin-bottom: 20px; text-align: center;">
          <p style="margin: 0 0 4px 0; font-size: 12px; color: ${planName === "featured" ? "#92400e" : planName === "professional" ? "#1e40af" : "#374151"}; text-transform: uppercase; letter-spacing: 0.5px;">Monthly Lead Usage</p>
          <p style="margin: 0; font-size: 24px; font-weight: bold; color: ${planName === "featured" ? "#92400e" : planName === "professional" ? "#1e40af" : "#374151"};">${usedLeads} / ${leadLimit}</p>
          <p style="margin: 4px 0 0 0; font-size: 13px; color: ${planName === "featured" ? "#92400e" : planName === "professional" ? "#1e40af" : "#374151"};">
            ${remainingLeads} leads remaining${usagePercentage >= 80 ? " ⚠️" : ""}
          </p>
          ${config.showUpgrade && planName !== "featured" ? `
            <a href="${supabaseUrl.replace(".supabase.co", ".lovable.app")}/provider/billing" style="display: inline-block; margin-top: 12px; background: ${config.headerGradient}; color: #fff; padding: 8px 20px; border-radius: 6px; text-decoration: none; font-size: 13px; font-weight: 500;">
              🚀 ${planName === "basic" ? "Upgrade for More Leads" : "Upgrade to Featured"}
            </a>
          ` : ""}
        </div>
      ` : "";

      const leadsHtml = leads.map(lead => `
        <div style="background: #f9fafb; border-radius: 8px; padding: 16px; margin-bottom: 12px; border-left: 4px solid ${config.leadBorderColor};">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
            <h3 style="margin: 0; font-size: 16px; color: #1B365D;">${lead.name}</h3>
            <span style="font-size: 12px; color: #6b7280;">${new Date(lead.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
          </div>
          <p style="margin: 4px 0; font-size: 13px; color: #4b5563;">
            <strong>Facility:</strong> ${facilityNameMap[lead.facility_id] || "Unknown"}
          </p>
          <p style="margin: 4px 0; font-size: 13px; color: #4b5563;">
            <strong>Phone:</strong> <a href="tel:${lead.phone}" style="color: #1B365D;">${lead.phone}</a>
          </p>
          <p style="margin: 4px 0; font-size: 13px; color: #4b5563;">
            <strong>Email:</strong> <a href="mailto:${lead.email}" style="color: #1B365D;">${lead.email}</a>
          </p>
          <p style="margin: 4px 0; font-size: 13px; color: #4b5563;">
            <strong>Prefers:</strong> ${lead.preferred_contact === "call" ? "📞 Phone Call" : "✉️ Email"}
          </p>
          ${lead.message ? `<p style="margin: 8px 0 0 0; font-size: 13px; color: #374151; font-style: italic; background: #fff; padding: 8px; border-radius: 4px;">"${lead.message}"</p>` : ""}
        </div>
      `).join("");

      const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
  <div style="background: ${config.headerGradient}; padding: 30px; border-radius: 12px 12px 0 0;">
    <div style="display: flex; align-items: center; justify-content: space-between;">
      <h1 style="color: #fff; margin: 0; font-size: 24px;">${config.headerEmoji} ${digestType} Lead Digest</h1>
      ${config.planBadge}
    </div>
    <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0 0;">You received ${leads.length} new lead${leads.length === 1 ? "" : "s"} in the ${periodText}</p>
  </div>
  
  <div style="background: #fff; border: 1px solid #e5e7eb; border-top: none; padding: 30px; border-radius: 0 0 12px 12px;">
    ${featuredBadge}
    
    <p style="margin: 0 0 20px 0; color: #4b5563;">
      Hi ${profile.first_name || "there"},
    </p>
    
    <div style="background: ${config.tipBg}; border: 1px solid ${config.tipBorder}; border-radius: 8px; padding: 16px; margin-bottom: 20px;">
      <p style="margin: 0; color: ${config.tipText}; font-weight: 600; font-size: 14px;">
        ${config.tipMessage}
      </p>
    </div>
    
    ${leadUsageSection}
    
    <p style="margin: 0 0 24px 0; color: #4b5563;">
      Here is a summary of leads received for your facilit${facilities.length === 1 ? "y" : "ies"} during the ${periodText}:
    </p>
    
    ${leadsHtml}
    
    <div style="text-align: center; margin-top: 28px;">
      <a href="${supabaseUrl.replace(".supabase.co", ".lovable.app")}/provider/leads" style="display: inline-block; background: ${config.headerGradient}; color: #fff; padding: 16px 40px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px; box-shadow: 0 4px 14px rgba(0, 0, 0, 0.2);">
        View All Leads →
      </a>
    </div>
    
    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 32px 0;">
    
    <p style="font-size: 13px; color: #9ca3af; text-align: center; margin: 0;">
      This is your ${digestType.toLowerCase()} digest from <a href="https://rehablookup.com" style="color: #1B365D;">RehabLookup.com</a><br>
      <a href="${supabaseUrl.replace(".supabase.co", ".lovable.app")}/provider/settings" style="color: #6b7280;">Manage notification preferences</a>
    </p>
  </div>
</body>
</html>
      `;

      // Subject line varies by plan
      const subjectPrefixes = {
        basic: "📊",
        professional: "🎯",
        featured: "⭐"
      };
      const subjectPrefix = subjectPrefixes[planName as keyof typeof subjectPrefixes] || "📊";

      try {
        await resend.emails.send({
          from: "RehabLookup <noreply@resend.dev>",
          to: [profile.email],
          subject: `${subjectPrefix} ${digestType} Lead Digest: ${leads.length} new lead${leads.length === 1 ? "" : "s"}`,
          html: emailHtml,
        });

        // Update last_digest_sent_at
        await supabase
          .from("notification_preferences")
          .update({ last_digest_sent_at: now.toISOString() })
          .eq("user_id", provider.user_id);

        digestsSent++;
        console.log(`[LEAD-DIGEST] Successfully sent ${planName} tier digest to ${profile.email}`);
      } catch (emailError) {
        console.error(`[LEAD-DIGEST] Failed to send digest to ${profile.email}:`, emailError);
      }
    }

    console.log(`[LEAD-DIGEST] Completed - sent ${digestsSent} digests`);

    return new Response(
      JSON.stringify({ success: true, digestsSent }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: unknown) {
    console.error("[LEAD-DIGEST] Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
