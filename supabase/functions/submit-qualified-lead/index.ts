import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";
import Stripe from "https://esm.sh/stripe@18.5.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Plan configuration matching check-subscription
const PLAN_CONFIG: Record<string, { product_id: string | null; lead_limit: number; qualified_lead_limit: number }> = {
  basic: { product_id: null, lead_limit: 4, qualified_lead_limit: 4 },
  professional: { product_id: "prod_TbalLOPujTIoUe", lead_limit: 25, qualified_lead_limit: 25 },
  featured: { product_id: "prod_TbalOeJZA2ZoJl", lead_limit: 75, qualified_lead_limit: 75 },
};

interface QualifiedLeadRequest {
  facilityId?: string;
  whoSeekingHelp: string;
  locationZip: string;
  locationCityState?: string;
  urgency: string;
  primarySubstance: string[];
  levelOfCare: string;
  dualDiagnosis: string;
  insuranceType: string;
  insuranceProvider?: string;
  budgetPreference?: string;
  name: string;
  firstName?: string;
  lastName?: string;
  phone: string;
  email: string;
  preferredContact: string;
  message?: string;
  source?: string;
}

interface ProviderCapacity {
  facilityId: string;
  facilityUserId: string;
  facilityName: string;
  facilityEmail: string | null;
  providerEmail: string | null;
  city: string;
  state: string;
  planName: string;
  leadLimit: number;
  usedLeads: number;
  availableCapacity: number;
  lastAssignedAt: string | null;
  serviceTypes: string[];
}

async function hashIP(ip: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(ip + Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"));
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("").substring(0, 16);
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
    return { canReceiveLeads: true, reason: undefined, leadLimit: 4, usedLeads: 0, planName: "basic" };
  }

  try {
    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    
    const customers = await stripe.customers.list({ email: providerEmail, limit: 1 });
    
    let leadLimit = PLAN_CONFIG.basic.qualified_lead_limit;
    let planName = "basic";
    
    if (customers.data.length > 0) {
      const customerId = customers.data[0].id;
      const subscriptions = await stripe.subscriptions.list({
        customer: customerId,
        status: "active",
        limit: 1,
      });
      
      if (subscriptions.data.length > 0) {
        const subscription = subscriptions.data[0];
        const productId = subscription.items.data[0].price.product as string;
        
        if (productId === PLAN_CONFIG.professional.product_id) {
          leadLimit = PLAN_CONFIG.professional.qualified_lead_limit;
          planName = "professional";
        } else if (productId === PLAN_CONFIG.featured.product_id) {
          leadLimit = PLAN_CONFIG.featured.qualified_lead_limit;
          planName = "featured";
        }
      }
    }
    
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    
    const { data: userFacilities } = await supabase
      .from("facilities")
      .select("id")
      .eq("user_id", facilityUserId);
    
    const facilityIds = (userFacilities as { id: string }[] || []).map(f => f.id);
    
    if (facilityIds.length === 0) {
      return { canReceiveLeads: true, leadLimit, usedLeads: 0, planName };
    }
    
    const { count: monthlyLeadCount } = await supabase
      .from("leads")
      .select("*", { count: "exact", head: true })
      .in("facility_id", facilityIds)
      .gte("created_at", startOfMonth.toISOString())
      .eq("qualified", true);
    
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
    return { canReceiveLeads: true, leadLimit: 999, usedLeads: 0, planName: "unknown" };
  }
}

