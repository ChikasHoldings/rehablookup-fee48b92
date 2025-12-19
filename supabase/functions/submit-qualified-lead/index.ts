import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";
import Stripe from "https://esm.sh/stripe@18.5.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ============ PLAN CONFIGURATION ============
// UNIFIED LEAD SYSTEM: Both plans get 100 leads/month
// Professional = shared leads (max 2 providers per lead)
// Featured = exclusive leads (1 provider per lead)
const PLAN_CONFIG: Record<string, { 
  product_ids: string[]; 
  lead_limit: number; 
  priority_score: number;
  exclusivity: 'shared' | 'exclusive';
  max_providers_per_lead: number;
}> = {
  basic: { 
    product_ids: [], 
    lead_limit: 0, 
    priority_score: 0,
    exclusivity: 'exclusive',
    max_providers_per_lead: 0
  },
  professional: { 
    product_ids: ["prod_TbalLOPujTIoUe", "prod_Tbyz1bf6iYyzYd"], 
    lead_limit: 100, 
    priority_score: 15,
    exclusivity: 'shared',
    max_providers_per_lead: 2
  },
  featured: { 
    product_ids: ["prod_TbalOeJZA2ZoJl", "prod_TbyzJVNOQL71NN"], 
    lead_limit: 100, 
    priority_score: 30,
    exclusivity: 'exclusive',
    max_providers_per_lead: 1
  },
};

// CRITICAL: Only these plans can receive routed qualified leads
const PAID_PLANS = ["professional", "featured"];

// ============ SCORING WEIGHTS (Internal Only - Never Exposed to Providers) ============
const SCORING_WEIGHTS = {
  PLAN_FEATURED: 30,
  PLAN_PROFESSIONAL: 15,
  LOCATION_CITY_MATCH: 25,
  LOCATION_METRO_MATCH: 15,
  LOCATION_STATE_MATCH: 5,
  TREATMENT_LEVEL_MATCH: 20,
  INSURANCE_MATCH: 10,
  FAIRNESS_FEW_LEADS: 15,
  FAIRNESS_LONGEST_WAIT: 10,
  FAIRNESS_ZERO_LEADS_BOOST: 20,
  PENALTY_NON_RESPONSE: -15,
  PENALTY_REASSIGNED: -10,
};

// ============ LOGGING UTILITIES ============
const generateRequestId = () => crypto.randomUUID().slice(0, 8);

const log = (requestId: string, level: "INFO" | "WARN" | "ERROR", step: string, details?: unknown) => {
  const timestamp = new Date().toISOString();
  const detailsStr = details ? ` | ${JSON.stringify(details)}` : "";
  console.log(`[${timestamp}] [${requestId}] [${level}] ${step}${detailsStr}`);
};

// ============ INTERFACES ============
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

// ============ UTILITY FUNCTIONS ============
async function hashIP(ip: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(ip + Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"));
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("").substring(0, 16);
}

function getStartOfMonth(): Date {
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);
  return startOfMonth;
}

