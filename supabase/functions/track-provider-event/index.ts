import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4?target=denonext";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const ALLOWED_EVENT_TYPES = ["listing_impression", "profile_view", "click_to_call", "website_click"];
const ALLOWED_PAGE_CONTEXTS = ["search", "profile", "other"];

const MAX_BODY_SIZE = 5000;

const isValidUUID = (str: unknown): str is string =>
  typeof str === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(str);

// Roles whose facility interactions are counted as INTERNAL traffic and
// excluded from the public-facing "visitor" KPI on /admin/analytics.
// Providers (`facility_owner` etc.) are intentionally NOT excluded — a
// provider browsing the public site is still a legitimate visitor signal.
const INTERNAL_ROLES = new Set(["admin", "super_admin", "manager"]);

// User-Agent patterns that identify automated traffic (crawlers, prerender
// services, headless browsers, monitoring/uptime probes). Matching is
// case-insensitive substring; the list is intentionally conservative so we
// don't accidentally drop real users using minority browsers. GA4's own
// "exclude known bots and spiders" filter handles the same job on the GA
// side, which is why dropping these here reconciles the two streams.
const BOT_UA_PATTERNS = [
  "googlebot",
  "bingbot",
  "duckduckbot",
  "yandex",
  "baiduspider",
  "applebot",
  "semrushbot",
  "ahrefsbot",
  "mj12bot",
  "dotbot",
  "petalbot",
  "facebot",
  "facebookexternalhit",
  "twitterbot",
  "linkedinbot",
  "slackbot",
  "discordbot",
  "telegrambot",
  "embedly",
  "pinterestbot",
  "redditbot",
  "whatsapp",
  "skypeuripreview",
  "vkshare",
  // Prerender services
  "prerender",
  "rendertron",
  // Headless / automation
  "headlesschrome",
  "phantomjs",
  "selenium",
  "puppeteer",
  "playwright",
  // Uptime / monitoring
  "uptimerobot",
  "pingdom",
  "statuscake",
  "site24x7",
  "datadog",
  "newrelic",
  "lighthouse",
  "pagespeed",
  "gtmetrix",
  // Generic crawlers
  "crawler",
  "spider",
  "bot/",
  // Curl + scripted clients (rare for real users)
  "curl/",
  "wget/",
  "python-requests",
  "python-urllib",
  "axios/",
  "node-fetch",
  "java/",
  "go-http-client",
];

function isBotUserAgent(ua: string | null): boolean {
  if (!ua) return true; // missing UA on a browser request is itself suspicious
  const lower = ua.toLowerCase();
  return BOT_UA_PATTERNS.some((pat) => lower.includes(pat));
}

/**
 * Best-effort role lookup for the caller. Returns null when the request is
 * anonymous, the JWT is invalid, or the user has no role row — none of
 * those are blocking (we still record the event), they just mean we can't
 * tag it as internal.
 *
 * The check runs against the `user_roles` table which is the canonical
 * source for admin/staff role membership. If the caller is an authenticated
 * provider/seeker (no admin role), `has_internal_role` will be false and
 * the event is still recorded as external — providers + seekers ARE real
 * traffic.
 */
