import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2?target=denonext";

const VERSION = "1.0.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const generateRequestId = () => `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

const logStep = (requestId: string, step: string, details?: Record<string, unknown>) => {
  const timestamp = new Date().toISOString();
  console.log(`[MATCH-CONCIERGE] [${VERSION}] [${requestId}] [${timestamp}] ${step}${details ? ` - ${JSON.stringify(details)}` : ""}`);
};

interface MatchFactors {
  location: number;
  careType: number;
  insurance: number;
  availability: number;
  gender: number;
  age: number;
  specializations: number;
}

interface FacilityMatch {
  facilityId: string;
  facilityName: string;
  matchScore: number;
  matchFactors: MatchFactors;
  city: string;
  state: string;
}

// Scoring weights (total 100 points)
const WEIGHTS = {
  location: 35,      // max 35
  careType: 25,      // max 25
  insurance: 20,     // max 20
  availability: 8,   // max 8
  gender: 5,         // max 5
  age: 4,            // max 4
  specializations: 3 // max 3
};

// Score gender matching
function scoreGender(inquiryGender: string | null, facilityGender: string | null): number {
  if (!inquiryGender) return 3; // Unknown, partial credit
  if (!facilityGender || facilityGender.toLowerCase() === 'all' || facilityGender.toLowerCase() === 'co-ed') return 5;
  if (facilityGender.toLowerCase().includes(inquiryGender.toLowerCase())) return 5;
  return 0; // Mismatch
}

// Score age matching
function scoreAge(inquiryAgeRange: string | null, facilityAgeGroups: string[]): number {
  if (!inquiryAgeRange) return 2; // Unknown
  const ageGroupsLower = facilityAgeGroups.map(g => g.toLowerCase());
  
  // Check for "all ages" type matches
  if (ageGroupsLower.some(g => g.includes('all') || g.includes('adult'))) return 4;
  
  const ageMap: Record<string, string[]> = {
    '18-25': ['young adult', '18+', '18-25', 'adult'],
    '26-35': ['adult', '18+', '26-35'],
    '36-50': ['adult', '18+', '36-50'],
    '51+': ['adult', 'senior', '50+', '51+', 'older adult'],
    'under_18': ['adolescent', 'teen', 'minor', 'youth', 'under 18'],
  };
  
  const acceptable = ageMap[inquiryAgeRange] || [];
  const matches = acceptable.some(a => 
    ageGroupsLower.some(g => g.includes(a))
  );
  return matches ? 4 : 0;
}

// Score specializations (detox, dual diagnosis, etc.)
function scoreSpecializations(
  detoxNeeded: string | null, 
  coOccurring: unknown, 
  services: string[]
): number {
  let score = 0;
  const servicesLower = services.map(s => s.toLowerCase());
  
  if (detoxNeeded === 'yes' && servicesLower.some(s => s.includes('detox'))) {
    score += 1.5;
  }
  
  const hasCoOccurring = Array.isArray(coOccurring) && coOccurring.length > 0;
  if (hasCoOccurring && servicesLower.some(s => s.includes('dual') || s.includes('co-occurring'))) {
    score += 1.5;
  }
  
  return Math.min(score, 3);
}

