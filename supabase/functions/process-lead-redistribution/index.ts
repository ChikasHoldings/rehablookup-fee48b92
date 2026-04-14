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

// ============ EMAIL TEMPLATES ============
function getRedistributedLeadEmail(facilityName: string, leadName: string, dashboardUrl: string, discountPrice: string, locationHint: string | null, levelOfCare: string | null): string {
  const detailItems: string[] = [];
  if (locationHint) detailItems.push(`📍 Location: <strong>${locationHint}</strong>`);
  if (levelOfCare) detailItems.push(`🏥 Seeking: <strong>${levelOfCare.replace(/_/g, " ")}</strong>`);
  
  const detailsHtml = detailItems.length > 0 
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;margin-bottom:20px;">
        <tr><td style="padding:16px;">
          <p style="margin:0 0 8px 0;font-size:13px;font-weight:600;color:#1d4ed8;text-transform:uppercase;letter-spacing:0.5px;">Lead Details</p>
          ${detailItems.map(i => `<p style="margin:4px 0;font-size:14px;color:#1e40af;">${i}</p>`).join("")}
        </td></tr>
      </table>`
    : "";

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f5f5f5;-webkit-font-smoothing:antialiased;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:32px 16px;"><tr><td align="center">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
  <tr><td style="background:#059669;padding:32px;border-radius:12px 12px 0 0;text-align:center;">
    <div style="font-size:48px;margin-bottom:16px;">🔁</div>
    <p style="margin:0 0 8px 0;font-size:12px;color:rgba(255,255,255,0.8);text-transform:uppercase;letter-spacing:1px;">REHABLOOKUP — NEW OPPORTUNITY</p>
    <h1 style="margin:0;font-size:22px;color:#fff;font-family:Arial,sans-serif;font-weight:600;">New Lead Available in Your Area</h1>
    <p style="margin:8px 0 0 0;color:rgba(255,255,255,0.9);font-size:14px;">${facilityName}</p>
  </td></tr>
  <tr><td style="background:#fff;padding:32px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;border-left:1px solid #e5e7eb;border-right:1px solid #e5e7eb;">
    <p style="margin:0 0 20px 0;color:#374151;font-size:16px;line-height:1.6;">Hi ${facilityName} team,</p>
    <p style="margin:0 0 20px 0;color:#374151;font-size:15px;line-height:1.6;">
      A potential client, <strong>${leadName}</strong>, is actively looking for treatment in your area and hasn't connected with a provider yet. This lead is now available to a <strong>limited number of facilities</strong>.
    </p>
    ${detailsHtml}
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#ecfdf5;border:2px solid #10b981;border-radius:8px;margin-bottom:20px;">
      <tr><td style="padding:20px;text-align:center;">
        <p style="margin:0 0 4px 0;font-size:13px;color:#065f46;">🎯 Discounted unlock price</p>
        <p style="margin:0 0 8px 0;font-size:28px;font-weight:700;color:#047857;">${discountPrice}</p>
        <p style="margin:0;font-size:12px;color:#059669;">Only available to max 2 providers · First to unlock wins</p>
      </td></tr>
    </table>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fef3c7;border:1px solid #fbbf24;border-radius:8px;margin-bottom:20px;">
      <tr><td style="padding:14px 16px;">
        <p style="margin:0;font-size:13px;color:#92400e;line-height:1.5;">
          ⚠️ <strong>Limited availability</strong> — This lead is shared with at most one other provider. Act fast to be the first to connect.
        </p>
      </td></tr>
    </table>
    <div style="text-align:center;margin:24px 0;">
      <a href="${dashboardUrl}" style="display:inline-block;background:#059669;color:#fff;text-decoration:none;padding:14px 32px;border-radius:8px;font-weight:600;font-size:15px;">🔓 Unlock Discounted Lead Now</a>
    </div>
  </td></tr>
  <tr><td style="background:#1B365D;padding:24px 32px;border-radius:0 0 12px 12px;text-align:center;">
    <p style="margin:0 0 12px 0;color:#fff;font-size:14px;font-weight:600;">RehabLookup</p>
    <p style="margin:0;color:#94a3b8;font-size:11px;">© ${new Date().getFullYear()} RehabLookup. All rights reserved.</p>
    <a href="https://rehablookup.com/provider/settings" style="color:#93c5fd;text-decoration:none;font-size:11px;">Notification Settings</a>
  </td></tr>
</table></td></tr></table></body></html>`;
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
      .in("setting_key", ["exclusive_window_hours", "extended_window_hours", "max_redistribution_facilities", "redistributed_unlock_price"]);

    let exclusiveWindowHours = 24;
    let extendedWindowHours = 48;
    let maxRedistributionFacilities = 2;
    let redistributedPriceCents = 1500; // $15 default

    if (settings) {
      for (const setting of settings) {
        if (setting.setting_key === "exclusive_window_hours") {
          exclusiveWindowHours = (setting.setting_value as { value: number })?.value ?? 24;
        } else if (setting.setting_key === "extended_window_hours") {
          extendedWindowHours = (setting.setting_value as { value: number })?.value ?? 48;
        } else if (setting.setting_key === "max_redistribution_facilities") {
          maxRedistributionFacilities = Math.min((setting.setting_value as { value: number })?.value ?? 2, 5);
        } else if (setting.setting_key === "redistributed_unlock_price") {
          redistributedPriceCents = (setting.setting_value as { value: number })?.value ?? 1500;
        }
      }
    }

    const discountPrice = `$${(redistributedPriceCents / 100).toFixed(2)}`;

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
      // Also try to match by facility_type if lead has level_of_care
      let facilityQuery = supabase
        .from("facilities")
        .select("id, name, email, user_id, reply_email, reply_email_verified, facility_type, featured")
        .eq("state", leadState)
        .eq("status", "approved")
        .neq("suspended", true)
        .neq("id", lead.facility_id)
        .limit(maxRedistributionFacilities * 5); // Get more to filter and prioritize Pro

      const { data: nearbyFacilities } = await facilityQuery;

      if (!nearbyFacilities || nearbyFacilities.length === 0) {
        log("WARN", "No nearby facilities found for redistribution", { leadId: lead.id, state: leadState });
        continue;
      }

      // Score facilities by treatment relevance (level_of_care match)
      const scoredFacilities = nearbyFacilities.map(f => {
        let score = Math.random(); // Base randomness for fairness
        // Boost score for facilities with matching care type
        if (lead.level_of_care && f.facility_type) {
          const loc = (lead.level_of_care || "").toLowerCase();
          const ft = (f.facility_type || "").toLowerCase();
          if (
            (loc.includes("detox") && ft.includes("detox")) ||
            (loc.includes("residential") && (ft.includes("residential") || ft.includes("inpatient"))) ||
            (loc.includes("outpatient") && ft.includes("outpatient")) ||
            (loc.includes("sober") && ft.includes("sober")) ||
            (loc.includes("php") && ft.includes("partial")) ||
            (loc.includes("iop") && ft.includes("intensive"))
          ) {
            score += 10; // Strong treatment match
          }
        }
        return { ...f, score };
      });

      // Sort by score (highest first) and pick top N
      scoredFacilities.sort((a, b) => b.score - a.score);
      const selectedFacilities = scoredFacilities.slice(0, maxRedistributionFacilities);

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
            const locationHint = lead.location_city_state || null;
            const levelOfCare = lead.level_of_care || null;

            await resend.emails.send({
              from: "RehabLookup <no-reply@rehablookup.com>",
              to: email,
              subject: `🔁 New discounted lead in your area (${discountPrice}) — ${facility.name}`,
              html: getRedistributedLeadEmail(facility.name, maskLeadName(lead.name), dashboardUrl, discountPrice, locationHint, levelOfCare),
            });

            // Create in-app provider notification with FOMO signals
            await supabase.from("provider_notifications").insert({
              user_id: facility.user_id,
              facility_id: facility.id,
              type: "redistributed_lead",
              title: `🔁 New Lead Available — ${discountPrice}`,
              message: `${maskLeadName(lead.name)} is looking for treatment in your area. Discounted to ${discountPrice} — only available to max 2 providers. Act fast!`,
              link: "/provider/inquiries",
              metadata: {
                lead_id: lead.id,
                discount_price: discountPrice,
                is_redistributed: true,
                location: locationHint,
                level_of_care: levelOfCare,
              },
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

    // Notify admin of redistribution activity
    if (redistributedCount > 0 || expiredCount > 0) {
      try {
        await supabase.from("admin_notifications").insert({
          type: "lead_redistribution",
          title: "Lead Redistribution Summary",
          message: `${redistributedCount} lead(s) redistributed, ${expiredCount} lead(s) expired without unlock.`,
          metadata: { redistributedCount, notificationsSent, expiredCount },
        });
      } catch (e) {
        log("WARN", "Failed to create admin notification", { error: String(e) });
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
