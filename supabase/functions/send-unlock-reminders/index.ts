import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ============ LOGGING ============
const log = (level: "INFO" | "WARN" | "ERROR", message: string, details?: unknown) => {
  const timestamp = new Date().toISOString();
  const detailsStr = details ? ` | ${JSON.stringify(details)}` : "";
  console.log(`[${timestamp}] [send-unlock-reminders] [${level}] ${message}${detailsStr}`);
};

// ============ EMAIL TEMPLATES ============
function get6HourReminderEmail(facilityName: string, leadName: string, dashboardUrl: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #f5f5f5; -webkit-font-smoothing: antialiased;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; width: 100%;">
          <tr>
            <td style="background-color: #1B365D; background: #1B365D; padding: 32px; border-radius: 12px 12px 0 0; text-align: center;">
              <div style="font-size: 48px; margin-bottom: 16px;">📬</div>
              <p style="margin: 0 0 8px 0; font-size: 12px; color: #cbd5e1; font-family: Arial, Helvetica, sans-serif; text-transform: uppercase; letter-spacing: 1px;">REHABLOOKUP</p>
              <h1 style="margin: 0; font-size: 24px; color: #ffffff; font-family: Arial, Helvetica, sans-serif; font-weight: 600;">New Inquiry Waiting</h1>
            </td>
          </tr>
          <tr>
            <td style="background: #ffffff; padding: 32px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; border-left: 1px solid #e5e7eb; border-right: 1px solid #e5e7eb;">
              <p style="margin: 0 0 20px 0; color: #374151; font-size: 16px; line-height: 1.6;">
                Hi ${facilityName} team,
              </p>
              <p style="margin: 0 0 24px 0; color: #374151; font-size: 15px; line-height: 1.6;">
                You received an inquiry from <strong>${leadName}</strong> a few hours ago. Quick response times lead to better conversion rates!
              </p>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background: #f0f9ff; border: 1px solid #bfdbfe; border-radius: 8px; margin-bottom: 24px;">
                <tr>
                  <td style="padding: 20px;">
                    <p style="margin: 0; font-size: 14px; color: #1e40af; line-height: 1.5;">
                      💡 <strong>Tip:</strong> Facilities that respond within 6 hours see 40% higher conversion rates.
                    </p>
                  </td>
                </tr>
              </table>
              <div style="text-align: center;">
                <a href="${dashboardUrl}" style="display: inline-block; background: #1B365D; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 15px;">
                  View Lead in Dashboard
                </a>
              </div>
            </td>
          </tr>
          <tr>
            <td style="background: #1B365D; padding: 24px 32px; border-radius: 0 0 12px 12px; text-align: center;">
              <p style="margin: 0; color: #cbd5e1; font-family: Arial, Helvetica, sans-serif; font-size: 12px;">
                © ${new Date().getFullYear()} RehabLookup. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function get12HourReminderEmail(facilityName: string, leadName: string, dashboardUrl: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #f5f5f5; -webkit-font-smoothing: antialiased;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; width: 100%;">
          <tr>
            <td style="background-color: #b45309; background: #b45309; padding: 32px; border-radius: 12px 12px 0 0; text-align: center;">
              <div style="font-size: 48px; margin-bottom: 16px;">⏰</div>
              <p style="margin: 0 0 8px 0; font-size: 12px; color: #ffffff; font-family: Arial, Helvetica, sans-serif; text-transform: uppercase; letter-spacing: 1px;">REHABLOOKUP</p>
              <h1 style="margin: 0; font-size: 24px; color: #ffffff; font-family: Arial, Helvetica, sans-serif; font-weight: 600;">Don't Miss This Lead</h1>
            </td>
          </tr>
          <tr>
            <td style="background: #ffffff; padding: 32px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; border-left: 1px solid #e5e7eb; border-right: 1px solid #e5e7eb;">
              <p style="margin: 0 0 20px 0; color: #374151; font-size: 16px; line-height: 1.6;">
                Hi ${facilityName} team,
              </p>
              <p style="margin: 0 0 24px 0; color: #374151; font-size: 15px; line-height: 1.6;">
                A potential client, <strong>${leadName}</strong>, is waiting for your response. They submitted an inquiry 12 hours ago.
              </p>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; margin-bottom: 24px;">
                <tr>
                  <td style="padding: 20px;">
                    <p style="margin: 0; font-size: 14px; color: #92400e; line-height: 1.5;">
                      ⚡ <strong>Act fast:</strong> Families seeking treatment options often reach out to multiple facilities. Be the first to connect!
                    </p>
                  </td>
                </tr>
              </table>
              <div style="text-align: center;">
                <a href="${dashboardUrl}" style="display: inline-block; background: #b45309; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 15px;">
                  Unlock & Connect Now
                </a>
              </div>
            </td>
          </tr>
          <tr>
            <td style="background: #1B365D; padding: 24px 32px; border-radius: 0 0 12px 12px; text-align: center;">
              <p style="margin: 0; color: #cbd5e1; font-family: Arial, Helvetica, sans-serif; font-size: 12px;">
                © ${new Date().getFullYear()} RehabLookup. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function get24HourReminderEmail(facilityName: string, leadName: string, dashboardUrl: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #f5f5f5; -webkit-font-smoothing: antialiased;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; width: 100%;">
          <tr>
            <td style="background-color: #dc2626; background: #dc2626; padding: 32px; border-radius: 12px 12px 0 0; text-align: center;">
              <div style="font-size: 48px; margin-bottom: 16px;">🚨</div>
              <p style="margin: 0 0 8px 0; font-size: 12px; color: #ffffff; font-family: Arial, Helvetica, sans-serif; text-transform: uppercase; letter-spacing: 1px;">REHABLOOKUP</p>
              <h1 style="margin: 0; font-size: 24px; color: #ffffff; font-family: Arial, Helvetica, sans-serif; font-weight: 600;">Last Chance to Respond</h1>
            </td>
          </tr>
          <tr>
            <td style="background: #ffffff; padding: 32px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; border-left: 1px solid #e5e7eb; border-right: 1px solid #e5e7eb;">
              <p style="margin: 0 0 20px 0; color: #374151; font-size: 16px; line-height: 1.6;">
                Hi ${facilityName} team,
              </p>
              <p style="margin: 0 0 24px 0; color: #374151; font-size: 15px; line-height: 1.6;">
                <strong>${leadName}</strong> submitted an inquiry 24 hours ago and is still waiting to hear from you.
              </p>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background: #fef2f2; border: 2px solid #ef4444; border-radius: 8px; margin-bottom: 24px;">
                <tr>
                  <td style="padding: 20px; text-align: center;">
                    <p style="margin: 0 0 8px 0; font-size: 16px; font-weight: 600; color: #dc2626;">⚠️ Final Reminder</p>
                    <p style="margin: 0; font-size: 14px; color: #7f1d1d; line-height: 1.5;">
                      Don't let this opportunity slip away. Unlock now to connect with this potential client before they move on.
                    </p>
                  </td>
                </tr>
              </table>
              <div style="text-align: center;">
                <a href="${dashboardUrl}" style="display: inline-block; background: #dc2626; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 15px;">
                  🔓 Unlock Before It's Too Late
                </a>
              </div>
            </td>
          </tr>
          <tr>
            <td style="background: #1B365D; padding: 24px 32px; border-radius: 0 0 12px 12px; text-align: center;">
              <p style="margin: 0; color: #cbd5e1; font-family: Arial, Helvetica, sans-serif; font-size: 12px;">
                © ${new Date().getFullYear()} RehabLookup. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// Mask name for emails
function maskLeadName(fullName: string): string {
  if (!fullName || fullName.trim().length === 0) return "New Lead";
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) return parts[0];
  const firstName = parts[0];
  const lastInitial = parts[parts.length - 1].charAt(0).toUpperCase();
  return `${firstName} ${lastInitial}.`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    log("INFO", "Starting unlock reminder processing");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const now = new Date();
    const dashboardUrl = "https://rehablookup.com/provider/inquiries";

    // Define reminder windows (in hours)
    const REMINDER_6H = 6;
    const REMINDER_12H = 12;
    const REMINDER_24H = 24;

    // Calculate time boundaries for each reminder
    const sixHoursAgo = new Date(now.getTime() - REMINDER_6H * 60 * 60 * 1000);
    const sevenHoursAgo = new Date(now.getTime() - (REMINDER_6H + 1) * 60 * 60 * 1000);
    
    const twelveHoursAgo = new Date(now.getTime() - REMINDER_12H * 60 * 60 * 1000);
    const thirteenHoursAgo = new Date(now.getTime() - (REMINDER_12H + 1) * 60 * 60 * 1000);
    
    const twentyFourHoursAgo = new Date(now.getTime() - REMINDER_24H * 60 * 60 * 1000);
    const twentyFiveHoursAgo = new Date(now.getTime() - (REMINDER_24H + 1) * 60 * 60 * 1000);

    let totalSent = 0;

    // ============ 6-HOUR REMINDERS ============
    const { data: sixHourLeads } = await supabase
      .from("leads")
      .select(`
        id, name, facility_id,
        facilities!inner (id, name, email, user_id, reply_email, reply_email_verified)
      `)
      .is("reminder_6h_sent_at", null)
      .lte("created_at", sixHoursAgo.toISOString())
      .gte("created_at", sevenHoursAgo.toISOString())
      .eq("redistribution_status", "exclusive");

    // Check which leads are not unlocked
    for (const lead of sixHourLeads || []) {
      const { data: unlock } = await supabase
        .from("lead_unlocks")
        .select("id")
        .eq("lead_id", lead.id)
        .eq("facility_id", lead.facility_id)
        .maybeSingle();

      // deno-lint-ignore no-explicit-any
      const facility = lead.facilities as any;
      if (!unlock && facility) {
        // Get provider email
        const { data: profile } = await supabase
          .from("profiles")
          .select("email")
          .eq("user_id", facility.user_id)
          .maybeSingle();

        const email = (facility.reply_email_verified && facility.reply_email) 
          ? facility.reply_email 
          : (profile?.email || facility.email);

        if (email) {
          try {
            await resend.emails.send({
              from: "RehabLookup <notifications@rehablookup.com>",
              to: email,
              subject: `New inquiry waiting for you - ${facility.name}`,
              html: get6HourReminderEmail(facility.name, maskLeadName(lead.name), dashboardUrl),
            });

            await supabase
              .from("leads")
              .update({ reminder_6h_sent_at: now.toISOString() })
              .eq("id", lead.id);

            totalSent++;
            log("INFO", "6h reminder sent", { leadId: lead.id, email });
          } catch (e) {
            log("WARN", "Failed to send 6h reminder", { leadId: lead.id, error: String(e) });
          }
        }
      }
    }

    // ============ 12-HOUR REMINDERS ============
    const { data: twelveHourLeads } = await supabase
      .from("leads")
      .select(`
        id, name, facility_id,
        facilities!inner (id, name, email, user_id, reply_email, reply_email_verified)
      `)
      .is("reminder_12h_sent_at", null)
      .not("reminder_6h_sent_at", "is", null)
      .lte("created_at", twelveHoursAgo.toISOString())
      .gte("created_at", thirteenHoursAgo.toISOString())
      .eq("redistribution_status", "exclusive");

    for (const lead of twelveHourLeads || []) {
      const { data: unlock } = await supabase
        .from("lead_unlocks")
        .select("id")
        .eq("lead_id", lead.id)
        .eq("facility_id", lead.facility_id)
        .maybeSingle();

      // deno-lint-ignore no-explicit-any
      const facility = lead.facilities as any;
      if (!unlock && facility) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("email")
          .eq("user_id", facility.user_id)
          .maybeSingle();

        const email = (facility.reply_email_verified && facility.reply_email) 
          ? facility.reply_email 
          : (profile?.email || facility.email);

        if (email) {
          try {
            await resend.emails.send({
              from: "RehabLookup <notifications@rehablookup.com>",
              to: email,
              subject: `Don't miss this lead opportunity - ${facility.name}`,
              html: get12HourReminderEmail(facility.name, maskLeadName(lead.name), dashboardUrl),
            });

            await supabase
              .from("leads")
              .update({ reminder_12h_sent_at: now.toISOString() })
              .eq("id", lead.id);

            totalSent++;
            log("INFO", "12h reminder sent", { leadId: lead.id, email });
          } catch (e) {
            log("WARN", "Failed to send 12h reminder", { leadId: lead.id, error: String(e) });
          }
        }
      }
    }

    // ============ 24-HOUR REMINDERS ============
    const { data: twentyFourHourLeads } = await supabase
      .from("leads")
      .select(`
        id, name, facility_id,
        facilities!inner (id, name, email, user_id, reply_email, reply_email_verified)
      `)
      .is("reminder_24h_sent_at", null)
      .not("reminder_12h_sent_at", "is", null)
      .lte("created_at", twentyFourHoursAgo.toISOString())
      .gte("created_at", twentyFiveHoursAgo.toISOString())
      .eq("redistribution_status", "exclusive");

    for (const lead of twentyFourHourLeads || []) {
      const { data: unlock } = await supabase
        .from("lead_unlocks")
        .select("id")
        .eq("lead_id", lead.id)
        .eq("facility_id", lead.facility_id)
        .maybeSingle();

      // deno-lint-ignore no-explicit-any
      const facility = lead.facilities as any;
      if (!unlock && facility) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("email")
          .eq("user_id", facility.user_id)
          .maybeSingle();

        const email = (facility.reply_email_verified && facility.reply_email) 
          ? facility.reply_email 
          : (profile?.email || facility.email);

        if (email) {
          try {
            await resend.emails.send({
              from: "RehabLookup <notifications@rehablookup.com>",
              to: email,
              subject: `⚠️ Last chance to respond - ${facility.name}`,
              html: get24HourReminderEmail(facility.name, maskLeadName(lead.name), dashboardUrl),
            });

            await supabase
              .from("leads")
              .update({ reminder_24h_sent_at: now.toISOString() })
              .eq("id", lead.id);

            totalSent++;
            log("INFO", "24h reminder sent", { leadId: lead.id, email });
          } catch (e) {
            log("WARN", "Failed to send 24h reminder", { leadId: lead.id, error: String(e) });
          }
        }
      }
    }

    log("INFO", "Reminder processing complete", { totalSent });

    return new Response(
      JSON.stringify({ success: true, remindersSent: totalSent }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    log("ERROR", "Unhandled error", { error: error instanceof Error ? error.message : String(error) });
    return new Response(
      JSON.stringify({ success: false, error: "Failed to process reminders" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