// Get nearby states for geographic matching
function getNearbyStates(state: string): string[] {
  const adjacentStates: Record<string, string[]> = {
    'AL': ['FL', 'GA', 'MS', 'TN'],
    'AZ': ['CA', 'CO', 'NM', 'NV', 'UT'],
    'AR': ['LA', 'MO', 'MS', 'OK', 'TN', 'TX'],
    'CA': ['AZ', 'NV', 'OR'],
    'CO': ['AZ', 'KS', 'NE', 'NM', 'OK', 'UT', 'WY'],
    'CT': ['MA', 'NY', 'RI'],
    'DE': ['MD', 'NJ', 'PA'],
    'FL': ['AL', 'GA'],
    'GA': ['AL', 'FL', 'NC', 'SC', 'TN'],
    'ID': ['MT', 'NV', 'OR', 'UT', 'WA', 'WY'],
    'IL': ['IN', 'IA', 'KY', 'MO', 'WI'],
    'IN': ['IL', 'KY', 'MI', 'OH'],
    'IA': ['IL', 'MN', 'MO', 'NE', 'SD', 'WI'],
    'KS': ['CO', 'MO', 'NE', 'OK'],
    'KY': ['IL', 'IN', 'MO', 'OH', 'TN', 'VA', 'WV'],
    'LA': ['AR', 'MS', 'TX'],
    'ME': ['NH'],
    'MD': ['DE', 'PA', 'VA', 'WV'],
    'MA': ['CT', 'NH', 'NY', 'RI', 'VT'],
    'MI': ['IN', 'OH', 'WI'],
    'MN': ['IA', 'ND', 'SD', 'WI'],
    'MS': ['AL', 'AR', 'LA', 'TN'],
    'MO': ['AR', 'IL', 'IA', 'KS', 'KY', 'NE', 'OK', 'TN'],
    'MT': ['ID', 'ND', 'SD', 'WY'],
    'NE': ['CO', 'IA', 'KS', 'MO', 'SD', 'WY'],
    'NV': ['AZ', 'CA', 'ID', 'OR', 'UT'],
    'NH': ['MA', 'ME', 'VT'],
    'NJ': ['DE', 'NY', 'PA'],
    'NM': ['AZ', 'CO', 'OK', 'TX', 'UT'],
    'NY': ['CT', 'MA', 'NJ', 'PA', 'VT'],
    'NC': ['GA', 'SC', 'TN', 'VA'],
    'ND': ['MN', 'MT', 'SD'],
    'OH': ['IN', 'KY', 'MI', 'PA', 'WV'],
    'OK': ['AR', 'CO', 'KS', 'MO', 'NM', 'TX'],
    'OR': ['CA', 'ID', 'NV', 'WA'],
    'PA': ['DE', 'MD', 'NJ', 'NY', 'OH', 'WV'],
    'RI': ['CT', 'MA'],
    'SC': ['GA', 'NC'],
    'SD': ['IA', 'MN', 'MT', 'ND', 'NE', 'WY'],
    'TN': ['AL', 'AR', 'GA', 'KY', 'MO', 'MS', 'NC', 'VA'],
    'TX': ['AR', 'LA', 'NM', 'OK'],
    'UT': ['AZ', 'CO', 'ID', 'NM', 'NV', 'WY'],
    'VT': ['MA', 'NH', 'NY'],
    'VA': ['KY', 'MD', 'NC', 'TN', 'WV'],
    'WA': ['ID', 'OR'],
    'WV': ['KY', 'MD', 'OH', 'PA', 'VA'],
    'WI': ['IA', 'IL', 'MI', 'MN'],
    'WY': ['CO', 'ID', 'MT', 'NE', 'SD', 'UT'],
  };
  return adjacentStates[state.toUpperCase()] || [];
}

