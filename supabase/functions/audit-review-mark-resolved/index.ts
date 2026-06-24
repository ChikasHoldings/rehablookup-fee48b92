// audit-review-mark-resolved
// ──────────────────────────
// Admin endpoint: marks a flagged concierge_introduction_audit row as
// resolved with one of three outcomes: 'acceptable', 'needs_followup',
// or 'coaching_issued'. Records the reviewing admin's user_id and note.
//
// Caller must hold admin or super_admin role.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2?target=denonext";
import { z } from "https://esm.sh/zod@3.23.8?target=denonext";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const RequestSchema = z.object({
  audit_id: z.string().uuid(),
  outcome: z.enum(["acceptable", "needs_followup", "coaching_issued"]),
  note: z.string().trim().max(2000).optional(),
});

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json", Allow: "POST, OPTIONS" },
    });
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response(JSON.stringify({ error: "Missing Authorization header" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const userClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? "",
    { global: { headers: { Authorization: authHeader } }, auth: { persistSession: false } },
  );
  const { data: { user }, error: authErr } = await userClient.auth.getUser();
  if (authErr || !user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const admin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } },
  );

  // EKRA oversight is a separation-of-duties surface: resolving a flagged
  // concierge introduction must be done by super_admin/manager, NOT the advisor
  // whose introduction was flagged. The prior gate accepted any user_roles
  // 'admin' row, which create-admin-user grants to EVERY tier (incl. advisor /
  // customer_rep) — so an advisor could self-clear their own compliance flags.
  // Gate on the granular admin_user_profiles tier instead.
  const { data: adminProfile } = await admin
    .from("admin_user_profiles")
    .select("admin_role, status")
    .eq("user_id", user.id)
    .maybeSingle();
  const canModerate = !!adminProfile
    && adminProfile.status === "active"
    && ["super_admin", "manager"].includes(adminProfile.admin_role);
  if (!canModerate) {
    return new Response(JSON.stringify({ error: "Super-admin or manager role required" }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let body: unknown;
  try { body = await req.json(); }
  catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const parsed = RequestSchema.safeParse(body);
  if (!parsed.success) {
    return new Response(
      JSON.stringify({ error: "Validation failed", issues: parsed.error.issues }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const { data: updatedRows, error: updateErr } = await admin
    .from("concierge_introduction_audit")
    .update({
      reviewed_at: new Date().toISOString(),
      reviewed_by: user.id,
      review_outcome: parsed.data.outcome,
      review_note: parsed.data.note ?? null,
    })
    .eq("id", parsed.data.audit_id)
    .select("id");

  if (updateErr) {
    console.error("[audit-review-mark-resolved] update failed", updateErr);
    return new Response(JSON.stringify({ error: "Failed to mark as resolved" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  // 0-row detection: don't report success when the audit_id doesn't exist
  // (or was filtered out) — otherwise a flagged row appears "resolved" with
  // nothing changed.
  if (!updatedRows || updatedRows.length === 0) {
    return new Response(JSON.stringify({ error: "Audit record not found" }), {
      status: 404,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
