// Deno.serve() is built-in - no import needed
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Welcome email variants - only one can be sent per lead (across all providers)
const WELCOME_TEMPLATE_IDS = [
  "welcome_warm",
  "welcome_professional", 
  "welcome_personal",
  "welcome_hope",
  "welcome_practical"
];

// Follow-up templates - 24-hour cooldown per template per lead
const FOLLOWUP_TEMPLATE_IDS = [
  "next_steps",
  "scheduling_call",
  "gentle_followup"
];

const COOLDOWN_HOURS = 24;

// Email templates - shorter, human, no em dashes
const templates: Record<string, { name: string; subject: string; body: string; category: string }> = {
  // Welcome variants (only one per lead)
  welcome_warm: {
    name: "Warm Welcome",
    category: "Welcome",
    subject: "Thanks for reaching out to {{facilityName}}",
    body: `Hi {{leadName}},

Thank you for reaching out to {{facilityName}}. We received your request and want you to know we're here to help.

{{customNote}}

Taking this step takes courage, and we appreciate your trust. Our team is ready to answer your questions about our programs, insurance, and what to expect.

We'll be in touch soon.

Warmly,
{{senderName}}
{{facilityName}}`,
  },
  welcome_professional: {
    name: "Professional Introduction",
    category: "Welcome",
    subject: "Your request has been received - {{facilityName}}",
    body: `Hi {{leadName}},

Thank you for contacting {{facilityName}}. Your request has been received by our admissions team.

{{customNote}}

We specialize in evidence-based treatment programs with experienced clinical staff. Our team will review your information and reach out to discuss how we can best support your recovery goals.

Best regards,
{{senderName}}
{{facilityName}}`,
  },
  welcome_personal: {
    name: "Personal Touch",
    category: "Welcome",
    subject: "A personal note from our team - {{facilityName}}",
    body: `Hi {{leadName}},

I wanted to personally reach out after receiving your request. At {{facilityName}}, we believe every person's journey is unique, and we're honored you're considering us.

{{customNote}}

Recovery is possible. I've seen it happen for so many people who started exactly where you are now. We're here to support you every step of the way.

Looking forward to connecting with you,
{{senderName}}
{{facilityName}}`,
  },
  welcome_hope: {
    name: "Message of Hope",
    category: "Welcome",
    subject: "Your journey to recovery starts here - {{facilityName}}",
    body: `Hi {{leadName}},

Thank you for taking this important step. Reaching out is often the hardest part, and we want you to know that hope and healing are absolutely possible.

{{customNote}}

At {{facilityName}}, we've helped many people transform their lives. You don't have to face this alone. Our compassionate team is ready to walk alongside you on your path to recovery.

With hope,
{{senderName}}
{{facilityName}}`,
  },
  welcome_practical: {
    name: "Practical Next Steps",
    category: "Welcome",
    subject: "Here's what happens next - {{facilityName}}",
    body: `Hi {{leadName}},

Thanks for your request to {{facilityName}}. Here's what you can expect from us:

1. We'll call within 24 hours to learn about your situation
2. We'll verify your insurance coverage at no cost
3. We'll answer all your questions honestly
4. If we're a good fit, we'll help you get started

{{customNote}}

No pressure, no obligations. We're simply here to help.

Best,
{{senderName}}
{{facilityName}}`,
  },

  // Other templates (can be sent multiple times)
  next_steps: {
    name: "Next Steps",
    category: "Follow-up",
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
    category: "Logistics",
    subject: "Insurance info from {{facilityName}}",
    body: `Hi {{leadName}},

Thanks for asking about treatment at {{facilityName}}. I wanted to follow up on insurance and availability.

{{customNote}}

We work with most major insurance plans and offer flexible payment options. Our team can verify your specific coverage and explain any costs upfront.

Good news: we currently have openings and can often get you started within a few days.

Best,
{{senderName}}
{{facilityName}}`,
  },
  scheduling_call: {
    name: "Schedule a Call",
    category: "Follow-up",
    subject: "Let's talk - {{facilityName}}",
    body: `Hi {{leadName}},

We'd love to speak with you about how {{facilityName}} can help.

{{customNote}}

Are you available for a quick call in the next day or two? Our team is here Monday through Friday, 8am to 8pm, and weekends 9am to 5pm.

Looking forward to connecting,
{{senderName}}
{{facilityName}}`,
  },
  gentle_followup: {
    name: "Gentle Follow-up",
    category: "Follow-up",
    subject: "Checking in - {{facilityName}}",
    body: `Hi {{leadName}},

I wanted to reach out and see how you're doing. Recovery is a journey that happens on your own timeline, and there's no pressure to rush into anything.

{{customNote}}

I understand that taking the first step can feel daunting, and it's completely okay to have questions or hesitations. We're here whenever you're ready to talk.

If your circumstances have changed or you have new questions, please don't hesitate to reach out. Our door is always open.

Wishing you well,
{{senderName}}
{{facilityName}}`,
  },
};

