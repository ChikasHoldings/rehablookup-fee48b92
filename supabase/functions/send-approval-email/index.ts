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
  <meta name="viewport" content="width=device-width, initial-scale=1">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f6f8fb;">
  <div style="background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.06);">
    <div style="background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); padding: 32px; text-align: center;">
      <div style="font-size: 40px; margin-bottom: 12px;">✓</div>
      <h1 style="color: #fff; margin: 0; font-size: 22px; font-weight: 600;">You're Live on RehabLookup</h1>
    </div>
    
    <div style="padding: 32px;">
      <p style="margin: 0 0 16px 0; font-size: 15px;">Hi ${providerName},</p>
      
      <p style="margin: 0 0 16px 0; font-size: 15px;">Your listing for <strong>${facilityName}</strong> has been approved. Families searching for treatment can now find and contact you directly.</p>
      
      <div style="background: #f0fdf4; border-radius: 8px; padding: 16px; margin: 24px 0;">
        <p style="margin: 0 0 8px 0; font-weight: 600; color: #166534; font-size: 14px;">What happens next:</p>
        <ul style="margin: 0; padding-left: 18px; color: #166534; font-size: 14px;">
          <li style="margin-bottom: 4px;">Your profile shows up in search results</li>
          <li style="margin-bottom: 4px;">New leads go straight to your dashboard</li>
          <li>You get notified when someone reaches out</li>
        </ul>
      </div>
      
      <div style="text-align: center; margin: 28px 0;">
        <a href="${profileUrl}" style="display: inline-block; background: #1B365D; color: #fff; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 15px;">See Your Listing</a>
      </div>
      
      <p style="margin: 0; font-size: 14px; color: #64748b; text-align: center;">
        <a href="https://rehablookup.com/provider/dashboard" style="color: #1B365D;">Go to Dashboard</a>
      </p>
    </div>
    
    <div style="background: #1B365D; padding: 28px 32px; border-top: 1px solid #e2e8f0;">
      <p style="margin: 0 0 12px 0; font-size: 16px; font-weight: 600; color: #fff; text-align: center;">RehabLookup</p>
      <p style="margin: 0 0 16px 0; font-size: 12px; color: rgba(255,255,255,0.7); text-align: center;">Connecting families with trusted treatment providers</p>
      <div style="text-align: center; margin-bottom: 16px;">
        <a href="https://rehablookup.com" style="color: #93c5fd; font-size: 12px; text-decoration: none; margin: 0 8px;">Website</a>
        <span style="color: rgba(255,255,255,0.3);">|</span>
        <a href="mailto:support@rehablookup.com" style="color: #93c5fd; font-size: 12px; text-decoration: none; margin: 0 8px;">Support</a>
        <span style="color: rgba(255,255,255,0.3);">|</span>
        <a href="https://rehablookup.com/privacy-policy" style="color: #93c5fd; font-size: 12px; text-decoration: none; margin: 0 8px;">Privacy</a>
      </div>
      <p style="margin: 0; font-size: 11px; color: rgba(255,255,255,0.5); text-align: center;">© ${new Date().getFullYear()} RehabLookup. All rights reserved.</p>
    </div>
  </div>
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
