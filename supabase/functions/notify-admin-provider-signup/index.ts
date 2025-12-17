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
      logStep("Error creating in-app notification", notificationError);
    } else {
      logStep("In-app notification created successfully");
    }

    // Get admin users with notify_new_providers enabled
    const { data: adminRoles } = await supabase
      .from("user_roles")
      .select("user_id")
      .eq("role", "admin");

    if (!adminRoles || adminRoles.length === 0) {
      logStep("No admin users found");
      return new Response(JSON.stringify({ success: true }), {
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
      logStep("No admins have new provider notifications enabled");
      return new Response(JSON.stringify({ success: true }), {
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
      logStep("No admin emails found for eligible admins");
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    logStep("Sending email to admins with notifications enabled", { count: adminEmails.length });

    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f6f8fb;">
  <div style="background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.06);">
    <div style="background: linear-gradient(135deg, #1B365D 0%, #2C4A7F 100%); padding: 24px; text-align: center;">
      <h1 style="color: #fff; margin: 0; font-size: 18px; font-weight: 600;">New Provider Registration</h1>
    </div>
    
    <div style="padding: 28px;">
      <p style="margin: 0 0 20px 0; font-size: 15px;">A new facility signed up and needs review:</p>
      
      <div style="background: #f8fafc; border-left: 3px solid #1B365D; padding: 16px; border-radius: 0 8px 8px 0; margin-bottom: 24px;">
        <p style="margin: 0 0 8px 0; font-weight: 600; font-size: 16px; color: #1B365D;">${facilityName}</p>
        <p style="margin: 0 0 4px 0; font-size: 14px; color: #64748b;">${city}, ${state}</p>
        <p style="margin: 0; font-size: 14px; color: #64748b;">${providerEmail}</p>
      </div>
      
      <div style="text-align: center;">
        <a href="https://rehablookup.com/admin/providers" style="display: inline-block; background: #1B365D; color: #fff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px;">Review Now</a>
      </div>
    </div>
    
    <div style="background: #1B365D; padding: 20px; border-radius: 0 0 12px 12px;">
      <p style="margin: 0 0 8px 0; font-size: 14px; font-weight: 600; color: #fff; text-align: center;">RehabLookup Admin</p>
      <p style="margin: 0; font-size: 11px; color: rgba(255,255,255,0.6); text-align: center;">You can manage notification preferences in your profile settings</p>
    </div>
  </div>
</body>
</html>
    `;

    const { error: emailError } = await resend.emails.send({
      from: "RehabLookup <no-reply@rehablookup.com>",
      to: adminEmails,
      subject: `New provider: ${facilityName}`,
      html: emailHtml,
    });

    if (emailError) {
      logStep("Error sending admin email", emailError);
    } else {
      logStep("Admin email sent successfully", { recipients: adminEmails.length });
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
