import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";
import Stripe from "https://esm.sh/stripe@18.5.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// PLAN CONFIGURATION - STRICT ENFORCEMENT
// Professional: 100 leads/month, ALL shared (max 2 providers per lead)
// Featured: 100 leads/month, ALL exclusive (1 provider per lead)
// Basic: 0 leads (direct submissions show upgrade prompt)
const PLAN_CONFIG: Record<string, { 
  product_ids: string[]; 
  lead_limit: number; 
  exclusivity: 'shared' | 'exclusive';
  max_providers_per_lead: number;
  priority_score: number;
}> = {
  basic: { 
    product_ids: [], 
    lead_limit: 0, 
    exclusivity: 'exclusive',
    max_providers_per_lead: 0,
    priority_score: 0
  },
  professional: { 
    product_ids: ["prod_TbalLOPujTIoUe", "prod_Tbyz1bf6iYyzYd"], 
    lead_limit: 100,
    exclusivity: 'shared',
    max_providers_per_lead: 2,
    priority_score: 15
  },
  featured: { 
    product_ids: ["prod_TbalOeJZA2ZoJl", "prod_TbyzJVNOQL71NN"], 
    lead_limit: 100,
    exclusivity: 'exclusive',
    max_providers_per_lead: 1,
    priority_score: 30
  },
};

const PAID_PLANS = ["professional", "featured"];

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

// Check provider's subscription and lead cap - STRICT ENFORCEMENT
// deno-lint-ignore no-explicit-any
async function checkProviderLeadCap(
  supabase: any,
  facilityUserId: string,
  providerEmail: string
): Promise<{ canReceiveLeads: boolean; reason?: string; leadLimit: number; usedLeads: number; planName: string; exclusivity: 'shared' | 'exclusive' }> {
  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
  
  if (!stripeKey) {
    console.error("STRIPE_SECRET_KEY not set - defaulting to basic plan");
  }

  try {
    let leadLimit = PLAN_CONFIG.basic.lead_limit;
    let planName = "basic";
    let exclusivity: 'shared' | 'exclusive' = PLAN_CONFIG.basic.exclusivity;
    
    if (stripeKey) {
      const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
      
      const customers = await stripe.customers.list({ email: providerEmail, limit: 1 });
      
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
          
          if (PLAN_CONFIG.professional.product_ids.includes(productId)) {
            leadLimit = PLAN_CONFIG.professional.lead_limit;
            planName = "professional";
            exclusivity = PLAN_CONFIG.professional.exclusivity;
          } else if (PLAN_CONFIG.featured.product_ids.includes(productId)) {
            leadLimit = PLAN_CONFIG.featured.lead_limit;
            planName = "featured";
            exclusivity = PLAN_CONFIG.featured.exclusivity;
          }
        }
      }
    }
    
    // Basic plan: no leads allowed
    if (planName === "basic") {
      return {
        canReceiveLeads: false,
        reason: "Basic plan does not include qualified leads",
        leadLimit: 0,
        usedLeads: 0,
        planName,
        exclusivity
      };
    }
    
    // Get all facility IDs for this user
    const { data: userFacilities } = await supabase
      .from("facilities")
      .select("id")
      .eq("user_id", facilityUserId);
    
    const facilityIds = (userFacilities as { id: string }[] || []).map(f => f.id);
    
    if (facilityIds.length === 0) {
      return { canReceiveLeads: true, leadLimit, usedLeads: 0, planName, exclusivity };
    }
    
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    
    const { count: monthlyLeadCount } = await supabase
      .from("leads")
      .select("*", { count: "exact", head: true })
      .in("facility_id", facilityIds)
      .gte("created_at", startOfMonth.toISOString());
    
    const usedLeads = monthlyLeadCount || 0;
    
    if (usedLeads >= leadLimit) {
      return { 
        canReceiveLeads: false, 
        reason: `Provider has reached monthly lead cap (${usedLeads}/${leadLimit}).`,
        leadLimit,
        usedLeads,
        planName,
        exclusivity
      };
    }
    
    return { canReceiveLeads: true, leadLimit, usedLeads, planName, exclusivity };
  } catch (error) {
    console.error("Error checking lead cap:", error);
    return { 
      canReceiveLeads: false, 
      leadLimit: 0, 
      usedLeads: 0, 
      planName: "unknown",
      exclusivity: 'exclusive',
      reason: "Error checking subscription status"
    };
  }
}

