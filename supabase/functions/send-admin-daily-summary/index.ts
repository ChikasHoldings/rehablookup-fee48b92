import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const LOG_PREFIX = "[ADMIN-DAILY-SUMMARY]";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log(`${LOG_PREFIX} Starting daily summary generation`);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check if daily summary is enabled
    const { data: settingData } = await supabase
      .from("platform_settings")
      .select("setting_value")
      .eq("setting_key", "daily_summary_enabled")
      .single();

    if (!settingData || settingData.setting_value !== true) {
      console.log(`${LOG_PREFIX} Daily summary is disabled, skipping`);
      return new Response(
        JSON.stringify({ success: true, message: "Daily summary is disabled" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get today's date range
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const startOfYesterday = new Date(yesterday.setHours(0, 0, 0, 0)).toISOString();
    const endOfYesterday = new Date(yesterday.setHours(23, 59, 59, 999)).toISOString();

    // Fetch yesterday's stats
    const [newProvidersResult, newLeadsResult, pendingProvidersResult, flaggedImagesResult] = await Promise.all([
      supabase
        .from("facilities")
        .select("id", { count: "exact", head: true })
        .gte("created_at", startOfYesterday)
        .lte("created_at", endOfYesterday),
      supabase
        .from("leads")
        .select("id", { count: "exact", head: true })
        .gte("created_at", startOfYesterday)
        .lte("created_at", endOfYesterday),
      supabase
        .from("facilities")
        .select("id", { count: "exact", head: true })
        .eq("status", "pending"),
      supabase
        .from("flagged_images")
        .select("id", { count: "exact", head: true })
        .eq("resolved", false),
    ]);

    const newProviders = newProvidersResult.count || 0;
    const newLeads = newLeadsResult.count || 0;
    const pendingProviders = pendingProvidersResult.count || 0;
    const flaggedImages = flaggedImagesResult.count || 0;

    console.log(`${LOG_PREFIX} Stats - New Providers: ${newProviders}, New Leads: ${newLeads}, Pending: ${pendingProviders}, Flagged: ${flaggedImages}`);

    // Get admin users with daily digest frequency
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

    // Filter admins who have daily digest enabled (default is daily)
    const eligibleAdminIds = adminUsers
      .filter(user => {
        const profile = adminProfiles?.find(p => p.user_id === user.user_id);
        // Default to daily if no preference set
        const frequency = profile?.email_digest_frequency || 'daily';
        return frequency === 'daily';
      })
      .map(u => u.user_id);

    if (eligibleAdminIds.length === 0) {
      console.log(`${LOG_PREFIX} No admin users have daily digest enabled`);
      return new Response(
        JSON.stringify({ success: true, message: "No admin users have daily digest enabled" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get admin emails from auth
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

    const dateStr = yesterday.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    console.log(`${LOG_PREFIX} Sending daily summary to ${adminEmails.length} admin(s)`);

    // Send email to all eligible admins
    const emailResponse = await resend.emails.send({
      from: "RehabLookup Admin <no-reply@rehablookup.com>",
      to: adminEmails,
      subject: `Daily Summary - ${dateStr}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #1B365D; background: #1B365D; color: #ffffff; padding: 30px; border-radius: 8px 8px 0 0; text-align: center; font-family: Arial, Helvetica, sans-serif; }
            .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
            .stat-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; margin: 20px 0; }
            .stat-card { background: white; padding: 20px; border-radius: 8px; text-align: center; border: 1px solid #e5e7eb; }
            .stat-value { font-size: 32px; font-weight: bold; color: #1B365D; }
            .stat-label { font-size: 14px; color: #6b7280; margin-top: 5px; }
            .alert { background: #fef3c7; border: 1px solid #f59e0b; padding: 15px; border-radius: 8px; margin-top: 20px; }
            .alert-title { font-weight: bold; color: #92400e; }
            .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0;">📊 Daily Summary</h1>
              <p style="margin: 10px 0 0 0; opacity: 0.9;">${dateStr}</p>
            </div>
            <div class="content">
              <p>Here's your daily overview of platform activity:</p>
              
              <div class="stat-grid">
                <div class="stat-card">
                  <div class="stat-value">${newProviders}</div>
                  <div class="stat-label">New Providers</div>
                </div>
                <div class="stat-card">
                  <div class="stat-value">${newLeads}</div>
                  <div class="stat-label">New Leads</div>
                </div>
                <div class="stat-card">
                  <div class="stat-value">${pendingProviders}</div>
                  <div class="stat-label">Pending Reviews</div>
                </div>
                <div class="stat-card">
                  <div class="stat-value">${flaggedImages}</div>
                  <div class="stat-label">Flagged Items</div>
                </div>
              </div>

              ${pendingProviders > 0 || flaggedImages > 0 ? `
              <div class="alert">
                <p class="alert-title">⚠️ Action Required</p>
                <p style="margin: 10px 0 0 0;">
                  ${pendingProviders > 0 ? `${pendingProviders} provider(s) awaiting approval. ` : ''}
                  ${flaggedImages > 0 ? `${flaggedImages} flagged item(s) need review.` : ''}
                </p>
              </div>
              ` : ''}
              
              <div class="footer">
                <p>This is an automated daily summary from RehabLookup Admin Panel.</p>
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
        message: `Daily summary sent to ${adminEmails.length} admin(s)`,
        stats: { newProviders, newLeads, pendingProviders, flaggedImages }
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
