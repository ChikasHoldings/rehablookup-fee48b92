import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const LOG_PREFIX = "[ADMIN-WEEKLY-REPORT]";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log(`${LOG_PREFIX} Starting weekly report generation`);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check if weekly report is enabled
    const { data: settingData } = await supabase
      .from("platform_settings")
      .select("setting_value")
      .eq("setting_key", "weekly_report_enabled")
      .single();

    if (!settingData || settingData.setting_value !== true) {
      console.log(`${LOG_PREFIX} Weekly report is disabled, skipping`);
      return new Response(
        JSON.stringify({ success: true, message: "Weekly report is disabled" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get date range for last 7 days
    const today = new Date();
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);
    const startOfWeek = new Date(weekAgo.setHours(0, 0, 0, 0)).toISOString();
    const endOfWeek = new Date(today.setHours(23, 59, 59, 999)).toISOString();

    // Previous week for comparison
    const twoWeeksAgo = new Date();
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
    const startOfPrevWeek = new Date(twoWeeksAgo.setHours(0, 0, 0, 0)).toISOString();
    const endOfPrevWeek = startOfWeek;

    // Fetch this week's stats
    const [
      thisWeekProviders,
      thisWeekLeads,
      thisWeekViews,
      prevWeekProviders,
      prevWeekLeads,
      prevWeekViews,
      totalProviders,
      approvedProviders,
      pendingProviders,
      totalLeads,
    ] = await Promise.all([
      supabase.from("facilities").select("id", { count: "exact", head: true })
        .gte("created_at", startOfWeek).lte("created_at", endOfWeek),
      supabase.from("leads").select("id", { count: "exact", head: true })
        .gte("created_at", startOfWeek).lte("created_at", endOfWeek),
      supabase.from("facility_views").select("view_count")
        .gte("view_date", startOfWeek.split('T')[0]).lte("view_date", endOfWeek.split('T')[0]),
      supabase.from("facilities").select("id", { count: "exact", head: true })
        .gte("created_at", startOfPrevWeek).lt("created_at", endOfPrevWeek),
      supabase.from("leads").select("id", { count: "exact", head: true })
        .gte("created_at", startOfPrevWeek).lt("created_at", endOfPrevWeek),
      supabase.from("facility_views").select("view_count")
        .gte("view_date", startOfPrevWeek.split('T')[0]).lt("view_date", endOfPrevWeek.split('T')[0]),
      supabase.from("facilities").select("id", { count: "exact", head: true }),
      supabase.from("facilities").select("id", { count: "exact", head: true }).eq("status", "approved"),
      supabase.from("facilities").select("id", { count: "exact", head: true }).eq("status", "pending"),
      supabase.from("leads").select("id", { count: "exact", head: true }),
    ]);

    // Calculate totals
    const thisWeekViewsTotal = thisWeekViews.data?.reduce((sum, v) => sum + (v.view_count || 0), 0) || 0;
    const prevWeekViewsTotal = prevWeekViews.data?.reduce((sum, v) => sum + (v.view_count || 0), 0) || 0;

    const newProvidersThisWeek = thisWeekProviders.count || 0;
    const newLeadsThisWeek = thisWeekLeads.count || 0;
    const newProvidersPrevWeek = prevWeekProviders.count || 0;
    const newLeadsPrevWeek = prevWeekLeads.count || 0;

    // Calculate percentage changes
    const calcChange = (current: number, previous: number): string => {
      if (previous === 0) return current > 0 ? "+100%" : "0%";
      const change = ((current - previous) / previous) * 100;
      return `${change >= 0 ? '+' : ''}${change.toFixed(0)}%`;
    };

    const providerChange = calcChange(newProvidersThisWeek, newProvidersPrevWeek);
    const leadChange = calcChange(newLeadsThisWeek, newLeadsPrevWeek);
    const viewChange = calcChange(thisWeekViewsTotal, prevWeekViewsTotal);

    console.log(`${LOG_PREFIX} Stats - Providers: ${newProvidersThisWeek} (${providerChange}), Leads: ${newLeadsThisWeek} (${leadChange}), Views: ${thisWeekViewsTotal} (${viewChange})`);

    // Get admin users with weekly digest frequency
    const { data: adminUsers } = await supabase
      .from("user_roles")
      .select("user_id")
      .eq("role", "admin");

    if (!adminUsers || adminUsers.length === 0) {
      console.log(`${LOG_PREFIX} No admin users found`);
      return new Response(
        JSON.stringify({ success: true, message: "No admin users to notify" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get admin profiles with notification preferences
    const { data: adminProfiles } = await supabase
      .from("admin_user_profiles")
      .select("user_id, email_digest_frequency")
      .in("user_id", adminUsers.map(u => u.user_id));

    // Filter admins who have weekly digest enabled
    const eligibleAdminIds = adminUsers
      .filter(user => {
        const profile = adminProfiles?.find(p => p.user_id === user.user_id);
        const frequency = profile?.email_digest_frequency || 'daily';
        return frequency === 'weekly';
      })
      .map(u => u.user_id);

    if (eligibleAdminIds.length === 0) {
      console.log(`${LOG_PREFIX} No admin users have weekly digest enabled`);
      return new Response(
        JSON.stringify({ success: true, message: "No admin users have weekly digest enabled" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get admin emails
    const adminEmails: string[] = [];
    for (const userId of eligibleAdminIds) {
      const { data: userData } = await supabase.auth.admin.getUserById(userId);
      if (userData?.user?.email) {
        adminEmails.push(userData.user.email);
      }
    }

    if (adminEmails.length === 0) {
      console.log(`${LOG_PREFIX} No admin emails found`);
      return new Response(
        JSON.stringify({ success: true, message: "No admin emails found" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const weekStart = new Date(startOfWeek).toLocaleDateString("en-US", { month: "short", day: "numeric" });
    const weekEnd = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

    console.log(`${LOG_PREFIX} Sending weekly report to ${adminEmails.length} admin(s)`);

    // Send email
    const emailResponse = await resend.emails.send({
      from: "RehabLookup Admin <no-reply@rehablookup.com>",
      to: adminEmails,
      subject: `Weekly Analytics Report - ${weekStart} to ${weekEnd}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #1B365D 0%, #2a4a7f 100%); color: white; padding: 30px; border-radius: 8px 8px 0 0; text-align: center; }
            .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
            .section { margin: 25px 0; }
            .section-title { font-size: 16px; font-weight: 600; color: #1B365D; margin-bottom: 15px; border-bottom: 2px solid #e5e7eb; padding-bottom: 8px; }
            .stat-row { display: flex; justify-content: space-between; align-items: center; padding: 12px 15px; background: white; border-radius: 8px; margin-bottom: 10px; border: 1px solid #e5e7eb; }
            .stat-label { font-size: 14px; color: #374151; }
            .stat-value { font-size: 20px; font-weight: bold; color: #1B365D; }
            .stat-change { font-size: 12px; margin-left: 8px; padding: 2px 6px; border-radius: 4px; }
            .positive { background: #d1fae5; color: #065f46; }
            .negative { background: #fee2e2; color: #991b1b; }
            .neutral { background: #e5e7eb; color: #374151; }
            .overview-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin: 20px 0; }
            .overview-card { background: white; padding: 15px; border-radius: 8px; text-align: center; border: 1px solid #e5e7eb; }
            .overview-value { font-size: 24px; font-weight: bold; color: #1B365D; }
            .overview-label { font-size: 12px; color: #6b7280; }
            .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0;">📈 Weekly Analytics Report</h1>
              <p style="margin: 10px 0 0 0; opacity: 0.9;">${weekStart} - ${weekEnd}</p>
            </div>
            <div class="content">
              <div class="section">
                <div class="section-title">Platform Overview</div>
                <div class="overview-grid">
                  <div class="overview-card">
                    <div class="overview-value">${totalProviders.count || 0}</div>
                    <div class="overview-label">Total Providers</div>
                  </div>
                  <div class="overview-card">
                    <div class="overview-value">${approvedProviders.count || 0}</div>
                    <div class="overview-label">Approved</div>
                  </div>
                  <div class="overview-card">
                    <div class="overview-value">${totalLeads.count || 0}</div>
                    <div class="overview-label">Total Leads</div>
                  </div>
                </div>
              </div>

              <div class="section">
                <div class="section-title">This Week's Performance</div>
                <div class="stat-row">
                  <span class="stat-label">New Providers</span>
                  <div>
                    <span class="stat-value">${newProvidersThisWeek}</span>
                    <span class="stat-change ${newProvidersThisWeek >= newProvidersPrevWeek ? 'positive' : 'negative'}">${providerChange}</span>
                  </div>
                </div>
                <div class="stat-row">
                  <span class="stat-label">New Leads</span>
                  <div>
                    <span class="stat-value">${newLeadsThisWeek}</span>
                    <span class="stat-change ${newLeadsThisWeek >= newLeadsPrevWeek ? 'positive' : 'negative'}">${leadChange}</span>
                  </div>
                </div>
                <div class="stat-row">
                  <span class="stat-label">Profile Views</span>
                  <div>
                    <span class="stat-value">${thisWeekViewsTotal}</span>
                    <span class="stat-change ${thisWeekViewsTotal >= prevWeekViewsTotal ? 'positive' : 'negative'}">${viewChange}</span>
                  </div>
                </div>
              </div>

              ${(pendingProviders.count || 0) > 0 ? `
              <div class="section">
                <div class="section-title">⚠️ Attention Required</div>
                <div class="stat-row" style="background: #fef3c7; border-color: #f59e0b;">
                  <span class="stat-label">Pending Provider Reviews</span>
                  <span class="stat-value" style="color: #92400e;">${pendingProviders.count}</span>
                </div>
              </div>
              ` : ''}
              
              <div class="footer">
                <p>This is an automated weekly report from RehabLookup Admin Panel.</p>
                <p>You can manage notification preferences in your profile settings.</p>
              </div>
            </div>
          </div>
        </body>
        </html>
      `,
    });

    console.log(`${LOG_PREFIX} Email sent successfully to ${adminEmails.length} admin(s):`, emailResponse);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Weekly report sent to ${adminEmails.length} admin(s)`,
        stats: { 
          newProvidersThisWeek, 
          newLeadsThisWeek, 
          thisWeekViewsTotal,
          providerChange,
          leadChange,
          viewChange
        }
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error(`${LOG_PREFIX} Error:`, error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
