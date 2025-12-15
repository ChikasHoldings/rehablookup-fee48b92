import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: unknown) => {
  console.log(`[NOTIFY-ADMIN-PROVIDER-SIGNUP] ${step}`, details ? JSON.stringify(details) : "");
};

interface SignupNotification {
  facilityId: string;
  facilityName: string;
  providerEmail: string;
  city: string;
  state: string;
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

    const { facilityId, facilityName, providerEmail, city, state }: SignupNotification = await req.json();
    logStep("Received notification request", { facilityId, facilityName, providerEmail });

    // Create in-app notification for admin
    const { error: notificationError } = await supabase
      .from("admin_notifications")
      .insert({
        type: "provider_signup",
        title: "New Provider Registration",
        message: `${facilityName} in ${city}, ${state} has signed up and requires verification.`,
        metadata: {
          facility_id: facilityId,
          facility_name: facilityName,
          provider_email: providerEmail,
          city,
          state,
        },
      });

    if (notificationError) {
      logStep("Error creating in-app notification", notificationError);
    } else {
      logStep("In-app notification created successfully");
    }

    // Send email notification to admin
    const adminEmail = "admin@rehablookup.com"; // Configure this as needed
    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #1B365D 0%, #2d4a7c 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 8px 8px; }
          .info-box { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #1B365D; }
          .button { display: inline-block; background: #1B365D; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 20px; }
          .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🏥 New Provider Registration</h1>
          </div>
          <div class="content">
            <p>A new treatment facility has registered and requires your verification:</p>
            <div class="info-box">
              <h3 style="margin-top: 0;">${facilityName}</h3>
              <p><strong>Location:</strong> ${city}, ${state}</p>
              <p><strong>Provider Email:</strong> ${providerEmail}</p>
              <p><strong>Registration Time:</strong> ${new Date().toLocaleString()}</p>
            </div>
            <p>Please review this provider's application and approve or reject their listing.</p>
            <a href="https://rehablookup.com/admin/providers" class="button">Review Provider</a>
          </div>
          <div class="footer">
            <p>RehabLookup Admin Notifications</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const { error: emailError } = await resend.emails.send({
      from: "RehabLookup <notifications@rehablookup.com>",
      to: [adminEmail],
      subject: `New Provider Registration: ${facilityName}`,
      html: emailHtml,
    });

    if (emailError) {
      logStep("Error sending admin email", emailError);
    } else {
      logStep("Admin email sent successfully");
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
