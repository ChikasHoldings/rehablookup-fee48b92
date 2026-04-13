import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const VERSION = "3.0.0";

const log = (level: "INFO" | "WARN" | "ERROR", message: string, details?: unknown) => {
  const timestamp = new Date().toISOString();
  const detailsStr = details ? ` | ${JSON.stringify(details)}` : "";
  console.log(`[${timestamp}] [send-unlock-reminders] [${VERSION}] [${level}] ${message}${detailsStr}`);
};

// ============ ESCALATION STAGES ============
// Stage 1: 2h  — Early reminder (light urgency)
// Stage 2: 8h  — Mid urgency push (opportunity focus)
// Stage 3: 20h — Final urgency push (loss aversion)
// Stage 4: 24h — Expiration awareness (clear loss)

interface ReminderStage {
  name: string;
  hoursAfter: number;
  column: string;
  prevColumn: string | null;
  subject: (facilityName: string) => string;
  getEmail: (facilityName: string, leadPreview: LeadPreview, dashboardUrl: string, creditCost: string) => string;
  inAppTitle: string;
  inAppMessage: (leadPreview: LeadPreview) => string;
  notificationType: string;
}

interface LeadPreview {
  maskedName: string;
  levelOfCare: string | null;
  urgency: string | null;
  locationCityState: string | null;
  inquiryType: string;
  isHighIntent: boolean;
  hoursAgo: number;
}

function maskLeadName(fullName: string): string {
  if (!fullName || fullName.trim().length === 0) return "New Lead";
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts[parts.length - 1].charAt(0).toUpperCase()}.`;
}

function formatUrgency(urgency: string | null): string {
  if (!urgency) return "";
  const map: Record<string, string> = {
    "Urgent": "Needs help immediately",
    "Immediately": "Needs help immediately",
    "immediate": "Needs help immediately",
    "This week": "Seeking treatment this week",
    "within_week": "Seeking treatment this week",
    "This month": "Looking within the month",
    "within_month": "Looking within the month",
  };
  return map[urgency] || "";
}

function getIntentSignals(lead: LeadPreview): string[] {
  const signals: string[] = [];
  if (lead.isHighIntent) signals.push("🔥 High intent — actively seeking placement");
  if (lead.urgency && ["Urgent", "Immediately", "immediate"].includes(lead.urgency)) {
    signals.push("⚡ Needs treatment immediately");
  } else if (lead.urgency && ["This week", "within_week"].includes(lead.urgency)) {
    signals.push("📅 Seeking treatment this week");
  }
  if (lead.levelOfCare) {
    signals.push(`🏥 Looking for ${lead.levelOfCare.replace(/_/g, " ")}`);
  }
  if (lead.locationCityState) {
    signals.push(`📍 Near ${lead.locationCityState}`);
  }
  if (lead.inquiryType === "request_callback") {
    signals.push("📞 Requested a callback — ready to talk");
  }
  return signals;
}

function buildSignalsHtml(signals: string[]): string {
  if (signals.length === 0) return "";
  const items = signals.map(s => `<li style="padding: 6px 0; font-size: 14px; color: #1e40af;">${s}</li>`).join("");
  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; margin-bottom: 20px;">
      <tr><td style="padding: 16px;">
        <p style="margin: 0 0 8px 0; font-size: 13px; font-weight: 600; color: #1d4ed8; text-transform: uppercase; letter-spacing: 0.5px;">Why this lead matters</p>
        <ul style="margin: 0; padding: 0; list-style: none;">${items}</ul>
      </td></tr>
    </table>`;
}

