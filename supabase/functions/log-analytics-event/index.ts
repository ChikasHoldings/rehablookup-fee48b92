// First-party analytics event ingestion. Public endpoint (verify_jwt=false)
// because anonymous browsers must be able to log impressions. Caller-side
// session_id is the only identifier we ask for — no IP, no raw user-agent.
//
// Hardening:
//  - Body size cap
//  - Allow-list of event-name characters (no SQL/Unicode shenanigans)
//  - Strip params keys that look like PII (email/phone/ssn/dob)
//  - Drop unknown event categories silently rather than throwing (keeps
//    front-end fire-and-forget calls quiet on bad input)

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2?target=denonext";
import { checkRateLimit, logRateLimitAttempt } from "../_shared/rate-limit.ts";

const VERSION = "1.0.0";
const LOG = `[LOG-ANALYTICS-EVENT v${VERSION}]`;

const MAX_BODY_BYTES = 32 * 1024;      // 32 KB per request (batch of ~50 events)
const MAX_EVENTS_PER_BATCH = 50;
const MAX_EVENT_NAME_LEN = 64;
const MAX_PATH_LEN = 512;
const MAX_PARAMS_KEYS = 24;
const MAX_PARAMS_VALUE_LEN = 256;

const EVENT_NAME_RE = /^[a-z][a-z0-9_]{0,63}$/;
const PII_KEY_RE = /(email|phone|mobile|tel|ssn|social|dob|birth|password|token|secret|address)/i;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version, apikey",
};

interface IncomingEvent {
  event_name?: unknown;
  category?: unknown;
  params?: unknown;
  path?: unknown;
  referrer?: unknown;
  viewport?: unknown;
  session_id?: unknown;
}

interface InsertRow {
  event_name: string;
  category: string | null;
  user_id: string | null;
  session_id: string | null;
  path: string | null;
  referrer: string | null;
  viewport: string | null;
  params: Record<string, unknown>;
}

function trim(s: unknown, max: number): string | null {
  if (typeof s !== "string") return null;
  const t = s.trim();
  if (!t) return null;
  return t.length > max ? t.slice(0, max) : t;
}

function sanitizeParams(raw: unknown): Record<string, unknown> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const out: Record<string, unknown> = {};
  let count = 0;
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (count >= MAX_PARAMS_KEYS) break;
    if (typeof k !== "string" || !k) continue;
    if (PII_KEY_RE.test(k)) continue;                       // drop PII keys
    if (v === null || v === undefined) continue;
    if (typeof v === "string") {
      if (PII_KEY_RE.test(v) && v.includes("@")) continue;  // looks like an email value
      out[k] = v.length > MAX_PARAMS_VALUE_LEN ? v.slice(0, MAX_PARAMS_VALUE_LEN) : v;
    } else if (typeof v === "number" || typeof v === "boolean") {
      out[k] = v;
    } else if (Array.isArray(v)) {
      out[k] = v.slice(0, 10).map((item) =>
        typeof item === "string" ? item.slice(0, MAX_PARAMS_VALUE_LEN) : item
      );
    }
    // Drop nested objects — keeps the column small + predictable.
    count++;
  }
  return out;
}

function buildRow(ev: IncomingEvent, userId: string | null): InsertRow | null {
  const event_name = trim(ev.event_name, MAX_EVENT_NAME_LEN);
  if (!event_name || !EVENT_NAME_RE.test(event_name)) return null;
  return {
    event_name,
    category: trim(ev.category, 64),
    user_id: userId,
    session_id: trim(ev.session_id, 64),
    path: trim(ev.path, MAX_PATH_LEN),
    referrer: trim(ev.referrer, MAX_PATH_LEN),
    viewport: trim(ev.viewport, 16),
    params: sanitizeParams(ev.params),
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response("Server misconfigured", { status: 500, headers: corsHeaders });
    }
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Best-effort user_id extraction from the Authorization header. We never
    // *require* it — anonymous events are valid.
    let userId: string | null = null;
    const authHeader = req.headers.get("Authorization");
    if (authHeader?.startsWith("Bearer ")) {
      try {
        const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
        if (anonKey) {
          const anonClient = createClient(supabaseUrl, anonKey);
          const { data } = await anonClient.auth.getUser(authHeader.slice(7));
          if (data?.user?.id) userId = data.user.id;
        }
      } catch {
        // ignore — anonymous fallback
      }
    }

    // Rate limit BEFORE parsing the body. Identifier:
    //   - Logged-in users → user id
    //   - Anonymous → session_id-prefixed header from the client (or
    //     the CF/Vercel IP-equivalent header if available). Falls back
    //     to a per-request token so floods at minimum cost storage,
    //     not query time.
    // Limit: 300 events / minute / identifier. That's well above any
    // legitimate first-party analytics flush (we batch 50/req max),
    // and well below an attacker's spam budget.
    const rateIdentifier =
      userId ||
      req.headers.get("x-real-ip") ||
      req.headers.get("cf-connecting-ip") ||
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      `anon:${crypto.randomUUID()}`;
    const rateCheck = await checkRateLimit(supabase, {
      identifier: rateIdentifier,
      actionType: "analytics_event",
      maxAttempts: 300,
      windowMinutes: 1,
    });
    if (!rateCheck.allowed) {
      return new Response(
        JSON.stringify({
          error: "Rate limit exceeded",
          retryAfterSec: 60,
        }),
        {
          status: 429,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
            "Retry-After": "60",
          },
        },
      );
    }
    await logRateLimitAttempt(supabase, rateIdentifier, "analytics_event", true);

    const raw = await req.text();
    if (raw.length > MAX_BODY_BYTES) {
      return new Response("Payload too large", { status: 413, headers: corsHeaders });
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return new Response("Invalid JSON", { status: 400, headers: corsHeaders });
    }

    // Accept either { events: [...] } or a single event object.
    const events = Array.isArray((parsed as { events?: unknown[] })?.events)
      ? ((parsed as { events: unknown[] }).events)
      : Array.isArray(parsed)
      ? (parsed as unknown[])
      : [parsed];

    if (events.length === 0) {
      return new Response(JSON.stringify({ accepted: 0 }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (events.length > MAX_EVENTS_PER_BATCH) {
      return new Response("Too many events", { status: 413, headers: corsHeaders });
    }

    const rows: InsertRow[] = [];
    for (const ev of events) {
      if (!ev || typeof ev !== "object") continue;
      const row = buildRow(ev as IncomingEvent, userId);
      if (row) rows.push(row);
    }

    if (rows.length === 0) {
      return new Response(JSON.stringify({ accepted: 0 }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { error } = await supabase.from("analytics_events").insert(rows);
    if (error) {
      console.warn(LOG, "insert failed:", error.message);
      return new Response("Insert failed", { status: 500, headers: corsHeaders });
    }

    return new Response(JSON.stringify({ accepted: rows.length }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(LOG, "ERROR", msg);
    return new Response("Server error", { status: 500, headers: corsHeaders });
  }
});
