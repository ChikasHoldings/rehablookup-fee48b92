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

    // Create in-app notification for admin
    const { error: adminNotificationError } = await supabase
      .from("admin_notifications")
      .insert({
        type: "payment_failed",
        title: "Subscription Payment Failed",
        message: `Payment failed for ${providerName} (${facilityName || "No facility"}).${failureReason ? ` Reason: ${failureReason}` : ""}`,
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

    // Create in-app notification for provider
    if (userId) {
      const { error: providerNotificationError } = await supabase
        .from("provider_notifications")
        .insert({
          user_id: userId,
          facility_id: facilityId,
          type: "payment_failed",
          title: "Payment Failed",
          message: "Your subscription payment could not be processed. Please update your payment method to avoid service interruption.",
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

    // Send email to admin
    const adminEmail = "admin@rehablookup.com";
    const adminEmailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 8px 8px; }
          .info-box { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #dc2626; }
          .button { display: inline-block; background: #1B365D; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 20px; }
          .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>⚠️ Payment Failed</h1>
          </div>
          <div class="content">
            <p>A subscription payment has failed for one of your providers:</p>
            <div class="info-box">
              <h3 style="margin-top: 0;">${providerName}</h3>
              ${facilityName ? `<p><strong>Facility:</strong> ${facilityName}</p>` : ""}
              <p><strong>Email:</strong> ${providerEmail}</p>
              ${amount ? `<p><strong>Amount:</strong> ${currency?.toUpperCase() || "USD"} ${(amount / 100).toFixed(2)}</p>` : ""}
              ${failureReason ? `<p><strong>Failure Reason:</strong> ${failureReason}</p>` : ""}
              <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
            </div>
            <p>The provider has been notified via email to update their payment method.</p>
            <a href="https://rehablookup.com/admin/subscriptions" class="button">View Subscriptions</a>
          </div>
          <div class="footer">
            <p>RehabLookup Admin Notifications</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const { error: adminEmailError } = await resend.emails.send({
      from: "RehabLookup <notifications@rehablookup.com>",
      to: [adminEmail],
      subject: `Payment Failed: ${providerName}`,
      html: adminEmailHtml,
    });

    if (adminEmailError) {
      logStep("Error sending admin email", adminEmailError);
    } else {
      logStep("Admin email sent successfully");
    }

    // Send email to provider
    const providerEmailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #1B365D 0%, #2d4a7c 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 8px 8px; }
          .warning-box { background: #fef2f2; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #dc2626; }
          .button { display: inline-block; background: #1B365D; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 20px; }
          .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Payment Issue</h1>
          </div>
          <div class="content">
            <p>Hi ${providerName},</p>
            <div class="warning-box">
              <h3 style="margin-top: 0; color: #dc2626;">⚠️ Your payment could not be processed</h3>
              <p>We were unable to process your subscription payment. To avoid any interruption to your service, please update your payment method as soon as possible.</p>
              ${failureReason ? `<p><strong>Reason:</strong> ${failureReason}</p>` : ""}
            </div>
            <p>If your payment method is not updated, your subscription may be suspended and your facility listing may become inactive.</p>
            <a href="https://rehablookup.com/provider/billing" class="button">Update Payment Method</a>
            <p style="margin-top: 30px;">If you believe this is an error or need assistance, please contact our support team.</p>
          </div>
          <div class="footer">
            <p>RehabLookup - Connecting People with Treatment</p>
            <p><a href="https://rehablookup.com/provider/help">Get Help</a></p>
          </div>
        </div>
      </body>
      </html>
    `;

    const { error: providerEmailError } = await resend.emails.send({
      from: "RehabLookup <billing@rehablookup.com>",
      to: [providerEmail],
      subject: "Action Required: Payment Failed for Your RehabLookup Subscription",
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
