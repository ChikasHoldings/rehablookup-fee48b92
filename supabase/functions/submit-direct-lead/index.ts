import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface DirectLeadRequest {
  facilityId: string;
  facilityName: string;
  facilityEmail?: string | null;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  message?: string | null;
}

// Validation helpers
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 255;
}

function isValidPhone(phone: string): boolean {
  const digits = phone.replace(/[\s\-\(\)\+\.]/g, "");
  return /^\d{10,15}$/.test(digits);
}

function sanitizeInput(input: string, maxLength: number): string {
  return input.trim().slice(0, maxLength);
}

// Hash IP for rate limiting
async function hashIP(ip: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(ip + "_direct_lead_salt_2024");
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.slice(0, 8).map(b => b.toString(16).padStart(2, "0")).join("");
}

// Direct lead email template
function getDirectLeadEmail(
  facilityName: string,
  leadFirstName: string,
  leadLastName: string,
  leadPhone: string,
  leadEmail: string,
  message: string | null,
  supabaseUrl: string
): { subject: string; html: string } {
  const currentDate = new Date().toLocaleDateString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
  
  const dashboardUrl = "https://rehablookup.com/provider/leads";
  const fullName = `${leadFirstName} ${leadLastName}`;
  
  const subject = `📞 Direct Inquiry: ${fullName} wants to connect with ${facilityName}`;
  
  const messageSection = message ? `
    <tr>
      <td style="padding: 10px 0; color: #6b7280; vertical-align: top;">Message:</td>
      <td style="padding: 10px 0; color: #374151;">${message}</td>
    </tr>
  ` : '';
  
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
  <div style="background: linear-gradient(135deg, #16a34a 0%, #15803d 100%); padding: 30px; border-radius: 12px 12px 0 0;">
    <h1 style="color: #fff; margin: 0; font-size: 24px;">📞 Direct Profile Inquiry</h1>
    <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0 0;">Someone reached out directly from your profile</p>
  </div>
  
  <div style="background: #fff; border: 1px solid #e5e7eb; border-top: none; padding: 30px; border-radius: 0 0 12px 12px;">
    <p style="font-size: 14px; color: #6b7280; margin: 0 0 20px 0;">
      Received on ${currentDate}
    </p>
    
    <div style="background: #dcfce7; border: 1px solid #bbf7d0; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
      <p style="margin: 0; color: #166534; font-weight: 600; font-size: 14px;">
        💚 This is a direct inquiry from your public profile - the user specifically chose ${facilityName}!
      </p>
    </div>
    
    <div style="background: #f9fafb; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
      <h2 style="margin: 0 0 16px 0; font-size: 18px; color: #1B365D;">Contact Details</h2>
      
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 10px 0; color: #6b7280; width: 140px; vertical-align: top;">Name:</td>
          <td style="padding: 10px 0; font-weight: 600; font-size: 16px;">${fullName}</td>
        </tr>
        <tr>
          <td style="padding: 10px 0; color: #6b7280; vertical-align: top;">Phone:</td>
          <td style="padding: 10px 0;">
            <a href="tel:${leadPhone}" style="color: #1B365D; text-decoration: none; font-weight: 600; font-size: 16px;">${leadPhone}</a>
          </td>
        </tr>
        <tr>
          <td style="padding: 10px 0; color: #6b7280; vertical-align: top;">Email:</td>
          <td style="padding: 10px 0;">
            <a href="mailto:${leadEmail}" style="color: #1B365D; text-decoration: none;">${leadEmail}</a>
          </td>
        </tr>
        ${messageSection}
      </table>
    </div>
    
    <div style="text-align: center; margin-top: 28px;">
      <a href="tel:${leadPhone}" style="display: inline-block; background: linear-gradient(135deg, #16a34a 0%, #15803d 100%); color: #fff; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px; margin-right: 12px;">
        📞 Call Now
      </a>
      <a href="mailto:${leadEmail}" style="display: inline-block; background: #fff; color: #1B365D; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px; border: 2px solid #1B365D;">
        ✉️ Send Email
      </a>
    </div>
    
    <div style="text-align: center; margin-top: 16px;">
      <a href="${dashboardUrl}" style="display: inline-block; color: #6b7280; padding: 12px 32px; text-decoration: none; font-size: 14px;">
        View in Dashboard →
      </a>
    </div>
    
    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 32px 0;">
    
    <div style="background: #f0fdf4; border-radius: 8px; padding: 16px; margin-bottom: 20px;">
      <p style="margin: 0; color: #166534; font-size: 13px;">
        <strong>Note:</strong> Direct profile inquiries do not count toward your monthly lead limits. They're unlimited for all plans!
      </p>
    </div>
    
    <p style="font-size: 13px; color: #9ca3af; text-align: center; margin: 0;">
      This inquiry was submitted via your profile on <a href="https://rehablookup.com" style="color: #1B365D;">RehabLookup.com</a>
    </p>
  </div>
</body>
</html>
  `;
  
  return { subject, html };
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendKey = Deno.env.get("RESEND_API_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body: DirectLeadRequest = await req.json();
    console.log("Direct lead submission received:", { 
      facilityId: body.facilityId, 
      facilityName: body.facilityName 
    });

    // Validate required fields
    if (!body.facilityId || !body.firstName || !body.lastName || !body.email || !body.phone) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Sanitize inputs
    const firstName = sanitizeInput(body.firstName, 50);
    const lastName = sanitizeInput(body.lastName, 50);
    const email = sanitizeInput(body.email.toLowerCase(), 255);
    const phone = sanitizeInput(body.phone, 20);
    const message = body.message ? sanitizeInput(body.message, 1000) : null;
    const fullName = `${firstName} ${lastName}`;

    // Validate email and phone
    if (!isValidEmail(email)) {
      return new Response(
        JSON.stringify({ error: "INVALID_EMAIL" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!isValidPhone(phone)) {
      return new Response(
        JSON.stringify({ error: "INVALID_PHONE" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get IP for rate limiting
    const clientIP = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || 
                     req.headers.get("x-real-ip") || 
                     "unknown";
    const ipHash = await hashIP(clientIP);

    // Check for recent submissions from same IP/email (rate limiting)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count: recentCount } = await supabase
      .from("leads")
      .select("*", { count: "exact", head: true })
      .eq("facility_id", body.facilityId)
      .or(`email.eq.${email},ip_hash.eq.${ipHash}`)
      .gte("created_at", oneHourAgo);

    if ((recentCount || 0) >= 3) {
      console.log("Rate limit exceeded for direct lead:", { email, ipHash });
      return new Response(
        JSON.stringify({ error: "RATE_LIMITED" }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check for duplicate submission (same email + facility within 24h)
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: existingLead } = await supabase
      .from("leads")
      .select("id")
      .eq("facility_id", body.facilityId)
      .eq("email", email)
      .gte("created_at", oneDayAgo)
      .maybeSingle();

    if (existingLead) {
      console.log("Duplicate direct lead prevented:", { email, facilityId: body.facilityId });
      return new Response(
        JSON.stringify({ error: "DUPLICATE", message: "You've already submitted a request to this facility." }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify facility exists and is approved
    const { data: facility, error: facilityError } = await supabase
      .from("facilities")
      .select("id, user_id, status, email, name")
      .eq("id", body.facilityId)
      .eq("status", "approved")
      .maybeSingle();

    if (facilityError || !facility) {
      console.error("Facility not found or not approved:", body.facilityId);
      return new Response(
        JSON.stringify({ error: "Facility not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get provider profile for email
    const { data: profile } = await supabase
      .from("profiles")
      .select("email, first_name")
      .eq("user_id", facility.user_id)
      .maybeSingle();

    const providerEmail = profile?.email || facility.email;

    // Create the lead record
    // Direct leads are:
    // - source = "provider_profile_direct"
    // - qualified = true (auto-qualified as direct inquiry)
    // - assignment_status = "assigned" (directly assigned to this provider)
    // - Does NOT count toward qualified lead caps
    const { data: lead, error: leadError } = await supabase
      .from("leads")
      .insert({
        facility_id: body.facilityId,
        name: fullName,
        email: email,
        phone: phone,
        message: message,
        preferred_contact: "call",
        source: "provider_profile_direct",
        qualified: true,
        email_verified: false, // Direct leads skip email verification
        validation_status: "valid",
        assignment_status: "assigned",
        assignment_reason: "Direct profile inquiry",
        assigned_at: new Date().toISOString(),
        ip_hash: ipHash,
      })
      .select()
      .single();

    if (leadError) {
      console.error("Failed to create direct lead:", leadError);
      throw leadError;
    }

    console.log("Direct lead created successfully:", lead.id);

    // Log routing for admin visibility
    await supabase.from("lead_routing_logs").insert({
      lead_id: lead.id,
      assigned_provider_id: body.facilityId,
      assignment_reason: "Direct profile inquiry - routed to selected provider",
      routing_source: "direct_profile",
      eligibility_check_result: { direct_inquiry: true, skip_scoring: true },
    });

    // Send provider notification email
    if (providerEmail && resendKey) {
      try {
        const resend = new Resend(resendKey);
        const emailContent = getDirectLeadEmail(
          body.facilityName,
          firstName,
          lastName,
          phone,
          email,
          message,
          supabaseUrl
        );

        await resend.emails.send({
          from: "RehabLookup <no-reply@rehablookup.com>",
          to: [providerEmail],
          subject: emailContent.subject,
          html: emailContent.html,
        });

        console.log("Provider notification email sent to:", providerEmail);
      } catch (emailError) {
        console.error("Failed to send provider email:", emailError);
        // Non-blocking - lead is still created
      }
    }

    // Create in-app provider notification
    await supabase.from("provider_notifications").insert({
      user_id: facility.user_id,
      facility_id: body.facilityId,
      type: "new_lead",
      title: "New Direct Inquiry",
      message: `${fullName} submitted a direct inquiry from your profile.`,
      metadata: { lead_id: lead.id, source: "provider_profile_direct" },
    });

    // Send user confirmation email
    if (resendKey) {
      try {
        const resend = new Resend(resendKey);
        await resend.emails.send({
          from: "RehabLookup <no-reply@rehablookup.com>",
          to: [email],
          subject: `We've sent your request to ${body.facilityName}`,
          html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #1B365D 0%, #2C4A7F 100%); padding: 30px; border-radius: 12px 12px 0 0;">
    <h1 style="color: #fff; margin: 0; font-size: 24px;">Request Received</h1>
  </div>
  <div style="background: #fff; border: 1px solid #e5e7eb; border-top: none; padding: 30px; border-radius: 0 0 12px 12px;">
    <p style="font-size: 16px; color: #374151;">Hi ${firstName},</p>
    <p style="font-size: 16px; color: #374151;">
      We've forwarded your request to <strong>${body.facilityName}</strong>. They may contact you soon to discuss how they can help.
    </p>
    <div style="background: #f0fdf4; border-radius: 8px; padding: 16px; margin: 24px 0;">
      <p style="margin: 0; color: #166534; font-size: 14px;">
        <strong>What happens next?</strong><br>
        A representative from ${body.facilityName} may reach out by phone or email. There's no obligation to proceed.
      </p>
    </div>
    <p style="font-size: 14px; color: #6b7280;">
      If you have questions, visit <a href="https://rehablookup.com" style="color: #1B365D;">RehabLookup.com</a> or reply to this email.
    </p>
    <p style="font-size: 14px; color: #6b7280; margin-top: 24px;">
      Warm regards,<br>
      The RehabLookup Team
    </p>
  </div>
</body>
</html>
          `,
        });
        console.log("User confirmation email sent to:", email);
      } catch (userEmailError) {
        console.error("Failed to send user confirmation:", userEmailError);
      }
    }

    return new Response(
      JSON.stringify({ success: true, leadId: lead.id }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("Error in submit-direct-lead:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);