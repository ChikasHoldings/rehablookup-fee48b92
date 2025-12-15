import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Reminder tiers (hours after lead creation)
const REMINDER_TIERS = [
  { hours: 24, level: 1, label: "First Reminder", urgency: "moderate" },
  { hours: 48, level: 2, label: "Second Reminder", urgency: "high" },
  { hours: 72, level: 3, label: "Final Reminder", urgency: "critical" },
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
  facilities: {
    name: string;
    user_id: string;
  }[];
}

interface ProviderLeads {
  providerEmail: string;
  providerName: string;
  facilityName: string;
  leads: { lead: LeadWithFacility; tier: typeof REMINDER_TIERS[0] }[];
  userId: string;
}

function getReminderTier(createdAt: string, lastReminderAt: string | null): typeof REMINDER_TIERS[0] | null {
  const now = Date.now();
  const createdTime = new Date(createdAt).getTime();
  const hoursSinceCreated = (now - createdTime) / (1000 * 60 * 60);
  
  // If no reminder sent yet, check if eligible for 24h reminder
  if (!lastReminderAt) {
    if (hoursSinceCreated >= 24) {
      return REMINDER_TIERS[0]; // 24h tier
    }
    return null;
  }
  
  const lastReminderTime = new Date(lastReminderAt).getTime();
  const hoursSinceLastReminder = (now - lastReminderTime) / (1000 * 60 * 60);
  
  // Need at least 24 hours between reminders
  if (hoursSinceLastReminder < 24) {
    return null;
  }
  
  // Determine which tier based on hours since creation
  if (hoursSinceCreated >= 72) {
    // Check if we already sent the 72h reminder
    const tier72 = REMINDER_TIERS[2];
    // Only send 72h if last reminder was before 72h mark
    if (lastReminderTime < createdTime + (72 * 60 * 60 * 1000)) {
      return tier72;
    }
    return null; // Already sent all reminders
  } else if (hoursSinceCreated >= 48) {
    // Check if we already sent the 48h reminder
    const tier48 = REMINDER_TIERS[1];
    if (lastReminderTime < createdTime + (48 * 60 * 60 * 1000)) {
      return tier48;
    }
    return null;
  }
  
  return null;
}

