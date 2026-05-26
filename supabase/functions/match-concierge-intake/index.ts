import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2?target=denonext";

const VERSION = "2.0.0";

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
  /** True when surfaced as an eligible Concierge/Placement Partner. */
  isPartner?: boolean;
  /** "partner" | "featured" | "pro" | "free" — provenance of the match. */
  tier?: string;
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

// State normalization. `facilities.state` stores full names ("Arizona"),
// `concierge_partner_facilities.geo_state` stores 2-letter codes ("AZ"), and an
// inquiry's desired state can arrive in either form — so everything is reduced
// to a 2-letter abbreviation before comparison.
const STATE_NAME_TO_ABBR: Record<string, string> = {
  alabama: "AL", alaska: "AK", arizona: "AZ", arkansas: "AR", california: "CA",
  colorado: "CO", connecticut: "CT", delaware: "DE", "district of columbia": "DC",
  florida: "FL", georgia: "GA", hawaii: "HI", idaho: "ID", illinois: "IL",
  indiana: "IN", iowa: "IA", kansas: "KS", kentucky: "KY", louisiana: "LA",
  maine: "ME", maryland: "MD", massachusetts: "MA", michigan: "MI", minnesota: "MN",
  mississippi: "MS", missouri: "MO", montana: "MT", nebraska: "NE", nevada: "NV",
  "new hampshire": "NH", "new jersey": "NJ", "new mexico": "NM", "new york": "NY",
  "north carolina": "NC", "north dakota": "ND", ohio: "OH", oklahoma: "OK",
  oregon: "OR", pennsylvania: "PA", "rhode island": "RI", "south carolina": "SC",
  "south dakota": "SD", tennessee: "TN", texas: "TX", utah: "UT", vermont: "VT",
  virginia: "VA", washington: "WA", "west virginia": "WV", wisconsin: "WI", wyoming: "WY",
};
const STATE_ABBR_TO_NAME: Record<string, string> = Object.fromEntries(
  Object.entries(STATE_NAME_TO_ABBR).map(([name, abbr]) => [
    abbr,
    name.replace(/(^|\s)\w/g, (c) => c.toUpperCase()),
  ]),
);
function toStateAbbr(s: string | null | undefined): string | null {
  if (!s) return null;
  const t = s.trim();
  if (!t) return null;
  if (t.length === 2) return t.toUpperCase();
  return STATE_NAME_TO_ABBR[t.toLowerCase()] ?? null;
}
function toStateName(abbr: string | null | undefined): string | null {
  if (!abbr) return null;
  return STATE_ABBR_TO_NAME[abbr.toUpperCase()] ?? null;
}

// Desired level-of-care → accepted care-type tokens (mirrors the partner
// concierge_partner_facilities.level_of_care vocabulary).
const LOC_MAP: Record<string, string[]> = {
  detox: ["detox"],
  inpatient: ["inpatient", "residential"],
  residential: ["inpatient", "residential"],
  php: ["php"],
  iop: ["iop"],
  outpatient: ["outpatient", "iop"],
  sober_living: ["sober_living"],
};

interface ScorableFacility {
  state: string | null;
  concierge_accepted_care_types: unknown;
  concierge_accepted_insurance: unknown;
  concierge_availability_status: string | null;
  gender_served: string | null;
  facility_insurance?: { insurance_name: string }[] | null;
  facility_age_groups?: { age_group: string }[] | null;
  facility_services?: { service_name: string }[] | null;
}

