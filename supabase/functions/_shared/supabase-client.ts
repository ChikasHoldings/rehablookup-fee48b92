/**
 * Shared, strongly-typed Supabase client factories for edge functions.
 *
 * Why this exists
 * ───────────────
 * Every edge function used to call `createClient(url, key)` directly without
 * passing the generated `Database` generic. The result was that every
 * `.from("table").insert({...})` and `.update({...})` call was effectively
 * `any`, which produced ~25 broken TS2345 errors during builds and silently
 * accepted invalid column names at runtime.
 *
 * This helper centralises:
 *   1. The supabase-js version (one place to bump)
 *   2. The `<Database>` generic (so insert/update/select are fully inferred)
 *   3. The two correct usage modes:
 *        • `createServiceClient()` — service-role, bypasses RLS
 *          Use for cron jobs, admin tooling, server-side data sync
 *        • `createUserClient(req)`  — forwards the caller's Authorization
 *          header so RLS runs as the authenticated user
 *          Use for user-initiated actions where row-level rules must apply
 *
 * Usage
 * ─────
 *   import { createServiceClient } from "../_shared/supabase-client.ts";
 *   const supabase = createServiceClient();
 *   const { data } = await supabase
 *     .from("facilities")
 *     .select("id, name, slug")        // ← columns autocompleted + checked
 *     .eq("status", "approved");        // ← invalid columns now error at build
 *
 *   await supabase
 *     .from("facilities")
 *     .update({ status: "approved" })   // ← payload shape enforced
 *     .eq("id", facilityId);
 */

import {
  createClient,
  type SupabaseClient,
} from "https://esm.sh/@supabase/supabase-js@2.57.2";
import type { Database } from "./database.types.ts";

/**
 * Strongly-typed alias used by helpers that accept a client as a parameter.
 * Prefer this over `SupabaseClient<any>` everywhere.
 */
export type TypedSupabaseClient = SupabaseClient<Database>;

/** Re-export so callers don't need a second import. */
export type { Database } from "./database.types.ts";

function readEnv(name: string): string {
  const value = Deno.env.get(name);
  if (!value) {
    throw new Error(
      `[supabase-client] Missing required environment variable: ${name}`,
    );
  }
  return value;
}

/**
 * Service-role client — bypasses Row-Level Security.
 *
 * Use ONLY for trusted server-side logic (cron jobs, admin endpoints that
 * have already verified the caller via `requireAdmin`, system-level data
 * sync). Never expose service-role results directly to unauthenticated
 * users without filtering.
 */
export function createServiceClient(): TypedSupabaseClient {
  return createClient<Database>(
    readEnv("SUPABASE_URL"),
    readEnv("SUPABASE_SERVICE_ROLE_KEY"),
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    },
  );
}

/**
 * User-scoped client — forwards the caller's Authorization header so all
 * queries execute under the user's JWT and respect RLS.
 *
 * Pass the incoming `Request` (or just the Authorization header value) so
 * the helper can attach it. If no auth header is present the client falls
 * back to the anon key, which is fine for genuinely public reads.
 */
export function createUserClient(
  reqOrAuthHeader: Request | string | null,
): TypedSupabaseClient {
  const authHeader =
    typeof reqOrAuthHeader === "string"
      ? reqOrAuthHeader
      : reqOrAuthHeader?.headers.get("Authorization") ?? "";

  return createClient<Database>(
    readEnv("SUPABASE_URL"),
    readEnv("SUPABASE_ANON_KEY"),
    {
      global: {
        headers: authHeader ? { Authorization: authHeader } : {},
      },
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    },
  );
}
