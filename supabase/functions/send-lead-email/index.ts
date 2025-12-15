import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Email templates - shorter, human, no em dashes
const templates: Record<string, { name: string; subject: string; body: string }> = {
  thanks_reaching_out: {
    name: "Thanks for Reaching Out",
    subject: "Thanks for contacting {{facilityName}}",
    body: `Hi {{leadName}},

Thank you for reaching out to {{facilityName}}. We received your inquiry and want you to know we're here to help.

{{customNote}}

Our team is ready to answer your questions about our programs, insurance, and what to expect. Taking this step takes courage, and we appreciate your trust.

We'll be in touch soon.

Warmly,
{{senderName}}
{{facilityName}}`,
  },
  next_steps: {
    name: "Next Steps",
    subject: "Your next steps with {{facilityName}}",
    body: `Hi {{leadName}},

Thank you for considering {{facilityName}}. We're ready to help you take the next step.

{{customNote}}

Here's what happens next:
1. Our admissions team will call to learn about your needs
2. We'll check your insurance coverage
3. We'll answer all your questions
4. Together, we'll find a start date that works

Recovery is possible. We're with you every step.

Best,
{{senderName}}
{{facilityName}}`,
  },
  insurance_availability: {
    name: "Insurance & Availability",
    subject: "Insurance info from {{facilityName}}",
    body: `Hi {{leadName}},

Thanks for asking about treatment at {{facilityName}}. I wanted to follow up on insurance and availability.

{{customNote}}

We work with most major insurance plans and offer flexible payment options. Our team can verify your specific coverage and explain any costs upfront.

Good news: we currently have openings and can often get you started within a few days.

Questions? Just reply to this email or give us a call.

Best,
{{senderName}}
{{facilityName}}`,
  },
  scheduling_call: {
    name: "Schedule a Call",
    subject: "Let's talk - {{facilityName}}",
    body: `Hi {{leadName}},

We'd love to speak with you about how {{facilityName}} can help.

{{customNote}}

Are you available for a quick call in the next day or two? Our team is here Monday through Friday, 8am to 8pm, and weekends 9am to 5pm.

Reply with a few times that work, or just call us when you're ready.

Looking forward to connecting,
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

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body: SendEmailRequest = await req.json();
    const { leadId, templateId, customNote } = body;

    console.log("Send email request:", { leadId, templateId, userId: user.id });

    const template = templates[templateId];
    if (!template) {
      return new Response(
        JSON.stringify({ error: "Invalid template" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

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

    const replyToEmail = facility.reply_email || facility.email || profile.email;
    if (!replyToEmail) {
      console.error("No reply email configured");
      return new Response(
        JSON.stringify({ error: "Please set a reply email in your facility settings before sending emails." }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

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
        JSON.stringify({ error: `Daily email limit (${DAILY_EMAIL_LIMIT}) reached. Try again tomorrow.` }),
        { status: 429, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

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

    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.7; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f6f8fb;">
  <div style="background: #fff; border-radius: 12px; padding: 36px; box-shadow: 0 2px 8px rgba(0,0,0,0.06);">
    <div style="border-bottom: 1px solid #e2e8f0; padding-bottom: 16px; margin-bottom: 24px;">
      <p style="margin: 0; font-size: 13px; color: #94a3b8;">From ${facility.name} via RehabLookup</p>
    </div>
    
    ${emailBody.split('\n').map(line => 
      line.trim() ? `<p style="margin: 0 0 14px 0; font-size: 15px;">${line}</p>` : ''
    ).join('')}
    
    <div style="border-top: 1px solid #e2e8f0; margin-top: 32px; padding-top: 20px;">
      <p style="font-size: 12px; color: #94a3b8; margin: 0;">
        Sent via <a href="https://rehablookup.com" style="color: #64748b;">RehabLookup</a> on behalf of ${facility.name}.<br>
        To stop receiving emails, reply with "unsubscribe".
      </p>
    </div>
  </div>
</body>
</html>
    `;

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
