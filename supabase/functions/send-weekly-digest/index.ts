import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";
import Stripe from "https://esm.sh/stripe@18.5.0";
import {
import { sendEmailWithRetry } from "../_shared/resilient-email-sender.ts";
  getProviderPlan,
  getPlanStyles,
  emailStart,
  emailEnd,
  emailHeader,
  emailBodyStart,
  emailBodyEnd,
  emailFooter,
  proInsightsBox,
  tipBox,
  ctaButton,
  type PlanType,
} from "../_shared/email-templates.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface ProviderDigest {
  email: string;
  firstName: string;
  facilityName: string;
  facilityId: string;
  weeklyLeads: number;
  unlockedLeads: number;
  planName: string;
  plan: PlanType;
  weeklyViews: number;
  weeklyImpressions: number;
  weeklyClickToCalls: number;
  weeklyWebsiteClicks: number;
  newLeads: number;
  contactedLeads: number;
  isConciergeOptedIn: boolean;
}

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[WEEKLY-DIGEST] ${step}${detailsStr}`);
};

function generateDigestEmail(digest: ProviderDigest): string {
  const dashboardUrl = "https://rehablookup.com";
  
  const weekEnd = new Date();
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - 7);
  const dateRange = `${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;

  const { plan, weeklyLeads, unlockedLeads, weeklyViews, weeklyImpressions, weeklyClickToCalls, weeklyWebsiteClicks, newLeads, contactedLeads, firstName, facilityName } = digest;
  const styles = getPlanStyles(plan);
  const isPro = plan === 'pro';

  // Pro-exclusive insights
  const proInsights = isPro 
    ? proInsightsBox(`As a Pro member, you save 20% on every lead unlock. Your facility also gets priority placement in search results.`)
    : '';

  // Tips section
  let tipsContent = '';
  if (isPro) {
    const tipItems = [];
    if (newLeads > 0) {
      tipItems.push(`You have <strong>${newLeads} leads</strong> awaiting unlock. Quick follow-ups convert 400% better!`);
    }
    tipItems.push('Reply to reviews to boost your profile engagement and trust score.');
    tipItems.push('Add photos to increase engagement by up to 60%.');

    tipsContent = `
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background: #f5f3ff; border: 1px solid #c4b5fd; border-radius: 8px; margin-bottom: 24px;">
        <tr>
          <td style="padding: 20px;">
            <p style="margin: 0 0 12px 0; font-size: 14px; font-weight: 600; color: #5b21b6;">💡 Pro Member Tips</p>
            <ul style="margin: 0; padding-left: 20px; color: #5b21b6; font-size: 14px;">
              ${tipItems.map(tip => `<li style="margin-bottom: 8px;">${tip}</li>`).join('')}
            </ul>
          </td>
        </tr>
      </table>
    `;
  } else {
    tipsContent = tipBox('Upgrade to Pro for 20% off lead unlocks and priority search placement.', plan, { showUpgradePrompt: true });
  }

  return `
${emailStart()}
${emailHeader('📊 Weekly Performance Digest', plan, { subtitle: dateRange })}
${emailBodyStart()}
              <p style="margin: 0 0 24px 0; color: #4b5563; font-size: 16px; line-height: 1.6;">
                Hi ${firstName}! Here's how <strong>${facilityName}</strong> performed this week.
              </p>
              
              ${proInsights}
              
              <!-- Weekly Highlights -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%); border: 1px solid #bbf7d0; border-radius: 12px; margin-bottom: 24px;">
                <tr>
                  <td style="padding: 20px; text-align: center;">
                    <p style="margin: 0; font-size: 36px; font-weight: bold; color: #166534;">${weeklyLeads}</p>
                    <p style="margin: 4px 0 0 0; color: #15803d; font-size: 14px;">New Leads This Week</p>
                  </td>
                </tr>
              </table>
              
              <!-- Engagement Stats -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 16px;">
                <tr>
                  <td width="33%" style="padding-right: 6px;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 8px;">
                      <tr>
                        <td style="padding: 16px; text-align: center;">
                          <p style="margin: 0; font-size: 24px; font-weight: bold; color: #0369a1;">${weeklyImpressions}</p>
                          <p style="margin: 4px 0 0 0; color: #0284c7; font-size: 12px;">Search Impressions</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                  <td width="33%" style="padding: 0 3px;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background: #eff6ff; border: 1px solid #93c5fd; border-radius: 8px;">
                      <tr>
                        <td style="padding: 16px; text-align: center;">
                          <p style="margin: 0; font-size: 24px; font-weight: bold; color: #1d4ed8;">${weeklyViews}</p>
                          <p style="margin: 4px 0 0 0; color: #2563eb; font-size: 12px;">Profile Views</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                  <td width="33%" style="padding-left: 6px;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background: #ecfdf5; border: 1px solid #6ee7b7; border-radius: 8px;">
                      <tr>
                        <td style="padding: 16px; text-align: center;">
                          <p style="margin: 0; font-size: 24px; font-weight: bold; color: #047857;">${weeklyClickToCalls + weeklyWebsiteClicks}</p>
                          <p style="margin: 4px 0 0 0; color: #059669; font-size: 12px;">Engagements</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Lead Stats -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 24px;">
                <tr>
                  <td width="33%" style="padding-right: 6px;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background: #fef3c7; border: 1px solid #fcd34d; border-radius: 8px;">
                      <tr>
                        <td style="padding: 16px; text-align: center;">
                          <p style="margin: 0; font-size: 24px; font-weight: bold; color: #92400e;">${newLeads}</p>
                          <p style="margin: 4px 0 0 0; color: #a16207; font-size: 12px;">Awaiting Unlock</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                  <td width="33%" style="padding: 0 3px;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background: #f5f3ff; border: 1px solid #ddd6fe; border-radius: 8px;">
                      <tr>
                        <td style="padding: 16px; text-align: center;">
                          <p style="margin: 0; font-size: 24px; font-weight: bold; color: #7c3aed;">${unlockedLeads}</p>
                          <p style="margin: 4px 0 0 0; color: #8b5cf6; font-size: 12px;">Unlocked</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                  <td width="33%" style="padding-left: 6px;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background: #fff7ed; border: 1px solid #fed7aa; border-radius: 8px;">
                      <tr>
                        <td style="padding: 16px; text-align: center;">
                          <p style="margin: 0; font-size: 24px; font-weight: bold; color: #c2410c;">${weeklyClickToCalls}</p>
                          <p style="margin: 4px 0 0 0; color: #ea580c; font-size: 12px;">Click-to-Calls</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              
              ${tipsContent}

              ${!digest.isConciergeOptedIn ? `
              <!-- Placement Network CTA -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; margin-bottom: 24px;">
                <tr>
                  <td style="padding: 20px;">
                    <p style="margin: 0 0 8px 0; font-size: 15px; font-weight: 600; color: #166534; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                      🏥 Have Empty Beds? Get Matched Referrals
                    </p>
                    <p style="margin: 0 0 12px 0; font-size: 14px; color: #475569; line-height: 1.6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                      Our Treatment Placement service sends you pre-screened families ready to admit. An advisor handles all coordination — you only pay on successful placement.
                    </p>
                    <a href="https://rehablookup.com/provider/placement" style="display: inline-block; background: #166534; color: #ffffff; padding: 10px 20px; border-radius: 6px; text-decoration: none; font-size: 14px; font-weight: 600; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                      Join Placement Network →
                    </a>
                  </td>
                </tr>
              </table>
              ` : ''}

              ${ctaButton('View All Leads', `${dashboardUrl}/provider/inquiries`, plan)}
${emailBodyEnd()}
${emailFooter()}
${emailEnd()}
  `;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");
    
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY")!;
    const resendApiKey = Deno.env.get("RESEND_API_KEY")!;
    
    if (!stripeKey || !resendApiKey) {
      throw new Error("Missing required API keys");
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const resend = new Resend(resendApiKey);
    
    const now = new Date();
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    
    // Dedup guard: 6-day cooldown prevents duplicate sends from repeated cron execution
    const sixDaysAgo = new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000).toISOString();

    const { data: preferences, error: prefError } = await supabase
      .from("notification_preferences")
      .select("user_id, last_digest_sent_at")
      .eq("email_weekly_digest", true);
    
    if (prefError) throw new Error(`Failed to fetch preferences: ${prefError.message}`);
    
    // Filter out providers who already received a digest within the last 6 days
    const eligiblePreferences = (preferences || []).filter(p => {
      if (!p.last_digest_sent_at) return true;
      return p.last_digest_sent_at < sixDaysAgo;
    });

    logStep("Found providers with digest enabled", { 
      total: preferences?.length || 0, 
      eligible: eligiblePreferences.length,
      skippedDueToCooldown: (preferences?.length || 0) - eligiblePreferences.length 
    });
    
    if (eligiblePreferences.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: "No providers eligible for weekly digest", sent: 0 }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }
    
    const userIds = eligiblePreferences.map(p => p.user_id);
    
    const { data: profiles } = await supabase.from("profiles").select("user_id, email, first_name").in("user_id", userIds);
    const { data: facilities } = await supabase.from("facilities").select("id, user_id, name, status, concierge_network_opted_in").in("user_id", userIds).eq("status", "approved");
    
    let sentCount = 0;
    let errorCount = 0;
    
    // Check suppressed emails to avoid sending to bounced/complained/unsubscribed addresses
    const allEmails = (profiles || []).map(p => p.email).filter(Boolean);
    let suppressedSet = new Set<string>();
    if (allEmails.length > 0) {
      const { data: suppressed } = await supabase
        .from("suppressed_emails")
        .select("email")
        .in("email", allEmails);
      if (suppressed) {
        suppressedSet = new Set(suppressed.map((s: { email: string }) => s.email.toLowerCase()));
      }
    }

    for (const profile of profiles || []) {
      try {
        // Skip suppressed emails
        if (suppressedSet.has(profile.email.toLowerCase())) {
          logStep("Skipping suppressed email", { email: profile.email });
          continue;
        }

        const userFacilities = facilities?.filter(f => f.user_id === profile.user_id) || [];
        if (userFacilities.length === 0) continue;
        
        const facility = userFacilities[0];
        const facilityIds = userFacilities.map(f => f.id);
        
        const planInfo = await getProviderPlan(profile.email, stripe);
        
        const { count: weeklyLeads } = await supabase.from("leads").select("*", { count: "exact", head: true }).in("facility_id", facilityIds).gte("created_at", weekAgo.toISOString());
        const { count: unlockedLeads } = await supabase.from("lead_unlocks").select("*", { count: "exact", head: true }).in("facility_id", facilityIds).gte("unlocked_at", weekAgo.toISOString());
        
        // Fetch real engagement data from provider_events (single source of truth)
        const { count: weeklyViews } = await supabase.from("provider_events").select("*", { count: "exact", head: true }).in("facility_id", facilityIds).eq("event_type", "profile_view").gte("created_at", weekAgo.toISOString());
        const { count: weeklyImpressions } = await supabase.from("provider_events").select("*", { count: "exact", head: true }).in("facility_id", facilityIds).eq("event_type", "listing_impression").gte("created_at", weekAgo.toISOString());
        const { count: weeklyClickToCalls } = await supabase.from("provider_events").select("*", { count: "exact", head: true }).in("facility_id", facilityIds).eq("event_type", "click_to_call").gte("created_at", weekAgo.toISOString());
        const { count: weeklyWebsiteClicks } = await supabase.from("provider_events").select("*", { count: "exact", head: true }).in("facility_id", facilityIds).eq("event_type", "website_click").gte("created_at", weekAgo.toISOString());
        
        const { count: newLeads } = await supabase.from("leads").select("*", { count: "exact", head: true }).in("facility_id", facilityIds).eq("status", "new");
        const { count: contactedLeads } = await supabase.from("leads").select("*", { count: "exact", head: true }).in("facility_id", facilityIds).eq("status", "contacted");
        
        const digest: ProviderDigest = {
          email: profile.email,
          firstName: profile.first_name || "Provider",
          facilityName: facility.name,
          facilityId: facility.id,
          weeklyLeads: weeklyLeads || 0,
          unlockedLeads: unlockedLeads || 0,
          planName: planInfo.planName,
          plan: planInfo.plan,
          weeklyViews: weeklyViews || 0,
          weeklyImpressions: weeklyImpressions || 0,
          weeklyClickToCalls: weeklyClickToCalls || 0,
          weeklyWebsiteClicks: weeklyWebsiteClicks || 0,
          newLeads: newLeads || 0,
          contactedLeads: contactedLeads || 0,
          isConciergeOptedIn: userFacilities.some(f => f.concierge_network_opted_in === true),
        };
        
        const emailHtml = generateDigestEmail(digest);
        const subjectPrefix = planInfo.plan === 'pro' ? '⭐ ' : '';
        
        const unsubToken = crypto.randomUUID();
        const { error: emailError } = await sendEmailWithRetry(supabase, resend, {
          from: "RehabLookup <no-reply@rehablookup.com>",
          to: [profile.email],
          subject: `${subjectPrefix}Weekly Digest: ${weeklyLeads || 0} new leads for ${facility.name}`,
          html: emailHtml,
          headers: {
            "List-Unsubscribe": `<https://rehablookup.com/unsubscribe?token=${unsubToken}>`,
            "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
          },
        });
        
        if (emailError) { 
          errorCount++; 
        } else { 
          sentCount++;
          // Record send timestamp for dedup protection
          await supabase
            .from("notification_preferences")
            .update({ last_digest_sent_at: now.toISOString() })
            .eq("user_id", profile.user_id);
        }
      } catch { errorCount++; }
    }
    
    logStep("Completed", { sent: sentCount, errors: errorCount });
    
    return new Response(JSON.stringify({ success: true, sent: sentCount, errors: errorCount }), { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } });
  }
});
