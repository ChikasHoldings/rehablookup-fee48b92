import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";
import Stripe from "https://esm.sh/stripe@18.5.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// NEW MODEL: Free / Pro (pay-per-unlock)
// Pro product IDs (includes legacy professional + featured)
const PRO_PRODUCT_IDS = [
  "prod_TbalLOPujTIoUe", // legacy professional
  "prod_Tbyz1bf6iYyzYd", // professional  
  "prod_TbalOeJZA2ZoJl", // legacy featured
  "prod_TbyzJVNOQL71NN", // featured
];

interface LeadRequest {
  facilityId: string;
  facilityName: string;
  facilityEmail?: string | null;
  name: string;
  phone: string;
  email: string;
  message?: string | null;
  preferredContact: "call" | "email";
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
  const data = encoder.encode(ip + "_lead_salt_2024");
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.slice(0, 8).map(b => b.toString(16).padStart(2, "0")).join("");
}

// Check provider's subscription tier (free or pro)
// deno-lint-ignore no-explicit-any
async function getProviderPlan(
  supabase: any,
  userId: string,
  providerEmail: string
): Promise<{ planName: "free" | "pro" }> {
  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
  
  if (!stripeKey) {
    console.log("STRIPE_SECRET_KEY not set - defaulting to free plan");
    return { planName: "free" };
  }

  try {
    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const customers = await stripe.customers.list({ email: providerEmail, limit: 1 });
    
    if (customers.data.length > 0) {
      const subscriptions = await stripe.subscriptions.list({
        customer: customers.data[0].id,
        status: "active",
        limit: 1,
      });
      
      if (subscriptions.data.length > 0) {
        const productId = subscriptions.data[0].items.data[0].price.product as string;
        if (PRO_PRODUCT_IDS.includes(productId)) {
          return { planName: "pro" };
        }
      }
    }
    
    return { planName: "free" };
  } catch (error) {
    console.error("Error checking provider plan:", error);
    return { planName: "free" };
  }
}

