import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { sendEmailWithRetry } from "../_shared/resilient-email-sender.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MAX_BODY_SIZE = 50000;

const subjectLabels: Record<string, string> = {
  general: "General Inquiry",
  listing: "Facility Listing",
  feedback: "Feedback",
  technical: "Technical Issue",
  other: "Other",
};

function sanitizeStr(str: unknown, maxLen = 500): string {
  if (!str || typeof str !== "string") return "";
  return str.trim().replace(/<[^>]*>/g, "").replace(/javascript:/gi, "").replace(/data:/gi, "").replace(/\0/g, "").slice(0, maxLen);
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

Deno.serve(async (req: Request): Promise<Response> => {
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
    console.log("[SEND-CONTACT-FORM] Function started");

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
      console.error("[SEND-CONTACT-FORM] RESEND_API_KEY not configured");
      return new Response(JSON.stringify({ error: "Email service not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const name = sanitizeStr(body.name, 100);
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase().slice(0, 255) : "";
    const subject = sanitizeStr(body.subject, 50);
    const message = sanitizeStr(body.message, 5000);

    // Validate required fields
    if (!name || !email || !subject || !message) {
      return new Response(JSON.stringify({ error: "All fields are required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate email format
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length < 5) {
      return new Response(JSON.stringify({ error: "Invalid email address" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate subject against whitelist
    if (!subjectLabels[subject]) {
      return new Response(JSON.stringify({ error: "Invalid subject category" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("[SEND-CONTACT-FORM] Processing:", { name: name.slice(0, 20), subject });

    const subjectLabel = subjectLabels[subject];

    // Store ticket in database for Admin Support Inbox
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { data: ticketData, error: ticketError } = await supabaseAdmin.from('support_tickets').insert({
      source: 'public_contact',
      sender_name: name,
      sender_email: email,
      category: subjectLabel,
      subject: `Contact Form: ${subjectLabel}`,
      message: message,
    }).select('id').single();

    if (ticketError) {
      console.error("[SEND-CONTACT-FORM] Failed to create support ticket:", ticketError);
    } else {
      console.log("[SEND-CONTACT-FORM] Support ticket created successfully");
      
      const { data: adminUsers } = await supabaseAdmin
        .from('admin_user_profiles')
        .select('user_id')
        .eq('status', 'active');
      
      if (adminUsers && adminUsers.length > 0) {
        const notifications = adminUsers.map(admin => ({
          user_id: admin.user_id,
          type: 'support_ticket',
          title: 'New Support Ticket',
          message: `${name.slice(0, 50)} submitted a contact form (${subjectLabel})`,
          link: `/admin/support?ticket=${ticketData?.id}`,
          metadata: { ticket_id: ticketData?.id, source: 'public_contact' }
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
        <tr><td style="background-color: #1B365D; padding: 20px 28px; text-align: center;">
          <h1 style="margin: 0; color: #ffffff; font-size: 16px; font-weight: 600;">Website Contact Form</h1>
        </td></tr>
        <tr><td style="padding: 28px; background-color: #ffffff;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 20px;">
            <tr><td style="padding: 8px 0; font-size: 14px; color: #6b7280; width: 80px;">From:</td><td style="padding: 8px 0; font-size: 15px; color: #1f2937; font-weight: 500;">${escapeHtml(name)}</td></tr>
            <tr><td style="padding: 8px 0; font-size: 14px; color: #6b7280;">Email:</td><td style="padding: 8px 0;"><a href="mailto:${escapeHtml(email)}" style="font-size: 15px; color: #1B365D; text-decoration: none;">${escapeHtml(email)}</a></td></tr>
            <tr><td style="padding: 8px 0; font-size: 14px; color: #6b7280;">Category:</td><td style="padding: 8px 0; font-size: 15px; color: #1f2937;">${escapeHtml(subjectLabel)}</td></tr>
          </table>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8fafc; border-radius: 8px;">
            <tr><td style="padding: 16px;">
              <p style="margin: 0 0 6px 0; font-size: 12px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px;">Message</p>
              <p style="margin: 0; font-size: 15px; color: #374151; line-height: 1.6; white-space: pre-wrap;">${escapeHtml(message)}</p>
            </td></tr>
          </table>
        </td></tr>
        <tr><td style="background-color: #1B365D; padding: 20px 28px;">
          <p style="margin: 0 0 6px 0; font-size: 14px; font-weight: 600; color: #ffffff; text-align: center;">RehabLookup</p>
          <p style="margin: 0; font-size: 11px; color: rgba(255,255,255,0.6); text-align: center;">Submitted via rehablookup.com contact form</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

    const resend = new Resend(resendApiKey);
    const emailResponse = await sendEmailWithRetry(supabaseAdmin, resend, {
      from: "RehabLookup <no-reply@rehablookup.com>",
      to: ["Support@rehablookup.com"],
      subject: `[${subjectLabel}] Contact from ${escapeHtml(name.slice(0, 50))}`,
      html: emailHtml,
      reply_to: email,
    }, { emailType: "contact_form" };

    console.log("[SEND-CONTACT-FORM] Email sent:", emailResponse);

    return new Response(JSON.stringify({ success: true, message: "Message sent successfully" }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: unknown) {
    console.error("[SEND-CONTACT-FORM] Error:", error);
    return new Response(JSON.stringify({ error: "An error occurred processing your request" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
