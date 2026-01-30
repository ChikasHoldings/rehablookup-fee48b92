import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { Resend } from "https://esm.sh/resend@2.0.0";
import Stripe from "https://esm.sh/stripe@18.5.0";
import {
  getProviderPlan,
  emailStart,
  emailHeader,
  emailBodyStart,
  emailBodyEnd,
  emailGreeting,
  emailParagraph,
  proInsightsBox,
  alertBox,
  ctaButton,
  emailFooter,
  emailEnd,
  maskLeadName,
  type PlanType,
} from "../_shared/email-templates.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const REMINDER_TIERS = [
  { hours: 24, level: 1, label: "24 hours", urgency: "moderate" },
  { hours: 48, level: 2, label: "48 hours", urgency: "high" },
  { hours: 72, level: 3, label: "72 hours", urgency: "critical" },
];

interface LeadWithFacility {
  id: string;
  name: string;
  email: string;
  phone: string;
  created_at: string;
  facility_id: string;
  preferred_contact: string;
  follow_up_reminder_sent_at: string | null;
  snooze_until: string | null;
  facilities: { name: string; user_id: string }[];
}

interface ProviderLeads {
  providerEmail: string;
  providerName: string;
  facilityName: string;
  leads: { lead: LeadWithFacility; tier: typeof REMINDER_TIERS[0] }[];
  userId: string;
}

function isLeadSnoozed(snoozeUntil: string | null): boolean {
  if (!snoozeUntil) return false;
  return new Date(snoozeUntil).getTime() > Date.now();
}

function getReminderTier(createdAt: string, lastReminderAt: string | null): typeof REMINDER_TIERS[0] | null {
  const now = Date.now();
  const createdTime = new Date(createdAt).getTime();
  const hoursSinceCreated = (now - createdTime) / (1000 * 60 * 60);
  
  if (!lastReminderAt) {
    if (hoursSinceCreated >= 24) return REMINDER_TIERS[0];
    return null;
  }
  
  const lastReminderTime = new Date(lastReminderAt).getTime();
  const hoursSinceLastReminder = (now - lastReminderTime) / (1000 * 60 * 60);
  
  if (hoursSinceLastReminder < 24) return null;
  
  if (hoursSinceCreated >= 72) {
    if (lastReminderTime < createdTime + (72 * 60 * 60 * 1000)) return REMINDER_TIERS[2];
    return null;
  } else if (hoursSinceCreated >= 48) {
    if (lastReminderTime < createdTime + (48 * 60 * 60 * 1000)) return REMINDER_TIERS[1];
    return null;
  }
  
  return null;
}

