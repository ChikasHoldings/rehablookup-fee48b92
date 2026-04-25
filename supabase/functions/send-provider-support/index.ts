import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { sendEmailWithRetry } from "../_shared/resilient-email-sender.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MAX_BODY_SIZE = 50000;

const topicLabels: Record<string, string> = {
  listing: "Listing & Profile",
  leads: "Leads & Requests",
  billing: "Billing & Payments",
  technical: "Technical Issue",
  account: "Account Settings",
  other: "Other",
};

function sanitizeStr(str: unknown, maxLen = 500): string {
  if (!str || typeof str !== "string") return "";
  return str.trim().replace(/<[^>]*>/g, "").replace(/javascript:/gi, "").replace(/data:/gi, "").replace(/\0/g, "").slice(0, maxLen);
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

const isValidUUID = (str: unknown): boolean =>
  typeof str === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(str);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // POST-only enforcement
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    console.log("[SEND-PROVIDER-SUPPORT] Function started");

    // Body size limit
    const rawBody = await req.text();
    if (rawBody.length > MAX_BODY_SIZE) {
      return new Response(JSON.stringify({ error: "Request too large" }), {
        status: 413, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let body: Record<string, unknown>;
    try {
      body = JSON.parse(rawBody);
    } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      console.error("[SEND-PROVIDER-SUPPORT] RESEND_API_KEY not configured");
      return new Response(JSON.stringify({ error: "Email service not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const name = sanitizeStr(body.name, 100);
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase().slice(0, 255) : "";
    const topic = sanitizeStr(body.topic, 50);
    const message = sanitizeStr(body.message, 5000);
    const userId = typeof body.userId === "string" && isValidUUID(body.userId) ? body.userId : null;

    if (!name || !email || !topic || !message) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length < 5) {
      return new Response(JSON.stringify({ error: "Invalid email address" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate topic against whitelist
    if (!topicLabels[topic]) {
      return new Response(JSON.stringify({ error: "Invalid topic category" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("[SEND-PROVIDER-SUPPORT] Processing request:", { name: name.slice(0, 20), topic });

    const topicLabel = topicLabels[topic];

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { data: ticketData, error: ticketError } = await supabaseAdmin.from('support_tickets').insert({
      source: 'provider_support',
      sender_name: name,
      sender_email: email,
      sender_user_id: userId,
      category: topicLabel,
      subject: `Provider Support: ${topicLabel}`,
      message: message,
    }).select('id').single();

    if (ticketError) {
      console.error("[SEND-PROVIDER-SUPPORT] Failed to create support ticket:", ticketError);
    } else {
      const { data: adminUsers } = await supabaseAdmin
        .from('admin_user_profiles')
        .select('user_id')
        .eq('status', 'active');
      
      if (adminUsers && adminUsers.length > 0) {
        const notifications = adminUsers.map(admin => ({
          user_id: admin.user_id,
          type: 'support_ticket',
          title: 'New Provider Support Request',
          message: `${name.slice(0, 50)} needs help with ${topicLabel}`,
          link: `/admin/support?ticket=${ticketData?.id}`,
          metadata: { ticket_id: ticketData?.id, source: 'provider_support' }
        }));
        
        await supabaseAdmin.from('admin_user_notifications').insert(notifications);
      }
    }

    const emailHtml = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin: 0; padding: 0; background-color: #f4f6f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f6f9;">
    <tr><td align="center" style="padding: 40px 20px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width: 560px; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 12px rgba(0,0,0,0.06);">
        <tr><td style="background-color: #1B365D; padding: 20px 28px;">
          <h1 style="margin: 0; color: #ffffff; font-size: 16px; font-weight: 600;">Provider Support: ${escapeHtml(topicLabel)}</h1>
        </td></tr>
        <tr><td style="padding: 28px; background-color: #ffffff;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 20px;">
            <tr><td style="padding: 8px 0; font-size: 14px; color: #6b7280; width: 70px;">From:</td><td style="padding: 8px 0; font-size: 15px; color: #1f2937; font-weight: 500;">${escapeHtml(name)}</td></tr>
            <tr><td style="padding: 8px 0; font-size: 14px; color: #6b7280;">Email:</td><td style="padding: 8px 0;"><a href="mailto:${escapeHtml(email)}" style="font-size: 15px; color: #1B365D; text-decoration: none;">${escapeHtml(email)}</a></td></tr>
            <tr><td style="padding: 8px 0; font-size: 14px; color: #6b7280;">Topic:</td><td style="padding: 8px 0; font-size: 15px; color: #1f2937;">${escapeHtml(topicLabel)}</td></tr>
          </table>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8fafc; border-radius: 8px;">
            <tr><td style="padding: 16px;">
              <p style="margin: 0 0 6px 0; font-size: 12px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px;">Message</p>
              <p style="margin: 0; font-size: 15px; color: #374151; line-height: 1.6; white-space: pre-wrap;">${escapeHtml(message)}</p>
            </td></tr>
          </table>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

    const resend = new Resend(resendApiKey);
    
    const supportTicketKey = `psupport-${email}-${Date.now().toString(36)}`;
    await sendEmailWithRetry(supabaseAdmin, resend, {
      from: "RehabLookup <no-reply@rehablookup.com>",
      to: ["providers@rehablookup.com"],
      subject: `[Provider Support] ${topicLabel} - ${escapeHtml(name.slice(0, 50))}`,
      html: emailHtml,
      replyTo: email,
    }, {
      emailType: "provider_support",
      idempotencyKey: `${supportTicketKey}-internal`,
    });

    const confirmationHtml = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin: 0; padding: 0; background-color: #f4f6f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f6f9;">
    <tr><td align="center" style="padding: 40px 20px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width: 560px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08);">
        <tr><td style="background: linear-gradient(135deg, #1B365D 0%, #2C4A7F 100%); padding: 32px 28px; text-align: center;">
          <div style="font-size: 36px; margin-bottom: 12px;">&#10003;</div>
          <h1 style="margin: 0; color: #ffffff; font-size: 20px; font-weight: 700;">We've Received Your Message</h1>
        </td></tr>
        <tr><td style="padding: 32px 28px; background-color: #ffffff;">
          <p style="margin: 0 0 16px 0; font-size: 16px; color: #1f2937; line-height: 1.6;">Hi ${escapeHtml(name)},</p>
          <p style="margin: 0 0 20px 0; font-size: 16px; color: #374151; line-height: 1.6;">Thank you for reaching out to our provider support team. We've received your message regarding <strong style="color: #1f2937;">${escapeHtml(topicLabel)}</strong> and will get back to you within 24 hours.</p>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8fafc; border-radius: 10px; margin: 24px 0;">
            <tr><td style="padding: 16px;">
              <p style="margin: 0 0 6px 0; font-size: 12px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px;">Your Message</p>
              <p style="margin: 0; font-size: 14px; color: #4b5563; line-height: 1.6; white-space: pre-wrap;">${escapeHtml(message)}</p>
            </td></tr>
          </table>
          <p style="margin: 0 0 20px 0; font-size: 15px; color: #374151; line-height: 1.6;">In the meantime, you might find answers in our <a href="https://rehablookup.com/provider-faq" style="color: #1B365D; text-decoration: underline; font-weight: 500;">Provider FAQ</a> or <a href="https://rehablookup.com/provider-resources" style="color: #1B365D; text-decoration: underline; font-weight: 500;">Resources</a> section.</p>
          <p style="margin: 24px 0 0 0; font-size: 15px; color: #6b7280;">Best regards,<br><strong style="color: #374151;">The RehabLookup Team</strong></p>
        </td></tr>
        <tr><td style="background-color: #1B365D; padding: 20px 28px;">
          <p style="margin: 0 0 6px 0; font-size: 14px; font-weight: 600; color: #ffffff; text-align: center;">RehabLookup</p>
          <p style="margin: 0; font-size: 12px; color: rgba(255,255,255,0.7); text-align: center;">Connecting families with trusted treatment providers</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

    await sendEmailWithRetry(supabaseAdmin, resend, {
      from: "RehabLookup <no-reply@rehablookup.com>",
      to: [email],
      subject: "We've received your support request",
      html: confirmationHtml,
    }, {
      emailType: "provider_support",
      idempotencyKey: `${supportTicketKey}-confirm`,
    });

    return new Response(JSON.stringify({ success: true }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: unknown) {
    console.error("[SEND-PROVIDER-SUPPORT] Error:", error);
    return new Response(JSON.stringify({ error: "An error occurred processing your request" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