// Email template for Free plan providers - shows locked lead and upgrade prompt
function getFreePlanUpgradeEmail(
  facilityName: string,
  totalLeadsCount: number,
  leadName: string
): { subject: string; html: string } {
  const billingUrl = "https://rehablookup.com/provider/billing";
  const dashboardUrl = "https://rehablookup.com/provider/leads";
  
  // Mask lead name: "John Smith" → "John S."
  const nameParts = leadName.trim().split(/\s+/);
  const maskedName = nameParts.length > 1 
    ? `${nameParts[0]} ${nameParts[nameParts.length - 1].charAt(0).toUpperCase()}.`
    : nameParts[0];
  
  const subject = `🔒 ${maskedName} Just Inquired - Unlock to View Details`;
  
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
  <div style="background: linear-gradient(135deg, #1B365D 0%, #2C4A7F 100%); padding: 30px; border-radius: 12px 12px 0 0;">
    <h1 style="color: #fff; margin: 0; font-size: 24px;">🔒 New Lead Received!</h1>
    <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0 0;">${maskedName} just inquired about ${facilityName}</p>
  </div>
  
  <div style="background: #fff; border: 1px solid #e5e7eb; border-top: none; padding: 30px; border-radius: 0 0 12px 12px;">
    
    <!-- Lead Preview (Blurred) -->
    <div style="position: relative; margin-bottom: 24px;">
      <div style="background: #f9fafb; border-radius: 8px; padding: 20px; filter: blur(4px); user-select: none;">
        <p style="margin: 0 0 8px 0; font-size: 16px; color: #374151;">Name: ████████ ████████</p>
        <p style="margin: 0 0 8px 0; font-size: 16px; color: #374151;">Phone: (███) ███-████</p>
        <p style="margin: 0 0 8px 0; font-size: 16px; color: #374151;">Email: ████████@████.com</p>
        <p style="margin: 0; font-size: 16px; color: #374151;">Message: ████████ ████████ ████████...</p>
      </div>
      <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); background: rgba(27, 54, 93, 0.95); padding: 16px 24px; border-radius: 8px; text-align: center;">
        <p style="margin: 0; color: #fff; font-size: 14px; font-weight: 600;">🔒 Unlock to view details</p>
      </div>
    </div>
    
    <!-- Leads Counter -->
    <div style="background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border: 2px solid #C9A227; border-radius: 8px; padding: 20px; margin-bottom: 24px; text-align: center;">
      <p style="margin: 0 0 8px 0; font-size: 48px; font-weight: bold; color: #92400e;">${totalLeadsCount}</p>
      <p style="margin: 0; color: #92400e; font-size: 16px; font-weight: 600;">Lead${totalLeadsCount > 1 ? 's' : ''} Waiting to Unlock</p>
    </div>
    
    <!-- Unlock Message -->
    <div style="background: #dcfce7; border: 1px solid #bbf7d0; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
      <h3 style="margin: 0 0 12px 0; color: #166534; font-size: 16px;">🔓 Unlock leads to:</h3>
      <ul style="margin: 0; padding-left: 20px; color: #166534;">
        <li style="margin-bottom: 8px;">View complete contact details</li>
        <li style="margin-bottom: 8px;">Reach out directly to potential clients</li>
        <li style="margin-bottom: 8px;">Grow your patient base</li>
        <li>Pro subscribers get 20% off all unlocks!</li>
      </ul>
    </div>
    
    <!-- CTA Buttons -->
    <div style="text-align: center; margin-top: 28px;">
      <a href="${dashboardUrl}" style="display: inline-block; background: linear-gradient(135deg, #16a34a 0%, #15803d 100%); color: #fff; padding: 16px 40px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px; box-shadow: 0 4px 14px rgba(0, 0, 0, 0.2);">
        🔓 View & Unlock Leads
      </a>
    </div>
    
    <div style="text-align: center; margin-top: 16px;">
      <a href="${billingUrl}" style="display: inline-block; color: #6b7280; padding: 12px 32px; text-decoration: none; font-size: 14px;">
        Learn about Pro →
      </a>
    </div>
    
    <div style="background: #f3f4f6; border-radius: 8px; padding: 16px; margin-top: 24px; text-align: center;">
      <p style="margin: 0; color: #4b5563; font-size: 13px;">
        <strong>Pro subscription:</strong> $399/month · 20% off all lead unlocks · Featured placement
      </p>
    </div>
    
    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 32px 0;">
    
    <p style="font-size: 13px; color: #9ca3af; text-align: center; margin: 0;">
      This inquiry was submitted via <a href="https://rehablookup.com" style="color: #1B365D;">RehabLookup.com</a>
    </p>
  </div>
