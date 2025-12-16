import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";
import Stripe from "https://esm.sh/stripe@18.5.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Plan configuration - Basic plan gets NO routed leads (0 qualified_lead_limit)
// CRITICAL: Basic plan is NEVER eligible for routed qualified leads
const PLAN_CONFIG: Record<string, { product_ids: string[]; lead_limit: number; qualified_lead_limit: number; priority_score: number }> = {
  basic: { product_ids: [], lead_limit: 0, qualified_lead_limit: 0, priority_score: 0 },
  professional: { product_ids: ["prod_TbalLOPujTIoUe", "prod_Tbyz1bf6iYyzYd"], lead_limit: 25, qualified_lead_limit: 25, priority_score: 15 },
  featured: { product_ids: ["prod_TbalOeJZA2ZoJl", "prod_TbyzJVNOQL71NN"], lead_limit: 75, qualified_lead_limit: 75, priority_score: 30 },
};

// CRITICAL: Only these plans can receive routed qualified leads
const PAID_PLANS = ["professional", "featured"];

// ============ SCORING WEIGHTS (Internal Only - Never Exposed) ============
const SCORING_WEIGHTS = {
  // Plan Priority
  PLAN_FEATURED: 30,
  PLAN_PROFESSIONAL: 15,
  
  // Location Relevance
  LOCATION_CITY_MATCH: 25,
  LOCATION_METRO_MATCH: 15,
  LOCATION_STATE_MATCH: 5,
  
  // Service Relevance
  TREATMENT_LEVEL_MATCH: 20,
  INSURANCE_MATCH: 10,
  
  // Fairness & Rotation (Churn Protection)
  FAIRNESS_FEW_LEADS: 15,       // Fewer leads received this billing cycle
  FAIRNESS_LONGEST_WAIT: 10,    // Longest time since last assignment
  FAIRNESS_ZERO_LEADS_BOOST: 20, // Provider received 0 leads this cycle
  
  // Quality Penalties
  PENALTY_NON_RESPONSE: -15,    // Recent non-response pattern
  PENALTY_REASSIGNED: -10,      // Leads reassigned due to inactivity
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
  insuranceTypes: string[];
  subscriptionStatus: string;
  isSuspended: boolean;
  // Fairness metrics
  leadsThisCycle: number;
  nonResponseCount: number;
  reassignedCount: number;
}

interface ProviderScore {
  provider: ProviderCapacity;
  totalScore: number;
  breakdown: {
    planPriority: number;
    locationRelevance: number;
    serviceRelevance: number;
    fairnessBonus: number;
    qualityPenalty: number;
  };
}

interface ProviderEligibility {
  isEligible: boolean;
  planName: string;
  subscriptionStatus: string;
  leadLimit: number;
  usedLeads: number;
  isSuspended: boolean;
  reason?: string;
}

