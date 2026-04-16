import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { sendEmailWithRetry, sleep, BULK_SEND_DELAY_MS } from "../_shared/resilient-email-sender.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const LOG = "[NEW-FACILITIES-ALERT]";
const DASHBOARD_URL = "https://rehablookup.com";

/**
 * "New Facilities Near You" alerts for clients
 * Checks for facilities approved in the last 7 days,
 * matches them to clients by state, and sends personalized alerts.
 * Deduplicates via seeker_facility_alerts table.
 */

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log(`${LOG} Starting new facility alerts`);

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) throw new Error("RESEND_API_KEY not configured");

    const resend = new Resend(resendApiKey);
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    // Get recently approved facilities
    const { data: newFacilities } = await supabase
      .from("facilities")
      .select("id, name, city, state, facility_type, slug")
      .eq("status", "approved")
      .gte("updated_at", sevenDaysAgo)
      .order("updated_at", { ascending: false })
      .limit(50);

    if (!newFacilities?.length) {
      console.log(`${LOG} No new facilities`);
      return new Response(JSON.stringify({ success: true, sent: 0 }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Group facilities by state
    const facilityByState: Record<string, typeof newFacilities> = {};
    for (const f of newFacilities) {
      if (!f.state) continue;
      const st = f.state.toUpperCase();
      if (!facilityByState[st]) facilityByState[st] = [];
      facilityByState[st].push(f);
    }

    const states = Object.keys(facilityByState);
    if (states.length === 0) {
      console.log(`${LOG} No facilities with state data`);
      return new Response(JSON.stringify({ success: true, sent: 0 }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Get seekers in those states
    const { data: seekers } = await supabase
      .from("seeker_profiles")
      .select("user_id, first_name, display_name, state, city")
      .in("state", states)
      .limit(200);

    if (!seekers?.length) {
      console.log(`${LOG} No clients in matching states`);
      return new Response(JSON.stringify({ success: true, sent: 0 }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    let sent = 0;

    for (const seeker of seekers) {
      if (sent >= 30) break; // Batch limit

      const seekerState = seeker.state?.toUpperCase();
      if (!seekerState || !facilityByState[seekerState]) continue;

      const matchingFacilities = facilityByState[seekerState];

      // Check which facilities we've already alerted about
      const { data: alreadySent } = await supabase
        .from("seeker_facility_alerts")
        .select("facility_id")
        .eq("user_id", seeker.user_id)
        .in("facility_id", matchingFacilities.map(f => f.id));

      const sentFacilityIds = new Set((alreadySent || []).map(a => a.facility_id));
      const unseenFacilities = matchingFacilities.filter(f => !sentFacilityIds.has(f.id));

      if (unseenFacilities.length === 0) continue;

      // Check notification preferences
      const { data: prefs } = await supabase
        .from("notification_preferences")
        .select("email_product_updates")
        .eq("user_id", seeker.user_id)
        .maybeSingle();

      if (prefs && prefs.email_product_updates === false) continue;

      const { data: authUser } = await supabase.auth.admin.getUserById(seeker.user_id);
      const email = authUser?.user?.email;
      if (!email) continue;

      const name = seeker.first_name || seeker.display_name || "there";
      const location = seeker.city && seeker.state ? `${seeker.city}, ${seeker.state}` : seeker.state || "";

      try {
        await sendEmailWithRetry(supabase, resend, {
          from: "RehabLookup <no-reply@rehablookup.com>",
          to: [email],
          subject: `${unseenFacilities.length} New Treatment Center${unseenFacilities.length > 1 ? "s" : ""} Near ${location}`,
          html: generateNewFacilitiesEmail(name, location, unseenFacilities),
          headers: {
            "List-Unsubscribe": `<mailto:no-reply@rehablookup.com?subject=unsubscribe>`,
            "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
          },
        }, { emailType: "new_facility_alert", idempotencyKey: `new-fac-alert-${seeker.user_id}-${new Date().toISOString().slice(0,10)}` });

        // Track alerts
        const alertRows = unseenFacilities.map(f => ({
          user_id: seeker.user_id,
          facility_id: f.id,
        }));
        await supabase.from("seeker_facility_alerts").upsert(alertRows, { onConflict: "user_id,facility_id" });

        sent++;
        console.log(`${LOG} ✓ Sent ${unseenFacilities.length} facility alert(s) to ${email}`);
        await sleep(BULK_SEND_DELAY_MS);
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

interface FacilityInfo {
  id: string;
  name: string;
  city: string;
  state: string;
  facility_type: string;
  slug: string | null;
}

function generateNewFacilitiesEmail(name: string, location: string, facilities: FacilityInfo[]): string {
  const facilityCards = facilities.slice(0, 5).map(f => {
    const url = f.slug ? `${DASHBOARD_URL}/facility/${f.slug}` : `${DASHBOARD_URL}/search`;
    const typeLabel = f.facility_type?.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()) || "Treatment Center";
    return `
      <tr><td style="padding:12px 16px;background:#fff;border:1px solid #e2e8f0;border-radius:10px;margin-bottom:8px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
          <td>
            <p style="margin:0 0 4px;font-size:15px;font-weight:600;color:#1B365D;">${f.name}</p>
            <p style="margin:0;font-size:13px;color:#64748b;">${f.city}, ${f.state} · ${typeLabel}</p>
          </td>
          <td align="right" valign="middle">
            <a href="${url}" style="display:inline-block;background:#1B365D;color:#fff;padding:8px 16px;border-radius:6px;font-size:12px;font-weight:600;text-decoration:none;">View →</a>
          </td>
        </tr></table>
      </td></tr>
      <tr><td style="height:8px;"></td></tr>`;
  }).join("");

  const moreCount = facilities.length - 5;
  const moreLink = moreCount > 0 ? `<p style="text-align:center;font-size:13px;color:#64748b;margin:8px 0 0;">+ ${moreCount} more — <a href="${DASHBOARD_URL}/search" style="color:#0EA5E9;">see all</a></p>` : "";

  return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="margin:0;padding:0;background:#f4f6f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f9;"><tr><td align="center" style="padding:40px 20px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
  <tr><td style="background:#1B365D;padding:32px;text-align:center;">
    <h1 style="margin:0;color:#fff;font-size:22px;font-weight:700;">New Treatment Centers Near You</h1>
    <p style="margin:8px 0 0;color:rgba(255,255,255,0.8);font-size:14px;">📍 ${location}</p>
  </td></tr>
  <tr><td style="padding:28px 24px;">
    <p style="margin:0 0 16px;font-size:16px;color:#1B365D;font-weight:600;">Hi ${name},</p>
    <p style="margin:0 0 20px;font-size:14px;color:#475569;line-height:1.6;">
      Great news! ${facilities.length} new verified treatment center${facilities.length > 1 ? "s have" : " has"} been added near ${location}. Here's what's new:
    </p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      ${facilityCards}
    </table>
    ${moreLink}
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px auto;">
      <tr><td style="background:#1B365D;border-radius:8px;">
        <a href="${DASHBOARD_URL}/search" style="display:inline-block;padding:12px 28px;font-size:14px;font-weight:600;color:#fff;text-decoration:none;">Browse All Facilities</a>
      </td></tr>
    </table>
  </td></tr>
  <tr><td style="background:#f8fafc;padding:16px;text-align:center;border-top:1px solid #e2e8f0;">
    <p style="margin:0;font-size:11px;color:#94a3b8;">Update your preferences in <a href="${DASHBOARD_URL}/account/settings" style="color:#64748b;">Account Settings</a></p>
  </td></tr>
</table></td></tr></table></body></html>`;
}
