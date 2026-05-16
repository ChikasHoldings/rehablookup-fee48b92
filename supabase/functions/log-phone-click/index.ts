// log-phone-click
// ───────────────
// Fire-and-forget logger for Featured-card phone clicks. The client's
// tel: link calls this just before opening the dialer; the dialer
// opens NATIVELY regardless of whether this logs successfully — we
// never preventDefault or await the request from the client side.
//
// verify_jwt: false — serves public pages.

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
  visitor_seed: z.number().int().min(0).max(99).optional(),
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
    return new Response(null, {
      status: 405,
      headers: { ...corsHeaders, Allow: "POST, OPTIONS" },
    });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    // Silent — the dialer is already opening, no value in surfacing.
    return new Response(null, { status: 204, headers: corsHeaders });
  }
  const parsed = RequestSchema.safeParse(body);
  if (!parsed.success) {
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

  await supabase.from("featured_phone_clicks").insert({
    facility_id: parsed.data.facility_id,
    placement_type: parsed.data.placement_type,
    placement_value: parsed.data.placement_value,
    page_path: parsed.data.page_path,
    visitor_seed: parsed.data.visitor_seed ?? null,
    user_agent: userAgent,
    ip_hash: ipHash,
  });

  // 204 No Content — the caller is fire-and-forget anyway.
  return new Response(null, { status: 204, headers: corsHeaders });
});