async function hashIP(ip: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(ip + Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"));
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("").substring(0, 16);
}

// CRITICAL: Check provider eligibility for routed qualified leads
async function checkProviderEligibility(
  supabase: any,
  facilityUserId: string,
  providerEmail: string,
  facilityId: string
): Promise<ProviderEligibility> {
  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
  
  console.log(`[checkProviderEligibility] Checking eligibility for facility ${facilityId}`);
  
  // Check if facility is suspended
  const { data: facility } = await supabase
    .from("facilities")
    .select("suspended")
    .eq("id", facilityId)
    .maybeSingle();
  
  const isSuspended = facility?.suspended === true;
  
  if (isSuspended) {
    console.log(`[checkProviderEligibility] Facility ${facilityId} is SUSPENDED - NOT eligible`);
    return {
      isEligible: false,
      planName: "unknown",
      subscriptionStatus: "unknown",
      leadLimit: 0,
      usedLeads: 0,
      isSuspended: true,
      reason: "Facility is suspended"
    };
  }

  let planName = "basic";
  let leadLimit = PLAN_CONFIG.basic.qualified_lead_limit;
  let subscriptionStatus = "none";
  
  if (!stripeKey) {
    console.error("[checkProviderEligibility] STRIPE_SECRET_KEY not set - defaulting to basic (NOT eligible)");
    return {
      isEligible: false,
      planName: "basic",
      subscriptionStatus: "none",
      leadLimit: 0,
      usedLeads: 0,
      isSuspended: false,
      reason: "No active subscription (Basic plan)"
    };
  }

  try {
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
        subscriptionStatus = "active";
        const subscription = subscriptions.data[0];
        const productId = subscription.items.data[0].price.product as string;
        
        if (PLAN_CONFIG.professional.product_ids.includes(productId)) {
          planName = "professional";
          leadLimit = PLAN_CONFIG.professional.qualified_lead_limit;
        } else if (PLAN_CONFIG.featured.product_ids.includes(productId)) {
          planName = "featured";
          leadLimit = PLAN_CONFIG.featured.qualified_lead_limit;
        }
      }
    }
    
    if (!PAID_PLANS.includes(planName)) {
      console.log(`[checkProviderEligibility] Provider on ${planName} plan - NOT eligible for routed leads`);
      return {
        isEligible: false,
        planName,
        subscriptionStatus,
        leadLimit: 0,
        usedLeads: 0,
        isSuspended: false,
        reason: `Basic plan providers do not receive routed qualified leads`
      };
    }
    
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    
    const { data: userFacilities } = await supabase
      .from("facilities")
      .select("id")
      .eq("user_id", facilityUserId);
    
    const facilityIds = (userFacilities as { id: string }[] || []).map(f => f.id);
    
    let usedLeads = 0;
    if (facilityIds.length > 0) {
      const { count: monthlyLeadCount } = await supabase
        .from("leads")
        .select("*", { count: "exact", head: true })
        .in("facility_id", facilityIds)
        .gte("created_at", startOfMonth.toISOString())
        .eq("qualified", true);
      
      usedLeads = monthlyLeadCount || 0;
    }
    
    if (usedLeads >= leadLimit) {
      console.log(`[checkProviderEligibility] Provider at capacity (${usedLeads}/${leadLimit}) - NOT eligible`);
      return {
        isEligible: false,
        planName,
        subscriptionStatus,
        leadLimit,
        usedLeads,
        isSuspended: false,
        reason: `Provider has reached monthly lead limit (${usedLeads}/${leadLimit})`
      };
    }
    
    console.log(`[checkProviderEligibility] Provider ELIGIBLE: ${planName} plan, ${usedLeads}/${leadLimit} leads used`);
    return {
      isEligible: true,
      planName,
      subscriptionStatus,
      leadLimit,
      usedLeads,
      isSuspended: false
    };
    
  } catch (error) {
    console.error("[checkProviderEligibility] Error checking eligibility:", error);
    return {
      isEligible: false,
      planName: "unknown",
      subscriptionStatus: "error",
      leadLimit: 0,
      usedLeads: 0,
      isSuspended: false,
      reason: "Error checking subscription status"
    };
  }
}