// Find next eligible paying provider for lead reassignment
// deno-lint-ignore no-explicit-any
async function findNextEligibleProvider(
  supabase: any,
  excludeFacilityId: string,
  facilityState: string,
  facilityCity: string
): Promise<{
  facilityId: string;
  facilityName: string;
  userId: string;
  providerEmail: string;
  planName: string;
  leadLimit: number;
  usedLeads: number;
} | null> {
  console.log("Finding next eligible paying provider...", { excludeFacilityId, facilityState, facilityCity });
  
  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
  if (!stripeKey) {
    console.error("STRIPE_SECRET_KEY not set");
    return null;
  }
  
  const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
  
  // Get all approved facilities except the current one
  const { data: facilities, error } = await supabase
    .from("facilities")
    .select("id, name, email, user_id, city, state, zip_code, suspended")
    .eq("status", "approved")
    .neq("suspended", true)
    .neq("id", excludeFacilityId);
  
  if (error || !facilities || facilities.length === 0) {
    console.log("No alternative facilities found");
    return null;
  }
  
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);
  
  interface EligibleProvider {
    facilityId: string;
    facilityName: string;
    userId: string;
    providerEmail: string;
    planName: string;
    leadLimit: number;
    usedLeads: number;
    priorityScore: number;
    isLocalMatch: boolean;
    leadsThisCycle: number;
  }
  
  const eligibleProviders: EligibleProvider[] = [];
  
  for (const facility of facilities) {
    // Get provider email
    const { data: profile } = await supabase
      .from("profiles")
      .select("email")
      .eq("user_id", facility.user_id)
      .maybeSingle();
    
    if (!profile?.email) continue;
    
    // Check subscription
    let planName = "basic";
    let leadLimit = 0;
    let priorityScore = 0;
    
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
          if (PLAN_CONFIG.featured.product_ids.includes(productId)) {
            planName = "featured";
            leadLimit = PLAN_CONFIG.featured.lead_limit;
            priorityScore = PLAN_CONFIG.featured.priority_score;
          } else if (PLAN_CONFIG.professional.product_ids.includes(productId)) {
            planName = "professional";
            leadLimit = PLAN_CONFIG.professional.lead_limit;
            priorityScore = PLAN_CONFIG.professional.priority_score;
          }
        }
      }
    } catch (e) {
      console.error("Stripe error for provider:", profile.email, e);
      continue;
    }
    
    // Skip non-paid plans
    if (!PAID_PLANS.includes(planName)) continue;
    
    // Count leads this month
    const { count: monthlyLeadCount } = await supabase
      .from("leads")
      .select("*", { count: "exact", head: true })
      .eq("facility_id", facility.id)
      .gte("created_at", startOfMonth.toISOString());
    
    const usedLeads = monthlyLeadCount || 0;
    if (usedLeads >= leadLimit) continue;
    
    // Check location match
    const isLocalMatch = facility.state?.toLowerCase() === facilityState?.toLowerCase() || 
                         facility.city?.toLowerCase() === facilityCity?.toLowerCase();
    
    eligibleProviders.push({
      facilityId: facility.id,
      facilityName: facility.name,
      userId: facility.user_id,
      providerEmail: profile.email,
      planName,
      leadLimit,
      usedLeads,
      priorityScore,
      isLocalMatch,
      leadsThisCycle: usedLeads,
    });
  }
  
  if (eligibleProviders.length === 0) {
    console.log("No eligible paying providers found");
    return null;
  }
  
  // Sort by: local match first, then priority score, then fewer leads
  eligibleProviders.sort((a, b) => {
    // Local matches first
    if (a.isLocalMatch && !b.isLocalMatch) return -1;
    if (!a.isLocalMatch && b.isLocalMatch) return 1;
    // Then by priority score (higher is better)
    if (b.priorityScore !== a.priorityScore) return b.priorityScore - a.priorityScore;
    // Then by fewer leads (fairness)
    return a.leadsThisCycle - b.leadsThisCycle;
  });
  
  const selected = eligibleProviders[0];
  console.log("Selected eligible provider:", { 
    facilityId: selected.facilityId, 
    planName: selected.planName,
    isLocalMatch: selected.isLocalMatch 
  });
  
  return {
    facilityId: selected.facilityId,
    facilityName: selected.facilityName,
    userId: selected.userId,
    providerEmail: selected.providerEmail,
    planName: selected.planName,
    leadLimit: selected.leadLimit,
    usedLeads: selected.usedLeads,
  };
}

