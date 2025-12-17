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

function generateDigestEmail(
  firstName: string,
  digestType: string,
  periodText: string,
  leads: Lead[],
  facilityNameMap: Record<string, string>,
  usedLeads: number,
  leadLimit: number,
  remainingLeads: number
): string {
  const leadsHtml = leads.slice(0, 5).map((lead: Lead) => `
    <tr>
      <td style="padding: 16px 0; border-bottom: 1px solid hsl(220, 13%, 91%);">
        <p style="margin: 0 0 6px 0; font-weight: 600; color: hsl(217, 54%, 23%); font-size: 15px;">${lead.name}</p>
        <p style="margin: 0 0 6px 0; font-size: 14px; color: hsl(215, 19%, 35%);">
          ${lead.phone} • ${lead.email}
        </p>
        <p style="margin: 0; font-size: 13px; color: hsl(220, 9%, 46%);">
          ${facilityNameMap[lead.facility_id] || "Facility"} • ${lead.preferred_contact === "call" ? "Prefers call" : "Prefers email"}
        </p>
      </td>
    </tr>
  `).join("");

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: hsl(210, 20%, 96%);">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: hsl(210, 20%, 96%); padding: 32px 16px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px; width: 100%;">
          
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, hsl(217, 54%, 23%) 0%, hsl(217, 41%, 35%) 100%); padding: 32px; border-radius: 12px 12px 0 0;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td>
                    <p style="margin: 0 0 8px 0; font-size: 12px; color: hsla(0, 0%, 100%, 0.7); font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; text-transform: uppercase; letter-spacing: 1px;">RehabLookup</p>
                    <h1 style="margin: 0; font-size: 24px; color: hsl(0, 0%, 100%); font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; font-weight: 600;">
                      ${digestType} Lead Digest
                    </h1>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="background: hsl(0, 0%, 100%); padding: 32px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; border-left: 1px solid hsl(220, 13%, 91%); border-right: 1px solid hsl(220, 13%, 91%);">
              
              <p style="margin: 0 0 20px 0; color: hsl(215, 19%, 35%); font-size: 16px; line-height: 1.6;">
                Hi ${firstName},
              </p>
              
              <p style="margin: 0 0 24px 0; color: hsl(215, 19%, 35%); font-size: 16px; line-height: 1.6;">
                You received <strong>${leads.length} new lead${leads.length === 1 ? "" : "s"}</strong> in the past ${periodText}.
              </p>
              
              ${leadLimit > 0 ? `
              <!-- Monthly Usage -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background: hsl(210, 20%, 98%); border-radius: 8px; margin-bottom: 24px;">
                <tr>
                  <td style="padding: 20px; text-align: center;">
                    <p style="margin: 0 0 6px 0; font-size: 12px; color: hsl(220, 9%, 46%); text-transform: uppercase; letter-spacing: 0.5px;">Monthly Usage</p>
                    <p style="margin: 0; font-size: 28px; font-weight: 700; color: hsl(217, 54%, 23%);">${usedLeads} / ${leadLimit}</p>
                    <p style="margin: 6px 0 0 0; font-size: 14px; color: hsl(220, 9%, 46%);">${remainingLeads} remaining this month</p>
                  </td>
                </tr>
              </table>
              ` : ""}
              
              <!-- Leads List -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                ${leadsHtml}
              </table>
              
              ${leads.length > 5 ? `
              <p style="margin: 16px 0 0 0; font-size: 14px; color: hsl(220, 9%, 46%); text-align: center;">
                + ${leads.length - 5} more leads
              </p>
              ` : ""}
              
              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top: 32px;">
                <tr>
                  <td align="center">
                    <a href="https://rehablookup.com/provider/leads" style="display: inline-block; background: hsl(217, 54%, 23%); color: hsl(0, 0%, 100%); padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 15px;">
                      View All Leads
                    </a>
                  </td>
                </tr>
              </table>
              
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background: hsl(217, 54%, 23%); padding: 32px; border-radius: 0 0 12px 12px;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="center">
                    <p style="margin: 0 0 8px 0; font-size: 18px; font-weight: 600; color: hsl(0, 0%, 100%); font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">RehabLookup</p>
                    <p style="margin: 0 0 16px 0; font-size: 13px; color: hsla(0, 0%, 100%, 0.7); font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">Connecting families with trusted treatment providers</p>
                    <table cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td style="padding: 0 8px;">
                          <a href="https://rehablookup.com/provider/settings" style="color: hsl(199, 89%, 78%); text-decoration: none; font-size: 12px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">Notification Settings</a>
                        </td>
                        <td style="color: hsla(0, 0%, 100%, 0.4); font-size: 12px;">|</td>
                        <td style="padding: 0 8px;">
                          <a href="mailto:help@rehablookup.com" style="color: hsl(199, 89%, 78%); text-decoration: none; font-size: 12px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">Contact Support</a>
                        </td>
                      </tr>
                    </table>
                    <p style="margin: 16px 0 0 0; font-size: 11px; color: hsla(0, 0%, 100%, 0.5); font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
                      © ${new Date().getFullYear()} RehabLookup. All rights reserved.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
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

      const emailHtml = generateDigestEmail(
        profile.first_name || "there",
        digestType,
        periodText,
        leads,
        facilityNameMap,
        usedLeads,
        leadLimit,
        remainingLeads
      );

      try {
        await resend.emails.send({
          from: "RehabLookup <no-reply@rehablookup.com>",
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