// Get all eligible providers with capacity and matching criteria
async function getEligibleProviders(
  supabase: any,
  leadData: QualifiedLeadRequest
): Promise<ProviderCapacity[]> {
  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
  
  console.log("[getEligibleProviders] Starting to fetch eligible providers...");

  if (!stripeKey) {
    console.error("[getEligibleProviders] STRIPE_SECRET_KEY not set - cannot verify subscriptions");
    return [];
  }

  try {
    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    
    // Get all approved, non-suspended facilities with services and insurance
    const { data: facilities, error: facilitiesError } = await supabase
      .from("facilities")
      .select(`
        id, name, email, user_id, city, state, suspended,
        facility_services (service_name),
        facility_insurance (insurance_name)
      `)
      .eq("status", "approved")
      .neq("suspended", true);
    
    if (facilitiesError) {
      console.error("[getEligibleProviders] Error fetching facilities:", facilitiesError);
      return [];
    }
    
    console.log(`[getEligibleProviders] Found ${facilities?.length || 0} approved, non-suspended facilities`);
    
    if (!facilities || facilities.length === 0) return [];
    
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    
    // Parse lead location
    const leadState = leadData.locationCityState?.split(",").pop()?.trim().toUpperCase() || "";
    const leadCity = leadData.locationCityState?.split(",")[0]?.trim().toLowerCase() || "";
    
    const providers: ProviderCapacity[] = [];
    
    for (const facility of facilities) {
      if (facility.suspended === true) {
        console.log(`[getEligibleProviders] Skipping ${facility.name} - suspended`);
        continue;
      }
      
      // Get provider profile email
      const { data: profile } = await supabase
        .from("profiles")
        .select("email")
        .eq("user_id", facility.user_id)
        .maybeSingle();
      
      if (!profile?.email) {
        console.log(`[getEligibleProviders] Skipping ${facility.name} - no profile email`);
        continue;
      }
      
      // Get subscription plan
      let planName = "basic";
      let leadLimit = PLAN_CONFIG.basic.qualified_lead_limit;
      let subscriptionStatus = "none";
      
      try {
        const customers = await stripe.customers.list({ email: profile.email, limit: 1 });
        if (customers.data.length > 0) {
          const subscriptions = await stripe.subscriptions.list({
            customer: customers.data[0].id,
            status: "active",
            limit: 1,
          });
          
          if (subscriptions.data.length > 0) {
            subscriptionStatus = "active";
            const productId = subscriptions.data[0].items.data[0].price.product as string;
            if (PLAN_CONFIG.featured.product_ids.includes(productId)) {
              planName = "featured";
              leadLimit = PLAN_CONFIG.featured.qualified_lead_limit;
            } else if (PLAN_CONFIG.professional.product_ids.includes(productId)) {
              planName = "professional";
              leadLimit = PLAN_CONFIG.professional.qualified_lead_limit;
            }
          }
        }
      } catch (e) {
        console.error(`[getEligibleProviders] Error checking subscription for ${profile.email}:`, e);
        continue;
      }
      
      // CRITICAL: Skip basic plan providers
      if (!PAID_PLANS.includes(planName)) {
        console.log(`[getEligibleProviders] Skipping ${facility.name} - ${planName} plan not eligible`);
        continue;
      }
      
      // ============ HARD FILTER: Location Match ============
      const providerState = facility.state?.toUpperCase() || "";
      const providerCity = facility.city?.toLowerCase() || "";
      
      // Must match at least state for eligibility
      if (leadState && providerState !== leadState) {
        console.log(`[getEligibleProviders] Skipping ${facility.name} - state mismatch (${providerState} vs ${leadState})`);
        continue;
      }
      
      // Count leads this month
      const { count: monthlyLeadCount } = await supabase
        .from("leads")
        .select("*", { count: "exact", head: true })
        .eq("facility_id", facility.id)
        .gte("created_at", startOfMonth.toISOString())
        .eq("qualified", true);
      
      const usedLeads = monthlyLeadCount || 0;
      const availableCapacity = leadLimit - usedLeads;
      
      if (availableCapacity <= 0) {
        console.log(`[getEligibleProviders] Skipping ${facility.name} - at capacity (${usedLeads}/${leadLimit})`);
        continue;
      }
      
      // Get last assigned lead timestamp
      const { data: lastLead } = await supabase
        .from("leads")
        .select("assigned_at")
        .eq("facility_id", facility.id)
        .not("assigned_at", "is", null)
        .order("assigned_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      
      // Get non-response count (leads that stayed "new" for > 24 hours)
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { count: nonResponseCount } = await supabase
        .from("leads")
        .select("*", { count: "exact", head: true })
        .eq("facility_id", facility.id)
        .eq("status", "new")
        .lte("created_at", twentyFourHoursAgo);
      
      // Get reassigned leads count (leads that were re-routed from this provider)
      const { count: reassignedCount } = await supabase
        .from("lead_routing_logs")
        .select("*", { count: "exact", head: true })
        .eq("requested_facility_id", facility.id)
        .neq("assigned_provider_id", facility.id)
        .gte("created_at", startOfMonth.toISOString());
      
      const serviceTypes = (facility.facility_services || []).map((s: any) => s.service_name.toLowerCase());
      const insuranceTypes = (facility.facility_insurance || []).map((i: any) => i.insurance_name.toLowerCase());
      
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
        insuranceTypes,
        subscriptionStatus,
        isSuspended: false,
        leadsThisCycle: usedLeads,
        nonResponseCount: nonResponseCount || 0,
        reassignedCount: reassignedCount || 0,
      });
    }
    
    console.log(`[getEligibleProviders] Returning ${providers.length} eligible paid providers`);
    return providers;
  } catch (error) {
    console.error("[getEligibleProviders] Error:", error);
    return [];
  }
}