// ============ EMAIL TEMPLATES ============
function getEarlyReminderEmail(facilityName: string, lead: LeadPreview, dashboardUrl: string, creditCost: string): string {
  const signals = getIntentSignals(lead);
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f5f5f5;-webkit-font-smoothing:antialiased;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:32px 16px;"><tr><td align="center">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
  <tr><td style="background:#1B365D;padding:32px;border-radius:12px 12px 0 0;text-align:center;">
    <div style="font-size:48px;margin-bottom:16px;">${lead.isHighIntent ? "🔥" : "📬"}</div>
    <p style="margin:0 0 8px 0;font-size:12px;color:#cbd5e1;text-transform:uppercase;letter-spacing:1px;">REHABLOOKUP</p>
    <h1 style="margin:0;font-size:22px;color:#fff;font-family:Arial,sans-serif;font-weight:600;">${lead.isHighIntent ? "High-Intent Inquiry Waiting" : "New Inquiry Waiting"}</h1>
  </td></tr>
  <tr><td style="background:#fff;padding:32px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;border-left:1px solid #e5e7eb;border-right:1px solid #e5e7eb;">
    <p style="margin:0 0 20px 0;color:#374151;font-size:16px;line-height:1.6;">Hi ${facilityName} team,</p>
    <p style="margin:0 0 20px 0;color:#374151;font-size:15px;line-height:1.6;">
      You received an inquiry from <strong>${lead.maskedName}</strong> about ${Math.round(lead.hoursAgo)} hours ago. This person is actively looking for treatment and chose <strong>your facility</strong>.
    </p>
    ${buildSignalsHtml(signals)}
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fef3c7;border:1px solid #fbbf24;border-radius:8px;margin-bottom:20px;">
      <tr><td style="padding:16px;text-align:center;">
        <p style="margin:0 0 4px 0;font-size:13px;color:#92400e;">Unlock cost</p>
        <p style="margin:0;font-size:24px;font-weight:700;color:#78350f;">${creditCost}</p>
      </td></tr>
    </table>
    <div style="text-align:center;">
      <a href="${dashboardUrl}" style="display:inline-block;background:#1B365D;color:#fff;text-decoration:none;padding:14px 32px;border-radius:8px;font-weight:600;font-size:15px;">🔓 Unlock Lead Now</a>
    </div>
    <p style="margin:20px 0 0 0;color:#6b7280;font-size:13px;text-align:center;line-height:1.5;">Quick response times lead to higher conversion rates.</p>
  </td></tr>
  <tr><td style="background:#1B365D;padding:24px 32px;border-radius:0 0 12px 12px;text-align:center;">
    <p style="margin:0;color:#cbd5e1;font-size:12px;">© ${new Date().getFullYear()} RehabLookup. All rights reserved.</p>
    <a href="https://rehablookup.com/provider/settings" style="color:#93c5fd;text-decoration:none;font-size:11px;">Notification Settings</a>
  </td></tr>
</table></td></tr></table></body></html>`;
}

function getMidUrgencyEmail(facilityName: string, lead: LeadPreview, dashboardUrl: string, creditCost: string): string {
  const signals = getIntentSignals(lead);
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f5f5f5;-webkit-font-smoothing:antialiased;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:32px 16px;"><tr><td align="center">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
  <tr><td style="background:#b45309;padding:32px;border-radius:12px 12px 0 0;text-align:center;">
    <div style="font-size:48px;margin-bottom:16px;">⏰</div>
    <p style="margin:0 0 8px 0;font-size:12px;color:#fff;text-transform:uppercase;letter-spacing:1px;">REHABLOOKUP</p>
    <h1 style="margin:0;font-size:22px;color:#fff;font-family:Arial,sans-serif;font-weight:600;">Don't Miss This Potential Admission</h1>
  </td></tr>
  <tr><td style="background:#fff;padding:32px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;border-left:1px solid #e5e7eb;border-right:1px solid #e5e7eb;">
    <p style="margin:0 0 20px 0;color:#374151;font-size:16px;line-height:1.6;">Hi ${facilityName} team,</p>
    <p style="margin:0 0 20px 0;color:#374151;font-size:15px;line-height:1.6;">
      <strong>${lead.maskedName}</strong> submitted an inquiry <strong>${Math.round(lead.hoursAgo)} hours ago</strong> and hasn't been contacted yet. This user specifically chose your facility and may still be evaluating options.
    </p>
    ${buildSignalsHtml(signals)}
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fef3c7;border:2px solid #f59e0b;border-radius:8px;margin-bottom:20px;">
      <tr><td style="padding:16px;text-align:center;">
        <p style="margin:0 0 4px 0;font-size:13px;color:#92400e;">Speed matters in treatment decisions</p>
        <p style="margin:0;font-size:20px;font-weight:700;color:#78350f;">Unlock for ${creditCost}</p>
      </td></tr>
    </table>
    <div style="text-align:center;">
      <a href="${dashboardUrl}" style="display:inline-block;background:#b45309;color:#fff;text-decoration:none;padding:14px 32px;border-radius:8px;font-weight:600;font-size:15px;">🔓 Unlock & Connect Now</a>
    </div>
  </td></tr>
  <tr><td style="background:#1B365D;padding:24px 32px;border-radius:0 0 12px 12px;text-align:center;">
    <p style="margin:0;color:#cbd5e1;font-size:12px;">© ${new Date().getFullYear()} RehabLookup.</p>
    <a href="https://rehablookup.com/provider/settings" style="color:#93c5fd;text-decoration:none;font-size:11px;">Notification Settings</a>
  </td></tr>
</table></td></tr></table></body></html>`;
}

