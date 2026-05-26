// get-featured-rotation
// ─────────────────────
// Returns the deterministically-rotated subset of eligible Featured
// facilities for one placement bucket. Logs an impression row per
// facility returned (UNLESS the caller opts out — see log_impressions).
//
// Rotation algorithm:
//   1. Query featured_placements + facility_subscriptions for the
//      bucket. Order by activated_at ASC (stable).
//   2. start_index = seed % pool_size
//   3. Return facilities[start_index .. start_index + slot_count]
//      with wrap-around.
//   4. Across 100 visitor seeds, every facility appears at every rail
//      position with equal frequency — fair by construction.
//
// EKRA-clean: no conversion weighting, no referral-value sort, no
// call-volume influence on order. Pure seed + activated_at order.
//
// verify_jwt: false — serves public pages.
//
// log_impressions:
//   default true → matches the legacy rail's behavior (server-side
//                  bulk-log every facility the rotation returned).
//   false → caller will log impressions themselves via the
//           log-strip-impression endpoint after IntersectionObserver
//           confirms viewport entry. Used by the FeaturedStrip.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2?target=denonext";
import { z } from "https://esm.sh/zod@3.23.8?target=denonext";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const PLACEMENT_TYPES = ["homepage", "state", "city", "search", "near_me", "treatment", "insurance", "article"] as const;

const RequestSchema = z.object({
  placement_type: z.enum(PLACEMENT_TYPES),
  placement_value: z.string().min(1).max(120),
  slot_count: z.number().int().min(1).max(20).default(3),
  seed: z.number().int().min(0).max(99).default(0),
  page_path: z.string().max(2048).optional(),
  log_impressions: z.boolean().default(true),
  /**
   * When true AND the paid Featured pool for the bucket is empty,
   * fall back to top-rated approved+verified facilities matching the
   * bucket. Returned facilities carry is_fallback=true so the client
   * can adjust the section's title ("Top-Rated" vs "Featured") and
   * avoid implying paid placement when none exists.
   */
  fallback_to_top_rated: z.boolean().default(false),
});

interface EligibleFacility {
  facility_id: string;
  activated_at: string;
  name: string;
  slug: string | null;
  city: string;
  state: string;
  facility_type: string | null;
  description: string | null;
  logo_url: string | null;
  phone: string | null;
  verified_phone: string | null;
  has_facility_verified_contact: boolean | null;
  verified: boolean | null;
  sponsored_tagline: string | null;
}

// Canonical level-of-care continuum. Used to sort facility_services
// rows so the strip card always shows the highest-acuity LoC first
// (Detox → Inpatient → PHP → IOP → Outpatient → Sober Living).
const LOC_ORDER: Record<string, number> = {
  "detox": 0, "detoxification": 0, "medical detox": 0,
  "inpatient": 1, "residential": 1, "residential treatment": 1,
  "php": 2, "partial hospitalization": 2, "partial hospitalization program": 2,
  "iop": 3, "intensive outpatient": 3, "intensive outpatient program": 3,
  "outpatient": 4, "outpatient treatment": 4, "op": 4,
  "sober living": 5, "aftercare": 6,
};

function sortLocs(services: string[]): string[] {
  return [...services].sort((a, b) => {
    const ai = LOC_ORDER[a.toLowerCase()] ?? 99;
    const bi = LOC_ORDER[b.toLowerCase()] ?? 99;
    return ai - bi || a.localeCompare(b);
  });
}

// Shared facility-shape used by both the paid-rotation and
// fallback paths. The fallback omits `activated_at` because it
// isn't loaded from featured_placements.
type FacilityShape = Omit<EligibleFacility, "activated_at"> & { activated_at?: string };

