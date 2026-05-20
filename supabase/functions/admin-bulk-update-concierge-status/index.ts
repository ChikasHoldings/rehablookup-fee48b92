/**
 * admin-bulk-update-concierge-status — admin-only action to update
 * the `status` column on multiple concierge_inquiries (placement
 * cases) in one operation.
 *
 * Mirrors admin-bulk-update-lead-status / admin-bulk-update-ivr-status:
 *   1. JWT + has_role admin gate
 *   2. Status whitelist enforced against the canonical placement
 *      state-machine values
 *   3. 100-row cap, UUID-array validation
 *   4. Per-row loop preserves trigger / RLS behaviour
 *   5. Skips no-ops as `skipped` (not errored)
 *   6. Stamps `matched_at` / `placement_confirmed_at` / `closed_at`
 *      when transitioning into the relevant status — mirrors what
 *      the single-action paths do
 *   7. Per-row admin_audit_log + concierge_case_events entries
 *      (timeline parity with the single-action paths)
 *   8. Returns partial-success summary
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2?target=denonext";

const VERSION = "1.0.0";
const MAX_PER_REQUEST = 100;

// Canonical placement state-machine. Matches placementPipelineConfig +
// existing status transitions on concierge_inquiries.
const VALID_STATUSES = new Set([
  "intake_submitted",
  "matched",
  "provider_prequalification",
  "intros_sent",
  "seeker_confirmed",
  "placed",
  "completed",
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

    let body: { inquiryIds?: unknown; newStatus?: unknown; reason?: unknown };
    try { body = await req.json(); } catch { return json(400, { error: "Invalid JSON", code: "invalid_json" }); }

    const inquiryIds = body.inquiryIds;
    const newStatus = body.newStatus;
    const reason = typeof body.reason === "string" ? body.reason.trim().slice(0, 500) : null;

    if (!Array.isArray(inquiryIds) || inquiryIds.length === 0) {
      return json(400, { error: "inquiryIds[] is required", code: "invalid_inquiry_ids" });
    }
    if (inquiryIds.length > MAX_PER_REQUEST) {
      return json(400, {
        error: `Cannot update more than ${MAX_PER_REQUEST} cases at once`,
        code: "batch_too_large",
      });
    }
    if (typeof newStatus !== "string" || !VALID_STATUSES.has(newStatus)) {
      return json(400, {
        error: `newStatus must be one of: ${Array.from(VALID_STATUSES).join(", ")}`,
        code: "invalid_status",
      });
    }
    for (const id of inquiryIds) {
      if (typeof id !== "string" || !UUID_REGEX.test(id)) {
        return json(400, { error: `Invalid inquiry ID: ${String(id).slice(0, 40)}`, code: "invalid_inquiry_id" });
      }
    }

    // Load current state so we can skip no-ops + diff for audit
    const { data: current, error: loadErr } = await adminClient
      .from("concierge_inquiries")
      .select("id, status, user_name, assigned_advisor_id, matched_at, placement_confirmed_at, closed_at")
      .in("id", inquiryIds as string[]);
    if (loadErr) return json(500, { error: "Failed to load cases", code: "lookup_failed" });
    const currentMap = new Map(current?.map((r) => [r.id, r]) ?? []);

    const results: Array<{ id: string; status: "updated" | "skipped" | "error"; reason?: string }> = [];
    const now = new Date().toISOString();

    for (const id of inquiryIds as string[]) {
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
      // Stamp the matching timestamp when transitioning INTO that
      // milestone — mirrors what the single-row paths do so list
      // sorts + dashboards stay accurate.
      if (newStatus === "matched" && !row.matched_at) {
        update.matched_at = now;
      }
      if (newStatus === "placed" && !row.placement_confirmed_at) {
        update.placement_confirmed = true;
        update.placement_confirmed_at = now;
      }
      if ((newStatus === "closed" || newStatus === "completed") && !row.closed_at) {
        update.closed_at = now;
      }

      const { error: updateErr } = await adminClient
        .from("concierge_inquiries")
        .update(update)
        .eq("id", id);
      if (updateErr) {
        results.push({ id, status: "error", reason: updateErr.message });
        continue;
      }

      // admin_audit_log row (matches single-row update path)
      await adminClient.from("admin_audit_log").insert({
        admin_user_id: user.id,
        action_type: "concierge_bulk_status_update",
        target_type: "concierge_inquiry",
        target_id: id,
        details: {
          previous_status: row.status,
          new_status: newStatus,
          user_name: row.user_name,
          bulk_operation: true,
          batch_size: inquiryIds.length,
          reason,
        },
      });

      // Timeline event so the case Timeline tab reflects the bulk
      // change — matches the pattern submit-concierge-intake uses for
      // case_created.
      await adminClient.from("concierge_case_events").insert({
        inquiry_id: id,
        event_type: "status_changed",
        event_data: {
          from_status: row.status,
          to_status: newStatus,
          trigger: "admin_bulk_update",
          bulk_operation: true,
          batch_size: inquiryIds.length,
          reason,
        },
        actor_type: "admin",
        actor_id: user.id,
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
    console.error(`[admin-bulk-update-concierge-status] error`, err);
    return json(500, { error: "Internal server error", code: "internal_error" });
  }
});
