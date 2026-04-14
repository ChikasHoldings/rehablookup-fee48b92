import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { sendEmailWithRetry } from "../_shared/resilient-email-sender.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const LOG = "[SEEKER-RE-ENGAGE]";
const DASHBOARD_URL = "https://rehablookup.com";

/**
 * Re-engagement emails for inactive seekers
 * Targets seekers who:
 *   - Created account 30+ days ago
 *   - Have NOT sent a lead or concierge inquiry in the last 30 days
 *   - Have NOT received a re-engagement email in the last 30 days
 *   - Have not opted out of product updates
 */

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log(`${LOG} Starting re-engagement check`);

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) throw new Error("RESEND_API_KEY not configured");

    const resend = new Resend(resendApiKey);
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    // Get seekers created 30+ days ago
    const { data: seekers } = await supabase
      .from("seeker_profiles")
      .select("user_id, first_name, display_name, state, city")
      .lt("created_at", thirtyDaysAgo)
      .limit(200);

    if (!seekers?.length) {
      console.log(`${LOG} No eligible seekers`);
      return new Response(JSON.stringify({ success: true, sent: 0 }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Check who already received re-engagement recently
    const { data: recentEmails } = await supabase
      .from("email_tracking_events")
      .select("recipient_email")
      .eq("email_type", "seeker_re_engagement")
      .gte("created_at", thirtyDaysAgo);

    const recentRecipients = new Set((recentEmails || []).map(e => e.recipient_email));

    let sent = 0;

    for (const seeker of seekers) {
      if (sent >= 20) break; // Batch limit

      const { data: authUser } = await supabase.auth.admin.getUserById(seeker.user_id);
      const email = authUser?.user?.email;
      if (!email || recentRecipients.has(email)) continue;

      // Check for recent activity (leads or concierge inquiries)
      const { count: recentLeads } = await supabase
        .from("leads")
        .select("id", { count: "exact", head: true })
        .eq("email", email)
        .gte("created_at", thirtyDaysAgo);

      const { count: recentInquiries } = await supabase
        .from("concierge_inquiries")
        .select("id", { count: "exact", head: true })
        .eq("user_email", email)
        .gte("created_at", thirtyDaysAgo);

      if ((recentLeads || 0) > 0 || (recentInquiries || 0) > 0) continue;

      // Check notification preferences
      const { data: prefs } = await supabase
        .from("notification_preferences")
        .select("email_product_updates")
        .eq("user_id", seeker.user_id)
        .maybeSingle();

      if (prefs && prefs.email_product_updates === false) continue;

      const name = seeker.first_name || seeker.display_name || "there";
      const location = seeker.city && seeker.state ? `${seeker.city}, ${seeker.state}` : null;

      try {
        await sendEmailWithRetry(supabase, resend, {
          from: "RehabLookup <no-reply@rehablookup.com>",
          to: [email],
          subject: "We're Still Here to Help You Find Treatment 💙",
          html: generateReEngagementEmail(name, location),
          headers: {
            "List-Unsubscribe": `<mailto:no-reply@rehablookup.com?subject=unsubscribe>`,
            "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
          },
        });

        // Track the send
        await supabase.from("email_tracking_events").insert({
          email_id: `re-engage-${seeker.user_id}-${Date.now()}`,
          email_type: "seeker_re_engagement",
          event_type: "sent",
          recipient_email: email,
        });

        sent++;
        console.log(`${LOG} ✓ Sent re-engagement to ${email}`);
      } catch (err) {
        console.error(`${LOG} ✗ Failed for ${email}:`, err);
      }
    }

    console.log(`${LOG} Complete: ${sent} sent`);
    return new Response(JSON.stringify({ success: true, sent }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.error(`${LOG} Error:`, msg);
    return new Response(JSON.stringify({ error: msg }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});

function generateReEngagementEmail(name: string, location: string | null): string {
  const locationLine = location ? `
    <p style="margin:0 0 16px;font-size:14px;color:#64748b;">
      We have verified treatment centers near <strong>${location}</strong> ready to help.
    </p>` : "";

  return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="margin:0;padding:0;background:#f4f6f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f9;"><tr><td align="center" style="padding:40px 20px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
  <tr><td style="background:#1B365D;padding:36px 32px;text-align:center;">
    <h1 style="margin:0;color:#fff;font-size:24px;font-weight:700;">We're Still Here for You</h1>
    <p style="margin:8px 0 0;color:rgba(255,255,255,0.8);font-size:14px;">Your treatment search matters to us</p>
  </td></tr>
  <tr><td style="padding:32px;">
    <p style="margin:0 0 16px;font-size:17px;color:#1B365D;font-weight:600;">Hi ${name},</p>
    <p style="margin:0 0 16px;font-size:15px;color:#475569;line-height:1.6;">
      We noticed you haven't been active on RehabLookup recently. We understand — searching for treatment isn't easy, and sometimes you need time to think things through.
    </p>
    ${locationLine}
    <div style="background:#f0f9ff;border-left:4px solid #1B365D;padding:16px;border-radius:8px;margin:20px 0;">
      <p style="margin:0 0 8px;font-size:14px;font-weight:600;color:#1B365D;">Here's what you can do today:</p>
      <ul style="margin:0;padding-left:18px;font-size:14px;color:#475569;line-height:1.8;">
        <li>Browse new treatment centers added recently</li>
        <li>Compare facilities side by side</li>
        <li>Talk to a placement advisor for free guidance</li>
      </ul>
    </div>
    <div style="background:#f0fdf4;border:1px solid #bbf7d0;padding:16px;border-radius:10px;margin:20px 0;">
      <p style="margin:0 0 6px;font-size:14px;font-weight:600;color:#166534;">🏥 Need More Help?</p>
      <p style="margin:0;font-size:13px;color:#475569;line-height:1.6;">Our Treatment Placement service matches you with the right facility and handles everything — from insurance verification to admission coordination.</p>
    </div>
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:28px auto;">
      <tr><td style="background:#1B365D;border-radius:8px;">
        <a href="${DASHBOARD_URL}/search" style="display:inline-block;padding:14px 32px;font-size:15px;font-weight:600;color:#fff;text-decoration:none;">Continue Your Search</a>
      </td></tr>
    </table>
    <p style="margin:20px 0 0;font-size:13px;color:#94a3b8;text-align:center;">
      If you've already found treatment or no longer need help, you can <a href="${DASHBOARD_URL}/account/settings" style="color:#64748b;">update your preferences</a>.
    </p>
  </td></tr>
  <tr><td style="background:#f8fafc;padding:20px;text-align:center;border-top:1px solid #e2e8f0;">
    <p style="margin:0;font-size:11px;color:#94a3b8;">RehabLookup — Helping families find trusted treatment centers</p>
  </td></tr>
</table></td></tr></table></body></html>`;
}
