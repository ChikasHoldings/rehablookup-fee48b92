/**
 * admin-bulk-update-lead-status — admin-only action to update the
 * `status` column on multiple leads in a single operation.
 *
 * What it does:
 *   1. Verifies the caller is admin (JWT + has_role check)
 *   2. Validates inputs:
 *      - leadIds[] (1..100)
 *      - newStatus IN ('new','contacted','responding','converted','closed','expired')
 *   3. Loads current status per lead so transition guards can reject
 *      already-converged rows (no-op skips don't error, they report)
 *   4. Per-lead loop: updates `status` (and `lead_expired_at` when
 *      newStatus='expired') + writes per-lead admin_audit_log entry
 *   5. Returns partial-success summary mirroring the bulk-reassign
 *      response shape so the UI can use one toast helper
 *
 * The per-lead loop keeps each row's triggers/RLS/FK behaviour
 * authentic and gives ops granular auditability, identical to the
 * pattern in admin-bulk-reassign-leads.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2?target=denonext";

const VERSION = "1.0.0";
const MAX_LEADS_PER_REQUEST = 100;

const VALID_STATUSES = new Set([
  "new",
  "contacted",
  "responding",
  "converted",
  "closed",
  "expired",
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

    let body: { leadIds?: unknown; newStatus?: unknown; reason?: unknown };
    try { body = await req.json(); } catch { return json(400, { error: "Invalid JSON", code: "invalid_json" }); }

    const leadIds = body.leadIds;
    const newStatus = body.newStatus;
    const reason = typeof body.reason === "string" ? body.reason.trim().slice(0, 500) : null;

    if (!Array.isArray(leadIds) || leadIds.length === 0) {
      return json(400, { error: "leadIds[] is required", code: "invalid_lead_ids" });
    }
    if (leadIds.length > MAX_LEADS_PER_REQUEST) {
      return json(400, {
        error: `Cannot update more than ${MAX_LEADS_PER_REQUEST} leads at once`,
        code: "batch_too_large",
      });
    }
    if (typeof newStatus !== "string" || !VALID_STATUSES.has(newStatus)) {
      return json(400, {
        error: `newStatus must be one of: ${Array.from(VALID_STATUSES).join(", ")}`,
        code: "invalid_status",
      });
    }
    for (const id of leadIds) {
      if (typeof id !== "string" || !UUID_REGEX.test(id)) {
        return json(400, { error: `Invalid lead ID: ${String(id).slice(0, 40)}`, code: "invalid_lead_id" });
      }
    }

    // Load current state so we can skip no-ops + write before/after to audit log
    const { data: currentLeads, error: loadErr } = await adminClient
      .from("leads")
      .select("id, status, facility_id")
      .in("id", leadIds as string[]);
    if (loadErr) return json(500, { error: "Failed to load leads", code: "lead_lookup_failed" });
    const currentMap = new Map(currentLeads?.map((l) => [l.id, l]) ?? []);

    const results: Array<{ id: string; status: "updated" | "skipped" | "error"; reason?: string }> = [];
    const now = new Date().toISOString();

    for (const leadId of leadIds as string[]) {
      const current = currentMap.get(leadId);
      if (!current) {
        results.push({ id: leadId, status: "error", reason: "lead_not_found" });
        continue;
      }
      if (current.status === newStatus) {
        results.push({ id: leadId, status: "skipped", reason: "already_in_target_status" });
        continue;
      }

      const update: Record<string, unknown> = {
        status: newStatus,
        updated_at: now,
      };
      // When marking expired, also stamp lead_expired_at so the
      // existing expired-leads indexes + SLA queries work correctly.
      if (newStatus === "expired") {
        update.lead_expired_at = now;
      }

      const { error: updateErr } = await adminClient
        .from("leads")
        .update(update)
        .eq("id", leadId);
      if (updateErr) {
        results.push({ id: leadId, status: "error", reason: updateErr.message });
        continue;
      }

      // Per-lead audit row matches the per-row trail discipline used
      // throughout admin-* edge functions.
      await adminClient.from("admin_audit_log").insert({
        admin_user_id: user.id,
        action_type: "lead_bulk_status_update",
        target_type: "lead",
        target_id: leadId,
        details: {
          previous_status: current.status,
          new_status: newStatus,
          facility_id: current.facility_id,
          bulk_operation: true,
          batch_size: leadIds.length,
          reason,
        },
      });

      results.push({ id: leadId, status: "updated" });
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
    console.error(`[admin-bulk-update-lead-status] error`, err);
    return json(500, { error: "Internal server error", code: "internal_error" });
  }
});