function getFinalUrgencyEmail(facilityName: string, lead: LeadPreview, dashboardUrl: string, creditCost: string): string {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f5f5f5;-webkit-font-smoothing:antialiased;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:32px 16px;"><tr><td align="center">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
  <tr><td style="background:#dc2626;padding:32px;border-radius:12px 12px 0 0;text-align:center;">
    <div style="font-size:48px;margin-bottom:16px;">🚨</div>
    <p style="margin:0 0 8px 0;font-size:12px;color:#fff;text-transform:uppercase;letter-spacing:1px;">REHABLOOKUP — FINAL NOTICE</p>
    <h1 style="margin:0;font-size:22px;color:#fff;font-family:Arial,sans-serif;font-weight:600;">Last Chance to Unlock This Lead</h1>
  </td></tr>
  <tr><td style="background:#fff;padding:32px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;border-left:1px solid #e5e7eb;border-right:1px solid #e5e7eb;">
    <p style="margin:0 0 20px 0;color:#374151;font-size:16px;line-height:1.6;">Hi ${facilityName} team,</p>
    <p style="margin:0 0 20px 0;color:#374151;font-size:15px;line-height:1.6;">
      <strong>${lead.maskedName}</strong> reached out to your facility <strong>${Math.round(lead.hoursAgo)} hours ago</strong>. This person is likely already exploring other options.
    </p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fef2f2;border:2px solid #ef4444;border-radius:8px;margin-bottom:20px;">
      <tr><td style="padding:20px;text-align:center;">
        <p style="margin:0 0 8px 0;font-size:16px;font-weight:600;color:#dc2626;">⚠️ This lead will go cold</p>
        <p style="margin:0;font-size:14px;color:#7f1d1d;line-height:1.5;">
          Every hour that passes, the chance of connecting drops significantly. Don't lose this potential admission.
        </p>
      </td></tr>
    </table>
    <div style="text-align:center;">
      <a href="${dashboardUrl}" style="display:inline-block;background:#dc2626;color:#fff;text-decoration:none;padding:14px 32px;border-radius:8px;font-weight:600;font-size:15px;">🔓 Unlock Before It's Too Late — ${creditCost}</a>
    </div>
  </td></tr>
  <tr><td style="background:#1B365D;padding:24px 32px;border-radius:0 0 12px 12px;text-align:center;">
    <p style="margin:0;color:#cbd5e1;font-size:12px;">© ${new Date().getFullYear()} RehabLookup.</p>
    <a href="https://rehablookup.com/provider/settings" style="color:#93c5fd;text-decoration:none;font-size:11px;">Notification Settings</a>
  </td></tr>
</table></td></tr></table></body></html>`;
}

function getExpirationEmail(facilityName: string, lead: LeadPreview, dashboardUrl: string, creditCost: string): string {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f5f5f5;-webkit-font-smoothing:antialiased;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:32px 16px;"><tr><td align="center">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
  <tr><td style="background:#374151;padding:32px;border-radius:12px 12px 0 0;text-align:center;">
    <div style="font-size:48px;margin-bottom:16px;">📭</div>
    <p style="margin:0 0 8px 0;font-size:12px;color:#9ca3af;text-transform:uppercase;letter-spacing:1px;">REHABLOOKUP</p>
    <h1 style="margin:0;font-size:22px;color:#fff;font-family:Arial,sans-serif;font-weight:600;">Missed Opportunity</h1>
  </td></tr>
  <tr><td style="background:#fff;padding:32px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;border-left:1px solid #e5e7eb;border-right:1px solid #e5e7eb;">
    <p style="margin:0 0 20px 0;color:#374151;font-size:16px;line-height:1.6;">Hi ${facilityName} team,</p>
    <p style="margin:0 0 20px 0;color:#374151;font-size:15px;line-height:1.6;">
      The inquiry from <strong>${lead.maskedName}</strong> was not unlocked within 24 hours. This user has likely already contacted other facilities or moved on.
    </p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;border:1px solid #d1d5db;border-radius:8px;margin-bottom:20px;">
      <tr><td style="padding:20px;text-align:center;">
        <p style="margin:0 0 8px 0;font-size:14px;font-weight:600;color:#4b5563;">What this means</p>
        <p style="margin:0;font-size:13px;color:#6b7280;line-height:1.5;">
          This exclusive lead was sent only to your facility. Since it wasn't unlocked, the opportunity is lost. Quick response times are key to maximizing your admissions pipeline.
        </p>
      </td></tr>
    </table>
    <div style="text-align:center;">
      <a href="${dashboardUrl}" style="display:inline-block;background:#1B365D;color:#fff;text-decoration:none;padding:14px 32px;border-radius:8px;font-weight:600;font-size:15px;">View Your Dashboard</a>
    </div>
  </td></tr>
  <tr><td style="background:#1B365D;padding:24px 32px;border-radius:0 0 12px 12px;text-align:center;">
    <p style="margin:0;color:#cbd5e1;font-size:12px;">© ${new Date().getFullYear()} RehabLookup.</p>
    <a href="https://rehablookup.com/provider/settings" style="color:#93c5fd;text-decoration:none;font-size:11px;">Notification Settings</a>
  </td></tr>
</table></td></tr></table></body></html>`;
}

