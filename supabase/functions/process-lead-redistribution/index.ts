import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const VERSION = "1.0.1";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ============ LOGGING ============
const log = (level: "INFO" | "WARN" | "ERROR", message: string, details?: unknown) => {
  const timestamp = new Date().toISOString();
  const detailsStr = details ? ` | ${JSON.stringify(details)}` : "";
  console.log(`[${timestamp}] [process-lead-redistribution] [${level}] ${message}${detailsStr}`);
};

// ============ EMAIL TEMPLATE ============
function getNewLeadNotificationEmail(facilityName: string, leadName: string, dashboardUrl: string): string {
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
              <div style="font-size: 48px; margin-bottom: 16px;">🔔</div>
              <p style="margin: 0 0 8px 0; font-size: 12px; color: #ffffff; font-family: Arial, Helvetica, sans-serif; text-transform: uppercase; letter-spacing: 1px;">REHABLOOKUP</p>
              <h1 style="margin: 0; font-size: 24px; color: #ffffff; font-family: Arial, Helvetica, sans-serif; font-weight: 600;">New Lead Available</h1>
              <p style="margin: 8px 0 0 0; color: #ffffff; font-family: Arial, Helvetica, sans-serif; font-size: 14px;">${facilityName}</p>
            </td>
          </tr>
          <tr>
            <td style="background: #ffffff; padding: 32px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; border-left: 1px solid #e5e7eb; border-right: 1px solid #e5e7eb;">
              <p style="margin: 0 0 20px 0; color: #374151; font-size: 16px; line-height: 1.6;">
                Hi ${facilityName} team,
              </p>
              <p style="margin: 0 0 24px 0; color: #374151; font-size: 15px; line-height: 1.6;">
                A new potential client, <strong>${leadName}</strong>, is looking for treatment services in your area. They've submitted an inquiry and are waiting to connect.
              </p>
              
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background: #f0fdf4; border: 1px solid #86efac; border-radius: 8px; margin-bottom: 24px;">
                <tr>
                  <td style="padding: 20px;">
                    <p style="margin: 0; font-size: 14px; color: #166534; line-height: 1.5;">
                      💡 <strong>Quick Tip:</strong> Families often reach out to multiple facilities. Be the first to respond and increase your chances of helping them!
                    </p>
                  </td>
                </tr>
              </table>
              
              <div style="text-align: center;">
                <a href="${dashboardUrl}" style="display: inline-block; background: #1B365D; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 15px;">
                  View Lead Details
                </a>
              </div>
            </td>
          </tr>
          <tr>
            <td style="background-color: #1B365D; background: #1B365D; padding: 24px 32px; border-radius: 0 0 12px 12px; text-align: center;">
              <p style="margin: 0 0 12px 0; color: #ffffff; font-family: Arial, Helvetica, sans-serif; font-size: 14px; font-weight: 600;">RehabLookup</p>
              <p style="margin: 0; color: #94a3b8; font-family: Arial, Helvetica, sans-serif; font-size: 11px;">
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

  // POST-only enforcement
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    log("INFO", "Starting lead redistribution processing");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const now = new Date();
    const dashboardUrl = "https://rehablookup.com/provider/inquiries";

    // Get platform settings
    const { data: settings } = await supabase
      .from("platform_settings")
      .select("setting_key, setting_value")
      .in("setting_key", ["exclusive_window_hours", "extended_window_hours", "max_redistribution_facilities"]);

    let exclusiveWindowHours = 24;
    let extendedWindowHours = 48;
    let maxRedistributionFacilities = 2; // Max 2 providers per spec

    if (settings) {
      for (const setting of settings) {
        if (setting.setting_key === "exclusive_window_hours") {
          exclusiveWindowHours = (setting.setting_value as { value: number })?.value ?? 24;
        } else if (setting.setting_key === "extended_window_hours") {
          extendedWindowHours = (setting.setting_value as { value: number })?.value ?? 48;
        } else if (setting.setting_key === "max_redistribution_facilities") {
          maxRedistributionFacilities = (setting.setting_value as { value: number })?.value ?? 3;
        }
      }
    }

    // Find leads where exclusive window has expired
    const { data: expiredExclusiveLeads } = await supabase
      .from("leads")
      .select(`
        id, name, facility_id, state, level_of_care, insurance_type, location_city_state,
        facilities!facility_id (id, state, city)
      `)
      .eq("redistribution_status", "exclusive")
      .lt("exclusive_until", now.toISOString());

    let redistributedCount = 0;
    let notificationsSent = 0;

    for (const lead of expiredExclusiveLeads || []) {
      // Check if lead was unlocked by original facility
      const { data: existingUnlock } = await supabase
        .from("lead_unlocks")
        .select("id")
        .eq("lead_id", lead.id)
        .eq("facility_id", lead.facility_id)
        .maybeSingle();

      if (existingUnlock) {
        // Lead was unlocked, mark as no longer needing redistribution
        log("INFO", "Lead already unlocked, skipping redistribution", { leadId: lead.id });
        continue;
      }

      // Get lead's state from facility or location - improved parsing
      let leadState = (lead.facilities as { state?: string })?.state;
      
      if (!leadState && lead.location_city_state) {
        // Handle multiple formats: "City, State", "City, ST", "City ST"
        const locationParts = lead.location_city_state.split(/[,\s]+/).filter(Boolean);
        if (locationParts.length >= 2) {
          // Last part is likely the state
          const potentialState = locationParts[locationParts.length - 1].trim().toUpperCase();
          // Validate it looks like a state (2 chars or common state names)
          if (potentialState.length === 2 || potentialState.length <= 15) {
            leadState = potentialState;
          }
        }
      }

      if (!leadState) {
        log("WARN", "Could not determine lead state for redistribution", { 
          leadId: lead.id, 
          locationCityState: lead.location_city_state 
        });
        continue;
      }

      // Find nearby facilities in same state (excluding original)
      const { data: nearbyFacilities } = await supabase
        .from("facilities")
        .select("id, name, email, user_id, reply_email, reply_email_verified")
        .eq("state", leadState)
        .eq("status", "approved")
        .neq("suspended", true)
        .neq("id", lead.facility_id)
        .limit(maxRedistributionFacilities * 2); // Get more to filter

      if (!nearbyFacilities || nearbyFacilities.length === 0) {
        log("WARN", "No nearby facilities found for redistribution", { leadId: lead.id, state: leadState });
        continue;
      }

      // Shuffle and pick up to max facilities
      const shuffled = nearbyFacilities.sort(() => Math.random() - 0.5);
      const selectedFacilities = shuffled.slice(0, maxRedistributionFacilities);

      // Calculate extended_until
      const extendedUntil = new Date(now.getTime() + extendedWindowHours * 60 * 60 * 1000);

      // Create distribution records
      for (const facility of selectedFacilities) {
        // Check if distribution already exists
        const { data: existingDist } = await supabase
          .from("lead_distributions")
          .select("id")
          .eq("lead_id", lead.id)
          .eq("facility_id", facility.id)
          .maybeSingle();

        if (existingDist) continue;

        // Create distribution record
        const { error: distError } = await supabase
          .from("lead_distributions")
          .insert({
            lead_id: lead.id,
            facility_id: facility.id,
            is_original: false,
            distributed_at: now.toISOString(),
            notification_sent: false,
          });

        if (distError) {
          log("WARN", "Failed to create distribution record", { leadId: lead.id, facilityId: facility.id, error: distError.message });
          continue;
        }

        // Send notification email
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
              subject: `New lead available in your area - ${facility.name}`,
              html: getNewLeadNotificationEmail(facility.name, maskLeadName(lead.name), dashboardUrl),
            });

            // Create in-app provider notification for redistributed lead
            await supabase.from("provider_notifications").insert({
              user_id: facility.user_id,
              facility_id: facility.id,
              type: "new_lead",
              title: "New Lead Available",
              message: `A new lead (${maskLeadName(lead.name)}) is available for ${facility.name}.`,
              link: "/provider/inquiries",
            });

            // Mark notification as sent
            await supabase
              .from("lead_distributions")
              .update({ 
                notification_sent: true,
                notification_sent_at: now.toISOString()
              })
              .eq("lead_id", lead.id)
              .eq("facility_id", facility.id);

            notificationsSent++;
            log("INFO", "Redistribution notification sent", { leadId: lead.id, facilityId: facility.id, email });
          } catch (e) {
            log("WARN", "Failed to send redistribution notification", { leadId: lead.id, facilityId: facility.id, error: String(e) });
          }
        }
      }

      // Update lead status to extended
      await supabase
        .from("leads")
        .update({
          redistribution_status: "extended",
          extended_until: extendedUntil.toISOString(),
        })
        .eq("id", lead.id);

      redistributedCount++;
      log("INFO", "Lead redistributed", { leadId: lead.id, facilitiesCount: selectedFacilities.length });
    }

    // Handle expired extended leads (mark as expired)
    const { data: expiredExtendedLeads } = await supabase
      .from("leads")
      .select("id")
      .eq("redistribution_status", "extended")
      .lt("extended_until", now.toISOString());

    let expiredCount = 0;
    for (const lead of expiredExtendedLeads || []) {
      // Check if any facility unlocked this lead
      const { data: anyUnlock } = await supabase
        .from("lead_unlocks")
        .select("id")
        .eq("lead_id", lead.id)
        .maybeSingle();

      if (!anyUnlock) {
        await supabase
          .from("leads")
          .update({ redistribution_status: "expired" })
          .eq("id", lead.id);
        expiredCount++;
      }
    }

    log("INFO", "Lead redistribution processing complete", { 
      redistributedCount, 
      notificationsSent,
      expiredCount 
    });

    return new Response(
      JSON.stringify({ 
        success: true, 
        redistributed: redistributedCount,
        notificationsSent,
        expired: expiredCount
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    log("ERROR", "Unhandled error", { error: error instanceof Error ? error.message : String(error) });
    return new Response(
      JSON.stringify({ success: false, error: "Failed to process lead redistribution" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
