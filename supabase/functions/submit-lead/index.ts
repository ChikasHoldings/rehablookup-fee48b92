import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";
import Stripe from "https://esm.sh/stripe@18.5.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Plan configuration matching check-subscription
const PLAN_CONFIG: Record<string, { product_id: string | null; lead_limit: number }> = {
  basic: { product_id: null, lead_limit: 0 },
  professional: { product_id: "prod_TbalLOPujTIoUe", lead_limit: 25 },
  featured: { product_id: "prod_TbalOeJZA2ZoJl", lead_limit: 75 },
};

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

// Hash IP for rate limiting (privacy-preserving)
async function hashIP(ip: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(ip + "_lead_salt_2024");
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.slice(0, 8).map(b => b.toString(16).padStart(2, "0")).join("");
}

// Check provider's subscription and lead cap
async function checkProviderLeadCap(
  supabase: any,
  facilityUserId: string,
  providerEmail: string
): Promise<{ canReceiveLeads: boolean; reason?: string; leadLimit: number; usedLeads: number; planName: string }> {
  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
  
  if (!stripeKey) {
    console.error("STRIPE_SECRET_KEY not set - defaulting to basic plan");
    return { canReceiveLeads: false, reason: "Provider on Basic plan (0 leads)", leadLimit: 0, usedLeads: 0, planName: "basic" };
  }

  try {
    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    
    // Find Stripe customer by email
    const customers = await stripe.customers.list({ email: providerEmail, limit: 1 });
    
    let leadLimit = PLAN_CONFIG.basic.lead_limit; // Default to 0
    let planName = "basic";
    
    if (customers.data.length > 0) {
      const customerId = customers.data[0].id;
      
      // Check for active subscription
      const subscriptions = await stripe.subscriptions.list({
        customer: customerId,
        status: "active",
        limit: 1,
      });
      
      if (subscriptions.data.length > 0) {
        const subscription = subscriptions.data[0];
        const productId = subscription.items.data[0].price.product as string;
        
        // Determine lead limit based on product
        if (productId === PLAN_CONFIG.professional.product_id) {
          leadLimit = PLAN_CONFIG.professional.lead_limit;
          planName = "professional";
        } else if (productId === PLAN_CONFIG.featured.product_id) {
          leadLimit = PLAN_CONFIG.featured.lead_limit;
          planName = "featured";
        }
      }
    }
    
    // If no paid plan, they can't receive leads
    if (leadLimit === 0) {
      return { canReceiveLeads: false, reason: "Provider on Basic plan (0 leads)", leadLimit: 0, usedLeads: 0, planName };
    }
    
    // Count leads this month for all facilities owned by this provider
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    
    // Get all facility IDs for this user
    const { data: userFacilities } = await supabase
      .from("facilities")
      .select("id")
      .eq("user_id", facilityUserId);
    
    const facilityIds = (userFacilities as { id: string }[] || []).map(f => f.id);
    
    if (facilityIds.length === 0) {
      return { canReceiveLeads: true, leadLimit, usedLeads: 0, planName };
    }
    
    // Count all leads this month across all provider's facilities
    const { count: monthlyLeadCount } = await supabase
      .from("leads")
      .select("*", { count: "exact", head: true })
      .in("facility_id", facilityIds)
      .gte("created_at", startOfMonth.toISOString());
    
    const usedLeads = monthlyLeadCount || 0;
    
    if (usedLeads >= leadLimit) {
      return { 
        canReceiveLeads: false, 
        reason: `Provider has reached monthly lead limit (${usedLeads}/${leadLimit})`,
        leadLimit,
        usedLeads,
        planName
      };
    }
    
    return { canReceiveLeads: true, leadLimit, usedLeads, planName };
  } catch (error) {
    console.error("Error checking lead cap:", error);
    // On error, allow the lead through but log it
    return { canReceiveLeads: true, leadLimit: 999, usedLeads: 0, planName: "unknown" };
  }
}