Deno.serve(async (req) => {
  const requestId = generateRequestId();
  
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // POST only
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    logStep(requestId, "Function started", { version: VERSION });

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !supabaseServiceKey || !supabaseAnonKey) {
      throw new Error("Supabase configuration missing");
    }

    // Authenticate caller - must be admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const anonClient = createClient(supabaseUrl, supabaseAnonKey);
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await anonClient.auth.getUser(token);
    if (userError || !userData.user) throw new Error("Authentication failed");

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify admin role
    const { data: adminRole } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userData.user.id)
      .eq('role', 'admin')
      .maybeSingle();

    if (!adminRole) {
      throw new Error("Only administrators can run facility matching");
    }

    logStep(requestId, "Admin authenticated", { adminId: userData.user.id });

    const body = await req.json();
    const { inquiryId } = body;
    
    // Strict UUID validation
    if (!inquiryId || typeof inquiryId !== "string") {
      throw new Error("Inquiry ID is required");
    }
    
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(inquiryId)) {
      throw new Error("Invalid inquiry ID format");
    }

    logStep(requestId, "Matching for inquiry", { inquiryId });

    // Fetch the inquiry details
    const { data: inquiry, error: inquiryError } = await supabase
      .from('concierge_inquiries')
      .select('*')
      .eq('id', inquiryId)
      .single();

    if (inquiryError || !inquiry) {
      logStep(requestId, "Inquiry not found", { inquiryId, error: inquiryError?.message });
      throw new Error("Inquiry not found");
    }

    logStep(requestId, "Inquiry found", { 
      levelOfCare: inquiry.level_of_care,
      state: inquiry.desired_location_state,
      paymentType: inquiry.payment_type 
    });

    // Fetch all opted-in facilities with their services, insurance, and age groups
    const { data: facilities, error: facilitiesError } = await supabase
      .from('facilities')
      .select(`
        id,
        name,
        city,
        state,
        facility_type,
        gender_served,
        concierge_accepted_care_types,
        concierge_accepted_insurance,
        concierge_availability_status,
        concierge_network_opted_in,
        facility_services (service_name),
        facility_insurance (insurance_name),
        facility_age_groups (age_group)
      `)
      .eq('concierge_network_opted_in', true)
      .eq('status', 'approved')
      .neq('concierge_availability_status', 'full');

    if (facilitiesError) {
      throw new Error(`Failed to fetch facilities: ${facilitiesError.message}`);
    }

    logStep(requestId, "Found opted-in facilities", { count: facilities?.length || 0 });

    if (!facilities || facilities.length === 0) {
      return new Response(
        JSON.stringify({ matches: [], message: "No matching facilities available", requestId, _version: VERSION }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    // Score each facility
    const scoredFacilities: FacilityMatch[] = [];

    for (const facility of facilities) {
      let locationScore = 0;
      let careTypeScore = 0;
      let insuranceScore = 0;
      let availabilityScore = 0;

      // Location scoring (max 35 points)
      const desiredState = inquiry.desired_location_state?.toUpperCase() || inquiry.preferred_state?.toUpperCase();
      const facilityState = facility.state?.toUpperCase();

      if (desiredState === facilityState) {
        locationScore = WEIGHTS.location;
      } else if (desiredState && getNearbyStates(desiredState).includes(facilityState)) {
        locationScore = 25;
      } else if (inquiry.willing_to_travel) {
        locationScore = 15;
      } else {
        locationScore = 5;
      }

      // Care type matching (max 25 points)
      const acceptedCareTypes = (facility.concierge_accepted_care_types as string[]) || [];
      const levelOfCareMap: Record<string, string[]> = {
        'detox': ['detox'],
        'inpatient': ['inpatient', 'residential'],
        'residential': ['inpatient', 'residential'],
        'php': ['php'],
        'iop': ['iop'],
        'outpatient': ['outpatient', 'iop'],
        'sober_living': ['sober_living'],
      };

      const desiredCare = inquiry.level_of_care?.toLowerCase();
      const matchingCareTypes = levelOfCareMap[desiredCare] || [desiredCare];
      
      if (matchingCareTypes.some(ct => acceptedCareTypes.includes(ct))) {
        careTypeScore = WEIGHTS.careType;
      } else if (acceptedCareTypes.length > 0) {
        careTypeScore = 8; // Has care types but not matching
      }

      // Insurance matching (max 20 points)
      const acceptedInsurance = (facility.concierge_accepted_insurance as string[]) || [];
      const facilityInsuranceNames = (facility.facility_insurance || []).map(
        (i: { insurance_name: string }) => i.insurance_name.toLowerCase()
      );
      const allInsurance = [...acceptedInsurance, ...facilityInsuranceNames];

      if (inquiry.payment_type === 'self_pay' || inquiry.payment_type === 'self-pay') {
        insuranceScore = WEIGHTS.insurance; // Self-pay always accepted
      } else if (inquiry.insurance_carrier) {
        const carrierLower = inquiry.insurance_carrier.toLowerCase();
        if (allInsurance.some(i => i.toLowerCase().includes(carrierLower) || carrierLower.includes(i.toLowerCase()))) {
          insuranceScore = WEIGHTS.insurance;
        } else if (allInsurance.some(i => i.includes('most') || i.includes('major'))) {
          insuranceScore = 15;
        } else {
          insuranceScore = 6;
        }
      } else {
        insuranceScore = 10; // Unknown insurance
      }

      // Availability scoring (max 8 points)
      if (facility.concierge_availability_status === 'open') {
        availabilityScore = WEIGHTS.availability;
      } else if (facility.concierge_availability_status === 'limited') {
        availabilityScore = 4;
      }

      // Gender scoring (max 5 points)
      const genderScore = scoreGender(inquiry.gender, facility.gender_served);

      // Age scoring (max 4 points)
      const facilityAgeGroups = (facility.facility_age_groups || []).map(
        (a: { age_group: string }) => a.age_group
      );
      const ageScore = scoreAge(inquiry.age_range, facilityAgeGroups);

      // Specializations scoring (max 3 points)
      const facilityServices = (facility.facility_services || []).map(
        (s: { service_name: string }) => s.service_name
      );
      const specializationsScore = scoreSpecializations(
        inquiry.detox_needed,
        inquiry.co_occurring_concerns,
        facilityServices
      );

      const totalScore = Math.round(
        locationScore + careTypeScore + insuranceScore + availabilityScore +
        genderScore + ageScore + specializationsScore
      );

      scoredFacilities.push({
        facilityId: facility.id,
        facilityName: facility.name,
        matchScore: totalScore,
        matchFactors: {
          location: locationScore,
          careType: careTypeScore,
          insurance: insuranceScore,
          availability: availabilityScore,
          gender: genderScore,
          age: ageScore,
          specializations: specializationsScore,
        },
        city: facility.city,
        state: facility.state,
      });
    }

    // Sort by score and take top 3
    const topMatches = scoredFacilities
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, 3);

    logStep(requestId, "Top matches found", { 
      count: topMatches.length, 
      topScore: topMatches[0]?.matchScore 
    });

    // Update the inquiry with matched facility IDs
    const matchedIds = topMatches.map(m => m.facilityId);
    const matchScores = topMatches.map(m => ({
      facilityId: m.facilityId,
      score: m.matchScore,
      factors: m.matchFactors,
    }));

    // Fetch current status before updating
    const { data: currentInquiry } = await supabase
      .from('concierge_inquiries')
      .select('status')
      .eq('id', inquiryId)
      .single();

    const previousStatus = currentInquiry?.status || 'unknown';

    const { error: updateError } = await supabase
      .from('concierge_inquiries')
      .update({
        matched_facility_ids: matchedIds,
        match_scores: matchScores,
        matched_at: new Date().toISOString(),
        match_count: topMatches.length,
        status: 'matched',
      })
      .eq('id', inquiryId);

    if (updateError) {
      logStep(requestId, "Warning: Failed to update inquiry", { error: updateError.message });
    } else {
      // Log status change event for timeline consistency
      await supabase.from('concierge_case_events').insert({
        inquiry_id: inquiryId,
        event_type: 'status_changed',
        event_data: { 
          from_status: previousStatus, 
          to_status: 'matched',
          trigger: 'matches_completed',
          match_count: topMatches.length,
        },
        actor_type: 'system',
      });
    }

    // Send matches_found notification
    try {
      await fetch(`${supabaseUrl}/functions/v1/send-concierge-notifications`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseServiceKey}`,
        },
        body: JSON.stringify({
          type: 'matches_found',
          inquiryId: inquiryId,
        }),
      });
      logStep(requestId, "Matches found notification sent");
    } catch (notifError) {
      logStep(requestId, "Warning: Failed to send notification", { error: String(notifError) });
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        matches: topMatches,
        matchCount: topMatches.length,
        requestId,
        _version: VERSION,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep(requestId, "ERROR", { message: errorMessage });
    return new Response(
      JSON.stringify({ error: errorMessage, requestId, _version: VERSION }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