// ============ PROVIDER ELIGIBILITY CHECK ============
// deno-lint-ignore no-explicit-any
async function checkProviderEligibility(
  supabase: any,
  facilityUserId: string,
  providerEmail: string,
  facilityId: string,
  requestId: string
): Promise<ProviderEligibility> {
  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
  
  log(requestId, "INFO", "checkProviderEligibility", { facilityId, providerEmail });
  
  // Check if facility is suspended
  const { data: facility, error: facilityError } = await supabase
    .from("facilities")
    .select("suspended, status")
    .eq("id", facilityId)
    .maybeSingle();
  
  if (facilityError) {
    log(requestId, "ERROR", "Failed to fetch facility", { error: facilityError.message });
    return {
      isEligible: false,
      planName: "unknown",
      subscriptionStatus: "error",
      leadLimit: 0,
      usedLeads: 0,
      isSuspended: false,
      reason: "Failed to verify facility status"
    };
  }
  
  if (facility?.suspended === true) {
    log(requestId, "WARN", "Facility is SUSPENDED", { facilityId });
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

  if (facility?.status !== "approved") {
    log(requestId, "WARN", "Facility not approved", { facilityId, status: facility?.status });
    return {
      isEligible: false,
      planName: "unknown",
      subscriptionStatus: "unknown",
      leadLimit: 0,
      usedLeads: 0,
      isSuspended: false,
      reason: "Facility is not approved"
    };
  }

  let planName = "basic";
  let leadLimit = PLAN_CONFIG.basic.lead_limit;
  let subscriptionStatus = "none";
  
  if (!stripeKey) {
    log(requestId, "ERROR", "STRIPE_SECRET_KEY not set - defaulting to basic");
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
        
        if (PLAN_CONFIG.featured.product_ids.includes(productId)) {
          planName = "featured";
          leadLimit = PLAN_CONFIG.featured.lead_limit;
        } else if (PLAN_CONFIG.professional.product_ids.includes(productId)) {
          planName = "professional";
          leadLimit = PLAN_CONFIG.professional.lead_limit;
        }
        
        log(requestId, "INFO", "Subscription found", { planName, productId, subscriptionId: subscription.id });
      } else {
        log(requestId, "INFO", "No active subscription found for customer", { customerId });
      }
    } else {
      log(requestId, "INFO", "No Stripe customer found for email", { providerEmail });
    }
    
    // CRITICAL: Basic plan providers cannot receive routed leads
    if (!PAID_PLANS.includes(planName)) {
      log(requestId, "WARN", "Provider on Basic plan - NOT eligible for routed leads", { planName });
      return {
        isEligible: false,
        planName,
        subscriptionStatus,
        leadLimit: 0,
        usedLeads: 0,
        isSuspended: false,
        reason: "Basic plan providers do not receive qualified leads"
      };
    }
    
    // Count leads this month across ALL provider's facilities
    const startOfMonth = getStartOfMonth();
    
    const { data: userFacilities } = await supabase
      .from("facilities")
      .select("id")
      .eq("user_id", facilityUserId);
    
    const facilityIds = (userFacilities as { id: string }[] || []).map(f => f.id);
    
    let usedLeads = 0;
    if (facilityIds.length > 0) {
      const { count: monthlyLeadCount, error: countError } = await supabase
        .from("leads")
        .select("*", { count: "exact", head: true })
        .in("facility_id", facilityIds)
        .gte("created_at", startOfMonth.toISOString())
        .eq("qualified", true);
      
      if (countError) {
        log(requestId, "ERROR", "Failed to count monthly leads", { error: countError.message });
      }
      
      usedLeads = monthlyLeadCount || 0;
    }
    
    if (usedLeads >= leadLimit) {
      log(requestId, "WARN", "Provider at capacity", { usedLeads, leadLimit });
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
    
    log(requestId, "INFO", "Provider ELIGIBLE", { planName, usedLeads, leadLimit, available: leadLimit - usedLeads });
    return {
      isEligible: true,
      planName,
      subscriptionStatus,
      leadLimit,
      usedLeads,
      isSuspended: false
    };
    
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    log(requestId, "ERROR", "Error checking eligibility", { error: errorMsg });
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

// ============ GET ELIGIBLE PROVIDERS ============
// deno-lint-ignore no-explicit-any
async function getEligibleProviders(
  supabase: any,
  leadData: QualifiedLeadRequest,
  requestId: string
): Promise<ProviderCapacity[]> {
  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
  
  log(requestId, "INFO", "getEligibleProviders starting", { 
    leadLocation: leadData.locationCityState, 
    leadZip: leadData.locationZip 
  });

  if (!stripeKey) {
    log(requestId, "ERROR", "STRIPE_SECRET_KEY not set");
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
      log(requestId, "ERROR", "Failed to fetch facilities", { error: facilitiesError.message });
      return [];
    }
    
    log(requestId, "INFO", "Facilities fetched", { count: facilities?.length || 0 });
    
    if (!facilities || facilities.length === 0) return [];
    
    const startOfMonth = getStartOfMonth();
    
    // Parse lead location for matching
    const leadState = leadData.locationCityState?.split(",").pop()?.trim().toUpperCase() || "";
    const leadCity = leadData.locationCityState?.split(",")[0]?.trim().toLowerCase() || "";
    
    const providers: ProviderCapacity[] = [];
    let skippedBasic = 0;
    let skippedNoEmail = 0;
    let skippedStateMismatch = 0;
    let skippedAtCapacity = 0;
    
    for (const facility of facilities) {
      // Skip suspended (double-check)
      if (facility.suspended === true) continue;
      
      // Get provider profile email
      const { data: profile } = await supabase
        .from("profiles")
        .select("email")
        .eq("user_id", facility.user_id)
        .maybeSingle();
      
      if (!profile?.email) {
        skippedNoEmail++;
        continue;
      }
      
      // Get subscription plan from Stripe
      let planName = "basic";
      let leadLimit = PLAN_CONFIG.basic.lead_limit;
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
              leadLimit = PLAN_CONFIG.featured.lead_limit;
            } else if (PLAN_CONFIG.professional.product_ids.includes(productId)) {
              planName = "professional";
              leadLimit = PLAN_CONFIG.professional.lead_limit;
            }
          }
        }
      } catch (e) {
        log(requestId, "WARN", "Stripe error for provider", { email: profile.email, error: String(e) });
        continue;
      }
      
      // CRITICAL: Skip basic plan providers
      if (!PAID_PLANS.includes(planName)) {
        skippedBasic++;
        continue;
      }
      
      // ============ HARD FILTER: Location Match (Must match at least state) ============
      const providerState = facility.state?.toUpperCase() || "";
      
      if (leadState && providerState !== leadState) {
        skippedStateMismatch++;
        continue;
      }
      
      // Count qualified leads this month for this facility
      const { count: monthlyLeadCount } = await supabase
        .from("leads")
        .select("*", { count: "exact", head: true })
        .eq("facility_id", facility.id)
        .gte("created_at", startOfMonth.toISOString())
        .eq("qualified", true);
      
      const usedLeads = monthlyLeadCount || 0;
      const availableCapacity = leadLimit - usedLeads;
      
      if (availableCapacity <= 0) {
        skippedAtCapacity++;
        continue;
      }
      
      // Get last assigned lead timestamp for fairness calculation
      const { data: lastLead } = await supabase
        .from("leads")
        .select("assigned_at")
        .eq("facility_id", facility.id)
        .not("assigned_at", "is", null)
        .order("assigned_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      
      // Get non-response count (leads that stayed "new" for > 24 hours) for quality penalty
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { count: nonResponseCount } = await supabase
        .from("leads")
        .select("*", { count: "exact", head: true })
        .eq("facility_id", facility.id)
        .eq("status", "new")
        .lte("created_at", twentyFourHoursAgo);
      
      // Get reassigned leads count for quality penalty
      const { count: reassignedCount } = await supabase
        .from("lead_routing_logs")
        .select("*", { count: "exact", head: true })
        .eq("requested_facility_id", facility.id)
        .neq("assigned_provider_id", facility.id)
        .gte("created_at", startOfMonth.toISOString());
      
      const serviceTypes = (facility.facility_services || []).map((s: { service_name: string }) => s.service_name.toLowerCase());
      const insuranceTypes = (facility.facility_insurance || []).map((i: { insurance_name: string }) => i.insurance_name.toLowerCase());
      
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
    
    log(requestId, "INFO", "Eligible providers found", { 
      eligible: providers.length,
      skipped: { basic: skippedBasic, noEmail: skippedNoEmail, stateMismatch: skippedStateMismatch, atCapacity: skippedAtCapacity }
    });
    
    return providers;
  } catch (error) {
    log(requestId, "ERROR", "getEligibleProviders error", { error: String(error) });
    return [];
  }
}