// ============ LEAD SCORING MODEL (Internal Only) ============
function calculateProviderScore(
  provider: ProviderCapacity,
  leadData: QualifiedLeadRequest,
  allProviders: ProviderCapacity[]
): ProviderScore {
  const breakdown = {
    planPriority: 0,
    locationRelevance: 0,
    serviceRelevance: 0,
    fairnessBonus: 0,
    qualityPenalty: 0,
  };

  // ============ 1. Plan Priority ============
  if (provider.planName === "featured") {
    breakdown.planPriority = SCORING_WEIGHTS.PLAN_FEATURED;
  } else if (provider.planName === "professional") {
    breakdown.planPriority = SCORING_WEIGHTS.PLAN_PROFESSIONAL;
  }

  // ============ 2. Location Relevance ============
  const leadState = leadData.locationCityState?.split(",").pop()?.trim().toUpperCase() || "";
  const leadCity = leadData.locationCityState?.split(",")[0]?.trim().toLowerCase() || "";
  const leadZip = leadData.locationZip || "";
  
  const providerState = provider.state?.toUpperCase() || "";
  const providerCity = provider.city?.toLowerCase() || "";
  
  if (providerCity === leadCity && providerState === leadState) {
    breakdown.locationRelevance = SCORING_WEIGHTS.LOCATION_CITY_MATCH;
  } else if (providerState === leadState) {
    // Check if nearby (simple ZIP prefix match for metro areas)
    const leadZipPrefix = leadZip.substring(0, 3);
    // For now, state match with potential metro = 15 points
    breakdown.locationRelevance = SCORING_WEIGHTS.LOCATION_METRO_MATCH;
  } else if (providerState === leadState) {
    breakdown.locationRelevance = SCORING_WEIGHTS.LOCATION_STATE_MATCH;
  }

  // ============ 3. Service Relevance ============
  const levelOfCare = leadData.levelOfCare?.toLowerCase() || "";
  const insuranceType = leadData.insuranceType?.toLowerCase() || "";
  const insuranceProvider = leadData.insuranceProvider?.toLowerCase() || "";
  
  // Treatment level match
  if (levelOfCare && provider.serviceTypes.some(s => 
    s.includes(levelOfCare) || 
    levelOfCare.includes(s) ||
    (levelOfCare.includes("inpatient") && s.includes("residential")) ||
    (levelOfCare.includes("outpatient") && s.includes("iop"))
  )) {
    breakdown.serviceRelevance += SCORING_WEIGHTS.TREATMENT_LEVEL_MATCH;
  }
  
  // Insurance match (if specified)
  if (insuranceProvider && provider.insuranceTypes.some(i => 
    i.includes(insuranceProvider) || insuranceProvider.includes(i)
  )) {
    breakdown.serviceRelevance += SCORING_WEIGHTS.INSURANCE_MATCH;
  } else if (insuranceType && insuranceType !== "none" && provider.insuranceTypes.length > 0) {
    // Generic insurance type match
    breakdown.serviceRelevance += SCORING_WEIGHTS.INSURANCE_MATCH / 2;
  }

  // ============ 4. Fairness & Rotation (Churn Protection) ============
  const sameTierProviders = allProviders.filter(p => p.planName === provider.planName);
  
  if (sameTierProviders.length > 1) {
    // Calculate average leads for same tier
    const avgLeads = sameTierProviders.reduce((sum, p) => sum + p.leadsThisCycle, 0) / sameTierProviders.length;
    
    // Fewer leads than average = bonus
    if (provider.leadsThisCycle < avgLeads) {
      const difference = avgLeads - provider.leadsThisCycle;
      breakdown.fairnessBonus += Math.min(SCORING_WEIGHTS.FAIRNESS_FEW_LEADS, difference * 3);
    }
    
    // Zero leads this cycle = extra boost
    if (provider.leadsThisCycle === 0) {
      breakdown.fairnessBonus += SCORING_WEIGHTS.FAIRNESS_ZERO_LEADS_BOOST;
    }
  }
  
  // Longest time since last assignment bonus
  if (provider.lastAssignedAt) {
    const hoursSinceLastAssignment = (Date.now() - new Date(provider.lastAssignedAt).getTime()) / (1000 * 60 * 60);
    if (hoursSinceLastAssignment > 24) {
      breakdown.fairnessBonus += Math.min(SCORING_WEIGHTS.FAIRNESS_LONGEST_WAIT, Math.floor(hoursSinceLastAssignment / 24) * 2);
    }
  } else {
    // Never received a lead = bonus
    breakdown.fairnessBonus += SCORING_WEIGHTS.FAIRNESS_LONGEST_WAIT;
  }

  // ============ 5. Quality Penalties ============
  if (provider.nonResponseCount > 2) {
    breakdown.qualityPenalty += SCORING_WEIGHTS.PENALTY_NON_RESPONSE;
  }
  
  if (provider.reassignedCount > 0) {
    breakdown.qualityPenalty += SCORING_WEIGHTS.PENALTY_REASSIGNED * Math.min(provider.reassignedCount, 3);
  }

  // ============ 6. Fairness Dampener (Critical) ============
  // Providers who receive significantly more leads than peers have score reduced
  if (sameTierProviders.length > 1) {
    const maxLeads = Math.max(...sameTierProviders.map(p => p.leadsThisCycle));
    const minLeads = Math.min(...sameTierProviders.map(p => p.leadsThisCycle));
    
    if (maxLeads > 0 && provider.leadsThisCycle === maxLeads && maxLeads > minLeads + 3) {
      // Dampening for providers dominating lead distribution
      const dampening = Math.min(20, (provider.leadsThisCycle - minLeads) * 2);
      breakdown.fairnessBonus -= dampening;
      console.log(`[Scoring] Applied fairness dampener of -${dampening} to ${provider.facilityName}`);
    }
  }

  const totalScore = 
    breakdown.planPriority + 
    breakdown.locationRelevance + 
    breakdown.serviceRelevance + 
    breakdown.fairnessBonus + 
    breakdown.qualityPenalty;

  return {
    provider,
    totalScore,
    breakdown,
  };
}

