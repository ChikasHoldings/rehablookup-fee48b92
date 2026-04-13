import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const VERSION = "4.0.0";

const log = (level: "INFO" | "WARN" | "ERROR", message: string, details?: unknown) => {
  const timestamp = new Date().toISOString();
  const detailsStr = details ? ` | ${JSON.stringify(details)}` : "";
  console.log(`[${timestamp}] [send-unlock-reminders] [${VERSION}] [${level}] ${message}${detailsStr}`);
};

// ============ ESCALATION STAGES ============
// Stage 0: 1h  — High-intent boost (ONLY for high-intent leads)
// Stage 1: 2h  — Early reminder (light urgency)
// Stage 2: 8h  — Mid urgency push (opportunity focus)
// Stage 3: 20h — Final urgency push (loss aversion) + SMS
// Stage 4: 24h — Expiration awareness (clear loss) + mark expired

interface ReminderStage {
  name: string;
  hoursAfter: number;
  column: string;
  prevColumn: string | null;
  highIntentOnly: boolean;
  sendSms: boolean;
  subject: (facilityName: string) => string;
  getEmail: (facilityName: string, leadPreview: LeadPreview, dashboardUrl: string, creditCost: string) => string;
  smsMessage?: (leadPreview: LeadPreview, creditCost: string) => string;
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

// ============ EMAIL WRAPPER ============
function emailWrapper(headerBg: string, emoji: string, subtitle: string, title: string, bodyContent: string): string {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f5f5f5;-webkit-font-smoothing:antialiased;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:32px 16px;"><tr><td align="center">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
  <tr><td style="background:${headerBg};padding:32px;border-radius:12px 12px 0 0;text-align:center;">
    <div style="font-size:48px;margin-bottom:16px;">${emoji}</div>
    <p style="margin:0 0 8px 0;font-size:12px;color:rgba(255,255,255,0.8);text-transform:uppercase;letter-spacing:1px;">${subtitle}</p>
    <h1 style="margin:0;font-size:22px;color:#fff;font-family:Arial,sans-serif;font-weight:600;">${title}</h1>
  </td></tr>
  <tr><td style="background:#fff;padding:32px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;border-left:1px solid #e5e7eb;border-right:1px solid #e5e7eb;">
    ${bodyContent}
  </td></tr>
  <tr><td style="background:#1B365D;padding:24px 32px;border-radius:0 0 12px 12px;text-align:center;">
    <p style="margin:0;color:#cbd5e1;font-size:12px;">© ${new Date().getFullYear()} RehabLookup. All rights reserved.</p>
    <a href="https://rehablookup.com/provider/settings" style="color:#93c5fd;text-decoration:none;font-size:11px;">Notification Settings</a>
  </td></tr>
</table></td></tr></table></body></html>`;
}

function ctaButton(url: string, bg: string, text: string): string {
  return `<div style="text-align:center;margin:20px 0;">
    <a href="${url}" style="display:inline-block;background:${bg};color:#fff;text-decoration:none;padding:14px 32px;border-radius:8px;font-weight:600;font-size:15px;">${text}</a>
  </div>`;
}

function priceBox(creditCost: string, note: string, borderColor: string): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fef3c7;border:2px solid ${borderColor};border-radius:8px;margin-bottom:20px;">
    <tr><td style="padding:16px;text-align:center;">
      <p style="margin:0 0 4px 0;font-size:13px;color:#92400e;">${note}</p>
      <p style="margin:0;font-size:24px;font-weight:700;color:#78350f;">${creditCost}</p>
    </td></tr>
  </table>`;
}

// ============ EMAIL TEMPLATES ============

function getHighIntentBoostEmail(facilityName: string, lead: LeadPreview, dashboardUrl: string, creditCost: string): string {
  const signals = getIntentSignals(lead);
  return emailWrapper("#7c3aed", "🔥", "REHABLOOKUP — PRIORITY ALERT", "High-Intent Lead Needs Immediate Response",
    `<p style="margin:0 0 20px 0;color:#374151;font-size:16px;line-height:1.6;">Hi ${facilityName} team,</p>
    <p style="margin:0 0 20px 0;color:#374151;font-size:15px;line-height:1.6;">
      <strong>${lead.maskedName}</strong> submitted a <strong>high-intent inquiry</strong> to your facility ${Math.round(lead.hoursAgo * 10) / 10 < 2 ? "about an hour ago" : `${Math.round(lead.hoursAgo)} hours ago`}. This person is <strong>actively seeking treatment now</strong> and chose your facility specifically.
    </p>
    ${buildSignalsHtml(signals)}
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f3ff;border:2px solid #8b5cf6;border-radius:8px;margin-bottom:20px;">
      <tr><td style="padding:20px;text-align:center;">
        <p style="margin:0 0 8px 0;font-size:15px;font-weight:600;color:#6d28d9;">⚡ Speed is critical</p>
        <p style="margin:0;font-size:13px;color:#5b21b6;line-height:1.5;">
          Studies show that responding within 1 hour increases conversion by 7x. This user is ready to talk now.
        </p>
      </td></tr>
    </table>
    ${priceBox(creditCost, "Unlock to connect immediately", "#8b5cf6")}
    ${ctaButton(dashboardUrl, "#7c3aed", "🔓 Unlock High-Intent Lead Now")}
    <p style="margin:20px 0 0 0;color:#6b7280;font-size:13px;text-align:center;line-height:1.5;">This lead was sent exclusively to your facility.</p>`
  );
}

function getEarlyReminderEmail(facilityName: string, lead: LeadPreview, dashboardUrl: string, creditCost: string): string {
  const signals = getIntentSignals(lead);
  return emailWrapper("#1B365D", lead.isHighIntent ? "🔥" : "📬", "REHABLOOKUP", lead.isHighIntent ? "High-Intent Inquiry Waiting" : "New Inquiry Waiting",
    `<p style="margin:0 0 20px 0;color:#374151;font-size:16px;line-height:1.6;">Hi ${facilityName} team,</p>
    <p style="margin:0 0 20px 0;color:#374151;font-size:15px;line-height:1.6;">
      You received an inquiry from <strong>${lead.maskedName}</strong> about ${Math.round(lead.hoursAgo)} hours ago. This person is actively looking for treatment and chose <strong>your facility</strong>.
    </p>
    ${buildSignalsHtml(signals)}
    ${priceBox(creditCost, "Unlock cost", "#fbbf24")}
    ${ctaButton(dashboardUrl, "#1B365D", "🔓 Unlock Lead Now")}
    <p style="margin:20px 0 0 0;color:#6b7280;font-size:13px;text-align:center;line-height:1.5;">Quick response times lead to higher conversion rates.</p>`
  );
}

function getMidUrgencyEmail(facilityName: string, lead: LeadPreview, dashboardUrl: string, creditCost: string): string {
  const signals = getIntentSignals(lead);
  return emailWrapper("#b45309", "⏰", "REHABLOOKUP", "Don't Miss This Potential Admission",
    `<p style="margin:0 0 20px 0;color:#374151;font-size:16px;line-height:1.6;">Hi ${facilityName} team,</p>
    <p style="margin:0 0 20px 0;color:#374151;font-size:15px;line-height:1.6;">
      <strong>${lead.maskedName}</strong> submitted an inquiry <strong>${Math.round(lead.hoursAgo)} hours ago</strong> and hasn't been contacted yet. This user specifically chose your facility and may still be evaluating options.
    </p>
    ${buildSignalsHtml(signals)}
    ${priceBox(`Unlock for ${creditCost}`, "Speed matters in treatment decisions", "#f59e0b")}
    ${ctaButton(dashboardUrl, "#b45309", "🔓 Unlock & Connect Now")}`
  );
}

function getFinalUrgencyEmail(facilityName: string, lead: LeadPreview, dashboardUrl: string, creditCost: string): string {
  return emailWrapper("#dc2626", "🚨", "REHABLOOKUP — FINAL NOTICE", "Last Chance to Unlock This Lead",
    `<p style="margin:0 0 20px 0;color:#374151;font-size:16px;line-height:1.6;">Hi ${facilityName} team,</p>
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
    ${ctaButton(dashboardUrl, "#dc2626", `🔓 Unlock Before It's Too Late — ${creditCost}`)}`
  );
}

function getExpirationEmail(facilityName: string, lead: LeadPreview, dashboardUrl: string, _creditCost: string): string {
  return emailWrapper("#374151", "📭", "REHABLOOKUP", "Missed Opportunity",
    `<p style="margin:0 0 20px 0;color:#374151;font-size:16px;line-height:1.6;">Hi ${facilityName} team,</p>
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
    ${ctaButton(dashboardUrl, "#1B365D", "View Your Dashboard")}`
  );
}

// ============ ENGAGEMENT TIER LOGIC ============
type EngagementTier = "high" | "moderate" | "low" | "inactive";

function shouldSendForTier(tier: EngagementTier, stage: string, isHighIntent: boolean): boolean {
  // High-intent leads always get all stages
  if (isHighIntent) return true;

  switch (tier) {
    case "high":
      // High engagement: skip 1h boost (not high-intent) and 8h mid-urgency
      return stage !== "1h" && stage !== "8h";
    case "moderate":
      // Full sequence (except 1h boost which is high-intent only)
      return stage !== "1h";
    case "low":
      // Full sequence with stronger messaging
      return stage !== "1h";
    case "inactive":
      // Only first reminder + final urgency
      return stage === "2h" || stage === "20h";
    default:
      return true;
  }
}

// ============ MAIN HANDLER ============
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    log("INFO", "Starting enhanced unlock reminder processing v4");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const now = new Date();
    const dashboardUrl = "https://rehablookup.com/provider/inquiries";

