/**
 * Shared helper to enforce admin-only access on edge functions.
 *
 * Usage:
 *   const auth = await requireAdmin(req);
 *   if (!auth.ok) return auth.response;
 *   const { adminUserId, supabase } = auth;
 *
 * Returns:
 *   - ok: true with { adminUserId, supabase } when caller is a verified admin
 *   - ok: false with a ready-to-return Response (401/403) otherwise
 *
 * Verification chain:
 *   1. Authorization: Bearer <jwt> header is present and valid (auth.getUser)
 *   2. The authenticated user has a row in admin_user_profiles with status='active'
 *
 * NEVER trust a userId or role passed in the request body. Always derive
 * identity from the verified JWT.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// deno-lint-ignore no-explicit-any
type SupabaseClient = any;

export type RequireAdminResult =
  | {
      ok: true;
      adminUserId: string;
      adminEmail: string | null;
      adminRole: string | null;
      supabase: SupabaseClient;
    }
  | { ok: false; response: Response };

function denied(status: number, error: string): Response {
  return new Response(JSON.stringify({ error }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

export async function requireAdmin(req: Request): Promise<RequireAdminResult> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
    return { ok: false, response: denied(500, "Server misconfigured") };
  }

  const authHeader = req.headers.get("Authorization") || req.headers.get("authorization");
  if (!authHeader || !authHeader.toLowerCase().startsWith("bearer ")) {
    return { ok: false, response: denied(401, "Missing authorization header") };
  }

  // Verify the JWT against auth.users
  const userClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false },
  });

  const { data: userData, error: userError } = await userClient.auth.getUser();
  if (userError || !userData?.user) {
    return { ok: false, response: denied(401, "Invalid or expired session") };
  }

  // Check admin_user_profiles for active admin status using service role
  // (bypasses RLS so we can verify regardless of policy edge cases).
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  const { data: adminProfile, error: adminError } = await supabase
    .from("admin_user_profiles")
    .select("user_id, admin_role, status")
    .eq("user_id", userData.user.id)
    .maybeSingle();

  if (adminError) {
    console.error("[requireAdmin] admin lookup failed:", adminError);
    return { ok: false, response: denied(500, "Authorization check failed") };
  }

  if (!adminProfile || adminProfile.status !== "active") {
    return { ok: false, response: denied(403, "Admin access required") };
  }

  return {
    ok: true,
    adminUserId: userData.user.id,
    adminEmail: userData.user.email ?? null,
    adminRole: adminProfile.admin_role ?? null,
    supabase,
  };
}

export { corsHeaders as requireAdminCorsHeaders };
