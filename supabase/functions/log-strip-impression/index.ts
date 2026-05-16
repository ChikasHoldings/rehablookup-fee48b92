// log-strip-impression
// ────────────────────
// Viewport-debounced impression logger for the FeaturedStrip surface.
// Writes one row to public.featured_impressions with
// surface='strip', per facility card that the client has confirmed
// is actually visible (50% visible for 500ms via IntersectionObserver).
//
// Distinct from get-featured-rotation's server-side bulk-log (which
// fires for every facility returned, regardless of whether it ever
// entered the viewport — fine for the rail grid because the grid is
// always rendered above the fold).
//
// Best-effort: returns 204 even when the insert fails. The strip
// render does not depend on this endpoint succeeding.
//
// verify_jwt: false — public endpoint, called by anonymous browsers.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2?target=denonext";
import { z } from "https://esm.sh/zod@3.23.8?target=denonext";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const PLACEMENT_TYPES = ["homepage", "state", "city", "search", "near_me", "treatment", "insurance", "article"] as const;

const RequestSchema = z.object({
  facility_id: z.string().uuid(),
  placement_type: z.enum(PLACEMENT_TYPES),
  placement_value: z.string().min(1).max(120),
  page_path: z.string().min(1).max(2048),
  visitor_seed: z.number().int().min(0).max(99),
  position_in_strip: z.number().int().min(0).max(50),
});

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
    // Drop silently — caller is fire-and-forget; never gate the UI on
    // a parse error here.
    return new Response(null, { status: 204, headers: corsHeaders });
  }
  const parsed = RequestSchema.safeParse(body);
  if (!parsed.success) {
    if (Deno.env.get("DENO_DEPLOYMENT_ID") === undefined) {
      // Local dev: surface validation issues for debugging.
      return new Response(
        JSON.stringify({ error: "Validation failed", issues: parsed.error.issues }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } },
  );

  const xf = req.headers.get("x-forwarded-for");
  const ip = xf ? xf.split(",")[0]?.trim() : null;
  const ipHash = await hashIp(ip);
  const userAgent = req.headers.get("user-agent")?.slice(0, 500) ?? null;

  const { error } = await supabase
    .from("featured_impressions")
    .insert({
      facility_id: parsed.data.facility_id,
      placement_type: parsed.data.placement_type,
      placement_value: parsed.data.placement_value,
      visitor_seed: parsed.data.visitor_seed,
      // featured_impressions.position_in_rail is reused for the strip's
      // card index — it's a generic "position in the rotated list"
      // signal regardless of surface.
      position_in_rail: parsed.data.position_in_strip,
      page_path: parsed.data.page_path,
      user_agent: userAgent,
      ip_hash: ipHash,
      surface: "strip",
    });

  if (error) {
    console.error("[log-strip-impression] insert failed", error);
    // Still return 204 — fire-and-forget contract.
  }

  return new Response(null, { status: 204, headers: corsHeaders });
});
