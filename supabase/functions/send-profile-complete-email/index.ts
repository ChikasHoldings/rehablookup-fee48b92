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
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #1a1a1a; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); padding: 40px 32px; border-radius: 12px 12px 0 0; text-align: center;">
        <div style="font-size: 48px; margin-bottom: 16px;">🎉</div>
        <h1 style="color: white; margin: 0; font-size: 28px;">Congratulations!</h1>
        <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0 0; font-size: 16px;">Your profile is 100% complete</p>
      </div>
      
      <div style="background: #ffffff; padding: 32px; border: 1px solid #e2e8f0; border-top: none;">
        <p style="margin-top: 0; font-size: 16px;">Hi ${firstName},</p>
        
        <p style="font-size: 16px;">
          Great news! Your listing for <strong>${facilityName}</strong> is now fully optimized and ready to attract families seeking treatment.
        </p>
        
        <div style="background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%); border-radius: 12px; padding: 24px; margin: 24px 0; text-align: center;">
          <div style="display: inline-block; background: #22c55e; color: white; border-radius: 50%; width: 64px; height: 64px; line-height: 64px; font-weight: bold; font-size: 24px; margin-bottom: 16px;">
            100%
          </div>
          <h3 style="color: #166534; margin: 0 0 8px 0;">Profile Complete</h3>
          <p style="margin: 0; color: #15803d; font-size: 14px;">All checklist items completed</p>
        </div>
        
        <h3 style="color: #1B365D; margin-bottom: 12px;">What this means for you:</h3>
        <ul style="padding-left: 20px; margin: 0 0 24px 0;">
          <li style="margin-bottom: 8px; color: #4a5568;">
            <strong>Better visibility</strong> — Complete profiles rank higher in search results
          </li>
          <li style="margin-bottom: 8px; color: #4a5568;">
            <strong>More trust</strong> — Families are 3x more likely to contact facilities with complete profiles
          </li>
          <li style="margin-bottom: 8px; color: #4a5568;">
            <strong>Professional appearance</strong> — Your listing now showcases everything families need to know
          </li>
        </ul>
        
        <div style="text-align: center; margin: 32px 0;">
          <a href="${dashboardUrl}/listing" style="display: inline-block; background: #1B365D; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; margin-right: 12px;">
            View Your Listing
          </a>
        </div>
        
        <p style="color: #64748b; font-size: 14px; margin-bottom: 0;">
          Keep your listing up to date to maintain your advantage. You can always add more photos, update services, or enhance your description.
        </p>
      </div>
      
      <div style="background: #f8fafc; padding: 20px; border-radius: 0 0 12px 12px; border: 1px solid #e2e8f0; border-top: none; text-align: center;">
        <p style="margin: 0; color: #64748b; font-size: 12px;">
          You're receiving this because you completed your profile on RehabLookup.com.<br>
          <a href="${dashboardUrl}/settings" style="color: #1B365D;">Manage notification preferences</a>
        </p>
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

    // Fetch facility details
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

    // Check if we already sent a celebration email
    if (facility.profile_completion_celebrated) {
      console.log("[PROFILE-COMPLETE] Already celebrated, skipping");
      return new Response(
        JSON.stringify({ message: "Already celebrated" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch user profile
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

    // Check notification preferences
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
        subject: `🎉 Congratulations! Your ${facility.name} profile is complete`,
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

    // Mark as celebrated to prevent duplicate emails
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