// ============ SCORING MODEL ============
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

  // 1. Plan Priority
  if (provider.planName === "featured") {
    breakdown.planPriority = SCORING_WEIGHTS.PLAN_FEATURED;
  } else if (provider.planName === "professional") {
    breakdown.planPriority = SCORING_WEIGHTS.PLAN_PROFESSIONAL;
  }

  // 2. Location Relevance
  const leadState = leadData.locationCityState?.split(",").pop()?.trim().toUpperCase() || "";
  const leadCity = leadData.locationCityState?.split(",")[0]?.trim().toLowerCase() || "";
  const leadZip = leadData.locationZip || "";
  
  const providerState = provider.state?.toUpperCase() || "";
  const providerCity = provider.city?.toLowerCase() || "";
  
  if (providerCity && leadCity && providerCity === leadCity && providerState === leadState) {
    breakdown.locationRelevance = SCORING_WEIGHTS.LOCATION_CITY_MATCH;
  } else if (providerState === leadState) {
    // Check ZIP prefix for metro match approximation
    const leadZipPrefix = leadZip.substring(0, 3);
    breakdown.locationRelevance = SCORING_WEIGHTS.LOCATION_METRO_MATCH;
  } else if (providerState === leadState) {
    breakdown.locationRelevance = SCORING_WEIGHTS.LOCATION_STATE_MATCH;
  }

  // 3. Service Relevance
  const levelOfCare = leadData.levelOfCare?.toLowerCase() || "";
  const insuranceType = leadData.insuranceType?.toLowerCase() || "";
  const insuranceProvider = leadData.insuranceProvider?.toLowerCase() || "";
  
  if (levelOfCare && provider.serviceTypes.some(s => 
    s.includes(levelOfCare) || 
    levelOfCare.includes(s) ||
    (levelOfCare.includes("inpatient") && s.includes("residential")) ||
    (levelOfCare.includes("outpatient") && s.includes("iop")) ||
    (levelOfCare.includes("detox") && s.includes("detox"))
  )) {
    breakdown.serviceRelevance += SCORING_WEIGHTS.TREATMENT_LEVEL_MATCH;
  }
  
  if (insuranceProvider && provider.insuranceTypes.some(i => 
    i.includes(insuranceProvider) || insuranceProvider.includes(i)
  )) {
    breakdown.serviceRelevance += SCORING_WEIGHTS.INSURANCE_MATCH;
  } else if (insuranceType && insuranceType !== "none" && provider.insuranceTypes.length > 0) {
    breakdown.serviceRelevance += SCORING_WEIGHTS.INSURANCE_MATCH / 2;
  }

  // 4. Fairness & Rotation (Churn Protection)
  const sameTierProviders = allProviders.filter(p => p.planName === provider.planName);
  
  if (sameTierProviders.length > 1) {
    const avgLeads = sameTierProviders.reduce((sum, p) => sum + p.leadsThisCycle, 0) / sameTierProviders.length;
    
    if (provider.leadsThisCycle < avgLeads) {
      const difference = avgLeads - provider.leadsThisCycle;
      breakdown.fairnessBonus += Math.min(SCORING_WEIGHTS.FAIRNESS_FEW_LEADS, difference * 3);
    }
    
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
    breakdown.fairnessBonus += SCORING_WEIGHTS.FAIRNESS_LONGEST_WAIT;
  }

  // 5. Quality Penalties
  if (provider.nonResponseCount > 2) {
    breakdown.qualityPenalty += SCORING_WEIGHTS.PENALTY_NON_RESPONSE;
  }
  
  if (provider.reassignedCount > 0) {
    breakdown.qualityPenalty += SCORING_WEIGHTS.PENALTY_REASSIGNED * Math.min(provider.reassignedCount, 3);
  }

  // 6. Fairness Dampener (Prevents monopolization)
  if (sameTierProviders.length > 1) {
    const maxLeads = Math.max(...sameTierProviders.map(p => p.leadsThisCycle));
    const minLeads = Math.min(...sameTierProviders.map(p => p.leadsThisCycle));
    
    if (maxLeads > 0 && provider.leadsThisCycle === maxLeads && maxLeads > minLeads + 3) {
      const dampening = Math.min(20, (provider.leadsThisCycle - minLeads) * 2);
      breakdown.fairnessBonus -= dampening;
    }
  }

  const totalScore = 
    breakdown.planPriority + 
    breakdown.locationRelevance + 
    breakdown.serviceRelevance + 
    breakdown.fairnessBonus + 
    breakdown.qualityPenalty;

  return { provider, totalScore, breakdown };
}

// ============ FIND BEST PROVIDERS (supports shared leads for Professional) ============
function findBestProviders(
  providers: ProviderCapacity[],
  leadData: QualifiedLeadRequest,
  requestId: string
): { 
  primary: { provider: ProviderCapacity; score: ProviderScore } | null;
  secondary: { provider: ProviderCapacity; score: ProviderScore } | null;
  exclusivity: 'exclusive' | 'shared';
  reason: string;
} {
  const available = providers.filter(p => p.availableCapacity > 0 && PAID_PLANS.includes(p.planName));
  
  if (available.length === 0) {
    return { 
      primary: null, 
      secondary: null, 
      exclusivity: 'exclusive',
      reason: "No eligible paid providers with available capacity" 
    };
  }
  
  // Score all providers
  const scoredProviders = available.map(p => calculateProviderScore(p, leadData, available));
  
  // Sort by total score (descending), then by last-assigned (round-robin for ties)
  scoredProviders.sort((a, b) => {
    if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore;
    const aTime = a.provider.lastAssignedAt ? new Date(a.provider.lastAssignedAt).getTime() : 0;
    const bTime = b.provider.lastAssignedAt ? new Date(b.provider.lastAssignedAt).getTime() : 0;
    return aTime - bTime;
  });
  
  // Log top candidates
  log(requestId, "INFO", "Top scored providers", {
    candidates: scoredProviders.slice(0, 5).map((s, i) => ({
      rank: i + 1,
      name: s.provider.facilityName,
      plan: s.provider.planName,
      score: s.totalScore,
      breakdown: s.breakdown,
      capacity: `${s.provider.usedLeads}/${s.provider.leadLimit}`
    }))
  });
  
  const best = scoredProviders[0];
  if (!best) {
    return { 
      primary: null, 
      secondary: null, 
      exclusivity: 'exclusive',
      reason: "No matching eligible providers found" 
    };
  }
  
  // EXCLUSIVITY LOGIC:
  // Featured providers get EXCLUSIVE leads (no sharing)
  // Professional providers get SHARED leads (max 2 providers)
  
  if (best.provider.planName === "featured") {
    // Featured = exclusive, no secondary provider
    const reason = buildAssignmentReason(best.provider, best.breakdown, best.totalScore, true);
    log(requestId, "INFO", "Featured provider selected - EXCLUSIVE lead", { facilityName: best.provider.facilityName });
    return {
      primary: { provider: best.provider, score: best },
      secondary: null,
      exclusivity: 'exclusive',
      reason
    };
  } else {
    // Professional = shared, find second provider
    const reason = buildAssignmentReason(best.provider, best.breakdown, best.totalScore, false);
    
    // Find next eligible Professional provider for shared lead
    let secondary: { provider: ProviderCapacity; score: ProviderScore } | null = null;
    for (let i = 1; i < scoredProviders.length; i++) {
      const candidate = scoredProviders[i];
      // Only share with other Professional providers (not Featured - Featured never gets shared leads)
      if (candidate.provider.planName === "professional" && candidate.provider.availableCapacity > 0) {
        secondary = { provider: candidate.provider, score: candidate };
        log(requestId, "INFO", "Secondary Professional provider for shared lead", { 
          facilityName: candidate.provider.facilityName 
        });
        break;
      }
    }
    
    return {
      primary: { provider: best.provider, score: best },
      secondary,
      exclusivity: 'shared',
      reason
    };
  }
}