async function detectInternalCaller(
  req: Request,
  serviceClient: ReturnType<typeof createClient>,
): Promise<boolean> {
  const auth = req.headers.get("Authorization");
  if (!auth || !auth.startsWith("Bearer ")) return false;
  const token = auth.slice("Bearer ".length).trim();
  if (!token) return false;
  try {
    const { data, error } = await serviceClient.auth.getUser(token);
    if (error || !data.user) return false;
    const { data: roles, error: rolesErr } = await serviceClient
      .from("user_roles")
      .select("role")
      .eq("user_id", data.user.id);
    if (rolesErr || !roles) return false;
    return roles.some((r: { role: string }) => INTERNAL_ROLES.has(r.role));
  } catch {
    return false;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed", code: "method_not_allowed", allowed: ["POST"] }),
      {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json", Allow: "POST, OPTIONS" },
      },
    );
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Body-size cap before parsing (L6 — parity with track-view).
    const rawBody = await req.text();
    if (rawBody.length > MAX_BODY_SIZE) {
      return new Response(
        JSON.stringify({ error: "Request too large" }),
        { status: 413, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(rawBody);
    } catch {
      return new Response(
        JSON.stringify({ error: "Invalid JSON" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const facilityId = parsed.facilityId;
    const eventType = parsed.eventType;
    const sessionId = parsed.sessionId;
    const pageContext = typeof parsed.pageContext === "string" ? parsed.pageContext : "other";

    if (!facilityId || !eventType || !sessionId) {
      console.error("[track-provider-event] Missing required fields:", { facilityId, eventType, sessionId });
      return new Response(
        JSON.stringify({ error: "Missing required fields: facilityId, eventType, sessionId" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate facilityId is a UUID (L6 — parity with track-view).
    if (!isValidUUID(facilityId)) {
      return new Response(
        JSON.stringify({ error: "Invalid facilityId format" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    if (typeof eventType !== "string" || typeof sessionId !== "string" || sessionId.length > 200) {
      return new Response(
        JSON.stringify({ error: "Invalid eventType or sessionId" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!ALLOWED_EVENT_TYPES.includes(eventType)) {
      console.error("[track-provider-event] Invalid event type:", eventType);
      return new Response(
        JSON.stringify({ error: `Invalid event type. Allowed: ${ALLOWED_EVENT_TYPES.join(", ")}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const validPageContext = ALLOWED_PAGE_CONTEXTS.includes(pageContext) ? pageContext : "other";

    // Bot detection runs first because it's the cheapest filter and most
    // common cause of skew. Return a 200 (so the client doesn't retry) but
    // do not insert. Logged so we can spot-check the bot list against logs.
    const userAgent = req.headers.get("User-Agent");
    const isBot = isBotUserAgent(userAgent);

    // Internal-role detection runs only when bot check passes — saves a
    // round-trip to user_roles for the high-volume bot traffic case.
    const isInternal = isBot ? false : await detectInternalCaller(req, supabase);

    // Check facility exists + is approved (also prevents event_type spam
    // against deleted/pending facilities).
    const { data: facility, error: facilityError } = await supabase
      .from("facilities")
      .select("id, status")
      .eq("id", facilityId)
      .eq("status", "approved")
      .maybeSingle();

    if (facilityError) {
      console.error("[track-provider-event] Facility lookup error:", facilityError);
      return new Response(
        JSON.stringify({ error: "Failed to verify facility" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!facility) {
      // Fail silently for invalid/deleted facilities — don't expose existence.
      return new Response(
        JSON.stringify({ success: true, tracked: false }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 30-second dedup window. Same key as before — session_id + facility_id
    // + event_type — so React strict-mode double-mounts and hot-reload
    // flicker don't double-count.
    const thirtySecondsAgo = new Date(Date.now() - 30000).toISOString();
    const { data: recentEvent } = await supabase
      .from("provider_events")
      .select("id")
      .eq("facility_id", facilityId)
      .eq("event_type", eventType)
      .eq("session_id", sessionId)
      .gte("created_at", thirtySecondsAgo)
      .limit(1)
      .maybeSingle();

    if (recentEvent) {
      return new Response(
        JSON.stringify({ success: true, tracked: false, reason: "duplicate" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Insert. We persist bot + internal hits too (rather than silently
    // dropping) so the admin dashboard can opt into a "show internal" view
    // for QA — the default query just excludes them. This is the same
    // pattern GA4 uses (records the hit, tags it, lets the report filter).
    const { error: insertError } = await supabase
      .from("provider_events")
      .insert({
        facility_id: facilityId,
        event_type: eventType,
        session_id: sessionId,
        page_context: validPageContext,
        is_internal: isInternal,
        is_bot: isBot,
      });

    if (insertError) {
      console.error("[track-provider-event] Insert error:", insertError);
      return new Response(
        JSON.stringify({ error: "Failed to track event" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        tracked: true,
        ...(isBot ? { tagged: "bot" } : {}),
        ...(isInternal ? { tagged: "internal" } : {}),
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[track-provider-event] Unexpected error:", error);
    // Fail silently — never block UX on analytics.
    return new Response(
      JSON.stringify({ success: true, tracked: false, reason: "error" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
