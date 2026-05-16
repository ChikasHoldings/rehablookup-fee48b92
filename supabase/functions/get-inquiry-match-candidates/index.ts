// get-inquiry-match-candidates
// ────────────────────────────
// Returns up to 5 facility candidates the concierge advisor should
// consider as the 2 additional introductions for a free-tier-redirect
// inquiry. The ranking is for ADMIN convenience ONLY — the advisor
// can override entirely. The "2 non-partner alternatives" rule from
// PR-6 is enforced in the admin UI, not here.
//
// EKRA-clean: clinical match comes FIRST. Subscription tier only
// breaks ties among equally-qualified candidates. We never surface
// a candidate that doesn't accept the seeker's insurance or doesn't
// offer the seeker's level of care.
//
// Tier ranking among equally-qualified candidates:
//   1. Active Concierge Partners
//   2. Pro + Featured subscribers
//   3. Pro subscribers
//   4. Free-tier facilities
// Tie-break: response_rate_score DESC, then random.
//
// verify_jwt: true — admin-only endpoint. The caller (concierge tool)
// must be authenticated as admin or super_admin.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2?target=denonext";
import { z } from "https://esm.sh/zod@3.23.8?target=denonext";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const RequestSchema = z.object({
  inquiry_id: z.string().uuid(),
  /** Facility ids to omit from the result (typically the originating
   *  facility, which is auto-pinned as Option 1 elsewhere). */
  exclude_facility_ids: z.array(z.string().uuid()).default([]),
  /** How many candidates to return. Spec says 5; the caller may request
   *  fewer to keep the admin UI lean. */
  limit: z.number().int().min(1).max(20).default(5),
});

type TierRank = "concierge_partner" | "pro_featured" | "pro" | "free";

const TIER_RANK_SCORE: Record<TierRank, number> = {
  concierge_partner: 4,
  pro_featured: 3,
  pro: 2,
  free: 1,
};

