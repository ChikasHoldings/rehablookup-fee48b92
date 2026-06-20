/**
 * admin-bulk-reassign-leads — admin-only action to reassign multiple
 * leads to a single target facility in one operation.
 *
 * What it does:
 *   1. Verifies the caller is admin
 *   2. Validates inputs: leadIds[] (1..100), targetFacilityId (UUID),
 *      and that the target facility exists + is approved
 *   3. For each lead: updates facility_id, stamps original_facility_id
 *      on first reassign, marks redistribution_status='redistributed',
 *      sets assigned_at=now()
 *   4. Writes ONE admin_audit_log row per lead so the per-row trail
 *      stays granular (matches the single-reassign path)
 *   5. Returns per-lead success/failure summary
 *
 * Updates run sequentially (not in a single SQL statement) so each
 * lead's per-row trigger / RLS / FK behaviour is preserved; the
 * function returns partial-success data on errors rather than
 * rolling everything back.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2?target=denonext";

const VERSION = "1.0.0";
const MAX_LEADS_PER_REQUEST = 100;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function json(status: number, body: Record<string, unknown>) {
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

    let body: { leadIds?: unknown; targetFacilityId?: unknown };
    try { body = await req.json(); } catch { return json(400, { error: "Invalid JSON", code: "invalid_json" }); }

    const leadIds = body.leadIds;
    const targetFacilityId = body.targetFacilityId;
    if (!Array.isArray(leadIds) || leadIds.length === 0) {
      return json(400, { error: "leadIds[] is required", code: "invalid_lead_ids" });
    }
    if (leadIds.length > MAX_LEADS_PER_REQUEST) {
      return json(400, {
        error: `Cannot reassign more than ${MAX_LEADS_PER_REQUEST} leads at once`,
        code: "batch_too_large",
      });
    }
    if (typeof targetFacilityId !== "string" || !UUID_REGEX.test(targetFacilityId)) {
      return json(400, { error: "targetFacilityId must be a valid UUID", code: "invalid_facility_id" });
    }
    for (const id of leadIds) {
      if (typeof id !== "string" || !UUID_REGEX.test(id)) {
        return json(400, { error: `Invalid lead ID: ${String(id).slice(0, 40)}`, code: "invalid_lead_id" });
      }
    }

    // Verify target facility exists + is approved
    const { data: targetFacility, error: facilityErr } = await adminClient
      .from("facilities")
      .select("id, name, status, user_id")
      .eq("id", targetFacilityId)
      .maybeSingle();
    if (facilityErr) return json(500, { error: "Facility lookup failed", code: "facility_lookup_failed" });
    if (!targetFacility) return json(404, { error: "Target facility not found", code: "facility_not_found" });
    if (targetFacility.status !== "approved") {
      return json(409, {
        error: `Target facility is ${targetFacility.status}, not approved`,
        code: "facility_not_approved",
      });
    }

    // Load current state of all leads (need original_facility_id +
    // current facility_id to decide whether to stamp original)
    const { data: currentLeads, error: loadErr } = await adminClient
      .from("leads")
      .select("id, facility_id, original_facility_id")
      .in("id", leadIds as string[]);
    if (loadErr) return json(500, { error: "Failed to load leads", code: "lead_lookup_failed" });
    const currentMap = new Map(currentLeads?.map((l) => [l.id, l]) ?? []);

    const results: Array<{ id: string; status: "reassigned" | "skipped" | "error"; reason?: string }> = [];
    const now = new Date().toISOString();

    for (const leadId of leadIds as string[]) {
      const current = currentMap.get(leadId);
      if (!current) {
        results.push({ id: leadId, status: "error", reason: "lead_not_found" });
        continue;
      }
      if (current.facility_id === targetFacilityId) {
        results.push({ id: leadId, status: "skipped", reason: "already_assigned_to_target" });
        continue;
      }

      // redistribution_status write removed 2026-05-21 — was a legacy
      // tag from the per-lead-sale era (used to mark leads as available
      // for resale to alternate facilities). Under the flat-fee model
      // we just track that the admin moved the lead via
      // assignment_status + the admin_audit_log row written below.
      const update: Record<string, unknown> = {
        facility_id: targetFacilityId,
        assignment_status: "reassigned",
        assigned_at: now,
        updated_at: now,
      };
      // Stamp original_facility_id only on first reassignment so the
      // historical record of the very first facility survives
      // subsequent moves.
      if (!current.original_facility_id && current.facility_id) {
        update.original_facility_id = current.facility_id;
      }

      const { error: updateErr } = await adminClient
        .from("leads")
        .update(update)
        .eq("id", leadId);
      if (updateErr) {
        results.push({ id: leadId, status: "error", reason: updateErr.message });
        continue;
      }

      // Per-lead audit log so the trail stays granular
      await adminClient.from("admin_audit_log").insert({
        admin_user_id: user.id,
        action_type: "lead_reassigned",
        target_type: "lead",
        target_id: leadId,
        details: {
          from_facility_id: current.facility_id,
          to_facility_id: targetFacilityId,
          to_facility_name: targetFacility.name,
          bulk_operation: true,
          batch_size: leadIds.length,
        },
      });

      results.push({ id: leadId, status: "reassigned" });
    }

    const reassigned = results.filter((r) => r.status === "reassigned").length;
    const skipped = results.filter((r) => r.status === "skipped").length;
    const errored = results.filter((r) => r.status === "error").length;

    // Notify the receiving facility's owner that leads were moved into their
    // queue — otherwise they appear silently with no signal. One summary
    // notification for the batch (direct insert via the service-role client;
    // create_provider_notification is admin-JWT-gated and can't be called with
    // the service role). Best-effort: the reassignments are already committed.
    if (reassigned > 0 && targetFacility.user_id) {
      try {
        await adminClient.from("provider_notifications").insert({
          user_id: targetFacility.user_id,
          facility_id: targetFacilityId,
          type: "lead_redistributed",
          title: reassigned === 1 ? "New lead assigned to you" : `${reassigned} leads assigned to you`,
          message: `${reassigned} lead${reassigned === 1 ? "" : "s"} ${reassigned === 1 ? "was" : "were"} assigned to ${targetFacility.name}. Open your inquiries to respond.`,
          metadata: { link: "/provider/inquiries", reassigned_count: reassigned, bulk: true },
        });
      } catch (notifyErr) {
        console.warn(`[admin-bulk-reassign-leads] notification insert failed`, notifyErr);
      }
    }

    return json(200, {
      success: true,
      reassigned,
      skipped,
      errored,
      results,
      _version: VERSION,
    });
  } catch (err) {
    console.error(`[admin-bulk-reassign-leads] error`, err);
    return json(500, { error: "Internal server error", code: "internal_error" });
  }
});