// ============ ENGAGEMENT TIER LOGIC ============
type EngagementTier = "high" | "moderate" | "low" | "inactive";

function shouldSendForTier(tier: EngagementTier, stage: string, isHighIntent: boolean): boolean {
  // High-intent leads always get all stages
  if (isHighIntent) return true;

  switch (tier) {
    case "high":
      // High engagement: only instant + final urgency (skip middle)
      return stage === "2h" || stage === "20h";
    case "moderate":
      // Full sequence
      return true;
    case "low":
      // Full sequence with stronger messaging (handled in templates)
      return true;
    case "inactive":
      // Only high-intent alerts (handled above) and first reminder
      return stage === "2h";
    default:
      return true;
  }
}

function getEngagementTierMessage(tier: EngagementTier, stage: string): string | null {
  if (tier === "low" && stage === "8h") {
    return "You have multiple inquiries waiting. Don't miss these potential admissions.";
  }
  return null;
}

// ============ MAIN HANDLER ============
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    log("INFO", "Starting enhanced unlock reminder processing v3");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const now = new Date();
    const dashboardUrl = "https://rehablookup.com/provider/inquiries";

    // Define the 4 reminder stages
    const stages: ReminderStage[] = [
      {
        name: "2h",
        hoursAfter: 2,
        column: "reminder_2h_sent_at",
        prevColumn: null, // First reminder after instant
        subject: (fn) => `New inquiry waiting for you — ${fn}`,
        getEmail: getEarlyReminderEmail,
        inAppTitle: "Inquiry Still Waiting",
        inAppMessage: (lp) => `${lp.maskedName} is waiting for your response${lp.levelOfCare ? ` (${lp.levelOfCare.replace(/_/g, " ")})` : ""}`,
        notificationType: "reminder",
      },
      {
        name: "8h",
        hoursAfter: 8,
        column: "reminder_6h_sent_at", // reuse existing column
        prevColumn: "reminder_2h_sent_at",
        subject: (fn) => `Don't miss this potential admission — ${fn}`,
        getEmail: getMidUrgencyEmail,
        inAppTitle: "Don't Miss This Lead",
        inAppMessage: (lp) => `${lp.maskedName}'s inquiry is ${Math.round(lp.hoursAgo)}h old. Unlock to connect before they move on.`,
        notificationType: "reminder",
      },
      {
        name: "20h",
        hoursAfter: 20,
        column: "reminder_20h_sent_at",
        prevColumn: "reminder_6h_sent_at",
        subject: (fn) => `⚠️ Last chance to unlock this lead — ${fn}`,
        getEmail: getFinalUrgencyEmail,
        inAppTitle: "Last Chance — Lead Going Cold",
        inAppMessage: (lp) => `${lp.maskedName} may move to another facility soon. Unlock now or lose this lead.`,
        notificationType: "final_urgency",
      },
      {
        name: "24h",
        hoursAfter: 24,
        column: "reminder_24h_sent_at",
        prevColumn: "reminder_20h_sent_at",
        subject: (fn) => `Missed opportunity — ${fn}`,
        getEmail: getExpirationEmail,
        inAppTitle: "Inquiry Expired",
        inAppMessage: (lp) => `The inquiry from ${lp.maskedName} was not unlocked and may be lost.`,
        notificationType: "expiration",
      },
    ];

    let totalSent = 0;
    let totalSkipped = 0;

    // Pre-fetch engagement tiers for all providers
    const { data: engagementData } = await supabase
      .from("notification_preferences")
      .select("user_id, engagement_tier, email_lead_alerts");

    const engagementMap = new Map<string, { tier: EngagementTier; emailEnabled: boolean }>();
    for (const ep of engagementData || []) {
      engagementMap.set(ep.user_id, {
        tier: (ep.engagement_tier as EngagementTier) || "moderate",
        emailEnabled: ep.email_lead_alerts !== false,
      });
    }

    for (const stage of stages) {
      const hoursAgo = new Date(now.getTime() - stage.hoursAfter * 60 * 60 * 1000);
      // 1-hour window to catch leads
      const windowEnd = new Date(now.getTime() - (stage.hoursAfter + 1) * 60 * 60 * 1000);

      let query = supabase
        .from("leads")
        .select(`
          id, name, facility_id, level_of_care, urgency, location_city_state,
          inquiry_type, high_intent, created_at, credit_cost,
          facilities!inner (id, name, email, user_id, reply_email, reply_email_verified)
        `)
        .is(stage.column, null)
        .lte("created_at", hoursAgo.toISOString())
        .gte("created_at", windowEnd.toISOString())
        .eq("redistribution_status", "exclusive");

      // Require previous stage sent (except first)
      if (stage.prevColumn) {
        query = query.not(stage.prevColumn, "is", null);
      }

      const { data: leads, error: leadsError } = await query;

      if (leadsError) {
        log("ERROR", `Failed to fetch leads for stage ${stage.name}`, { error: leadsError.message });
        continue;
      }

      log("INFO", `Stage ${stage.name}: found ${leads?.length || 0} candidates`);

      for (const lead of leads || []) {
        // Check if already unlocked
        const { data: unlock } = await supabase
          .from("lead_unlocks")
          .select("id")
          .eq("lead_id", lead.id)
          .eq("facility_id", lead.facility_id)
          .maybeSingle();

        if (unlock) {
          // Already unlocked — mark stage as done to prevent future checks
          await supabase.from("leads").update({ [stage.column]: now.toISOString() }).eq("id", lead.id);
          continue;
        }

        // deno-lint-ignore no-explicit-any
        const facility = lead.facilities as any;
        if (!facility) continue;

        // Check engagement tier
        const engagement = engagementMap.get(facility.user_id) || { tier: "moderate" as EngagementTier, emailEnabled: true };

        const leadPreview: LeadPreview = {
          maskedName: maskLeadName(lead.name),
          levelOfCare: lead.level_of_care,
          urgency: lead.urgency,
          locationCityState: lead.location_city_state,
          inquiryType: lead.inquiry_type || "request_info",
          isHighIntent: lead.high_intent || false,
          hoursAgo: (now.getTime() - new Date(lead.created_at).getTime()) / (1000 * 60 * 60),
        };

        // Check if this stage should fire for this tier
        if (!shouldSendForTier(engagement.tier, stage.name, leadPreview.isHighIntent)) {
          log("INFO", `Skipping stage ${stage.name} for lead ${lead.id} (tier: ${engagement.tier})`);
          totalSkipped++;
          // Mark as sent so we don't re-check
          await supabase.from("leads").update({ [stage.column]: now.toISOString() }).eq("id", lead.id);
          continue;
        }

        const creditCost = lead.credit_cost ? `$${(lead.credit_cost / 100).toFixed(2)}` : "$39.00";

        // Send email (if enabled)
        if (engagement.emailEnabled) {
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
                from: "RehabLookup <no-reply@rehablookup.com>",
                to: email,
                subject: stage.subject(facility.name),
                html: stage.getEmail(facility.name, leadPreview, dashboardUrl, creditCost),
              });

              // Track notification event
              await supabase.from("notification_events").insert({
                lead_id: lead.id,
                facility_id: facility.id,
                user_id: facility.user_id,
                notification_stage: stage.name,
                channel: "email",
                event_type: "sent",
                notification_type: stage.notificationType,
                metadata: { engagement_tier: engagement.tier, high_intent: leadPreview.isHighIntent },
              });

              totalSent++;
              log("INFO", `${stage.name} email sent`, { leadId: lead.id, email, tier: engagement.tier });
            } catch (e) {
              log("WARN", `Failed to send ${stage.name} email`, { leadId: lead.id, error: String(e) });
            }
          }
        }

        // Send in-app notification
        try {
          await supabase.from("provider_notifications").insert({
            user_id: facility.user_id,
            facility_id: facility.id,
            type: stage.name === "24h" ? "lead_expired" : "lead_reminder",
            title: stage.inAppTitle,
            message: stage.inAppMessage(leadPreview),
            metadata: {
              lead_id: lead.id,
              stage: stage.name,
              urgency: lead.urgency,
              level_of_care: lead.level_of_care,
              high_intent: leadPreview.isHighIntent,
              credit_cost: lead.credit_cost,
              link: "/provider/inquiries",
            },
            read: false,
          });

          await supabase.from("notification_events").insert({
            lead_id: lead.id,
            facility_id: facility.id,
            user_id: facility.user_id,
            notification_stage: stage.name,
            channel: "in_app",
            event_type: "sent",
            notification_type: stage.notificationType,
            metadata: { engagement_tier: engagement.tier },
          });
        } catch (notifError) {
          log("WARN", `Failed to create ${stage.name} in-app notification`, { leadId: lead.id, error: String(notifError) });
        }

        // Mark reminder as sent
        await supabase.from("leads").update({ [stage.column]: now.toISOString() }).eq("id", lead.id);
      }
    }

    // ============ UPDATE ENGAGEMENT TIERS ============
    // Recalculate engagement tiers based on recent behavior
    try {
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

      // Get all providers who received leads in last 30 days
      const { data: recentProviders } = await supabase
        .from("leads")
        .select("facility_id, facilities!inner(user_id)")
        .gte("created_at", thirtyDaysAgo)
        .eq("redistribution_status", "exclusive");

      if (recentProviders && recentProviders.length > 0) {
        // Group by user_id
        const providerLeadCounts = new Map<string, number>();
        const providerFacilityMap = new Map<string, string>();
        for (const pl of recentProviders) {
          // deno-lint-ignore no-explicit-any
          const userId = (pl.facilities as any)?.user_id;
          if (userId) {
            providerLeadCounts.set(userId, (providerLeadCounts.get(userId) || 0) + 1);
            providerFacilityMap.set(userId, pl.facility_id);
          }
        }

        for (const [userId, leadCount] of providerLeadCounts) {
          const facilityId = providerFacilityMap.get(userId);
          if (!facilityId) continue;

          // Count unlocks in last 30 days
          const { count: unlockCount } = await supabase
            .from("lead_unlocks")
            .select("*", { count: "exact", head: true })
            .eq("facility_id", facilityId)
            .gte("unlocked_at", thirtyDaysAgo);

          const unlockRate = leadCount > 0 ? (unlockCount || 0) / leadCount : 0;

          let newTier: EngagementTier;
          if (unlockRate >= 0.6) newTier = "high";
          else if (unlockRate >= 0.3) newTier = "moderate";
          else if (unlockRate > 0) newTier = "low";
          else newTier = "inactive";

          // Update tier
          await supabase
            .from("notification_preferences")
            .update({
              engagement_tier: newTier,
              total_unlocks_30d: unlockCount || 0,
            })
            .eq("user_id", userId);
        }

        log("INFO", `Updated engagement tiers for ${providerLeadCounts.size} providers`);
      }
    } catch (tierError) {
      log("WARN", "Failed to update engagement tiers", { error: String(tierError) });
    }

    log("INFO", "Unlock reminders complete", { totalSent, totalSkipped });

    return new Response(
      JSON.stringify({ success: true, totalSent, totalSkipped }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    log("ERROR", "Unhandled error", { error: error instanceof Error ? error.message : String(error) });
    return new Response(
      JSON.stringify({ success: false, error: "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
