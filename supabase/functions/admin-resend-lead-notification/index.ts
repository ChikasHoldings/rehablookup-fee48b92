/**
 * admin-resend-lead-notification — admin-only action to re-fire the
 * facility-notification email for a lead. Used when a provider claims
 * they didn't receive the original notification, or when ops needs to
 * nudge a stale lead.
 *
 * What it does:
 *   1. Verifies the caller is admin (via JWT + has_role check)
 *   2. Validates leadId is a real UUID
 *   3. Loads the lead + facility + notification preferences
 *   4. Re-fires the facility-notification email via Resend with a
 *      fresh idempotency key (so the dedup gate doesn't suppress it)
 *   5. Writes a lead_notes entry recording the manual resend
 *   6. Writes an admin_audit_log row with action_type='lead_notification_resent'
 *
 * Rate-limited to 3 resends per (admin, lead) per hour to prevent
 * accidental spam from impatient clicks. Returns 429 with cooldown
 * info on hit.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2?target=denonext";
import { Resend } from "https://esm.sh/resend@2.0.0?target=denonext";

const VERSION = "1.0.0";
const FROM_ADDRESS = "RehabLookup <noreply@rehablookup.com>";
const MAX_RESENDS_PER_HOUR = 3;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function json(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function buildEmail(args: {
  leadName: string;
  leadEmail: string;
  leadPhone: string;
  facilityName: string;
  facilityCity: string | null;
  facilityState: string | null;
  message: string | null;
  urgency: string | null;
  levelOfCare: string | null;
  insurance: string | null;
  location: string | null;
  preferredContact: string | null;
  leadCreatedAt: string;
  adminEmail: string | null;
}): string {
  const ageHours = Math.max(
    0,
    Math.floor((Date.now() - new Date(args.leadCreatedAt).getTime()) / 3_600_000),
  );
  const ageLabel =
    ageHours < 24 ? `${ageHours}h ago` : `${Math.floor(ageHours / 24)}d ago`;
  const row = (label: string, value: string | null | undefined) =>
    value
      ? `<tr><td style="padding:4px 12px 4px 0;color:#64748b;">${label}</td><td style="padding:4px 0;color:#0f172a;font-weight:600;">${value}</td></tr>`
      : "";
  return `<!DOCTYPE html>
<html><body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f8fafc;margin:0;padding:32px 16px;">
  <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:12px;padding:32px;box-shadow:0 1px 3px rgba(0,0,0,0.05);">
    <div style="background:#fef3c7;border:1px solid #fcd34d;border-radius:6px;padding:10px 12px;margin:0 0 16px 0;font-size:13px;color:#78350f;">
      <strong>Resent by RehabLookup admin</strong>${args.adminEmail ? ` (${args.adminEmail})` : ""}.
      Original inquiry was received ${ageLabel}. If you've already followed up, you can ignore this email.
    </div>

    <h1 style="font-size:22px;color:#0f172a;margin:0 0 8px 0;">Inquiry follow-up reminder</h1>
    <p style="font-size:15px;color:#334155;line-height:1.6;margin:0 0 16px 0;">
      ${args.leadName} contacted <strong>${args.facilityName}</strong>${args.facilityCity ? ` in ${args.facilityCity}${args.facilityState ? ", " + args.facilityState : ""}` : ""} ${ageLabel}.
      ${args.urgency === "immediate" ? "<span style=\"color:#dc2626;font-weight:600;\">Marked urgent.</span>" : ""}
    </p>

    <div style="background:#f1f5f9;border-radius:8px;padding:16px;margin:24px 0;">
      <p style="font-size:13px;color:#475569;margin:0 0 8px 0;text-transform:uppercase;letter-spacing:0.05em;font-weight:600;">Contact</p>
      <table style="width:100%;font-size:14px;border-collapse:collapse;">
        ${row("Name", args.leadName)}
        ${row("Email", `<a href="mailto:${args.leadEmail}" style="color:#1B365D;">${args.leadEmail}</a>`)}
        ${row("Phone", `<a href="tel:${args.leadPhone}" style="color:#1B365D;">${args.leadPhone}</a>`)}
        ${row("Preferred contact", args.preferredContact)}
      </table>
    </div>

    <div style="background:#f1f5f9;border-radius:8px;padding:16px;margin:0 0 24px 0;">
      <p style="font-size:13px;color:#475569;margin:0 0 8px 0;text-transform:uppercase;letter-spacing:0.05em;font-weight:600;">Inquiry detail</p>
      <table style="width:100%;font-size:14px;border-collapse:collapse;">
        ${row("Level of care", args.levelOfCare)}
        ${row("Insurance", args.insurance)}
        ${row("Location", args.location)}
        ${row("Urgency", args.urgency)}
      </table>
      ${args.message ? `<p style="margin:12px 0 0 0;font-size:13px;color:#475569;font-style:italic;">"${args.message.replace(/</g, "&lt;").slice(0, 600)}"</p>` : ""}
    </div>

    <p style="font-size:12px;color:#94a3b8;margin:24px 0 0 0;border-top:1px solid #e2e8f0;padding-top:16px;">
      Reach out within 1 business hour for the best response rate. View this inquiry in your provider dashboard.
    </p>
  </div>
</body></html>`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json(405, { error: "Use POST", code: "method_not_allowed" });

  const requestId = crypto.randomUUID().slice(0, 8);

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json(401, { error: "Unauthorized", code: "auth_missing" });

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    const { data: { user }, error: userErr } = await userClient.auth.getUser();
    if (userErr || !user) return json(401, { error: "Invalid auth", code: "auth_invalid" });

    const { data: isAdmin } = await userClient.rpc("has_role", {
      _user_id: user.id,
      _role: "admin",
    });
    if (!isAdmin) return json(403, { error: "Admin role required", code: "forbidden" });

    let body: { leadId?: unknown };
    try { body = await req.json(); } catch { return json(400, { error: "Invalid JSON", code: "invalid_json" }); }

    const leadId = typeof body.leadId === "string" ? body.leadId : "";
    if (!UUID_REGEX.test(leadId)) {
      return json(400, { error: "leadId must be a valid UUID", code: "invalid_lead_id" });
    }

    // Rate-limit: cap to MAX_RESENDS_PER_HOUR resends per (admin, lead) per hour
    const oneHourAgo = new Date(Date.now() - 3_600_000).toISOString();
    const { count: recentCount } = await adminClient
      .from("admin_audit_log")
      .select("id", { count: "exact", head: true })
      .eq("admin_user_id", user.id)
      .eq("target_id", leadId)
      .eq("action_type", "lead_notification_resent")
      .gte("created_at", oneHourAgo);
    if ((recentCount ?? 0) >= MAX_RESENDS_PER_HOUR) {
      return json(429, {
        error: "Resend rate limit reached for this lead",
        code: "rate_limit_exceeded",
        retryAfterSeconds: 3600,
      });
    }

    // Load the lead — admin role bypasses RLS via service-role client
    const { data: lead, error: leadErr } = await adminClient
      .from("leads")
      .select("id, name, email, phone, message, urgency, level_of_care, insurance_type, location_city_state, preferred_contact, created_at, facility_id")
      .eq("id", leadId)
      .single();
    if (leadErr || !lead) return json(404, { error: "Lead not found", code: "lead_not_found" });
    if (!lead.facility_id) return json(409, { error: "Lead has no facility assigned", code: "no_facility" });

    // Load the facility + its notification email
    const { data: facility } = await adminClient
      .from("facilities")
      .select("id, name, city, state, claim_email, email, user_id")
      .eq("id", lead.facility_id)
      .single();
    if (!facility) return json(404, { error: "Facility not found", code: "facility_not_found" });

    const notificationEmail = facility.claim_email || facility.email;
    if (!notificationEmail) {
      return json(409, {
        error: "Facility has no notification email configured",
        code: "no_notification_email",
      });
    }

    // Check facility owner's notification preferences (if a user owns the facility)
    let emailEnabled = true;
    if (facility.user_id) {
      const { data: prefs } = await adminClient
        .from("notification_preferences")
        .select("notify_new_leads, email_lead_alerts")
        .eq("user_id", facility.user_id)
        .maybeSingle();
      if (prefs) {
        emailEnabled = prefs.notify_new_leads !== false && prefs.email_lead_alerts !== false;
      }
    }
    if (!emailEnabled) {
      return json(409, {
        error: "Facility owner has disabled email notifications",
        code: "notifications_disabled",
      });
    }

    // Get admin's email for the "resent by" footer (best-effort)
    const adminEmail = user.email ?? null;

    // Send
    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (!resendKey) {
      return json(500, { error: "Email service not configured", code: "email_misconfigured" });
    }
    const resend = new Resend(resendKey);

    const html = buildEmail({
      leadName: lead.name,
      leadEmail: lead.email,
      leadPhone: lead.phone,
      facilityName: facility.name,
      facilityCity: facility.city,
      facilityState: facility.state,
      message: lead.message,
      urgency: lead.urgency,
      levelOfCare: lead.level_of_care,
      insurance: lead.insurance_type,
      location: lead.location_city_state,
      preferredContact: lead.preferred_contact,
      leadCreatedAt: lead.created_at,
      adminEmail,
    });

    const subject = `[Reminder] ${lead.urgency === "immediate" ? "Urgent inquiry from " : "Inquiry from "}${lead.name} — ${facility.name}`;

    const sendResult = await resend.emails.send({
      from: FROM_ADDRESS,
      to: notificationEmail,
      subject,
      html,
      // Idempotency-keyed per resend so the dedup gate in
      // resilient-email-sender doesn't suppress a fresh admin-initiated send.
      headers: { "X-Entity-Ref-ID": `admin-resend-${leadId}-${Date.now()}` },
    });

    if (sendResult.error) {
      console.error(`[${requestId}] resend failed`, sendResult.error);
      return json(502, {
        error: "Email delivery failed",
        code: "send_failed",
        details: sendResult.error.message,
      });
    }

    // Audit-log
    await adminClient.from("admin_audit_log").insert({
      admin_user_id: user.id,
      action_type: "lead_notification_resent",
      target_type: "lead",
      target_id: leadId,
      details: {
        facility_id: facility.id,
        recipient_email: notificationEmail,
        resend_email_id: sendResult.data?.id ?? null,
        request_id: requestId,
      },
    });

    // Lead-notes entry so the lead's timeline reflects the manual
    // resend. Column name is `note` (singular) per the lead_notes
    // schema; verified against information_schema before deploy.
    await adminClient.from("lead_notes").insert({
      lead_id: leadId,
      user_id: user.id,
      note: `Admin resent facility notification email to ${notificationEmail}${adminEmail ? ` (admin: ${adminEmail})` : ""}.`,
    });

    return json(200, {
      success: true,
      message: "Facility notification resent",
      recipient: notificationEmail,
      requestId,
      _version: VERSION,
    });
  } catch (err) {
    console.error(`[admin-resend-lead-notification] error`, err);
    return json(500, { error: "Internal server error", code: "internal_error" });
  }
});
