import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2?target=denonext";
import { Resend } from "https://esm.sh/resend@2.0.0?target=denonext";
import { z } from "https://esm.sh/zod@3.23.8?target=denonext";
import { sendEmailWithRetry } from "../_shared/resilient-email-sender.ts";
import { createLogger } from "../_shared/structured-logger.ts";

const SignupNotificationSchema = z.object({
  facilityId: z.string().uuid({ message: "facilityId must be a valid UUID" }),
  facilityName: z.string().trim().min(1).max(255),
  providerEmail: z.string().trim().email().max(255),
  city: z.string().trim().min(1).max(120),
  state: z.string().trim().min(1).max(120),
});

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type SignupNotification = z.infer<typeof SignupNotificationSchema>;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // POST-only enforcement
  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed", code: "method_not_allowed", allowed: ["POST"] }),
      {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json", Allow: "POST, OPTIONS" },
      },
    );
  }


  const log = createLogger("notify-admin-provider-signup");
  const { shortId } = log;

  try {
    log.info("started", { code: "request_received" });

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

    let rawBody: unknown;
    try {
      rawBody = await req.json();
    } catch (_e) {
      log.warn("invalid_json_body", { code: "invalid_json", reason: "Body is not valid JSON" });
      return new Response(
        JSON.stringify({ error: "Invalid JSON body", code: "invalid_json", shortId }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const parsed = SignupNotificationSchema.safeParse(rawBody);
    if (!parsed.success) {
      const fieldErrors = parsed.error.flatten().fieldErrors;
      log.warn("validation_failed", {
        code: "validation_error",
        reason: "Request payload failed schema validation",
        fieldErrors,
      });
      return new Response(
        JSON.stringify({
          error: "Invalid request payload",
          code: "validation_error",
          shortId,
          fieldErrors,
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { facilityId, facilityName, providerEmail, city, state }: SignupNotification = parsed.data;
    log.info("payload_validated", {
      code: "payload_ok",
      facilityId,
      facilityName,
      providerEmail,
    });

    const { error: notificationError } = await supabase
      .from("admin_notifications")
      .insert({
        type: "provider_signup",
        title: "New Provider",
        message: `${facilityName} in ${city}, ${state} needs verification.`,
        metadata: {
          facility_id: facilityId,
          facility_name: facilityName,
          provider_email: providerEmail,
          city,
          state,
        },
      });

    if (notificationError) {
      log.error("admin_notification_insert_failed", {
        code: "in_app_notification_failed",
        reason: notificationError.message ?? "Insert into admin_notifications failed",
        facilityId,
      });
    } else {
      log.info("admin_notification_created", { code: "in_app_notification_ok", facilityId });
    }

    // Get admin users with notify_new_providers enabled
    const { data: adminRoles } = await supabase
      .from("user_roles")
      .select("user_id")
      .eq("role", "admin");

    if (!adminRoles || adminRoles.length === 0) {
      log.warn("no_admin_users", {
        code: "no_admins_found",
        reason: "No users have role=admin",
        facilityId,
      });
      return new Response(JSON.stringify({ success: true, shortId, code: "no_admins_found" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get admin profiles with notification preferences
    const { data: adminProfiles } = await supabase
      .from("admin_user_profiles")
      .select("user_id, notify_new_providers")
      .in("user_id", adminRoles.map(r => r.user_id));

    // Filter admins who have notify_new_providers enabled (default true if not set)
    const eligibleAdminIds = adminRoles
      .filter(role => {
        const profile = adminProfiles?.find(p => p.user_id === role.user_id);
        // Default to true if no profile or preference not explicitly set to false
        return !profile || profile.notify_new_providers !== false;
      })
      .map(r => r.user_id);

    if (eligibleAdminIds.length === 0) {
      log.info("no_eligible_admins", {
        code: "all_admins_opted_out",
        reason: "All admins have notify_new_providers=false",
        facilityId,
      });
      return new Response(JSON.stringify({ success: true, shortId, code: "all_admins_opted_out" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get admin emails
    const adminEmails: string[] = [];
    for (const userId of eligibleAdminIds) {
      const { data: userData } = await supabase.auth.admin.getUserById(userId);
      if (userData?.user?.email) {
        adminEmails.push(userData.user.email);
      }
    }

    if (adminEmails.length === 0) {
      log.warn("no_admin_emails_resolved", {
        code: "admin_emails_missing",
        reason: "Eligible admins exist but auth.users lookup returned no emails",
        eligibleAdminCount: eligibleAdminIds.length,
        facilityId,
      });
      return new Response(JSON.stringify({ success: true, shortId, code: "admin_emails_missing" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    log.info("sending_admin_email", {
      code: "email_dispatch_started",
      recipientCount: adminEmails.length,
      facilityId,
    });

    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New Provider Registration</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f6f9; -webkit-font-smoothing: antialiased;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f6f9;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08);">
          
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #1B365D 0%, #2C4A7F 100%); padding: 32px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; font-size: 22px; font-weight: 700;">
                New Provider Registration
              </h1>
            </td>
          </tr>
          
          <!-- Body -->
          <tr>
            <td style="padding: 32px;">
              <p style="margin: 0 0 24px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; font-size: 16px; color: #4b5563; line-height: 1.6;">
                A new facility signed up and needs review:
              </p>
              
              <!-- Provider Info Box -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background: #f8fafc; border-left: 4px solid #1B365D; border-radius: 0 12px 12px 0; margin-bottom: 28px;">
                <tr>
                  <td style="padding: 20px;">
                    <p style="margin: 0 0 8px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; font-size: 18px; font-weight: 600; color: #1B365D;">
                      ${facilityName}
                    </p>
                    <p style="margin: 0 0 6px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; font-size: 15px; color: #64748b;">
                      ${city}, ${state}
                    </p>
                    <p style="margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; font-size: 15px; color: #64748b;">
                      ${providerEmail}
                    </p>
                  </td>
                </tr>
              </table>
              
              <!-- CTA Button -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <a href="https://rehablookup.com/admin/providers" style="display: inline-block; background: #1B365D; color: #ffffff; padding: 14px 32px; border-radius: 10px; text-decoration: none; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; font-weight: 600; font-size: 15px;">
                      Review Now
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background: #1B365D; padding: 24px 32px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding-bottom: 10px;">
                    <p style="margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; font-size: 16px; font-weight: 700; color: #ffffff;">
                      RehabLookup Admin
                    </p>
                  </td>
                </tr>
                <tr>
                  <td align="center">
                    <p style="margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; font-size: 12px; color: rgba(255,255,255,0.6);">
                      You can manage notification preferences in your <a href="https://rehablookup.com/admin/profile" style="color: #93c5fd; text-decoration: none;">profile settings</a>
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;

    const result = await sendEmailWithRetry(supabase, resend, {
      from: "RehabLookup <no-reply@rehablookup.com>",
      to: adminEmails,
      subject: `New provider: ${facilityName}`,
      html: emailHtml,
    }, {
      emailType: "admin_provider_signup",
      idempotencyKey: `admin-signup-${facilityId}`,
      checkSuppression: false,
      metadata: { facilityId, facilityName },
    });

    if (!result.success && !result.deduplicated) {
      log.error("admin_email_send_failed", {
        code: "email_send_failed",
        reason: typeof result.error === "string" ? result.error : (result.error as { message?: string } | undefined)?.message ?? "Unknown send error",
        recipients: adminEmails.length,
        deadLettered: result.deadLettered ?? false,
        facilityId,
      });
    } else {
      log.info("admin_email_sent", {
        code: result.deduplicated ? "email_deduplicated" : "email_sent",
        recipients: adminEmails.length,
        deduplicated: result.deduplicated ?? false,
        facilityId,
      });
    }

    return new Response(
      JSON.stringify({ success: true, shortId, code: result.deduplicated ? "email_deduplicated" : "email_sent" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    log.error("unhandled_exception", {
      code: "internal_error",
      reason: errorMessage,
      stack: error instanceof Error ? error.stack : undefined,
    });
    return new Response(
      JSON.stringify({ error: errorMessage, code: "internal_error", shortId }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