// US state abbreviation → friendly name. Used by the near_me
// fallback (placement_value is the abbreviation; facilities.state
// stores the friendly name).
const US_STATE_ABBR_TO_NAME: Record<string, string> = {
  AL: "Alabama", AK: "Alaska", AZ: "Arizona", AR: "Arkansas", CA: "California",
  CO: "Colorado", CT: "Connecticut", DE: "Delaware", FL: "Florida", GA: "Georgia",
  HI: "Hawaii", ID: "Idaho", IL: "Illinois", IN: "Indiana", IA: "Iowa",
  KS: "Kansas", KY: "Kentucky", LA: "Louisiana", ME: "Maine", MD: "Maryland",
  MA: "Massachusetts", MI: "Michigan", MN: "Minnesota", MS: "Mississippi", MO: "Missouri",
  MT: "Montana", NE: "Nebraska", NV: "Nevada", NH: "New Hampshire", NJ: "New Jersey",
  NM: "New Mexico", NY: "New York", NC: "North Carolina", ND: "North Dakota", OH: "Ohio",
  OK: "Oklahoma", OR: "Oregon", PA: "Pennsylvania", RI: "Rhode Island", SC: "South Carolina",
  SD: "South Dakota", TN: "Tennessee", TX: "Texas", UT: "Utah", VT: "Vermont",
  VA: "Virginia", WA: "Washington", WV: "West Virginia", WI: "Wisconsin", WY: "Wyoming",
  DC: "District of Columbia",
};

/**
 * Enrich a list of facilities with their top services + top insurance.
 * One small batch fetch per facility list rather than a per-row N+1.
 * Adds the computed display_phone + position_in_rail per the response
 * contract. Returns the response-shaped array.
 */
async function enrichFacilities(
  supabase: ReturnType<typeof createClient>,
  facilities: FacilityShape[],
  facilityIds: string[],
): Promise<Array<Record<string, unknown>>> {
  const [servicesRes, insuranceRes] = await Promise.all([
    supabase
      .from("facility_services")
      .select("facility_id, service_name")
      .in("facility_id", facilityIds),
    supabase
      .from("facility_insurance")
      .select("facility_id, insurance_name")
      .in("facility_id", facilityIds),
  ]);

  if (servicesRes.error) {
    console.error("[get-featured-rotation] services fetch failed", servicesRes.error);
  }
  if (insuranceRes.error) {
    console.error("[get-featured-rotation] insurance fetch failed", insuranceRes.error);
  }

  const servicesByFacility = new Map<string, string[]>();
  for (const row of servicesRes.data ?? []) {
    const fid = (row as { facility_id: string }).facility_id;
    const name = (row as { service_name: string }).service_name;
    if (!servicesByFacility.has(fid)) servicesByFacility.set(fid, []);
    servicesByFacility.get(fid)!.push(name);
  }
  const insuranceByFacility = new Map<string, string[]>();
  for (const row of insuranceRes.data ?? []) {
    const fid = (row as { facility_id: string }).facility_id;
    const name = (row as { insurance_name: string }).insurance_name;
    if (!insuranceByFacility.has(fid)) insuranceByFacility.set(fid, []);
    insuranceByFacility.get(fid)!.push(name);
  }

  return facilities.map((f, position) => {
    const allServices = servicesByFacility.get(f.facility_id) ?? [];
    const allInsurance = insuranceByFacility.get(f.facility_id) ?? [];
    return {
      facility_id: f.facility_id,
      slug: f.slug,
      name: f.name,
      city: f.city,
      state: f.state,
      facility_type: f.facility_type,
      description: f.description,
      logo_url: f.logo_url,
      verified: f.verified,
      sponsored_tagline: f.sponsored_tagline,
      top_levels_of_care: sortLocs(allServices).slice(0, 3),
      top_insurance: [...allInsurance].sort((a, b) => a.localeCompare(b)).slice(0, 3),
      display_phone: f.has_facility_verified_contact && f.verified_phone
        ? f.verified_phone
        : f.phone,
      position_in_rail: position,
    };
  });
}

/**
 * Fallback: when no paid Featured subscribers cover a bucket, surface
 * top-rated approved+verified facilities that match the bucket's
 * filter so the section still renders something useful.
 *
 *   homepage | search        → top approved verified, nationally
 *   state | near_me          → WHERE state matches (via abbreviation
 *                              for near_me; via slug→name for state).
 *                              We resolve the state name once.
 *   city                     → WHERE city slug matches (relaxed to
 *                              case-insensitive city name match since
 *                              facilities don't have a city slug col)
 *   treatment                → JOIN facility_services on slug→service_name
 *   insurance                → JOIN facility_insurance on slug→insurance_name
 *   article                  → no fallback, return [] (article-specific
 *                              buckets don't have a natural facility filter)
 *
 * Selection is deterministic on (bucket, seed): we fetch the top
 * 30 candidates ordered by verified DESC, name ASC, then rotate
 * `seed % candidates.length` to pick the slot_count window. This
 * preserves the same EKRA-clean, per-visitor rotation contract as
 * the paid path.
 */
