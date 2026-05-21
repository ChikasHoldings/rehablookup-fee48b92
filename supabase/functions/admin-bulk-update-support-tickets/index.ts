/**
 * admin-bulk-update-support-tickets — admin-only bulk action on
 * support_tickets. One action per call:
 *   - update_status     newStatus ∈ new|open|in_progress|resolved|closed
 *   - update_priority   newPriority ∈ low|normal|high|urgent
 *   - assign            assigneeId (uuid | null for unassign)
 *   - delete            (also deletes child support_ticket_notes)
 *
 * Mirrors admin-bulk-update-concierge-status / admin-bulk-ban-seekers:
 *   1. JWT + has_role admin gate
 *   2. Action whitelist; per-action payload validation
 *   3. 100-row cap, UUID-array validation
 *   4. Skips no-ops as `skipped`, not `errored`
 *   5. Stamps assigned_at / resolved_at + auto-promotes new→open on
 *      first assignment (mirrors single-action useAssignSupportTicket)
 *   6. Per-row admin_audit_log entry — destructive ops + assignments
 *      surface in /admin/audit-log
 *   7. Returns partial-success summary
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2?target=denonext";

const VERSION = "1.0.0";
const MAX_PER_REQUEST = 100;

type ActionType = "update_status" | "update_priority" | "assign" | "delete";

const VALID_STATUSES = new Set(["new", "open", "in_progress", "resolved", "closed"]);
const VALID_PRIORITIES = new Set(["low", "normal", "high", "urgent"]);

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

    let body: {
      ticketIds?: unknown;
      action?: unknown;
      newStatus?: unknown;
      newPriority?: unknown;
      assigneeId?: unknown;
      reason?: unknown;
    };
    try { body = await req.json(); } catch { return json(400, { error: "Invalid JSON", code: "invalid_json" }); }

    const ticketIds = body.ticketIds;
    const action = body.action;
    const reason = typeof body.reason === "string" ? body.reason.trim().slice(0, 500) : null;

    // Common validation
    if (!Array.isArray(ticketIds) || ticketIds.length === 0) {
      return json(400, { error: "ticketIds[] is required", code: "invalid_ticket_ids" });
    }
    if (ticketIds.length > MAX_PER_REQUEST) {
      return json(400, {
        error: `Cannot process more than ${MAX_PER_REQUEST} tickets at once`,
        code: "batch_too_large",
      });
    }
    for (const id of ticketIds) {
      if (typeof id !== "string" || !UUID_REGEX.test(id)) {
        return json(400, { error: `Invalid ticket ID: ${String(id).slice(0, 40)}`, code: "invalid_ticket_id" });
      }
    }
    if (typeof action !== "string") {
      return json(400, { error: "action is required", code: "invalid_action" });
    }
    if (!["update_status", "update_priority", "assign", "delete"].includes(action)) {
      return json(400, { error: `Unknown action: ${action}`, code: "invalid_action" });
    }
    const typedAction = action as ActionType;

    // Action-specific validation
    let newStatus: string | null = null;
    let newPriority: string | null = null;
    let assigneeId: string | null = null;

    if (typedAction === "update_status") {
      newStatus = typeof body.newStatus === "string" ? body.newStatus : "";
      if (!VALID_STATUSES.has(newStatus)) {
        return json(400, {
          error: `newStatus must be one of: ${Array.from(VALID_STATUSES).join(", ")}`,
          code: "invalid_status",
        });
      }
    } else if (typedAction === "update_priority") {
      newPriority = typeof body.newPriority === "string" ? body.newPriority : "";
      if (!VALID_PRIORITIES.has(newPriority)) {
        return json(400, {
          error: `newPriority must be one of: ${Array.from(VALID_PRIORITIES).join(", ")}`,
          code: "invalid_priority",
        });
      }
    } else if (typedAction === "assign") {
      const rawAssignee = body.assigneeId;
      if (rawAssignee === null || rawAssignee === "") {
        assigneeId = null; // unassign
      } else if (typeof rawAssignee === "string" && UUID_REGEX.test(rawAssignee)) {
        assigneeId = rawAssignee;
      } else {
        return json(400, { error: "assigneeId must be a UUID or null", code: "invalid_assignee_id" });
      }
      // Verify assignee is an active admin if specified
      if (assigneeId) {
        const { data: assigneeProfile, error: assigneeErr } = await adminClient
          .from("admin_user_profiles")
          .select("user_id, status")
          .eq("user_id", assigneeId)
          .maybeSingle();
        if (assigneeErr) return json(500, { error: "Assignee lookup failed", code: "assignee_lookup_failed" });
        if (!assigneeProfile) return json(404, { error: "Assignee not found", code: "assignee_not_found" });
        if (assigneeProfile.status !== "active") {
          return json(409, { error: `Assignee is ${assigneeProfile.status}, not active`, code: "assignee_not_active" });
        }
      }
    }

    // Load current ticket state so we can skip no-ops + diff for audit
    const { data: current, error: loadErr } = await adminClient
      .from("support_tickets")
      .select("id, status, priority, assigned_to, subject, sender_email, source")
      .in("id", ticketIds as string[]);
    if (loadErr) return json(500, { error: "Failed to load tickets", code: "lookup_failed" });
    const currentMap = new Map(current?.map((r) => [r.id, r]) ?? []);

    const results: Array<{ id: string; status: "ok" | "skipped" | "error"; reason?: string }> = [];
    const now = new Date().toISOString();

    for (const id of ticketIds as string[]) {
      const row = currentMap.get(id);
      if (!row) {
        results.push({ id, status: "error", reason: "not_found" });
        continue;
      }

      try {
        if (typedAction === "delete") {
          // Cascade: notes first, then ticket. Use a try block so an
          // orphan-note insert won't be left if the ticket delete fails.
          const { error: notesErr } = await adminClient
            .from("support_ticket_notes")
            .delete()
            .eq("ticket_id", id);
          if (notesErr) throw new Error(`Notes delete failed: ${notesErr.message}`);

          const { error: deleteErr } = await adminClient
            .from("support_tickets")
            .delete()
            .eq("id", id);
          if (deleteErr) throw new Error(`Ticket delete failed: ${deleteErr.message}`);

          await adminClient.from("admin_audit_log").insert({
            admin_user_id: user.id,
            action_type: "support_ticket_bulk_deleted",
            target_type: "support_ticket",
            target_id: id,
            details: {
              subject: row.subject,
              source: row.source,
              status_before_delete: row.status,
              sender_email: row.sender_email,
              bulk_operation: true,
              batch_size: ticketIds.length,
              reason,
            },
          });

          results.push({ id, status: "ok" });
          continue;
        }

        const update: Record<string, unknown> = { updated_at: now };
        let auditAction: string;
        let auditDetails: Record<string, unknown>;

        if (typedAction === "update_status") {
          if (row.status === newStatus) {
            results.push({ id, status: "skipped", reason: "already_in_target_status" });
            continue;
          }
          update.status = newStatus;
          if (newStatus === "resolved" && row.status !== "resolved") {
            update.resolved_at = now;
            update.resolved_by = user.id;
          }
          auditAction = "support_ticket_bulk_status_update";
          auditDetails = { previous_status: row.status, new_status: newStatus };
        } else if (typedAction === "update_priority") {
          if (row.priority === newPriority) {
            results.push({ id, status: "skipped", reason: "already_in_target_priority" });
            continue;
          }
          update.priority = newPriority;
          auditAction = "support_ticket_bulk_priority_update";
          auditDetails = { previous_priority: row.priority, new_priority: newPriority };
        } else {
          // assign
          if (row.assigned_to === assigneeId) {
            results.push({ id, status: "skipped", reason: "already_assigned_to_target" });
            continue;
          }
          update.assigned_to = assigneeId;
          update.assigned_at = assigneeId ? now : null;
          update.assigned_by = assigneeId ? user.id : null;
          // Auto-promote: assigning to a "new" ticket bumps it to "open"
          if (assigneeId && row.status === "new") {
            update.status = "open";
          }
          auditAction = "support_ticket_bulk_assigned";
          auditDetails = { from_assignee_id: row.assigned_to, to_assignee_id: assigneeId };
        }

        const { error: updateErr } = await adminClient
          .from("support_tickets")
          .update(update)
          .eq("id", id);
        if (updateErr) throw new Error(updateErr.message);

        await adminClient.from("admin_audit_log").insert({
          admin_user_id: user.id,
          action_type: auditAction,
          target_type: "support_ticket",
          target_id: id,
          details: {
            ...auditDetails,
            subject: row.subject,
            sender_email: row.sender_email,
            bulk_operation: true,
            batch_size: ticketIds.length,
            reason,
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
    console.error(`[admin-bulk-update-support-tickets] error`, err);
    return json(500, { error: "Internal server error", code: "internal_error" });
  }
});
