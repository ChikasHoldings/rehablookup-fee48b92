// signup-rollback-cleanup
// ────────────────────────
// Deletes the CALLER'S own auth user + profile after a partial signup
// (i.e. auth user + profile created, but facility INSERT failed). This
// frees up the email so the user can re-attempt signup with the same
// address — without admin intervention and without the orphaned-account
// support ticket the prior code created.
//
// Auth model: caller-authenticated (NOT admin-only). The caller must
// present their own JWT. We verify they are the owner of the user-id
// they're asking us to delete, then run service-role deletes scoped
// to their id only. Service-role usage is internal — the caller
// cannot tell us "delete user X" for any other X.
//
// Safety guards:
//   • The caller must NOT have any facility row already (i.e. signup
//     truly was partial). If they have a facility, we refuse — that
//     means signup actually completed and they shouldn't be calling
//     this. This prevents a logged-in provider from accidentally
//     nuking their own account by hitting this endpoint.
//   • The caller must have been created within the last hour. Older
//     accounts are out of scope for "signup rollback" — those are
//     real accounts and should go through admin-delete-provider.
//
// Returns 200 + { ok: true } on success, 4xx with a clear error code
// otherwise. The client side reads the code and decides whether to
// prompt the user to retry signup or contact support.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2?target=denonext";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ROLLBACK_WINDOW_MS = 60 * 60 * 1000; // 1 hour

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") {
    return jsonResponse({ error: "method_not_allowed" }, 405);
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return jsonResponse({ error: "missing_auth" }, 401);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !anonKey || !serviceKey) {
    return jsonResponse({ error: "server_misconfigured" }, 500);
  }

  // 1. Verify the JWT and capture the caller's user_id. Anything else
  //    we do is scoped to this id; the caller can never reach another
  //    user's data through this endpoint.
  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userData, error: userErr } = await userClient.auth.getUser();
  if (userErr || !userData.user?.id) {
    return jsonResponse({ error: "unauthorized" }, 401);
  }
  const userId = userData.user.id;
  const createdAt = userData.user.created_at;

  // 2. Window check — only rollback recent signups. Real accounts that
  //    have been around for hours/days should not be deletable through
  //    this endpoint.
  if (createdAt) {
    const ageMs = Date.now() - new Date(createdAt).getTime();
    if (ageMs > ROLLBACK_WINDOW_MS) {
      return jsonResponse(
        { error: "outside_rollback_window", message: "Account is older than 1 hour; use account settings to delete." },
        403,
      );
    }
  }

  const admin = createClient(supabaseUrl, serviceKey);

  // 3. Refusal guard — if the caller already owns a facility, signup
  //    succeeded; this is not the right endpoint. Prevents accidental
  //    self-nuke.
  const { count: facilityCount, error: countErr } = await admin
    .from("facilities")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);
  if (countErr) {
    console.error("[signup-rollback-cleanup] facility count failed", countErr);
    return jsonResponse({ error: "lookup_failed" }, 500);
  }
  if ((facilityCount ?? 0) > 0) {
    return jsonResponse(
      { error: "facility_exists", message: "Account already has a facility — signup completed; cleanup refused." },
      409,
    );
  }

  // 4. Delete profile row (anything dependent cascades via FK or is
  //    individually irrelevant for a facility-less account). Errors
  //    here are warnings, not fatal — the auth user delete below is
  //    what really frees the email.
  const { error: profileErr } = await admin.from("profiles").delete().eq("id", userId);
  if (profileErr) {
    console.warn("[signup-rollback-cleanup] profile delete failed (non-fatal)", profileErr);
  }

  // 5. Delete the auth user — this is what releases the email.
  const { error: deleteErr } = await admin.auth.admin.deleteUser(userId);
  if (deleteErr) {
    console.error("[signup-rollback-cleanup] auth user delete failed", deleteErr);
    return jsonResponse({ error: "delete_failed", message: deleteErr.message }, 500);
  }

  console.log(`[signup-rollback-cleanup] rolled back partial signup for user ${userId.slice(0, 8)}…`);
  return jsonResponse({ ok: true });
});
