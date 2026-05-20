/**
 * admin-bulk-reassign-concierge-advisor — admin-only action to
 * reassign multiple concierge placement cases to a single target
 * advisor in one operation.
 *
 * Mirrors admin-bulk-reassign-leads:
 *   1. JWT + has_role admin gate
 *   2. Validates inputs: inquiryIds[] (1..100), targetAdvisorId (UUID),
 *      and that the target advisor is an active row in
 *      admin_user_profiles with admin_role='advisor'
 *   3. For each case: updates assigned_advisor_id, writes an
 *      admin_audit_log row AND a concierge_case_events row
 *      (timeline parity with the single-action path).
 *   4. Skips no-ops (already assigned to target) as `skipped`,
 *      not errored
 *   5. Returns per-case success/failure summary
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2?target=denonext";

const VERSION = "1.0.0";
const MAX_PER_REQUEST = 100;

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

    let body: { inquiryIds?: unknown; targetAdvisorId?: unknown; reason?: unknown };
    try { body = await req.json(); } catch { return json(400, { error: "Invalid JSON", code: "invalid_json" }); }

    const inquiryIds = body.inquiryIds;
    const targetAdvisorId = body.targetAdvisorId;
    const reason = typeof body.reason === "string" ? body.reason.trim().slice(0, 500) : null;

    if (!Array.isArray(inquiryIds) || inquiryIds.length === 0) {
      return json(400, { error: "inquiryIds[] is required", code: "invalid_inquiry_ids" });
    }
    if (inquiryIds.length > MAX_PER_REQUEST) {
      return json(400, {
        error: `Cannot reassign more than ${MAX_PER_REQUEST} cases at once`,
        code: "batch_too_large",
      });
    }
    if (typeof targetAdvisorId !== "string" || !UUID_REGEX.test(targetAdvisorId)) {
      return json(400, { error: "targetAdvisorId must be a valid UUID", code: "invalid_advisor_id" });
    }
    for (const id of inquiryIds) {
      if (typeof id !== "string" || !UUID_REGEX.test(id)) {
        return json(400, { error: `Invalid inquiry ID: ${String(id).slice(0, 40)}`, code: "invalid_inquiry_id" });
      }
    }

    // Verify target advisor exists + is an active advisor.
    // admin_user_profiles has display_name, first_name, last_name
    // (no full_name column — verified against information_schema
    // before deploy). We compose advisorDisplayName from whichever
    // columns are populated, falling back to user_id.
    const { data: targetAdvisor, error: advisorErr } = await adminClient
      .from("admin_user_profiles")
      .select("user_id, display_name, first_name, last_name, admin_role, status")
      .eq("user_id", targetAdvisorId)
      .maybeSingle();
    if (advisorErr) return json(500, { error: "Advisor lookup failed", code: "advisor_lookup_failed" });
    if (!targetAdvisor) return json(404, { error: "Target advisor not found", code: "advisor_not_found" });
    if (targetAdvisor.admin_role !== "advisor" && targetAdvisor.admin_role !== "super_admin" && targetAdvisor.admin_role !== "manager") {
      return json(409, {
        error: `Target user is not an advisor (role=${targetAdvisor.admin_role})`,
        code: "advisor_role_required",
      });
    }
    if (targetAdvisor.status !== "active") {
      return json(409, {
        error: `Target advisor is ${targetAdvisor.status}, not active`,
        code: "advisor_not_active",
      });
    }

    const advisorDisplayName: string =
      targetAdvisor.display_name ||
      [targetAdvisor.first_name, targetAdvisor.last_name].filter(Boolean).join(" ") ||
      targetAdvisor.user_id;

    // Load current state
    const { data: currentRows, error: loadErr } = await adminClient
      .from("concierge_inquiries")
      .select("id, status, assigned_advisor_id, user_name")
      .in("id", inquiryIds as string[]);
    if (loadErr) return json(500, { error: "Failed to load cases", code: "lookup_failed" });
    const currentMap = new Map(currentRows?.map((r) => [r.id, r]) ?? []);

    const results: Array<{ id: string; status: "reassigned" | "skipped" | "error"; reason?: string }> = [];
    const now = new Date().toISOString();

    for (const id of inquiryIds as string[]) {
      const row = currentMap.get(id);
      if (!row) {
        results.push({ id, status: "error", reason: "not_found" });
        continue;
      }
      if (row.assigned_advisor_id === targetAdvisorId) {
        results.push({ id, status: "skipped", reason: "already_assigned_to_target" });
        continue;
      }

      const { error: updateErr } = await adminClient
        .from("concierge_inquiries")
        .update({
          assigned_advisor_id: targetAdvisorId,
          updated_at: now,
        })
        .eq("id", id);
      if (updateErr) {
        results.push({ id, status: "error", reason: updateErr.message });
        continue;
      }

      await adminClient.from("admin_audit_log").insert({
        admin_user_id: user.id,
        action_type: "concierge_bulk_advisor_reassign",
        target_type: "concierge_inquiry",
        target_id: id,
        details: {
          from_advisor_id: row.assigned_advisor_id,
          to_advisor_id: targetAdvisorId,
          to_advisor_name: advisorDisplayName,
          user_name: row.user_name,
          bulk_operation: true,
          batch_size: inquiryIds.length,
          reason,
        },
      });

      await adminClient.from("concierge_case_events").insert({
        inquiry_id: id,
        event_type: "advisor_reassigned",
        event_data: {
          from_advisor_id: row.assigned_advisor_id,
          to_advisor_id: targetAdvisorId,
          to_advisor_name: advisorDisplayName,
          bulk_operation: true,
          batch_size: inquiryIds.length,
          reason,
        },
        actor_type: "admin",
        actor_id: user.id,
      });

      results.push({ id, status: "reassigned" });
    }

    const reassigned = results.filter((r) => r.status === "reassigned").length;
    const skipped = results.filter((r) => r.status === "skipped").length;
    const errored = results.filter((r) => r.status === "error").length;

    return json(200, {
      success: true,
      reassigned,
      skipped,
      errored,
      results,
      _version: VERSION,
    });
  } catch (err) {
    console.error(`[admin-bulk-reassign-concierge-advisor] error`, err);
    return json(500, { error: "Internal server error", code: "internal_error" });
  }
});
