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
        has_featured, status
      )
    `)
    .eq("active", true)
    .eq("placement_type", parsed.data.placement_type)
    .eq("placement_value", parsed.data.placement_value)
    .eq("facility_subscriptions.has_featured", true)
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
    return new Response(
      JSON.stringify({ facilities: [], pool_size: 0, seed: parsed.data.seed }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
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

  // Enrich each rotated facility with its top services + top insurance
  // — used by the strip's full card layout. One small batch fetch per
  // facility list rather than a per-row N+1.
  const facilityIds = rotated.map((f) => f.facility_id);
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

  // Map to the response shape — the resolved display phone is computed
  // here so the client doesn't have to know the verified-contact rule.
  const facilities = rotated.map((f, position) => {
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
