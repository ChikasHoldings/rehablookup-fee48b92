// Public edge function: capture searches submitted from the 404 / NotFound
// recovery box, plus a follow-up "zero_results" event when the resulting
// /search-results page returns nothing.
//
// Anonymous traffic is expected. We do NOT verify a JWT here — instead we
// hard-cap input sizes, sanitize strings, and write through the service role
// so RLS keeps reads admin-only.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2?target=denonext";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MAX_BODY_SIZE = 8192;
const ALLOWED_EVENT_KINDS = new Set(["submit", "zero_results"]);

function clean(value: unknown, maxLen: number): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value
    .replace(/\0/g, "")
    .replace(/<[^>]*>/g, "")
    .replace(/javascript:/gi, "")
    .trim();
  if (!trimmed) return null;
  return trimmed.slice(0, maxLen);
}

function isUuid(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
  );
}

function asNonNegativeInt(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  const n = Math.floor(value);
  if (n < 0 || n > 1_000_000) return null;
  return n;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "method_not_allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const raw = await req.text();
    if (raw.length > MAX_BODY_SIZE) {
      return new Response(JSON.stringify({ error: "payload_too_large" }), {
        status: 413,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let body: Record<string, unknown> = {};
    try {
      body = raw ? JSON.parse(raw) : {};
    } catch {
      return new Response(JSON.stringify({ error: "invalid_json" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const eventKindRaw = clean(body.eventKind, 32);
    const eventKind =
      eventKindRaw && ALLOWED_EVENT_KINDS.has(eventKindRaw) ? eventKindRaw : null;
    if (!eventKind) {
      return new Response(JSON.stringify({ error: "invalid_event_kind" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const location = clean(body.location, 256);
    const treatment = clean(body.treatment, 64);
    const insurance = clean(body.insurance, 64);

    // Require at least one of location/treatment/insurance — otherwise the
    // record is noise.
    if (!location && !treatment && !insurance) {
      return new Response(JSON.stringify({ error: "empty_query" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const sourcePath = clean(body.sourcePath, 1024);
    const referrer = clean(body.referrer, 2048);
    const userAgent = clean(req.headers.get("user-agent"), 512);
    const viewport = clean(body.viewport, 32);
    const sessionId = clean(body.sessionId, 64);
    const userId = isUuid(body.userId) ? (body.userId as string) : null;
    const resultsCount =
      eventKind === "zero_results" ? asNonNegativeInt(body.resultsCount) ?? 0 : null;

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );

    const { error } = await supabase.from("not_found_searches").insert({
      event_kind: eventKind,
      location,
      treatment,
      insurance,
      results_count: resultsCount,
      source_path: sourcePath,
      referrer,
      user_agent: userAgent,
      viewport,
      session_id: sessionId,
      user_id: userId,
    });

    if (error) {
      console.error("[log-not-found-search] insert failed", {
        code: error.code,
        message: error.message,
      });
      return new Response(JSON.stringify({ error: "insert_failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[log-not-found-search] unexpected", err);
    return new Response(JSON.stringify({ error: "unexpected" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