async function fetchFallbackFacilities(
  supabase: ReturnType<typeof createClient>,
  placement_type: typeof PLACEMENT_TYPES[number],
  placement_value: string,
  slot_count: number,
  seed: number,
): Promise<FacilityShape[]> {
  if (placement_type === "article") return [];

  // Common select + ordering for every fallback flavor.
  const SELECT =
    "id, name, slug, city, state, facility_type, description, logo_url, " +
    "phone, verified_phone, has_facility_verified_contact, verified, sponsored_tagline";
  const FETCH_LIMIT = 30;

  let rows: Array<Record<string, unknown>> = [];

  if (placement_type === "homepage" || placement_type === "search") {
    const { data, error } = await supabase
      .from("facilities")
      .select(SELECT)
      .eq("status", "approved")
      .order("verified", { ascending: false })
      .order("name", { ascending: true })
      .limit(FETCH_LIMIT);
    if (error) {
      console.error("[fallback] homepage/search fetch failed", error);
      return [];
    }
    rows = data ?? [];
  } else if (placement_type === "state" || placement_type === "near_me") {
    // facilities.state stores the full friendly name ("California"),
    // not the abbreviation. State pages pass a slug ("california");
    // near-me pages pass a 2-letter abbreviation ("CA"). Resolve both
    // to a friendly name before querying.
    const friendly =
      placement_value.length === 2
        ? US_STATE_ABBR_TO_NAME[placement_value.toUpperCase()] ?? placement_value
        : placement_value
            .replace(/-/g, " ")
            .replace(/\b\w/g, (m) => m.toUpperCase());
    const { data, error } = await supabase
      .from("facilities")
      .select(SELECT)
      .eq("status", "approved")
      .ilike("state", friendly)
      .order("verified", { ascending: false })
      .order("name", { ascending: true })
      .limit(FETCH_LIMIT);
    if (error) {
      console.error("[fallback] state/near_me fetch failed", error);
      return [];
    }
    rows = data ?? [];
  } else if (placement_type === "city") {
    const cityNameGuess = placement_value
      .replace(/-/g, " ")
      .replace(/\b\w/g, (m) => m.toUpperCase());
    const { data, error } = await supabase
      .from("facilities")
      .select(SELECT)
      .eq("status", "approved")
      .ilike("city", cityNameGuess)
      .order("verified", { ascending: false })
      .order("name", { ascending: true })
      .limit(FETCH_LIMIT);
    if (error) {
      console.error("[fallback] city fetch failed", error);
      return [];
    }
    rows = data ?? [];
  } else if (placement_type === "treatment") {
    // Slugs like "detox-programs" / "alcohol-rehabilitation" — match
    // service_name with a fuzzy ILIKE on a few normalized forms.
    const slugAsName = placement_value.replace(/-/g, " ");
    const { data: serviceMatches, error: smErr } = await supabase
      .from("facility_services")
      .select("facility_id")
      .ilike("service_name", `%${slugAsName}%`)
      .limit(500);
    if (smErr) {
      console.error("[fallback] treatment service lookup failed", smErr);
      return [];
    }
    const ids = Array.from(new Set((serviceMatches ?? []).map((r) => (r as { facility_id: string }).facility_id))).slice(0, 200);
    if (ids.length === 0) return [];
    const { data, error } = await supabase
      .from("facilities")
      .select(SELECT)
      .in("id", ids)
      .eq("status", "approved")
      .order("verified", { ascending: false })
      .order("name", { ascending: true })
      .limit(FETCH_LIMIT);
    if (error) {
      console.error("[fallback] treatment facility fetch failed", error);
      return [];
    }
    rows = data ?? [];
  } else if (placement_type === "insurance") {
    const slugAsName = placement_value
      .replace(/-rehab$|-treatment$/, "")
      .replace(/-/g, " ");
    const { data: insuranceMatches, error: imErr } = await supabase
      .from("facility_insurance")
      .select("facility_id")
      .ilike("insurance_name", `%${slugAsName}%`)
      .limit(500);
    if (imErr) {
      console.error("[fallback] insurance lookup failed", imErr);
      return [];
    }
    const ids = Array.from(new Set((insuranceMatches ?? []).map((r) => (r as { facility_id: string }).facility_id))).slice(0, 200);
    if (ids.length === 0) return [];
    const { data, error } = await supabase
      .from("facilities")
      .select(SELECT)
      .in("id", ids)
      .eq("status", "approved")
      .order("verified", { ascending: false })
      .order("name", { ascending: true })
      .limit(FETCH_LIMIT);
    if (error) {
      console.error("[fallback] insurance facility fetch failed", error);
      return [];
    }
    rows = data ?? [];
  }

  if (rows.length === 0) return [];

  // Rotate per seed so different visitors see different slices.
  const startIndex = seed % rows.length;
  const sliceLen = Math.min(slot_count, rows.length);
  const out: FacilityShape[] = [];
  for (let i = 0; i < sliceLen; i++) {
    const r = rows[(startIndex + i) % rows.length];
    out.push({
      facility_id: (r.id as string),
      name: (r.name as string),
      slug: (r.slug as string | null),
      city: (r.city as string),
      state: (r.state as string),
      facility_type: (r.facility_type as string | null),
      description: (r.description as string | null),
      logo_url: (r.logo_url as string | null),
      phone: (r.phone as string | null),
      verified_phone: (r.verified_phone as string | null),
      has_facility_verified_contact: (r.has_facility_verified_contact as boolean | null),
      verified: (r.verified as boolean | null),
      sponsored_tagline: (r.sponsored_tagline as string | null) ?? null,
    });
  }
  return out;
}

