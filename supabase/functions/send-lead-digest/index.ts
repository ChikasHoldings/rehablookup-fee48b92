import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendEmailWithRetry } from "../_shared/resilient-email-sender.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { sendEmailWithRetry } from "../_shared/resilient-email-sender.ts";
import {
  getProviderPlan,
  emailStart,
  emailEnd,
  emailHeader,
  emailBodyStart,
  emailBodyEnd,
  emailFooter,
  emailGreeting,
  emailParagraph,
  proInsightsBox,
  tipBox,
  ctaButton,
  maskLeadName,
  type PlanType,
} from "../_shared/email-templates.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
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

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[LEAD-DIGEST] ${step}${detailsStr}`);
};

function generateDigestEmail(
  firstName: string,
  digestType: string,
  periodText: string,
  leads: Lead[],
  facilityNameMap: Record<string, string>,
  unlockedLeadsCount: number,
  plan: PlanType
): string {
  const isPro = plan === 'pro';
  
  // SECURITY: Mask lead contact info - providers must unlock leads to see full details
  const leadsHtml = leads.slice(0, 5).map((lead: Lead) => {
    const maskedName = maskLeadName(lead.name);
    
    return `
    <tr>
      <td style="padding: 16px 0; border-bottom: 1px solid #e5e7eb;">
        <p style="margin: 0 0 6px 0; font-weight: 600; color: #1B365D; font-size: 15px;">🔒 ${maskedName}</p>
        <p style="margin: 0 0 6px 0; font-size: 14px; color: #6b7280;">
          <span style="background: #fef3c7; color: #92400e; padding: 2px 8px; border-radius: 4px; font-size: 12px;">Unlock to view contact details</span>
        </p>
        <p style="margin: 0; font-size: 13px; color: #6b7280;">
          ${facilityNameMap[lead.facility_id] || "Facility"} • ${lead.preferred_contact === "call" ? "Prefers call" : "Prefers email"}
        </p>
      </td>
    </tr>
  `}).join("");

  // Pro provider insights
  const proInsights = isPro 
    ? proInsightsBox('As a Pro member, you save 20% on every lead unlock. Your listings also get priority visibility in search results.')
    : '';

  // Tips section - only show upgrade prompts for Free plan
  const tipsSection = !isPro 
    ? tipBox('Upgrade to Pro for 20% off lead unlocks and priority search placement.', plan, { showUpgradePrompt: true })
    : '';

  return `
${emailStart()}
${emailHeader(`${digestType} Lead Digest`, plan)}
${emailBodyStart()}
              ${emailGreeting(firstName)}
              ${emailParagraph(`You received <strong>${leads.length} new lead${leads.length === 1 ? "" : "s"}</strong> in the past ${periodText}. Unlock each lead to view their full contact details.`)}
              
              ${proInsights}
              
              <!-- Leads List -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                ${leadsHtml}
              </table>
              
              ${leads.length > 5 ? `
              <p style="margin: 16px 0 0 0; font-size: 14px; color: #6b7280; text-align: center;">
                + ${leads.length - 5} more leads
              </p>
              ` : ""}
              
              ${ctaButton('View & Unlock Leads', 'https://rehablookup.com/provider/inquiries', plan)}
              ${tipsSection}