interface SendEmailRequest {
  leadId: string;
  templateId: string;
  customNote?: string;
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
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "No authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json", ...corsHeaders } }
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
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json", ...corsHeaders } }
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
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json", ...corsHeaders } }
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
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Check if this is a welcome template and if any welcome template was already sent to this lead
    const isWelcomeTemplate = WELCOME_TEMPLATE_IDS.includes(templateId);
    if (isWelcomeTemplate) {
      const { data: existingWelcomeEmails } = await supabase
        .from("lead_emails")
        .select("template_id")
        .eq("lead_id", leadId)
        .in("template_id", WELCOME_TEMPLATE_IDS);

      if (existingWelcomeEmails && existingWelcomeEmails.length > 0) {
        const sentTemplate = templates[existingWelcomeEmails[0].template_id];
        console.log("Welcome template already sent to this lead:", existingWelcomeEmails[0].template_id);
        return new Response(
          JSON.stringify({ 
            error: `A welcome email ("${sentTemplate?.name || 'Welcome'}") has already been sent to this lead. Please choose a different template type.` 
          }),
          { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json", ...corsHeaders } }
        );
      }
    }

    // Check 24-hour cooldown for follow-up templates
    const isFollowupTemplate = FOLLOWUP_TEMPLATE_IDS.includes(templateId);
    if (isFollowupTemplate) {
      const cooldownTime = new Date();
      cooldownTime.setHours(cooldownTime.getHours() - COOLDOWN_HOURS);
      
      const { data: recentFollowupEmail } = await supabase
        .from("lead_emails")
        .select("created_at, template_name")
        .eq("lead_id", leadId)
        .eq("template_id", templateId)
        .gte("created_at", cooldownTime.toISOString())
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (recentFollowupEmail) {
        const sentAt = new Date(recentFollowupEmail.created_at);
        const availableAt = new Date(sentAt.getTime() + COOLDOWN_HOURS * 60 * 60 * 1000);
        const hoursRemaining = Math.ceil((availableAt.getTime() - Date.now()) / (1000 * 60 * 60));
        
        console.log("Follow-up template on cooldown:", templateId, "available in", hoursRemaining, "hours");
        return new Response(
          JSON.stringify({ 
            error: `This follow-up email was sent recently. Please wait ${hoursRemaining} hour${hoursRemaining !== 1 ? 's' : ''} before sending "${template.name}" again to this lead.` 
          }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json", ...corsHeaders } }
        );
      }
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
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const senderName = `${profile.first_name} ${profile.last_name}`;

    // Check if user is an admin
    const { data: adminRole } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();
    
    const isAdmin = !!adminRole;
    console.log("User role check:", { userId: user.id, isAdmin });

    // First, get the lead to determine which facility it belongs to
    const { data: leadCheck, error: leadCheckError } = await supabase
      .from("leads")
      .select("id, name, email, facility_id")
      .eq("id", leadId)
      .maybeSingle();

    if (leadCheckError || !leadCheck) {
      console.error("Lead not found:", leadCheckError);
      return new Response(
        JSON.stringify({ error: "Lead not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Get facility - either from lead's facility_id (for admins) or user's owned facility
    let facility;
    let facilityError;

    if (isAdmin && leadCheck.facility_id) {
      // Admin can send emails for any facility the lead is assigned to
      const result = await supabase
        .from("facilities")
        .select("id, name, email, reply_email, user_id")
        .eq("id", leadCheck.facility_id)
        .maybeSingle();
      facility = result.data;
      facilityError = result.error;
      console.log("Admin accessing facility:", { facilityId: leadCheck.facility_id, found: !!facility });
    } else {
      // Regular provider - get their facility that has this lead assigned
      // If the lead has a facility_id, use that to match the user's facility
      if (leadCheck.facility_id) {
        const result = await supabase
          .from("facilities")
          .select("id, name, email, reply_email, user_id")
          .eq("id", leadCheck.facility_id)
          .eq("user_id", user.id)
          .maybeSingle();
        facility = result.data;
        facilityError = result.error;
      } else {
        // Lead has no facility, get the user's first facility
        const result = await supabase
          .from("facilities")
          .select("id, name, email, reply_email, user_id")
          .eq("user_id", user.id)
          .limit(1)
          .maybeSingle();
        facility = result.data;
        facilityError = result.error;
      }
    }

    if (facilityError || !facility) {
      console.error("Facility not found:", facilityError);
      return new Response(
        JSON.stringify({ error: "Facility not found. The lead may not be assigned to a facility yet." }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // For non-admins, verify they own the facility the lead is assigned to
    if (!isAdmin && leadCheck.facility_id !== facility.id) {
      console.error("Access denied: Lead belongs to different facility");
      return new Response(
        JSON.stringify({ error: "Access denied: This lead is not assigned to your facility" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // CRITICAL: For non-admins, verify the lead is unlocked before allowing email
    if (!isAdmin) {
      const { data: unlockRecord, error: unlockError } = await supabase
        .from("lead_unlocks")
        .select("id")
        .eq("lead_id", leadId)
        .eq("facility_id", facility.id)
        .maybeSingle();

      if (unlockError) {
        console.error("Error checking unlock status:", unlockError);
        return new Response(
          JSON.stringify({ error: "Failed to verify lead unlock status" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      if (!unlockRecord) {
        console.error("Access denied: Lead is not unlocked for this facility", { leadId, facilityId: facility.id });
        return new Response(
          JSON.stringify({ error: "You must unlock this lead before sending emails. Unlock the lead to access contact information." }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json", ...corsHeaders } }
        );
      }
      console.log("Lead unlock verified:", { leadId, facilityId: facility.id, unlockId: unlockRecord.id });
    }

    const replyToEmail = facility.reply_email || facility.email || profile.email;
    if (!replyToEmail) {
      console.error("No reply email configured");
      return new Response(
        JSON.stringify({ error: "Please set a reply email in the facility settings before sending emails." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Use the already fetched lead data
    const lead = leadCheck;

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
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json", ...corsHeaders } }
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
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${emailSubject}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f6f9; -webkit-font-smoothing: antialiased;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f6f9;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08);">
          
          <!-- Header -->
          <tr>
            <td style="padding: 24px 32px; border-bottom: 1px solid #e2e8f0;">
              <p style="margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; font-size: 14px; color: #94a3b8;">
                From ${facility.name} via RehabLookup
              </p>
            </td>
          </tr>
          
          <!-- Body -->
          <tr>
            <td style="padding: 40px 32px;">
              ${emailBody.split('\n').map(line => 
                line.trim() ? `<p style="margin: 0 0 18px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; font-size: 16px; color: #374151; line-height: 1.7;">${line}</p>` : ''
              ).join('')}
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #1B365D; background: #1B365D; padding: 28px 32px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding-bottom: 12px;">
                    <p style="margin: 0; font-family: Arial, Helvetica, sans-serif; font-size: 18px; font-weight: 700; color: #ffffff;">
                      RehabLookup
                    </p>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding-bottom: 16px;">
                    <p style="margin: 0; font-family: Arial, Helvetica, sans-serif; font-size: 13px; color: #cbd5e1;">
                      Connecting families with trusted treatment providers
                    </p>
                  </td>
                </tr>
                <tr>
                  <td align="center">
                    <p style="margin: 0; font-family: Arial, Helvetica, sans-serif; font-size: 12px; color: #94a3b8;">
                      Sent on behalf of ${facility.name}. To stop receiving emails, email <a href="mailto:Support@rehablookup.com" style="color: #93c5fd; text-decoration: none;">Support@rehablookup.com</a>
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
    `;

    const resend = new Resend(resendApiKey);
    
    console.log("Sending email with Reply-To:", replyToEmail);
    
    const emailResponse = await resend.emails.send({
      from: "RehabLookup <no-reply@rehablookup.com>",
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

    // Auto-update lead status to "contacted" if currently "new"
    const { error: statusError } = await supabase
      .from("leads")
      .update({ status: "contacted" })
      .eq("id", lead.id)
      .eq("status", "new");

    if (statusError) {
      console.error("Failed to auto-update lead status:", statusError);
    } else {
      console.log("Lead status auto-updated to contacted for lead:", lead.id);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        emailId: emailLog?.id,
        message: `Email sent to ${lead.name}` 
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json", ...corsHeaders } }
    );

  } catch (error: unknown) {
    console.error("Error in send-lead-email function:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