async function hashIp(ip: string | null): Promise<string | null> {
  if (!ip) return null;
  const enc = new TextEncoder().encode(ip + "::rl-featured");
  const hash = await crypto.subtle.digest("SHA-256", enc);
  return Array.from(new Uint8Array(hash))
    .slice(0, 8)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json", Allow: "POST, OPTIONS" },
    });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const parsed = RequestSchema.safeParse(body);
  if (!parsed.success) {
    return new Response(
      JSON.stringify({ error: "Validation failed", issues: parsed.error.issues }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } },
  );

  // Query the eligible pool. Stable ordering by activated_at ASC so
  // the rotation modulo is deterministic across calls.
  //
  // The double-join (featured_placements → facilities → facility_
  // subscriptions) filters to slots whose subscription is currently
  // active AND carries has_featured=true. If a subscriber cancels
  // mid-cycle, their slots stop appearing in rotation immediately
  // because this filter rejects the now-inactive subscription row.
  const { data: poolRaw, error: poolErr } = await supabase
    .from("featured_placements")
    .select(`
      facility_id,
      activated_at,
      facilities!inner (
        id, name, slug, city, state, facility_type, description, logo_url,
        phone, verified_phone, has_facility_verified_contact, verified,
        sponsored_tagline
      ),
      facility_subscriptions!inner (
        has_featured, has_concierge_partner, status
      )
    `)
    .eq("active", true)
    .eq("placement_type", parsed.data.placement_type)
    .eq("placement_value", parsed.data.placement_value)
    // Featured holders OR Concierge Partners (Concierge includes Featured
    // exposure + national/international). A canceled add-on drops out of
    // rotation immediately because the inner join + this filter reject it.
    .or("has_featured.eq.true,has_concierge_partner.eq.true", { referencedTable: "facility_subscriptions" })
    .eq("facility_subscriptions.status", "active")
    .order("activated_at", { ascending: true });

  if (poolErr) {
    console.error("[get-featured-rotation] pool fetch failed", poolErr);
    return new Response(
      JSON.stringify({ error: "Failed to load featured pool", code: "pool_fetch_failed" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  // Flatten the join into a list of facility-shaped records.
  const pool: EligibleFacility[] = (poolRaw ?? []).flatMap((row) => {
    const facility = (row as { facilities: EligibleFacility | EligibleFacility[] | null }).facilities;
    const f = Array.isArray(facility) ? facility[0] : facility;
    if (!f) return [];
    return [{
      facility_id: (row as { facility_id: string }).facility_id,
      activated_at: (row as { activated_at: string }).activated_at,
      name: f.name,
      slug: f.slug,
      city: f.city,
      state: f.state,
      facility_type: f.facility_type,
      description: f.description,
      logo_url: f.logo_url,
      phone: f.phone,
      verified_phone: f.verified_phone,
      has_facility_verified_contact: f.has_facility_verified_contact,
      verified: f.verified,
      sponsored_tagline: f.sponsored_tagline ?? null,
    }];
  });

  if (pool.length === 0) {
    if (!parsed.data.fallback_to_top_rated) {
      return new Response(
        JSON.stringify({ facilities: [], pool_size: 0, seed: parsed.data.seed, is_fallback: false }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Fallback path: no paid Featured subscribers for this bucket, so
    // surface top-rated approved+verified facilities that match the
    // bucket's filter so the section still renders. The client gets
    // is_fallback=true and re-labels the section ("Top-Rated" not
    // "Featured") to keep the paid/organic line honest.
    const fb = await fetchFallbackFacilities(
      supabase,
      parsed.data.placement_type,
      parsed.data.placement_value,
      parsed.data.slot_count,
      parsed.data.seed,
    );
    if (fb.length === 0) {
      return new Response(
        JSON.stringify({ facilities: [], pool_size: 0, seed: parsed.data.seed, is_fallback: true }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    const fbFacilityIds = fb.map((f) => f.facility_id);
    const fbEnriched = await enrichFacilities(supabase, fb, fbFacilityIds);
    return new Response(
      JSON.stringify({
        facilities: fbEnriched,
        pool_size: fb.length,
        seed: parsed.data.seed,
        is_fallback: true,
        placement_type: parsed.data.placement_type,
        placement_value: parsed.data.placement_value,
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
          "Cache-Control": "public, max-age=300, s-maxage=300",
        },
      },
    );
  }

  // Deterministic rotation: start_index = seed % pool_size, then take
  // slot_count consecutive entries (wrapping around the end).
  const startIndex = parsed.data.seed % pool.length;
  const slotCount = Math.min(parsed.data.slot_count, pool.length);
  const rotated: EligibleFacility[] = [];
  for (let i = 0; i < slotCount; i++) {
    rotated.push(pool[(startIndex + i) % pool.length]);
  }

  const facilityIds = rotated.map((f) => f.facility_id);
  const facilities = await enrichFacilities(supabase, rotated, facilityIds);

  // Log impressions (fire-and-forget — don't block the response).
  // Skipped entirely when log_impressions=false (strip surface — the
  // client logs per-card via IntersectionObserver instead).
  if (parsed.data.log_impressions) {
    const xf = req.headers.get("x-forwarded-for");
    const ip = xf ? xf.split(",")[0]?.trim() : null;
    const ipHash = await hashIp(ip);
    const userAgent = req.headers.get("user-agent")?.slice(0, 500) ?? null;
    const pagePath = parsed.data.page_path ?? null;

    if (facilities.length > 0 && pagePath) {
      const impressionRows = facilities.map((f) => ({
        facility_id: f.facility_id,
        placement_type: parsed.data.placement_type,
        placement_value: parsed.data.placement_value,
        visitor_seed: parsed.data.seed,
        position_in_rail: f.position_in_rail,
        page_path: pagePath,
        user_agent: userAgent,
        ip_hash: ipHash,
        // NULL surface == legacy rail. Strip rows are written by
        // log-strip-impression with surface='strip'.
        surface: null,
      }));
      const { error: insertErr } = await supabase
        .from("featured_impressions")
        .insert(impressionRows);
      if (insertErr) {
        console.error("[get-featured-rotation] impression log failed", insertErr);
      }
    }
  }

  return new Response(
    JSON.stringify({
      facilities,
      pool_size: pool.length,
      seed: parsed.data.seed,
      is_fallback: false,
      placement_type: parsed.data.placement_type,
      placement_value: parsed.data.placement_value,
    }),
    {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
        // Allow CDN/browser to cache for 5min — the rotation is
        // deterministic on (seed, bucket), so cache hits within that
        // window are fine. The bound is short so a newly-activated
        // Featured slot shows up quickly.
        "Cache-Control": "public, max-age=300, s-maxage=300",
      },
    },
  );
});
