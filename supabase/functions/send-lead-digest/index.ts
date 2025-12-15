import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";
import Stripe from "https://esm.sh/stripe@18.5.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PLAN_CONFIG: Record<string, { product_id: string | null; lead_limit: number }> = {
  basic: { product_id: null, lead_limit: 4 },
  professional: { product_id: "prod_TbalLOPujTIoUe", lead_limit: 25 },
  featured: { product_id: "prod_TbalOeJZA2ZoJl", lead_limit: 75 },
};

interface Lead {
  id: string;
  name: string;
  email: string;
  phone: string;
  preferred_contact: string;
  message: string | null;
  created_at: string;
  facility_id: string;
}

async function getProviderPlan(providerEmail: string): Promise<{ planName: string; leadLimit: number }> {
  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
  
  if (!stripeKey) {
    return { planName: "basic", leadLimit: PLAN_CONFIG.basic.lead_limit };
  }

  try {
    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const customers = await stripe.customers.list({ email: providerEmail, limit: 1 });
    
    if (customers.data.length === 0) {
      return { planName: "basic", leadLimit: PLAN_CONFIG.basic.lead_limit };
    }

    const customerId = customers.data[0].id;
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "active",
      limit: 1,
    });

    if (subscriptions.data.length === 0) {
      return { planName: "basic", leadLimit: PLAN_CONFIG.basic.lead_limit };
    }

    const productId = subscriptions.data[0].items.data[0].price.product as string;
    
    if (productId === PLAN_CONFIG.professional.product_id) {
      return { planName: "professional", leadLimit: PLAN_CONFIG.professional.lead_limit };
    } else if (productId === PLAN_CONFIG.featured.product_id) {
      return { planName: "featured", leadLimit: PLAN_CONFIG.featured.lead_limit };
    }
    
    return { planName: "basic", leadLimit: PLAN_CONFIG.basic.lead_limit };
  } catch (error) {
    console.error("Error checking subscription:", error);
    return { planName: "basic", leadLimit: PLAN_CONFIG.basic.lead_limit };
  }
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
    const currentDay = now.getUTCDay();

    console.log(`[LEAD-DIGEST] Running at ${now.toISOString()}, checking for hour: ${currentHour}`);

    const { data: providers, error: providersError } = await supabase
      .from("notification_preferences")
      .select(`user_id, lead_notification_frequency, digest_time, last_digest_sent_at`)
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
      if (provider.lead_notification_frequency === "weekly_digest" && currentDay !== 1) {
        console.log(`[LEAD-DIGEST] Skipping weekly digest for ${provider.user_id} - not Monday`);
        continue;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("email, first_name")
        .eq("user_id", provider.user_id)
        .maybeSingle();

      if (!profile?.email) {
        console.log(`[LEAD-DIGEST] No email found for user ${provider.user_id}`);
        continue;
      }

      const { planName, leadLimit } = await getProviderPlan(profile.email);
      console.log(`[LEAD-DIGEST] Provider ${profile.email} is on ${planName} plan`);

      const lookbackHours = provider.lead_notification_frequency === "daily_digest" ? 24 : 168;
      const lookbackDate = new Date(now.getTime() - lookbackHours * 60 * 60 * 1000);

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
        await supabase
          .from("notification_preferences")
          .update({ last_digest_sent_at: now.toISOString() })
          .eq("user_id", provider.user_id);
        continue;
      }

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

      console.log(`[LEAD-DIGEST] Sending digest with ${leads.length} leads to ${profile.email}`);

      const digestType = provider.lead_notification_frequency === "daily_digest" ? "Daily" : "Weekly";
      const periodText = provider.lead_notification_frequency === "daily_digest" ? "24 hours" : "week";

      const leadsHtml = leads.slice(0, 5).map((lead: Lead) => `
        <tr>
          <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb;">
            <p style="margin: 0 0 4px 0; font-weight: 600; color: #1B365D;">${lead.name}</p>
            <p style="margin: 0; font-size: 13px; color: #4b5563;">
              ${lead.phone} | ${lead.email}
            </p>
            <p style="margin: 4px 0 0 0; font-size: 12px; color: #6b7280;">
              ${facilityNameMap[lead.facility_id] || "Facility"} | ${lead.preferred_contact === "call" ? "Prefers call" : "Prefers email"}
            </p>
          </td>
        </tr>
      `).join("");

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
                ${digestType} Lead Digest
              </h1>
            </td>
          </tr>
          
          <tr>
            <td style="background: #ffffff; padding: 32px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; border-left: 1px solid #e5e7eb; border-right: 1px solid #e5e7eb;">
              
              <p style="margin: 0 0 20px 0; color: #374151; font-size: 15px; line-height: 1.6;">
                Hi ${profile.first_name || "there"},
              </p>
              
              <p style="margin: 0 0 24px 0; color: #374151; font-size: 15px; line-height: 1.6;">
                You received <strong>${leads.length} new lead${leads.length === 1 ? "" : "s"}</strong> in the past ${periodText}.
              </p>
              
              ${leadLimit > 0 ? `
              <table width="100%" cellpadding="0" cellspacing="0" style="background: #f8fafc; border-radius: 6px; margin-bottom: 24px;">
                <tr>
                  <td style="padding: 16px; text-align: center;">
                    <p style="margin: 0 0 4px 0; font-size: 12px; color: #6b7280; text-transform: uppercase;">Monthly Usage</p>
                    <p style="margin: 0; font-size: 20px; font-weight: 600; color: #1B365D;">${usedLeads} / ${leadLimit}</p>
                    <p style="margin: 4px 0 0 0; font-size: 13px; color: #6b7280;">${remainingLeads} remaining</p>
                  </td>
                </tr>
              </table>
              ` : ""}
              
              <table width="100%" cellpadding="0" cellspacing="0">
                ${leadsHtml}
              </table>
              
              ${leads.length > 5 ? `<p style="margin: 12px 0 0 0; font-size: 13px; color: #6b7280;">+ ${leads.length - 5} more leads</p>` : ""}
              
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-top: 28px;">
                <tr>
                  <td align="center">
                    <a href="${supabaseUrl.replace(".supabase.co", ".lovable.app")}/provider/leads" style="display: inline-block; background: #1B365D; color: #ffffff; padding: 14px 32px; border-radius: 6px; text-decoration: none; font-weight: 600; font-size: 15px;">
                      View All Leads
                    </a>
                  </td>
                </tr>
              </table>
              
            </td>
          </tr>
          
          <tr>
            <td style="background: #f8fafc; padding: 20px 32px; border-radius: 0 0 8px 8px; border: 1px solid #e5e7eb; border-top: none;">
              <p style="margin: 0; font-size: 12px; color: #6b7280; text-align: center; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                RehabLookup | <a href="${supabaseUrl.replace(".supabase.co", ".lovable.app")}/provider/settings" style="color: #1B365D; text-decoration: underline;">Notification settings</a>
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

      try {
        await resend.emails.send({
          from: "RehabLookup <noreply@resend.dev>",
          to: [profile.email],
          subject: `${digestType} Digest: ${leads.length} new lead${leads.length === 1 ? "" : "s"}`,
          html: emailHtml,
        });

        await supabase
          .from("notification_preferences")
          .update({ last_digest_sent_at: now.toISOString() })
          .eq("user_id", provider.user_id);

        digestsSent++;
        console.log(`[LEAD-DIGEST] Successfully sent digest to ${profile.email}`);
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
