import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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

serve(async (req) => {
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
    const adminEmail = "admin@rehablookup.com";
    const adminEmailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f6f8fb;">
  <div style="background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.06);">
    <div style="background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%); padding: 24px; text-align: center;">
      <h1 style="color: #fff; margin: 0; font-size: 18px; font-weight: 600;">Payment Failed</h1>
    </div>
    
    <div style="padding: 28px;">
      <div style="background: #fef2f2; border-left: 3px solid #dc2626; padding: 16px; border-radius: 0 8px 8px 0; margin-bottom: 20px;">
        <p style="margin: 0 0 8px 0; font-weight: 600; font-size: 15px;">${providerName}</p>
        ${facilityName ? `<p style="margin: 0 0 4px 0; font-size: 14px; color: #64748b;">${facilityName}</p>` : ""}
        <p style="margin: 0 0 4px 0; font-size: 14px; color: #64748b;">${providerEmail}</p>
        ${amount ? `<p style="margin: 0 0 4px 0; font-size: 14px; color: #64748b;">Amount: ${currency?.toUpperCase() || "USD"} ${(amount / 100).toFixed(2)}</p>` : ""}
        ${failureReason ? `<p style="margin: 0; font-size: 13px; color: #dc2626;">Reason: ${failureReason}</p>` : ""}
      </div>
      
      <p style="margin: 0 0 20px 0; font-size: 14px; color: #64748b;">The provider has been notified to update their payment method.</p>
      
      <div style="text-align: center;">
        <a href="https://rehablookup.com/admin/subscriptions" style="display: inline-block; background: #1B365D; color: #fff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px;">View Subscriptions</a>
      </div>
    </div>
    
    <div style="background: #f8fafc; padding: 16px; border-top: 1px solid #e2e8f0;">
      <p style="margin: 0; font-size: 11px; color: #94a3b8; text-align: center;">RehabLookup Admin</p>
    </div>
  </div>
</body>
</html>
    `;

    const { error: adminEmailError } = await resend.emails.send({
      from: "RehabLookup <notifications@rehablookup.com>",
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
  <meta name="viewport" content="width=device-width, initial-scale=1">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f6f8fb;">
  <div style="background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.06);">
    <div style="background: linear-gradient(135deg, #1B365D 0%, #2C4A7F 100%); padding: 28px; text-align: center;">
      <h1 style="color: #fff; margin: 0; font-size: 20px; font-weight: 600;">Payment Issue</h1>
    </div>
    
    <div style="padding: 32px;">
      <p style="margin: 0 0 16px 0; font-size: 15px;">Hi ${providerName},</p>
      
      <div style="background: #fef2f2; border-radius: 8px; padding: 16px; margin-bottom: 20px;">
        <p style="margin: 0 0 8px 0; font-weight: 600; color: #dc2626;">Your payment could not be processed</p>
        <p style="margin: 0; font-size: 14px; color: #64748b;">
          Please update your payment method to keep your listing active.
          ${failureReason ? ` (${failureReason})` : ""}
        </p>
      </div>
      
      <p style="margin: 0 0 24px 0; font-size: 14px; color: #64748b;">
        Without a valid payment method, your subscription may be paused and your listing may become inactive.
      </p>
      
      <div style="text-align: center; margin-bottom: 24px;">
        <a href="https://rehablookup.com/provider/billing" style="display: inline-block; background: #1B365D; color: #fff; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 15px;">Update Payment Method</a>
      </div>
      
      <p style="margin: 0; font-size: 13px; color: #94a3b8;">
        Questions? Reply to this email or visit our <a href="https://rehablookup.com/provider/help" style="color: #1B365D;">help center</a>.
      </p>
    </div>
    
    <div style="background: #f8fafc; padding: 16px; border-top: 1px solid #e2e8f0;">
      <p style="margin: 0; font-size: 11px; color: #94a3b8; text-align: center;">RehabLookup</p>
    </div>
  </div>
</body>
</html>
    `;

    const { error: providerEmailError } = await resend.emails.send({
      from: "RehabLookup <billing@rehablookup.com>",
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
