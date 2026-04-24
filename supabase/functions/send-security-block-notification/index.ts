import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { sendEmailWithRetry } from "../_shared/resilient-email-sender.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface BlockNotificationRequest {
  identifier: string;
  identifier_type: "email" | "ip";
  reason?: string;
  expires_at?: string;
  blocked_by_name?: string;
  action?: "block" | "unblock";
  unblocked_by_name?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  console.log("[SEND-SECURITY-BLOCK-NOTIFICATION] Starting");

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendApiKey = Deno.env.get("RESEND_API_KEY");

    if (!resendApiKey) {
      console.log("[SEND-SECURITY-BLOCK-NOTIFICATION] RESEND_API_KEY not configured");
      return new Response(
        JSON.stringify({ success: false, error: "Email service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const resend = new Resend(resendApiKey);

    const body: BlockNotificationRequest = await req.json();
    const { identifier, identifier_type, reason, expires_at, blocked_by_name, action = "block", unblocked_by_name } = body;

    const isUnblock = action === "unblock";
    const typeLabel = identifier_type === "ip" ? "IP Address" : "Email Address";

    console.log(`[SEND-SECURITY-BLOCK-NOTIFICATION] Notifying about ${isUnblock ? "unblocked" : "blocked"} ${identifier_type}: ${identifier}`);

    if (isUnblock) {
      // Create admin notification for unblock
      await supabase.from("admin_notifications").insert({
        type: "security_unblock",
        title: `${identifier_type === "ip" ? "IP Address" : "Email"} Unblocked`,
        message: `${identifier} has been manually unblocked by ${unblocked_by_name || "Admin"}`,
        metadata: {
          identifier,
          identifier_type,
          unblocked_by_name,
        },
      });

      // Send unblock email notification
      try {
        await sendEmailWithRetry(supabase, resend, {
          from: "RehabLookup Security <no-reply@rehablookup.com>",
          to: ["Support@rehablookup.com"],
          subject: `🔓 Security: ${typeLabel} Unblocked - ${identifier}`,
          html: `
            <div style="font-family: system-ui, -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <div style="background-color: #059669; background: #059669; padding: 20px; border-radius: 8px 8px 0 0;">
                <h1 style="color: #ffffff; margin: 0; font-size: 20px; font-family: Arial, Helvetica, sans-serif;">🔓 Identifier Unblocked</h1>
              </div>
              <div style="background: #ffffff; padding: 20px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
                <p style="color: #374151; margin-top: 0;">A ${typeLabel.toLowerCase()} has been manually unblocked on RehabLookup.</p>
                
                <div style="background: #f0fdf4; padding: 15px; border-radius: 6px; border: 1px solid #bbf7d0; margin: 15px 0;">
                  <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                      <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Type:</td>
                      <td style="padding: 8px 0; color: #111827; font-weight: 500;">${typeLabel}</td>
                    </tr>
                    <tr>
                      <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Identifier:</td>
                      <td style="padding: 8px 0; color: #111827; font-weight: 500; font-family: monospace;">${identifier}</td>
                    </tr>
                    <tr>
                      <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Unblocked By:</td>
                      <td style="padding: 8px 0; color: #111827;">${unblocked_by_name || "Admin"}</td>
                    </tr>
                    <tr>
                      <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Unblocked At:</td>
                      <td style="padding: 8px 0; color: #111827;">${new Date().toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}</td>
                    </tr>
                  </table>
                </div>
                
                <p style="color: #6b7280; font-size: 14px; margin-bottom: 0;">
                  You can manage blocked identifiers from the <a href="https://rehablookup.com/admin/security-logs" style="color: #2563eb;">Security Logs</a> page in the admin panel.
                </p>
              </div>
              <p style="color: #9ca3af; font-size: 12px; text-align: center; margin-top: 20px;">
                This is an automated security notification from RehabLookup.
              </p>
            </div>
          `,
        }, {
          emailType: "security_block",
          idempotencyKey: `sec-unblock-${identifier_type}-${identifier}-${Date.now().toString(36)}`,
        });
        console.log("[SEND-SECURITY-BLOCK-NOTIFICATION] Unblock email sent successfully");
      } catch (emailError) {
        console.error("[SEND-SECURITY-BLOCK-NOTIFICATION] Unblock email error:", emailError);
      }
    } else {
      // Format expiry for block
      let expiryText = "Permanent";
      if (expires_at) {
        const expiryDate = new Date(expires_at);
        expiryText = expiryDate.toLocaleString("en-US", {
          dateStyle: "medium",
          timeStyle: "short",
        });
      }

      // Create admin notification for block
      await supabase.from("admin_notifications").insert({
        type: "security_block",
        title: `${identifier_type === "ip" ? "IP Address" : "Email"} Blocked`,
        message: `${identifier} has been blocked${reason ? `: ${reason}` : ""}. Expires: ${expiryText}`,
        metadata: {
          identifier,
          identifier_type,
          reason,
          expires_at,
          blocked_by_name,
        },
      });

      // Send block email notification
      const headerBgColor = identifier_type === "ip" ? "#dc2626" : "#f59e0b";

      try {
        await sendEmailWithRetry(supabase, resend, {
          from: "RehabLookup Security <no-reply@rehablookup.com>",
          to: ["Support@rehablookup.com"],
          subject: `🔒 Security: ${typeLabel} Blocked - ${identifier}`,
          html: `
            <div style="font-family: system-ui, -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <div style="background-color: ${headerBgColor}; background: ${headerBgColor}; padding: 20px; border-radius: 8px 8px 0 0;">
                <h1 style="color: #ffffff; margin: 0; font-size: 20px; font-family: Arial, Helvetica, sans-serif;">🔒 Identifier Blocked</h1>
              </div>
              <div style="background: #ffffff; padding: 20px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
                <p style="color: #374151; margin-top: 0;">A ${typeLabel.toLowerCase()} has been blocked on RehabLookup.</p>
                
                <div style="background: #f9fafb; padding: 15px; border-radius: 6px; border: 1px solid #e5e7eb; margin: 15px 0;">
                  <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                      <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Type:</td>
                      <td style="padding: 8px 0; color: #111827; font-weight: 500;">${typeLabel}</td>
                    </tr>
                    <tr>
                      <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Identifier:</td>
                      <td style="padding: 8px 0; color: #111827; font-weight: 500; font-family: monospace;">${identifier}</td>
                    </tr>
                    <tr>
                      <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Reason:</td>
                      <td style="padding: 8px 0; color: #111827;">${reason || "Security policy violation"}</td>
                    </tr>
                    <tr>
                      <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Expires:</td>
                      <td style="padding: 8px 0; color: #111827;">${expiryText}</td>
                    </tr>
                    <tr>
                      <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Blocked By:</td>
                      <td style="padding: 8px 0; color: #111827;">${blocked_by_name || "System"}</td>
                    </tr>
                    <tr>
                      <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Blocked At:</td>
                      <td style="padding: 8px 0; color: #111827;">${new Date().toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}</td>
                    </tr>
                  </table>
                </div>
                
                <p style="color: #6b7280; font-size: 14px; margin-bottom: 0;">
                  You can manage blocked identifiers from the <a href="https://rehablookup.com/admin/security-logs" style="color: #2563eb;">Security Logs</a> page in the admin panel.
                </p>
              </div>
              <p style="color: #9ca3af; font-size: 12px; text-align: center; margin-top: 20px;">
                This is an automated security notification from RehabLookup.
              </p>
            </div>
          `,
        }, { emailType: "security_block" });
        console.log("[SEND-SECURITY-BLOCK-NOTIFICATION] Block email sent successfully");
      } catch (emailError) {
        console.error("[SEND-SECURITY-BLOCK-NOTIFICATION] Block email error:", emailError);
      }
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[SEND-SECURITY-BLOCK-NOTIFICATION] Error:", error);
    return new Response(
      JSON.stringify({ success: false, error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
