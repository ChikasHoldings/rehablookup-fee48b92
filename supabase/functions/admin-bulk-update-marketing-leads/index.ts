/**
 * admin-bulk-update-marketing-leads — admin-only bulk action on
 * marketing_leads. Actions:
 *   - update_status      newStatus ∈ new|contacted|converted|lost
 *   - mark_converted     converted_to_concierge=true; stamps converted_at; status=converted
 *   - send_followup      invokes send-marketing-followup per lead
 *                        (fan-out behind the bulk dispatcher)
 *   - delete             permanent removal
 *
 * Mirrors admin-bulk-update-support-tickets / admin-bulk-update-escalations:
 *   1. JWT + has_role admin gate
 *   2. Defense-in-depth: super_admin + manager only; delete is super_admin only
 *   3. 100-row cap, UUID-array validation
 *   4. Skips no-ops as `skipped`
 *   5. Per-row admin_audit_log entry
 *   6. Optional reason field (audit-logged)
 *   7. Returns partial-success summary
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2?target=denonext";

const VERSION = "1.0.0";
const MAX_PER_REQUEST = 100;

const VALID_STATUSES = new Set(["new", "contacted", "converted", "lost"]);
const VALID_ACTIONS = new Set(["update_status", "mark_converted", "send_followup", "delete"]);

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

    const { data: adminProfile, error: profileErr } = await adminClient
      .from("admin_user_profiles")
      .select("admin_role")
      .eq("user_id", user.id)
      .maybeSingle();
    if (profileErr) return json(500, { error: "Admin role lookup failed", code: "role_lookup_failed" });
    const adminRole = adminProfile?.admin_role || "customer_rep";
    if (adminRole !== "super_admin" && adminRole !== "manager") {
      return json(403, {
        error: "Only managers and super admins may bulk-update marketing leads",
        code: "moderator_role_required",
      });
    }

    let body: {
      leadIds?: unknown;
      action?: unknown;
      newStatus?: unknown;
      reason?: unknown;
    };
    try { body = await req.json(); } catch { return json(400, { error: "Invalid JSON", code: "invalid_json" }); }

    const leadIds = body.leadIds;
    const action = body.action;
    const reason = typeof body.reason === "string" ? body.reason.trim().slice(0, 500) : null;

    if (!Array.isArray(leadIds) || leadIds.length === 0) {
      return json(400, { error: "leadIds[] is required", code: "invalid_lead_ids" });
    }
    if (leadIds.length > MAX_PER_REQUEST) {
      return json(400, {
        error: `Cannot process more than ${MAX_PER_REQUEST} leads at once`,
        code: "batch_too_large",
      });
    }
    for (const id of leadIds) {
      if (typeof id !== "string" || !UUID_REGEX.test(id)) {
        return json(400, { error: `Invalid lead ID: ${String(id).slice(0, 40)}`, code: "invalid_lead_id" });
      }
    }
    if (typeof action !== "string" || !VALID_ACTIONS.has(action)) {
      return json(400, { error: `action must be one of: ${Array.from(VALID_ACTIONS).join(", ")}`, code: "invalid_action" });
    }
    if (action === "delete" && adminRole !== "super_admin") {
      return json(403, {
        error: "Only super admins may bulk-delete marketing leads",
        code: "super_admin_required_for_delete",
      });
    }

    let newStatus: string | null = null;
    if (action === "update_status") {
      newStatus = typeof body.newStatus === "string" ? body.newStatus : "";
      if (!VALID_STATUSES.has(newStatus)) {
        return json(400, {
          error: `newStatus must be one of: ${Array.from(VALID_STATUSES).join(", ")}`,
          code: "invalid_status",
        });
      }
    }

    const { data: current, error: loadErr } = await adminClient
      .from("marketing_leads")
      .select("id, status, converted_to_concierge, email, first_name, last_name, followup_email_sent")
      .in("id", leadIds as string[]);
    if (loadErr) return json(500, { error: "Failed to load leads", code: "lookup_failed" });
    const currentMap = new Map(current?.map((r) => [r.id, r]) ?? []);

    const results: Array<{ id: string; status: "ok" | "skipped" | "error"; reason?: string }> = [];
    const now = new Date().toISOString();

    for (const id of leadIds as string[]) {
      const row = currentMap.get(id);
      if (!row) {
        results.push({ id, status: "error", reason: "not_found" });
        continue;
      }

      try {
        if (action === "delete") {
          const { error: deleteErr } = await adminClient
            .from("marketing_leads")
            .delete()
            .eq("id", id);
          if (deleteErr) throw new Error(`Delete failed: ${deleteErr.message}`);

          await adminClient.from("admin_audit_log").insert({
            admin_user_id: user.id,
            action_type: "marketing_lead_bulk_deleted",
            target_type: "marketing_lead",
            target_id: id,
            details: {
              email: row.email,
              name: `${row.first_name ?? ""} ${row.last_name ?? ""}`.trim(),
              status_before_delete: row.status,
              was_converted: row.converted_to_concierge,
              bulk_operation: true,
              batch_size: leadIds.length,
              reason,
            },
          });

          results.push({ id, status: "ok" });
          continue;
        }

        if (action === "send_followup") {
          if (row.followup_email_sent) {
            results.push({ id, status: "skipped", reason: "followup_already_sent" });
            continue;
          }
          // Delegate to send-marketing-followup. Per-row failures are
          // isolated — one bad lead doesn't abort the batch.
          const { data: notifData, error: notifyErr } = await adminClient.functions.invoke(
            "send-marketing-followup",
            { body: { manualLeadId: id } },
          );
          if (notifyErr) throw new Error(notifyErr.message);
          if (notifData && typeof notifData === "object" && "error" in notifData && (notifData as { error: unknown }).error) {
            throw new Error(String((notifData as { error: unknown }).error));
          }

          await adminClient.from("admin_audit_log").insert({
            admin_user_id: user.id,
            action_type: "marketing_lead_bulk_followup_sent",
            target_type: "marketing_lead",
            target_id: id,
            details: {
              email: row.email,
              name: `${row.first_name ?? ""} ${row.last_name ?? ""}`.trim(),
              bulk_operation: true,
              batch_size: leadIds.length,
              reason,
            },
          });

          results.push({ id, status: "ok" });
          continue;
        }

        const update: Record<string, unknown> = { updated_at: now };
        let auditAction: string;
        let auditDetails: Record<string, unknown>;

        if (action === "update_status") {
          if (row.status === newStatus) {
            results.push({ id, status: "skipped", reason: "already_in_target_status" });
            continue;
          }
          update.status = newStatus;
          auditAction = "marketing_lead_bulk_status_update";
          auditDetails = { previous_status: row.status, new_status: newStatus };
        } else {
          // mark_converted
          if (row.converted_to_concierge) {
            results.push({ id, status: "skipped", reason: "already_converted" });
            continue;
          }
          update.converted_to_concierge = true;
          update.converted_at = now;
          update.status = "converted";
          auditAction = "marketing_lead_bulk_converted";
          auditDetails = { previous_status: row.status };
        }

        const { error: updateErr } = await adminClient
          .from("marketing_leads")
          .update(update)
          .eq("id", id);
        if (updateErr) throw new Error(updateErr.message);

        await adminClient.from("admin_audit_log").insert({
          admin_user_id: user.id,
          action_type: auditAction,
          target_type: "marketing_lead",
          target_id: id,
          details: {
            ...auditDetails,
            email: row.email,
            name: `${row.first_name ?? ""} ${row.last_name ?? ""}`.trim(),
            bulk_operation: true,
            batch_size: leadIds.length,
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
    console.error(`[admin-bulk-update-marketing-leads] error`, err);
    return json(500, { error: "Internal server error", code: "internal_error" });
  }
});