// Send conversion SMS to free plan provider
async function sendConversionSMS(
  phone: string,
  facilityName: string,
  leadName: string
): Promise<boolean> {
  const twilioSid = Deno.env.get("TWILIO_ACCOUNT_SID");
  const twilioAuth = Deno.env.get("TWILIO_AUTH_TOKEN");
  const twilioPhone = Deno.env.get("TWILIO_PHONE_NUMBER");
  
  if (!twilioSid || !twilioAuth || !twilioPhone) {
    console.log("Twilio credentials not configured, skipping SMS");
    return false;
  }
  
  try {
    const message = `RehabLookup: ${leadName} just inquired about ${facilityName}! Upgrade to Professional to receive leads and grow your business. Visit rehablookup.com/provider/billing`;
    
    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "Authorization": "Basic " + btoa(`${twilioSid}:${twilioAuth}`),
        },
        body: new URLSearchParams({
          To: phone,
          From: twilioPhone,
          Body: message,
        }),
      }
    );
    
    if (response.ok) {
      console.log("Conversion SMS sent to free provider");
      return true;
    } else {
      const error = await response.text();
      console.error("Failed to send conversion SMS:", error);
      return false;
    }
  } catch (error) {
    console.error("Error sending conversion SMS:", error);
    return false;
  }
}

