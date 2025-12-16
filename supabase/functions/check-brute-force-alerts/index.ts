import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ALERT_THRESHOLD = 10; // Failed attempts in the time window to trigger alert
const TIME_WINDOW_HOURS = 1; // Time window to check

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
      .select("identifier, action_type")
      .eq("success", false)
      .gte("created_at", timeWindowStart);

    if (queryError) {
      console.error("[CHECK-BRUTE-FORCE] Query error:", queryError);
      return new Response(
        JSON.stringify({ success: false, error: queryError.message }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Count attempts per identifier
    const attemptCounts: Record<string, { count: number; action_type: string }> = {};
    for (const record of suspiciousActivity || []) {
      const key = `${record.identifier}:${record.action_type}`;
      if (!attemptCounts[key]) {
        attemptCounts[key] = { count: 0, action_type: record.action_type };
      }
      attemptCounts[key].count++;
    }

    // Filter for those exceeding threshold
    const alerts: Array<{ identifier: string; action_type: string; count: number }> = [];
    for (const [key, data] of Object.entries(attemptCounts)) {
      if (data.count >= ALERT_THRESHOLD) {
        const identifier = key.split(":")[0];
        alerts.push({ identifier, action_type: data.action_type, count: data.count });
      }
    }

    if (alerts.length === 0) {
      console.log("[CHECK-BRUTE-FORCE] No suspicious activity detected");
      return new Response(
        JSON.stringify({ success: true, alerts_sent: 0 }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log(`[CHECK-BRUTE-FORCE] Found ${alerts.length} suspicious identifiers`);

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

    if (newAlerts.length === 0) {
      console.log("[CHECK-BRUTE-FORCE] All suspicious identifiers already alerted");
      return new Response(
        JSON.stringify({ success: true, alerts_sent: 0, already_alerted: alerts.length }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Create admin notifications for each alert
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

    // Send email alert if Resend is configured
    if (resendApiKey) {
      const resend = new Resend(resendApiKey);
      
      const alertSummary = newAlerts
        .map((a) => `• ${a.identifier}: ${a.count} failed ${a.action_type} attempts`)
        .join("\n");

      try {
        await resend.emails.send({
          from: "RehabLookup Security <no-reply@rehablookup.com>",
          to: ["admin@rehablookup.com"], // Update with actual admin email
          subject: `⚠️ Security Alert: Potential Brute Force Attack Detected`,
          html: `
            <div style="font-family: system-ui, -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <div style="background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%); padding: 20px; border-radius: 8px 8px 0 0;">
                <h1 style="color: white; margin: 0; font-size: 20px;">⚠️ Security Alert</h1>
              </div>
              <div style="background: #fef2f2; padding: 20px; border: 1px solid #fecaca; border-top: none; border-radius: 0 0 8px 8px;">
                <p style="color: #991b1b; font-weight: 600; margin-top: 0;">Potential brute force attack detected on RehabLookup.</p>
                <p style="color: #7f1d1d;">The following identifiers have exceeded ${ALERT_THRESHOLD} failed login attempts in the last hour:</p>
                <div style="background: white; padding: 15px; border-radius: 6px; border: 1px solid #fecaca; margin: 15px 0;">
                  <pre style="margin: 0; white-space: pre-wrap; font-family: monospace; font-size: 14px; color: #7f1d1d;">${alertSummary}</pre>
                </div>
                <p style="color: #7f1d1d; font-size: 14px;">
                  <strong>Recommended Actions:</strong><br>
                  1. Review the rate_limit_log table for more details<br>
                  2. Consider blocking suspicious IPs at the infrastructure level<br>
                  3. Verify no accounts were compromised
                </p>
                <p style="color: #9ca3af; font-size: 12px; margin-bottom: 0; margin-top: 20px;">
                  This is an automated security alert from RehabLookup.
                </p>
              </div>
            </div>
          `,
        });
        console.log("[CHECK-BRUTE-FORCE] Email alert sent successfully");
      } catch (emailError) {
        console.error("[CHECK-BRUTE-FORCE] Failed to send email alert:", emailError);
      }
    }

    return new Response(
      JSON.stringify({ success: true, alerts_sent: newAlerts.length, alerts: newAlerts }),
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