// admin-cancel-subscription
// ─────────────────────────
// Admin-initiated cancellation endpoint. Wraps cancelSubscriptionAndRefund()
// with an admin-role check. Used by Customer Support to manually cancel a
// facility's subscription (e.g. customer-service request via phone).
//
// verify_jwt is enabled (true) — every request needs a valid Supabase
// session. The handler then re-checks user_roles for an admin role
// before doing anything destructive.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2?target=denonext";
import { z } from "https://esm.sh/zod@3.23.8?target=denonext";
import { cancelSubscriptionAndRefund } from "../_shared/cancel-subscription.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const RequestSchema = z.object({
  subscription_id: z.string().uuid(),
  scope: z.enum(["all", "addon-featured", "addon-concierge"]),
  reason: z.string().trim().min(3).max(500),
});

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json", Allow: "POST, OPTIONS" } },
    );
  }

  // Authenticate caller via the JWT supabase-js auto-injects.
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response(JSON.stringify({ error: "Missing Authorization header" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const userScopedSupabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? "",
    { global: { headers: { Authorization: authHeader } }, auth: { persistSession: false } },
  );
  const { data: { user }, error: authError } = await userScopedSupabase.auth.getUser();
  if (authError || !user) {
    return new Response(JSON.stringify({ error: "Unauthorized", code: "auth_failed" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Admin-role gate. We re-check via the service-role client so RLS
  // can't mask the check (defence in depth — the userScoped client
  // SHOULD only see its own row in user_roles, but going through
  // service role makes the auth boundary explicit).
  const serviceRoleSupabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } },
  );
  const { data: roles } = await serviceRoleSupabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id);
  const isAdmin = (roles ?? []).some((r: { role: string }) =>
    ["admin", "super_admin"].includes(r.role),
  );
  if (!isAdmin) {
    return new Response(JSON.stringify({ error: "Admin role required", code: "forbidden" }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
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
      JSON.stringify({
        error: "Validation failed",
        issues: parsed.error.issues.map((i) => ({ path: i.path, message: i.message })),
      }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  try {
    const result = await cancelSubscriptionAndRefund(parsed.data.subscription_id, {
      scope: parsed.data.scope,
      reason: `admin: ${parsed.data.reason}`,
      triggeredBy: user.id,
    });
    return new Response(JSON.stringify({ ok: true, ...result }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[admin-cancel-subscription] failed", err);
    return new Response(
      JSON.stringify({
        error: err instanceof Error ? err.message : "Cancellation failed",
        code: "execution_failed",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
