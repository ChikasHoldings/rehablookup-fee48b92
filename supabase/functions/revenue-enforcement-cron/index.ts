/**
 * revenue-enforcement-cron
 * ========================
 * Scheduled edge function that enforces revenue protection:
 *
 * 1. Admission Report Reminders: Nudge providers who have PII but haven't reported admission
 * 2. Bypass Detection: Flag cases where PII was disclosed 7+ days ago with no report
 * 3. Seeker Verification: Send verification emails to seekers 72h after PII disclosure
 * 4. Billing Reminders: Follow up on unpaid invoices
 * 5. Billing Escalation: Suspend providers with overdue payments
 * 6. Compliance Score Updates: Adjust provider compliance scores
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2?target=denonext";
import { Resend } from "https://esm.sh/resend@2.0.0?target=denonext";
import { sendEmailWithRetry } from "../_shared/resilient-email-sender.ts";

const VERSION = "1.0.0";
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PlatformSettings {
  revenue_admission_report_deadline_hours: number;
  revenue_seeker_verification_enabled: boolean;
  revenue_seeker_verification_delay_hours: number;
  revenue_auto_flag_unreported_days: number;
  revenue_billing_reminder_interval_days: number;
  revenue_billing_escalation_after_days: number;
  revenue_compliance_score_bypass_penalty: number;
  revenue_compliance_suspension_threshold: number;
}

const DEFAULT_SETTINGS: PlatformSettings = {
  revenue_admission_report_deadline_hours: 48,
  revenue_seeker_verification_enabled: true,
  revenue_seeker_verification_delay_hours: 72,
  revenue_auto_flag_unreported_days: 7,
  revenue_billing_reminder_interval_days: 3,
  revenue_billing_escalation_after_days: 14,
  revenue_compliance_score_bypass_penalty: 25,
  revenue_compliance_suspension_threshold: 50,
};

const log = (task: string, msg: string, data?: Record<string, unknown>) => {
  console.log(`[REVENUE-CRON] [${VERSION}] [${task}] ${msg}${data ? ` | ${JSON.stringify(data)}` : ""}`);
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const resendApiKey = Deno.env.get("RESEND_API_KEY");

  if (!supabaseUrl || !supabaseServiceKey) {
    return new Response(JSON.stringify({ error: "Server misconfigured" }), { status: 500 });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  const resend = resendApiKey ? new Resend(resendApiKey) : null;

  // Load platform settings
  const { data: settingsRows } = await supabase
    .from("platform_settings")
    .select("key, value")
    .like("key", "revenue_%");

  const settings: PlatformSettings = { ...DEFAULT_SETTINGS };
  for (const row of settingsRows || []) {
    const key = row.key as keyof PlatformSettings;
    if (key in settings) {
      const val = row.value;
      if (typeof settings[key] === "boolean") {
        (settings as any)[key] = val === "true";
      } else {
        (settings as any)[key] = parseInt(val, 10) || (settings as any)[key];
      }
    }
  }

  const results: Record<string, unknown> = {};

  // ═══════════════════════════════════════════════════════════════════════════
  // TASK 1: Admission Report Reminders
  // Providers who received PII disclosure but haven't reported admission
  // ═══════════════════════════════════════════════════════════════════════════
  try {
    const deadlineThreshold = new Date(
      Date.now() - settings.revenue_admission_report_deadline_hours * 60 * 60 * 1000
    ).toISOString();

    const { data: unreportedIntros } = await supabase
      .from("concierge_introductions")
      .select(`
        id, inquiry_id, facility_id, admin_disclosed_pii_at,
        admission_report_reminder_count, admission_report_reminder_sent_at,
        facility:facilities!inner(id, name, user_id, concierge_admissions_email)
      `)
      .eq("provider_response", "interested")
      .eq("provider_admission_reported", false)
      .not("admin_disclosed_pii_at", "is", null)
      .lt("admin_disclosed_pii_at", deadlineThreshold)
      .or("admission_report_reminder_sent_at.is.null,admission_report_reminder_sent_at.lt." +
        new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .lt("admission_report_reminder_count", 3);

    let remindersSent = 0;
    for (const intro of unreportedIntros || []) {
      const facility = intro.facility as any;
      const email = facility?.concierge_admissions_email;

      if (email && resend) {
        try {
          if (resend) {
            const result = await sendEmailWithRetry(supabase, resend, {
              from: "RehabLookup Placements <placements@rehablookup.com>",
              to: [email],
              subject: `Action Required: Report Admission Status — Case #${intro.inquiry_id.slice(0, 8)}`,
              html: `
                <h2>Admission Report Required</h2>
                <p>Hi ${facility.name} team,</p>
                <p>We disclosed client information to you for a placement case, and we haven't received an admission update yet.</p>
                <p><strong>Per our placement agreement, providers must report admission status within 48 hours of receiving client details.</strong></p>
                <p>Please log in to your dashboard and report whether this client was admitted:</p>
                <p><a href="https://rehablookup.com/provider/placement-network" style="background:#2563eb;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block;">Report Admission Status</a></p>
                <p>If the client was not admitted or is still in the assessment phase, please update us so we can assist.</p>
                <p style="color:#666;font-size:12px;">Failure to report may affect your placement network standing.</p>
              `,
            }, { emailType: "admission_reminder", idempotencyKey: `admission-reminder-${intro.id}` });
            if (result.success || result.deduplicated) remindersSent++;
          }
        } catch (e) {
          log("ADMISSION_REMINDERS", "Email send failed", { introId: intro.id, error: String(e) });
        }
      }

      // Update reminder tracking
      await supabase
        .from("concierge_introductions")
        .update({
          admission_report_reminder_sent_at: new Date().toISOString(),
          admission_report_reminder_count: (intro.admission_report_reminder_count || 0) + 1,
        })
        .eq("id", intro.id);
    }

    results.admission_reminders = { processed: unreportedIntros?.length || 0, sent: remindersSent };
    log("ADMISSION_REMINDERS", "Complete", results.admission_reminders as Record<string, unknown>);
  } catch (e) {
    log("ADMISSION_REMINDERS", "Error", { error: String(e) });
    results.admission_reminders = { error: String(e) };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // TASK 2: Bypass Detection
  // Flag cases where PII was disclosed 7+ days ago with no admission report
  // ═══════════════════════════════════════════════════════════════════════════
  try {
    const bypassThreshold = new Date(
      Date.now() - settings.revenue_auto_flag_unreported_days * 24 * 60 * 60 * 1000
    ).toISOString();

    const { data: suspiciousIntros } = await supabase
      .from("concierge_introductions")
      .select(`
        id, inquiry_id, facility_id, admin_disclosed_pii_at,
        facility:facilities!inner(id, name, user_id, placement_compliance_score)
      `)
      .eq("provider_response", "interested")
      .eq("provider_admission_reported", false)
      .eq("bypass_flag", false)
      .not("admin_disclosed_pii_at", "is", null)
      .lt("admin_disclosed_pii_at", bypassThreshold)
      .gte("admission_report_reminder_count", 2);

    let flagged = 0;
    for (const intro of suspiciousIntros || []) {
      const facility = intro.facility as any;

      // Flag the introduction
      await supabase
        .from("concierge_introductions")
        .update({
          bypass_flag: true,
          bypass_flag_reason: "No admission report after multiple reminders and deadline expiry",
          bypass_flagged_at: new Date().toISOString(),
        })
        .eq("id", intro.id);

      // Deduct compliance score
      const newScore = Math.max(0, (facility.placement_compliance_score || 100) - settings.revenue_compliance_score_bypass_penalty);
      const newStanding = newScore < settings.revenue_compliance_suspension_threshold ? "probation" :
        newScore < 75 ? "warning" : "good";

      await supabase
        .from("facilities")
        .update({
          placement_compliance_score: newScore,
          placement_network_standing: newStanding,
          placement_total_bypasses: (facility.placement_total_bypasses || 0) + 1,
        })
        .eq("id", intro.facility_id);

      // Create urgent admin notification
      await supabase.from("admin_notifications").insert({
        type: "bypass_detected",
        title: `Potential Bypass: ${facility.name}`,
        message: `${facility.name} received PII ${settings.revenue_auto_flag_unreported_days} days ago but has not reported admission status despite ${intro.admission_report_reminder_count || 0} reminders. Compliance score: ${newScore}. Standing: ${newStanding}.`,
        metadata: {
          inquiry_id: intro.inquiry_id,
          facility_id: intro.facility_id,
          introduction_id: intro.id,
          compliance_score: newScore,
          network_standing: newStanding,
        },
        severity: "urgent",
        action_required: true,
      });

      // Log case event
      await supabase.from("concierge_case_events").insert({
        inquiry_id: intro.inquiry_id,
        event_type: "bypass_flagged",
        event_data: {
          facility_id: intro.facility_id,
          facility_name: facility.name,
          days_since_disclosure: settings.revenue_auto_flag_unreported_days,
          new_compliance_score: newScore,
          new_standing: newStanding,
        },
        actor_type: "system",
      });

      flagged++;
    }

    results.bypass_detection = { processed: suspiciousIntros?.length || 0, flagged };
    log("BYPASS_DETECTION", "Complete", results.bypass_detection as Record<string, unknown>);
  } catch (e) {
    log("BYPASS_DETECTION", "Error", { error: String(e) });
    results.bypass_detection = { error: String(e) };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // TASK 3: Seeker Verification
  // Send verification emails to seekers 72h after PII disclosure
  // ═══════════════════════════════════════════════════════════════════════════
  try {
    if (settings.revenue_seeker_verification_enabled) {
      const verificationThreshold = new Date(
        Date.now() - settings.revenue_seeker_verification_delay_hours * 60 * 60 * 1000
      ).toISOString();

      // Find admission verifications where seeker hasn't been contacted yet
      const { data: pendingVerifications } = await supabase
        .from("admission_verifications")
        .select(`
          id, inquiry_id, facility_id, seeker_verification_token,
          seeker_verification_sent_at,
          inquiry:concierge_inquiries!inner(id, user_name, user_email, user_phone),
          facility:facilities!inner(id, name)
        `)
        .eq("provider_reported", true)
        .eq("seeker_verified", false)
        .is("seeker_verification_sent_at", null)
        .lt("provider_reported_at", verificationThreshold);

      let verificationsSent = 0;
      for (const v of pendingVerifications || []) {
        const inquiry = v.inquiry as any;
        const facility = v.facility as any;
        const seekerEmail = inquiry?.user_email;

        if (seekerEmail && resend) {
          const verifyUrl = `https://rehablookup.com/verify-admission?token=${v.seeker_verification_token}`;

          try {
            if (resend) {
              const result = await sendEmailWithRetry(supabase, resend, {
                from: "RehabLookup <no-reply@rehablookup.com>",
                to: [seekerEmail],
                subject: "Quick Check-In: How's Your Treatment Going?",
                html: `
                  <h2>Hi ${inquiry.user_name?.split(" ")[0] || "there"},</h2>
                  <p>We wanted to check in and see how things are going with your treatment search.</p>
                  <p>Our records show that <strong>${facility.name}</strong> may have connected with you about admission.</p>
                  <p>Could you let us know if you were admitted? This helps us ensure you're getting the best care:</p>
                  <p>
                    <a href="${verifyUrl}&confirmed=true" style="background:#16a34a;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block;margin-right:12px;">Yes, I Was Admitted</a>
                    <a href="${verifyUrl}&confirmed=false" style="background:#6b7280;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block;">No, Not Yet</a>
                  </p>
                  <p style="color:#666;font-size:13px;">If you need any help or have questions about your options, reply to this email and our concierge team will assist you.</p>
                `,
              }, { emailType: "seeker_verification", idempotencyKey: `seeker-verify-${v.id}` });
              if (result.success || result.deduplicated) verificationsSent++;
            }
          } catch (e) {
            log("SEEKER_VERIFICATION", "Email failed", { verificationId: v.id, error: String(e) });
          }
        }

        // Update tracking
        await supabase
          .from("admission_verifications")
          .update({
            seeker_verification_sent_at: new Date().toISOString(),
            seeker_verification_reminder_count: 1,
          })
          .eq("id", v.id);
      }

      results.seeker_verification = { processed: pendingVerifications?.length || 0, sent: verificationsSent };
      log("SEEKER_VERIFICATION", "Complete", results.seeker_verification as Record<string, unknown>);
    } else {
      results.seeker_verification = { skipped: true, reason: "disabled" };
    }
  } catch (e) {
    log("SEEKER_VERIFICATION", "Error", { error: String(e) });
    results.seeker_verification = { error: String(e) };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // TASK 4: Billing Reminders
  // Follow up on confirmed admissions that haven't been paid
  // ═══════════════════════════════════════════════════════════════════════════
  try {
    const reminderThreshold = new Date(
      Date.now() - settings.revenue_billing_reminder_interval_days * 24 * 60 * 60 * 1000
    ).toISOString();

    const { data: unpaidVerifications } = await supabase
      .from("admission_verifications")
      .select(`
        id, inquiry_id, facility_id, billing_status, billing_amount_cents,
        billing_due_date, billing_reminder_count, billing_last_reminder_at,
        facility:facilities!inner(id, name, user_id, concierge_admissions_email)
      `)
      .in("billing_status", ["confirmed", "invoiced", "overdue"])
      .or("billing_last_reminder_at.is.null,billing_last_reminder_at.lt." + reminderThreshold);

    let billingRemindersSent = 0;
    for (const v of unpaidVerifications || []) {
      const facility = v.facility as any;
      const email = facility?.concierge_admissions_email;
      const amountStr = v.billing_amount_cents ? `$${(v.billing_amount_cents / 100).toLocaleString()}` : "your placement fee";

      if (email && resend) {
        const isOverdue = v.billing_due_date && new Date(v.billing_due_date) < new Date();
        const subject = isOverdue
          ? `OVERDUE: Placement Fee Payment Required — ${amountStr}`
          : `Reminder: Placement Fee Due — ${amountStr}`;

        try {
          if (resend) {
            const result = await sendEmailWithRetry(supabase, resend, {
              from: "RehabLookup Billing <no-reply@rehablookup.com>",
              to: [email],
              subject,
              html: `
                <h2>Placement Fee ${isOverdue ? "Overdue" : "Reminder"}</h2>
                <p>Hi ${facility.name} team,</p>
                <p>This is a ${isOverdue ? "final notice" : "friendly reminder"} that your placement fee of <strong>${amountStr}</strong> is ${isOverdue ? "past due" : "due"}.</p>
                ${v.billing_due_date ? `<p>Due date: <strong>${v.billing_due_date}</strong></p>` : ""}
                ${isOverdue ? `<p style="color:#dc2626;"><strong>Please note: Accounts with overdue balances may have their placement network access suspended.</strong></p>` : ""}
                <p><a href="https://rehablookup.com/provider/billing" style="background:#2563eb;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block;">Pay Now</a></p>
                <p style="color:#666;font-size:12px;">If you believe this is an error or wish to dispute, please contact us at billing@rehablookup.com</p>
              `,
            }, { emailType: "billing_reminder", idempotencyKey: `billing-reminder-${v.id}` });
            if (result.success || result.deduplicated) billingRemindersSent++;
          }
        } catch (e) {
          log("BILLING_REMINDERS", "Email failed", { verificationId: v.id, error: String(e) });
        }
      }

      // Update billing status if overdue
      const isOverdue = v.billing_due_date && new Date(v.billing_due_date) < new Date();
      await supabase
        .from("admission_verifications")
        .update({
          billing_last_reminder_at: new Date().toISOString(),
          billing_reminder_count: (v.billing_reminder_count || 0) + 1,
          ...(isOverdue && v.billing_status !== "overdue" ? { billing_status: "overdue" } : {}),
        })
        .eq("id", v.id);
    }

    results.billing_reminders = { processed: unpaidVerifications?.length || 0, sent: billingRemindersSent };
    log("BILLING_REMINDERS", "Complete", results.billing_reminders as Record<string, unknown>);
  } catch (e) {
    log("BILLING_REMINDERS", "Error", { error: String(e) });
    results.billing_reminders = { error: String(e) };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // TASK 5: Billing Escalation
  // Suspend providers with payments overdue beyond threshold
  // ═══════════════════════════════════════════════════════════════════════════
  try {
    const escalationThreshold = new Date(
      Date.now() - settings.revenue_billing_escalation_after_days * 24 * 60 * 60 * 1000
    );

    const { data: escalationCandidates } = await supabase
      .from("admission_verifications")
      .select(`
        id, inquiry_id, facility_id, billing_status, billing_due_date,
        billing_escalation_level, billing_amount_cents,
        facility:facilities!inner(id, name, user_id, placement_network_standing)
      `)
      .eq("billing_status", "overdue")
      .lt("billing_due_date", escalationThreshold.toISOString().split("T")[0])
      .lt("billing_escalation_level", 3);

    let escalated = 0;
    for (const v of escalationCandidates || []) {
      const facility = v.facility as any;
      const newLevel = (v.billing_escalation_level || 0) + 1;

      // Escalation levels:
      // 1 = Warning (email + notification)
      // 2 = Probation (restrict new introductions)
      // 3 = Suspension (remove from placement network)
      const newStanding = newLevel >= 3 ? "suspended" : newLevel >= 2 ? "probation" : "warning";

      await supabase
        .from("admission_verifications")
        .update({
          billing_escalation_level: newLevel,
          billing_status: "escalated",
        })
        .eq("id", v.id);

      // Update facility standing
      if (facility.placement_network_standing !== "suspended") {
        await supabase
          .from("facilities")
          .update({
            placement_network_standing: newStanding,
            ...(newStanding === "suspended" ? {
              placement_suspended_at: new Date().toISOString(),
              placement_suspension_reason: `Overdue placement fee: $${((v.billing_amount_cents || 0) / 100).toFixed(0)}`,
            } : {}),
          })
          .eq("id", v.facility_id);
      }

      // Admin notification
      await supabase.from("admin_notifications").insert({
        type: "billing_escalation",
        title: `Billing Escalation Level ${newLevel}: ${facility.name}`,
        message: `${facility.name} has an overdue placement fee. Escalated to level ${newLevel} (${newStanding}). Amount: $${((v.billing_amount_cents || 0) / 100).toFixed(0)}.`,
        metadata: {
          inquiry_id: v.inquiry_id,
          facility_id: v.facility_id,
          verification_id: v.id,
          escalation_level: newLevel,
          new_standing: newStanding,
          amount_cents: v.billing_amount_cents,
        },
        severity: "urgent",
        action_required: true,
      });

      escalated++;
    }

    results.billing_escalation = { processed: escalationCandidates?.length || 0, escalated };
    log("BILLING_ESCALATION", "Complete", results.billing_escalation as Record<string, unknown>);
  } catch (e) {
    log("BILLING_ESCALATION", "Error", { error: String(e) });
    results.billing_escalation = { error: String(e) };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // TASK 6: Auto-create verification records for confirmed placements
  // Ensure every confirmed placement has a verification record for tracking
  // ═══════════════════════════════════════════════════════════════════════════
  try {
    const { data: confirmedWithoutVerification } = await supabase
      .from("concierge_inquiries")
      .select("id, placed_facility_id, placement_confirmed_at")
      .eq("placement_confirmed", true)
      .not("placed_facility_id", "is", null);

    let created = 0;
    for (const inquiry of confirmedWithoutVerification || []) {
      if (!inquiry.placed_facility_id) continue;

      // Check if verification already exists
      const { data: existing } = await supabase
        .from("admission_verifications")
        .select("id")
        .eq("inquiry_id", inquiry.id)
        .eq("facility_id", inquiry.placed_facility_id)
        .maybeSingle();

      if (!existing) {
        await supabase.from("admission_verifications").insert({
          inquiry_id: inquiry.id,
          facility_id: inquiry.placed_facility_id,
          admin_confirmed: true,
          admin_confirmed_at: inquiry.placement_confirmed_at || new Date().toISOString(),
          verification_status: "admin_override",
          // Domestic concierge has no provider fee under the EKRA-compliant
          // flat-fee model — the provider_fee_cents column was dropped.
          billing_status: "confirmed",
          billing_amount_cents: null,
          billing_due_date: null,
        });
        created++;
      }
    }

    results.verification_backfill = { processed: confirmedWithoutVerification?.length || 0, created };
    log("VERIFICATION_BACKFILL", "Complete", results.verification_backfill as Record<string, unknown>);
  } catch (e) {
    log("VERIFICATION_BACKFILL", "Error", { error: String(e) });
    results.verification_backfill = { error: String(e) };
  }

  return new Response(
    JSON.stringify({ success: true, version: VERSION, timestamp: new Date().toISOString(), results }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
  );
});
