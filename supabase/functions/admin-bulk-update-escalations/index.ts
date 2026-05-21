/**
 * admin-bulk-update-escalations — admin-only bulk action on
 * admin_escalations. Actions:
 *   - update_status    newStatus ∈ open|in_progress|resolved|closed
 *   - update_priority  newPriority ∈ low|medium|high|critical
 *   - assign           assigneeId (uuid or null/empty for unassign)
 *   - delete           (super_admin only, also cascades any FK refs)
 *
 * Mirrors admin-bulk-update-support-tickets:
 *   1. JWT + has_role admin gate
 *   2. Defense-in-depth role tier check — only super_admin + manager
 *      may bulk-mutate escalations
 *   3. 100-row cap, UUID-array validation
 *   4. Client-side ALLOWED_TRANSITIONS map (same as
 *      src/hooks/useEscalationTransition) — rejects backwards hops
 *   5. Stamps resolved_at on resolved; clears it on reopen
 *   6. Auto-promote: assigning an "open" escalation bumps to in_progress
 *   7. Per-row admin_audit_log
 *   8. Returns partial-success summary
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2?target=denonext";

const VERSION = "1.0.0";
const MAX_PER_REQUEST = 100;

const VALID_STATUSES = new Set(["open", "in_progress", "resolved", "closed"]);
const VALID_PRIORITIES = new Set(["low", "medium", "high", "critical"]);

// Mirrors src/hooks/useEscalationTransition.ALLOWED_TRANSITIONS
const ALLOWED_TRANSITIONS: Record<string, Set<string>> = {
  open: new Set(["in_progress", "resolved", "closed"]),
  in_progress: new Set(["resolved", "closed", "open"]),
  resolved: new Set(["closed", "open"]),
  closed: new Set(["open"]),
};

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

    // Role-tier gate: bulk escalation ops are manager+super_admin only.
    const { data: adminProfile, error: profileErr } = await adminClient
      .from("admin_user_profiles")
      .select("admin_role")
      .eq("user_id", user.id)
      .maybeSingle();
    if (profileErr) return json(500, { error: "Admin role lookup failed", code: "role_lookup_failed" });
    const adminRole = adminProfile?.admin_role || "customer_rep";
    if (adminRole !== "super_admin" && adminRole !== "manager") {
      return json(403, {
        error: "Only managers and super admins may bulk-update escalations",
        code: "moderator_role_required",
      });
    }

    let body: {
      escalationIds?: unknown;
      action?: unknown;
      newStatus?: unknown;
      newPriority?: unknown;
      assigneeId?: unknown;
      resolutionNotes?: unknown;
      reason?: unknown;
    };
    try { body = await req.json(); } catch { return json(400, { error: "Invalid JSON", code: "invalid_json" }); }

    const escalationIds = body.escalationIds;
    const action = body.action;
    const reason = typeof body.reason === "string" ? body.reason.trim().slice(0, 500) : null;
    const resolutionNotes = typeof body.resolutionNotes === "string"
      ? body.resolutionNotes.trim().slice(0, 2000)
      : "";

    if (!Array.isArray(escalationIds) || escalationIds.length === 0) {
      return json(400, { error: "escalationIds[] is required", code: "invalid_escalation_ids" });
    }
    if (escalationIds.length > MAX_PER_REQUEST) {
      return json(400, {
        error: `Cannot process more than ${MAX_PER_REQUEST} escalations at once`,
        code: "batch_too_large",
      });
    }
    for (const id of escalationIds) {
      if (typeof id !== "string" || !UUID_REGEX.test(id)) {
        return json(400, { error: `Invalid escalation ID: ${String(id).slice(0, 40)}`, code: "invalid_escalation_id" });
      }
    }
    if (typeof action !== "string") {
      return json(400, { error: "action is required", code: "invalid_action" });
    }
    if (!["update_status", "update_priority", "assign", "delete"].includes(action)) {
      return json(400, { error: `Unknown action: ${action}`, code: "invalid_action" });
    }

    if (action === "delete" && adminRole !== "super_admin") {
      return json(403, {
        error: "Only super admins may bulk-delete escalations",
        code: "super_admin_required_for_delete",
      });
    }

    let newStatus: string | null = null;
    let newPriority: string | null = null;
    let assigneeId: string | null = null;

    if (action === "update_status") {
      newStatus = typeof body.newStatus === "string" ? body.newStatus : "";
      if (!VALID_STATUSES.has(newStatus)) {
        return json(400, {
          error: `newStatus must be one of: ${Array.from(VALID_STATUSES).join(", ")}`,
          code: "invalid_status",
        });
      }
    } else if (action === "update_priority") {
      newPriority = typeof body.newPriority === "string" ? body.newPriority : "";
      if (!VALID_PRIORITIES.has(newPriority)) {
        return json(400, {
          error: `newPriority must be one of: ${Array.from(VALID_PRIORITIES).join(", ")}`,
          code: "invalid_priority",
        });
      }
    } else if (action === "assign") {
      const rawAssignee = body.assigneeId;
      if (rawAssignee === null || rawAssignee === "") {
        assigneeId = null;
      } else if (typeof rawAssignee === "string" && UUID_REGEX.test(rawAssignee)) {
        assigneeId = rawAssignee;
      } else {
        return json(400, { error: "assigneeId must be a UUID or null", code: "invalid_assignee_id" });
      }
      // Verify assignee is an active manager/super_admin
      if (assigneeId) {
        const { data: assigneeProfile, error: assigneeErr } = await adminClient
          .from("admin_user_profiles")
          .select("user_id, admin_role, status")
          .eq("user_id", assigneeId)
          .maybeSingle();
        if (assigneeErr) return json(500, { error: "Assignee lookup failed", code: "assignee_lookup_failed" });
        if (!assigneeProfile) return json(404, { error: "Assignee not found", code: "assignee_not_found" });
        if (assigneeProfile.status !== "active") {
          return json(409, { error: `Assignee is ${assigneeProfile.status}, not active`, code: "assignee_not_active" });
        }
        if (assigneeProfile.admin_role !== "super_admin" && assigneeProfile.admin_role !== "manager") {
          return json(409, {
            error: `Assignee role is ${assigneeProfile.admin_role}, must be manager or super_admin`,
            code: "assignee_role_required",
          });
        }
      }
    }

    const { data: current, error: loadErr } = await adminClient
      .from("admin_escalations")
      .select("id, status, priority, assigned_to, subject")
      .in("id", escalationIds as string[]);
    if (loadErr) return json(500, { error: "Failed to load escalations", code: "lookup_failed" });
    const currentMap = new Map(current?.map((r) => [r.id, r]) ?? []);

    const results: Array<{ id: string; status: "ok" | "skipped" | "error"; reason?: string }> = [];
    const now = new Date().toISOString();

    for (const id of escalationIds as string[]) {
      const row = currentMap.get(id);
      if (!row) {
        results.push({ id, status: "error", reason: "not_found" });
        continue;
      }

      try {
        if (action === "delete") {
          // No child tables currently link to admin_escalations (no
          // FKs from notes / audit), so a straight delete is safe.
          const { error: deleteErr } = await adminClient
            .from("admin_escalations")
            .delete()
            .eq("id", id);
          if (deleteErr) throw new Error(`Delete failed: ${deleteErr.message}`);

          await adminClient.from("admin_audit_log").insert({
            admin_user_id: user.id,
            action_type: "escalation_bulk_deleted",
            target_type: "escalation",
            target_id: id,
            details: {
              subject: row.subject,
              status_before_delete: row.status,
              priority: row.priority,
              bulk_operation: true,
              batch_size: escalationIds.length,
              reason,
            },
          });

          results.push({ id, status: "ok" });
          continue;
        }

        const update: Record<string, unknown> = {};
        let auditAction: string;
        let auditDetails: Record<string, unknown>;

        if (action === "update_status") {
          if (row.status === newStatus) {
            results.push({ id, status: "skipped", reason: "already_in_target_status" });
            continue;
          }
          // Validate transition graph (mirrors client hook).
          const allowed = ALLOWED_TRANSITIONS[row.status];
          if (!allowed || !allowed.has(newStatus as string)) {
            results.push({
              id,
              status: "error",
              reason: `Cannot transition from "${row.status}" to "${newStatus}"`,
            });
            continue;
          }
          update.status = newStatus;
          if (newStatus === "resolved") {
            update.resolved_at = now;
          }
          if (newStatus === "open" || newStatus === "in_progress") {
            if (row.status === "resolved" || row.status === "closed") {
              update.resolved_at = null;
            }
          }
          auditAction = "escalation_bulk_status_update";
          auditDetails = { from_status: row.status, to_status: newStatus };
        } else if (action === "update_priority") {
          if (row.priority === newPriority) {
            results.push({ id, status: "skipped", reason: "already_at_target_priority" });
            continue;
          }
          update.priority = newPriority;
          auditAction = "escalation_bulk_priority_update";
          auditDetails = { from_priority: row.priority, to_priority: newPriority };
        } else {
          // assign
          if (row.assigned_to === assigneeId) {
            results.push({ id, status: "skipped", reason: "already_assigned_to_target" });
            continue;
          }
          update.assigned_to = assigneeId;
          // Auto-promote: assigning an "open" escalation moves it to in_progress
          if (assigneeId && row.status === "open") {
            update.status = "in_progress";
          }
          auditAction = "escalation_bulk_assigned";
          auditDetails = { from_assignee: row.assigned_to, to_assignee: assigneeId };
        }

        // Apply resolutionNotes only when transitioning to resolved
        if (action === "update_status" && newStatus === "resolved" && resolutionNotes) {
          update.resolution_notes = resolutionNotes;
        }

        const { error: updateErr } = await adminClient
          .from("admin_escalations")
          .update(update)
          .eq("id", id);
        if (updateErr) throw new Error(updateErr.message);

        await adminClient.from("admin_audit_log").insert({
          admin_user_id: user.id,
          action_type: auditAction,
          target_type: "escalation",
          target_id: id,
          details: {
            ...auditDetails,
            subject: row.subject,
            bulk_operation: true,
            batch_size: escalationIds.length,
            reason,
            ...(update.resolution_notes ? { resolution_notes: update.resolution_notes } : {}),
          },
        });

        results.push({ id, status: "ok" });
      } catch (err) {
        results.push({
          id,
          status: "error",
          reason: err instanceof Error ? err.message : String(err),
        });
      }
    }

    const succeeded = results.filter((r) => r.status === "ok").length;
    const skipped = results.filter((r) => r.status === "skipped").length;
    const errored = results.filter((r) => r.status === "error").length;

    return json(200, {
      success: true,
      action,
      succeeded,
      skipped,
      errored,
      results,
      _version: VERSION,
    });
  } catch (err) {
    console.error(`[admin-bulk-update-escalations] error`, err);
    return json(500, { error: "Internal server error", code: "internal_error" });
  }
});