// Get all eligible providers with capacity for auto-assignment
async function getEligibleProviders(supabase: any): Promise<ProviderCapacity[]> {
  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
  
  // Even without Stripe, we can still find basic plan providers
  console.log("[getEligibleProviders] Starting to fetch eligible providers...");

  try {
    const stripe = stripeKey ? new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" }) : null;
    
    // Get all approved, non-suspended facilities
    const { data: facilities, error: facilitiesError } = await supabase
      .from("facilities")
      .select(`
        id, name, email, user_id, city, state,
        facility_services (service_name)
      `)
      .eq("status", "approved")
      .neq("suspended", true);
    
    if (facilitiesError) {
      console.error("[getEligibleProviders] Error fetching facilities:", facilitiesError);
      return [];
    }
    
    console.log(`[getEligibleProviders] Found ${facilities?.length || 0} approved facilities`);
    
    if (!facilities || facilities.length === 0) return [];
    
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    
    const providers: ProviderCapacity[] = [];
    
    for (const facility of facilities) {
      // Get provider profile email
      const { data: profile } = await supabase
        .from("profiles")
        .select("email")
        .eq("user_id", facility.user_id)
        .maybeSingle();
      
      if (!profile?.email) continue;
      
      // Get subscription plan
      let planName = "basic";
      let leadLimit = PLAN_CONFIG.basic.qualified_lead_limit;
      
      if (stripe) {
        try {
          const customers = await stripe.customers.list({ email: profile.email, limit: 1 });
          if (customers.data.length > 0) {
            const subscriptions = await stripe.subscriptions.list({
              customer: customers.data[0].id,
              status: "active",
              limit: 1,
            });
            
            if (subscriptions.data.length > 0) {
              const productId = subscriptions.data[0].items.data[0].price.product as string;
              if (productId === PLAN_CONFIG.featured.product_id) {
                planName = "featured";
                leadLimit = PLAN_CONFIG.featured.qualified_lead_limit;
              } else if (productId === PLAN_CONFIG.professional.product_id) {
                planName = "professional";
                leadLimit = PLAN_CONFIG.professional.qualified_lead_limit;
              }
            }
          }
        } catch (e) {
          console.error(`[getEligibleProviders] Error checking subscription for ${profile.email}:`, e);
        }
      }
      
      // Count leads this month for this facility
      const { count: monthlyLeadCount } = await supabase
        .from("leads")
        .select("*", { count: "exact", head: true })
        .eq("facility_id", facility.id)
        .gte("created_at", startOfMonth.toISOString())
        .eq("qualified", true);
      
      const usedLeads = monthlyLeadCount || 0;
      const availableCapacity = leadLimit - usedLeads;
      
      // Get last assigned lead timestamp for round-robin
      const { data: lastLead } = await supabase
        .from("leads")
        .select("assigned_at")
        .eq("facility_id", facility.id)
        .not("assigned_at", "is", null)
        .order("assigned_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      
      const serviceTypes = (facility.facility_services || []).map((s: any) => s.service_name.toLowerCase());
      
      providers.push({
        facilityId: facility.id,
        facilityUserId: facility.user_id,
        facilityName: facility.name,
        facilityEmail: facility.email,
        providerEmail: profile.email,
        city: facility.city,
        state: facility.state,
        planName,
        leadLimit,
        usedLeads,
        availableCapacity,
        lastAssignedAt: lastLead?.assigned_at || null,
        serviceTypes,
      });
    }
    
    return providers;
  } catch (error) {
    console.error("Error getting eligible providers:", error);
    return [];
  }
}

// Auto-assign lead to best matching provider
function findBestProvider(
  providers: ProviderCapacity[],
  leadData: QualifiedLeadRequest
): { provider: ProviderCapacity | null; reason: string } {
  // Filter to only providers with available capacity
  const available = providers.filter(p => p.availableCapacity > 0);
  
  if (available.length === 0) {
    return { provider: null, reason: "No providers with available capacity" };
  }
  
  // Parse lead location for matching
  const leadState = leadData.locationCityState?.split(",").pop()?.trim().toUpperCase() || "";
  const leadCity = leadData.locationCityState?.split(",")[0]?.trim().toLowerCase() || "";
  
  // Scoring function for providers
  const scoreProvider = (p: ProviderCapacity): number => {
    let score = 0;
    
    // Location matching
    if (p.state.toUpperCase() === leadState) score += 50;
    if (p.city.toLowerCase() === leadCity) score += 30;
    
    // Treatment type matching
    const levelOfCare = leadData.levelOfCare?.toLowerCase() || "";
    if (levelOfCare && p.serviceTypes.some(s => s.includes(levelOfCare))) {
      score += 20;
    }
    
    // Plan priority (Featured > Professional > Basic)
    if (p.planName === "featured") score += 15;
    else if (p.planName === "professional") score += 10;
    
    // Available capacity bonus
    score += Math.min(p.availableCapacity, 10);
    
    return score;
  };
  
  // Score all providers
  const scored = available.map(p => ({ provider: p, score: scoreProvider(p) }));
  
  // Sort by score descending, then by lastAssignedAt ascending (round-robin for ties)
  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    // For equal scores, prefer least-recently-assigned (round-robin)
    const aTime = a.provider.lastAssignedAt ? new Date(a.provider.lastAssignedAt).getTime() : 0;
    const bTime = b.provider.lastAssignedAt ? new Date(b.provider.lastAssignedAt).getTime() : 0;
    return aTime - bTime;
  });
  
  const best = scored[0];
  if (!best) {
    return { provider: null, reason: "No matching providers found" };
  }
  
  // Build reason string
  const reasons: string[] = [];
  if (best.provider.state.toUpperCase() === leadState) reasons.push("location match");
  if (best.provider.city.toLowerCase() === leadCity) reasons.push("city match");
  if (best.provider.planName === "featured") reasons.push("Featured provider");
  else if (best.provider.planName === "professional") reasons.push("Professional provider");
  
  const reason = reasons.length > 0 
    ? `Auto-assigned: ${reasons.join(", ")}`
    : "Auto-assigned: round-robin selection";
  
  return { provider: best.provider, reason };
}

