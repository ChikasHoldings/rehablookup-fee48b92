import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2?target=denonext";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[CALCULATE-RANKING-SCORES] ${step}${detailsStr}`);
};

// Default weights
const DEFAULT_WEIGHTS = {
  pro_boost: 50,
  listing_completeness: 20,
  response_rate: 15,
  recency: 10,
  location_relevance: 5,
};

// Calculate listing completeness score (0-100)
function calculateCompleteness(
  facility: any,
  servicesCount: number,
  insuranceCount: number,
  staffCount: number
): number {
  let score = 0;
  
  // Logo: 15 points
  if (facility.logo_url) score += 15;
  
  // Gallery (3+ photos): 15 points
  if (facility.gallery_urls?.length >= 3) score += 15;
  else if (facility.gallery_urls?.length >= 1) score += 8;
  
  // Description (200+ chars): 15 points
  if (facility.description?.length >= 200) score += 15;
  else if (facility.description?.length >= 100) score += 8;
  
  // Services (3+ listed): 10 points
  if (servicesCount >= 3) score += 10;
  else if (servicesCount >= 1) score += 5;
  
  // Insurance (3+ listed): 10 points
  if (insuranceCount >= 3) score += 10;
  else if (insuranceCount >= 1) score += 5;
  
  // Phone verified: 10 points
  if (facility.phone) score += 10;
  
  // Reply email verified: 10 points
  if (facility.reply_email_verified) score += 10;
  
  // Staff profiles: 5 points
  if (staffCount >= 1) score += 5;
  
  // Year established: 5 points
  if (facility.year_established) score += 5;
  
  // Website: 5 points
  if (facility.website) score += 5;
  
  return Math.min(score, 100);
}

// Calculate activity/recency score (0-100)
function calculateActivityScore(lastActivityAt: string | null): number {
  if (!lastActivityAt) return 0;
  
  const daysSinceActivity = (Date.now() - new Date(lastActivityAt).getTime()) / (1000 * 60 * 60 * 24);
  
  if (daysSinceActivity <= 1) return 100;
  if (daysSinceActivity <= 7) return 80;
  if (daysSinceActivity <= 30) return 60;
  if (daysSinceActivity <= 90) return 40;
  return 20;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Fetch ranking weights from platform_settings
    let weights = DEFAULT_WEIGHTS;
    try {
      const { data: settingsData } = await supabaseClient
        .from("platform_settings")
        .select("setting_value")
        .eq("setting_key", "ranking_weights")
        .maybeSingle();
      
      if (settingsData?.setting_value) {
        weights = { ...DEFAULT_WEIGHTS, ...settingsData.setting_value };
        logStep("Loaded ranking weights", weights);
      }
    } catch (err) {
      logStep("Using default weights", { error: String(err) });
    }

    // Fetch all approved facilities
    const { data: facilities, error: facilitiesError } = await supabaseClient
      .from("facilities")
      .select("id, user_id, logo_url, gallery_urls, description, phone, reply_email_verified, year_established, website, last_activity_at")
      .eq("status", "approved");

    if (facilitiesError) {
      throw new Error(`Failed to fetch facilities: ${facilitiesError.message}`);
    }

    logStep("Fetched facilities", { count: facilities?.length || 0 });

    // Fetch Pro subscriptions
    const { data: proSubs } = await supabaseClient
      .from("pro_subscriptions")
      .select("facility_id")
      .eq("status", "active")
      .gt("current_period_end", new Date().toISOString());

    const proFacilityIds = new Set((proSubs || []).map(s => s.facility_id));
    logStep("Pro facilities", { count: proFacilityIds.size });

    // Fetch services count per facility
    const { data: servicesData } = await supabaseClient
      .from("facility_services")
      .select("facility_id");

    const servicesCount: Record<string, number> = {};
    (servicesData || []).forEach(s => {
      servicesCount[s.facility_id] = (servicesCount[s.facility_id] || 0) + 1;
    });

    // Fetch insurance count per facility
    const { data: insuranceData } = await supabaseClient
      .from("facility_insurance")
      .select("facility_id");

    const insuranceCount: Record<string, number> = {};
    (insuranceData || []).forEach(i => {
      insuranceCount[i.facility_id] = (insuranceCount[i.facility_id] || 0) + 1;
    });

    // Fetch staff count per facility
    const { data: staffData } = await supabaseClient
      .from("facility_staff")
      .select("facility_id");

    const staffCount: Record<string, number> = {};
    (staffData || []).forEach(s => {
      staffCount[s.facility_id] = (staffCount[s.facility_id] || 0) + 1;
    });

    // Fetch response rates (lead unlocks with response tracking)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const { data: leadUnlocks } = await supabaseClient
      .from("lead_unlocks")
      .select("facility_id, created_at")
      .gte("created_at", thirtyDaysAgo.toISOString());

    const { data: respondedLeads } = await supabaseClient
      .from("leads")
      .select("facility_id")
      .not("provider_responded_at", "is", null)
      .gte("created_at", thirtyDaysAgo.toISOString());

    // Calculate response rates per facility
    const unlocksPerFacility: Record<string, number> = {};
    (leadUnlocks || []).forEach(u => {
      unlocksPerFacility[u.facility_id] = (unlocksPerFacility[u.facility_id] || 0) + 1;
    });

    const responsesPerFacility: Record<string, number> = {};
    (respondedLeads || []).forEach(l => {
      if (l.facility_id) {
        responsesPerFacility[l.facility_id] = (responsesPerFacility[l.facility_id] || 0) + 1;
      }
    });

    // Calculate and update scores for each facility
    let updatedCount = 0;
    for (const facility of facilities || []) {
      const isPro = proFacilityIds.has(facility.id);
      
      // Calculate component scores
      const completenessRaw = calculateCompleteness(
        facility,
        servicesCount[facility.id] || 0,
        insuranceCount[facility.id] || 0,
        staffCount[facility.id] || 0
      );
      
      const activityRaw = calculateActivityScore(facility.last_activity_at);
      
      const unlocks = unlocksPerFacility[facility.id] || 0;
      const responses = responsesPerFacility[facility.id] || 0;
      const responseRateRaw = unlocks > 0 ? (responses / unlocks) * 100 : 50; // Default to 50% if no data
      
      // Calculate weighted final score
      let finalScore = 0;
      
      // Pro boost (if Pro subscriber)
      if (isPro) {
        finalScore += weights.pro_boost;
      }
      
      // Listing completeness (scaled to weight)
      finalScore += Math.round(completenessRaw * (weights.listing_completeness / 100));
      
      // Response rate (scaled to weight)
      finalScore += Math.round(responseRateRaw * (weights.response_rate / 100));
      
      // Recency/activity (scaled to weight)
      finalScore += Math.round(activityRaw * (weights.recency / 100));
      
      // Update facility with calculated scores
      const { error: updateError } = await supabaseClient
        .from("facilities")
        .update({
          listing_completeness_score: Math.round(completenessRaw),
          response_rate_score: Math.round(responseRateRaw),
          calculated_ranking_score: finalScore,
        })
        .eq("id", facility.id);

      if (updateError) {
        logStep("Error updating facility score", { facilityId: facility.id, error: updateError.message });
      } else {
        updatedCount++;
      }
    }

    logStep("Completed", { updatedCount });

    return new Response(
      JSON.stringify({ 
        success: true,
        updatedCount,
        message: `Updated ranking scores for ${updatedCount} facilities`
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
