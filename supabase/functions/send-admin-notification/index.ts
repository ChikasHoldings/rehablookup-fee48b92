import { Resend } from "https://esm.sh/resend@2.0.0";
import { sendEmailWithRetry } from "../_shared/resilient-email-sender.ts";
import { requireAdmin, requireAdminCorsHeaders as corsHeaders } from "../_shared/require-admin.ts";

const logStep = (step: string, details?: unknown) => {
  console.log(`[SEND-ADMIN-NOTIFICATION] ${step}${details ? ` - ${JSON.stringify(details)}` : ""}`);
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    // Verify caller is an active admin (JWT + admin_user_profiles).
    const auth = await requireAdmin(req);
    if (!auth.ok) return auth.response;
    const { adminUserId, supabase: supabaseClient } = auth;
    const adminUser = { id: adminUserId };
    logStep("Admin verified", { adminId: adminUserId });

    const { 
      providerUserId, 
      facilityId,
      subject, 
      message, 
      sendEmail = true,
      sendInApp = true,
      providerEmail,
      providerName
    } = await req.json();

    if (!providerUserId) throw new Error("Provider user ID is required");
    if (!subject || !message) throw new Error("Subject and message are required");

    logStep("Processing notification", { providerUserId, sendEmail, sendInApp });

    // Send in-app notification
    if (sendInApp) {
      const { error: notifError } = await supabaseClient
        .from("provider_notifications")
        .insert({
          user_id: providerUserId,
          facility_id: facilityId || null,
          type: "admin_message",
          title: subject,
          message: message,
          metadata: {
            from_admin: adminUser.id,
            sent_at: new Date().toISOString(),
          },
        });

      if (notifError) {
        logStep("Failed to create in-app notification", { error: notifError.message });
      } else {
        logStep("In-app notification created");
      }
    }

    // Send email notification
    if (sendEmail && providerEmail) {
      const resendApiKey = Deno.env.get("RESEND_API_KEY");
      if (!resendApiKey) {
        logStep("RESEND_API_KEY not set, skipping email");
      } else {
        const resend = new Resend(resendApiKey);
        
        const emailResult = await sendEmailWithRetry(supabaseClient, resend, {
          from: "RehabLookup Admin <no-reply@rehablookup.com>",
          to: [providerEmail],
          subject: subject,
          html: `
            <!DOCTYPE html>
            <html>
              <head>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
              </head>
              <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #1a1a1a; margin: 0; padding: 0; background-color: #f6f8fb;">
                <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                  <div style="background-color: #1B365D; background: #1B365D; padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
                    <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-family: Arial, Helvetica, sans-serif;">Message from RehabLookup</h1>
                  </div>
                  <div style="background: #ffffff; padding: 30px; border-radius: 0 0 12px 12px; box-shadow: 0 4px 6px #0000001a;">
                    ${providerName ? `<p style="margin-bottom: 20px;">Hi ${providerName},</p>` : ""}
                    <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #1B365D;">
                      ${message.split('\n').map((line: string) => `<p style="margin: 0 0 10px 0;">${line}</p>`).join('')}
                    </div>
                    <p style="color: #666; font-size: 14px; margin-top: 30px;">
                      If you have any questions, please reply to this email or contact our support team.
                    </p>
                    <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
                    <p style="color: #999; font-size: 12px; text-align: center;">
                      This message was sent by the RehabLookup admin team.
                    </p>
                  </div>
                </div>
              </body>
            </html>
          `,
        }, {
          emailType: "admin_notification",
          idempotencyKey: `admin-msg-${adminUser.id}-${providerUserId}-${Date.now().toString(36)}`,
        });

        logStep("Email sent", { emailId: emailResult.data?.id });
      }
    }

    // Log admin action
    await supabaseClient.from("admin_audit_log").insert({
      admin_user_id: adminUser.id,
      action_type: "contact_provider",
      target_type: "provider",
      target_id: providerUserId,
      details: {
        subject,
        message_preview: message.substring(0, 100),
        sent_email: sendEmail,
        sent_in_app: sendInApp,
      },
    });

    return new Response(
      JSON.stringify({ success: true, message: "Notification sent successfully" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