function generateFollowupEmail(
  providerData: ProviderLeads,
  highestTier: typeof REMINDER_TIERS[0],
  plan: PlanType
): string {
  const totalLeads = providerData.leads.length;
  const isUrgent = highestTier.level >= 2;
  const isPro = plan === 'pro';

  // SECURITY: Mask lead contact info - providers must unlock leads to see full details
  const leadsHtml = providerData.leads.slice(0, 4).map(({ lead, tier }) => {
    const badge = tier.level === 3 ? "72h+" : tier.level === 2 ? "48h+" : "24h+";
    const badgeColor = tier.level === 3 ? "#991b1b" : tier.level === 2 ? "#dc2626" : "#f59e0b";
    const maskedName = maskLeadName(lead.name);
    
    return `
    <tr>
      <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb;">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td>
              <span style="font-weight: 600; color: #1B365D;">🔒 ${maskedName}</span>
              <span style="background: ${badgeColor}; color: #fff; font-size: 10px; padding: 2px 6px; border-radius: 3px; margin-left: 8px;">${badge}</span>
            </td>
          </tr>
          <tr>
            <td style="padding-top: 4px;">
              <span style="background: #fef3c7; color: #92400e; padding: 2px 8px; border-radius: 4px; font-size: 11px;">Unlock to view contact details</span>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  `}).join("");

  let email = emailStart();
  email += emailHeader(isUrgent ? "Leads Need Attention" : "Follow-Up Reminder", plan, { isUrgent });
  email += emailBodyStart();
  email += emailGreeting(providerData.providerName);
  email += emailParagraph(`You have <strong>${totalLeads} lead${totalLeads === 1 ? "" : "s"}</strong> waiting for a response at ${providerData.facilityName}. Unlock each lead to view their contact details.`);

  // Pro insights
  if (isPro) {
    email += proInsightsBox("As a Pro member, you save 20% on every lead unlock. Quick responses help families in need.");
  }

  // Urgent alert
  if (isUrgent) {
    email += alertBox(`These leads have been waiting over ${highestTier.label}. Quick responses help families in need.`, plan, { isUrgent });
  }

  // Leads list
  email += `
              <table width="100%" cellpadding="0" cellspacing="0">
                ${leadsHtml}
              </table>
  `;

  if (totalLeads > 4) {
    email += `<p style="margin: 12px 0 0 0; font-size: 13px; color: #6b7280;">+ ${totalLeads - 4} more</p>`;
  }

  email += ctaButton("View & Unlock Leads", "https://rehablookup.com/provider/leads", plan);
  email += emailBodyEnd();
  email += emailFooter();
  email += emailEnd();

  return email;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  console.log("[FOLLOWUP-REMINDERS] Starting follow-up reminder check...");

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");

    if (!resendApiKey) {
      console.error("[FOLLOWUP-REMINDERS] RESEND_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "Email service not configured" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const resend = new Resend(resendApiKey);
    const stripe = stripeSecretKey ? new Stripe(stripeSecretKey, { apiVersion: "2025-08-27.basil" }) : null;

    const thresholdTime = new Date();
    thresholdTime.setHours(thresholdTime.getHours() - 24);

    const { data: potentialLeads, error: leadsError } = await supabase
      .from("leads")
      .select(`
        id, name, email, phone, created_at, facility_id, preferred_contact,
        follow_up_reminder_sent_at, snooze_until,
        facilities!inner (name, user_id)
      `)
      .eq("status", "new")
      .lt("created_at", thresholdTime.toISOString())
      .not("facility_id", "is", null);

    if (leadsError) {
      console.error("[FOLLOWUP-REMINDERS] Error fetching leads:", leadsError);
      throw leadsError;
    }

    if (!potentialLeads || potentialLeads.length === 0) {
      console.log("[FOLLOWUP-REMINDERS] No leads found requiring reminders");
      return new Response(
        JSON.stringify({ message: "No reminders needed", count: 0 }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const leadsWithTiers: { lead: LeadWithFacility; tier: typeof REMINDER_TIERS[0] }[] = [];
    let snoozedCount = 0;
    
    for (const lead of potentialLeads as LeadWithFacility[]) {
      if (isLeadSnoozed(lead.snooze_until)) {
        snoozedCount++;
        continue;
      }
      
      const tier = getReminderTier(lead.created_at, lead.follow_up_reminder_sent_at);
      if (tier) leadsWithTiers.push({ lead, tier });
    }

    if (leadsWithTiers.length === 0) {
      console.log(`[FOLLOWUP-REMINDERS] No leads eligible for reminders (${snoozedCount} snoozed)`);
      return new Response(
        JSON.stringify({ message: "No reminders needed", count: 0, snoozed: snoozedCount }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log(`[FOLLOWUP-REMINDERS] Found ${leadsWithTiers.length} leads needing reminders`);

    const providerLeadsMap = new Map<string, ProviderLeads>();

    for (const { lead, tier } of leadsWithTiers) {
      const facility = lead.facilities[0];
      if (!facility) continue;
      const userId = facility.user_id;
      
      if (!providerLeadsMap.has(userId)) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("email, first_name, last_name")
          .eq("user_id", userId)
          .maybeSingle();

        const { data: prefs } = await supabase
          .from("notification_preferences")
          .select("notify_new_leads")
          .eq("user_id", userId)
          .maybeSingle();

        if (prefs?.notify_new_leads === false) {
          console.log(`[FOLLOWUP-REMINDERS] Skipping user ${userId} - notifications disabled`);
          continue;
        }

        if (profile?.email) {
          providerLeadsMap.set(userId, {
            providerEmail: profile.email,
            providerName: `${profile.first_name} ${profile.last_name}`.trim() || "there",
            facilityName: facility.name,
            leads: [],
            userId,
          });
        }
      }

      const providerData = providerLeadsMap.get(userId);
      if (providerData) providerData.leads.push({ lead, tier });
    }

    let emailsSent = 0;
    const processedLeadIds: string[] = [];

    for (const [userId, providerData] of providerLeadsMap) {
      try {
        const tier3Leads = providerData.leads.filter(l => l.tier.level === 3);
        const tier2Leads = providerData.leads.filter(l => l.tier.level === 2);
        
        const highestTier = tier3Leads.length > 0 ? REMINDER_TIERS[2] :
                           tier2Leads.length > 0 ? REMINDER_TIERS[1] : REMINDER_TIERS[0];
        
        const totalLeads = providerData.leads.length;
        const isUrgent = highestTier.level >= 2;

        // Get provider plan for styling
        const planInfo = await getProviderPlan(providerData.providerEmail, stripe);
        console.log(`[FOLLOWUP-REMINDERS] Provider ${providerData.providerEmail} is on ${planInfo.plan} plan`);

        const emailHtml = generateFollowupEmail(providerData, highestTier, planInfo.plan);

        const subjectPrefix = highestTier.level === 3 ? "Urgent:" : highestTier.level === 2 ? "Action needed:" : "Reminder:";

        await resend.emails.send({
          from: "RehabLookup <no-reply@rehablookup.com>",
          to: [providerData.providerEmail],
          subject: `${subjectPrefix} ${totalLeads} lead${totalLeads > 1 ? "s" : ""} waiting - Unlock to view`,
          html: emailHtml,
        });

        emailsSent++;
        console.log(`[FOLLOWUP-REMINDERS] Email sent to ${providerData.providerEmail}`);

        // SECURITY: Use masked name in notification, don't include contact details
        const maskedLeadName = maskLeadName(providerData.leads[0]?.lead.name || "Lead");
        const notificationMessage = `${totalLeads} lead${totalLeads > 1 ? "s have" : " has"} been waiting for a response. Unlock to view contact details.`;

        await supabase
          .from("provider_notifications")
          .insert({
            user_id: userId,
            type: `follow_up_reminder_tier_${highestTier.level}`,
            title: isUrgent ? "Leads need attention" : "Follow-up reminder",
            message: notificationMessage,
            metadata: {
              lead_count: totalLeads,
              tier: highestTier.level,
              lead_ids: providerData.leads.map(l => l.lead.id),
              // SECURITY: Only masked name, no contact details
              sample_lead_name: maskedLeadName,
            },
          });

        for (const { lead } of providerData.leads) {
          processedLeadIds.push(lead.id);
        }

      } catch (emailError) {
        console.error(`[FOLLOWUP-REMINDERS] Failed to send reminder to ${providerData.providerEmail}:`, emailError);
      }
    }

    if (processedLeadIds.length > 0) {
      await supabase
        .from("leads")
        .update({ follow_up_reminder_sent_at: new Date().toISOString() })
        .in("id", processedLeadIds);
    }

    const executionTime = Date.now() - startTime;
    console.log(`[FOLLOWUP-REMINDERS] Completed in ${executionTime}ms - sent ${emailsSent} emails`);

    return new Response(
      JSON.stringify({
        success: true,
        emailsSent,
        leadsProcessed: processedLeadIds.length,
        executionTimeMs: executionTime,
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );

  } catch (error) {
    console.error("[FOLLOWUP-REMINDERS] Error:", error);
    return new Response(
      JSON.stringify({ error: String(error) }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
