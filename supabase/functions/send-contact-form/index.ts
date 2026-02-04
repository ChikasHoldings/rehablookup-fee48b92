import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface ContactRequest {
  name: string;
  email: string;
  subject: string;
  message: string;
}

const subjectLabels: Record<string, string> = {
  general: "General Inquiry",
  listing: "Facility Listing",
  feedback: "Feedback",
  technical: "Technical Issue",
  other: "Other",
};

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("[SEND-CONTACT-FORM] Function started");

    const resendApiKey = Deno.env.get("RESEND_API_KEY");

    if (!resendApiKey) {
      console.error("[SEND-CONTACT-FORM] RESEND_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "Email service not configured" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const body: ContactRequest = await req.json();
    const { name, email, subject, message } = body;

    // Validate required fields
    if (!name || !email || !subject || !message) {
      return new Response(
        JSON.stringify({ error: "All fields are required" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return new Response(
        JSON.stringify({ error: "Invalid email address" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Validate field lengths
    if (name.length > 100 || email.length > 255 || message.length > 5000) {
      return new Response(
        JSON.stringify({ error: "Field length exceeds maximum allowed" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log("[SEND-CONTACT-FORM] Processing:", { name, email, subject });

    const subjectLabel = subjectLabels[subject] || subject;

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
      
      // Notify all admins with support permission
      const { data: adminUsers } = await supabaseAdmin
        .from('admin_user_profiles')
        .select('user_id')
        .eq('status', 'active');
      
      if (adminUsers && adminUsers.length > 0) {
        const notifications = adminUsers.map(admin => ({
          user_id: admin.user_id,
          type: 'support_ticket',
          title: 'New Support Ticket',
          message: `${name} submitted a contact form (${subjectLabel})`,
          link: `/admin/support?ticket=${ticketData?.id}`,
          metadata: { ticket_id: ticketData?.id, source: 'public_contact' }
        }));
        
        await supabaseAdmin.from('admin_user_notifications').insert(notifications);
        console.log("[SEND-CONTACT-FORM] Admin notifications created");
      }
    }

    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f6f8fb;">
  <div style="background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.06);">
    <div style="background: #1B365D; padding: 20px; text-align: center;">
      <h1 style="color: #fff; margin: 0; font-size: 16px; font-weight: 600;">Website Contact Form</h1>
    </div>
    
    <div style="padding: 24px;">
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 14px;">
        <tr>
          <td style="padding: 6px 0; color: #64748b; width: 80px;">From:</td>
          <td style="padding: 6px 0;">${name}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #64748b;">Email:</td>
          <td style="padding: 6px 0;"><a href="mailto:${email}" style="color: #1B365D;">${email}</a></td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #64748b;">Category:</td>
          <td style="padding: 6px 0;">${subjectLabel}</td>
        </tr>
      </table>
      
      <div style="background: #f8fafc; padding: 16px; border-radius: 8px;">
        <p style="margin: 0 0 4px 0; font-size: 12px; color: #64748b; text-transform: uppercase;">Message</p>
        <p style="margin: 0; white-space: pre-wrap;">${message}</p>
      </div>
    </div>
    
    <div style="background: #1B365D; padding: 20px; border-radius: 0 0 12px 12px;">
      <p style="margin: 0 0 8px 0; font-size: 14px; font-weight: 600; color: #fff; text-align: center;">RehabLookup</p>
      <p style="margin: 0; font-size: 11px; color: rgba(255,255,255,0.6); text-align: center;">
        Submitted via rehablookup.com contact form
      </p>
    </div>
  </div>
</body>
</html>
    `;

    const resend = new Resend(resendApiKey);
    const emailResponse = await resend.emails.send({
      from: "RehabLookup <no-reply@rehablookup.com>",
      to: ["help@rehablookup.com"],
      subject: `[${subjectLabel}] Contact from ${name}`,
      html: emailHtml,
      reply_to: email,
    });

    console.log("[SEND-CONTACT-FORM] Email sent:", emailResponse);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Message sent successfully" 
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );

  } catch (error: unknown) {
    console.error("[SEND-CONTACT-FORM] Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
