import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ProviderSupportRequest {
  name: string;
  email: string;
  topic: string;
  message: string;
  userId?: string;
}

const topicLabels: Record<string, string> = {
  listing: "Listing & Profile",
  leads: "Leads & Requests",
  billing: "Billing & Payments",
  technical: "Technical Issue",
  account: "Account Settings",
  other: "Other",
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("[SEND-PROVIDER-SUPPORT] Function started");

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      console.error("[SEND-PROVIDER-SUPPORT] RESEND_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "Email service not configured" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const body: ProviderSupportRequest = await req.json();
    const { name, email, topic, message, userId } = body;

    // Validate required fields
    if (!name || !email || !topic || !message) {
      console.error("[SEND-PROVIDER-SUPPORT] Missing required fields");
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return new Response(
        JSON.stringify({ error: "Invalid email address" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log("[SEND-PROVIDER-SUPPORT] Processing request:", { name, email, topic });

    const topicLabel = topicLabels[topic] || topic;

    // Store ticket in database for Admin Support Inbox
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { error: ticketError } = await supabaseAdmin.from('support_tickets').insert({
      source: 'provider_support',
      sender_name: name,
      sender_email: email,
      sender_user_id: userId || null,
      category: topicLabel,
      subject: `Provider Support: ${topicLabel}`,
      message: message,
    });

    if (ticketError) {
      console.error("[SEND-PROVIDER-SUPPORT] Failed to create support ticket:", ticketError);
      // Don't fail the request, just log the error - email will still be sent
    } else {
      console.log("[SEND-PROVIDER-SUPPORT] Support ticket created successfully");
    }

    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #f4f6f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f6f9;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 560px; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 12px rgba(0,0,0,0.06);">
          
          <tr>
            <td style="background: #1B365D; padding: 20px 28px;">
              <h1 style="margin: 0; color: #ffffff; font-size: 16px; font-weight: 600;">
                Provider Support: ${topicLabel}
              </h1>
            </td>
          </tr>
          
          <tr>
            <td style="padding: 28px;">
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 20px;">
                <tr>
                  <td style="padding: 6px 0; font-size: 13px; color: #6b7280; width: 70px;">From:</td>
                  <td style="padding: 6px 0; font-size: 14px; color: #111827; font-weight: 500;">${name}</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; font-size: 13px; color: #6b7280;">Email:</td>
                  <td style="padding: 6px 0;"><a href="mailto:${email}" style="font-size: 14px; color: #1B365D; text-decoration: none;">${email}</a></td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; font-size: 13px; color: #6b7280;">Topic:</td>
                  <td style="padding: 6px 0; font-size: 14px; color: #111827;">${topicLabel}</td>
                </tr>
              </table>
              
              <div style="background: #f9fafb; border-radius: 8px; padding: 16px;">
                <p style="margin: 0 0 6px 0; font-size: 11px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px;">Message</p>
                <p style="margin: 0; font-size: 14px; color: #111827; line-height: 1.6; white-space: pre-wrap;">${message}</p>
              </div>
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
    
    // Send notification to support team
    const supportEmailResponse = await resend.emails.send({
      from: "RehabLookup <no-reply@rehablookup.com>",
      to: ["providers@rehablookup.com"],
      subject: `[Provider Support] ${topicLabel} - ${name}`,
      html: emailHtml,
      reply_to: email,
    });

    console.log("[SEND-PROVIDER-SUPPORT] Support email sent:", supportEmailResponse);

    // Send confirmation email to user
    const confirmationHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #f4f6f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f6f9;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 560px; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 12px rgba(0,0,0,0.06);">
          
          <tr>
            <td style="background: #1B365D; padding: 20px 28px;">
              <h1 style="margin: 0; color: #ffffff; font-size: 16px; font-weight: 600;">
                We've Received Your Message
              </h1>
            </td>
          </tr>
          
          <tr>
            <td style="padding: 28px;">
              <p style="margin: 0 0 16px 0; font-size: 15px; color: #111827; line-height: 1.6;">
                Hi ${name},
              </p>
              <p style="margin: 0 0 16px 0; font-size: 15px; color: #111827; line-height: 1.6;">
                Thank you for reaching out to our provider support team. We've received your message regarding <strong>${topicLabel}</strong> and will get back to you within 24 hours.
              </p>
              
              <div style="background: #f9fafb; border-radius: 8px; padding: 16px; margin: 20px 0;">
                <p style="margin: 0 0 6px 0; font-size: 11px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px;">Your Message</p>
                <p style="margin: 0; font-size: 14px; color: #374151; line-height: 1.5; white-space: pre-wrap;">${message}</p>
              </div>
              
              <p style="margin: 0 0 16px 0; font-size: 15px; color: #111827; line-height: 1.6;">
                In the meantime, you might find answers in our <a href="https://rehablookup.com/provider-faq" style="color: #1B365D; text-decoration: underline;">Provider FAQ</a> or <a href="https://rehablookup.com/provider-resources" style="color: #1B365D; text-decoration: underline;">Resources</a> section.
              </p>
              
              <p style="margin: 24px 0 0 0; font-size: 14px; color: #6b7280;">
                Best regards,<br>
                The RehabLookup Team
              </p>
            </td>
          </tr>
          
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;

    const confirmationResponse = await resend.emails.send({
      from: "RehabLookup <no-reply@rehablookup.com>",
      to: [email],
      subject: "We've received your support request",
      html: confirmationHtml,
    });

    console.log("[SEND-PROVIDER-SUPPORT] Confirmation email sent:", confirmationResponse);

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );

  } catch (error: unknown) {
    console.error("[SEND-PROVIDER-SUPPORT] Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