// Payment-blind clinical fit score (0-100). Shared by the partner pool and the
// tier-fallback pool so both are ranked on the same clinical criteria.
function scoreFacility(facility: ScorableFacility, inquiry: Record<string, unknown>): { score: number; factors: MatchFactors } {
  // Location (max 35) — normalized to 2-letter codes so full-name vs abbr
  // mismatches don't silently zero the score.
  const desiredAbbr = toStateAbbr((inquiry.desired_location_state as string) || (inquiry.preferred_state as string));
  const facilityAbbr = toStateAbbr(facility.state);
  let locationScore: number;
  if (desiredAbbr && facilityAbbr && desiredAbbr === facilityAbbr) {
    locationScore = WEIGHTS.location;
  } else if (desiredAbbr && facilityAbbr && getNearbyStates(desiredAbbr).includes(facilityAbbr)) {
    locationScore = 25;
  } else if (inquiry.willing_to_travel) {
    locationScore = 15;
  } else {
    locationScore = 5;
  }

  // Care type (max 25)
  const acceptedCareTypes = (facility.concierge_accepted_care_types as string[]) || [];
  const desiredCare = (inquiry.level_of_care as string)?.toLowerCase();
  const matchingCareTypes = LOC_MAP[desiredCare] || (desiredCare ? [desiredCare] : []);
  let careTypeScore = 0;
  if (matchingCareTypes.some((ct) => acceptedCareTypes.includes(ct))) {
    careTypeScore = WEIGHTS.careType;
  } else if (acceptedCareTypes.length > 0) {
    careTypeScore = 8;
  }

  // Insurance (max 20)
  const acceptedInsurance = (facility.concierge_accepted_insurance as string[]) || [];
  const facilityInsuranceNames = (facility.facility_insurance || []).map((i) => i.insurance_name.toLowerCase());
  const allInsurance = [...acceptedInsurance, ...facilityInsuranceNames];
  let insuranceScore: number;
  const paymentType = inquiry.payment_type as string;
  if (paymentType === "self_pay" || paymentType === "self-pay") {
    insuranceScore = WEIGHTS.insurance;
  } else if (inquiry.insurance_carrier) {
    const carrierLower = (inquiry.insurance_carrier as string).toLowerCase();
    if (allInsurance.some((i) => i.toLowerCase().includes(carrierLower) || carrierLower.includes(i.toLowerCase()))) {
      insuranceScore = WEIGHTS.insurance;
    } else if (allInsurance.some((i) => i.includes("most") || i.includes("major"))) {
      insuranceScore = 15;
    } else {
      insuranceScore = 6;
    }
  } else {
    insuranceScore = 10;
  }

  // Availability (max 8)
  let availabilityScore = 0;
  if (facility.concierge_availability_status === "open") availabilityScore = WEIGHTS.availability;
  else if (facility.concierge_availability_status === "limited") availabilityScore = 4;

  const genderScore = scoreGender((inquiry.gender as string) ?? null, facility.gender_served);
  const facilityAgeGroups = (facility.facility_age_groups || []).map((a) => a.age_group);
  const ageScore = scoreAge((inquiry.age_range as string) ?? null, facilityAgeGroups);
  const facilityServices = (facility.facility_services || []).map((s) => s.service_name);
  const specializationsScore = scoreSpecializations(
    (inquiry.detox_needed as string) ?? null,
    inquiry.co_occurring_concerns,
    facilityServices,
  );

  const score = Math.round(
    locationScore + careTypeScore + insuranceScore + availabilityScore + genderScore + ageScore + specializationsScore,
  );
  return {
    score,
    factors: {
      location: locationScore, careType: careTypeScore, insurance: insuranceScore,
      availability: availabilityScore, gender: genderScore, age: ageScore, specializations: specializationsScore,
    },
  };
}

