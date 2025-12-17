import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";
import Stripe from "https://esm.sh/stripe@18.5.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Plan configuration
const PLAN_CONFIG: Record<string, { product_id: string | null; lead_limit: number; name: string }> = {
  basic: { product_id: null, lead_limit: 0, name: "Basic" },
  professional: { product_id: "prod_TbalLOPujTIoUe", lead_limit: 25, name: "Professional" },
  featured: { product_id: "prod_TbalOeJZA2ZoJl", lead_limit: 75, name: "Featured" },
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
  weeklyViews: number;
  newLeads: number;
  contactedLeads: number;
  convertedLeads: number;
}

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[WEEKLY-DIGEST] ${step}${detailsStr}`);
};

async function getProviderPlan(stripe: Stripe, email: string): Promise<{ planName: string; leadLimit: number }> {
  try {
    const customers = await stripe.customers.list({ email, limit: 1 });
    
    if (customers.data.length === 0) {
      return { planName: "Basic", leadLimit: 0 };
    }

    const subscriptions = await stripe.subscriptions.list({
      customer: customers.data[0].id,
      status: "active",
      limit: 1,
    });

    if (subscriptions.data.length === 0) {
      return { planName: "Basic", leadLimit: 0 };
    }

    const productId = subscriptions.data[0].items.data[0].price.product as string;
    
    if (productId === PLAN_CONFIG.professional.product_id) {
      return { planName: "Professional", leadLimit: PLAN_CONFIG.professional.lead_limit };
    } else if (productId === PLAN_CONFIG.featured.product_id) {
      return { planName: "Featured", leadLimit: PLAN_CONFIG.featured.lead_limit };
    }
    
    return { planName: "Basic", leadLimit: 0 };
  } catch (error) {
    console.error("Error getting plan:", error);
    return { planName: "Unknown", leadLimit: 0 };
  }
}

function generateDigestEmail(digest: ProviderDigest): string {
  const dashboardUrl = "https://rehablookup.com";
  const usagePercent = digest.leadLimit > 0 ? Math.round((digest.monthlyLeads / digest.leadLimit) * 100) : 0;
  const remainingLeads = digest.leadLimit > 0 ? digest.leadLimit - digest.monthlyLeads : 0;
  
  const weekEnd = new Date();
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - 7);
  
  const dateRange = `${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
  <div style="background: linear-gradient(135deg, #1B365D 0%, #2C4A7F 100%); padding: 30px; border-radius: 12px 12px 0 0;">
    <h1 style="color: #fff; margin: 0; font-size: 24px;">📊 Weekly Performance Digest</h1>
    <p style="color: rgba(255,255,255,0.8); margin: 8px 0 0 0;">${dateRange}</p>
  </div>
  
  <div style="background: #fff; border: 1px solid #e5e7eb; border-top: none; padding: 30px; border-radius: 0 0 12px 12px;">
    <p style="font-size: 16px; color: #4b5563; margin: 0 0 24px 0;">
      Hi ${digest.firstName}! Here's how <strong>${digest.facilityName}</strong> performed this week.
    </p>
    
    <!-- Weekly Highlights -->
    <div style="display: grid; gap: 16px; margin-bottom: 24px;">
      <div style="background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%); border: 1px solid #bbf7d0; border-radius: 12px; padding: 20px; text-align: center;">
        <p style="margin: 0; font-size: 36px; font-weight: bold; color: #166534;">${digest.weeklyLeads}</p>
        <p style="margin: 4px 0 0 0; color: #15803d; font-size: 14px;">New Leads This Week</p>
      </div>
    </div>
    
    <div style="display: flex; gap: 12px; margin-bottom: 24px;">
      <div style="flex: 1; background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 8px; padding: 16px; text-align: center;">
        <p style="margin: 0; font-size: 24px; font-weight: bold; color: #0369a1;">${digest.weeklyViews}</p>
        <p style="margin: 4px 0 0 0; color: #0284c7; font-size: 12px;">Profile Views</p>
      </div>
      <div style="flex: 1; background: #fef3c7; border: 1px solid #fcd34d; border-radius: 8px; padding: 16px; text-align: center;">
        <p style="margin: 0; font-size: 24px; font-weight: bold; color: #92400e;">${digest.newLeads}</p>
        <p style="margin: 4px 0 0 0; color: #a16207; font-size: 12px;">Awaiting Response</p>
      </div>
      <div style="flex: 1; background: #f5f3ff; border: 1px solid #ddd6fe; border-radius: 8px; padding: 16px; text-align: center;">
        <p style="margin: 0; font-size: 24px; font-weight: bold; color: #7c3aed;">${digest.contactedLeads}</p>
        <p style="margin: 4px 0 0 0; color: #8b5cf6; font-size: 12px;">Contacted</p>
      </div>
    </div>
    
    <!-- Monthly Usage -->
    ${digest.leadLimit > 0 ? `
    <div style="background: #f9fafb; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
      <h3 style="margin: 0 0 12px 0; font-size: 14px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px;">Monthly Lead Usage</h3>
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
        <span style="font-size: 14px; color: #4b5563;">${digest.monthlyLeads} of ${digest.leadLimit} leads used</span>
        <span style="font-size: 14px; font-weight: 600; color: ${usagePercent >= 80 ? '#dc2626' : '#16a34a'};">${usagePercent}%</span>
      </div>
      <div style="background: #e5e7eb; border-radius: 4px; height: 8px; overflow: hidden;">
        <div style="background: ${usagePercent >= 80 ? '#dc2626' : '#16a34a'}; height: 100%; width: ${Math.min(usagePercent, 100)}%;"></div>
      </div>
      <p style="margin: 12px 0 0 0; font-size: 13px; color: #6b7280;">
        ${remainingLeads} leads remaining this month • ${digest.planName} Plan
      </p>
    </div>
    ` : `
    <div style="background: #fef3c7; border: 1px solid #fcd34d; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
      <p style="margin: 0; color: #92400e; font-size: 14px;">
        <strong>You're on the Basic plan</strong> - Upgrade to start receiving leads and grow your patient base.
      </p>
      <a href="${dashboardUrl}/provider/billing" style="display: inline-block; margin-top: 12px; background: #1B365D; color: #fff; padding: 10px 20px; border-radius: 6px; text-decoration: none; font-weight: 500; font-size: 14px;">
        View Plans →
      </a>
    </div>
    `}
    
    <!-- Quick Tips -->
    <div style="background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
      <h3 style="margin: 0 0 12px 0; font-size: 14px; color: #1e40af;">💡 Quick Tips</h3>
      <ul style="margin: 0; padding-left: 20px; color: #1e40af; font-size: 14px;">
        ${digest.newLeads > 0 ? `<li style="margin-bottom: 8px;">You have <strong>${digest.newLeads} leads</strong> awaiting response. Quick follow-ups convert 400% better!</li>` : ''}
        <li style="margin-bottom: 8px;">Keep your facility description updated to improve search visibility.</li>
        <li>Add photos to increase engagement by up to 60%.</li>
      </ul>
    </div>
    
    <div style="text-align: center; margin-top: 28px;">
      <a href="${dashboardUrl}/provider/leads" style="display: inline-block; background: linear-gradient(135deg, #1B365D 0%, #2C4A7F 100%); color: #fff; padding: 16px 40px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px; box-shadow: 0 4px 14px rgba(27, 54, 93, 0.3);">
        View All Leads
      </a>
    </div>
    
  </div>
  
  <div style="background: #1B365D; padding: 28px; border-radius: 12px; margin-top: 20px;">
    <p style="margin: 0 0 8px 0; font-size: 18px; font-weight: 600; color: #fff; text-align: center;">RehabLookup</p>
    <p style="margin: 0 0 16px 0; font-size: 12px; color: rgba(255,255,255,0.7); text-align: center;">Connecting families with trusted treatment providers</p>
    <div style="text-align: center; margin-bottom: 16px;">
      <a href="${dashboardUrl}/provider/settings" style="color: #93c5fd; font-size: 12px; text-decoration: none;">Notification Settings</a>
      <span style="color: rgba(255,255,255,0.3); margin: 0 8px;">|</span>
      <a href="https://rehablookup.com" style="color: #93c5fd; font-size: 12px; text-decoration: none;">Website</a>
      <span style="color: rgba(255,255,255,0.3); margin: 0 8px;">|</span>
      <a href="mailto:support@rehablookup.com" style="color: #93c5fd; font-size: 12px; text-decoration: none;">Support</a>
    </div>
    <p style="margin: 0; font-size: 11px; color: rgba(255,255,255,0.5); text-align: center;">© ${new Date().getFullYear()} RehabLookup. All rights reserved.</p>
  </div>
</body>
</html>
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
        
        // Get plan info
        const planInfo = await getProviderPlan(stripe, profile.email);
        
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
          weeklyViews,
          newLeads: newLeads || 0,
          contactedLeads: contactedLeads || 0,
          convertedLeads: convertedLeads || 0,
        };
        
        // Generate and send email
        const emailHtml = generateDigestEmail(digest);
        
        await resend.emails.send({
          from: "RehabLookup <no-reply@rehablookup.com>",
          to: [profile.email],
          subject: `📊 Weekly Digest: ${digest.weeklyLeads} new leads for ${facility.name}`,
          html: emailHtml,
        });
        
        logStep("Sent digest email", { email: profile.email, weeklyLeads: digest.weeklyLeads });
        sentCount++;
        
      } catch (error) {
        console.error(`Error processing provider ${profile.email}:`, error);
        errorCount++;
      }
    }
    
    logStep("Digest complete", { sent: sentCount, errors: errorCount });
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        sent: sentCount, 
        errors: errorCount,
        message: `Sent ${sentCount} digest emails` 
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
    
  } catch (error: any) {
    console.error("Error in send-weekly-digest:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