interface CandidateOut {
  facility_id: string;
  name: string;
  slug: string | null;
  city: string;
  state: string;
  tier: TierRank;
  /** Whether the facility is currently a Concierge Partner in the
   *  seeker's geography. Surfaced to the admin so they can apply the
   *  "non-partner alternatives must be presented" rule. */
  is_concierge_partner_in_geo: boolean;
  /** Whether the facility is a Featured subscriber (any geo). */
  has_featured: boolean;
  /** Tier-rank score for sort transparency. Higher = ranked first. */
  tier_score: number;
  /** Per-facility response-rate score (0-100). Tie-break. */
  response_rate_score: number | null;
  /** Match-breakdown surfaced to the admin UI so they can audit ranking. */
  match_breakdown: {
    state_match: boolean;
    city_match: boolean;
    level_of_care_match: boolean;
    insurance_match: boolean;
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json", Allow: "POST, OPTIONS" },
    });
  }

  // Admin gate.
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response(JSON.stringify({ error: "Missing Authorization header" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const userClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? "",
    { global: { headers: { Authorization: authHeader } }, auth: { persistSession: false } },
  );
  const { data: { user }, error: authErr } = await userClient.auth.getUser();
  if (authErr || !user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const admin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } },
  );
  const { data: roleRows } = await admin
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id);
  const isAdmin = (roleRows ?? []).some((r: { role: string }) =>
    ["admin", "super_admin"].includes(r.role),
  );
  if (!isAdmin) {
    return new Response(JSON.stringify({ error: "Admin role required" }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let body: unknown;
  try { body = await req.json(); }
  catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const parsed = RequestSchema.safeParse(body);
  if (!parsed.success) {
    return new Response(JSON.stringify({ error: "Validation failed", issues: parsed.error.issues }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // ── Load the inquiry's intake_data to derive clinical filters ──
  const { data: inquiry } = await admin
    .from("concierge_inquiries")
    .select("intake_data")
    .eq("id", parsed.data.inquiry_id)
    .maybeSingle();
  if (!inquiry) {
    return new Response(JSON.stringify({ error: "Inquiry not found" }), {
      status: 404,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const intake = (inquiry.intake_data as Record<string, unknown> | null) ?? {};
  const seekerState =
    typeof intake.state === "string" ? intake.state :
    typeof intake.location_state === "string" ? intake.location_state :
    null;
  const seekerCity =
    typeof intake.city === "string" ? intake.city :
    typeof intake.location_city === "string" ? intake.location_city :
    null;
  const seekerLoC =
    typeof intake.level_of_care === "string" ? intake.level_of_care : null;
  const seekerInsurance =
    typeof intake.insurance_provider === "string" ? intake.insurance_provider :
    typeof intake.insurance === "string" ? intake.insurance :
    null;

  // ── Candidate query — filter by clinical match first ──
  // Returns facilities matching state (mandatory) and at least
  // attempting LoC + insurance match. The full match_breakdown is
  // computed in code below so the admin sees granular reasons.
  const queryBuilder = admin
    .from("facilities")
    .select(`
      id, name, slug, city, state, response_rate_score,
      facility_services (service_name),
      facility_insurance (insurance_name),
      facility_subscriptions (status, tier, has_featured, has_concierge_partner)
    `)
    .limit(200); // bounded fan-out — we re-rank in code
  if (seekerState) queryBuilder.eq("state", seekerState);
  if (parsed.data.exclude_facility_ids.length > 0) {
    queryBuilder.not("id", "in", `(${parsed.data.exclude_facility_ids.map((id) => `"${id}"`).join(",")})`);
  }
  const { data: rawCandidates, error: candidatesErr } = await queryBuilder;
  if (candidatesErr) {
    console.error("[get-inquiry-match-candidates] candidate fetch failed", candidatesErr);
    return new Response(JSON.stringify({ error: "Failed to load candidates" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // ── Score each candidate ──
  type RawCandidate = {
    id: string;
    name: string;
    slug: string | null;
    city: string;
    state: string;
    response_rate_score: number | null;
    facility_services: Array<{ service_name: string }> | null;
    facility_insurance: Array<{ insurance_name: string }> | null;
    facility_subscriptions: Array<{
      status: string;
      tier: string;
      has_featured: boolean;
      has_concierge_partner: boolean;
    }> | null;
  };

  const candidates: CandidateOut[] = (rawCandidates as RawCandidate[] ?? [])
    .map((row) => {
      const services = (row.facility_services ?? []).map((s) => s.service_name.toLowerCase());
      const insurance = (row.facility_insurance ?? []).map((i) => i.insurance_name.toLowerCase());

      const stateMatch = !!seekerState && row.state === seekerState;
      const cityMatch = !!seekerCity && row.city.toLowerCase() === seekerCity.toLowerCase();
      const locMatch = !!seekerLoC && services.some((s) =>
        s.includes(seekerLoC.toLowerCase()) || seekerLoC.toLowerCase().includes(s),
      );
      const insuranceMatch = !!seekerInsurance && insurance.some((i) =>
        i.includes(seekerInsurance.toLowerCase()) || seekerInsurance.toLowerCase().includes(i),
      );

      // Drop candidates that fail the hard clinical filters (LoC or
      // insurance must match if the seeker provided one — otherwise
      // we'd be presenting a clearly-incompatible option). State is
      // already filtered by the query.
      if (seekerLoC && !locMatch) return null;
      if (seekerInsurance && !insuranceMatch) return null;

      const sub = (row.facility_subscriptions ?? []).find((s) => s.status === "active");
      const tier: TierRank =
        sub?.has_concierge_partner ? "concierge_partner" :
        sub?.has_featured ? "pro_featured" :
        sub?.tier === "pro" ? "pro" :
        "free";

      return {
        facility_id: row.id,
        name: row.name,
        slug: row.slug,
        city: row.city,
        state: row.state,
        tier,
        is_concierge_partner_in_geo: !!sub?.has_concierge_partner,
        has_featured: !!sub?.has_featured,
        tier_score: TIER_RANK_SCORE[tier],
        response_rate_score: row.response_rate_score,
        match_breakdown: {
          state_match: stateMatch,
          city_match: cityMatch,
          level_of_care_match: locMatch,
          insurance_match: insuranceMatch,
        },
      } satisfies CandidateOut;
    })
    .filter((c): c is CandidateOut => c !== null);

  // ── Sort: clinical-match-score DESC, tier-score DESC, response-rate DESC, name ASC ──
  // clinical-match-score = sum of (city + LoC + insurance) booleans —
  // state is implicit (the query already filtered by it). City match
  // is bonus.
  candidates.sort((a, b) => {
    const aClinical =
      (a.match_breakdown.city_match ? 1 : 0) +
      (a.match_breakdown.level_of_care_match ? 1 : 0) +
      (a.match_breakdown.insurance_match ? 1 : 0);
    const bClinical =
      (b.match_breakdown.city_match ? 1 : 0) +
      (b.match_breakdown.level_of_care_match ? 1 : 0) +
      (b.match_breakdown.insurance_match ? 1 : 0);
    if (aClinical !== bClinical) return bClinical - aClinical;
    if (a.tier_score !== b.tier_score) return b.tier_score - a.tier_score;
    const aRR = a.response_rate_score ?? 0;
    const bRR = b.response_rate_score ?? 0;
    if (aRR !== bRR) return bRR - aRR;
    return a.name.localeCompare(b.name);
  });

  return new Response(
    JSON.stringify({
      candidates: candidates.slice(0, parsed.data.limit),
      total_eligible: candidates.length,
      ranking_notes: {
        rule: "clinical_match_first_tier_breaks_ties",
        clinical_filters_applied: {
          state: seekerState,
          level_of_care: seekerLoC,
          insurance: seekerInsurance,
        },
        ekra_reminder:
          "The admin MUST present at least 2 non-Concierge-Partner alternatives. " +
          "This ranking is a hint; the advisor's selection is the binding choice.",
      },
    }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
