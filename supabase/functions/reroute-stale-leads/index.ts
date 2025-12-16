import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";
import Stripe from "https://esm.sh/stripe@18.5.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Plan configuration - mirrors submit-qualified-lead
const PLAN_CONFIG: Record<string, { product_ids: string[]; lead_limit: number; priority_score: number }> = {
  basic: { product_ids: [], lead_limit: 0, priority_score: 0 },
  professional: { product_ids: ["prod_TbalLOPujTIoUe", "prod_Tbyz1bf6iYyzYd"], lead_limit: 25, priority_score: 15 },
  featured: { product_ids: ["prod_TbalOeJZA2ZoJl", "prod_TbyzJVNOQL71NN"], lead_limit: 75, priority_score: 30 },
};

const PAID_PLANS = ["professional", "featured"];

// Scoring weights
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

interface StaleLead {
  id: string;
  facility_id: string;
  name: string;
  email: string;
  phone: string;
  location_city_state: string | null;
  location_zip: string | null;
  level_of_care: string | null;
  insurance_type: string | null;
  insurance_provider: string | null;
  assigned_at: string;
  status: string;
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

// Get eligible providers (excluding the current one)
async function getEligibleProviders(
  supabase: any,
  stripe: any,
  lead: StaleLead,
  excludeFacilityId: string
): Promise<ProviderCapacity[]> {
  console.log(`[getEligibleProviders] Finding alternatives for lead ${lead.id}, excluding ${excludeFacilityId}`);

  const { data: facilities, error } = await supabase
    .from("facilities")
    .select(`
      id, name, email, user_id, city, state, suspended,
      facility_services (service_name),
      facility_insurance (insurance_name)
    `)
    .eq("status", "approved")
    .neq("suspended", true)
    .neq("id", excludeFacilityId);

  if (error || !facilities || facilities.length === 0) {
    console.log(`[getEligibleProviders] No facilities found or error:`, error);
    return [];
  }

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const leadState = lead.location_city_state?.split(",").pop()?.trim().toUpperCase() || "";
  const providers: ProviderCapacity[] = [];

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
          } else if (PLAN_CONFIG.professional.product_ids.includes(productId)) {
            planName = "professional";
            leadLimit = PLAN_CONFIG.professional.lead_limit;
          }
        }
      }
    } catch (e) {
      console.error(`[getEligibleProviders] Stripe error for ${profile.email}:`, e);
      continue;
    }

    // Skip non-paid plans
    if (!PAID_PLANS.includes(planName)) continue;

    // Check state match
    const providerState = facility.state?.toUpperCase() || "";
    if (leadState && providerState !== leadState) continue;

    // Count leads this month
    const { count: monthlyLeadCount } = await supabase
      .from("leads")
      .select("*", { count: "exact", head: true })
      .eq("facility_id", facility.id)
      .gte("created_at", startOfMonth.toISOString())
      .eq("qualified", true);

    const usedLeads = monthlyLeadCount || 0;
    if (usedLeads >= leadLimit) continue;

    // Get last assigned and quality metrics
    const { data: lastLead } = await supabase
      .from("leads")
      .select("assigned_at")
      .eq("facility_id", facility.id)
      .not("assigned_at", "is", null)
      .order("assigned_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { count: nonResponseCount } = await supabase
      .from("leads")
      .select("*", { count: "exact", head: true })
      .eq("facility_id", facility.id)
      .eq("status", "new")
      .lte("created_at", twentyFourHoursAgo);

    const { count: reassignedCount } = await supabase
      .from("lead_routing_logs")
      .select("*", { count: "exact", head: true })
      .eq("requested_facility_id", facility.id)
      .neq("assigned_provider_id", facility.id)
      .gte("created_at", startOfMonth.toISOString());

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
      availableCapacity: leadLimit - usedLeads,
      lastAssignedAt: lastLead?.assigned_at || null,
      serviceTypes: (facility.facility_services || []).map((s: any) => s.service_name.toLowerCase()),
      insuranceTypes: (facility.facility_insurance || []).map((i: any) => i.insurance_name.toLowerCase()),
      leadsThisCycle: usedLeads,
      nonResponseCount: nonResponseCount || 0,
      reassignedCount: reassignedCount || 0,
    });
  }

  console.log(`[getEligibleProviders] Found ${providers.length} eligible alternatives`);
  return providers;
}

