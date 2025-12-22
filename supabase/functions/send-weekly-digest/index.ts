import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";
import Stripe from "https://esm.sh/stripe@18.5.0";
import {
  getProviderPlan,
  getPlanStyles,
  emailStart,
  emailEnd,
  emailHeader,
  emailBodyStart,
  emailBodyEnd,
  emailFooter,
  featuredInsightsBox,
  tipBox,
  usageBox,
  ctaButton,
  type PlanType,
} from "../_shared/email-templates.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ProviderDigest {
  email: string;
  firstName: string;
  facilityName: string;
  facilityId: string;
  weeklyLeads: number;
  monthlyLeads: number;
  leadLimit: number;
  planName: string;
  plan: PlanType;
  weeklyViews: number;
  newLeads: number;
  contactedLeads: number;
  convertedLeads: number;
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

  const { plan, planName, leadLimit, monthlyLeads, weeklyLeads, weeklyViews, newLeads, contactedLeads, firstName, facilityName } = digest;
  const styles = getPlanStyles(plan);
  const isFeatured = plan === 'featured';
  const isProfessional = plan === 'professional';
  const isPaidPlan = isFeatured || isProfessional;

  // Featured-exclusive insights
  const featuredInsights = isFeatured 
    ? featuredInsightsBox(`
        Your facility appears in <strong>premium placement</strong> across search results. 
        Featured badge increases click-through rates by up to 85%. 
        You have access to <strong>priority lead routing</strong> in your area.
      `)
    : '';

  // Usage section
  const usageSection = isPaidPlan 
    ? usageBox(monthlyLeads, leadLimit, plan)
    : `
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background: #fef3c7; border: 1px solid #fcd34d; border-radius: 8px; margin-bottom: 24px;">
        <tr>
          <td style="padding: 20px;">
            <p style="margin: 0; color: #92400e; font-size: 14px;">
              <strong>You're on the Basic plan</strong> - Upgrade to start receiving leads and grow your patient base.
            </p>
            <a href="${dashboardUrl}/provider/billing" style="display: inline-block; margin-top: 12px; background: #1B365D; color: #fff; padding: 10px 20px; border-radius: 6px; text-decoration: none; font-weight: 500; font-size: 14px;">
              View Plans →
            </a>
          </td>
        </tr>
      </table>
    `;

  // Tips section
  let tipsContent = '';
  if (isPaidPlan) {
    const tipItems = [];
    if (newLeads > 0) {
      tipItems.push(`You have <strong>${newLeads} leads</strong> awaiting response. Quick follow-ups convert 400% better!`);
    }
    tipItems.push(isFeatured 
      ? 'Reply to reviews to boost your profile engagement and trust score.'
      : 'Keep your facility description updated to improve search visibility.');
    tipItems.push('Add photos to increase engagement by up to 60%.');

    tipsContent = `
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; margin-bottom: 24px;">
        <tr>
          <td style="padding: 20px;">
            <p style="margin: 0 0 12px 0; font-size: 14px; font-weight: 600; color: #1e40af;">💡 ${isFeatured ? 'Featured Provider Tips' : 'Quick Tips'}</p>
            <ul style="margin: 0; padding-left: 20px; color: #1e40af; font-size: 14px;">
              ${tipItems.map(tip => `<li style="margin-bottom: 8px;">${tip}</li>`).join('')}
            </ul>
          </td>
        </tr>
      </table>
    `;
  } else {
    tipsContent = tipBox('Complete your facility profile to improve search ranking. Add photos to increase engagement by up to 60%. Upgrade to start receiving leads from families seeking treatment.', plan, { showUpgradePrompt: true });
  }

  return `
${emailStart()}
${emailHeader('📊 Weekly Performance Digest', plan, { subtitle: dateRange })}
${emailBodyStart()}
              <p style="margin: 0 0 24px 0; color: #4b5563; font-size: 16px; line-height: 1.6;">
                Hi ${firstName}! Here's how <strong>${facilityName}</strong> performed this week.
              </p>
              
              ${featuredInsights}
              
              <!-- Weekly Highlights -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%); border: 1px solid #bbf7d0; border-radius: 12px; margin-bottom: 24px;">
                <tr>
                  <td style="padding: 20px; text-align: center;">
                    <p style="margin: 0; font-size: 36px; font-weight: bold; color: #166534;">${weeklyLeads}</p>
                    <p style="margin: 4px 0 0 0; color: #15803d; font-size: 14px;">New Leads This Week</p>
                  </td>
                </tr>
              </table>
              
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 24px;">
                <tr>
                  <td width="33%" style="padding-right: 6px;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 8px;">
                      <tr>
                        <td style="padding: 16px; text-align: center;">
                          <p style="margin: 0; font-size: 24px; font-weight: bold; color: #0369a1;">${weeklyViews}</p>
                          <p style="margin: 4px 0 0 0; color: #0284c7; font-size: 12px;">Profile Views</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                  <td width="33%" style="padding: 0 3px;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background: #fef3c7; border: 1px solid #fcd34d; border-radius: 8px;">
                      <tr>
                        <td style="padding: 16px; text-align: center;">
                          <p style="margin: 0; font-size: 24px; font-weight: bold; color: #92400e;">${newLeads}</p>
                          <p style="margin: 4px 0 0 0; color: #a16207; font-size: 12px;">Awaiting Response</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                  <td width="33%" style="padding-left: 6px;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background: #f5f3ff; border: 1px solid #ddd6fe; border-radius: 8px;">
                      <tr>
                        <td style="padding: 16px; text-align: center;">
                          <p style="margin: 0; font-size: 24px; font-weight: bold; color: #7c3aed;">${contactedLeads}</p>
                          <p style="margin: 4px 0 0 0; color: #8b5cf6; font-size: 12px;">Contacted</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              
              ${usageSection}
              ${tipsContent}
              ${ctaButton('View All Leads', `${dashboardUrl}/provider/leads`, plan)}
${emailBodyEnd()}
${emailFooter()}
${emailEnd()}
  `;
}

