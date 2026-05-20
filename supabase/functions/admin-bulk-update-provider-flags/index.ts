/**
 * admin-bulk-update-provider-flags — admin-only action to toggle
 * boolean flags (suspended, verified, featured, concierge_network_opted_in)
 * on multiple facilities in one operation.
 *
 * Why this is separate from admin-bulk-update-provider-status:
 *   The status column drives a status-machine (pending→approved→…)
 *   with associated side-effects (claimed_at stamp). The boolean
 *   flags are independent toggles. Splitting the two keeps each
 *   function's responsibility tight and prevents accidental
 *   "change-status-AND-suspend-at-the-same-time" mistakes.
 *
 * Pattern matches admin-bulk-update-provider-status:
 *   1. JWT + can_moderate_users gate
 *   2. Field whitelist enforced
 *   3. 100-facility cap, UUID-array validation
 *   4. Per-facility loop with skip-no-op + audit log
 *   5. Returns partial-success summary
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2?target=denonext";

const VERSION = "1.0.0";
const MAX_PER_REQUEST = 100;

const VALID_FIELDS = new Set([
  "suspended",
  "verified",
  "featured",
  "concierge_network_opted_in",
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

    const { data: canModerate } = await userClient.rpc("can_moderate_users", {
      p_user_id: user.id,
    });
    if (!canModerate) return json(403, { error: "Moderator role required", code: "forbidden" });

    let body: { facilityIds?: unknown; field?: unknown; value?: unknown; reason?: unknown };
    try { body = await req.json(); } catch { return json(400, { error: "Invalid JSON", code: "invalid_json" }); }

    const facilityIds = body.facilityIds;
    const field = body.field;
    const value = body.value;
    const reason = typeof body.reason === "string" ? body.reason.trim().slice(0, 500) : null;

    if (!Array.isArray(facilityIds) || facilityIds.length === 0) {
      return json(400, { error: "facilityIds[] is required", code: "invalid_facility_ids" });
    }
    if (facilityIds.length > MAX_PER_REQUEST) {
      return json(400, {
        error: `Cannot update more than ${MAX_PER_REQUEST} facilities at once`,
        code: "batch_too_large",
      });
    }
    if (typeof field !== "string" || !VALID_FIELDS.has(field)) {
      return json(400, {
        error: `field must be one of: ${Array.from(VALID_FIELDS).join(", ")}`,
        code: "invalid_field",
      });
    }
    if (typeof value !== "boolean") {
      return json(400, { error: "value must be a boolean", code: "invalid_value" });
    }
    for (const id of facilityIds) {
      if (typeof id !== "string" || !UUID_REGEX.test(id)) {
        return json(400, { error: `Invalid facility ID: ${String(id).slice(0, 40)}`, code: "invalid_facility_id" });
      }
    }

    // Load only the field being changed so we can detect no-ops.
    const selectCols = `id, name, ${field}`;
    const { data: current, error: loadErr } = await adminClient
      .from("facilities")
      .select(selectCols)
      .in("id", facilityIds as string[]);
    if (loadErr) return json(500, { error: "Failed to load facilities", code: "lookup_failed" });
    const currentMap = new Map(
      (current as Array<Record<string, unknown>> | null)?.map((f) => [f.id as string, f]) ?? [],
    );

    const results: Array<{ id: string; status: "updated" | "skipped" | "error"; reason?: string }> = [];
    const now = new Date().toISOString();

    for (const id of facilityIds as string[]) {
      const facility = currentMap.get(id);
      if (!facility) {
        results.push({ id, status: "error", reason: "not_found" });
        continue;
      }
      if (facility[field] === value) {
        results.push({ id, status: "skipped", reason: "already_in_target_state" });
        continue;
      }

      const update: Record<string, unknown> = {
        [field]: value,
        updated_at: now,
      };

      const { error: updateErr } = await adminClient
        .from("facilities")
        .update(update)
        .eq("id", id);
      if (updateErr) {
        results.push({ id, status: "error", reason: updateErr.message });
        continue;
      }

      await adminClient.from("admin_audit_log").insert({
        admin_user_id: user.id,
        action_type: "provider_bulk_flag_update",
        target_type: "facility",
        target_id: id,
        details: {
          field,
          previous_value: facility[field] ?? null,
          new_value: value,
          facility_name: facility.name,
          bulk_operation: true,
          batch_size: facilityIds.length,
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
      field,
      value,
      updated,
      skipped,
      errored,
      results,
      _version: VERSION,
    });
  } catch (err) {
    console.error(`[admin-bulk-update-provider-flags] error`, err);
    return json(500, { error: "Internal server error", code: "internal_error" });
  }
});
