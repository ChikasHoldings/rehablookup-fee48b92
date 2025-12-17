import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ApprovalEmailRequest {
  facilityId: string;
  facilityName: string;
  userId: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendApiKey = Deno.env.get("RESEND_API_KEY");

    if (!resendApiKey) {
      console.error("RESEND_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "Email service not configured" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const body: ApprovalEmailRequest = await req.json();
    const { facilityId, facilityName, userId } = body;

    console.log("Sending approval email for facility:", { facilityId, facilityName, userId });

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("first_name, last_name, email")
      .eq("user_id", userId)
      .maybeSingle();

    if (profileError || !profile) {
      console.error("Profile not found:", profileError);
      return new Response(
        JSON.stringify({ error: "Provider profile not found" }),
        { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const { data: facility, error: facilityError } = await supabase
      .from("facilities")
      .select("slug, city, state")
      .eq("id", facilityId)
      .maybeSingle();

    if (facilityError) {
      console.error("Error fetching facility:", facilityError);
    }

    const profileUrl = facility?.slug 
      ? `https://rehablookup.com/center/${facility.slug}`
      : `https://rehablookup.com/rehab-centers`;

    const providerName = profile.first_name || "there";

    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Listing Approved</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f6f9; -webkit-font-smoothing: antialiased;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f6f9;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08);">
          
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); padding: 40px 32px; text-align: center;">
              <div style="font-size: 48px; margin-bottom: 16px;">✓</div>
              <h1 style="margin: 0; color: #ffffff; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; font-size: 26px; font-weight: 700;">
                You're Live on RehabLookup
              </h1>
            </td>
          </tr>
          
          <!-- Body -->
          <tr>
            <td style="padding: 40px 32px;">
              <p style="margin: 0 0 20px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; font-size: 17px; color: #1a1a1a; line-height: 1.6;">
                Hi ${providerName},
              </p>
              
              <p style="margin: 0 0 28px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; font-size: 16px; color: #4b5563; line-height: 1.7;">
                Your listing for <strong style="color: #1a1a1a;">${facilityName}</strong> has been approved. Families searching for treatment can now find and contact you directly.
              </p>
              
              <!-- Info Box -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background: #f0fdf4; border-radius: 12px; margin-bottom: 32px;">
                <tr>
                  <td style="padding: 24px;">
                    <p style="margin: 0 0 16px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; font-size: 15px; font-weight: 600; color: #166534;">
                      What happens next:
                    </p>
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding: 8px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; font-size: 15px; color: #166534; line-height: 1.6;">
                          • Your profile shows up in search results
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; font-size: 15px; color: #166534; line-height: 1.6;">
                          • New leads go straight to your dashboard
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; font-size: 15px; color: #166534; line-height: 1.6;">
                          • You get notified when someone reaches out
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              
              <!-- CTA Button -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 24px;">
                <tr>
                  <td align="center">
                    <a href="${profileUrl}" style="display: inline-block; background: #1B365D; color: #ffffff; padding: 16px 36px; border-radius: 10px; text-decoration: none; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; font-weight: 600; font-size: 16px;">
                      See Your Listing
                    </a>
                  </td>
                </tr>
              </table>
              
              <p style="margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; font-size: 15px; color: #64748b; text-align: center;">
                <a href="https://rehablookup.com/provider/dashboard" style="color: #1B365D; text-decoration: none; font-weight: 500;">Go to Dashboard</a>
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background: #1B365D; padding: 32px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding-bottom: 12px;">
                    <p style="margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; font-size: 20px; font-weight: 700; color: #ffffff;">
                      RehabLookup
                    </p>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding-bottom: 20px;">
                    <p style="margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; font-size: 14px; color: rgba(255,255,255,0.8);">
                      Connecting families with trusted treatment providers
                    </p>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding-bottom: 16px;">
                    <table role="presentation" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding: 0 12px;">
                          <a href="https://rehablookup.com" style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; font-size: 13px; color: #93c5fd; text-decoration: none;">Website</a>
                        </td>
                        <td style="color: rgba(255,255,255,0.3);">|</td>
                        <td style="padding: 0 12px;">
                          <a href="mailto:help@rehablookup.com" style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; font-size: 13px; color: #93c5fd; text-decoration: none;">Support</a>
                        </td>
                        <td style="color: rgba(255,255,255,0.3);">|</td>
                        <td style="padding: 0 12px;">
                          <a href="https://rehablookup.com/privacy-policy" style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; font-size: 13px; color: #93c5fd; text-decoration: none;">Privacy</a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td align="center">
                    <p style="margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; font-size: 12px; color: rgba(255,255,255,0.5);">
                      © ${new Date().getFullYear()} RehabLookup. All rights reserved.
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

    const resend = new Resend(resendApiKey);
    const emailResponse = await resend.emails.send({
      from: "RehabLookup <no-reply@rehablookup.com>",
      to: [profile.email],
      subject: `Your listing is live: ${facilityName}`,
      html: emailHtml,
    });

    console.log("Approval email sent:", emailResponse);

    const { error: notifError } = await supabase
      .from("provider_notifications")
      .insert({
        user_id: userId,
        facility_id: facilityId,
        type: "listing_approved",
        title: "Listing Approved",
        message: `Your listing for ${facilityName} is now live!`,
        metadata: { profile_url: profileUrl },
      });

    if (notifError) {
      console.error("Failed to create notification:", notifError);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Approval email sent to ${profile.email}` 
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );

  } catch (error: unknown) {
    console.error("Error in send-approval-email function:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