    // Define the 5 reminder stages (1h is high-intent only)
    const stages: ReminderStage[] = [
      {
        name: "1h",
        hoursAfter: 1,
        column: "reminder_1h_sent_at",
        prevColumn: null,
        highIntentOnly: true,
        sendSms: false,
        subject: (_fn) => `🔥 High-intent inquiry needs your immediate attention`,
        getEmail: getHighIntentBoostEmail,
        inAppTitle: "🔥 High-Intent — Respond Now",
        inAppMessage: (lp) => `${lp.maskedName} is actively seeking treatment and chose your facility. Respond within the hour for 7x higher conversion.`,
        notificationType: "high_intent_boost",
      },
      {
        name: "2h",
        hoursAfter: 2,
        column: "reminder_2h_sent_at",
        prevColumn: null,
        highIntentOnly: false,
        sendSms: false,
        subject: (fn) => `New inquiry waiting for you — ${fn}`,
        getEmail: getEarlyReminderEmail,
        inAppTitle: "Inquiry Still Waiting",
        inAppMessage: (lp) => `${lp.maskedName} is waiting for your response${lp.levelOfCare ? ` (${lp.levelOfCare.replace(/_/g, " ")})` : ""}`,
        notificationType: "reminder",
      },
      {
        name: "8h",
        hoursAfter: 8,
        column: "reminder_6h_sent_at",
        prevColumn: "reminder_2h_sent_at",
        highIntentOnly: false,
        sendSms: false,
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
        highIntentOnly: false,
        sendSms: true, // SMS at final urgency
        subject: (_fn) => `⚠️ Last chance to unlock this lead`,
        getEmail: getFinalUrgencyEmail,
        smsMessage: (lp, cost) => `RehabLookup: ${lp.maskedName}'s inquiry expires in ~4hrs. Unlock for ${cost} before it's lost. rehablookup.com/provider/inquiries`,
        inAppTitle: "Last Chance — Lead Going Cold",
        inAppMessage: (lp) => `${lp.maskedName} may move to another facility soon. Unlock now or lose this lead forever.`,
        notificationType: "final_urgency",
      },
      {
        name: "24h",
        hoursAfter: 24,
        column: "reminder_24h_sent_at",
        prevColumn: "reminder_20h_sent_at",
        highIntentOnly: false,
        sendSms: false,
        subject: (fn) => `Missed opportunity — ${fn}`,
        getEmail: getExpirationEmail,
        inAppTitle: "Inquiry Expired",
        inAppMessage: (lp) => `The inquiry from ${lp.maskedName} was not unlocked and is now expired. This exclusive lead is lost.`,
        notificationType: "expiration",
      },
    ];

