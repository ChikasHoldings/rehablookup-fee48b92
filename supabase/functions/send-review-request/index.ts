import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const LOG_PREFIX = "[SEND-REVIEW-REQUEST]";

const logStep = (step: string, details?: unknown) => {
  console.log(`${LOG_PREFIX} ${step}${details ? ` - ${JSON.stringify(details)}` : ""}`);
};

interface ReviewRequestBody {
  facilityId: string;
  recipientName: string;
  recipientEmail: string;
}

Deno.serve(async (req) => {
  logStep("Function invoked", { method: req.method });

  if (req.method === "OPTIONS") {
    logStep("Handling CORS preflight");
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const resendApiKey = Deno.env.get("RESEND_API_KEY");

    logStep("Environment check", { 
      hasSupabaseUrl: !!supabaseUrl, 
      hasServiceKey: !!supabaseServiceKey,
      hasResendKey: !!resendApiKey 
    });

    if (!supabaseUrl || !supabaseServiceKey) {
      logStep("ERROR: Missing Supabase environment variables");
      return new Response(JSON.stringify({ error: "Server configuration error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!resendApiKey) {
      logStep("ERROR: Missing RESEND_API_KEY");
      return new Response(JSON.stringify({ error: "Email service not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const resend = new Resend(resendApiKey);
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const authHeader = req.headers.get("Authorization");
    logStep("Auth header check", { hasAuthHeader: !!authHeader });

    if (!authHeader) {
      logStep("ERROR: No authorization header");
      return new Response(JSON.stringify({ error: "No authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      logStep("ERROR: Auth failed", { error: authError?.message });
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    logStep("User authenticated", { userId: user.id, email: user.email });

    let body: ReviewRequestBody;
    try {
      body = await req.json();
    } catch (e) {
      logStep("ERROR: Invalid JSON body");
      return new Response(JSON.stringify({ error: "Invalid request body" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { facilityId, recipientName, recipientEmail } = body;
    logStep("Request parsed", { facilityId, recipientName, recipientEmail: recipientEmail?.substring(0, 3) + "***" });

    if (!facilityId || !recipientName || !recipientEmail) {
      logStep("ERROR: Missing required fields", { facilityId: !!facilityId, recipientName: !!recipientName, recipientEmail: !!recipientEmail });
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(recipientEmail)) {
      logStep("ERROR: Invalid email format");
      return new Response(JSON.stringify({ error: "Invalid email format" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: facility, error: facilityError } = await supabase
      .from("facilities")
      .select("id, name, city, state, slug, user_id")
      .eq("id", facilityId)
      .eq("user_id", user.id)
      .single();

    if (facilityError || !facility) {
      logStep("ERROR: Facility not found or unauthorized", { facilityError: facilityError?.message });
      return new Response(JSON.stringify({ error: "Facility not found or unauthorized" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    logStep("Facility verified", { facilityName: facility.name, slug: facility.slug });

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const { data: existingRequest } = await supabase
      .from("review_requests")
      .select("id, sent_at")
      .eq("facility_id", facilityId)
      .eq("recipient_email", recipientEmail.toLowerCase())
      .gte("sent_at", thirtyDaysAgo.toISOString())
      .limit(1);

    if (existingRequest && existingRequest.length > 0) {
      logStep("ERROR: Recent request already exists");
      return new Response(JSON.stringify({ 
        error: "A review request was already sent to this email within the last 30 days" 
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const baseUrl = "https://rehablookup.com";
    const reviewLink = `${baseUrl}/center/${facility.slug}?action=review`;
    logStep("Review link generated", { reviewLink });

    const { data: reviewRequest, error: insertError } = await supabase
      .from("review_requests")
      .insert({
        facility_id: facilityId,
        sender_user_id: user.id,
        recipient_name: recipientName,
        recipient_email: recipientEmail.toLowerCase(),
        status: "pending",
      })
      .select()
      .single();

    if (insertError) {
      logStep("ERROR: Failed to create review request record", { error: insertError.message });
      return new Response(JSON.stringify({ error: "Failed to create review request" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    logStep("Review request record created", { requestId: reviewRequest.id });

    try {
      const emailResponse = await resend.emails.send({
        from: "RehabLookup <no-reply@rehablookup.com>",
        to: [recipientEmail],
        subject: `${facility.name} would love to hear about your experience`,
        html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Share Your Experience</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f6f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; -webkit-font-smoothing: antialiased;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f6f9;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width: 560px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08);">
          
          <!-- Header -->
          <tr>
            <td style="background-color: #1B365D; background: #1B365D; padding: 36px 32px; text-align: center;">
              <div style="font-size: 40px; margin-bottom: 12px;">⭐</div>
              <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 700; letter-spacing: -0.5px; font-family: Arial, Helvetica, sans-serif;">
                Share Your Experience
              </h1>
            </td>
          </tr>
          
          <!-- Body -->
          <tr>
            <td style="padding: 36px 32px; background-color: #ffffff;">
              <p style="margin: 0 0 20px 0; font-size: 17px; color: #1f2937; line-height: 1.5;">
                Hi ${recipientName},
              </p>
              
              <p style="margin: 0 0 20px 0; font-size: 16px; color: #374151; line-height: 1.6;">
                We hope you're doing well! <strong style="color: #1f2937;">${facility.name}</strong> in ${facility.city}, ${facility.state} would love to hear about your experience.
              </p>
              
              <p style="margin: 0 0 28px 0; font-size: 16px; color: #374151; line-height: 1.6;">
                Your feedback helps others who are searching for the right care. Would you take a moment to leave a review?
              </p>
              
              <!-- CTA Button -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 28px;">
                <tr>
                  <td align="center">
                    <a href="${reviewLink}" style="display: inline-block; background-color: #1B365D; background: #1B365D; color: #ffffff; padding: 16px 36px; border-radius: 10px; text-decoration: none; font-weight: 600; font-size: 16px; font-family: Arial, Helvetica, sans-serif;">
                      Leave a Review
                    </a>
                  </td>
                </tr>
              </table>
              
              <p style="margin: 0; font-size: 14px; color: #6b7280; line-height: 1.6;">
                Your review will help others find the care they need. Thank you for taking the time to share your experience.
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #1B365D; padding: 24px 32px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding-bottom: 8px;">
                    <p style="margin: 0; font-size: 16px; font-weight: 700; color: #ffffff;">
                      RehabLookup
                    </p>
                  </td>
                </tr>
                <tr>
                  <td align="center">
                    <p style="margin: 0; font-size: 12px; color: rgba(255,255,255,0.6); line-height: 1.5;">
                      This email was sent by ${facility.name} via RehabLookup.<br>
                      If you believe you received this in error, you can safely ignore it.
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
        `,
      });

      logStep("Email API response", { response: JSON.stringify(emailResponse) });

      if (emailResponse.error) {
        logStep("ERROR: Email sending failed", { error: emailResponse.error });
        await supabase
          .from("review_requests")
          .update({ status: "failed" })
          .eq("id", reviewRequest.id);

        return new Response(JSON.stringify({ 
          error: `Failed to send email: ${emailResponse.error.message || 'Unknown error'}` 
        }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { error: updateError } = await supabase
        .from("review_requests")
        .update({
          status: "sent",
          sent_at: new Date().toISOString(),
          resend_id: emailResponse.data?.id || null,
        })
        .eq("id", reviewRequest.id);

      if (updateError) {
        logStep("WARNING: Failed to update review request status", { error: updateError.message });
      }

      logStep("Review request sent successfully", { requestId: reviewRequest.id, resendId: emailResponse.data?.id });

      return new Response(JSON.stringify({ 
        success: true, 
        message: "Review request sent successfully",
        requestId: reviewRequest.id 
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });

    } catch (emailError: any) {
      logStep("ERROR: Exception during email send", { error: emailError.message });
      
      await supabase
        .from("review_requests")
        .update({ status: "failed" })
        .eq("id", reviewRequest.id);

      return new Response(JSON.stringify({ error: `Email error: ${emailError.message}` }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

  } catch (error: any) {
    logStep("ERROR: Unhandled exception", { error: error.message, stack: error.stack });
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
