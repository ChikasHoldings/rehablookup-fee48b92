import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Hours after which to send reminder for uncontacted leads
const REMINDER_THRESHOLD_HOURS = 24;

interface LeadWithFacility {
  id: string;
  name: string;
  email: string;
  phone: string;
  created_at: string;
  facility_id: string;
  preferred_contact: string;
  facilities: {
    name: string;
    user_id: string;
  }[];
}

interface ProviderLeads {
  providerEmail: string;
  providerName: string;
  facilityName: string;
  leads: LeadWithFacility[];
  userId: string;
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

    // Calculate threshold time (24 hours ago)
    const thresholdTime = new Date();
    thresholdTime.setHours(thresholdTime.getHours() - REMINDER_THRESHOLD_HOURS);

    // Find leads that:
    // 1. Status is still "new"
    // 2. Created more than 24 hours ago
    // 3. Haven't had a reminder sent yet
    const { data: staleLeads, error: leadsError } = await supabase
      .from("leads")
      .select(`
        id,
        name,
        email,
        phone,
        created_at,
        facility_id,
        preferred_contact,
        facilities!inner (
          name,
          user_id
        )
      `)
      .eq("status", "new")
      .is("follow_up_reminder_sent_at", null)
      .lt("created_at", thresholdTime.toISOString())
      .not("facility_id", "is", null);

    if (leadsError) {
      console.error("[FOLLOWUP-REMINDERS] Error fetching leads:", leadsError);
      throw leadsError;
    }

    if (!staleLeads || staleLeads.length === 0) {
      console.log("[FOLLOWUP-REMINDERS] No stale leads found requiring reminders");
      return new Response(
        JSON.stringify({ message: "No reminders needed", count: 0 }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log(`[FOLLOWUP-REMINDERS] Found ${staleLeads.length} leads needing reminders`);

    // Group leads by provider (user_id)
    const providerLeadsMap = new Map<string, ProviderLeads>();

    for (const lead of staleLeads as LeadWithFacility[]) {
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
        providerData.leads.push(lead);
      }
    }

    let emailsSent = 0;
    let notificationsCreated = 0;
    const processedLeadIds: string[] = [];

    // Send reminder emails to each provider
    for (const [userId, providerData] of providerLeadsMap) {
      try {
        const leadCount = providerData.leads.length;
        const oldestLead = providerData.leads.reduce((oldest, lead) => 
          new Date(lead.created_at) < new Date(oldest.created_at) ? lead : oldest
        );
        const hoursWaiting = Math.round(
          (Date.now() - new Date(oldestLead.created_at).getTime()) / (1000 * 60 * 60)
        );

        // Build email HTML
        const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
  <div style="background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%); padding: 30px; border-radius: 12px 12px 0 0;">
    <h1 style="color: #fff; margin: 0; font-size: 24px;">⏰ Follow-up Reminder</h1>
    <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0 0;">You have leads waiting for a response</p>
  </div>
  
  <div style="background: #fff; border: 1px solid #e5e7eb; border-top: none; padding: 30px; border-radius: 0 0 12px 12px;">
    <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 20px; margin-bottom: 24px; text-align: center;">
      <p style="margin: 0 0 8px 0; font-size: 48px; font-weight: bold; color: #dc2626;">${leadCount}</p>
      <p style="margin: 0; color: #991b1b; font-size: 16px;">${leadCount === 1 ? 'lead is' : 'leads are'} waiting for follow-up</p>
    </div>
    
    <p style="color: #4b5563; font-size: 15px; margin-bottom: 16px;">
      Hi ${providerData.providerName},
    </p>
    
    <p style="color: #4b5563; font-size: 15px; margin-bottom: 24px;">
      You have <strong>${leadCount} ${leadCount === 1 ? 'lead' : 'leads'}</strong> for <strong>${providerData.facilityName}</strong> that ${leadCount === 1 ? 'has' : 'have'} been waiting for a response for over <strong>${hoursWaiting} hours</strong>. Quick follow-up dramatically increases conversion rates!
    </p>
    
    <div style="background: #f9fafb; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
      <h3 style="margin: 0 0 16px 0; font-size: 14px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px;">Leads Awaiting Response</h3>
      ${providerData.leads.slice(0, 5).map(lead => `
        <div style="border-bottom: 1px solid #e5e7eb; padding: 12px 0;">
          <p style="margin: 0; font-weight: 600; color: #111827;">${lead.name}</p>
          <p style="margin: 4px 0 0 0; font-size: 14px; color: #6b7280;">
            ${lead.phone} • ${lead.email}
          </p>
          <p style="margin: 4px 0 0 0; font-size: 13px; color: #9ca3af;">
            Submitted ${new Date(lead.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
          </p>
        </div>
      `).join('')}
      ${leadCount > 5 ? `<p style="margin: 12px 0 0 0; font-size: 14px; color: #6b7280;">+ ${leadCount - 5} more leads</p>` : ''}
    </div>
    
    <div style="background: #fef3c7; border: 1px solid #fcd34d; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
      <p style="margin: 0; font-size: 14px; color: #92400e;">
        <strong>💡 Pro tip:</strong> Studies show that responding within 5 minutes increases conversion rates by 400%. The sooner you reach out, the better!
      </p>
    </div>
    
    <div style="text-align: center; margin-top: 28px;">
      <a href="${supabaseUrl.replace('.supabase.co', '.lovable.app')}/provider/leads" style="display: inline-block; background: linear-gradient(135deg, #1B365D 0%, #2C4A7F 100%); color: #fff; padding: 16px 40px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px; box-shadow: 0 4px 14px rgba(27, 54, 93, 0.3);">
        📞 View & Contact Leads
      </a>
    </div>
    
    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 32px 0;">
    
    <p style="font-size: 13px; color: #9ca3af; text-align: center; margin: 0;">
      This is an automated reminder from <a href="https://rehablookup.com" style="color: #1B365D;">RehabLookup.com</a><br>
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
          subject: `⏰ ${leadCount} ${leadCount === 1 ? 'lead is' : 'leads are'} waiting for follow-up`,
          html: emailHtml,
        });

        emailsSent++;
        console.log(`[FOLLOWUP-REMINDERS] Email sent to ${providerData.providerEmail} for ${leadCount} leads`);

        // Create in-app notification
        await supabase
          .from("provider_notifications")
          .insert({
            user_id: userId,
            type: "follow_up_reminder",
            title: "Leads awaiting follow-up",
            message: `You have ${leadCount} ${leadCount === 1 ? 'lead' : 'leads'} that ${leadCount === 1 ? 'has' : 'have'} been waiting over 24 hours for a response.`,
            metadata: {
              lead_count: leadCount,
              lead_ids: providerData.leads.map(l => l.id),
            },
          });

        notificationsCreated++;

        // Mark leads as reminded
        for (const lead of providerData.leads) {
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
    console.log(`[FOLLOWUP-REMINDERS] Completed in ${duration}ms - Emails: ${emailsSent}, Notifications: ${notificationsCreated}, Leads processed: ${processedLeadIds.length}`);

    return new Response(
      JSON.stringify({
        success: true,
        emailsSent,
        notificationsCreated,
        leadsProcessed: processedLeadIds.length,
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