// Send lead notification email to provider
async function sendLeadNotificationEmail(
  facilityEmail: string,
  facilityName: string,
  leadData: QualifiedLeadRequest,
  assignmentReason: string
): Promise<void> {
  try {
    await resend.emails.send({
      from: "RehabLookup <onboarding@resend.dev>",
      to: [facilityEmail],
      subject: `New Qualified Lead: ${leadData.name}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head><meta charset="utf-8"></head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f6f8fb; padding: 40px 20px;">
          <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; padding: 40px; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
            <h1 style="color: #1B365D; font-size: 24px; margin: 0 0 24px 0;">New Qualified Lead</h1>
            
            <div style="background: #e8f5e9; border-radius: 8px; padding: 12px 16px; margin-bottom: 20px;">
              <p style="margin: 0; color: #2e7d32; font-size: 14px;">✓ ${assignmentReason}</p>
            </div>
            
            <div style="background: #F6F8FB; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
              <p style="margin: 0 0 8px 0;"><strong>Name:</strong> ${leadData.name}</p>
              <p style="margin: 0 0 8px 0;"><strong>Phone:</strong> ${leadData.phone}</p>
              <p style="margin: 0 0 8px 0;"><strong>Email:</strong> ${leadData.email}</p>
              <p style="margin: 0 0 8px 0;"><strong>Preferred Contact:</strong> ${leadData.preferredContact}</p>
              <p style="margin: 0 0 8px 0;"><strong>Location:</strong> ${leadData.locationZip}${leadData.locationCityState ? ` (${leadData.locationCityState})` : ""}</p>
              <p style="margin: 0 0 8px 0;"><strong>Urgency:</strong> ${leadData.urgency}</p>
              <p style="margin: 0 0 8px 0;"><strong>Level of Care:</strong> ${leadData.levelOfCare}</p>
              <p style="margin: 0 0 8px 0;"><strong>Insurance:</strong> ${leadData.insuranceType}</p>
              ${leadData.message ? `<p style="margin: 0;"><strong>Message:</strong> ${leadData.message}</p>` : ""}
            </div>
            
            <p style="color: #5E6B7A; font-size: 14px;">
              This lead has been verified via email confirmation. View and respond to this lead in your RehabLookup provider dashboard.
            </p>
          </div>
        </body>
        </html>
      `,
    });
    console.log(`Notification sent to ${facilityEmail}`);
  } catch (emailError) {
    console.error("Failed to send provider notification:", emailError);
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
  const percentage = Math.round((usedLeads / leadLimit) * 100);
  const remainingLeads = leadLimit - usedLeads;
  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";

  const emailHtml = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
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
        <tr><td style="padding: 8px 0; color: #6b7280;">Leads Used:</td><td style="padding: 8px 0; font-weight: 600; text-align: right;">${usedLeads} of ${leadLimit}</td></tr>
        <tr><td style="padding: 8px 0; color: #6b7280;">Leads Remaining:</td><td style="padding: 8px 0; font-weight: 600; text-align: right; color: ${remainingLeads <= 5 ? '#dc2626' : '#16a34a'};">${remainingLeads}</td></tr>
        <tr><td style="padding: 8px 0; color: #6b7280;">Current Plan:</td><td style="padding: 8px 0; font-weight: 600; text-align: right; text-transform: capitalize;">${planName}</td></tr>
        <tr><td style="padding: 8px 0; color: #6b7280;">Facility:</td><td style="padding: 8px 0; font-weight: 600; text-align: right;">${facilityName}</td></tr>
      </table>
    </div>
    
    <p style="color: #4b5563; font-size: 15px; margin-bottom: 24px;">
      Once you reach your limit, new leads will be paused until next month. <strong>Upgrade your plan now</strong> to continue receiving valuable patient inquiries without interruption.
    </p>
    
    <div style="text-align: center; margin-top: 28px;">
      <a href="${supabaseUrl.replace('.supabase.co', '.lovable.app')}/provider/billing" style="display: inline-block; background: linear-gradient(135deg, #1B365D 0%, #2C4A7F 100%); color: #fff; padding: 16px 40px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px;">
        🚀 Upgrade Your Plan
      </a>
    </div>
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
    console.log(`Lead limit warning email sent to ${providerEmail}`);
  } catch (error) {
    console.error("Failed to send lead limit warning email:", error);
  }
}