</body>
</html>
  `;
  
  return { subject, html };
}

// Email template for providers - lead contact info is masked until unlocked
function getLeadEmailTemplate(
  planName: string,
  facilityName: string,
  leadName: string,
  preferredContact: string
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
  const billingUrl = "https://rehablookup.com/provider/billing";
  
  // Mask lead name: "John Smith" → "John S."
  const nameParts = leadName.trim().split(/\s+/);
  const maskedName = nameParts.length > 1 
    ? `${nameParts[0]} ${nameParts[nameParts.length - 1].charAt(0).toUpperCase()}.`
    : nameParts[0];
  
  const isPro = planName === "pro";
  const subject = `🔒 New Lead: ${maskedName} is interested in ${facilityName}`;
  
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
  <div style="background: linear-gradient(135deg, ${isPro ? '#D4AF37 0%, #C9A227 100%' : '#1B365D 0%, #2C4A7F 100%'}); padding: 30px; border-radius: 12px 12px 0 0;">
    ${isPro ? '<span style="background: rgba(255,255,255,0.2); color: #fff; padding: 4px 12px; border-radius: 4px; font-size: 12px; font-weight: 600;">⭐ PRO</span>' : ''}
    <h1 style="color: #fff; margin: ${isPro ? '12px 0 0 0' : '0'}; font-size: 24px;">🔒 New Lead Received!</h1>
    <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0 0;">Someone is interested in ${facilityName}</p>
  </div>
  
  <div style="background: #fff; border: 1px solid #e5e7eb; border-top: none; padding: 30px; border-radius: 0 0 12px 12px;">
    <p style="font-size: 14px; color: #6b7280; margin: 0 0 20px 0;">
      Received on ${currentDate}
    </p>
    
    <div style="background: #dcfce7; border: 1px solid #bbf7d0; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
      <p style="margin: 0; color: #166534; font-weight: 600; font-size: 14px;">
        ⚡ Quick tip: Respond within 5 minutes to increase your conversion rate by 400%!
      </p>
    </div>
    
    <div style="background: #f9fafb; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
      <h2 style="margin: 0 0 16px 0; font-size: 18px; color: #1B365D;">🔒 Lead Details</h2>
      
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 10px 0; color: #6b7280; width: 140px; vertical-align: top;">Name:</td>
          <td style="padding: 10px 0; font-weight: 600; font-size: 16px;">${maskedName}</td>
        </tr>
        <tr>
          <td style="padding: 10px 0; color: #6b7280; vertical-align: top;">Phone:</td>
          <td style="padding: 10px 0;">
            <span style="background: #fef3c7; color: #92400e; padding: 4px 12px; border-radius: 4px; font-size: 14px;">🔒 Unlock to view</span>
          </td>
        </tr>
        <tr>
          <td style="padding: 10px 0; color: #6b7280; vertical-align: top;">Email:</td>
          <td style="padding: 10px 0;">
            <span style="background: #fef3c7; color: #92400e; padding: 4px 12px; border-radius: 4px; font-size: 14px;">🔒 Unlock to view</span>
          </td>
        </tr>
        <tr>
          <td style="padding: 10px 0; color: #6b7280; vertical-align: top;">Prefers:</td>
          <td style="padding: 10px 0; text-transform: capitalize;">${preferredContact}</td>
        </tr>
      </table>
    </div>
    
    <div style="background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
      <p style="margin: 0; color: #1e40af; font-size: 14px;">
        💡 <strong>Unlock this lead</strong> to view full contact details and message.${isPro ? ' You get 20% off as a Pro subscriber!' : ' Pro subscribers get 20% off all lead unlocks!'}
      </p>
    </div>
    
    <div style="text-align: center; margin-top: 28px;">
      <a href="${dashboardUrl}" style="display: inline-block; background: linear-gradient(135deg, #16a34a 0%, #15803d 100%); color: #fff; padding: 16px 40px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px; box-shadow: 0 4px 14px rgba(0, 0, 0, 0.2);">
        View & Unlock Lead
      </a>
    </div>
    
    ${!isPro ? `
    <div style="text-align: center; margin-top: 16px;">
      <a href="${billingUrl}" style="display: inline-block; color: #6b7280; padding: 12px 32px; text-decoration: none; font-size: 14px;">
        Upgrade to Pro for 20% off →
      </a>
    </div>
    ` : ''}
    
    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 32px 0;">
    
    <p style="font-size: 13px; color: #9ca3af; text-align: center; margin: 0;">
      This lead was submitted via <a href="https://rehablookup.com" style="color: #1B365D;">RehabLookup.com</a>
    </p>
  </div>
</body>
</html>
  `;
  
  return { subject, html };
}

