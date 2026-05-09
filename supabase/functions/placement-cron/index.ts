/**
 * placement-cron — Automated Placement Lifecycle Manager
 * 
 * Runs on a schedule (every 30 minutes) to handle:
 * 1. SLA Monitoring: Alert admins when cases stall >48h in any status
 * 2. Auto-Decline: Expire provider introductions with no response after 72h
 * 3. Seeker Reminders: Nudge seekers who haven't reviewed options after 48h
 * 4. Auto-Introduction: Send introductions for matched cases that haven't been introduced yet
 * 5. Stale Case Cleanup: Close abandoned cases after 14 days of inactivity
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2?target=denonext";
import { Resend } from "https://esm.sh/resend@2.0.0?target=denonext";
import { sendEmailWithRetry } from "../_shared/resilient-email-sender.ts";

const VERSION = "1.0.0";
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ─── Configuration ───────────────────────────────────────────────────────────
const SLA_THRESHOLD_HOURS = 48;
const PROVIDER_TIMEOUT_HOURS = 72;
const SEEKER_REMINDER_HOURS = 48;
const STALE_CASE_DAYS = 14;
const MAX_AUTO_INTRODUCTIONS_PER_RUN = 10;

const DASHBOARD_URL = "https://rehablookup.com";

const log = (level: "INFO" | "WARN" | "ERROR", message: string, details?: unknown) => {
  const timestamp = new Date().toISOString();
  const detailsStr = details ? ` | ${JSON.stringify(details)}` : "";
  console.log(`[${timestamp}] [placement-cron] [${VERSION}] [${level}] ${message}${detailsStr}`);
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

  const startTime = Date.now();
  const results = {
    slaAlerts: 0,
    autoDeclined: 0,
    seekerReminders: 0,
    autoIntroductions: 0,
    staleCasesClosed: 0,
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
          // Send SLA alert email to admins
          if (resend) {
            const { data: admins } = await supabase
              .from('admin_user_profiles')
              .select('email')
              .in('admin_role', ['super_admin', 'manager']);

            for (const admin of (admins || [])) {
              if (admin.email) {
                try {
                  await sendEmailWithRetry(resend, {
                    from: "RehabLookup Alerts <alerts@rehablookup.com>",
                    to: [admin.email],
                    subject: `⚠️ ${alertData.length} Placement Case(s) Stalled — Action Required`,
                    html: slaAlertEmail(alertData),
                  });
                } catch (e) {
                  log("WARN", "Failed to send SLA alert email", { email: admin.email, error: String(e) });
                }
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
    // 2. PROVIDER RESPONSE TIMEOUT — Auto-decline after 72h
    // ═══════════════════════════════════════════════════════════════════════════
    log("INFO", "Starting provider timeout processing");
    try {
      const timeoutThreshold = new Date(now.getTime() - PROVIDER_TIMEOUT_HOURS * 60 * 60 * 1000).toISOString();

      // Find introductions that were sent but never responded to
      const { data: expiredIntros } = await supabase
        .from('concierge_introductions')
        .select('id, inquiry_id, facility_id, sent_at, facilities!inner(name)')
        .eq('provider_response', 'pending')
        .not('sent_at', 'is', null)
        .lt('sent_at', timeoutThreshold)
        .limit(50);

      for (const intro of (expiredIntros || [])) {
        try {
          // Auto-decline the introduction
          const { error: updateErr } = await supabase
            .from('concierge_introductions')
            .update({
              provider_response: 'expired',
              provider_responded_at: now.toISOString(),
              provider_decline_reason: 'Auto-expired: no response within 72 hours',
            })
            .eq('id', intro.id)
            .eq('provider_response', 'pending'); // Optimistic lock

          if (!updateErr) {
            results.autoDeclined++;

            // Log case event
            await supabase.from('concierge_case_events').insert({
              inquiry_id: intro.inquiry_id,
              event_type: 'provider_auto_declined',
              event_data: {
                facility_id: intro.facility_id,
                facility_name: (intro as any).facilities?.name || 'Unknown',
                reason: 'No response within 72 hours',
                auto: true,
              },
              actor_type: 'system',
            });

            // Notify admin
            await supabase.from('admin_notifications').insert({
              type: 'provider_timeout',
              title: 'Provider Introduction Expired',
              message: `${(intro as any).facilities?.name || 'A facility'} did not respond within 72 hours. Introduction auto-expired.`,
              metadata: { inquiry_id: intro.inquiry_id, facility_id: intro.facility_id, introduction_id: intro.id },
            });
          }
        } catch (e) {
          log("WARN", "Failed to auto-decline introduction", { id: intro.id, error: String(e) });
        }
      }

      if (results.autoDeclined > 0) {
        log("INFO", "Provider timeouts processed", { count: results.autoDeclined });
      }
    } catch (e) {
      const msg = `Provider timeout error: ${String(e)}`;
      log("ERROR", msg);
      results.errors.push(msg);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // 3. SEEKER REVIEW REMINDERS — Nudge after 48h
    // ═══════════════════════════════════════════════════════════════════════════
    log("INFO", "Starting seeker reminder processing");
    try {
      const reminderThreshold = new Date(now.getTime() - SEEKER_REMINDER_HOURS * 60 * 60 * 1000).toISOString();

      // Find cases in "presented_to_seeker" status for >48h without a reminder sent
      const { data: pendingReview } = await supabase
        .from('concierge_inquiries')
        .select('id, user_name, email, status, updated_at, seeker_reminder_sent_at')
        .eq('status', 'presented_to_seeker')
        .lt('updated_at', reminderThreshold)
        .is('seeker_reminder_sent_at', null)
        .not('email', 'is', null)
        .limit(20);

      for (const inquiry of (pendingReview || [])) {
        try {
          // Count how many facilities are ready for review
          const { count } = await supabase
            .from('concierge_introductions')
            .select('id', { count: 'exact', head: true })
            .eq('inquiry_id', inquiry.id)
            .eq('provider_response', 'interested');

          const facilitiesCount = count || 0;
          if (facilitiesCount === 0) continue;

          // Send reminder email
          if (resend && inquiry.email) {
            const firstName = inquiry.user_name?.split(' ')[0] || 'there';
            await sendEmailWithRetry(resend, {
              from: "RehabLookup Concierge <concierge@rehablookup.com>",
              to: [inquiry.email],
              subject: `${firstName}, your treatment options are waiting`,
              html: seekerReminderEmail(firstName, facilitiesCount),
            });
          }

          // Mark reminder as sent
          await supabase
            .from('concierge_inquiries')
            .update({ seeker_reminder_sent_at: now.toISOString() })
            .eq('id', inquiry.id);

          // Log event
          await supabase.from('concierge_case_events').insert({
            inquiry_id: inquiry.id,
            event_type: 'seeker_reminder_sent',
            event_data: { facilities_ready: facilitiesCount, auto: true },
            actor_type: 'system',
          });

          results.seekerReminders++;
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
    // 4. AUTO-INTRODUCTION — Send introductions for matched cases
    // ═══════════════════════════════════════════════════════════════════════════
    log("INFO", "Starting auto-introduction processing");
    try {
      // Find cases that have been matched but haven't had introductions sent yet
      // These are cases where auto-matching ran but the admin hasn't manually sent intros
      const { data: matchedCases } = await supabase
        .from('concierge_inquiries')
        .select('id, matched_facility_ids, match_scores, user_name, status')
        .in('status', ['matched', 'intake_reviewed', 'advisor_assigned', 'matching_providers'])
        .not('matched_facility_ids', 'is', null)
        .is('auto_introductions_sent_at', null)
        .order('created_at', { ascending: true })
        .limit(MAX_AUTO_INTRODUCTIONS_PER_RUN);

      for (const inquiry of (matchedCases || [])) {
        try {
          const facilityIds = inquiry.matched_facility_ids || [];
          if (facilityIds.length === 0) continue;

          // Check if introductions already exist for this inquiry
          const { count: existingCount } = await supabase
            .from('concierge_introductions')
            .select('id', { count: 'exact', head: true })
            .eq('inquiry_id', inquiry.id);

          if ((existingCount || 0) > 0) {
            // Already has introductions — mark as sent and skip
            await supabase
              .from('concierge_inquiries')
              .update({ auto_introductions_sent_at: now.toISOString() })
              .eq('id', inquiry.id);
            continue;
          }

          // Create introduction records and send emails for each matched facility
          let introsSent = 0;
          for (const facilityId of facilityIds) {
            try {
              // Create the introduction record
              const { data: introRecord, error: insertErr } = await supabase
                .from('concierge_introductions')
                .insert({
                  inquiry_id: inquiry.id,
                  facility_id: facilityId,
                  provider_response: 'pending',
                  sent_at: now.toISOString(),
                  introduction_type: 'auto',
                })
                .select('id')
                .single();

              if (insertErr || !introRecord) {
                log("WARN", "Failed to create auto-introduction", { inquiryId: inquiry.id, facilityId, error: insertErr?.message });
                continue;
              }

              // Send the introduction email via the existing edge function
              try {
                await fetch(`${supabaseUrl}/functions/v1/send-concierge-introduction`, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${supabaseKey}`,
                  },
                  body: JSON.stringify({
                    inquiryId: inquiry.id,
                    facilityId: facilityId,
                    introductionId: introRecord.id,
                  }),
                });
                introsSent++;
              } catch (emailErr) {
                log("WARN", "Auto-introduction email failed (record created)", { introId: introRecord.id, error: String(emailErr) });
                introsSent++; // Record was created, email is best-effort
              }
            } catch (e) {
              log("WARN", "Failed to process auto-introduction for facility", { facilityId, error: String(e) });
            }
          }

          if (introsSent > 0) {
            // Update case status and mark introductions as sent
            await supabase
              .from('concierge_inquiries')
              .update({
                auto_introductions_sent_at: now.toISOString(),
                status: 'provider_prequalification',
              })
              .eq('id', inquiry.id);

            // Log case event
            await supabase.from('concierge_case_events').insert({
              inquiry_id: inquiry.id,
              event_type: 'auto_introductions_sent',
              event_data: {
                facilities_count: introsSent,
                facility_ids: facilityIds.slice(0, introsSent),
                auto: true,
              },
              actor_type: 'system',
            });

            // Send notification to seeker
            try {
              await fetch(`${supabaseUrl}/functions/v1/send-concierge-notifications`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${supabaseKey}`,
                },
                body: JSON.stringify({
                  type: 'introductions_sent',
                  inquiryId: inquiry.id,
                }),
              });
            } catch (e) {
              log("WARN", "Failed to send introductions_sent notification", { error: String(e) });
            }

            results.autoIntroductions += introsSent;
          }
        } catch (e) {
          log("WARN", "Failed to process auto-introductions for case", { id: inquiry.id, error: String(e) });
        }
      }

      if (results.autoIntroductions > 0) {
        log("INFO", "Auto-introductions sent", { count: results.autoIntroductions });
      }
    } catch (e) {
      const msg = `Auto-introduction error: ${String(e)}`;
      log("ERROR", msg);
      results.errors.push(msg);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // 5. STALE CASE CLEANUP — Close abandoned cases after 14 days
    // ═══════════════════════════════════════════════════════════════════════════
    log("INFO", "Starting stale case cleanup");
    try {
      const staleThreshold = new Date(now.getTime() - STALE_CASE_DAYS * 24 * 60 * 60 * 1000).toISOString();

      // Find cases that have been inactive for 14+ days in early statuses
      const { data: staleCases } = await supabase
        .from('concierge_inquiries')
        .select('id, status, user_name')
        .in('status', ['intake_submitted', 'new', 'intake_reviewed', 'matched'])
        .lt('updated_at', staleThreshold)
        .limit(20);

      for (const staleCase of (staleCases || [])) {
        try {
          await supabase
            .from('concierge_inquiries')
            .update({ status: 'closed', closed_reason: 'auto_stale' })
            .eq('id', staleCase.id);

          await supabase.from('concierge_case_events').insert({
            inquiry_id: staleCase.id,
            event_type: 'case_auto_closed',
            event_data: {
              reason: `No activity for ${STALE_CASE_DAYS} days`,
              previous_status: staleCase.status,
              auto: true,
            },
            actor_type: 'system',
          });

          results.staleCasesClosed++;
        } catch (e) {
          log("WARN", "Failed to close stale case", { id: staleCase.id, error: String(e) });
        }
      }

      if (results.staleCasesClosed > 0) {
        log("INFO", "Stale cases closed", { count: results.staleCasesClosed });
      }
    } catch (e) {
      const msg = `Stale case cleanup error: ${String(e)}`;
      log("ERROR", msg);
      results.errors.push(msg);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // SUMMARY
    // ═══════════════════════════════════════════════════════════════════════════
    const duration = Date.now() - startTime;
    log("INFO", "Placement cron completed", { ...results, durationMs: duration });

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
    log("ERROR", "Fatal error in placement-cron", { message: errorMessage });
    return new Response(
      JSON.stringify({ success: false, error: errorMessage, ...results, _version: VERSION }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
