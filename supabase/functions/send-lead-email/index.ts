import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Email templates
const templates: Record<string, { name: string; subject: string; body: string }> = {
  thanks_reaching_out: {
    name: "Thanks for Reaching Out",
    subject: "Thank you for contacting {{facilityName}}",
    body: `Dear {{leadName}},

Thank you for reaching out to {{facilityName}} through RehabLookup. We received your inquiry and are here to help you on your journey to recovery.

{{customNote}}

Our admissions team is available to answer any questions you may have about our treatment programs, insurance coverage, and next steps.

We understand that taking this step takes courage, and we're honored that you've trusted us with your inquiry. We'll be in touch shortly to discuss how we can best support you.

Warm regards,
{{senderName}}
{{facilityName}}`,
  },
  next_steps: {
    name: "Next Steps for Treatment",
    subject: "Your Next Steps with {{facilityName}}",
    body: `Dear {{leadName}},

Thank you for your interest in beginning treatment with {{facilityName}}. We're excited to help you take the next steps toward recovery.

{{customNote}}

Here's what you can expect:
1. A member of our admissions team will call you to discuss your needs
2. We'll verify your insurance benefits (if applicable)
3. We'll answer any questions about our programs and approach
4. We'll help you choose a start date that works for you

Recovery is possible, and we're here to support you every step of the way.

Best regards,
{{senderName}}
{{facilityName}}`,
  },
  insurance_availability: {
    name: "Insurance & Availability Follow-up",
    subject: "Insurance Information & Availability - {{facilityName}}",
    body: `Dear {{leadName}},

Thank you for your inquiry about treatment at {{facilityName}}. We wanted to follow up regarding insurance coverage and current availability.

{{customNote}}

We work with many major insurance providers and offer various payment options. Our admissions team can help verify your specific coverage and explain any out-of-pocket costs.

Current availability: We have openings in our program and can typically accommodate new admissions within a few days.

Please don't hesitate to call us if you have any questions. We're here to make this process as smooth as possible.

Sincerely,
{{senderName}}
{{facilityName}}`,
  },
  scheduling_call: {
    name: "Scheduling a Call",
    subject: "Let's Schedule a Call - {{facilityName}}",
    body: `Dear {{leadName}},

We received your inquiry and would love to speak with you directly about how {{facilityName}} can help.

{{customNote}}

Would you be available for a brief phone call in the next day or two? Our admissions specialists are available Monday through Friday from 8 AM to 8 PM, and weekends from 9 AM to 5 PM.

Please reply with a few times that work for you, or feel free to call us directly at your convenience.

Looking forward to connecting with you,
{{senderName}}
{{facilityName}}`,
  },
};

interface SendEmailRequest {
  leadId: string;
  templateId: string;
  customNote?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get auth token from request
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "No authorization header" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendApiKey = Deno.env.get("RESEND_API_KEY");

    if (!resendApiKey) {
      console.error("RESEND_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "Email service not configured" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Create authenticated client to get user
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    
    const { data: { user }, error: userError } = await supabaseAuth.auth.getUser();
    if (userError || !user) {
      console.error("Auth error:", userError);
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Use service role for database operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body: SendEmailRequest = await req.json();
    const { leadId, templateId, customNote } = body;

    console.log("Send email request:", { leadId, templateId, userId: user.id });

    // Validate template
    const template = templates[templateId];
    if (!template) {
      return new Response(
        JSON.stringify({ error: "Invalid template" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Get provider profile
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("first_name, last_name, email")
      .eq("user_id", user.id)
      .maybeSingle();

    if (profileError || !profile) {
      console.error("Profile not found:", profileError);
      return new Response(
        JSON.stringify({ error: "Provider profile not found" }),
        { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const senderName = `${profile.first_name} ${profile.last_name}`;

    // Get facility
    const { data: facility, error: facilityError } = await supabase
      .from("facilities")
      .select("id, name, email, reply_email")
      .eq("user_id", user.id)
      .maybeSingle();

    if (facilityError || !facility) {
      console.error("Facility not found:", facilityError);
      return new Response(
        JSON.stringify({ error: "Facility not found" }),
        { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Validate reply_email exists
    const replyToEmail = facility.reply_email || facility.email || profile.email;
    if (!replyToEmail) {
      console.error("No reply email configured");
      return new Response(
        JSON.stringify({ error: "Please set a reply email in your facility settings before sending emails." }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Get lead and verify it belongs to this facility
    const { data: lead, error: leadError } = await supabase
      .from("leads")
      .select("id, name, email, facility_id")
      .eq("id", leadId)
      .eq("facility_id", facility.id)
      .maybeSingle();

    if (leadError || !lead) {
      console.error("Lead not found or access denied:", leadError);
      return new Response(
        JSON.stringify({ error: "Lead not found or access denied" }),
        { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Rate limiting: Check emails sent today by this facility
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const { count: emailsToday } = await supabase
      .from("lead_emails")
      .select("*", { count: "exact", head: true })
      .eq("facility_id", facility.id)
      .gte("created_at", today.toISOString());

    const DAILY_EMAIL_LIMIT = 50;
    if ((emailsToday || 0) >= DAILY_EMAIL_LIMIT) {
      return new Response(
        JSON.stringify({ error: `Daily email limit (${DAILY_EMAIL_LIMIT}) reached. Please try again tomorrow.` }),
        { status: 429, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Prepare email content
    const customNoteText = customNote?.trim() 
      ? `\n${customNote.trim()}\n` 
      : "";

    const emailBody = template.body
      .replace(/{{leadName}}/g, lead.name)
      .replace(/{{facilityName}}/g, facility.name)
      .replace(/{{senderName}}/g, senderName)
      .replace(/{{customNote}}/g, customNoteText);

    const emailSubject = template.subject
      .replace(/{{facilityName}}/g, facility.name);

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
    ${emailBody.split('\n').map(line => 
      line.trim() ? `<p style="margin: 0 0 16px 0;">${line}</p>` : ''
    ).join('')}
    
    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 32px 0;">
    
    <p style="font-size: 12px; color: #9ca3af; margin: 0;">
      This email was sent via <a href="https://rehablookup.com" style="color: #1B365D;">RehabLookup</a> on behalf of ${facility.name}.<br>
      If you no longer wish to receive emails, please reply with "unsubscribe" in the subject line.
    </p>
  </div>
</body>
</html>
    `;

    // Send email via Resend
    const resend = new Resend(resendApiKey);
    
    console.log("Sending email with Reply-To:", replyToEmail);
    
    const emailResponse = await resend.emails.send({
      from: `${facility.name} via RehabLookup <noreply@resend.dev>`,
      to: [lead.email],
      subject: emailSubject,
      html: emailHtml,
      reply_to: replyToEmail,
    });

    console.log("Email sent:", emailResponse);

    // Log the email in database
    const { data: emailLog, error: logError } = await supabase
      .from("lead_emails")
      .insert({
        lead_id: lead.id,
        facility_id: facility.id,
        sender_user_id: user.id,
        sender_name: senderName,
        template_id: templateId,
        template_name: template.name,
        custom_note: customNote || null,
        recipient_email: lead.email,
        status: "sent",
        resend_id: emailResponse.data?.id || null,
      })
      .select()
      .single();

    if (logError) {
      console.error("Failed to log email:", logError);
      // Don't fail the request, email was still sent
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        emailId: emailLog?.id,
        message: `Email sent to ${lead.name}` 
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );

  } catch (error: unknown) {
    console.error("Error in send-lead-email function:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