// Shared facility-detail select for scoring.
const FACILITY_SELECT =
  "id, name, city, state, facility_type, gender_served, concierge_accepted_care_types, concierge_accepted_insurance, concierge_availability_status, concierge_eligibility_attested_at, concierge_eligibility_revoked_at, facility_services (service_name), facility_insurance (insurance_name), facility_age_groups (age_group)";

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

    // ── Resolve the family's geography + clinical need ────────────────────
    const familyAbbr = toStateAbbr((inquiry.desired_location_state as string) || (inquiry.preferred_state as string));
    const familyCity = (((inquiry.desired_location_city as string) || (inquiry.preferred_city as string)) || "").trim().toLowerCase();
    const desiredLoC = ((inquiry.level_of_care as string) || "").toLowerCase();
    const mappedLoC = LOC_MAP[desiredLoC] || (desiredLoC ? [desiredLoC] : []);

    // ── PARTNER POOL (exclusive when ≥3 qualify) ──────────────────────────
    // Only eligible Concierge/Placement Partners whose CHOSEN geography
    // (state + optional city) and levels of care match the family. Partner
    // geography is driven by concierge_partner_facilities, NOT the facility's
    // physical location (a partner can pay to cover other states).
    let partnerMatches: FacilityMatch[] = [];
    if (familyAbbr) {
      const { data: geoRows, error: geoErr } = await supabase
        .from("concierge_partner_facilities")
        .select("facility_id, geo_city, level_of_care")
        .eq("active", true)
        .eq("geo_state", familyAbbr);
      if (geoErr) throw new Error(`Failed to fetch partner geos: ${geoErr.message}`);

      const partnerIds = [...new Set(
        (geoRows || [])
          .filter((r) => {
            const cityOk = !r.geo_city || (!!familyCity && (r.geo_city as string).trim().toLowerCase() === familyCity);
            const loc = (r.level_of_care as string[]) || [];
            const locOk = mappedLoC.length === 0 || loc.length === 0 || loc.some((l) => mappedLoC.includes(l.toLowerCase()));
            return cityOk && locOk;
          })
          .map((r) => r.facility_id as string),
      )];

      if (partnerIds.length > 0) {
        // Confirm each candidate is an APPROVED facility with an ACTIVE
        // Concierge subscription that completed the eligibility attestation
        // and isn't currently revoked (the introducibility gate).
        const { data: partnerFacilities, error: pfErr } = await supabase
          .from("facilities")
          .select(`${FACILITY_SELECT}, facility_subscriptions!inner(has_concierge_partner, status)`)
          .in("id", partnerIds)
          .eq("status", "approved")
          .neq("concierge_availability_status", "full")
          .eq("facility_subscriptions.has_concierge_partner", true)
          .eq("facility_subscriptions.status", "active");
        if (pfErr) throw new Error(`Failed to fetch partner facilities: ${pfErr.message}`);

        partnerMatches = (partnerFacilities || [])
          .filter((f) => {
            // Sticky-revoke — MUST mirror is_eligible_concierge_partner exactly:
            // attested AND not currently revoked. (An admin revoke stays in
            // effect until lifted; re-attestation while revoked is blocked by
            // attest_concierge_eligibility, so the two never diverge.)
            const attested = f.concierge_eligibility_attested_at as string | null;
            const revoked = f.concierge_eligibility_revoked_at as string | null;
            return !!attested && !revoked;
          })
          .map((f) => {
            const { score, factors } = scoreFacility(f as unknown as ScorableFacility, inquiry);
            return { facilityId: f.id, facilityName: f.name, matchScore: score, matchFactors: factors, city: f.city, state: f.state, isPartner: true, tier: "partner" } as FacilityMatch;
          })
          .sort((a, b) => b.matchScore - a.matchScore);
      }
    }

    logStep(requestId, "Eligible partner matches", { count: partnerMatches.length });

    // Pure-exclusive: when 3+ partners qualify, the family sees only partners.
    const topMatches: FacilityMatch[] = partnerMatches.slice(0, 3);

    // ── TIER FALLBACK (only when fewer than 3 partners) ───────────────────
    // Fill remaining slots with clinically-matched NON-partners, ranked
    // Featured → Pro → Free, so families always get up to 3 options even where
    // partner coverage is thin. Facilities with an active Concierge sub are
    // excluded here — they reach families only through the eligible-partner
    // path above (the incentive to complete onboarding).
    if (topMatches.length < 3) {
      const needed = 3 - topMatches.length;
      const targetAbbrs = [familyAbbr, ...(inquiry.willing_to_travel && familyAbbr ? getNearbyStates(familyAbbr) : [])].filter(Boolean) as string[];
      const targetNames = [...new Set(targetAbbrs.map(toStateName).filter(Boolean) as string[])];
      const excludeIds = new Set(topMatches.map((m) => m.facilityId));

      if (targetNames.length > 0) {
        const { data: fbFacilities, error: fbErr } = await supabase
          .from("facilities")
          .select(`${FACILITY_SELECT}, facility_subscriptions(has_featured, has_concierge_partner, tier, status)`)
          .eq("status", "approved")
          .neq("concierge_availability_status", "full")
          .in("state", targetNames);
        if (fbErr) throw new Error(`Failed to fetch fallback facilities: ${fbErr.message}`);

        const fallback = (fbFacilities || [])
          .filter((f) => !excludeIds.has(f.id))
          .map((f) => {
            const subs = (f.facility_subscriptions as Array<{ has_featured: boolean | null; has_concierge_partner: boolean | null; tier: string | null; status: string | null }>) || [];
            const activeSub = subs.find((s) => s.status === "active");
            return { f, activeSub };
          })
          // Active Concierge partners are handled by the partner pool only.
          .filter(({ activeSub }) => !(activeSub?.has_concierge_partner))
          .map(({ f, activeSub }) => {
            let tier = "free";
            let tierRank = 3;
            if (activeSub?.has_featured) { tier = "featured"; tierRank = 1; }
            else if (activeSub?.tier === "pro") { tier = "pro"; tierRank = 2; }
            const { score, factors } = scoreFacility(f as unknown as ScorableFacility, inquiry);
            return { facilityId: f.id, facilityName: f.name, matchScore: score, matchFactors: factors, city: f.city, state: f.state, isPartner: false, tier, tierRank };
          })
          .sort((a, b) => a.tierRank - b.tierRank || b.matchScore - a.matchScore)
          .slice(0, needed)
          .map(({ tierRank: _tierRank, ...rest }) => rest as FacilityMatch);

        topMatches.push(...fallback);
      }
    }

    if (topMatches.length === 0) {
      return new Response(
        JSON.stringify({ matched: false, matchedFacilityIds: [], matches: [], message: "No matching facilities available", requestId, _version: VERSION }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 },
      );
    }

    logStep(requestId, "Top matches found", {
      count: topMatches.length,
      partners: topMatches.filter((m) => m.isPartner).length,
      topScore: topMatches[0]?.matchScore,
    });

    // Update the inquiry with matched facility IDs
    const matchedIds = topMatches.map(m => m.facilityId);
    const matchScores = topMatches.map(m => ({
      facilityId: m.facilityId,
      score: m.matchScore,
      factors: m.matchFactors,
      isPartner: m.isPartner ?? false,
      tier: m.tier ?? "free",
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
      // Persisting the match is not optional: submit-concierge-intake
      // auto-introduces using the IDs in this response, and the admin tour
      // UI / cron retry read matched_facility_ids off this row. If the write
      // fails we must NOT report success — otherwise the caller introduces
      // against in-memory IDs while the row stays unmatched (introductions
      // exist, matched_facility_ids null). Fail loudly so the case falls back
      // to the manual-matching path instead of silently going inconsistent.
      logStep(requestId, "ERROR: Failed to persist matches", { error: updateError.message });
      return new Response(
        JSON.stringify({
          success: false,
          matched: false,
          matchedFacilityIds: [],
          matches: [],
          error: `Failed to persist matches: ${updateError.message}`,
          requestId,
          _version: VERSION,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }

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
        matched: true,
        matchedFacilityIds: topMatches.map(m => m.facilityId),
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
