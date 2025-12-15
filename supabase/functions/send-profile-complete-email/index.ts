import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function generateCelebrationEmail(
  firstName: string,
  facilityName: string,
  dashboardUrl: string
): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f6f8fb;">
  <div style="background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.06);">
    <div style="background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); padding: 32px; text-align: center;">
      <div style="font-size: 40px; margin-bottom: 12px;">🎉</div>
      <h1 style="color: white; margin: 0; font-size: 22px; font-weight: 600;">Profile Complete!</h1>
    </div>
    
    <div style="padding: 32px;">
      <p style="margin: 0 0 16px 0; font-size: 15px;">Hi ${firstName},</p>
      
      <p style="margin: 0 0 16px 0; font-size: 15px;">
        Your listing for <strong>${facilityName}</strong> is now fully optimized. You're all set to attract families looking for treatment.
      </p>
      
      <div style="background: #f0fdf4; border-radius: 8px; padding: 20px; margin: 24px 0; text-align: center;">
        <div style="display: inline-block; background: #22c55e; color: white; border-radius: 50%; width: 56px; height: 56px; line-height: 56px; font-weight: bold; font-size: 20px; margin-bottom: 12px;">
          100%
        </div>
        <p style="margin: 0; color: #166534; font-weight: 600;">All checklist items done</p>
      </div>
      
      <p style="margin: 0 0 12px 0; font-size: 14px; font-weight: 600; color: #1B365D;">What this means:</p>
      <ul style="padding-left: 20px; margin: 0 0 24px 0; font-size: 14px; color: #4b5563;">
        <li style="margin-bottom: 6px;">Better visibility in search results</li>
        <li style="margin-bottom: 6px;">More trust from families (3x more likely to contact)</li>
        <li>Professional appearance that stands out</li>
      </ul>
      
      <div style="text-align: center; margin: 28px 0;">
        <a href="${dashboardUrl}/listing" style="display: inline-block; background: #1B365D; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 15px;">
          View Your Listing
        </a>
      </div>
      
      <p style="color: #64748b; font-size: 13px; margin: 0;">
        Keep your listing fresh by updating availability and adding new photos as needed.
      </p>
    </div>
    
    <div style="background: #f8fafc; padding: 20px 32px; border-top: 1px solid #e2e8f0;">
      <p style="margin: 0; font-size: 12px; color: #94a3b8; text-align: center;">
        RehabLookup | <a href="${dashboardUrl}/settings" style="color: #64748b;">Notification settings</a>
      </p>
    </div>
  </div>
</body>
</html>
  `;
}

const handler = async (req: Request): Promise<Response> => {
  console.log("[PROFILE-COMPLETE] Function started");

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { facilityId } = await req.json();

    if (!facilityId) {
      console.error("[PROFILE-COMPLETE] Missing facilityId");
      return new Response(
        JSON.stringify({ error: "Missing facilityId" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[PROFILE-COMPLETE] Processing facility: ${facilityId}`);

    const { data: facility, error: facilityError } = await supabase
      .from("facilities")
      .select("name, user_id, profile_completion_celebrated")
      .eq("id", facilityId)
      .single();

    if (facilityError || !facility) {
      console.error("[PROFILE-COMPLETE] Facility not found:", facilityError);
      return new Response(
        JSON.stringify({ error: "Facility not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (facility.profile_completion_celebrated) {
      console.log("[PROFILE-COMPLETE] Already celebrated, skipping");
      return new Response(
        JSON.stringify({ message: "Already celebrated" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("email, first_name")
      .eq("user_id", facility.user_id)
      .single();

    if (profileError || !profile?.email) {
      console.error("[PROFILE-COMPLETE] Profile not found:", profileError);
      return new Response(
        JSON.stringify({ error: "Profile not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: preferences } = await supabase
      .from("notification_preferences")
      .select("email_product_updates")
      .eq("user_id", facility.user_id)
      .maybeSingle();

    if (preferences?.email_product_updates === false) {
      console.log("[PROFILE-COMPLETE] User opted out of emails");
      return new Response(
        JSON.stringify({ message: "User opted out" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const dashboardUrl = Deno.env.get("DASHBOARD_URL") || "https://rehablookup.com/provider";

    const emailHtml = generateCelebrationEmail(
      profile.first_name || "there",
      facility.name,
      dashboardUrl
    );

    console.log(`[PROFILE-COMPLETE] Sending email to ${profile.email}`);

    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "RehabLookup <notifications@resend.dev>",
        to: [profile.email],
        subject: `Nice work! ${facility.name} profile is 100% complete`,
        html: emailHtml,
      }),
    });

    if (!emailResponse.ok) {
      const errorData = await emailResponse.text();
      console.error("[PROFILE-COMPLETE] Email error:", errorData);
      return new Response(
        JSON.stringify({ error: "Failed to send email" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    await supabase
      .from("facilities")
      .update({ profile_completion_celebrated: true })
      .eq("id", facilityId);

    console.log("[PROFILE-COMPLETE] Success");

    return new Response(
      JSON.stringify({ success: true, message: "Celebration email sent" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("[PROFILE-COMPLETE] Fatal error:", error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);