function buildAssignmentReason(
  provider: ProviderCapacity, 
  breakdown: ProviderScore['breakdown'], 
  totalScore: number,
  isExclusive: boolean
): string {
  const reasons: string[] = [];
  
  if (breakdown.locationRelevance >= SCORING_WEIGHTS.LOCATION_CITY_MATCH) {
    reasons.push("city match");
  } else if (breakdown.locationRelevance >= SCORING_WEIGHTS.LOCATION_METRO_MATCH) {
    reasons.push("metro match");
  } else if (breakdown.locationRelevance > 0) {
    reasons.push("state match");
  }
  
  if (breakdown.serviceRelevance >= SCORING_WEIGHTS.TREATMENT_LEVEL_MATCH) {
    reasons.push("service match");
  }
  
  if (provider.planName === "featured") {
    reasons.push("Featured provider");
  } else if (provider.planName === "professional") {
    reasons.push("Professional provider");
  }
  
  if (breakdown.fairnessBonus > 10) {
    reasons.push("fair rotation");
  }
  
  const exclusivityLabel = isExclusive ? "exclusive" : "shared";
  
  return reasons.length > 0 
    ? `Auto-assigned (${exclusivityLabel}): ${reasons.join(", ")} (score: ${totalScore})`
    : `Auto-assigned (${exclusivityLabel}): best available match (score: ${totalScore})`;
}

// ============ EMAIL FUNCTIONS ============
async function sendLeadNotificationEmail(
  facilityEmail: string,
  facilityName: string,
  leadData: QualifiedLeadRequest,
  assignmentReason: string,
  isShared: boolean,
  requestId: string
): Promise<void> {
  const sharedBadge = isShared 
    ? '<span style="background: #fef3c7; color: #92400e; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: 600; margin-left: 8px;">SHARED LEAD</span>'
    : '<span style="background: #d1fae5; color: #065f46; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: 600; margin-left: 8px;">EXCLUSIVE</span>';
    
  try {
    await resend.emails.send({
      from: "RehabLookup <no-reply@rehablookup.com>",
      to: [facilityEmail],
      subject: `New Qualified Lead: ${leadData.name}${isShared ? ' (Shared)' : ''}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head><meta charset="utf-8"></head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f6f8fb; padding: 40px 20px;">
          <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; padding: 40px; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
            <div style="display: flex; align-items: center; margin-bottom: 24px;">
              <h1 style="color: #1B365D; font-size: 24px; margin: 0;">New Qualified Lead</h1>
              ${sharedBadge}
            </div>
            
            <div style="background: #e8f5e9; border-radius: 8px; padding: 12px 16px; margin-bottom: 20px;">
              <p style="margin: 0; color: #2e7d32; font-size: 14px;">
                ${isShared 
                  ? 'This lead has been shared with one other provider. Respond quickly for the best chance of connection.' 
                  : 'This lead was matched exclusively to you based on location, services, and availability.'
                }
              </p>
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
            
            <a href="https://rehablookup.com/provider/leads" style="display: inline-block; background: #1B365D; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600;">View Lead Details</a>
            
            <p style="color: #5E6B7A; font-size: 14px; margin-top: 24px;">
              This lead has been verified via email confirmation. View and respond to this lead in your RehabLookup provider dashboard.
            </p>
          </div>
          
          <div style="background: #1B365D; padding: 24px 40px; border-radius: 0 0 12px 12px; max-width: 600px; margin: 0 auto;">
            <p style="margin: 0 0 8px 0; font-size: 16px; font-weight: 600; color: #fff; text-align: center;">RehabLookup</p>
            <p style="margin: 0 0 12px 0; font-size: 12px; color: rgba(255,255,255,0.7); text-align: center;">Connecting families with trusted treatment providers</p>
            <p style="margin: 0; font-size: 11px; color: rgba(255,255,255,0.5); text-align: center;">
              <a href="https://rehablookup.com/provider/settings" style="color: #93c5fd;">Settings</a> · <a href="mailto:support@rehablookup.com" style="color: #93c5fd;">Support</a>
            </p>
          </div>
        </body>
        </html>
      `,
    });
    log(requestId, "INFO", "Lead notification email sent", { to: facilityEmail, isShared });
  } catch (emailError) {
    log(requestId, "ERROR", "Failed to send lead notification", { error: String(emailError) });
  }
}

async function sendLeadLimitWarningEmail(
  providerEmail: string,
  facilityName: string,
  usedLeads: number,
  leadLimit: number,
  planName: string,
  requestId: string
): Promise<void> {
  const percentage = Math.round((usedLeads / leadLimit) * 100);
  const remainingLeads = leadLimit - usedLeads;

  try {
    await resend.emails.send({
      from: "RehabLookup <no-reply@rehablookup.com>",
      to: [providerEmail],
      subject: `Lead Limit Warning: ${percentage}% used (${remainingLeads} leads remaining)`,
      html: `
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
      Once you reach your limit, new leads will be paused until next month. Contact support if you need additional capacity.
    </p>
    
    <div style="text-align: center; margin-top: 28px;">
      <a href="https://rehablookup.com/provider/billing" style="display: inline-block; background: linear-gradient(135deg, #1B365D 0%, #2C4A7F 100%); color: #fff; padding: 16px 40px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px;">
        View Usage Details
      </a>
    </div>
  </div>
  
  <div style="background: #1B365D; padding: 24px; border-radius: 12px; margin-top: 16px;">
    <p style="margin: 0 0 8px 0; font-size: 16px; font-weight: 600; color: #fff; text-align: center;">RehabLookup</p>
    <p style="margin: 0; font-size: 11px; color: rgba(255,255,255,0.6); text-align: center;">
      <a href="https://rehablookup.com/provider/billing" style="color: #93c5fd;">Billing</a> · <a href="mailto:support@rehablookup.com" style="color: #93c5fd;">Support</a>
    </p>
  </div>
</body>
</html>
      `,
    });
    log(requestId, "INFO", "Lead limit warning sent", { to: providerEmail, percentage });
  } catch (error) {
    log(requestId, "ERROR", "Failed to send lead limit warning", { error: String(error) });
  }
}