function getEmailStyles(urgency: string) {
  const styles = {
    moderate: {
      headerBg: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
      alertBg: "#fef3c7",
      alertBorder: "#fcd34d",
      alertText: "#92400e",
      countColor: "#d97706",
      emoji: "⏰",
    },
    high: {
      headerBg: "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)",
      alertBg: "#fef2f2",
      alertBorder: "#fecaca",
      alertText: "#991b1b",
      countColor: "#dc2626",
      emoji: "🚨",
    },
    critical: {
      headerBg: "linear-gradient(135deg, #7c2d12 0%, #991b1b 100%)",
      alertBg: "#fef2f2",
      alertBorder: "#f87171",
      alertText: "#7c2d12",
      countColor: "#991b1b",
      emoji: "🔴",
    },
  };
  return styles[urgency as keyof typeof styles] || styles.moderate;
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

    if (!resendApiKey) {
      console.error("[FOLLOWUP-REMINDERS] RESEND_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "Email service not configured" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const resend = new Resend(resendApiKey);

    // Calculate threshold time (24 hours ago - minimum for any reminder)
    const thresholdTime = new Date();
    thresholdTime.setHours(thresholdTime.getHours() - 24);

    // Find leads that:
    // 1. Status is still "new"
    // 2. Created more than 24 hours ago
    const { data: potentialLeads, error: leadsError } = await supabase
      .from("leads")
      .select(`
        id,
        name,
        email,
        phone,
        created_at,
        facility_id,
        preferred_contact,
        follow_up_reminder_sent_at,
        facilities!inner (
          name,
          user_id
        )
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

    // Filter leads that are eligible for a reminder tier
    const leadsWithTiers: { lead: LeadWithFacility; tier: typeof REMINDER_TIERS[0] }[] = [];
    
    for (const lead of potentialLeads as LeadWithFacility[]) {
      const tier = getReminderTier(lead.created_at, lead.follow_up_reminder_sent_at);
      if (tier) {
        leadsWithTiers.push({ lead, tier });
      }
    }

    if (leadsWithTiers.length === 0) {
      console.log("[FOLLOWUP-REMINDERS] No leads eligible for reminders at this time");
      return new Response(
        JSON.stringify({ message: "No reminders needed", count: 0 }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log(`[FOLLOWUP-REMINDERS] Found ${leadsWithTiers.length} leads needing reminders`);

    // Group leads by provider (user_id)
    const providerLeadsMap = new Map<string, ProviderLeads>();

    for (const { lead, tier } of leadsWithTiers) {
      const facility = lead.facilities[0];
      if (!facility) continue;
      const userId = facility.user_id;
      
      if (!providerLeadsMap.has(userId)) {
        // Fetch provider profile
        const { data: profile } = await supabase
          .from("profiles")
          .select("email, first_name, last_name")
          .eq("user_id", userId)
          .maybeSingle();

        // Check notification preferences
        const { data: prefs } = await supabase
          .from("notification_preferences")
          .select("notify_new_leads")
          .eq("user_id", userId)
          .maybeSingle();

        // Skip if provider has disabled lead notifications
        if (prefs?.notify_new_leads === false) {
          console.log(`[FOLLOWUP-REMINDERS] Skipping user ${userId} - notifications disabled`);
          continue;
        }

        if (profile?.email) {
          providerLeadsMap.set(userId, {
            providerEmail: profile.email,
            providerName: `${profile.first_name} ${profile.last_name}`.trim() || "Provider",
            facilityName: facility.name,
            leads: [],
            userId,
          });
        }
      }

      const providerData = providerLeadsMap.get(userId);
      if (providerData) {
        providerData.leads.push({ lead, tier });
      }
    }

    let emailsSent = 0;
    let notificationsCreated = 0;
    const processedLeadIds: string[] = [];
    const tierCounts = { level1: 0, level2: 0, level3: 0 };

    // Send reminder emails to each provider
    for (const [userId, providerData] of providerLeadsMap) {
      try {
        // Group by tier for this provider
        const tier1Leads = providerData.leads.filter(l => l.tier.level === 1);
        const tier2Leads = providerData.leads.filter(l => l.tier.level === 2);
        const tier3Leads = providerData.leads.filter(l => l.tier.level === 3);
        
        // Determine the highest urgency tier for the email subject
        const highestTier = tier3Leads.length > 0 ? REMINDER_TIERS[2] :
                           tier2Leads.length > 0 ? REMINDER_TIERS[1] : REMINDER_TIERS[0];
        const styles = getEmailStyles(highestTier.urgency);
        
        const totalLeads = providerData.leads.length;
        
        // Build urgency message based on tiers
        let urgencyMessage = "";
        if (tier3Leads.length > 0) {
          urgencyMessage = `<strong style="color: #991b1b;">${tier3Leads.length} lead${tier3Leads.length > 1 ? 's have' : ' has'} been waiting over 72 hours!</strong>`;
        }
        if (tier2Leads.length > 0) {
          urgencyMessage += urgencyMessage ? "<br>" : "";
          urgencyMessage += `<strong style="color: #dc2626;">${tier2Leads.length} lead${tier2Leads.length > 1 ? 's have' : ' has'} been waiting over 48 hours</strong>`;
        }
        if (tier1Leads.length > 0) {
          urgencyMessage += urgencyMessage ? "<br>" : "";
          urgencyMessage += `${tier1Leads.length} lead${tier1Leads.length > 1 ? 's have' : ' has'} been waiting over 24 hours`;
        }

        const subjectPrefix = highestTier.level === 3 ? "🔴 URGENT" : 
                              highestTier.level === 2 ? "🚨 Action Required" : "⏰ Reminder";

        // Build email HTML
        const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
  <div style="background: ${styles.headerBg}; padding: 30px; border-radius: 12px 12px 0 0;">
    <h1 style="color: #fff; margin: 0; font-size: 24px;">${styles.emoji} ${highestTier.label}</h1>
    <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0 0;">${totalLeads} lead${totalLeads > 1 ? 's are' : ' is'} waiting for your response</p>
  </div>
  
  <div style="background: #fff; border: 1px solid #e5e7eb; border-top: none; padding: 30px; border-radius: 0 0 12px 12px;">
    <div style="background: ${styles.alertBg}; border: 1px solid ${styles.alertBorder}; border-radius: 8px; padding: 20px; margin-bottom: 24px; text-align: center;">
      <p style="margin: 0 0 8px 0; font-size: 48px; font-weight: bold; color: ${styles.countColor};">${totalLeads}</p>
      <p style="margin: 0; color: ${styles.alertText}; font-size: 16px;">${totalLeads === 1 ? 'lead needs' : 'leads need'} your attention</p>
    </div>
    
    <p style="color: #4b5563; font-size: 15px; margin-bottom: 16px;">
      Hi ${providerData.providerName},
    </p>
    
    <p style="color: #4b5563; font-size: 15px; margin-bottom: 16px;">
      You have uncontacted leads for <strong>${providerData.facilityName}</strong>:
    </p>
    
    <div style="background: #fef2f2; border-left: 4px solid ${styles.countColor}; padding: 16px; margin-bottom: 24px;">
      <p style="margin: 0; font-size: 15px; color: #374151;">
        ${urgencyMessage}
      </p>
    </div>
    
    ${highestTier.level >= 2 ? `
    <div style="background: #fee2e2; border: 1px solid #fecaca; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
      <p style="margin: 0; font-size: 14px; color: #991b1b; font-weight: 600;">
        ${highestTier.level === 3 ? 
          "⚠️ These leads may be considering other facilities. Contact them immediately to avoid losing them." :
          "⚠️ Response time directly impacts conversion. Leads contacted within 24 hours convert 60% better!"
        }
      </p>
    </div>
    ` : ''}
    
    <div style="background: #f9fafb; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
      <h3 style="margin: 0 0 16px 0; font-size: 14px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px;">Leads Awaiting Response</h3>
      ${providerData.leads.slice(0, 5).map(({ lead, tier }) => {
        const tierBadge = tier.level === 3 ? 
          '<span style="background: #7c2d12; color: #fff; font-size: 11px; padding: 2px 8px; border-radius: 4px; margin-left: 8px;">72h+</span>' :
          tier.level === 2 ?
          '<span style="background: #dc2626; color: #fff; font-size: 11px; padding: 2px 8px; border-radius: 4px; margin-left: 8px;">48h+</span>' :
          '<span style="background: #f59e0b; color: #fff; font-size: 11px; padding: 2px 8px; border-radius: 4px; margin-left: 8px;">24h+</span>';
        return `
        <div style="border-bottom: 1px solid #e5e7eb; padding: 12px 0;">
          <p style="margin: 0; font-weight: 600; color: #111827;">${lead.name} ${tierBadge}</p>
          <p style="margin: 4px 0 0 0; font-size: 14px; color: #6b7280;">
            ${lead.phone} • ${lead.email}
          </p>
          <p style="margin: 4px 0 0 0; font-size: 13px; color: #9ca3af;">
            Submitted ${new Date(lead.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
          </p>
        </div>
      `}).join('')}
      ${totalLeads > 5 ? `<p style="margin: 12px 0 0 0; font-size: 14px; color: #6b7280;">+ ${totalLeads - 5} more leads</p>` : ''}
    </div>
    
    <div style="text-align: center; margin-top: 28px;">
      <a href="${supabaseUrl.replace('.supabase.co', '.lovable.app')}/provider/leads" style="display: inline-block; background: linear-gradient(135deg, #1B365D 0%, #2C4A7F 100%); color: #fff; padding: 16px 40px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px; box-shadow: 0 4px 14px rgba(27, 54, 93, 0.3);">
        📞 Contact These Leads Now
      </a>
    </div>
    
    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 32px 0;">
    
    <p style="font-size: 13px; color: #9ca3af; text-align: center; margin: 0;">
      This is ${highestTier.level === 1 ? 'your first' : highestTier.level === 2 ? 'your second' : 'your final'} reminder from <a href="https://rehablookup.com" style="color: #1B365D;">RehabLookup.com</a><br>
      <a href="${supabaseUrl.replace('.supabase.co', '.lovable.app')}/provider/settings" style="color: #6b7280;">Manage notification preferences</a>
    </p>
  </div>
</body>
</html>
        `;

        // Send email
        await resend.emails.send({
          from: "RehabLookup <noreply@resend.dev>",
          to: [providerData.providerEmail],
          subject: `${subjectPrefix}: ${totalLeads} lead${totalLeads > 1 ? 's' : ''} waiting for follow-up`,
          html: emailHtml,
        });

        emailsSent++;
        console.log(`[FOLLOWUP-REMINDERS] Email sent to ${providerData.providerEmail} for ${totalLeads} leads (highest tier: ${highestTier.level})`);

        // Create in-app notification with urgency level
        const notificationMessage = highestTier.level === 3 ?
          `URGENT: ${totalLeads} lead${totalLeads > 1 ? 's have' : ' has'} been waiting over 72 hours. Immediate action required!` :
          highestTier.level === 2 ?
          `${totalLeads} lead${totalLeads > 1 ? 's have' : ' has'} been waiting over 48 hours for a response.` :
          `${totalLeads} lead${totalLeads > 1 ? 's have' : ' has'} been waiting over 24 hours for a response.`;

        await supabase
          .from("provider_notifications")
          .insert({
            user_id: userId,
            type: `follow_up_reminder_tier_${highestTier.level}`,
            title: highestTier.level === 3 ? "🔴 Urgent: Leads need attention" : 
                   highestTier.level === 2 ? "🚨 Leads awaiting follow-up" : "⏰ Leads awaiting follow-up",
            message: notificationMessage,
            metadata: {
              lead_count: totalLeads,
              tier: highestTier.level,
              tier_breakdown: {
                tier1: tier1Leads.length,
                tier2: tier2Leads.length,
                tier3: tier3Leads.length,
              },
              lead_ids: providerData.leads.map(l => l.lead.id),
            },
          });

        notificationsCreated++;

        // Track tier counts
        tierCounts.level1 += tier1Leads.length;
        tierCounts.level2 += tier2Leads.length;
        tierCounts.level3 += tier3Leads.length;

        // Mark leads as reminded
        for (const { lead } of providerData.leads) {
          processedLeadIds.push(lead.id);
        }

      } catch (emailError) {
        console.error(`[FOLLOWUP-REMINDERS] Failed to send reminder to ${providerData.providerEmail}:`, emailError);
      }
    }

    // Update all processed leads to mark reminder as sent
    if (processedLeadIds.length > 0) {
      const { error: updateError } = await supabase
        .from("leads")
        .update({ follow_up_reminder_sent_at: new Date().toISOString() })
        .in("id", processedLeadIds);

      if (updateError) {
        console.error("[FOLLOWUP-REMINDERS] Error updating leads:", updateError);
      }
    }

    const duration = Date.now() - startTime;
    console.log(`[FOLLOWUP-REMINDERS] Completed in ${duration}ms - Emails: ${emailsSent}, Notifications: ${notificationsCreated}, Leads: ${processedLeadIds.length}, Tiers: 24h=${tierCounts.level1}, 48h=${tierCounts.level2}, 72h=${tierCounts.level3}`);

    return new Response(
      JSON.stringify({
        success: true,
        emailsSent,
        notificationsCreated,
        leadsProcessed: processedLeadIds.length,
        tierBreakdown: tierCounts,
        duration: `${duration}ms`,
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("[FOLLOWUP-REMINDERS] Error:", error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
