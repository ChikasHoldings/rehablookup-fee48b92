/**
 * admin-bulk-update-ivr-status — admin-only action to update the
 * status of multiple insurance verification requests at once.
 *
 * Mirrors admin-bulk-update-lead-status — same pattern:
 *   1. JWT + has_role admin gate
 *   2. Status whitelist enforced (new, in_progress, verified,
 *      no_coverage, unable_to_verify, closed)
 *   3. 100-request cap, UUID-array validation
 *   4. Per-request loop preserves trigger/RLS behaviour
 *   5. Skips no-ops (already in target status) as skipped
 *   6. Stamps verified_at + verified_by when newStatus='verified'
 *      so the existing verified-at queries in the seeker dashboard
 *      surface the row immediately
 *   7. Per-request admin_audit_log row with before/after status
 *      + optional reason
 *   8. Returns partial-success summary
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2?target=denonext";

const VERSION = "1.0.0";
const MAX_PER_REQUEST = 100;

const VALID_STATUSES = new Set([
  "new",
  "in_progress",
  "verified",
  "no_coverage",
  "unable_to_verify",
  "closed",
]);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function json(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json(405, { error: "Use POST", code: "method_not_allowed" });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json(401, { error: "Unauthorized", code: "auth_missing" });

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    const { data: { user }, error: userErr } = await userClient.auth.getUser();
    if (userErr || !user) return json(401, { error: "Invalid auth", code: "auth_invalid" });

    const { data: isAdmin } = await userClient.rpc("has_role", {
      _user_id: user.id,
      _role: "admin",
    });
    if (!isAdmin) return json(403, { error: "Admin role required", code: "forbidden" });

    let body: { requestIds?: unknown; newStatus?: unknown; reason?: unknown };
    try { body = await req.json(); } catch { return json(400, { error: "Invalid JSON", code: "invalid_json" }); }

    const requestIds = body.requestIds;
    const newStatus = body.newStatus;
    const reason = typeof body.reason === "string" ? body.reason.trim().slice(0, 500) : null;

    if (!Array.isArray(requestIds) || requestIds.length === 0) {
      return json(400, { error: "requestIds[] is required", code: "invalid_request_ids" });
    }
    if (requestIds.length > MAX_PER_REQUEST) {
      return json(400, {
        error: `Cannot update more than ${MAX_PER_REQUEST} requests at once`,
        code: "batch_too_large",
      });
    }
    if (typeof newStatus !== "string" || !VALID_STATUSES.has(newStatus)) {
      return json(400, {
        error: `newStatus must be one of: ${Array.from(VALID_STATUSES).join(", ")}`,
        code: "invalid_status",
      });
    }
    for (const id of requestIds) {
      if (typeof id !== "string" || !UUID_REGEX.test(id)) {
        return json(400, { error: `Invalid request ID: ${String(id).slice(0, 40)}`, code: "invalid_request_id" });
      }
    }

    const { data: current, error: loadErr } = await adminClient
      .from("insurance_verification_requests")
      .select("id, status")
      .in("id", requestIds as string[]);
    if (loadErr) return json(500, { error: "Failed to load requests", code: "lookup_failed" });
    const currentMap = new Map(current?.map((r) => [r.id, r]) ?? []);

    const results: Array<{ id: string; status: "updated" | "skipped" | "error"; reason?: string }> = [];
    const now = new Date().toISOString();

    for (const id of requestIds as string[]) {
      const row = currentMap.get(id);
      if (!row) {
        results.push({ id, status: "error", reason: "not_found" });
        continue;
      }
      if (row.status === newStatus) {
        results.push({ id, status: "skipped", reason: "already_in_target_status" });
        continue;
      }

      const update: Record<string, unknown> = {
        status: newStatus,
        updated_at: now,
      };
      // Stamp verified_at + verified_by when bulk-marking verified
      // (matches the single-update modal path).
      if (newStatus === "verified") {
        update.verified_at = now;
        update.verified_by = user.id;
      }
      // Stamp assigned_admin_id when first moving to in_progress
      // (so an admin owns the case without a separate assignment step).
      if (newStatus === "in_progress") {
        update.assigned_admin_id = user.id;
      }

      const { error: updateErr } = await adminClient
        .from("insurance_verification_requests")
        .update(update)
        .eq("id", id);
      if (updateErr) {
        results.push({ id, status: "error", reason: updateErr.message });
        continue;
      }

      await adminClient.from("admin_audit_log").insert({
        admin_user_id: user.id,
        action_type: "ivr_bulk_status_update",
        target_type: "insurance_verification_request",
        target_id: id,
        details: {
          previous_status: row.status,
          new_status: newStatus,
          bulk_operation: true,
          batch_size: requestIds.length,
          reason,
        },
      });

      results.push({ id, status: "updated" });
    }

    const updated = results.filter((r) => r.status === "updated").length;
    const skipped = results.filter((r) => r.status === "skipped").length;
    const errored = results.filter((r) => r.status === "error").length;

    return json(200, {
      success: true,
      updated,
      skipped,
      errored,
      results,
      _version: VERSION,
    });
  } catch (err) {
    console.error(`[admin-bulk-update-ivr-status] error`, err);
    return json(500, { error: "Internal server error", code: "internal_error" });
  }
});
