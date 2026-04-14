import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { sendEmailWithRetry } from "../_shared/resilient-email-sender.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: unknown) => {
  console.log(`[NOTIFY-PAYMENT-FAILED] ${step}`, details ? JSON.stringify(details) : "");
};

interface PaymentFailedNotification {
  userId: string;
  facilityId?: string;
  facilityName?: string;
  providerEmail: string;
  providerName: string;
  amount?: number;
  currency?: string;
  failureReason?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

    const {
      userId,
      facilityId,
      facilityName,
      providerEmail,
      providerName,
      amount,
      currency,
      failureReason,
    }: PaymentFailedNotification = await req.json();

    logStep("Received payment failure notification", { userId, facilityName, providerEmail });

    const { error: adminNotificationError } = await supabase
      .from("admin_notifications")
      .insert({
        type: "payment_failed",
        title: "Payment Failed",
        message: `${providerName} (${facilityName || "No facility"}) payment failed.${failureReason ? ` Reason: ${failureReason}` : ""}`,
        metadata: {
          user_id: userId,
          facility_id: facilityId,
          facility_name: facilityName,
          provider_email: providerEmail,
          provider_name: providerName,
          amount,
          currency,
          failure_reason: failureReason,
        },
      });

    if (adminNotificationError) {
      logStep("Error creating admin notification", adminNotificationError);
    } else {
      logStep("Admin in-app notification created");
    }

    if (userId) {
      const { error: providerNotificationError } = await supabase
        .from("provider_notifications")
        .insert({
          user_id: userId,
          facility_id: facilityId,
          type: "payment_failed",
          title: "Payment Failed",
          message: "Your payment could not be processed. Please update your payment method.",
          metadata: {
            amount,
            currency,
            failure_reason: failureReason,
          },
        });

      if (providerNotificationError) {
        logStep("Error creating provider notification", providerNotificationError);
      } else {
        logStep("Provider in-app notification created");
      }
    }

    // Admin email
    const adminEmail = "Support@rehablookup.com";
    const adminEmailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Payment Failed</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f6f9; -webkit-font-smoothing: antialiased;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f6f9;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08);">
          
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%); padding: 32px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; font-size: 22px; font-weight: 700;">
                Payment Failed
              </h1>
            </td>
          </tr>
          
          <!-- Body -->
          <tr>
            <td style="padding: 32px;">
              <!-- Alert Box -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background: #fef2f2; border-left: 4px solid #dc2626; border-radius: 0 8px 8px 0; margin-bottom: 24px;">
                <tr>
                  <td style="padding: 20px;">
                    <p style="margin: 0 0 8px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; font-size: 16px; font-weight: 600; color: #1a1a1a;">
                      ${providerName}
                    </p>
                    ${facilityName ? `<p style="margin: 0 0 6px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; font-size: 15px; color: #64748b;">${facilityName}</p>` : ""}
                    <p style="margin: 0 0 6px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; font-size: 15px; color: #64748b;">${providerEmail}</p>
                    ${amount ? `<p style="margin: 0 0 6px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; font-size: 15px; color: #64748b;">Amount: ${currency?.toUpperCase() || "USD"} ${(amount / 100).toFixed(2)}</p>` : ""}
                    ${failureReason ? `<p style="margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; font-size: 14px; color: #dc2626;">Reason: ${failureReason}</p>` : ""}
                  </td>
                </tr>
              </table>
              
              <p style="margin: 0 0 28px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; font-size: 15px; color: #64748b; line-height: 1.6;">
                The provider has been notified to update their payment method.
              </p>
              
              <!-- CTA Button -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <a href="https://rehablookup.com/admin/subscriptions" style="display: inline-block; background: #1B365D; color: #ffffff; padding: 14px 32px; border-radius: 10px; text-decoration: none; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; font-weight: 600; font-size: 15px;">
                      View Subscriptions
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background: #f8fafc; padding: 20px 32px; border-top: 1px solid #e2e8f0;">
              <p style="margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; font-size: 13px; color: #94a3b8; text-align: center;">
                RehabLookup Admin
              </p>
            </td>
          </tr>
          
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;

    const { error: adminEmailError } = await resend.emails.send({
      from: "RehabLookup <no-reply@rehablookup.com>",
      to: [adminEmail],
      subject: `Payment failed: ${providerName}`,
      html: adminEmailHtml,
    });

    if (adminEmailError) {
      logStep("Error sending admin email", adminEmailError);
    } else {
      logStep("Admin email sent successfully");
    }

    // Provider email
    const providerEmailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Payment Issue</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f6f9; -webkit-font-smoothing: antialiased;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f6f9;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08);">
          
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #1B365D 0%, #2C4A7F 100%); padding: 36px 32px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; font-size: 24px; font-weight: 700;">
                Payment Issue
              </h1>
            </td>
          </tr>
          
          <!-- Body -->
          <tr>
            <td style="padding: 40px 32px;">
              <p style="margin: 0 0 24px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; font-size: 17px; color: #1a1a1a; line-height: 1.6;">
                Hi ${providerName},
              </p>
              
              <!-- Alert Box -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background: #fef2f2; border-radius: 12px; margin-bottom: 24px;">
                <tr>
                  <td style="padding: 20px;">
                    <p style="margin: 0 0 8px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; font-size: 16px; font-weight: 600; color: #dc2626;">
                      Your payment could not be processed
                    </p>
                    <p style="margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; font-size: 15px; color: #64748b; line-height: 1.6;">
                      Please update your payment method to keep your listing active.${failureReason ? ` (${failureReason})` : ""}
                    </p>
                  </td>
                </tr>
              </table>
              
              <p style="margin: 0 0 32px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; font-size: 15px; color: #64748b; line-height: 1.7;">
                Without a valid payment method, your subscription may be paused and your listing may become inactive.
              </p>
              
              <!-- CTA Button -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 32px;">
                <tr>
                  <td align="center">
                    <a href="https://rehablookup.com/provider/billing" style="display: inline-block; background: #1B365D; color: #ffffff; padding: 16px 36px; border-radius: 10px; text-decoration: none; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; font-weight: 600; font-size: 16px;">
                      Update Payment Method
                    </a>
                  </td>
                </tr>
              </table>
              
              <p style="margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; font-size: 14px; color: #94a3b8; line-height: 1.6;">
                Questions? Contact us at <a href="mailto:Support@rehablookup.com" style="color: #1B365D; text-decoration: none; font-weight: 500;">Support@rehablookup.com</a> or visit our <a href="https://rehablookup.com/provider/help" style="color: #1B365D; text-decoration: none; font-weight: 500;">help center</a>.
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background: #1B365D; padding: 28px 32px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding-bottom: 12px;">
                    <p style="margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; font-size: 18px; font-weight: 700; color: #ffffff;">
                      RehabLookup
                    </p>
                  </td>
                </tr>
                <tr>
                  <td align="center">
                    <p style="margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; font-size: 13px; color: rgba(255,255,255,0.7);">
                      Connecting families with trusted treatment providers
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

    const { error: providerEmailError } = await resend.emails.send({
      from: "RehabLookup <no-reply@rehablookup.com>",
      to: [providerEmail],
      subject: "Action needed: Update your payment method",
      html: providerEmailHtml,
    });

    if (providerEmailError) {
      logStep("Error sending provider email", providerEmailError);
    } else {
      logStep("Provider email sent successfully");
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