    let totalSent = 0;
    let totalSkipped = 0;
    let totalExpired = 0;

    // Pre-fetch engagement tiers for all providers
    const { data: engagementData } = await supabase
      .from("notification_preferences")
      .select("user_id, engagement_tier, email_lead_alerts, sms_lead_alerts, sms_escalation_enabled");

    const engagementMap = new Map<string, { tier: EngagementTier; emailEnabled: boolean; smsEnabled: boolean; smsEscalation: boolean }>();
    for (const ep of engagementData || []) {
      engagementMap.set(ep.user_id, {
        tier: (ep.engagement_tier as EngagementTier) || "moderate",
        emailEnabled: ep.email_lead_alerts !== false,
        smsEnabled: ep.sms_lead_alerts === true,
        smsEscalation: ep.sms_escalation_enabled === true,
      });
    }

    for (const stage of stages) {
      const hoursAgo = new Date(now.getTime() - stage.hoursAfter * 60 * 60 * 1000);
      // 1-hour window to catch leads (narrower for 1h boost)
      const windowHours = stage.name === "1h" ? 0.5 : 1;
      const windowEnd = new Date(now.getTime() - (stage.hoursAfter + windowHours) * 60 * 60 * 1000);

      let query = supabase
        .from("leads")
        .select(`
          id, name, facility_id, level_of_care, urgency, location_city_state,
          inquiry_type, high_intent, created_at, credit_cost,
          facilities!inner (id, name, email, user_id, reply_email, reply_email_verified)
        `)
        .is(stage.column, null)
        .is("lead_expired_at", null) // Skip already expired leads
        .lte("created_at", hoursAgo.toISOString())
        .gte("created_at", windowEnd.toISOString())
        .eq("redistribution_status", "exclusive");

      // High-intent only filter
      if (stage.highIntentOnly) {
        query = query.eq("high_intent", true);
      }

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
          // Already unlocked — mark stage and stop all reminders
          const updateData: Record<string, string> = { [stage.column]: now.toISOString() };
          await supabase.from("leads").update(updateData).eq("id", lead.id);
          continue;
        }

