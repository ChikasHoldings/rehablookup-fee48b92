import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { sendEmailWithRetry } from "../_shared/resilient-email-sender.ts";

const VERSION = "2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface LeadConfirmationRequest {
  leadFirstName: string;
  leadEmail: string;
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // POST-only enforcement
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    console.log(`[SEND-LEAD-CONFIRMATION v${VERSION}] Function started`);

    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (!resendKey) {
      throw new Error("RESEND_API_KEY not configured");
    }

    // Authenticate: only service_role or authenticated users can trigger
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Check if this is a service_role call (from other edge functions)
    const token = authHeader.replace("Bearer ", "");
    const isServiceRole = token === supabaseServiceKey;
    
    if (!isServiceRole) {
      // Verify as authenticated user
      const anonClient = createClient(supabaseUrl, supabaseAnonKey);
      const { data: { user }, error: authError } = await anonClient.auth.getUser(token);
      if (authError || !user) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Body size limit
    const rawBody = await req.text();
    if (rawBody.length > 10000) {
      return new Response(JSON.stringify({ error: "Request too large" }), {
        status: 413,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let body: LeadConfirmationRequest;
    try {
      body = JSON.parse(rawBody);
    } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Input validation
    const leadFirstName = (body.leadFirstName || "").toString().trim().replace(/[<>]/g, "").slice(0, 100);
    const leadEmail = (body.leadEmail || "").toString().trim().toLowerCase().slice(0, 254);

    if (!leadFirstName) {
      return new Response(JSON.stringify({ error: "leadFirstName is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!leadEmail || !emailRegex.test(leadEmail)) {
      return new Response(JSON.stringify({ error: "Valid leadEmail is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Rate limit: max 3 confirmation emails to same address per hour
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count } = await supabase
      .from("email_tracking_events")
      .select("*", { count: "exact", head: true })
      .eq("recipient_email", leadEmail)
      .eq("email_type", "lead_confirmation")
      .gte("created_at", oneHourAgo);

    if (count && count >= 3) {
      console.log(`[SEND-LEAD-CONFIRMATION v${VERSION}] Rate limit: ${leadEmail}`);
      return new Response(JSON.stringify({ success: true, skipped: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[SEND-LEAD-CONFIRMATION v${VERSION}] Sending to: ${leadEmail.substring(0, 3)}***`);

    const resend = new Resend(resendKey);
    const emailHtml = getConfirmationEmailHtml(leadFirstName);

    const result = await sendEmailWithRetry(supabase, resend, {
      from: "RehabLookup <no-reply@rehablookup.com>",
      to: [leadEmail],
      subject: "We've received your request",
      html: emailHtml,
    }, {
      emailType: "lead_confirmation",
      idempotencyKey: `lead-confirm-${leadEmail}-${Date.now().toString(36)}`,
      metadata: { leadFirstName },
    });

    if (!result.success) {
      console.error(`[SEND-LEAD-CONFIRMATION v${VERSION}] Failed:`, result.error, { deadLettered: result.deadLettered, attempts: result.attempts });
      return new Response(JSON.stringify({ error: result.error }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[SEND-LEAD-CONFIRMATION v${VERSION}] Email sent successfully (attempts: ${result.attempts})`);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[SEND-LEAD-CONFIRMATION v${VERSION}] ERROR:`, errorMessage);
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function getConfirmationEmailHtml(leadFirstName: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Request Received</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f6f9; -webkit-font-smoothing: antialiased;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f6f9;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08);">
          <tr>
            <td style="background-color: #1B365D; padding: 40px 32px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-family: Arial, Helvetica, sans-serif; font-size: 26px; font-weight: 700; line-height: 1.3;">
                We've received your request
              </h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px 32px;">
              <p style="margin: 0 0 24px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; font-size: 17px; color: #1a1a1a; line-height: 1.6;">
                Hi ${leadFirstName},
              </p>
              <p style="margin: 0 0 20px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; font-size: 16px; color: #4b5563; line-height: 1.7;">
                Thank you for reaching out to RehabLookup.
              </p>
              <p style="margin: 0 0 20px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; font-size: 16px; color: #4b5563; line-height: 1.7;">
                Your request for information has been received and successfully reviewed. Based on what you shared, your request has been forwarded to a treatment provider that matches your needs and location.
              </p>
              <p style="margin: 0 0 32px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; font-size: 16px; color: #4b5563; line-height: 1.7;">
                There's no obligation at any point. If a provider reaches out, you're free to ask questions, take your time, and decide what feels right for you or your loved one.
              </p>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background: #f8fafc; border-radius: 12px; margin-bottom: 32px;">
                <tr>
                  <td style="padding: 24px;">
                    <p style="margin: 0 0 16px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; font-size: 16px; font-weight: 600; color: #1B365D;">
                      What to expect next
                    </p>
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                      <tr><td style="padding: 8px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; font-size: 15px; color: #4b5563; line-height: 1.6;">• A treatment provider may contact you using your preferred method</td></tr>
                      <tr><td style="padding: 8px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; font-size: 15px; color: #4b5563; line-height: 1.6;">• You can learn more about available options and next steps</td></tr>
                      <tr><td style="padding: 8px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; font-size: 15px; color: #4b5563; line-height: 1.6;">• If you choose not to move forward, no action is required</td></tr>
                    </table>
                  </td>
                </tr>
              </table>
              <p style="margin: 0 0 28px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; font-size: 15px; color: #6b7280; line-height: 1.6;">
                If you have any questions, our support team is here to help at <a href="mailto:Support@rehablookup.com" style="color: #1B365D; text-decoration: none; font-weight: 500;">Support@rehablookup.com</a>.
              </p>
              <p style="margin: 0 0 6px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; font-size: 16px; color: #4b5563;">Thank you for taking this step.</p>
              <p style="margin: 0 0 6px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; font-size: 16px; color: #4b5563;">Warm regards,</p>
              <p style="margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; font-size: 16px; font-weight: 600; color: #1B365D;">The RehabLookup Team</p>
            </td>
          </tr>
          <tr>
            <td style="background-color: #1B365D; padding: 32px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr><td align="center" style="padding-bottom: 16px;"><p style="margin: 0; font-family: Arial, Helvetica, sans-serif; font-size: 20px; font-weight: 700; color: #ffffff;">RehabLookup</p></td></tr>
                <tr><td align="center" style="padding-bottom: 20px;"><p style="margin: 0; font-family: Arial, Helvetica, sans-serif; font-size: 14px; color: #cbd5e1;">Connecting families with trusted treatment providers</p></td></tr>
                <tr><td align="center" style="padding-bottom: 20px;"><p style="margin: 0; font-family: Arial, Helvetica, sans-serif; font-size: 13px; color: #94a3b8;">🔒 Your information is secure and confidential</p></td></tr>
                <tr>
                  <td align="center" style="padding-bottom: 16px;">
                    <table role="presentation" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding: 0 12px;"><a href="https://rehablookup.com/privacy-policy" style="font-family: Arial; font-size: 13px; color: #93c5fd; text-decoration: none;">Privacy Policy</a></td>
                        <td style="color: #64748b;">|</td>
                        <td style="padding: 0 12px;"><a href="https://rehablookup.com/terms-of-service" style="font-family: Arial; font-size: 13px; color: #93c5fd; text-decoration: none;">Terms of Service</a></td>
                        <td style="color: #64748b;">|</td>
                        <td style="padding: 0 12px;"><a href="mailto:Support@rehablookup.com" style="font-family: Arial; font-size: 13px; color: #93c5fd; text-decoration: none;">Contact Us</a></td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr><td align="center"><p style="margin: 0; font-family: Arial; font-size: 12px; color: #94a3b8;">© ${new Date().getFullYear()} RehabLookup. All rights reserved.</p></td></tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