// Find best provider using scoring model
function findBestProvider(
  providers: ProviderCapacity[],
  leadData: QualifiedLeadRequest
): { provider: ProviderCapacity | null; reason: string; score: ProviderScore | null } {
  const available = providers.filter(p => p.availableCapacity > 0 && PAID_PLANS.includes(p.planName));
  
  if (available.length === 0) {
    return { provider: null, reason: "No eligible paid providers with available capacity", score: null };
  }
  
  // Score all providers
  const scoredProviders = available.map(p => calculateProviderScore(p, leadData, available));
  
  // Sort by total score (descending)
  scoredProviders.sort((a, b) => {
    if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore;
    // For equal scores, prefer least-recently-assigned (round-robin)
    const aTime = a.provider.lastAssignedAt ? new Date(a.provider.lastAssignedAt).getTime() : 0;
    const bTime = b.provider.lastAssignedAt ? new Date(b.provider.lastAssignedAt).getTime() : 0;
    return aTime - bTime;
  });
  
  // Log top 3 for debugging
  console.log("[Scoring] Top providers:");
  scoredProviders.slice(0, 3).forEach((s, i) => {
    console.log(`  ${i + 1}. ${s.provider.facilityName}: ${s.totalScore} points`, s.breakdown);
  });
  
  const best = scoredProviders[0];
  if (!best) {
    return { provider: null, reason: "No matching eligible providers found", score: null };
  }
  
  // Build human-readable reason
  const reasons: string[] = [];
  if (best.breakdown.locationRelevance >= SCORING_WEIGHTS.LOCATION_CITY_MATCH) {
    reasons.push("city match");
  } else if (best.breakdown.locationRelevance >= SCORING_WEIGHTS.LOCATION_METRO_MATCH) {
    reasons.push("metro match");
  } else if (best.breakdown.locationRelevance > 0) {
    reasons.push("state match");
  }
  
  if (best.breakdown.serviceRelevance >= SCORING_WEIGHTS.TREATMENT_LEVEL_MATCH) {
    reasons.push("service match");
  }
  
  if (best.provider.planName === "featured") {
    reasons.push("Featured provider");
  } else if (best.provider.planName === "professional") {
    reasons.push("Professional provider");
  }
  
  if (best.breakdown.fairnessBonus > 10) {
    reasons.push("fair rotation");
  }
  
  const reason = reasons.length > 0 
    ? `Auto-assigned: ${reasons.join(", ")}`
    : "Auto-assigned: best available match";
  
  return { provider: best.provider, reason, score: best };
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
              <p style="margin: 0; color: #2e7d32; font-size: 14px;">✓ This lead was matched to you based on location, services, and availability</p>
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
    <h1 style="color: #fff; margin: 0; font-size: 24px;">Lead Limit Warning</h1>
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
        Upgrade Your Plan
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
      subject: `Lead Limit Warning: ${percentage}% used (${remainingLeads} leads remaining)`,
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
        <span style="font-size: 14px; color: #6b7280;">Your information is secure and confidential</span>
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
    const isQualified = emailVerified;
    const qualificationReason = !emailVerified ? "Email not verified" : null;

    // ============ AUTO-ASSIGNMENT LOGIC ============
    let assignedFacilityId: string | null = null;
    let assignedFacilityUserId: string | null = null;
    let assignedFacilityEmail: string | null = null;
    let assignedFacilityName: string | null = null;
    let assignedProviderEmail: string | null = null;
    let assignedPlanName: string | null = null;
    let assignmentStatus = "pending";
    let assignmentReason = "";
    let scoringBreakdown: any = null;

    // Case 1: Lead came from a specific provider's profile (provider-specific request - bypasses scoring)
    if (leadData.facilityId) {
      console.log(`[Routing] Provider-specific request for facility ${leadData.facilityId}`);
      
      const { data: facility } = await supabase
        .from("facilities")
        .select("id, name, email, status, user_id, suspended")
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
          // CRITICAL: Check provider eligibility BEFORE assignment
          const eligibility = await checkProviderEligibility(
            supabase, 
            facility.user_id, 
            profile.email,
            facility.id
          );
          
          if (!eligibility.isEligible) {
            console.log(`[Routing] Provider ${facility.name} NOT eligible: ${eligibility.reason}`);
            
            if (eligibility.planName === "basic" || !PAID_PLANS.includes(eligibility.planName)) {
              // CRITICAL: Basic plan provider direct request - DO NOT auto-assign elsewhere
              // Return specific response so frontend can show appropriate message
              console.log(`[Routing] Basic plan provider requested directly - blocking with fallback message`);
              
              // Still create the lead but mark as unassigned with specific reason
              const { data: blockedLead, error: blockedInsertError } = await supabase
                .from("leads")
                .insert({
                  facility_id: null, // NOT assigned to any provider
                  name: leadData.name.trim(),
                  phone: leadData.phone.trim(),
                  email: leadData.email.toLowerCase().trim(),
                  preferred_contact: leadData.preferredContact,
                  message: leadData.message?.trim() || null,
                  ip_hash: ipHash,
                  email_verified: emailVerified,
                  source: "Direct Profile (Blocked)",
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
                  qualified: isQualified,
                  qualification_reason: qualificationReason,
                  assignment_status: "blocked_basic_provider",
                  assignment_reason: `Requested provider (${facility.name}) is on Basic plan - does not accept routed inquiries`,
                  assigned_at: null,
                })
                .select()
                .single();

              if (blockedInsertError) {
                console.error("Failed to insert blocked lead:", blockedInsertError);
              } else {
                // Log the routing decision
                await supabase.from("lead_routing_logs").insert({
                  lead_id: blockedLead?.id,
                  assigned_provider_id: null,
                  assignment_reason: `Blocked: Basic plan provider (${facility.name}) cannot receive routed leads`,
                  plan_tier: "basic",
                  routing_source: "direct_blocked",
                  requested_facility_id: facility.id,
                  eligibility_check_result: {
                    blocked_reason: "basic_plan_direct_request",
                    requested_facility_name: facility.name,
                  },
                });
              }

              return new Response(
                JSON.stringify({ 
                  success: false,
                  error: "provider_unavailable",
                  message: "This provider does not currently accept direct inquiries. Please use our Request Help form to be matched with an available provider.",
                  showFallback: true,
                }),
                { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
              );
            } else if (eligibility.isSuspended) {
              assignmentStatus = "unassigned_provider_suspended";
              assignmentReason = `Requested provider (${facility.name}) is currently suspended`;
            } else {
              assignmentStatus = "unassigned_provider_at_capacity";
              assignmentReason = `Requested provider (${facility.name}) at capacity (${eligibility.usedLeads}/${eligibility.leadLimit})`;
            }
          } else {
            // Provider is eligible - assign directly (bypasses scoring for direct requests)
            assignedFacilityId = facility.id;
            assignedFacilityUserId = facility.user_id;
            assignedFacilityEmail = facility.email;
            assignedFacilityName = facility.name;
            assignedProviderEmail = profile.email;
            assignedPlanName = eligibility.planName;
            assignmentStatus = "assigned";
            assignmentReason = `Direct: Provider profile submission (${eligibility.planName} plan, ${eligibility.usedLeads}/${eligibility.leadLimit} capacity)`;
            console.log(`[Routing] Assigned to requested provider ${facility.name}`);
          }
        }
      } else {
        assignmentStatus = "unassigned_facility_not_found";
        assignmentReason = "Requested facility not found or not approved";
      }
    }

    // Case 2: No facility specified OR requested facility was ineligible - use scoring model
    if (!assignedFacilityId) {
      console.log(`[Routing] Starting scored auto-assignment (qualified: ${isQualified})...`);
      const eligibleProviders = await getEligibleProviders(supabase, leadData);
      console.log(`[Routing] Found ${eligibleProviders.length} eligible paid providers after hard filters`);
      
      if (eligibleProviders.length > 0) {
        const { provider, reason, score } = findBestProvider(eligibleProviders, leadData);
        
        if (provider) {
          assignedFacilityId = provider.facilityId;
          assignedFacilityUserId = provider.facilityUserId;
          assignedFacilityEmail = provider.facilityEmail;
          assignedFacilityName = provider.facilityName;
          assignedProviderEmail = provider.providerEmail;
          assignedPlanName = provider.planName;
          assignmentStatus = "assigned";
          assignmentReason = reason;
          scoringBreakdown = score?.breakdown || null;
          console.log(`[Routing] Scored assignment to ${provider.facilityName}: ${reason}`);
        } else {
          if (!assignmentReason) {
            assignmentStatus = "unassigned_no_capacity";
            assignmentReason = reason;
          }
          console.log(`[Routing] Could not auto-assign: ${reason}`);
        }
      } else {
        if (!assignmentReason) {
          assignmentStatus = "unassigned_no_providers";
          assignmentReason = "No eligible paid providers available in lead's location";
        }
        console.log(`[Routing] No eligible paid providers found matching criteria`);
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

    console.log(`[Routing] Lead created: ${lead.id}, qualified: ${isQualified}, assignment: ${assignmentStatus}, plan: ${assignedPlanName || 'none'}`);

    // ============ LOG ROUTING DECISION (Internal Only) ============
    try {
      await supabase
        .from("lead_routing_logs")
        .insert({
          lead_id: lead.id,
          assigned_provider_id: assignedFacilityId,
          assignment_reason: assignmentReason,
          plan_tier: assignedPlanName,
          subscription_status: assignedFacilityId ? "active" : null,
          lead_limit: assignedPlanName ? PLAN_CONFIG[assignedPlanName as keyof typeof PLAN_CONFIG]?.qualified_lead_limit : null,
          used_leads: null,
          routing_source: leadData.facilityId ? "direct" : "system",
          requested_facility_id: leadData.facilityId || null,
          eligibility_check_result: {
            qualified: isQualified,
            email_verified: emailVerified,
            assignment_status: assignmentStatus,
            scoring_breakdown: scoringBreakdown,
            lead_location: {
              city_state: leadData.locationCityState,
              zip: leadData.locationZip,
            },
            lead_criteria: {
              level_of_care: leadData.levelOfCare,
              insurance_type: leadData.insuranceType,
              urgency: leadData.urgency,
            },
          },
        });
      console.log(`[Routing] Routing log created for lead ${lead.id}`);
    } catch (logError) {
      console.error("Failed to create routing log:", logError);
    }

    // ============ SEND USER CONFIRMATION EMAIL ============
    if (isQualified && emailVerified) {
      try {
        const firstName = leadData.firstName || leadData.name.split(' ')[0] || 'there';
        await sendUserConfirmationEmail(leadData.email, firstName);
      } catch (confirmError) {
        console.error("Failed to send user confirmation email:", confirmError);
      }
    }

    // ============ SEND NOTIFICATIONS IF ASSIGNED TO PAID PROVIDER ============
    if (assignedFacilityEmail && assignedFacilityName && assignedPlanName && PAID_PLANS.includes(assignedPlanName)) {
      await sendLeadNotificationEmail(
        assignedFacilityEmail,
        assignedFacilityName,
        leadData,
        assignmentReason
      );
    }

    // Create in-app notification for assigned provider
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
              plan_name: assignedPlanName,
            },
          });
        console.log("[Routing] In-app notification created for user:", assignedFacilityUserId);
      } catch (notifError) {
        console.error("Failed to create in-app notification:", notifError);
      }
    }

    // ============ LEAD LIMIT WARNING ============
    if (assignedProviderEmail && assignedFacilityName && isQualified && assignedPlanName && PAID_PLANS.includes(assignedPlanName)) {
      const eligibility = await checkProviderEligibility(supabase, assignedFacilityUserId!, assignedProviderEmail, assignedFacilityId!);
      const newUsedLeads = eligibility.usedLeads + 1;
      const usagePercentage = (newUsedLeads / eligibility.leadLimit) * 100;
      
      if (usagePercentage >= 80) {
        await sendLeadLimitWarningEmail(
          assignedProviderEmail,
          assignedFacilityName,
          newUsedLeads,
          eligibility.leadLimit,
          eligibility.planName
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
                message: `You've used ${newUsedLeads} of ${eligibility.leadLimit} leads this month. Consider upgrading to receive more leads.`,
                metadata: {
                  used_leads: newUsedLeads,
                  lead_limit: eligibility.leadLimit,
                  plan_name: eligibility.planName,
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
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );

  } catch (error) {
    console.error("Error in submit-qualified-lead:", error);
    return new Response(
      JSON.stringify({ error: "Failed to submit request" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