// Send confirmation email to user after qualified lead submission
async function sendUserConfirmationEmail(
  userEmail: string,
  firstName: string
): Promise<void> {
  const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f6f8fb;">
  <div style="background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.06);">
    <div style="background: linear-gradient(135deg, #1B365D 0%, #2C4A7F 100%); padding: 28px; text-align: center;">
      <h1 style="color: #fff; margin: 0; font-size: 22px; font-weight: 600;">We've received your request</h1>
    </div>
    
    <div style="padding: 32px 28px;">
      <p style="margin: 0 0 20px 0; font-size: 16px; color: #1a1a1a;">Hi ${firstName},</p>
      
      <p style="margin: 0 0 16px 0; font-size: 15px; color: #4b5563;">Thank you for reaching out to RehabLookup.</p>
      
      <p style="margin: 0 0 16px 0; font-size: 15px; color: #4b5563;">Your request for information has been received and successfully reviewed. Based on what you shared, your inquiry has been forwarded to a treatment provider that matches your needs and location.</p>
      
      <p style="margin: 0 0 24px 0; font-size: 15px; color: #4b5563;">There's no obligation at any point. If a provider reaches out, you're free to ask questions, take your time, and decide what feels right for you or your loved one.</p>
      
      <div style="background: #f8fafc; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
        <p style="margin: 0 0 12px 0; font-size: 15px; font-weight: 600; color: #1B365D;">What to expect next</p>
        <ul style="margin: 0; padding-left: 20px; color: #4b5563; font-size: 14px;">
          <li style="margin-bottom: 8px;">A treatment provider may contact you using your preferred method</li>
          <li style="margin-bottom: 8px;">You can learn more about available options and next steps</li>
          <li style="margin-bottom: 0;">If you choose not to move forward, no action is required</li>
        </ul>
      </div>
      
      <p style="margin: 0 0 24px 0; font-size: 14px; color: #6b7280;">If you have any questions about your request or need assistance, our support team is here to help at <a href="mailto:support@rehablookup.com" style="color: #1B365D; text-decoration: none;">support@rehablookup.com</a>.</p>
      
      <p style="margin: 0 0 4px 0; font-size: 15px; color: #4b5563;">Thank you for taking this step.</p>
      <p style="margin: 0 0 4px 0; font-size: 15px; color: #4b5563;">Warm regards,</p>
      <p style="margin: 0; font-size: 15px; font-weight: 600; color: #1B365D;">The RehabLookup Team</p>
      <p style="margin: 4px 0 0 0; font-size: 13px; color: #6b7280; font-style: italic;">Connecting people with trusted treatment options</p>
    </div>
    
    <div style="background: #f8fafc; padding: 20px 28px; border-top: 1px solid #e5e7eb;">
      <div style="text-align: center; margin-bottom: 12px;">
        <span style="font-size: 14px; color: #6b7280;">🔒 Your information is secure and confidential</span>
      </div>
      <p style="margin: 0; font-size: 11px; color: #9ca3af; text-align: center; line-height: 1.5;">
        This email was sent by RehabLookup in response to your request for treatment information.
        <br>If you did not make this request, please disregard this email.
        <br><a href="https://rehablookup.com/privacy-policy" style="color: #6b7280;">Privacy Policy</a> · <a href="https://rehablookup.com/terms-of-service" style="color: #6b7280;">Terms of Service</a>
      </p>
    </div>
  </div>
</body>
</html>
  `;

  try {
    await resend.emails.send({
      from: "RehabLookup <notifications@rehablookup.com>",
      to: [userEmail],
      subject: "We've received your request",
      html: emailHtml,
    });
    console.log(`User confirmation email sent to ${userEmail}`);
  } catch (error) {
    console.error("Failed to send user confirmation email:", error);
  }
}


const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const leadData: QualifiedLeadRequest = await req.json();

    // ============ QUALIFICATION STEP 1: Required Fields ============
    const requiredFields = ["whoSeekingHelp", "locationZip", "urgency", "levelOfCare", "name", "phone", "email", "preferredContact"];
    const missingFields: string[] = [];
    for (const field of requiredFields) {
      if (!leadData[field as keyof QualifiedLeadRequest]) {
        missingFields.push(field);
      }
    }

    if (missingFields.length > 0) {
      return new Response(
        JSON.stringify({ error: `Missing required field: ${missingFields[0]}` }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Validate email format
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(leadData.email)) {
      return new Response(
        JSON.stringify({ error: "Invalid email format" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Validate phone format
    const phoneDigits = leadData.phone.replace(/\D/g, "");
    if (phoneDigits.length < 10) {
      return new Response(
        JSON.stringify({ error: "Invalid phone number" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // ============ QUALIFICATION STEP 2: Email Verification ============
    const { data: verificationRecord } = await supabase
      .from("email_verification_codes")
      .select("verified")
      .eq("email", leadData.email.toLowerCase())
      .eq("verified", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const emailVerified = !!verificationRecord;

    // ============ QUALIFICATION STEP 3: Duplicate Check ============
    const clientIP = req.headers.get("x-forwarded-for")?.split(",")[0] || 
                     req.headers.get("cf-connecting-ip") || 
                     "unknown";
    const ipHash = await hashIP(clientIP);

    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count: duplicateCount } = await supabase
      .from("leads")
      .select("*", { count: "exact", head: true })
      .eq("email", leadData.email.toLowerCase())
      .gte("created_at", oneHourAgo);

    if (duplicateCount && duplicateCount > 0) {
      return new Response(
        JSON.stringify({ error: "You've already submitted a request recently. Please wait before submitting again." }),
        { status: 429, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // ============ QUALIFICATION STEP 4: Rate Limit Check ============
    const { count: ipCount } = await supabase
      .from("leads")
      .select("*", { count: "exact", head: true })
      .eq("ip_hash", ipHash)
      .gte("created_at", oneHourAgo);

    if (ipCount && ipCount >= 5) {
      return new Response(
        JSON.stringify({ error: "Too many submissions. Please try again later." }),
        { status: 429, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // ============ DETERMINE QUALIFICATION STATUS ============
    // Lead is qualified if: email verified AND all required fields present
    const isQualified = emailVerified;
    const qualificationReason = !emailVerified ? "Email not verified" : null;

    // ============ AUTO-ASSIGNMENT LOGIC ============
    let assignedFacilityId: string | null = null;
    let assignedFacilityUserId: string | null = null;
    let assignedFacilityEmail: string | null = null;
    let assignedFacilityName: string | null = null;
    let assignedProviderEmail: string | null = null;
    let assignmentStatus = "pending";
    let assignmentReason = "";

    // Case 1: Lead came from a specific provider's profile
    if (leadData.facilityId) {
      const { data: facility } = await supabase
        .from("facilities")
        .select("id, name, email, status, user_id")
        .eq("id", leadData.facilityId)
        .eq("status", "approved")
        .maybeSingle();

      if (facility) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("email")
          .eq("user_id", facility.user_id)
          .maybeSingle();

        if (profile?.email) {
          // Check if provider has capacity
          const capCheck = await checkProviderLeadCap(supabase, facility.user_id, profile.email);
          
          if (capCheck.canReceiveLeads) {
            assignedFacilityId = facility.id;
            assignedFacilityUserId = facility.user_id;
            assignedFacilityEmail = facility.email;
            assignedFacilityName = facility.name;
            assignedProviderEmail = profile.email;
            assignmentStatus = "assigned";
            assignmentReason = "Direct: Provider profile submission";
          } else {
            // Provider at capacity - still assign but note the reason
            assignedFacilityId = facility.id;
            assignedFacilityUserId = facility.user_id;
            assignedFacilityEmail = facility.email;
            assignedFacilityName = facility.name;
            assignedProviderEmail = profile.email;
            assignmentStatus = "assigned";
            assignmentReason = `Direct submission (provider at ${capCheck.usedLeads}/${capCheck.leadLimit} capacity)`;
          }
        }
      }
    }

    // Case 2: No facility specified - auto-assign based on matching
    if (!assignedFacilityId) {
      console.log(`Starting auto-assignment for unassigned lead (qualified: ${isQualified})...`);
      const eligibleProviders = await getEligibleProviders(supabase);
      console.log(`Found ${eligibleProviders.length} eligible providers:`, eligibleProviders.map(p => ({
        name: p.facilityName,
        capacity: p.availableCapacity,
        plan: p.planName
      })));
      
      if (eligibleProviders.length > 0) {
        const { provider, reason } = findBestProvider(eligibleProviders, leadData);
        
        if (provider) {
          assignedFacilityId = provider.facilityId;
          assignedFacilityUserId = provider.facilityUserId;
          assignedFacilityEmail = provider.facilityEmail;
          assignedFacilityName = provider.facilityName;
          assignedProviderEmail = provider.providerEmail;
          assignmentStatus = "assigned";
          assignmentReason = reason;
          console.log(`Auto-assigned to ${provider.facilityName}: ${reason}`);
        } else {
          assignmentStatus = "unassigned_no_capacity";
          assignmentReason = reason;
          console.log(`Could not assign - ${reason}`);
        }
      } else {
        assignmentStatus = "unassigned_no_providers";
        assignmentReason = "No approved providers available";
        console.log("No eligible providers found in the system");
      }
    }

    // ============ CREATE THE LEAD ============
    const { data: lead, error: insertError } = await supabase
      .from("leads")
      .insert({
        facility_id: assignedFacilityId,
        name: leadData.name.trim(),
        phone: leadData.phone.trim(),
        email: leadData.email.toLowerCase().trim(),
        preferred_contact: leadData.preferredContact,
        message: leadData.message?.trim() || null,
        ip_hash: ipHash,
        email_verified: emailVerified,
        source: leadData.source || (leadData.facilityId ? "Direct Profile" : "Request Help Page"),
        who_seeking_help: leadData.whoSeekingHelp,
        location_zip: leadData.locationZip,
        location_city_state: leadData.locationCityState || null,
        urgency: leadData.urgency,
        primary_substance: leadData.primarySubstance || [],
        level_of_care: leadData.levelOfCare,
        dual_diagnosis: leadData.dualDiagnosis,
        insurance_type: leadData.insuranceType,
        insurance_provider: leadData.insuranceProvider || null,
        budget_preference: leadData.budgetPreference || null,
        status: "new",
        quality_flag: isQualified ? "qualified" : "unqualified",
        validation_status: "valid",
        // New columns for tracking
        qualified: isQualified,
        qualification_reason: qualificationReason,
        assignment_status: assignmentStatus,
        assignment_reason: assignmentReason,
        assigned_at: assignedFacilityId ? new Date().toISOString() : null,
      })
      .select()
      .single();

    if (insertError) {
      console.error("Failed to insert lead:", insertError);
      throw new Error("Failed to submit request");
    }

    console.log(`Lead created: ${lead.id}, qualified: ${isQualified}, assignment: ${assignmentStatus}`);

    // ============ SEND USER CONFIRMATION EMAIL ============
    if (isQualified && emailVerified) {
      try {
        const firstName = leadData.firstName || leadData.name.split(' ')[0] || 'there';
        await sendUserConfirmationEmail(leadData.email, firstName);
      } catch (confirmError) {
        console.error("Failed to send user confirmation email:", confirmError);
      }
    }

    // ============ SEND NOTIFICATIONS IF ASSIGNED ============
    if (assignedFacilityEmail && assignedFacilityName) {
      await sendLeadNotificationEmail(
        assignedFacilityEmail,
        assignedFacilityName,
        leadData,
        assignmentReason
      );
    }

    // Create in-app notification
    if (assignedFacilityUserId && assignedFacilityId) {
      try {
        await supabase
          .from("provider_notifications")
          .insert({
            user_id: assignedFacilityUserId,
            facility_id: assignedFacilityId,
            type: "lead_received",
            title: `New ${isQualified ? 'qualified' : ''} lead from ${leadData.name}`,
            message: `${leadData.name} is seeking ${leadData.levelOfCare} care. They prefer to be contacted via ${leadData.preferredContact}.`,
            metadata: {
              lead_id: lead.id,
              lead_name: leadData.name,
              lead_email: leadData.email,
              lead_phone: leadData.phone,
              preferred_contact: leadData.preferredContact,
              level_of_care: leadData.levelOfCare,
              urgency: leadData.urgency,
              quality_flag: isQualified ? "qualified" : "unqualified",
              assignment_reason: assignmentReason,
            },
          });
        console.log("In-app notification created for user:", assignedFacilityUserId);
      } catch (notifError) {
        console.error("Failed to create in-app notification:", notifError);
      }
    }

    // ============ LEAD LIMIT WARNING ============
    if (assignedProviderEmail && assignedFacilityName && isQualified) {
      const capCheck = await checkProviderLeadCap(supabase, assignedFacilityUserId!, assignedProviderEmail);
      const newUsedLeads = capCheck.usedLeads + 1;
      const usagePercentage = (newUsedLeads / capCheck.leadLimit) * 100;
      
      if (usagePercentage >= 80) {
        await sendLeadLimitWarningEmail(
          assignedProviderEmail,
          assignedFacilityName,
          newUsedLeads,
          capCheck.leadLimit,
          capCheck.planName
        );
        
        if (assignedFacilityUserId && assignedFacilityId) {
          try {
            await supabase
              .from("provider_notifications")
              .insert({
                user_id: assignedFacilityUserId,
                facility_id: assignedFacilityId,
                type: "lead_limit_warning",
                title: `${Math.round(usagePercentage)}% of monthly leads used`,
                message: `You've used ${newUsedLeads} of ${capCheck.leadLimit} leads this month. Consider upgrading to receive more leads.`,
                metadata: {
                  used_leads: newUsedLeads,
                  lead_limit: capCheck.leadLimit,
                  plan_name: capCheck.planName,
                  percentage: usagePercentage,
                },
              });
          } catch (notifError) {
            console.error("Failed to create lead limit warning notification:", notifError);
          }
        }
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        leadId: lead.id,
        qualified: isQualified,
        assigned: !!assignedFacilityId,
        assignmentStatus,
        assignmentReason,
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error in submit-qualified-lead:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Failed to submit request" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
