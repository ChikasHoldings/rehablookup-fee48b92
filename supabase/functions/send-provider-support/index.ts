import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
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

// Input sanitization helpers
function sanitizeStr(str: string, maxLen = 500): string {
  return str.trim().replace(/[<>]/g, "").slice(0, maxLen);
}
function escapeHtml(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

Deno.serve(async (req) => {
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
    const name = sanitizeStr(body.name, 100);
    const email = body.email?.trim()?.toLowerCase()?.slice(0, 255) || "";
    const topic = sanitizeStr(body.topic, 50);
    const message = sanitizeStr(body.message, 5000);
    const userId = body.userId;

    if (!name || !email || !topic || !message) {
      console.error("[SEND-PROVIDER-SUPPORT] Missing required fields");
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return new Response(
        JSON.stringify({ error: "Invalid email address" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log("[SEND-PROVIDER-SUPPORT] Processing request:", { name, email, topic });

    const topicLabel = topicLabels[topic] || topic;

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { data: ticketData, error: ticketError } = await supabaseAdmin.from('support_tickets').insert({
      source: 'provider_support',
      sender_name: name,
      sender_email: email,
      sender_user_id: userId || null,
      category: topicLabel,
      subject: `Provider Support: ${topicLabel}`,
      message: message,
    }).select('id').single();

    if (ticketError) {
      console.error("[SEND-PROVIDER-SUPPORT] Failed to create support ticket:", ticketError);
    } else {
      console.log("[SEND-PROVIDER-SUPPORT] Support ticket created successfully");
      
      const { data: adminUsers } = await supabaseAdmin
        .from('admin_user_profiles')
        .select('user_id')
        .eq('status', 'active');
      
      if (adminUsers && adminUsers.length > 0) {
        const notifications = adminUsers.map(admin => ({
          user_id: admin.user_id,
          type: 'support_ticket',
          title: 'New Provider Support Request',
          message: `${name} needs help with ${topicLabel}`,
          link: `/admin/support?ticket=${ticketData?.id}`,
          metadata: { ticket_id: ticketData?.id, source: 'provider_support' }
        }));
        
        await supabaseAdmin.from('admin_user_notifications').insert(notifications);
        console.log("[SEND-PROVIDER-SUPPORT] Admin notifications created");
      }
    }

    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Provider Support Request</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f6f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; -webkit-font-smoothing: antialiased;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f6f9;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width: 560px; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 12px rgba(0,0,0,0.06);">
          
          <!-- Header -->
          <tr>
            <td style="background-color: #1B365D; padding: 20px 28px;">
              <h1 style="margin: 0; color: #ffffff; font-size: 16px; font-weight: 600;">
                Provider Support: ${topicLabel}
              </h1>
            </td>
          </tr>
          
          <!-- Body -->
          <tr>
            <td style="padding: 28px; background-color: #ffffff;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 20px;">
                <tr>
                  <td style="padding: 8px 0; font-size: 14px; color: #6b7280; width: 70px;">From:</td>
                  <td style="padding: 8px 0; font-size: 15px; color: #1f2937; font-weight: 500;">${escapeHtml(name)}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; font-size: 14px; color: #6b7280;">Email:</td>
                  <td style="padding: 8px 0;"><a href="mailto:${email}" style="font-size: 15px; color: #1B365D; text-decoration: none;">${email}</a></td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; font-size: 14px; color: #6b7280;">Topic:</td>
                  <td style="padding: 8px 0; font-size: 15px; color: #1f2937;">${topicLabel}</td>
                </tr>
              </table>
              
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8fafc; border-radius: 8px;">
                <tr>
                  <td style="padding: 16px;">
                    <p style="margin: 0 0 6px 0; font-size: 12px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px;">Message</p>
                    <p style="margin: 0; font-size: 15px; color: #374151; line-height: 1.6; white-space: pre-wrap;">${message}</p>
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
    
    const supportEmailResponse = await resend.emails.send({
      from: "RehabLookup <no-reply@rehablookup.com>",
      to: ["providers@rehablookup.com"],
      subject: `[Provider Support] ${topicLabel} - ${name}`,
      html: emailHtml,
      reply_to: email,
    });

    console.log("[SEND-PROVIDER-SUPPORT] Support email sent:", supportEmailResponse);

    const confirmationHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Support Request Received</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f6f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; -webkit-font-smoothing: antialiased;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f6f9;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width: 560px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08);">
          
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #1B365D 0%, #2C4A7F 100%); padding: 32px 28px; text-align: center;">
              <div style="font-size: 36px; margin-bottom: 12px;">✓</div>
              <h1 style="margin: 0; color: #ffffff; font-size: 20px; font-weight: 700;">
                We've Received Your Message
              </h1>
            </td>
          </tr>
          
          <!-- Body -->
          <tr>
            <td style="padding: 32px 28px; background-color: #ffffff;">
              <p style="margin: 0 0 16px 0; font-size: 16px; color: #1f2937; line-height: 1.6;">
                Hi ${name},
              </p>
              <p style="margin: 0 0 20px 0; font-size: 16px; color: #374151; line-height: 1.6;">
                Thank you for reaching out to our provider support team. We've received your message regarding <strong style="color: #1f2937;">${topicLabel}</strong> and will get back to you within 24 hours.
              </p>
              
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8fafc; border-radius: 10px; margin: 24px 0;">
                <tr>
                  <td style="padding: 16px;">
                    <p style="margin: 0 0 6px 0; font-size: 12px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px;">Your Message</p>
                    <p style="margin: 0; font-size: 14px; color: #4b5563; line-height: 1.6; white-space: pre-wrap;">${message}</p>
                  </td>
                </tr>
              </table>
              
              <p style="margin: 0 0 20px 0; font-size: 15px; color: #374151; line-height: 1.6;">
                In the meantime, you might find answers in our <a href="https://rehablookup.com/provider-faq" style="color: #1B365D; text-decoration: underline; font-weight: 500;">Provider FAQ</a> or <a href="https://rehablookup.com/provider-resources" style="color: #1B365D; text-decoration: underline; font-weight: 500;">Resources</a> section.
              </p>
              
              <p style="margin: 24px 0 0 0; font-size: 15px; color: #6b7280;">
                Best regards,<br>
                <strong style="color: #374151;">The RehabLookup Team</strong>
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #1B365D; padding: 20px 28px;">
              <p style="margin: 0 0 6px 0; font-size: 14px; font-weight: 600; color: #ffffff; text-align: center;">RehabLookup</p>
              <p style="margin: 0; font-size: 12px; color: rgba(255,255,255,0.7); text-align: center;">
                Connecting families with trusted treatment providers
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
});
