import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2?target=denonext";
import { Resend } from "https://esm.sh/resend@2.0.0?target=denonext";
import { sendEmailWithRetry } from "../_shared/resilient-email-sender.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
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
  <title>Profile Complete</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f6f9; -webkit-font-smoothing: antialiased;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f6f9;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08);">
          
          <!-- Header -->
          <tr>
            <td style="background-color: #22c55e; background: #22c55e; padding: 40px 32px; text-align: center;">
              <div style="font-size: 48px; margin-bottom: 16px;">🎉</div>
              <h1 style="margin: 0; color: #ffffff; font-family: Arial, Helvetica, sans-serif; font-size: 26px; font-weight: 700;">
                Profile Complete!
              </h1>
            </td>
          </tr>
          
          <!-- Body -->
          <tr>
            <td style="padding: 40px 32px;">
              <p style="margin: 0 0 20px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; font-size: 17px; color: #1a1a1a; line-height: 1.6;">
                Hi ${firstName},
              </p>
              
              <p style="margin: 0 0 28px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; font-size: 16px; color: #4b5563; line-height: 1.7;">
                Your listing for <strong style="color: #1a1a1a;">${facilityName}</strong> is now fully optimized. You're all set to attract families looking for treatment.
              </p>
              
              <!-- 100% Badge -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background: #f0fdf4; border-radius: 12px; margin-bottom: 28px;">
                <tr>
                  <td align="center" style="padding: 28px;">
                    <div style="display: inline-block; background: #22c55e; color: #ffffff; border-radius: 50%; width: 64px; height: 64px; line-height: 64px; font-weight: 700; font-size: 22px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; margin-bottom: 12px;">
                      100%
                    </div>
                    <p style="margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; font-size: 16px; font-weight: 600; color: #166534;">
                      All checklist items done
                    </p>
                  </td>
                </tr>
              </table>
              
              <p style="margin: 0 0 16px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; font-size: 15px; font-weight: 600; color: #1B365D;">
                What this means:
              </p>
              
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 32px;">
                <tr>
                  <td style="padding: 8px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; font-size: 15px; color: #4b5563; line-height: 1.6;">
                    • Better visibility in search results
                  </td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; font-size: 15px; color: #4b5563; line-height: 1.6;">
                    • More trust from families (3x more likely to contact)
                  </td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; font-size: 15px; color: #4b5563; line-height: 1.6;">
                    • Professional appearance that stands out
                  </td>
                </tr>
              </table>
              
              <!-- CTA Button -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 28px;">
                <tr>
                  <td align="center">
                    <a href="${dashboardUrl}/listing" style="display: inline-block; background: #1B365D; color: #ffffff; padding: 16px 36px; border-radius: 10px; text-decoration: none; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; font-weight: 600; font-size: 16px;">
                      View Your Listing
                    </a>
                  </td>
                </tr>
              </table>
              
              <p style="margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; font-size: 14px; color: #64748b; line-height: 1.6;">
                Keep your listing fresh by updating availability and adding new photos as needed.
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #1B365D; background: #1B365D; padding: 28px 32px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding-bottom: 12px;">
                    <p style="margin: 0; font-family: Arial, Helvetica, sans-serif; font-size: 18px; font-weight: 700; color: #ffffff;">
                      RehabLookup
                    </p>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding-bottom: 16px;">
                    <p style="margin: 0; font-family: Arial, Helvetica, sans-serif; font-size: 13px; color: #cbd5e1;">
                      Connecting families with trusted treatment providers
                    </p>
                  </td>
                </tr>
                <tr>
                  <td align="center">
                    <p style="margin: 0; font-family: Arial, Helvetica, sans-serif; font-size: 12px; color: #94a3b8;">
                      <a href="${dashboardUrl}/settings" style="color: #93c5fd; text-decoration: none;">Notification settings</a>
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
}

Deno.serve(async (req: Request): Promise<Response> => {
  console.log("[PROFILE-COMPLETE] Function started");

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const resend = new Resend(RESEND_API_KEY);

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

    const dashboardUrl = "https://rehablookup.com/provider";

    const emailHtml = generateCelebrationEmail(
      profile.first_name || "there",
      facility.name,
      dashboardUrl
    );

    console.log(`[PROFILE-COMPLETE] Sending email to ${profile.email}`);

    const emailResult = await sendEmailWithRetry(supabase, resend, {
      from: "RehabLookup <no-reply@rehablookup.com>",
      to: [profile.email],
      subject: `Nice work! ${facility.name} profile is 100% complete`,
      html: emailHtml,
    }, {
      emailType: "profile_complete",
      idempotencyKey: `profile-complete-${facilityId}`,
    });

    if (!emailResult.success) {
      console.error("[PROFILE-COMPLETE] Email error:", emailResult.error);
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
});
