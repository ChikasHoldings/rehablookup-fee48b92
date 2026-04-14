import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { sendEmailWithRetry } from "../_shared/resilient-email-sender.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[NOTIFY-FLAGGED-IMAGE] ${step}${detailsStr}`);
};

const REASON_LABELS: Record<string, string> = {
  inappropriate: "Inappropriate content",
  misleading: "Misleading or fake image",
  low_quality: "Low quality / unprofessional",
  copyright: "Copyright violation",
  other: "Other",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );
    const resend = new Resend(RESEND_API_KEY);

    const body = await req.json();
    
    // Support both new format (from report-image) and legacy format (from admin panel)
    const facility_id = body.facility_id || body.facilityId;
    const image_type = body.image_type || body.imageType;
    const reason = body.reason;
    const image_url = body.image_url;

    if (!facility_id) {
      return new Response(
        JSON.stringify({ error: "facility_id is required" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    logStep("Fetching facility and owner details", { facility_id });

    // Fetch facility with owner info
    const { data: facility, error: facilityError } = await supabaseClient
      .from("facilities")
      .select("id, name, user_id, city, state")
      .eq("id", facility_id)
      .single();

    if (facilityError || !facility) {
      logStep("Facility not found", { error: facilityError?.message });
      return new Response(
        JSON.stringify({ error: "Facility not found" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 404 }
      );
    }

    // Get owner's email from profiles
    const { data: profile, error: profileError } = await supabaseClient
      .from("profiles")
      .select("email, first_name")
      .eq("user_id", facility.user_id)
      .single();

    if (profileError || !profile?.email) {
      logStep("Owner profile/email not found", { error: profileError?.message });
      return new Response(
        JSON.stringify({ error: "Owner email not found" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 404 }
      );
    }

    const reasonBase = reason?.split(":")?.[0] || reason;
    const reasonLabel = REASON_LABELS[reasonBase] || reason || "Unspecified";
    const imageTypeLabel = image_type === "logo" ? "logo" : "gallery image";

    logStep("Sending notification email", { to: profile.email });

    const emailHtml = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f5; padding: 40px 20px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
        <tr><td style="background-color: #1B365D; padding: 32px 40px; text-align: center;">
          <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 600;">Image Flagged for Review</h1>
        </td></tr>
        <tr><td style="padding: 40px;">
          <p style="margin: 0 0 20px; color: #374151; font-size: 16px; line-height: 1.6;">Hello${profile.first_name ? ` ${profile.first_name}` : ''},</p>
          <p style="margin: 0 0 20px; color: #374151; font-size: 16px; line-height: 1.6;">We wanted to let you know that a ${imageTypeLabel} on your facility profile for <strong>${facility.name}</strong> has been flagged for review by a visitor.</p>
          <table width="100%" cellpadding="0" cellspacing="0" style="margin: 24px 0; background-color: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 4px;">
            <tr><td style="padding: 16px 20px;">
              <p style="margin: 0 0 8px; color: #92400e; font-size: 14px; font-weight: 600;">Reason for flag:</p>
              <p style="margin: 0; color: #92400e; font-size: 14px;">${reasonLabel}</p>
            </td></tr>
          </table>
          <p style="margin: 0 0 20px; color: #374151; font-size: 16px; line-height: 1.6;"><strong>What happens next?</strong></p>
          <ul style="margin: 0 0 24px; padding-left: 20px; color: #374151; font-size: 16px; line-height: 1.8;">
            <li>Our team will review the flagged image</li>
            <li>If the image violates our guidelines, we may remove it from your profile</li>
            <li>You can proactively update your images via your provider dashboard</li>
          </ul>
          <table width="100%" cellpadding="0" cellspacing="0" style="margin: 32px 0;">
            <tr><td align="center">
              <a href="https://rehablookup.com/provider/listing" style="display: inline-block; background-color: #1B365D; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-size: 16px; font-weight: 600;">Review Your Listing</a>
            </td></tr>
          </table>
          <p style="margin: 0; color: #6b7280; font-size: 14px; line-height: 1.6;">If you have any questions, contact <a href="mailto:Support@rehablookup.com" style="color: #1B365D;">Support@rehablookup.com</a>.</p>
        </td></tr>
        <tr><td style="background-color: #f9fafb; padding: 24px 40px; text-align: center; border-top: 1px solid #e5e7eb;">
          <p style="margin: 0; color: #9ca3af; font-size: 12px;">© ${new Date().getFullYear()} RehabLookup. All rights reserved.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

    const emailResult = await sendEmailWithRetry(supabaseClient, resend, {
      from: "RehabLookup <no-reply@rehablookup.com>",
      to: [profile.email],
      subject: `Image Flagged for Review - ${facility.name}`,
      html: emailHtml,
    }, {
      emailType: "flagged_image",
      idempotencyKey: `flagged-image-${facility_id}-${image_type}-${Date.now().toString(36)}`,
    });

    logStep("Email sent", { success: emailResult.success });

    // Create provider notification
    await supabaseClient.from("provider_notifications").insert({
      user_id: facility.user_id,
      facility_id: facility.id,
      title: "Image Flagged for Review",
      message: `Your ${imageTypeLabel} was flagged for: ${reasonLabel}`,
      type: "flagged_image",
      metadata: { image_type, reason, image_url },
    });

    logStep("Provider notification created");

    return new Response(
      JSON.stringify({ success: true, emailResult }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