// Special email template for Basic plan providers - prompts to upgrade to view leads
function getBasicPlanUpgradeEmail(
  facilityName: string,
  totalLeadsCount: number,
  leadName: string
): { subject: string; html: string } {
  const billingUrl = "https://rehablookup.com/provider/billing";
  const dashboardUrl = "https://rehablookup.com/provider/leads";
  
  const subject = `🔒 ${leadName} Just Inquired - Upgrade to Receive Leads`;
  
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
  <div style="background: linear-gradient(135deg, #1B365D 0%, #2C4A7F 100%); padding: 30px; border-radius: 12px 12px 0 0;">
    <h1 style="color: #fff; margin: 0; font-size: 24px;">🔒 Someone Is Looking for Help</h1>
    <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0 0;">${leadName} just inquired about ${facilityName}</p>
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
        <p style="margin: 0; color: #fff; font-size: 14px; font-weight: 600;">🔒 Upgrade to view leads</p>
      </div>
    </div>
    
    <!-- Leads Counter -->
    <div style="background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border: 2px solid #C9A227; border-radius: 8px; padding: 20px; margin-bottom: 24px; text-align: center;">
      <p style="margin: 0 0 8px 0; font-size: 48px; font-weight: bold; color: #92400e;">${totalLeadsCount}</p>
      <p style="margin: 0; color: #92400e; font-size: 16px; font-weight: 600;">Lead${totalLeadsCount > 1 ? 's' : ''} You've Missed</p>
    </div>
    
    <!-- Upgrade Message -->
    <div style="background: #dcfce7; border: 1px solid #bbf7d0; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
      <h3 style="margin: 0 0 12px 0; color: #166534; font-size: 16px;">🚀 Upgrade to Professional to:</h3>
      <ul style="margin: 0; padding-left: 20px; color: #166534;">
        <li style="margin-bottom: 8px;">Receive qualified leads directly</li>
        <li style="margin-bottom: 8px;">View complete contact details</li>
        <li style="margin-bottom: 8px;">Get up to 100 qualified leads per month</li>
        <li>Priority placement in search results</li>
      </ul>
    </div>
    
    <!-- CTA Buttons -->
    <div style="text-align: center; margin-top: 28px;">
      <a href="${billingUrl}" style="display: inline-block; background: linear-gradient(135deg, #16a34a 0%, #15803d 100%); color: #fff; padding: 16px 40px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px; box-shadow: 0 4px 14px rgba(0, 0, 0, 0.2);">
        🔓 Upgrade & Get Leads
      </a>
    </div>
    
    <div style="text-align: center; margin-top: 16px;">
      <a href="${dashboardUrl}" style="display: inline-block; color: #6b7280; padding: 12px 32px; text-decoration: none; font-size: 14px;">
        View Dashboard →
      </a>
    </div>
    
    <div style="background: #f3f4f6; border-radius: 8px; padding: 16px; margin-top: 24px; text-align: center;">
      <p style="margin: 0; color: #4b5563; font-size: 13px;">
        <strong>Professional plan:</strong> $399/month · Up to 100 leads · Priority support
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

// Email template for paying providers
function getLeadEmailTemplate(
  planName: string,
  facilityName: string,
  leadName: string,
  leadPhone: string,
  leadEmail: string,
  preferredContact: string,
  message: string | null,
  usedLeads: number,
  leadLimit: number
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
  
  const planConfig = {
    professional: {
      headerGradient: "linear-gradient(135deg, #1B365D 0%, #2C4A7F 100%)",
      headerEmoji: "🎯",
      headerTitle: "New Qualified Lead",
      tipColor: "#dcfce7",
      tipBorderColor: "#bbf7d0",
      tipTextColor: "#166534",
      ctaGradient: "linear-gradient(135deg, #16a34a 0%, #15803d 100%)",
      leadCounterBg: "#dbeafe",
      leadCounterBorder: "#93c5fd",
      leadCounterText: "#1e40af",
    },
    featured: {
      headerGradient: "linear-gradient(135deg, #C9A227 0%, #b8860b 100%)",
      headerEmoji: "⭐",
      headerTitle: "Priority Lead Alert",
      tipColor: "#fef3c7",
      tipBorderColor: "#fcd34d",
      tipTextColor: "#92400e",
      ctaGradient: "linear-gradient(135deg, #C9A227 0%, #b8860b 100%)",
      leadCounterBg: "#fef3c7",
      leadCounterBorder: "#fcd34d",
      leadCounterText: "#92400e",
    }
  };
  
  const config = planConfig[planName as keyof typeof planConfig] || planConfig.professional;
  const remainingLeads = leadLimit - usedLeads;
  
  const subject = `${config.headerEmoji} New Lead: ${leadName} is interested in ${facilityName}`;
  
  const leadUsageSection = leadLimit > 0 ? `
    <div style="background: ${config.leadCounterBg}; border: 1px solid ${config.leadCounterBorder}; border-radius: 8px; padding: 16px; margin-bottom: 24px; text-align: center;">
      <p style="margin: 0 0 4px 0; font-size: 12px; color: ${config.leadCounterText}; text-transform: uppercase; letter-spacing: 0.5px;">Monthly Lead Usage</p>
      <p style="margin: 0; font-size: 24px; font-weight: bold; color: ${config.leadCounterText};">${usedLeads} / ${leadLimit}</p>
      <p style="margin: 4px 0 0 0; font-size: 13px; color: ${config.leadCounterText};">
        ${remainingLeads} leads remaining
      </p>
    </div>
  ` : '';
  
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
  <div style="background: ${config.headerGradient}; padding: 30px; border-radius: 12px 12px 0 0;">
    <h1 style="color: #fff; margin: 0; font-size: 24px;">${config.headerEmoji} ${config.headerTitle}!</h1>
    <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0 0;">Someone is interested in ${facilityName}</p>
  </div>
  
  <div style="background: #fff; border: 1px solid #e5e7eb; border-top: none; padding: 30px; border-radius: 0 0 12px 12px;">
    <p style="font-size: 14px; color: #6b7280; margin: 0 0 20px 0;">
      Received on ${currentDate}
    </p>
    
    <div style="background: ${config.tipColor}; border: 1px solid ${config.tipBorderColor}; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
      <p style="margin: 0; color: ${config.tipTextColor}; font-weight: 600; font-size: 14px;">
        ⚡ Quick tip: Respond within 5 minutes to increase your conversion rate by 400%!
      </p>
    </div>
    
    ${leadUsageSection}
    
    <div style="background: #f9fafb; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
      <h2 style="margin: 0 0 16px 0; font-size: 18px; color: #1B365D;">Contact Details</h2>
      
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 10px 0; color: #6b7280; width: 140px; vertical-align: top;">Name:</td>
          <td style="padding: 10px 0; font-weight: 600; font-size: 16px;">${leadName}</td>
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
        <tr>
          <td style="padding: 10px 0; color: #6b7280; vertical-align: top;">Preferred:</td>
          <td style="padding: 10px 0; text-transform: capitalize;">${preferredContact}</td>
        </tr>
        ${message ? `
        <tr>
          <td style="padding: 10px 0; color: #6b7280; vertical-align: top;">Message:</td>
          <td style="padding: 10px 0;">${message}</td>
        </tr>
        ` : ''}
      </table>
    </div>
    
    <div style="text-align: center; margin-top: 28px;">
      <a href="${dashboardUrl}" style="display: inline-block; background: ${config.ctaGradient}; color: #fff; padding: 16px 40px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px; box-shadow: 0 4px 14px rgba(0, 0, 0, 0.2);">
        View in Dashboard
      </a>
    </div>
    
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

// Send lead limit warning email
// deno-lint-ignore no-explicit-any
async function sendLeadLimitWarningEmail(
  supabase: any,
  userId: string,
  providerEmail: string,
  facilityName: string,
  usedLeads: number,
  leadLimit: number,
  planName: string,
  threshold: '80' | '100'
): Promise<boolean> {
  const resendApiKey = Deno.env.get("RESEND_API_KEY");
  if (!resendApiKey) return false;
  
  // Check for recent warning
  const alertKey = `${userId}_${threshold}_${new Date().toISOString().slice(0, 7)}`;
  const { data: existingAlert } = await supabase
    .from("subscription_alerts")
    .select("id")
    .eq("alert_key", alertKey)
    .maybeSingle();
  
  if (existingAlert) return false;
  
  const resend = new Resend(resendApiKey);
  const billingUrl = "https://rehablookup.com/provider/billing";
  
  const isReached = threshold === '100';
  const subject = isReached 
    ? `🚨 Monthly Lead Limit Reached - ${facilityName}`
    : `⚠️ ${Math.round((usedLeads / leadLimit) * 100)}% of Monthly Leads Used`;
  
  const html = `
<!DOCTYPE html>
<html>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: ${isReached ? '#dc2626' : '#f59e0b'}; padding: 24px; border-radius: 8px 8px 0 0;">
    <h1 style="color: white; margin: 0;">${isReached ? '🚨' : '⚠️'} Lead Limit ${isReached ? 'Reached' : 'Warning'}</h1>
  </div>
  <div style="background: #fff; border: 1px solid #e5e7eb; padding: 24px; border-radius: 0 0 8px 8px;">
    <p>You've used <strong>${usedLeads}</strong> of <strong>${leadLimit}</strong> leads this month for ${facilityName}.</p>
    ${isReached ? '<p style="color: #dc2626;">Your profile has been removed from lead routing until your billing cycle resets.</p>' : ''}
    <a href="${billingUrl}" style="display: inline-block; background: #1B365D; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 16px;">
      ${isReached ? 'Upgrade Your Plan' : 'View Billing'}
    </a>
  </div>
</body>
</html>
  `;
  
  try {
    const response = await resend.emails.send({
      from: "RehabLookup <no-reply@rehablookup.com>",
      to: [providerEmail],
      subject,
      html,
    });
    
    // deno-lint-ignore no-explicit-any
    const emailResponse = response as any;
    await supabase.from("subscription_alerts").insert({
      user_id: userId,
      alert_type: `lead_limit_${threshold}`,
      alert_key: alertKey,
      resend_id: emailResponse?.id || null,
    });
    
    return true;
  } catch (error) {
    console.error("Failed to send lead limit warning:", error);
    return false;
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
    let providerPhone: string | null = null;
    let notificationPrefs: { 
      lead_notification_frequency?: string; 
      notify_new_leads?: boolean;
      notify_lead_limit_warnings?: boolean;
    } | null = null;
    
    if (facility.user_id) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("email, phone")
        .eq("user_id", facility.user_id)
        .maybeSingle();
      providerEmail = profile?.email || null;
      providerPhone = profile?.phone || null;
      
      const { data: prefs } = await supabase
        .from("notification_preferences")
        .select("lead_notification_frequency, notify_new_leads, notify_lead_limit_warnings")
        .eq("user_id", facility.user_id)
        .maybeSingle();
      notificationPrefs = prefs;
    }

    // ============ LEAD CAP CHECK ============
    let capCheckResult: { canReceiveLeads: boolean; reason?: string; leadLimit: number; usedLeads: number; planName: string; exclusivity: 'shared' | 'exclusive' } | null = null;
    let assignedFacilityId = body.facilityId;
    let assignedFacilityName = body.facilityName;
    let assignedUserId = facility.user_id;
    let assignedProviderEmail = providerEmail;
    let isReassigned = false;
    let reassignedProvider: Awaited<ReturnType<typeof findNextEligibleProvider>> = null;
    
    if (providerEmail && facility.user_id) {
      capCheckResult = await checkProviderLeadCap(supabase, facility.user_id, providerEmail);
      
      // If on basic/free plan, notify them and reassign to paying provider
      if (capCheckResult.planName === "basic") {
        console.log("Free plan provider - sending conversion notification and finding paying provider");
        
        // Send conversion email to free provider
        const resendApiKey = Deno.env.get("RESEND_API_KEY");
        if (resendApiKey) {
          try {
            const resend = new Resend(resendApiKey);
            
            // Count total missed leads for this facility
            const { count: totalLeadsCount } = await supabase
              .from("leads")
              .select("*", { count: "exact", head: true })
              .eq("facility_id", body.facilityId);
            
            const { subject, html } = getBasicPlanUpgradeEmail(
              body.facilityName,
              (totalLeadsCount || 0) + 1,
              sanitizedName
            );
            
            const facilityEmailAddress = body.facilityEmail || facility.email;
            const emailRecipients: string[] = [];
            if (facilityEmailAddress) emailRecipients.push(facilityEmailAddress);
            if (providerEmail && providerEmail !== facilityEmailAddress) emailRecipients.push(providerEmail);
            
            if (emailRecipients.length > 0) {
              await resend.emails.send({
                from: "RehabLookup <no-reply@rehablookup.com>",
                to: emailRecipients,
                subject,
                html,
              });
              console.log("Conversion email sent to free provider:", emailRecipients);
            }
          } catch (emailError) {
            console.error("Failed to send conversion email:", emailError);
          }
        }
        
        // Send conversion SMS to free provider
        if (providerPhone) {
          await sendConversionSMS(providerPhone, body.facilityName, sanitizedName);
        } else if (facility.phone) {
          await sendConversionSMS(facility.phone, body.facilityName, sanitizedName);
        }
        
        // Create in-app notification for free provider about upgrade
        try {
          await supabase.from("provider_notifications").insert({
            user_id: facility.user_id,
            facility_id: body.facilityId,
            type: "upgrade_prompt",
            title: `${sanitizedName} just inquired!`,
            message: `Someone is looking for treatment help. Upgrade to Professional to receive leads and grow your business.`,
            metadata: {
              lead_name: sanitizedName,
              action_url: "/provider/billing"
            },
          });
        } catch (notifError) {
          console.error("Failed to create upgrade notification:", notifError);
        }
        
        // Find next eligible paying provider
        reassignedProvider = await findNextEligibleProvider(
          supabase, 
          body.facilityId, 
          facility.state, 
          facility.city
        );
        
        if (reassignedProvider) {
          assignedFacilityId = reassignedProvider.facilityId;
          assignedFacilityName = reassignedProvider.facilityName;
          assignedUserId = reassignedProvider.userId;
          assignedProviderEmail = reassignedProvider.providerEmail;
          isReassigned = true;
          
          // Update cap check result for the new provider
          capCheckResult = {
            canReceiveLeads: true,
            planName: reassignedProvider.planName,
            leadLimit: reassignedProvider.leadLimit,
            usedLeads: reassignedProvider.usedLeads,
            exclusivity: reassignedProvider.planName === "featured" ? "exclusive" : "shared"
          };
          
          console.log("Lead will be assigned to paying provider:", reassignedProvider.facilityId);
        } else {
          // No paying provider available - return success but don't create lead
          console.log("No paying provider available for reassignment");
          return new Response(
            JSON.stringify({ success: true, message: "Request submitted successfully" }),
            { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
          );
        }
      } else if (!capCheckResult.canReceiveLeads) {
        // Paid provider at capacity
        console.log(`Lead cap reached for facility ${body.facilityId}: ${capCheckResult.reason}`);
        return new Response(
          JSON.stringify({ 
            error: "This facility is not currently accepting new requests. Please try another facility.",
            code: "FACILITY_UNAVAILABLE"
          }),
          { status: 503, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }
    }

    // ============ CREATE LEAD ============
    const { data: lead, error: leadError } = await supabase
      .from("leads")
      .insert({
        facility_id: assignedFacilityId,
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
        assignment_reason: `Direct inquiry to ${assignedFacilityName}`,
        assigned_at: new Date().toISOString(),
        exclusivity: capCheckResult?.exclusivity || "exclusive",
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

    console.log("Lead created successfully:", lead.id, "Assigned to:", assignedFacilityId);

    // ============ CREATE ROUTING LOG ============
    try {
      const planName = capCheckResult?.planName || "basic";
      const usedLeads = capCheckResult?.usedLeads || 0;
      const leadLimit = capCheckResult?.leadLimit || 0;
      
      await supabase.from("lead_routing_logs").insert({
        lead_id: lead.id,
        assigned_provider_id: assignedFacilityId,
        assignment_reason: `Direct inquiry to ${assignedFacilityName}`,
        plan_tier: planName,
        subscription_status: planName !== "basic" ? "active" : "none",
        lead_limit: leadLimit,
        used_leads: usedLeads,
        routing_source: "direct",
        requested_facility_id: body.facilityId,
        eligibility_check_result: {
          source: "direct_profile_form",
          facility_name: assignedFacilityName,
          plan_name: planName,
          can_receive_leads: capCheckResult?.canReceiveLeads ?? true,
          lead_cap_status: `${usedLeads}/${leadLimit}`,
          timestamp: new Date().toISOString(),
        },
      });
      console.log("Routing log created for lead:", lead.id);
    } catch (routingLogError) {
      console.error("Failed to create routing log:", routingLogError);
    }

    // ============ EMAIL NOTIFICATION TO ASSIGNED PROVIDER ============
    
    const shouldSendInstantEmail = 
      (notificationPrefs?.notify_new_leads !== false) &&
      (notificationPrefs?.lead_notification_frequency === 'instant' || !notificationPrefs?.lead_notification_frequency);
    
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    
    if (assignedProviderEmail && resendApiKey && shouldSendInstantEmail && capCheckResult?.planName !== "basic") {
      try {
        const resend = new Resend(resendApiKey);
        
        const planName = capCheckResult?.planName || "professional";
        const usedLeads = (capCheckResult?.usedLeads || 0) + 1;
        const leadLimit = capCheckResult?.leadLimit || 100;
        
        const { subject, html } = getLeadEmailTemplate(
          planName,
          assignedFacilityName,
          sanitizedName,
          sanitizedPhone,
          sanitizedEmail,
          body.preferredContact,
          sanitizedMessage,
          usedLeads,
          leadLimit
        );

        // Get facility email for the assigned provider
        const { data: assignedFacility } = await supabase
          .from("facilities")
          .select("email")
          .eq("id", assignedFacilityId)
          .maybeSingle();

        const emailRecipients: string[] = [];
        if (assignedFacility?.email) emailRecipients.push(assignedFacility.email);
        if (assignedProviderEmail && assignedProviderEmail !== assignedFacility?.email) {
          emailRecipients.push(assignedProviderEmail);
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
    if (assignedUserId) {
      try {
        await supabase
          .from("provider_notifications")
          .insert({
            user_id: assignedUserId,
            facility_id: assignedFacilityId,
            type: "lead_received",
            title: `🎉 You have a new lead!`,
            message: `${sanitizedName} is interested in ${assignedFacilityName}. Contact them quickly for the best results!`,
            metadata: {
              lead_id: lead.id,
              lead_name: sanitizedName,
              lead_email: sanitizedEmail,
              lead_phone: sanitizedPhone,
              preferred_contact: body.preferredContact,
            },
          });
        console.log("In-app notification created for user:", assignedUserId);
      } catch (notifError) {
        console.error("Failed to create in-app notification:", notifError);
      }
    }

    // ============ LEAD LIMIT WARNING ============
    const shouldSendLimitWarning = notificationPrefs?.notify_lead_limit_warnings !== false;
    
    if (capCheckResult && assignedProviderEmail && assignedUserId && capCheckResult.leadLimit > 0 && shouldSendLimitWarning) {
      const newUsedLeads = capCheckResult.usedLeads + 1;
      const usagePercentage = (newUsedLeads / capCheckResult.leadLimit) * 100;
      
      let threshold: '80' | '100' | null = null;
      
      if (usagePercentage >= 100) {
        threshold = '100';
      } else if (usagePercentage >= 80) {
        threshold = '80';
      }
      
      if (threshold) {
        await sendLeadLimitWarningEmail(
          supabase,
          assignedUserId,
          assignedProviderEmail,
          assignedFacilityName,
          newUsedLeads,
          capCheckResult.leadLimit,
          capCheckResult.planName,
          threshold
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