// Score provider for lead
function calculateProviderScore(
  provider: ProviderCapacity,
  lead: StaleLead,
  allProviders: ProviderCapacity[]
): ProviderScore {
  const breakdown = {
    planPriority: 0,
    locationRelevance: 0,
    serviceRelevance: 0,
    fairnessBonus: 0,
    qualityPenalty: 0,
  };

  // Plan priority
  if (provider.planName === "featured") {
    breakdown.planPriority = SCORING_WEIGHTS.PLAN_FEATURED;
  } else if (provider.planName === "professional") {
    breakdown.planPriority = SCORING_WEIGHTS.PLAN_PROFESSIONAL;
  }

  // Location relevance
  const leadState = lead.location_city_state?.split(",").pop()?.trim().toUpperCase() || "";
  const leadCity = lead.location_city_state?.split(",")[0]?.trim().toLowerCase() || "";
  const providerState = provider.state?.toUpperCase() || "";
  const providerCity = provider.city?.toLowerCase() || "";

  if (providerCity === leadCity && providerState === leadState) {
    breakdown.locationRelevance = SCORING_WEIGHTS.LOCATION_CITY_MATCH;
  } else if (providerState === leadState) {
    breakdown.locationRelevance = SCORING_WEIGHTS.LOCATION_METRO_MATCH;
  }

  // Service relevance
  const levelOfCare = lead.level_of_care?.toLowerCase() || "";
  const insuranceProvider = lead.insurance_provider?.toLowerCase() || "";

  if (levelOfCare && provider.serviceTypes.some(s =>
    s.includes(levelOfCare) ||
    levelOfCare.includes(s) ||
    (levelOfCare.includes("inpatient") && s.includes("residential")) ||
    (levelOfCare.includes("outpatient") && s.includes("iop"))
  )) {
    breakdown.serviceRelevance += SCORING_WEIGHTS.TREATMENT_LEVEL_MATCH;
  }

  if (insuranceProvider && provider.insuranceTypes.some(i =>
    i.includes(insuranceProvider) || insuranceProvider.includes(i)
  )) {
    breakdown.serviceRelevance += SCORING_WEIGHTS.INSURANCE_MATCH;
  }

  // Fairness bonuses
  const sameTierProviders = allProviders.filter(p => p.planName === provider.planName);
  if (sameTierProviders.length > 1) {
    const avgLeads = sameTierProviders.reduce((sum, p) => sum + p.leadsThisCycle, 0) / sameTierProviders.length;
    if (provider.leadsThisCycle < avgLeads) {
      breakdown.fairnessBonus += Math.min(SCORING_WEIGHTS.FAIRNESS_FEW_LEADS, (avgLeads - provider.leadsThisCycle) * 3);
    }
    if (provider.leadsThisCycle === 0) {
      breakdown.fairnessBonus += SCORING_WEIGHTS.FAIRNESS_ZERO_LEADS_BOOST;
    }
  }

  if (provider.lastAssignedAt) {
    const hoursSince = (Date.now() - new Date(provider.lastAssignedAt).getTime()) / (1000 * 60 * 60);
    if (hoursSince > 24) {
      breakdown.fairnessBonus += Math.min(SCORING_WEIGHTS.FAIRNESS_LONGEST_WAIT, Math.floor(hoursSince / 24) * 2);
    }
  } else {
    breakdown.fairnessBonus += SCORING_WEIGHTS.FAIRNESS_LONGEST_WAIT;
  }

  // Quality penalties
  if (provider.nonResponseCount > 2) {
    breakdown.qualityPenalty += SCORING_WEIGHTS.PENALTY_NON_RESPONSE;
  }
  if (provider.reassignedCount > 0) {
    breakdown.qualityPenalty += SCORING_WEIGHTS.PENALTY_REASSIGNED * Math.min(provider.reassignedCount, 3);
  }

  // Fairness dampener
  if (sameTierProviders.length > 1) {
    const maxLeads = Math.max(...sameTierProviders.map(p => p.leadsThisCycle));
    const minLeads = Math.min(...sameTierProviders.map(p => p.leadsThisCycle));
    if (maxLeads > 0 && provider.leadsThisCycle === maxLeads && maxLeads > minLeads + 3) {
      breakdown.fairnessBonus -= Math.min(20, (provider.leadsThisCycle - minLeads) * 2);
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

// Send notification email to new provider
async function sendReassignmentNotification(
  provider: ProviderCapacity,
  lead: StaleLead
): Promise<void> {
  const recipientEmail = provider.providerEmail || provider.facilityEmail;
  if (!recipientEmail) return;

  try {
    await resend.emails.send({
      from: "RehabLookup <no-reply@rehablookup.com>",
      to: recipientEmail,
      subject: `New Lead Re-assigned: ${lead.name}`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #1B365D 0%, #2A4A7A 100%); padding: 24px; border-radius: 8px 8px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 24px;">New Lead Assigned</h1>
          </div>
          <div style="background: #ffffff; padding: 24px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
            <p style="color: #374151; font-size: 16px; line-height: 1.6;">
              A lead has been re-assigned to your facility. Please respond promptly to maximize your conversion rate.
            </p>
            <div style="background: #f3f4f6; padding: 16px; border-radius: 8px; margin: 20px 0;">
              <p style="margin: 0 0 8px 0;"><strong>Name:</strong> ${lead.name}</p>
              <p style="margin: 0 0 8px 0;"><strong>Location:</strong> ${lead.location_city_state || "Not specified"}</p>
              <p style="margin: 0;"><strong>Level of Care:</strong> ${lead.level_of_care || "Not specified"}</p>
            </div>
            <a href="https://rehablookup.com/provider/leads" 
               style="display: inline-block; background: #1B365D; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600;">
              View Lead Details
            </a>
            <p style="color: #6b7280; font-size: 14px; margin-top: 20px;">
              This lead was automatically re-assigned because the previous provider did not respond within 24 hours.
            </p>
          </div>
        </div>
      `,
    });
    console.log(`[sendReassignmentNotification] Email sent to ${recipientEmail}`);
  } catch (error) {
    console.error(`[sendReassignmentNotification] Failed to send email:`, error);
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  if (!stripeKey) {
    console.error("[reroute-stale-leads] STRIPE_SECRET_KEY not set");
    return new Response(JSON.stringify({ error: "Configuration error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

  console.log("[reroute-stale-leads] Starting stale lead check...");

  try {
    // Find leads that:
    // 1. Are assigned to a facility
    // 2. Still have status = "new"
    // 3. Were assigned more than 24 hours ago
    // 4. Are qualified leads
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const { data: staleLeads, error: fetchError } = await supabase
      .from("leads")
      .select("id, facility_id, name, email, phone, location_city_state, location_zip, level_of_care, insurance_type, insurance_provider, assigned_at, status")
      .not("facility_id", "is", null)
      .eq("status", "new")
      .eq("qualified", true)
      .lte("assigned_at", twentyFourHoursAgo);

    if (fetchError) {
      throw new Error(`Failed to fetch stale leads: ${fetchError.message}`);
    }

    console.log(`[reroute-stale-leads] Found ${staleLeads?.length || 0} stale leads to process`);

    if (!staleLeads || staleLeads.length === 0) {
      return new Response(JSON.stringify({ 
        success: true, 
        message: "No stale leads to process",
        processed: 0 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let rerouted = 0;
    let failed = 0;

    for (const lead of staleLeads as StaleLead[]) {
      console.log(`[reroute-stale-leads] Processing lead ${lead.id} (assigned to ${lead.facility_id})`);

      // Get eligible providers (excluding current)
      const eligibleProviders = await getEligibleProviders(supabase, stripe, lead, lead.facility_id);

      if (eligibleProviders.length === 0) {
        console.log(`[reroute-stale-leads] No eligible alternatives for lead ${lead.id} - marking as system unassigned`);
        
        // Log the failed re-route
        await supabase.from("lead_routing_logs").insert({
          lead_id: lead.id,
          requested_facility_id: lead.facility_id,
          assigned_provider_id: null,
          assignment_reason: "Re-route failed: No eligible alternative providers",
          routing_source: "reroute_stale",
          eligibility_check_result: { stale_hours: 24, original_provider: lead.facility_id },
        });

        failed++;
        continue;
      }

      // Score and find best provider
      const scoredProviders = eligibleProviders.map(p => calculateProviderScore(p, lead, eligibleProviders));
      scoredProviders.sort((a, b) => {
        if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore;
        const aTime = a.provider.lastAssignedAt ? new Date(a.provider.lastAssignedAt).getTime() : 0;
        const bTime = b.provider.lastAssignedAt ? new Date(b.provider.lastAssignedAt).getTime() : 0;
        return aTime - bTime;
      });

      const best = scoredProviders[0];
      console.log(`[reroute-stale-leads] Best alternative: ${best.provider.facilityName} (score: ${best.totalScore})`);

      // Update lead assignment
      const now = new Date().toISOString();
      const { error: updateError } = await supabase
        .from("leads")
        .update({
          facility_id: best.provider.facilityId,
          assigned_at: now,
          assignment_status: "reassigned",
          assignment_reason: `Re-routed after 24h non-response: ${best.provider.facilityName} (score: ${best.totalScore})`,
        })
        .eq("id", lead.id);

      if (updateError) {
        console.error(`[reroute-stale-leads] Failed to update lead ${lead.id}:`, updateError);
        failed++;
        continue;
      }

      // Log the re-routing
      await supabase.from("lead_routing_logs").insert({
        lead_id: lead.id,
        requested_facility_id: lead.facility_id,
        assigned_provider_id: best.provider.facilityId,
        assignment_reason: `Re-routed after 24h non-response (score: ${best.totalScore})`,
        routing_source: "reroute_stale",
        plan_tier: best.provider.planName,
        lead_limit: best.provider.leadLimit,
        used_leads: best.provider.usedLeads,
        eligibility_check_result: {
          stale_hours: 24,
          original_provider: lead.facility_id,
          scoring_breakdown: best.breakdown,
        },
      });

      // Create notification for new provider
      await supabase.from("provider_notifications").insert({
        user_id: best.provider.facilityUserId,
        facility_id: best.provider.facilityId,
        type: "lead_reassigned",
        title: "New Lead Assigned",
        message: `A lead (${lead.name}) has been re-assigned to you. Please respond promptly.`,
        metadata: { lead_id: lead.id, from_facility: lead.facility_id },
      });

      // Send email notification
      await sendReassignmentNotification(best.provider, lead);

      rerouted++;
      console.log(`[reroute-stale-leads] Successfully re-routed lead ${lead.id} to ${best.provider.facilityName}`);
    }

    console.log(`[reroute-stale-leads] Complete. Rerouted: ${rerouted}, Failed: ${failed}`);

    return new Response(JSON.stringify({
      success: true,
      processed: staleLeads.length,
      rerouted,
      failed,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("[reroute-stale-leads] Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