// Rate limiting constants
const MAX_LEADS_PER_IP_PER_DAY = 10;
const DUPLICATE_WINDOW_HOURS = 24;

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body: LeadRequest = await req.json();
    
    // Get client IP for rate limiting
    const clientIP = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || 
                     req.headers.get("cf-connecting-ip") || 
                     "unknown";
    const ipHash = await hashIP(clientIP);
    
    console.log("Lead submission received:", JSON.stringify({
      facilityId: body.facilityId,
      facilityName: body.facilityName,
      preferredContact: body.preferredContact,
      ipHash: ipHash,
    }));

    // ============ INPUT VALIDATION ============
    
    if (!body.facilityId || !body.name || !body.phone || !body.email) {
      console.error("Missing required fields");
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const sanitizedName = sanitizeInput(body.name, 100);
    const sanitizedPhone = sanitizeInput(body.phone, 20);
    const sanitizedEmail = sanitizeInput(body.email.toLowerCase(), 255);
    const sanitizedMessage = body.message ? sanitizeInput(body.message, 1000) : null;

    if (!isValidEmail(sanitizedEmail)) {
      console.error("Invalid email format:", sanitizedEmail);
      return new Response(
        JSON.stringify({ error: "Invalid email format", code: "INVALID_EMAIL" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    if (!isValidPhone(sanitizedPhone)) {
      console.error("Invalid phone format:", sanitizedPhone);
      return new Response(
        JSON.stringify({ error: "Invalid phone number format", code: "INVALID_PHONE" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    if (sanitizedName.length < 2) {
      console.error("Name too short");
      return new Response(
        JSON.stringify({ error: "Name is too short", code: "INVALID_NAME" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Create Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // ============ RATE LIMITING ============
    
    const oneDayAgo = new Date();
    oneDayAgo.setHours(oneDayAgo.getHours() - 24);
    
    const { count: ipLeadCount } = await supabase
      .from("leads")
      .select("*", { count: "exact", head: true })
      .eq("ip_hash", ipHash)
      .gte("created_at", oneDayAgo.toISOString());
    
    if (ipLeadCount && ipLeadCount >= MAX_LEADS_PER_IP_PER_DAY) {
      console.warn("Rate limit exceeded for IP hash:", ipHash);
      return new Response(
        JSON.stringify({ 
          error: "Too many requests. Please try again later.", 
          code: "RATE_LIMITED" 
        }),
        { status: 429, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // ============ DUPLICATE DETECTION ============
    
    const duplicateWindowStart = new Date();
    duplicateWindowStart.setHours(duplicateWindowStart.getHours() - DUPLICATE_WINDOW_HOURS);
    
    const { data: existingLead } = await supabase
      .from("leads")
      .select("id, created_at")
      .eq("facility_id", body.facilityId)
      .eq("email", sanitizedEmail)
      .gte("created_at", duplicateWindowStart.toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    
    if (existingLead) {
      console.warn("Duplicate lead detected:", { 
        facilityId: body.facilityId, 
        email: sanitizedEmail,
        existingLeadId: existingLead.id 
      });
      return new Response(
        JSON.stringify({ 
          error: "You've already submitted a request to this facility recently. They will contact you soon.", 
          code: "DUPLICATE" 
        }),
        { status: 409, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // ============ FACILITY VERIFICATION ============
    
    const { data: facility, error: facilityError } = await supabase
      .from("facilities")
      .select("id, status, email, name, user_id, city, state, phone")
      .eq("id", body.facilityId)
      .eq("status", "approved")
      .maybeSingle();

    if (facilityError || !facility) {
      console.error("Facility not found or not approved:", facilityError);
      return new Response(
        JSON.stringify({ error: "Facility not found or not approved" }),
        { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Get provider's profile email and notification preferences
    let providerEmail: string | null = null;
    let notificationPrefs: { 
      lead_notification_frequency?: string; 
      notify_new_leads?: boolean;
    } | null = null;
    
    if (facility.user_id) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("email")
        .eq("user_id", facility.user_id)
        .maybeSingle();
      providerEmail = profile?.email || null;
      
      const { data: prefs } = await supabase
        .from("notification_preferences")
        .select("lead_notification_frequency, notify_new_leads")
        .eq("user_id", facility.user_id)
        .maybeSingle();
      notificationPrefs = prefs;
    }

    // ============ GET PROVIDER PLAN ============
    let planResult = { planName: "free" as "free" | "pro" };
    
    if (providerEmail && facility.user_id) {
      planResult = await getProviderPlan(supabase, facility.user_id, providerEmail);
    }
    
    console.log(`Provider plan: ${planResult.planName}`);

    // ============ CREATE LEAD ============
    // All leads are created and assigned - providers unlock them to see contact details
    const { data: lead, error: leadError } = await supabase
      .from("leads")
      .insert({
        facility_id: body.facilityId,
        name: sanitizedName,
        phone: sanitizedPhone,
        email: sanitizedEmail,
        message: sanitizedMessage,
        preferred_contact: body.preferredContact,
        ip_hash: ipHash,
        validation_status: "valid",
        source: "Direct",
        qualified: true,
        quality_flag: "qualified",
        assignment_status: "assigned",
        assignment_reason: `Direct inquiry to ${body.facilityName}`,
        assigned_at: new Date().toISOString(),
        exclusivity: "exclusive",
      })
      .select()
      .single();

    if (leadError) {
      console.error("Failed to create lead:", leadError);
      return new Response(
        JSON.stringify({ error: "Failed to create lead" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log("Lead created successfully:", lead.id);

    // ============ CREATE ROUTING LOG ============
    try {
      await supabase.from("lead_routing_logs").insert({
        lead_id: lead.id,
        assigned_provider_id: body.facilityId,
        assignment_reason: `Direct inquiry to ${body.facilityName}`,
        plan_tier: planResult.planName,
        subscription_status: planResult.planName === "pro" ? "active" : "none",
        lead_limit: 0, // No limits in pay-per-unlock model
        used_leads: 0,
        routing_source: "direct",
        requested_facility_id: body.facilityId,
        eligibility_check_result: {
          source: "direct_profile_form",
          facility_name: body.facilityName,
          plan_name: planResult.planName,
          model: "pay-per-unlock",
          timestamp: new Date().toISOString(),
        },
      });
      console.log("Routing log created for lead:", lead.id);
    } catch (routingLogError) {
      console.error("Failed to create routing log:", routingLogError);
    }

    // ============ EMAIL NOTIFICATION ============
    
    const shouldSendInstantEmail = 
      (notificationPrefs?.notify_new_leads !== false) &&
      (notificationPrefs?.lead_notification_frequency === 'instant' || !notificationPrefs?.lead_notification_frequency);
    
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    
    if (providerEmail && resendApiKey && shouldSendInstantEmail) {
      try {
        const resend = new Resend(resendApiKey);
        
        const { subject, html } = getLeadEmailTemplate(
          planResult.planName,
          body.facilityName,
          sanitizedName,
          body.preferredContact
        );

        const emailRecipients: string[] = [];
        if (facility.email) emailRecipients.push(facility.email);
        if (providerEmail && providerEmail !== facility.email) {
          emailRecipients.push(providerEmail);
        }

        if (emailRecipients.length > 0) {
          await resend.emails.send({
            from: "RehabLookup <no-reply@rehablookup.com>",
            to: emailRecipients,
            subject,
            html,
          });
          console.log("Lead notification email sent to:", emailRecipients);
        }
      } catch (emailError) {
        console.error("Failed to send email notification:", emailError);
      }
    }

    // ============ IN-APP NOTIFICATION ============
    if (facility.user_id) {
      try {
        // Mask lead name: "John Smith" → "John S."
        const nameParts = sanitizedName.trim().split(/\s+/);
        const maskedName = nameParts.length > 1 
          ? `${nameParts[0]} ${nameParts[nameParts.length - 1].charAt(0).toUpperCase()}.`
          : nameParts[0];
        
        await supabase
          .from("provider_notifications")
          .insert({
            user_id: facility.user_id,
            facility_id: body.facilityId,
            type: "lead_received",
            title: `🎉 You have a new lead!`,
            message: `${maskedName} is interested in ${body.facilityName}. Unlock to view contact details.`,
            metadata: {
              lead_id: lead.id,
              lead_name: maskedName,
              // SECURITY: Do NOT include lead_email or lead_phone here
            },
          });
        console.log("In-app notification created for user:", facility.user_id);
      } catch (notifError) {
        console.error("Failed to create in-app notification:", notifError);
      }
    }

    return new Response(
      JSON.stringify({ success: true, leadId: lead.id }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: unknown) {
    console.error("Error in submit-lead function:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
