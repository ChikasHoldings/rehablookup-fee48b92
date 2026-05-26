/**
 * placement-monitor — non-destructive concierge-case watchdog
 *
 * Scheduled slice of the (deliberately unscheduled) legacy placement-cron,
 * carrying ONLY its notify-only responsibilities:
 *   1. SLA monitoring — alert admins when a case stalls >48h in an active status
 *   2. Seeker review reminders — nudge seekers sitting on ready options >48h
 *
 * Intentionally EXCLUDES placement-cron's mutating / destructive slices:
 *   - auto-decline of stale introductions → handled by the dedicated,
 *     already-scheduled auto-decline-stale-introductions function
 *   - auto-introduction retry → status mutation; left to intake-time
 *     auto-intro + manual admin sending
 *   - 14-day stale-case auto-close → closes real seeker cases; not
 *     automated by design
 *
 * Cron-only: gated by assertCronSecret (fail-closed). Never client-invoked.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2?target=denonext";
import { assertCronSecret } from "../_shared/cron-auth.ts";
import { Resend } from "https://esm.sh/resend@2.0.0?target=denonext";
import { sendEmailWithRetry } from "../_shared/resilient-email-sender.ts";

const VERSION = "1.0.0";
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ─── Configuration ───────────────────────────────────────────────────────────
const SLA_THRESHOLD_HOURS = 48;
const SEEKER_REMINDER_HOURS = 48;

const DASHBOARD_URL = "https://rehablookup.com";

const log = (level: "INFO" | "WARN" | "ERROR", message: string, details?: unknown) => {
  const timestamp = new Date().toISOString();
  const detailsStr = details ? ` | ${JSON.stringify(details)}` : "";
  console.log(`[${timestamp}] [placement-monitor] [${VERSION}] [${level}] ${message}${detailsStr}`);
};

// ─── Email Templates ─────────────────────────────────────────────────────────
function slaAlertEmail(stalledCases: Array<{ id: string; status: string; user_name: string; hours: number }>): string {
  const rows = stalledCases.map(c => `
    <tr>
      <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;font-size:14px;">${c.user_name}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;font-size:14px;">${c.status.replace(/_/g, ' ')}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;font-size:14px;color:#dc2626;font-weight:600;">${Math.round(c.hours)}h</td>
    </tr>
  `).join('');

  return `
<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:40px 20px;">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.06);">
  <tr><td style="background:#1B365D;padding:24px;text-align:center;">
    <h1 style="margin:0;color:#fff;font-size:20px;">⚠️ Placement SLA Alert</h1>
    <p style="margin:8px 0 0;color:#94a3b8;font-size:14px;">${stalledCases.length} case(s) require attention</p>
  </td></tr>
  <tr><td style="padding:24px;">
    <p style="margin:0 0 16px;font-size:15px;color:#334155;">The following placement cases have been stalled for over ${SLA_THRESHOLD_HOURS} hours:</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;">
      <tr style="background:#f1f5f9;">
        <th style="padding:10px 12px;text-align:left;font-size:13px;color:#64748b;">Client</th>
        <th style="padding:10px 12px;text-align:left;font-size:13px;color:#64748b;">Status</th>
        <th style="padding:10px 12px;text-align:left;font-size:13px;color:#64748b;">Stalled</th>
      </tr>
      ${rows}
    </table>
    <div style="margin-top:24px;text-align:center;">
      <a href="${DASHBOARD_URL}/admin/concierge" style="display:inline-block;padding:12px 24px;background:#1B365D;color:#fff;text-decoration:none;border-radius:8px;font-size:14px;font-weight:600;">Review Cases</a>
    </div>
  </td></tr>
</table>
</td></tr></table></body></html>`;
}

function seekerReminderEmail(userName: string, facilitiesCount: number): string {
  return `
<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:40px 20px;">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.06);">
  <tr><td style="background:#1B365D;padding:24px;text-align:center;">
    <h1 style="margin:0;color:#fff;font-size:20px;">Your Treatment Options Are Ready</h1>
  </td></tr>
  <tr><td style="padding:24px;">
    <p style="margin:0 0 16px;font-size:15px;color:#334155;line-height:1.6;">
      Hi ${userName},
    </p>
    <p style="margin:0 0 16px;font-size:15px;color:#334155;line-height:1.6;">
      We wanted to follow up — <strong>${facilitiesCount} treatment facilities</strong> have confirmed they can help with your situation. Your personalized options are waiting for your review.
    </p>
    <p style="margin:0 0 24px;font-size:15px;color:#334155;line-height:1.6;">
      Taking the next step is easy — just review your options and let us know which facility feels right for you.
    </p>
    <div style="text-align:center;">
      <a href="${DASHBOARD_URL}/seeker/concierge" style="display:inline-block;padding:14px 28px;background:#0EA5E9;color:#fff;text-decoration:none;border-radius:8px;font-size:15px;font-weight:600;">Review My Options</a>
    </div>
    <p style="margin:24px 0 0;font-size:13px;color:#94a3b8;text-align:center;">
      Questions? Reply to this email or call us at (888) 555-0123.
    </p>
  </td></tr>
</table>
</td></tr></table></body></html>`;
}

// ─── Main Handler ────────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  const __cronAuth = assertCronSecret(req);
  if (!__cronAuth.ok) return __cronAuth.response;

  const startTime = Date.now();
  const results = {
    slaAlerts: 0,
    seekerReminders: 0,
    errors: [] as string[],
  };

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendKey = Deno.env.get("RESEND_API_KEY");
    const supabase = createClient(supabaseUrl, supabaseKey);
    const resend = resendKey ? new Resend(resendKey) : null;

    const now = new Date();

    // ═══════════════════════════════════════════════════════════════════════════
    // 1. SLA MONITORING — Alert admins for stalled cases
    // ═══════════════════════════════════════════════════════════════════════════
    log("INFO", "Starting SLA monitoring");
    try {
      const slaThreshold = new Date(now.getTime() - SLA_THRESHOLD_HOURS * 60 * 60 * 1000).toISOString();

      // Find cases that haven't had a status change in >48h and are in active statuses
      const { data: stalledCases } = await supabase
        .from('concierge_inquiries')
        .select('id, status, user_name, updated_at')
        .not('status', 'in', '("closed","completed","billed")')
        .lt('updated_at', slaThreshold)
        .order('updated_at', { ascending: true })
        .limit(20);

      if (stalledCases && stalledCases.length > 0) {
        const alertData = stalledCases.map(c => ({
          id: c.id,
          status: c.status,
          user_name: c.user_name?.split(' ')[0] || 'Unknown',
          hours: (now.getTime() - new Date(c.updated_at).getTime()) / (1000 * 60 * 60),
        }));

        // Check if we already sent an SLA alert in the last 12 hours (avoid spam)
        const lastAlertThreshold = new Date(now.getTime() - 12 * 60 * 60 * 1000).toISOString();
        const { data: recentAlert } = await supabase
          .from('admin_notifications')
          .select('id')
          .eq('type', 'sla_alert')
          .gte('created_at', lastAlertThreshold)
          .limit(1);

        if (!recentAlert || recentAlert.length === 0) {
          // Send SLA alert email to admins. admin_user_profiles has no email
          // column — resolve the address via auth.admin.getUserById, the same
          // pattern send-admin-daily-summary uses.
          if (resend) {
            const { data: adminProfiles } = await supabase
              .from('admin_user_profiles')
              .select('user_id')
              .in('admin_role', ['super_admin', 'manager'])
              .eq('status', 'active');

            for (const profile of (adminProfiles || [])) {
              try {
                const { data: userData } = await supabase.auth.admin.getUserById(profile.user_id);
                const adminEmail = userData?.user?.email;
                if (!adminEmail) continue;
                await sendEmailWithRetry(supabase, resend, {
                  from: "RehabLookup Alerts <alerts@rehablookup.com>",
                  to: [adminEmail],
                  subject: `⚠️ ${alertData.length} Placement Case(s) Stalled — Action Required`,
                  html: slaAlertEmail(alertData),
                }, { emailType: "sla_alert", idempotencyKey: `sla-alert-${adminEmail}-${new Date().toISOString().slice(0, 10)}` });
              } catch (e) {
                log("WARN", "Failed to send SLA alert email", { userId: profile.user_id, error: String(e) });
              }
            }
          }

          // Create admin notification
          await supabase.from('admin_notifications').insert({
            type: 'sla_alert',
            title: `${alertData.length} Placement Cases Stalled`,
            message: `${alertData.length} cases have been in the same status for over ${SLA_THRESHOLD_HOURS} hours.`,
            metadata: { cases: alertData.map(c => ({ id: c.id, status: c.status, hours: Math.round(c.hours) })) },
          });

          results.slaAlerts = alertData.length;
          log("INFO", "SLA alerts sent", { count: alertData.length });
        } else {
          log("INFO", "SLA alert already sent recently, skipping");
        }
      }
    } catch (e) {
      const msg = `SLA monitoring error: ${String(e)}`;
      log("ERROR", msg);
      results.errors.push(msg);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // 2. SEEKER REVIEW REMINDERS — Nudge after 48h
    // ═══════════════════════════════════════════════════════════════════════════
    log("INFO", "Starting seeker reminder processing");
    try {
      const reminderThreshold = new Date(now.getTime() - SEEKER_REMINDER_HOURS * 60 * 60 * 1000).toISOString();

      // Cases sitting in "presented_to_seeker" for >48h. A case can
      // legitimately linger here, so de-dup is handled per case below via the
      // email idempotency key rather than a seeker_reminder_sent_at column
      // (that column lives in an unapplied placement-automation migration, so
      // we can't depend on it). We re-scan each run but only ever nudge once.
      const { data: pendingReview } = await supabase
        .from('concierge_inquiries')
        .select('id, user_name, user_email, status, updated_at')
        .eq('status', 'presented_to_seeker')
        .lt('updated_at', reminderThreshold)
        .not('user_email', 'is', null)
        .limit(20);

      for (const inquiry of (pendingReview || [])) {
        try {
          if (!resend || !inquiry.user_email) continue;

          // Count how many facilities are ready for review
          const { count } = await supabase
            .from('concierge_introductions')
            .select('id', { count: 'exact', head: true })
            .eq('inquiry_id', inquiry.id)
            .eq('provider_response', 'interested');

          const facilitiesCount = count || 0;
          if (facilitiesCount === 0) continue;

          // Idempotent on seeker-reminder-${id} (email_tracking_events), so a
          // re-scan never produces a duplicate nudge.
          const firstName = inquiry.user_name?.split(' ')[0] || 'there';
          const sendResult = await sendEmailWithRetry(supabase, resend, {
            from: "RehabLookup Concierge <concierge@rehablookup.com>",
            to: [inquiry.user_email],
            subject: `${firstName}, your treatment options are waiting`,
            html: seekerReminderEmail(firstName, facilitiesCount),
          }, { emailType: "seeker_reminder", idempotencyKey: `seeker-reminder-${inquiry.id}` });

          // Only log + count the FIRST time the nudge actually goes out.
          if (sendResult.success && !sendResult.deduplicated) {
            await supabase.from('concierge_case_events').insert({
              inquiry_id: inquiry.id,
              event_type: 'seeker_reminder_sent',
              event_data: { facilities_ready: facilitiesCount, auto: true },
              actor_type: 'system',
            });
            results.seekerReminders++;
          }
        } catch (e) {
          log("WARN", "Failed to send seeker reminder", { id: inquiry.id, error: String(e) });
        }
      }

      if (results.seekerReminders > 0) {
        log("INFO", "Seeker reminders sent", { count: results.seekerReminders });
      }
    } catch (e) {
      const msg = `Seeker reminder error: ${String(e)}`;
      log("ERROR", msg);
      results.errors.push(msg);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // SUMMARY
    // ═══════════════════════════════════════════════════════════════════════════
    const duration = Date.now() - startTime;
    log("INFO", "Placement monitor completed", { ...results, durationMs: duration });

    return new Response(
      JSON.stringify({
        success: true,
        ...results,
        durationMs: duration,
        _version: VERSION,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    log("ERROR", "Fatal error in placement-monitor", { message: errorMessage });
    return new Response(
      JSON.stringify({ success: false, error: errorMessage, ...results, _version: VERSION }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
