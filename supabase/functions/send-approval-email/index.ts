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

    // Use service role for database operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get provider profile to get their email
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

    // Get facility details including slug
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

    const providerName = profile.first_name || "Provider";

    // Build HTML email
    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.7; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
  <div style="background: #fff; border-radius: 12px; padding: 40px; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
    <div style="text-align: center; margin-bottom: 32px;">
      <div style="display: inline-block; background: #22c55e; border-radius: 50%; padding: 16px; margin-bottom: 16px;">
        <span style="font-size: 32px;">✓</span>
      </div>
      <h1 style="margin: 0; color: #1B365D; font-size: 24px;">Your Listing is Now Live!</h1>
    </div>
    
    <p style="margin: 0 0 16px 0;">Hi ${providerName},</p>
    
    <p style="margin: 0 0 16px 0;">Great news! Your facility listing for <strong>${facilityName}</strong> has been reviewed and approved. Your profile is now live and visible to families searching for treatment options on RehabLookup.</p>
    
    <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 20px; margin: 24px 0;">
      <h3 style="margin: 0 0 12px 0; color: #166534; font-size: 16px;">What This Means:</h3>
      <ul style="margin: 0; padding-left: 20px; color: #166534;">
        <li style="margin-bottom: 8px;">Your facility appears in search results</li>
        <li style="margin-bottom: 8px;">Families can view your profile and contact you</li>
        <li style="margin-bottom: 8px;">You'll receive leads directly in your dashboard</li>
      </ul>
    </div>
    
    <p style="margin: 0 0 24px 0;">View your live profile and start receiving inquiries today:</p>
    
    <div style="text-align: center; margin: 32px 0;">
      <a href="${profileUrl}" style="display: inline-block; background: #1B365D; color: #fff; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600;">View Your Live Listing</a>
    </div>
    
    <div style="text-align: center; margin: 24px 0;">
      <a href="https://rehablookup.com/provider/dashboard" style="color: #1B365D; text-decoration: underline;">Go to Provider Dashboard →</a>
    </div>
    
    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 32px 0;">
    
    <p style="margin: 0 0 16px 0; color: #6b7280; font-size: 14px;"><strong>Tips for Success:</strong></p>
    <ul style="margin: 0 0 16px 0; padding-left: 20px; color: #6b7280; font-size: 14px;">
      <li style="margin-bottom: 8px;">Keep your listing up-to-date with current services and availability</li>
      <li style="margin-bottom: 8px;">Respond promptly to leads for the best outcomes</li>
      <li style="margin-bottom: 8px;">Add photos to make your listing stand out</li>
    </ul>
    
    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 32px 0;">
    
    <p style="font-size: 12px; color: #9ca3af; margin: 0; text-align: center;">
      This email was sent by <a href="https://rehablookup.com" style="color: #1B365D;">RehabLookup</a>.<br>
      Questions? Contact us at support@rehablookup.com
    </p>
  </div>
</body>
</html>
    `;

    // Send email via Resend
    const resend = new Resend(resendApiKey);
    const emailResponse = await resend.emails.send({
      from: "RehabLookup <noreply@resend.dev>",
      to: [profile.email],
      subject: `🎉 Your Listing is Live: ${facilityName}`,
      html: emailHtml,
    });

    console.log("Approval email sent:", emailResponse);

    // Create a notification in the database
    const { error: notifError } = await supabase
      .from("provider_notifications")
      .insert({
        user_id: userId,
        facility_id: facilityId,
        type: "listing_approved",
        title: "Listing Approved",
        message: `Your listing for ${facilityName} has been approved and is now live!`,
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
