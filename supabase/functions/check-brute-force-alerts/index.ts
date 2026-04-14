import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { sendEmailWithRetry } from "../_shared/resilient-email-sender.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const ALERT_THRESHOLD = 10; // Failed attempts in the time window to trigger alert
const AUTO_BLOCK_THRESHOLD = 10; // Failed attempts to auto-block an IP
const TIME_WINDOW_HOURS = 1; // Time window to check
const BLOCK_DURATION_HOURS = 24; // How long to block auto-blocked IPs

// Check if string looks like an IP address
function isIPAddress(str: string): boolean {
  // IPv4 pattern
  const ipv4Pattern = /^(\d{1,3}\.){3}\d{1,3}$/;
  // IPv6 pattern (simplified)
  const ipv6Pattern = /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$|^::1$|^([0-9a-fA-F]{1,4}:)*::([0-9a-fA-F]{1,4}:)*[0-9a-fA-F]{1,4}$/;
  
  return ipv4Pattern.test(str) || ipv6Pattern.test(str);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  console.log("[CHECK-BRUTE-FORCE] Starting brute force detection");

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const timeWindowStart = new Date(Date.now() - TIME_WINDOW_HOURS * 60 * 60 * 1000).toISOString();

    // Find identifiers with excessive failed attempts
    const { data: suspiciousActivity, error: queryError } = await supabase
      .from("rate_limit_log")
      .select("identifier, action_type, metadata")
      .eq("success", false)
      .gte("created_at", timeWindowStart);

    if (queryError) {
      console.error("[CHECK-BRUTE-FORCE] Query error:", queryError);
      return new Response(
        JSON.stringify({ success: false, error: queryError.message }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Count attempts per identifier and collect IPs from metadata
    const attemptCounts: Record<string, { count: number; action_type: string; ips: Set<string> }> = {};
    const ipAttemptCounts: Record<string, number> = {};
    
    for (const record of suspiciousActivity || []) {
      const key = `${record.identifier}:${record.action_type}`;
      if (!attemptCounts[key]) {
        attemptCounts[key] = { count: 0, action_type: record.action_type, ips: new Set() };
      }
      attemptCounts[key].count++;
      
      // Track IP addresses separately for auto-blocking
      const metadata = record.metadata as Record<string, any> | null;
      if (metadata?.ip_address && isIPAddress(metadata.ip_address)) {
        attemptCounts[key].ips.add(metadata.ip_address);
        ipAttemptCounts[metadata.ip_address] = (ipAttemptCounts[metadata.ip_address] || 0) + 1;
      }
      
      // Also check if the identifier itself is an IP
      if (isIPAddress(record.identifier)) {
        ipAttemptCounts[record.identifier] = (ipAttemptCounts[record.identifier] || 0) + 1;
      }
    }

    // Auto-block IPs that exceed threshold
    const autoBlockedIPs: string[] = [];
    for (const [ip, count] of Object.entries(ipAttemptCounts)) {
      if (count >= AUTO_BLOCK_THRESHOLD) {
        // Check if already blocked
        const { data: existingBlock } = await supabase
          .from("blocked_identifiers")
          .select("id")
          .eq("identifier", ip)
          .eq("is_active", true)
          .maybeSingle();

        if (!existingBlock) {
          // Auto-block the IP
          const expiresAt = new Date(Date.now() + BLOCK_DURATION_HOURS * 60 * 60 * 1000).toISOString();
          
          const { error: blockError } = await supabase
            .from("blocked_identifiers")
            .insert({
              identifier: ip,
              identifier_type: "ip",
              reason: `Auto-blocked: ${count} failed login attempts detected within ${TIME_WINDOW_HOURS} hour(s)`,
              blocked_by: "00000000-0000-0000-0000-000000000000", // System UUID
              expires_at: expiresAt,
              is_active: true,
            });

          if (!blockError) {
            autoBlockedIPs.push(ip);
            console.log(`[CHECK-BRUTE-FORCE] Auto-blocked IP: ${ip} (${count} attempts)`);
          } else {
            console.error(`[CHECK-BRUTE-FORCE] Failed to auto-block IP ${ip}:`, blockError);
          }
        }
      }
    }

    // Filter for those exceeding alert threshold
    const alerts: Array<{ identifier: string; action_type: string; count: number }> = [];
    for (const [key, data] of Object.entries(attemptCounts)) {
      if (data.count >= ALERT_THRESHOLD) {
        const identifier = key.split(":")[0];
        alerts.push({ identifier, action_type: data.action_type, count: data.count });
      }
    }

    if (alerts.length === 0 && autoBlockedIPs.length === 0) {
      console.log("[CHECK-BRUTE-FORCE] No suspicious activity detected");
      return new Response(
        JSON.stringify({ success: true, alerts_sent: 0, auto_blocked: 0 }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log(`[CHECK-BRUTE-FORCE] Found ${alerts.length} suspicious identifiers, auto-blocked ${autoBlockedIPs.length} IPs`);

    // Check if we already sent an alert for these identifiers recently (prevent spam)
    const { data: recentAlerts } = await supabase
      .from("admin_notifications")
      .select("metadata")
      .eq("type", "brute_force_alert")
      .gte("created_at", timeWindowStart);

    const recentlyAlertedIdentifiers = new Set(
      (recentAlerts || [])
        .map((n) => (n.metadata as any)?.identifier)
        .filter(Boolean)
    );

    const newAlerts = alerts.filter((a) => !recentlyAlertedIdentifiers.has(a.identifier));

    // Create admin notifications for new alerts
    if (newAlerts.length > 0) {
      const notifications = newAlerts.map((alert) => ({
        type: "brute_force_alert",
        title: "Potential Brute Force Attack Detected",
        message: `${alert.count} failed ${alert.action_type} attempts from "${alert.identifier}" in the last hour.`,
        metadata: { 
          identifier: alert.identifier, 
          action_type: alert.action_type, 
          attempt_count: alert.count 
        },
      }));

      await supabase.from("admin_notifications").insert(notifications);
    }

    // Create notifications for auto-blocked IPs
    if (autoBlockedIPs.length > 0) {
      const blockNotifications = autoBlockedIPs.map((ip) => ({
        type: "security_auto_block",
        title: "IP Address Auto-Blocked",
        message: `IP "${ip}" was automatically blocked for ${BLOCK_DURATION_HOURS} hours due to excessive failed login attempts.`,
        metadata: { 
          identifier: ip, 
          identifier_type: "ip",
          block_duration_hours: BLOCK_DURATION_HOURS,
          auto_blocked: true
        },
      }));

      await supabase.from("admin_notifications").insert(blockNotifications);
    }

    // Send email alert if Resend is configured and there are new alerts or blocks
    if (resendApiKey && (newAlerts.length > 0 || autoBlockedIPs.length > 0)) {
      // Get admin users with security notifications enabled
      const { data: adminRoles } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "admin");

      if (adminRoles && adminRoles.length > 0) {
        // Get admin profiles with notification preferences
        const { data: adminProfiles } = await supabase
          .from("admin_user_profiles")
          .select("user_id, notify_security_events")
          .in("user_id", adminRoles.map(r => r.user_id));

        // Filter admins who have notify_security_events enabled (default true)
        const eligibleAdminIds = adminRoles
          .filter(role => {
            const profile = adminProfiles?.find(p => p.user_id === role.user_id);
            return !profile || profile.notify_security_events !== false;
          })
          .map(r => r.user_id);

        if (eligibleAdminIds.length > 0) {
          const adminEmails: string[] = [];
          for (const userId of eligibleAdminIds) {
            const { data: userData } = await supabase.auth.admin.getUserById(userId);
            if (userData?.user?.email) {
              adminEmails.push(userData.user.email);
            }
          }

          if (adminEmails.length > 0) {
            const resend = new Resend(resendApiKey);
            
            const alertSummary = newAlerts
              .map((a) => `• ${a.identifier}: ${a.count} failed ${a.action_type} attempts`)
              .join("\n");

            const blockSummary = autoBlockedIPs
              .map((ip) => `• ${ip} (blocked for ${BLOCK_DURATION_HOURS} hours)`)
              .join("\n");

            try {
              await sendEmailWithRetry(supabase, resend, {
                from: "RehabLookup Security <no-reply@rehablookup.com>",
                to: adminEmails,
                subject: `⚠️ Security Alert: ${autoBlockedIPs.length > 0 ? `${autoBlockedIPs.length} IP(s) Auto-Blocked` : "Brute Force Attack Detected"}`,
                html: `
                  <div style="font-family: system-ui, -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                    <div style="background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%); padding: 20px; border-radius: 8px 8px 0 0;">
                      <h1 style="color: white; margin: 0; font-size: 20px;">⚠️ Security Alert</h1>
                    </div>
                    <div style="background: #fef2f2; padding: 20px; border: 1px solid #fecaca; border-top: none; border-radius: 0 0 8px 8px;">
                      <p style="color: #991b1b; font-weight: 600; margin-top: 0;">Potential brute force attack detected on RehabLookup.</p>
                      
                      ${autoBlockedIPs.length > 0 ? `
                      <div style="background: #fef3c7; padding: 15px; border-radius: 6px; border: 1px solid #fcd34d; margin: 15px 0;">
                        <p style="color: #92400e; font-weight: 600; margin: 0 0 10px 0;">🛡️ Auto-Blocked IP Addresses:</p>
                        <pre style="margin: 0; white-space: pre-wrap; font-family: monospace; font-size: 14px; color: #78350f;">${blockSummary}</pre>
                        <p style="color: #92400e; font-size: 12px; margin: 10px 0 0 0;">These IPs have been automatically blocked for ${BLOCK_DURATION_HOURS} hours.</p>
                      </div>
                      ` : ''}
                      
                      ${newAlerts.length > 0 ? `
                      <p style="color: #7f1d1d;">The following identifiers have exceeded ${ALERT_THRESHOLD} failed login attempts in the last hour:</p>
                      <div style="background: white; padding: 15px; border-radius: 6px; border: 1px solid #fecaca; margin: 15px 0;">
                        <pre style="margin: 0; white-space: pre-wrap; font-family: monospace; font-size: 14px; color: #7f1d1d;">${alertSummary}</pre>
                      </div>
                      ` : ''}
                      
                      <p style="color: #7f1d1d; font-size: 14px;">
                        <strong>Actions Taken:</strong><br>
                        ${autoBlockedIPs.length > 0 ? `✓ ${autoBlockedIPs.length} IP address(es) auto-blocked for ${BLOCK_DURATION_HOURS} hours<br>` : ''}
                        ✓ Admin notifications created<br><br>
                        <strong>Recommended Follow-up:</strong><br>
                        1. Review the Security Logs page in the admin panel<br>
                        2. Verify no accounts were compromised<br>
                        3. Consider extending block duration if needed
                      </p>
                      <p style="color: #9ca3af; font-size: 12px; margin-bottom: 0; margin-top: 20px;">
                        This is an automated security alert from RehabLookup. You can manage notification preferences in your profile settings.
                      </p>
                    </div>
                  </div>
                `,
              });
              console.log(`[CHECK-BRUTE-FORCE] Email alert sent to ${adminEmails.length} admin(s)`);
            } catch (emailError) {
              console.error("[CHECK-BRUTE-FORCE] Failed to send email alert:", emailError);
            }
          }
        } else {
          console.log("[CHECK-BRUTE-FORCE] No admins have security notifications enabled");
        }
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        alerts_sent: newAlerts.length, 
        auto_blocked: autoBlockedIPs.length,
        auto_blocked_ips: autoBlockedIPs,
        alerts: newAlerts 
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error) {
    console.error("[CHECK-BRUTE-FORCE] Unexpected error:", error);
    return new Response(
      JSON.stringify({ success: false, error: "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