${emailBodyEnd()}
${emailFooter()}
${emailEnd()}
  `;
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const resendApiKey = Deno.env.get("RESEND_API_KEY");
  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");

  if (!resendApiKey) {
    console.error("RESEND_API_KEY not configured");
    return new Response(
      JSON.stringify({ error: "Email service not configured" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  const resend = new Resend(resendApiKey);
  const stripe = stripeKey ? new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" }) : null;

  try {
    const now = new Date();
    const currentHour = now.getUTCHours().toString().padStart(2, "0") + ":00";
    const currentDay = now.getUTCDay();

    logStep(`Running at ${now.toISOString()}, checking for hour: ${currentHour}`);

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
      logStep("No providers scheduled for this time slot");
      return new Response(
        JSON.stringify({ success: true, message: "No digests to send", count: 0 }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    logStep(`Found ${providers.length} providers to process`);

    let digestsSent = 0;

    for (const provider of providers) {
      if (provider.lead_notification_frequency === "weekly_digest" && currentDay !== 1) {
        logStep(`Skipping weekly digest for ${provider.user_id} - not Monday`);
        continue;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("email, first_name")
        .eq("user_id", provider.user_id)
        .maybeSingle();

      if (!profile?.email) {
        logStep(`No email found for user ${provider.user_id}`);
        continue;
      }

      // Check suppressed emails before sending
      const { data: suppressed } = await supabase
        .from("suppressed_emails")
        .select("email")
        .eq("email", profile.email.toLowerCase())
        .maybeSingle();

      if (suppressed) {
        logStep(`Skipping suppressed email for user ${provider.user_id}`, { email: profile.email });
        await supabase
          .from("notification_preferences")
          .update({ last_digest_sent_at: now.toISOString() })
          .eq("user_id", provider.user_id);
        continue;
      }

      // Get plan info using shared template
      const planInfo = await getProviderPlan(profile.email, stripe);
      logStep(`Provider ${profile.email} is on ${planInfo.planName} plan`);

      const lookbackHours = provider.lead_notification_frequency === "daily_digest" ? 24 : 168;
      const lookbackDate = new Date(now.getTime() - lookbackHours * 60 * 60 * 1000);

      const { data: facilities } = await supabase
        .from("facilities")
        .select("id, name")
        .eq("user_id", provider.user_id);

      if (!facilities || facilities.length === 0) {
        logStep(`No facilities for user ${provider.user_id}`);
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
        logStep(`No new leads for user ${provider.user_id}`);
        await supabase
          .from("notification_preferences")
          .update({ last_digest_sent_at: now.toISOString() })
          .eq("user_id", provider.user_id);
        continue;
      }

      // Count unlocked leads this month
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);
      
      const { count: unlockedCount } = await supabase
        .from("lead_unlocks")
        .select("*", { count: "exact", head: true })
        .in("facility_id", facilityIds)
        .gte("unlocked_at", startOfMonth.toISOString());
      
      const unlockedLeadsCount = unlockedCount || 0;

      logStep(`Sending digest with ${leads.length} leads to ${profile.email}`);

      const digestType = provider.lead_notification_frequency === "daily_digest" ? "Daily" : "Weekly";
      const periodText = provider.lead_notification_frequency === "daily_digest" ? "24 hours" : "week";

      const emailHtml = generateDigestEmail(
        profile.first_name || "there",
        digestType,
        periodText,
        leads,
        facilityNameMap,
        unlockedLeadsCount,
        planInfo.plan
      );

      try {
        const subjectPrefix = planInfo.plan === "pro" ? "⭐ " : "";
        
        const unsubToken = crypto.randomUUID();
        await resend.emails.send({
          from: "RehabLookup <no-reply@rehablookup.com>",
          to: [profile.email],
          subject: `${subjectPrefix}${digestType} Digest: ${leads.length} New Lead${leads.length === 1 ? "" : "s"} - Unlock to View`,
          html: emailHtml,
          headers: {
            "List-Unsubscribe": `<https://rehablookup.com/unsubscribe?token=${unsubToken}>`,
            "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
          },
        });

        await supabase
          .from("notification_preferences")
          .update({ last_digest_sent_at: now.toISOString() })
          .eq("user_id", provider.user_id);

        digestsSent++;
        logStep(`Digest sent to ${profile.email}`);
      } catch (emailError) {
        console.error(`Failed to send digest to ${profile.email}:`, emailError);
      }
    }

    logStep(`Completed. Sent ${digestsSent} digests.`);

    return new Response(
      JSON.stringify({ success: true, count: digestsSent }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
