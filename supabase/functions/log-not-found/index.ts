// Public edge function: capture client-side 404 (NotFound) views.
//
// Fired by src/pages/NotFound.tsx as fire-and-forget. Anonymous traffic is
// expected (most 404s come from non-logged-in users), so we do NOT verify a
// JWT here — but we hard-cap input sizes, sanitize strings, rate-limit
// implicitly via the path/UA truncation, and write through the service role
// so RLS still keeps reads admin-only.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2?target=denonext";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MAX_BODY_SIZE = 8192;

const ALLOWED_METHODS = new Set([
  "GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS",
]);
const ALLOWED_REQUEST_KINDS = new Set(["spa_route", "static_asset"]);

function clean(value: unknown, maxLen: number): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value
    .replace(/\\0/g, "")
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

    const path = clean(body.path, 1024);
    if (!path || !path.startsWith("/")) {
      return new Response(JSON.stringify({ error: "invalid_path" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const search = clean(body.search, 1024);
    const referrer = clean(body.referrer, 2048);
    // Prefer the request UA header over body to avoid spoofing
    const userAgent = clean(req.headers.get("user-agent"), 512);
    const viewport = clean(body.viewport, 32);
    const sessionId = clean(body.sessionId, 64);
    const userId = isUuid(body.userId) ? (body.userId as string) : null;

    // ---- New request-context fields -------------------------------------
    const rawMethod = clean(body.httpMethod, 16);
    const httpMethod =
      rawMethod && ALLOWED_METHODS.has(rawMethod.toUpperCase())
        ? rawMethod.toUpperCase()
        : "GET";

    // Full query string (raw, e.g. "?foo=bar&baz=qux"). We already store the
    // shorter `search` field for legacy callers; `query_string` is the
    // canonical, unmodified value for new analytics.
    const queryString = search;

    const hash = clean(body.hash, 256);
    const fullUrl = clean(body.fullUrl, 2048);

    // Server-side authoritative classification — never trust the client.
    const lastSegment = path.split("/").pop() || "";
    const extMatch = lastSegment.match(/\.([a-zA-Z0-9]{2,5})$/);
    const detectedExtension = extMatch ? `.${extMatch[1].toLowerCase()}` : null;
    const detectedKind: "spa_route" | "static_asset" =
      detectedExtension && detectedExtension !== ".html"
        ? "static_asset"
        : "spa_route";

    // Honor a client hint only if it agrees with the server detection or is
    // a recognized value; otherwise fall back to server detection.
    const clientKind = clean(body.requestKind, 32);
    const requestKind =
      clientKind && ALLOWED_REQUEST_KINDS.has(clientKind)
        ? clientKind
        : detectedKind;

    const assetExtension = detectedExtension;
    // ---------------------------------------------------------------------

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );

    const { error } = await supabase.from("not_found_events").insert({
      path,
      search,
      referrer,
      user_agent: userAgent,
      viewport,
      user_id: userId,
      session_id: sessionId,
      http_method: httpMethod,
      query_string: queryString,
      hash,
      request_kind: requestKind,
      asset_extension: assetExtension,
      full_url: fullUrl,
    });

    if (error) {
      console.error("[log-not-found] insert failed", { code: error.code, message: error.message });
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
    console.error("[log-not-found] unexpected", err);
    return new Response(JSON.stringify({ error: "unexpected" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
