/**
 * Shared helper to enforce cron-secret authentication on edge functions
 * that are only meant to be invoked by pg_cron via pg_net.
 *
 * Why this exists
 * ───────────────
 * Cron-triggered functions cannot use `verify_jwt: true` because pg_cron
 * has no user session. The next best thing is a static secret carried
 * in a request header. The secret is stored in Vault (Supabase →
 * Database → Vault → `cron_secret`) and read into the edge function's
 * environment as `CRON_SECRET`. pg_cron jobs pass it as the
 * `X-Cron-Secret` header in their pg_net.http_post call.
 *
 * Usage
 * ─────
 *   import { assertCronSecret } from "../_shared/cron-auth.ts";
 *
 *   Deno.serve(async (req) => {
 *     if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
 *     const auth = assertCronSecret(req);
 *     if (!auth.ok) return auth.response;
 *     // ... your function logic ...
 *   });
 *
 * Returns
 * ───────
 *   { ok: true } when the X-Cron-Secret header equals env.CRON_SECRET
 *   { ok: false, response: Response } with 401 otherwise
 *
 * Failure modes
 * ─────────────
 *   - env.CRON_SECRET unset → 500 "Server misconfigured: CRON_SECRET not set"
 *     (fails closed; never returns ok:true with no secret)
 *   - X-Cron-Secret header missing → 401 "Missing cron secret"
 *   - X-Cron-Secret header mismatch → 401 "Invalid cron secret"
 *
 * Constant-time comparison
 * ────────────────────────
 * The header is compared against the env secret in constant time to
 * avoid timing attacks. Use `Deno.env.get("CRON_SECRET")` once at
 * function entry; do NOT call this in a hot loop.
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-cron-secret",
};

export type CronAuthResult =
  | { ok: true }
  | { ok: false; response: Response };

function deny(status: number, error: string): Response {
  return new Response(JSON.stringify({ error }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

export function assertCronSecret(req: Request): CronAuthResult {
  const expected = Deno.env.get("CRON_SECRET");
  if (!expected) {
    console.error("[cron-auth] CRON_SECRET env var not set — fail-closed");
    return { ok: false, response: deny(500, "Server misconfigured: CRON_SECRET not set") };
  }

  const provided =
    req.headers.get("x-cron-secret") ||
    req.headers.get("X-Cron-Secret") ||
    "";

  if (!provided) {
    return { ok: false, response: deny(401, "Missing cron secret") };
  }

  if (!constantTimeEqual(provided, expected)) {
    return { ok: false, response: deny(401, "Invalid cron secret") };
  }

  return { ok: true };
}

export { corsHeaders as cronAuthCorsHeaders };