        // deno-lint-ignore no-explicit-any
        const facility = lead.facilities as any;
        if (!facility) continue;

        // Check engagement tier
        const engagement = engagementMap.get(facility.user_id) || {
          tier: "moderate" as EngagementTier,
          emailEnabled: true,
          smsEnabled: false,
          smsEscalation: false,
        };

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

        // Send SMS at final urgency if enabled
        if (stage.sendSms && (engagement.smsEnabled || engagement.smsEscalation) && stage.smsMessage) {
          try {
            const { data: providerProfile } = await supabase
              .from("profiles")
              .select("phone, phone_verified")
              .eq("user_id", facility.user_id)
              .maybeSingle();

            if (providerProfile?.phone && providerProfile.phone_verified) {
              const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
              const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

              await fetch(`${supabaseUrl}/functions/v1/send-sms-notification`, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  "Authorization": `Bearer ${supabaseKey}`,
                },
                body: JSON.stringify({
                  userId: facility.user_id,
                  notificationType: "lead_final_urgency",
                  data: {
                    message: stage.smsMessage(leadPreview, creditCost),
                  },
                }),
              });

              await supabase.from("notification_events").insert({
                lead_id: lead.id,
                facility_id: facility.id,
                user_id: facility.user_id,
                notification_stage: stage.name,
                channel: "sms",
                event_type: "sent",
                notification_type: stage.notificationType,
                metadata: { engagement_tier: engagement.tier },
              });

              log("INFO", `${stage.name} SMS sent`, { leadId: lead.id });
            }
          } catch (smsError) {
            log("WARN", `Failed to send ${stage.name} SMS`, { leadId: lead.id, error: String(smsError) });
          }
        }

        // Send in-app notification with deep link to specific lead
        try {
          await supabase.from("provider_notifications").insert({
            user_id: facility.user_id,
            facility_id: facility.id,
            type: stage.name === "24h" ? "lead_expired" : (stage.name === "1h" ? "high_intent_lead" : "lead_reminder"),
            title: stage.inAppTitle,
            message: stage.inAppMessage(leadPreview),
            metadata: {
              lead_id: lead.id,
              stage: stage.name,
              urgency: lead.urgency,
              level_of_care: lead.level_of_care,
              high_intent: leadPreview.isHighIntent,
              credit_cost: lead.credit_cost,
              inquiry_type: lead.inquiry_type,
              link: `/provider/inquiries?lead=${lead.id}`,
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
        const updatePayload: Record<string, unknown> = { [stage.column]: now.toISOString() };

        // Mark as expired at 24h stage
        if (stage.name === "24h") {
          updatePayload.lead_expired_at = now.toISOString();
          totalExpired++;
        }

        await supabase.from("leads").update(updatePayload).eq("id", lead.id);
      }
    }

    // ============ UPDATE ENGAGEMENT TIERS ============
    try {
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

      const { data: recentProviders } = await supabase
        .from("leads")
        .select("facility_id, facilities!inner(user_id)")
        .gte("created_at", thirtyDaysAgo)
        .eq("redistribution_status", "exclusive");

      if (recentProviders && recentProviders.length > 0) {
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

    log("INFO", "Unlock reminders complete", { totalSent, totalSkipped, totalExpired });

    return new Response(
      JSON.stringify({ success: true, totalSent, totalSkipped, totalExpired }),
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