// Send lead limit warning email
async function sendLeadLimitWarningEmail(
  providerEmail: string,
  facilityName: string,
  usedLeads: number,
  leadLimit: number,
  planName: string
): Promise<void> {
  const resendApiKey = Deno.env.get("RESEND_API_KEY");
  if (!resendApiKey) return;

  const resend = new Resend(resendApiKey);
  const percentage = Math.round((usedLeads / leadLimit) * 100);
  const remainingLeads = leadLimit - usedLeads;
  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";

  const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
  <div style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding: 30px; border-radius: 12px 12px 0 0;">
    <h1 style="color: #fff; margin: 0; font-size: 24px;">⚠️ Lead Limit Warning</h1>
    <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0 0;">You're approaching your monthly lead limit</p>
  </div>
  
  <div style="background: #fff; border: 1px solid #e5e7eb; border-top: none; padding: 30px; border-radius: 0 0 12px 12px;">
    <div style="background: #fef3c7; border: 1px solid #fcd34d; border-radius: 8px; padding: 20px; margin-bottom: 24px; text-align: center;">
      <p style="margin: 0 0 8px 0; font-size: 48px; font-weight: bold; color: #92400e;">${percentage}%</p>
      <p style="margin: 0; color: #92400e; font-size: 16px;">of your monthly lead limit used</p>
    </div>
    
    <div style="background: #f9fafb; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px 0; color: #6b7280;">Leads Used:</td>
          <td style="padding: 8px 0; font-weight: 600; text-align: right;">${usedLeads} of ${leadLimit}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6b7280;">Leads Remaining:</td>
          <td style="padding: 8px 0; font-weight: 600; text-align: right; color: ${remainingLeads <= 5 ? '#dc2626' : '#16a34a'};">${remainingLeads}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6b7280;">Current Plan:</td>
          <td style="padding: 8px 0; font-weight: 600; text-align: right; text-transform: capitalize;">${planName}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6b7280;">Facility:</td>
          <td style="padding: 8px 0; font-weight: 600; text-align: right;">${facilityName}</td>
        </tr>
      </table>
    </div>
    
    <p style="color: #4b5563; font-size: 15px; margin-bottom: 24px;">
      Once you reach your limit, new leads will be paused until next month. <strong>Upgrade your plan now</strong> to continue receiving valuable patient inquiries without interruption.
    </p>
    
    <div style="text-align: center; margin-top: 28px;">
      <a href="${supabaseUrl.replace('.supabase.co', '.lovable.app')}/provider/billing" style="display: inline-block; background: linear-gradient(135deg, #1B365D 0%, #2C4A7F 100%); color: #fff; padding: 16px 40px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px; box-shadow: 0 4px 14px rgba(27, 54, 93, 0.3);">
        🚀 Upgrade Your Plan
      </a>
    </div>
    
    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 32px 0;">
    
    <p style="font-size: 13px; color: #9ca3af; text-align: center; margin: 0;">
      This is an automated notification from <a href="https://rehablookup.com" style="color: #1B365D;">RehabLookup.com</a>
    </p>
  </div>
</body>
</html>
  `;

  try {
    await resend.emails.send({
      from: "RehabLookup <noreply@resend.dev>",
      to: [providerEmail],
      subject: `⚠️ Lead Limit Warning: ${percentage}% used (${remainingLeads} leads remaining)`,
      html: emailHtml,
    });
    console.log(`Lead limit warning email sent to ${providerEmail} (${usedLeads}/${leadLimit})`);
  } catch (error) {
    console.error("Failed to send lead limit warning email:", error);
  }
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
    
    // Required fields check
    if (!body.facilityId || !body.name || !body.phone || !body.email) {
      console.error("Missing required fields");
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Sanitize inputs
    const sanitizedName = sanitizeInput(body.name, 100);
    const sanitizedPhone = sanitizeInput(body.phone, 20);
    const sanitizedEmail = sanitizeInput(body.email.toLowerCase(), 255);
    const sanitizedMessage = body.message ? sanitizeInput(body.message, 1000) : null;

    // Validate email format
    if (!isValidEmail(sanitizedEmail)) {
      console.error("Invalid email format:", sanitizedEmail);
      return new Response(
        JSON.stringify({ error: "Invalid email format", code: "INVALID_EMAIL" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Validate phone format
    if (!isValidPhone(sanitizedPhone)) {
      console.error("Invalid phone format:", sanitizedPhone);
      return new Response(
        JSON.stringify({ error: "Invalid phone number format", code: "INVALID_PHONE" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Validate name (basic check for non-empty after sanitization)
    if (sanitizedName.length < 2) {
      console.error("Name too short");
      return new Response(
        JSON.stringify({ error: "Name is too short", code: "INVALID_NAME" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Create Supabase client with service role
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
      .select("id, status, email, name, user_id")
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

    // Get provider's profile email
    let providerEmail: string | null = null;
    if (facility.user_id) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("email")
        .eq("user_id", facility.user_id)
        .maybeSingle();
      providerEmail = profile?.email || null;
    }

    // ============ LEAD CAP ENFORCEMENT ============
    let capCheckResult: { canReceiveLeads: boolean; reason?: string; leadLimit: number; usedLeads: number; planName: string } | null = null;
    
    if (providerEmail && facility.user_id) {
      capCheckResult = await checkProviderLeadCap(supabase, facility.user_id, providerEmail);
      
      if (!capCheckResult.canReceiveLeads) {
        console.log(`Lead cap reached for facility ${body.facilityId}: ${capCheckResult.reason}`);
        
        // Return a user-friendly message - don't expose internal details
        return new Response(
          JSON.stringify({ 
            error: "This facility is not currently accepting new inquiries. Please try another facility or contact us directly.",
            code: "FACILITY_UNAVAILABLE"
          }),
          { status: 503, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }
      
      console.log(`Lead cap check passed: ${capCheckResult.usedLeads}/${capCheckResult.leadLimit} leads used`);
    }

    // ============ CREATE LEAD ============
    
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

    console.log("Lead created successfully:", lead.id, "Validation: valid");

    // ============ EMAIL NOTIFICATION ============
    
    const facilityEmailAddress = body.facilityEmail || facility.email;
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    
    const emailRecipients: string[] = [];
    if (facilityEmailAddress) emailRecipients.push(facilityEmailAddress);
    if (providerEmail && providerEmail !== facilityEmailAddress) emailRecipients.push(providerEmail);

    if (emailRecipients.length > 0 && resendApiKey) {
      try {
        const resend = new Resend(resendApiKey);
        
        const currentDate = new Date().toLocaleDateString('en-US', { 
          weekday: 'long', 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });

        const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
  <div style="background: linear-gradient(135deg, #1B365D 0%, #2C4A7F 100%); padding: 30px; border-radius: 12px 12px 0 0;">
    <h1 style="color: #fff; margin: 0; font-size: 24px;">🎉 New Lead Alert!</h1>
    <p style="color: rgba(255,255,255,0.8); margin: 8px 0 0 0;">Someone is interested in ${body.facilityName}</p>
  </div>
  
  <div style="background: #fff; border: 1px solid #e5e7eb; border-top: none; padding: 30px; border-radius: 0 0 12px 12px;">
    <p style="font-size: 14px; color: #6b7280; margin: 0 0 20px 0;">
      Received on ${currentDate}
    </p>
    
    <div style="background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%); border: 1px solid #bbf7d0; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
      <p style="margin: 0; color: #166534; font-weight: 600; font-size: 14px;">
        ⚡ Quick tip: Respond within 5 minutes to increase your conversion rate by 400%!
      </p>
    </div>
    
    <div style="background: #f9fafb; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
      <h2 style="margin: 0 0 16px 0; font-size: 18px; color: #1B365D;">Contact Details</h2>
      
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 10px 0; color: #6b7280; width: 140px; vertical-align: top;">Name:</td>
          <td style="padding: 10px 0; font-weight: 600; font-size: 16px;">${sanitizedName}</td>
        </tr>
        <tr>
          <td style="padding: 10px 0; color: #6b7280; vertical-align: top;">Phone:</td>
          <td style="padding: 10px 0;">
            <a href="tel:${sanitizedPhone}" style="color: #1B365D; text-decoration: none; font-weight: 600; font-size: 16px;">${sanitizedPhone}</a>
          </td>
        </tr>
        <tr>
          <td style="padding: 10px 0; color: #6b7280; vertical-align: top;">Email:</td>
          <td style="padding: 10px 0;">
            <a href="mailto:${sanitizedEmail}" style="color: #1B365D; text-decoration: none;">${sanitizedEmail}</a>
          </td>
        </tr>
        <tr>
          <td style="padding: 10px 0; color: #6b7280; vertical-align: top;">Prefers:</td>
          <td style="padding: 10px 0;">
            <span style="background: ${body.preferredContact === 'call' ? '#dcfce7' : '#dbeafe'}; color: ${body.preferredContact === 'call' ? '#166534' : '#1e40af'}; padding: 4px 12px; border-radius: 20px; font-size: 13px; font-weight: 500; text-transform: capitalize;">
              ${body.preferredContact === 'call' ? '📞 Phone Call' : '✉️ Email'}
            </span>
          </td>
        </tr>
      </table>
    </div>
    
    ${sanitizedMessage ? `
    <div style="background: #fef3c7; border: 1px solid #fcd34d; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
      <h3 style="margin: 0 0 12px 0; font-size: 14px; color: #92400e; text-transform: uppercase; letter-spacing: 0.5px;">💬 Their Message</h3>
      <p style="margin: 0; color: #78350f; font-size: 15px; line-height: 1.6;">${sanitizedMessage}</p>
    </div>
    ` : ''}
    
    <div style="text-align: center; margin-top: 28px;">
      <a href="tel:${sanitizedPhone}" style="display: inline-block; background: linear-gradient(135deg, #16a34a 0%, #15803d 100%); color: #fff; padding: 16px 40px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px; box-shadow: 0 4px 14px rgba(22, 163, 74, 0.3);">
        📞 Call ${sanitizedName.split(' ')[0]} Now
      </a>
    </div>
    
    <div style="text-align: center; margin-top: 16px;">
      <a href="mailto:${sanitizedEmail}" style="display: inline-block; background: #fff; color: #1B365D; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: 500; border: 2px solid #1B365D;">
        ✉️ Send Email
      </a>
    </div>
    
    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 32px 0;">
    
    <p style="font-size: 13px; color: #9ca3af; text-align: center; margin: 0;">
      This lead was submitted via <a href="https://rehablookup.com" style="color: #1B365D;">RehabLookup.com</a><br>
      <a href="${supabaseUrl.replace('.supabase.co', '.lovable.app')}/provider/leads" style="color: #1B365D; font-weight: 500;">View all leads in your dashboard →</a>
    </p>
  </div>
</body>
</html>
        `;

        const emailResponse = await resend.emails.send({
          from: "RehabLookup <noreply@resend.dev>",
          to: emailRecipients,
          subject: `🔔 New Lead: ${sanitizedName} is interested in ${body.facilityName}`,
          html: emailHtml,
        });

        console.log("Email notification sent to:", emailRecipients, "Response:", emailResponse);
      } catch (emailError) {
        console.error("Failed to send email notification:", emailError);
      }
    } else {
      console.log("Email notification skipped - no recipients or API key");
    }

    // ============ LEAD LIMIT WARNING EMAIL ============
    // Send warning email if provider is at or above 80% of their lead limit
    if (capCheckResult && providerEmail && capCheckResult.leadLimit > 0) {
      const newUsedLeads = capCheckResult.usedLeads + 1; // Account for the lead we just created
      const usagePercentage = (newUsedLeads / capCheckResult.leadLimit) * 100;
      
      if (usagePercentage >= 80) {
        await sendLeadLimitWarningEmail(
          providerEmail,
          body.facilityName,
          newUsedLeads,
          capCheckResult.leadLimit,
          capCheckResult.planName
        );
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