async function sendUserConfirmationEmail(
  userEmail: string,
  firstName: string,
  requestId: string
): Promise<void> {
  try {
    await resend.emails.send({
      from: "RehabLookup <no-reply@rehablookup.com>",
      to: [userEmail],
      subject: "We've received your request",
      html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f6f8fb;">
  <div style="background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.06);">
    <div style="background: linear-gradient(135deg, #1B365D 0%, #2C4A7F 100%); padding: 28px; text-align: center;">
      <h1 style="color: #fff; margin: 0; font-size: 22px; font-weight: 600;">We've received your request</h1>
    </div>
    
    <div style="padding: 32px 28px;">
      <p style="margin: 0 0 20px 0; font-size: 16px; color: #1a1a1a;">Hi ${firstName},</p>
      
      <p style="margin: 0 0 16px 0; font-size: 15px; color: #4b5563;">Thank you for reaching out to RehabLookup.</p>
      
      <p style="margin: 0 0 16px 0; font-size: 15px; color: #4b5563;">Your request for information has been received and successfully reviewed. Based on what you shared, your request has been forwarded to a treatment provider that matches your needs and location.</p>
      
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
    </div>
    
    <div style="background: #1B365D; padding: 28px; border-radius: 0 0 12px 12px;">
      <p style="margin: 0 0 8px 0; font-size: 18px; font-weight: 600; color: #fff; text-align: center;">RehabLookup</p>
      <p style="margin: 0 0 16px 0; font-size: 12px; color: rgba(255,255,255,0.7); text-align: center;">Connecting families with trusted treatment providers</p>
      <div style="text-align: center; margin-bottom: 12px;">
        <a href="https://rehablookup.com/privacy-policy" style="color: #93c5fd; font-size: 11px; text-decoration: none;">Privacy Policy</a>
        <span style="color: rgba(255,255,255,0.3); margin: 0 8px;">|</span>
        <a href="mailto:support@rehablookup.com" style="color: #93c5fd; font-size: 11px; text-decoration: none;">Support</a>
      </div>
      <p style="margin: 0; font-size: 10px; color: rgba(255,255,255,0.4); text-align: center;">If you did not make this request, please disregard this email.</p>
    </div>
  </div>
</body>
</html>
      `,
    });
    log(requestId, "INFO", "User confirmation email sent", { to: userEmail });
  } catch (error) {
    log(requestId, "ERROR", "Failed to send user confirmation", { error: String(error) });
  }
}

// ============ MAIN HANDLER ============
const handler = async (req: Request): Promise<Response> => {
  const requestId = generateRequestId();
  
  log(requestId, "INFO", "Request received", { 
    method: req.method,
    url: req.url,
    contentType: req.headers.get("content-type"),
  });

  if (req.method === "OPTIONS") {
    log(requestId, "INFO", "CORS preflight request");
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    log(requestId, "WARN", "Invalid request method", { method: req.method });
    return new Response(
      JSON.stringify({ error: "Method not allowed", details: `Expected POST, got ${req.method}` }),
      { status: 405, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }

  try {
    // ============ ENVIRONMENT VALIDATION ============
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    const resendKey = Deno.env.get("RESEND_API_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      log(requestId, "ERROR", "Missing required environment variables", {
        hasSupabaseUrl: !!supabaseUrl,
        hasServiceKey: !!supabaseServiceKey,
      });
      return new Response(
        JSON.stringify({ error: "Server configuration error" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    log(requestId, "INFO", "Environment check", {
      hasSupabaseUrl: true,
      hasServiceKey: true,
      hasStripeKey: !!stripeKey,
      hasResendKey: !!resendKey,
    });

    // ============ PARSE REQUEST BODY ============
    let leadData: QualifiedLeadRequest;
    try {
      const rawBody = await req.text();
      log(requestId, "INFO", "Raw body received", { length: rawBody.length, preview: rawBody.substring(0, 100) });
      
      if (!rawBody || rawBody.trim() === "") {
        log(requestId, "ERROR", "Empty request body");
        return new Response(
          JSON.stringify({ error: "Request body is empty" }),
          { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }
      
      leadData = JSON.parse(rawBody);
      log(requestId, "INFO", "JSON parsed successfully");
    } catch (parseError) {
      const errorMsg = parseError instanceof Error ? parseError.message : String(parseError);
      log(requestId, "ERROR", "Failed to parse request body", { error: errorMsg });
      return new Response(
        JSON.stringify({ error: "Invalid JSON in request body", details: errorMsg }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }
    
    log(requestId, "INFO", "Lead data parsed", { 
      facilityId: leadData.facilityId || "none",
      location: leadData.locationCityState,
      email: leadData.email?.substring(0, 3) + "***",
      hasName: !!leadData.name,
      hasPhone: !!leadData.phone,
      hasUrgency: !!leadData.urgency,
      hasLevelOfCare: !!leadData.levelOfCare,
    });

    // ============ LEAD QUALIFICATION GATE ============
    // A lead is only routed if it passes: valid phone OR email, location match, not duplicate, not spam
    
    // Validate required fields
    const requiredFields = ["whoSeekingHelp", "locationZip", "urgency", "levelOfCare", "name", "phone", "email", "preferredContact"];
    const missingFields: string[] = [];
    
    for (const field of requiredFields) {
      const value = leadData[field as keyof QualifiedLeadRequest];
      if (!value || (typeof value === "string" && value.trim() === "")) {
        missingFields.push(field);
      }
    }
    
    if (missingFields.length > 0) {
      log(requestId, "WARN", "Missing required fields - UNQUALIFIED", { missingFields });
      return new Response(
        JSON.stringify({ error: `Missing required fields: ${missingFields.join(", ")}` }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Validate email format
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(leadData.email)) {
      log(requestId, "WARN", "Invalid email format - UNQUALIFIED", { email: leadData.email?.substring(0, 5) + "***" });
      return new Response(
        JSON.stringify({ error: "Invalid email format" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Validate phone format
    const phoneDigits = leadData.phone.replace(/\D/g, "");
    if (phoneDigits.length < 10) {
      log(requestId, "WARN", "Invalid phone number - UNQUALIFIED", { digitCount: phoneDigits.length });
      return new Response(
        JSON.stringify({ error: "Invalid phone number - must have at least 10 digits" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Validate input lengths to prevent abuse
    if (leadData.name.length > 200 || leadData.email.length > 255 || (leadData.message && leadData.message.length > 2000)) {
      log(requestId, "WARN", "Input length exceeded - spam check", { 
        nameLen: leadData.name.length, 
        emailLen: leadData.email.length,
        messageLen: leadData.message?.length || 0 
      });
      return new Response(
        JSON.stringify({ error: "Input length exceeded maximum allowed" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    log(requestId, "INFO", "Validation passed - creating Supabase client");
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // ============ EMAIL VERIFICATION CHECK ============
    const { data: verificationRecord } = await supabase
      .from("email_verification_codes")
      .select("verified")
      .eq("email", leadData.email.toLowerCase())
      .eq("verified", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const emailVerified = !!verificationRecord;
    log(requestId, "INFO", "Email verification status", { verified: emailVerified });

    // ============ DUPLICATE CHECK (suppression window) ============
    const clientIP = req.headers.get("x-forwarded-for")?.split(",")[0] || 
                     req.headers.get("cf-connecting-ip") || 
                     "unknown";
    const ipHash = await hashIP(clientIP);

    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    
    const { data: recentLeads } = await supabase
      .from("leads")
      .select("source")
      .eq("email", leadData.email.toLowerCase())
      .gte("created_at", oneHourAgo);
    
    // Filter to count any lead submissions (no more "direct" distinction)
    if ((recentLeads || []).length > 0) {
      log(requestId, "WARN", "Duplicate submission blocked - UNQUALIFIED", { email: leadData.email });
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "You've already submitted a help request recently. Please wait before submitting again.",
          isDuplicate: true 
        }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // ============ RATE LIMIT CHECK (spam validation) ============
    const { count: ipCount } = await supabase
      .from("leads")
      .select("*", { count: "exact", head: true })
      .eq("ip_hash", ipHash)
      .gte("created_at", oneHourAgo);

    if (ipCount && ipCount >= 5) {
      log(requestId, "WARN", "IP rate limit exceeded - UNQUALIFIED (spam)", { ipHash });
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Too many submissions. Please try again later.",
          isRateLimited: true 
        }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // ============ LEAD IS QUALIFIED - PROCEED WITH ROUTING ============
    const isQualified = emailVerified;
    const qualificationReason = !emailVerified ? "Email not verified" : null;

    // ============ ROUTING VARIABLES ============
    let primaryFacilityId: string | null = null;
    let primaryFacilityUserId: string | null = null;
    let primaryFacilityEmail: string | null = null;
    let primaryFacilityName: string | null = null;
    let primaryProviderEmail: string | null = null;
    let primaryPlanName: string | null = null;
    
    let secondaryFacilityId: string | null = null;
    let secondaryFacilityUserId: string | null = null;
    let secondaryFacilityEmail: string | null = null;
    let secondaryFacilityName: string | null = null;
    let secondaryProviderEmail: string | null = null;
    
    let assignmentStatus = "pending";
    let assignmentReason = "";
    let leadExclusivity: 'exclusive' | 'shared' = 'exclusive';
    let scoringBreakdown: Record<string, number> | null = null;
    let eligibilityResult: ProviderEligibility | null = null;

    // ============ FEATURED PROFILE SUBMISSION SAFEGUARD ============
    // When a lead is submitted from a Featured provider profile page:
    // Route ONLY to that Featured provider, no secondary routing
    if (leadData.facilityId) {
      log(requestId, "INFO", "Processing direct provider request", { facilityId: leadData.facilityId });
      
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
          eligibilityResult = await checkProviderEligibility(
            supabase, 
            facility.user_id, 
            profile.email,
            facility.id,
            requestId
          );
          
          if (!eligibilityResult.isEligible) {
            log(requestId, "WARN", "Requested provider not eligible", { 
              reason: eligibilityResult.reason,
              planName: eligibilityResult.planName 
            });
            
            // Basic plan providers cannot receive leads
            if (!PAID_PLANS.includes(eligibilityResult.planName)) {
              // Create unassigned lead record
              const { data: blockedLead } = await supabase
                .from("leads")
                .insert({
                  facility_id: null,
                  name: leadData.name.trim(),
                  phone: leadData.phone.trim(),
                  email: leadData.email.toLowerCase().trim(),
                  preferred_contact: leadData.preferredContact,
                  message: leadData.message?.trim() || null,
                  ip_hash: ipHash,
                  email_verified: emailVerified,
                  source: "Profile Submission (Blocked)",
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
                  assignment_reason: `Requested provider (${facility.name}) is on Basic plan`,
                  assigned_at: null,
                  exclusivity: 'exclusive',
                  routing_order: 1,
                  shared_with: [],
                })
                .select()
                .single();

              // Log routing decision
              await supabase.from("lead_routing_logs").insert({
                lead_id: blockedLead?.id,
                assigned_provider_id: null,
                assignment_reason: `Blocked: Basic plan provider cannot receive leads`,
                plan_tier: "basic",
                routing_source: "direct_blocked",
                requested_facility_id: facility.id,
                exclusivity: 'exclusive',
                provider_routing_order: 1,
                eligibility_check_result: {
                  blocked_reason: "basic_plan",
                  requested_facility_name: facility.name,
                  request_id: requestId,
                },
              });

              log(requestId, "INFO", "Basic plan profile submission blocked", { facilityName: facility.name });

              return new Response(
                JSON.stringify({ 
                  success: false,
                  error: "provider_unavailable",
                  message: "This provider is not currently accepting leads. Please use our Request Help form to be matched with an available provider.",
                  showFallback: true,
                }),
                { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
              );
            } else if (eligibilityResult.isSuspended) {
              assignmentStatus = "unassigned_provider_suspended";
              assignmentReason = `Requested provider (${facility.name}) is currently suspended`;
            } else {
              assignmentStatus = "unassigned_provider_at_capacity";
              assignmentReason = `Requested provider (${facility.name}) at capacity (${eligibilityResult.usedLeads}/${eligibilityResult.leadLimit})`;
            }
          } else {
            // Provider is eligible - assign directly
            // FEATURED PROFILE SAFEGUARD: No secondary routing for Featured profile submissions
            primaryFacilityId = facility.id;
            primaryFacilityUserId = facility.user_id;
            primaryFacilityEmail = facility.email;
            primaryFacilityName = facility.name;
            primaryProviderEmail = profile.email;
            primaryPlanName = eligibilityResult.planName;
            assignmentStatus = "assigned";
            
            // Featured profile = exclusive, Professional profile = could be shared but direct profile = exclusive
            leadExclusivity = 'exclusive';
            assignmentReason = `Profile submission: Exclusive to ${facility.name} (${eligibilityResult.planName} plan)`;
            log(requestId, "INFO", "Assigned to requested provider - EXCLUSIVE", { facilityName: facility.name });
          }
        }
      } else {
        assignmentStatus = "unassigned_facility_not_found";
        assignmentReason = "Requested facility not found or not approved";
        log(requestId, "WARN", "Requested facility not found", { facilityId: leadData.facilityId });
      }
    }

    // ============ AUTO-ASSIGNMENT: Fair-share routing with exclusivity rules ============
    if (!primaryFacilityId) {
      log(requestId, "INFO", "Starting scored auto-assignment", { qualified: isQualified });
      const eligibleProviders = await getEligibleProviders(supabase, leadData, requestId);
      
      if (eligibleProviders.length > 0) {
        const result = findBestProviders(eligibleProviders, leadData, requestId);
        
        if (result.primary) {
          primaryFacilityId = result.primary.provider.facilityId;
          primaryFacilityUserId = result.primary.provider.facilityUserId;
          primaryFacilityEmail = result.primary.provider.facilityEmail;
          primaryFacilityName = result.primary.provider.facilityName;
          primaryProviderEmail = result.primary.provider.providerEmail;
          primaryPlanName = result.primary.provider.planName;
          assignmentStatus = "assigned";
          assignmentReason = result.reason;
          leadExclusivity = result.exclusivity;
          scoringBreakdown = result.primary.score.breakdown;
          
          // Secondary provider for shared leads
          if (result.secondary && result.exclusivity === 'shared') {
            secondaryFacilityId = result.secondary.provider.facilityId;
            secondaryFacilityUserId = result.secondary.provider.facilityUserId;
            secondaryFacilityEmail = result.secondary.provider.facilityEmail;
            secondaryFacilityName = result.secondary.provider.facilityName;
            secondaryProviderEmail = result.secondary.provider.providerEmail;
            log(requestId, "INFO", "Shared lead assignment", { 
              primary: primaryFacilityName, 
              secondary: secondaryFacilityName 
            });
          }
          
          log(requestId, "INFO", "Scored assignment complete", { 
            facilityName: primaryFacilityName, 
            exclusivity: leadExclusivity,
            score: result.primary.score.totalScore 
          });
        } else {
          if (!assignmentReason) {
            assignmentStatus = "unassigned_no_capacity";
            assignmentReason = result.reason;
          }
        }
      } else {
        if (!assignmentReason) {
          assignmentStatus = "unassigned_no_providers";
          assignmentReason = "No eligible paid providers available in lead's location";
        }
        log(requestId, "WARN", "No eligible providers found");
      }
    }

    // ============ CREATE THE LEAD ============
    const sharedWithArray: string[] = [];
    if (leadExclusivity === 'shared') {
      if (primaryFacilityId) sharedWithArray.push(primaryFacilityId);
      if (secondaryFacilityId) sharedWithArray.push(secondaryFacilityId);
    }
    
    const { data: lead, error: insertError } = await supabase
      .from("leads")
      .insert({
        facility_id: primaryFacilityId,
        name: leadData.name.trim(),
        phone: leadData.phone.trim(),
        email: leadData.email.toLowerCase().trim(),
        preferred_contact: leadData.preferredContact,
        message: leadData.message?.trim() || null,
        ip_hash: ipHash,
        email_verified: emailVerified,
        source: leadData.source || (leadData.facilityId ? "Profile Submission" : "Request Help"),
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
        assigned_at: primaryFacilityId ? new Date().toISOString() : null,
        exclusivity: leadExclusivity,
        routing_order: 1,
        shared_with: sharedWithArray,
      })
      .select()
      .single();

    if (insertError) {
      log(requestId, "ERROR", "Failed to insert lead", { error: insertError.message });
      throw new Error("Failed to submit request");
    }

    log(requestId, "INFO", "Lead created", { 
      leadId: lead.id, 
      qualified: isQualified, 
      assignmentStatus,
      exclusivity: leadExclusivity,
      plan: primaryPlanName || "none" 
    });

    // ============ LOG ROUTING DECISION (Primary Provider) ============
    try {
      await supabase.from("lead_routing_logs").insert({
        lead_id: lead.id,
        assigned_provider_id: primaryFacilityId,
        assignment_reason: assignmentReason,
        plan_tier: primaryPlanName,
        subscription_status: primaryFacilityId ? "active" : null,
        lead_limit: primaryPlanName ? PLAN_CONFIG[primaryPlanName as keyof typeof PLAN_CONFIG]?.lead_limit : null,
        used_leads: eligibilityResult?.usedLeads ?? null,
        routing_source: leadData.facilityId ? "direct" : "system",
        requested_facility_id: leadData.facilityId || null,
        exclusivity: leadExclusivity,
        provider_routing_order: 1,
        eligibility_check_result: {
          request_id: requestId,
          qualified: isQualified,
          email_verified: emailVerified,
          assignment_status: assignmentStatus,
          exclusivity: leadExclusivity,
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
      
      // Log secondary provider for shared leads
      if (secondaryFacilityId && leadExclusivity === 'shared') {
        await supabase.from("lead_routing_logs").insert({
          lead_id: lead.id,
          assigned_provider_id: secondaryFacilityId,
          assignment_reason: `Shared lead - secondary assignment`,
          plan_tier: "professional",
          subscription_status: "active",
          lead_limit: PLAN_CONFIG.professional.lead_limit,
          routing_source: "system",
          exclusivity: 'shared',
          provider_routing_order: 2,
          eligibility_check_result: {
            request_id: requestId,
            is_secondary: true,
            primary_provider: primaryFacilityName,
          },
        });
      }
    } catch (logError) {
      log(requestId, "ERROR", "Failed to create routing log", { error: String(logError) });
    }

    // ============ SEND EMAILS ============
    if (isQualified && emailVerified) {
      const firstName = leadData.firstName || leadData.name.split(' ')[0] || 'there';
      await sendUserConfirmationEmail(leadData.email, firstName, requestId);
    }

    // Email primary provider
    if (primaryFacilityEmail && primaryFacilityName && primaryPlanName && PAID_PLANS.includes(primaryPlanName)) {
      await sendLeadNotificationEmail(
        primaryFacilityEmail,
        primaryFacilityName,
        leadData,
        assignmentReason,
        leadExclusivity === 'shared',
        requestId
      );
    }
    
    // Email secondary provider for shared leads
    if (secondaryFacilityEmail && secondaryFacilityName && leadExclusivity === 'shared') {
      await sendLeadNotificationEmail(
        secondaryFacilityEmail,
        secondaryFacilityName,
        leadData,
        `Shared lead - secondary assignment`,
        true,
        requestId
      );
    }

    // Create in-app notifications
    if (primaryFacilityUserId && primaryFacilityId) {
      try {
        await supabase.from("provider_notifications").insert({
          user_id: primaryFacilityUserId,
          facility_id: primaryFacilityId,
          type: "lead_received",
          title: `New ${leadExclusivity === 'exclusive' ? 'exclusive' : 'shared'} lead from ${leadData.name}`,
          message: `${leadData.name} is seeking ${leadData.levelOfCare} care. They prefer to be contacted via ${leadData.preferredContact}.`,
          metadata: {
            lead_id: lead.id,
            lead_name: leadData.name,
            preferred_contact: leadData.preferredContact,
            level_of_care: leadData.levelOfCare,
            urgency: leadData.urgency,
            quality_flag: isQualified ? "qualified" : "unqualified",
            plan_name: primaryPlanName,
            exclusivity: leadExclusivity,
          },
        });
      } catch (notifError) {
        log(requestId, "ERROR", "Failed to create notification", { error: String(notifError) });
      }
    }
    
    // Notification for secondary provider
    if (secondaryFacilityUserId && secondaryFacilityId && leadExclusivity === 'shared') {
      try {
        await supabase.from("provider_notifications").insert({
          user_id: secondaryFacilityUserId,
          facility_id: secondaryFacilityId,
          type: "lead_received",
          title: `New shared lead from ${leadData.name}`,
          message: `${leadData.name} is seeking ${leadData.levelOfCare} care. This lead has been shared with one other provider.`,
          metadata: {
            lead_id: lead.id,
            lead_name: leadData.name,
            preferred_contact: leadData.preferredContact,
            level_of_care: leadData.levelOfCare,
            urgency: leadData.urgency,
            quality_flag: isQualified ? "qualified" : "unqualified",
            plan_name: "professional",
            exclusivity: 'shared',
            is_secondary: true,
          },
        });
      } catch (notifError) {
        log(requestId, "ERROR", "Failed to create secondary notification", { error: String(notifError) });
      }
    }

    // ============ LEAD LIMIT WARNING ============
    if (primaryProviderEmail && primaryFacilityName && isQualified && primaryPlanName && PAID_PLANS.includes(primaryPlanName) && primaryFacilityUserId && primaryFacilityId) {
      const freshEligibility = await checkProviderEligibility(supabase, primaryFacilityUserId, primaryProviderEmail, primaryFacilityId, requestId);
      const newUsedLeads = freshEligibility.usedLeads + 1;
      const usagePercentage = (newUsedLeads / freshEligibility.leadLimit) * 100;
      
      if (usagePercentage >= 80) {
        await sendLeadLimitWarningEmail(
          primaryProviderEmail,
          primaryFacilityName,
          newUsedLeads,
          freshEligibility.leadLimit,
          freshEligibility.planName,
          requestId
        );
        
        await supabase.from("provider_notifications").insert({
          user_id: primaryFacilityUserId,
          facility_id: primaryFacilityId,
          type: "lead_limit_warning",
          title: `${Math.round(usagePercentage)}% of monthly leads used`,
          message: `You've used ${newUsedLeads} of ${freshEligibility.leadLimit} leads this month.`,
          metadata: {
            used_leads: newUsedLeads,
            lead_limit: freshEligibility.leadLimit,
            plan_name: freshEligibility.planName,
            percentage: usagePercentage,
          },
        });
      }
    }

    log(requestId, "INFO", "Request completed successfully");

    return new Response(
      JSON.stringify({ 
        success: true, 
        leadId: lead.id,
        qualified: isQualified,
        assigned: !!primaryFacilityId,
        assignmentStatus,
        exclusivity: leadExclusivity,
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );

  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    log(requestId, "ERROR", "Request failed with exception", { 
      error: errorMsg,
      stack: errorStack?.substring(0, 500),
      type: error instanceof Error ? error.constructor.name : typeof error,
    });
    
    let statusCode = 500;
    let userMessage = "Failed to submit request. Please try again.";
    
    if (errorMsg.includes("duplicate") || errorMsg.includes("unique constraint")) {
      statusCode = 409;
      userMessage = "A similar request was already submitted recently.";
    } else if (errorMsg.includes("timeout") || errorMsg.includes("TIMEOUT")) {
      statusCode = 504;
      userMessage = "Request timed out. Please try again.";
    } else if (errorMsg.includes("rate limit") || errorMsg.includes("too many")) {
      statusCode = 429;
      userMessage = "Too many requests. Please wait a moment and try again.";
    }
    
    return new Response(
      JSON.stringify({ 
        error: userMessage,
        requestId: requestId,
        timestamp: new Date().toISOString(),
      }),
      { status: statusCode, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
