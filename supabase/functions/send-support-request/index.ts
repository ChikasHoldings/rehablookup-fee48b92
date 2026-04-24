import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { sendEmailWithRetry } from "../_shared/resilient-email-sender.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface SupportRequest {
  category: string;
  subject: string;
  message: string;
  source?: "provider" | "seeker";
}

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
    console.log("[SEND-SUPPORT-REQUEST] Function started");

    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "No authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendApiKey = Deno.env.get("RESEND_API_KEY");

    if (!resendApiKey) {
      console.error("[SEND-SUPPORT-REQUEST] RESEND_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "Email service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      console.error("[SEND-SUPPORT-REQUEST] Auth error:", userError);
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body: SupportRequest = await req.json();
    const category = sanitizeStr(body.category, 50);
    const subject = sanitizeStr(body.subject, 200);
    const message = sanitizeStr(body.message, 5000);
    const source = body.source || "provider";

    if (!category || !subject || !message) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const ticketSource = source === "seeker" ? "seeker_support" : "provider_support";
    const isSeeker = source === "seeker";
    console.log("[SEND-SUPPORT-REQUEST] Request:", { userId: user.id, category, subject, source: ticketSource });

    let userName = "Unknown";
    let userEmail = user.email || "Unknown";
    let contextInfo = "";

    if (isSeeker) {
      const { data: seekerProfile } = await supabase
        .from("seeker_profiles")
        .select("first_name, last_name, email")
        .eq("user_id", user.id)
        .maybeSingle();
      
      if (seekerProfile) {
        userName = [seekerProfile.first_name, seekerProfile.last_name].filter(Boolean).join(" ") || "Unknown";
        userEmail = seekerProfile.email || user.email || "Unknown";
      }
      contextInfo = "Client Account";
    } else {
      const { data: profile } = await supabase
        .from("profiles")
        .select("first_name, last_name, email")
        .eq("user_id", user.id)
        .maybeSingle();

      const { data: facility } = await supabase
        .from("facilities")
        .select("name, city, state")
        .eq("user_id", user.id)
        .maybeSingle();

      if (profile) {
        userName = `${profile.first_name} ${profile.last_name}`;
        userEmail = profile.email || user.email || "Unknown";
      }
      contextInfo = facility ? `Facility: ${facility.name} (${facility.city}, ${facility.state})` : "No facility";
    }

    const categoryLabels: Record<string, string> = {
      account: "Account",
      billing: "Billing",
      listing: "Listing",
      leads: "Leads",
      technical: "Technical",
      search: "Search & Filters",
      facility: "Facility Information",
      reviews: "Reviews",
      privacy: "Privacy",
      other: "Other",
    };

    const categoryLabel = categoryLabels[category] || category;

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    const { data: ticketData, error: ticketError } = await supabaseAdmin.from('support_tickets').insert({
      source: ticketSource,
      sender_name: userName,
      sender_email: userEmail,
      sender_user_id: user.id,
      category: categoryLabel,
      subject: subject,
      message: contextInfo ? `${contextInfo}\n\n${message}` : message,
    }).select('id').single();

    if (ticketError) {
      console.error("[SEND-SUPPORT-REQUEST] Failed to create ticket:", ticketError);
    } else {
      console.log("[SEND-SUPPORT-REQUEST] Support ticket created successfully");
      
      const { data: adminUsers } = await supabaseAdmin
        .from('admin_user_profiles')
        .select('user_id')
        .eq('status', 'active');
      
      if (adminUsers && adminUsers.length > 0) {
        const sourceLabel = isSeeker ? "Client" : "Provider";
        const notifications = adminUsers.map(admin => ({
          user_id: admin.user_id,
          type: 'support_ticket',
          title: `New ${sourceLabel} Support Request`,
          message: `${userName}${!isSeeker && contextInfo ? ` (${contextInfo})` : ''} needs help with ${categoryLabel}`,
          link: `/admin/support?ticket=${ticketData?.id}`,
          metadata: { ticket_id: ticketData?.id, source: ticketSource }
        }));
        
        await supabaseAdmin.from('admin_user_notifications').insert(notifications);
        console.log("[SEND-SUPPORT-REQUEST] Admin notifications created");
      }
    }

    const sourceLabel = isSeeker ? "Client" : "Provider";
    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Support Request</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f6f9; -webkit-font-smoothing: antialiased;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f6f9;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08);">
          
          <!-- Header -->
          <tr>
            <td style="background: #1B365D; padding: 24px 32px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; font-size: 18px; font-weight: 600;">
                ${sourceLabel} Support Request: ${categoryLabel}
              </h1>
            </td>
          </tr>
          
          <!-- Body -->
          <tr>
            <td style="padding: 32px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 24px;">
                <tr>
                  <td style="padding: 8px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; font-size: 14px; color: #64748b; width: 90px;">From:</td>
                  <td style="padding: 8px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; font-size: 15px; color: #1a1a1a;">${userName}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; font-size: 14px; color: #64748b;">Email:</td>
                  <td style="padding: 8px 0;"><a href="mailto:${userEmail}" style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; font-size: 15px; color: #1B365D; text-decoration: none;">${userEmail}</a></td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; font-size: 14px; color: #64748b;">Type:</td>
                  <td style="padding: 8px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; font-size: 15px; color: #1a1a1a;">${contextInfo}</td>
                </tr>
              </table>
              
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background: #f8fafc; border-radius: 10px; margin-bottom: 16px;">
                <tr>
                  <td style="padding: 16px 20px;">
                    <p style="margin: 0 0 6px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; font-size: 12px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px;">Subject</p>
                    <p style="margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; font-size: 15px; font-weight: 500; color: #1a1a1a;">${escapeHtml(subject)}</p>
                  </td>
                </tr>
              </table>
              
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background: #f8fafc; border-radius: 10px;">
                <tr>
                  <td style="padding: 16px 20px;">
                    <p style="margin: 0 0 6px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; font-size: 12px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px;">Message</p>
                    <p style="margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; font-size: 15px; color: #1a1a1a; white-space: pre-wrap; line-height: 1.6;">${escapeHtml(message)}</p>
                  </td>
                </tr>
              </table>
              
              <p style="margin: 20px 0 0 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; font-size: 12px; color: #94a3b8;">
                User ID: ${user.id}
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

    const resend = new Resend(resendApiKey);
    const emailResponse = await sendEmailWithRetry(supabase, resend, {
      from: "RehabLookup Support <no-reply@rehablookup.com>",
      to: ["Support@rehablookup.com"],
      subject: `[${sourceLabel}] ${categoryLabel} - ${subject}`,
      html: emailHtml,
      reply_to: userEmail,
    }, {
      emailType: "support_request",
      idempotencyKey: `support-${userEmail}-${subject.slice(0, 40)}-${Date.now().toString(36)}`,
    });

    console.log("[SEND-SUPPORT-REQUEST] Email sent:", emailResponse);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Support request submitted" 
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    console.error("[SEND-SUPPORT-REQUEST] Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