const handler = async (req: Request): Promise<Response> => {
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
    
    // Get date ranges
    const now = new Date();
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    
    // Get all providers who have weekly digest enabled
    const { data: preferences, error: prefError } = await supabase
      .from("notification_preferences")
      .select("user_id")
      .eq("email_weekly_digest", true);
    
    if (prefError) {
      throw new Error(`Failed to fetch preferences: ${prefError.message}`);
    }
    
    logStep("Found providers with digest enabled", { count: preferences?.length || 0 });
    
    if (!preferences || preferences.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: "No providers have weekly digest enabled", sent: 0 }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }
    
    const userIds = preferences.map(p => p.user_id);
    
    // Get profiles for these users
    const { data: profiles, error: profileError } = await supabase
      .from("profiles")
      .select("user_id, email, first_name")
      .in("user_id", userIds);
    
    if (profileError) {
      throw new Error(`Failed to fetch profiles: ${profileError.message}`);
    }
    
    // Get facilities for these users
    const { data: facilities, error: facilityError } = await supabase
      .from("facilities")
      .select("id, user_id, name, status")
      .in("user_id", userIds)
      .eq("status", "approved");
    
    if (facilityError) {
      throw new Error(`Failed to fetch facilities: ${facilityError.message}`);
    }
    
    logStep("Fetched provider data", { profiles: profiles?.length, facilities: facilities?.length });
    
    let sentCount = 0;
    let errorCount = 0;
    
    // Process each provider
    for (const profile of profiles || []) {
      try {
        const userFacilities = facilities?.filter(f => f.user_id === profile.user_id) || [];
        
        if (userFacilities.length === 0) {
          logStep("Skipping user - no approved facilities", { userId: profile.user_id });
          continue;
        }
        
        const facility = userFacilities[0]; // Primary facility
        const facilityIds = userFacilities.map(f => f.id);
        
        // Get plan info using shared template
        const planInfo = await getProviderPlan(profile.email, stripe);
        
        // Get weekly leads
        const { count: weeklyLeads } = await supabase
          .from("leads")
          .select("*", { count: "exact", head: true })
          .in("facility_id", facilityIds)
          .gte("created_at", weekAgo.toISOString());
        
        // Get monthly leads
        const { count: monthlyLeads } = await supabase
          .from("leads")
          .select("*", { count: "exact", head: true })
          .in("facility_id", facilityIds)
          .gte("created_at", startOfMonth.toISOString());
        
        // Get weekly views
        const { data: viewsData } = await supabase
          .from("facility_views")
          .select("view_count")
          .in("facility_id", facilityIds)
          .gte("view_date", weekAgo.toISOString().split('T')[0]);
        
        const weeklyViews = viewsData?.reduce((sum, v) => sum + (v.view_count || 0), 0) || 0;
        
        // Get lead status counts
        const { count: newLeads } = await supabase
          .from("leads")
          .select("*", { count: "exact", head: true })
          .in("facility_id", facilityIds)
          .eq("status", "new");
        
        const { count: contactedLeads } = await supabase
          .from("leads")
          .select("*", { count: "exact", head: true })
          .in("facility_id", facilityIds)
          .eq("status", "contacted");
        
        const { count: convertedLeads } = await supabase
          .from("leads")
          .select("*", { count: "exact", head: true })
          .in("facility_id", facilityIds)
          .eq("status", "converted");
        
        const digest: ProviderDigest = {
          email: profile.email,
          firstName: profile.first_name || "Provider",
          facilityName: facility.name,
          facilityId: facility.id,
          weeklyLeads: weeklyLeads || 0,
          monthlyLeads: monthlyLeads || 0,
          leadLimit: planInfo.leadLimit,
          planName: planInfo.planName,
          plan: planInfo.plan,
          weeklyViews,
          newLeads: newLeads || 0,
          contactedLeads: contactedLeads || 0,
          convertedLeads: convertedLeads || 0,
        };
        
        const emailHtml = generateDigestEmail(digest);
        const subjectPrefix = planInfo.plan === 'featured' ? '⭐ ' : '';
        
        const { error: emailError } = await resend.emails.send({
          from: "RehabLookup <no-reply@rehablookup.com>",
          to: [profile.email],
          subject: `${subjectPrefix}Weekly Digest: ${weeklyLeads || 0} new leads for ${facility.name}`,
          html: emailHtml,
        });
        
        if (emailError) {
          logStep("Failed to send email", { email: profile.email, error: emailError });
          errorCount++;
        } else {
          logStep("Email sent successfully", { email: profile.email });
          sentCount++;
        }
        
      } catch (providerError) {
        logStep("Error processing provider", { userId: profile.user_id, error: providerError });
        errorCount++;
      }
    }
    
    logStep("Completed", { sent: sentCount, errors: errorCount });
    
    return new Response(
      JSON.stringify({ success: true, sent: sentCount, errors: errorCount }),
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
};

serve(handler);
