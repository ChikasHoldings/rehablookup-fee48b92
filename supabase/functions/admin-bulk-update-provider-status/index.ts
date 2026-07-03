/**
 * admin-bulk-update-provider-status — admin-only action to update
 * the `status` column on multiple facilities in one operation.
 *
 * Mirrors admin-bulk-update-lead-status / admin-bulk-update-ivr-status
 * pattern:
 *   1. JWT + can_moderate_users gate (super_admin or manager only —
 *      reps don't get bulk approval power)
 *   2. Status whitelist enforced
 *   3. 100-facility cap, UUID-array validation
 *   4. Per-facility loop preserves trigger/RLS behaviour
 *   5. Skips no-ops (`current.status === newStatus`) as `skipped`
 *   6. Stamps `claimed_at = now()` when newStatus='approved' AND the
 *      facility has a user_id but no claimed_at — mirrors what the
 *      claim-approval path does
 *   7. Per-facility admin_audit_log row with before/after
 *   8. Returns partial-success summary
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2?target=denonext";

const VERSION = "1.1.0";
const MAX_PER_REQUEST = 100;

const VALID_STATUSES = new Set([
  "approved",
  "pending_review",
  "rejected",
  "draft",
]);

// Statuses that carry an admin reason and notify the provider that action is
// needed. rejection_reason is persisted on the facility for these and cleared
// for every other status.
const REASON_STATUSES = new Set(["rejected", "needs_edits"]);

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

    // Use the existing can_moderate_users RPC so the role check stays
    // consistent with the rest of the admin-providers workflow (super
    // admin + manager). The RPC is SECURITY DEFINER so we use the
    // user-scoped client.
    const { data: canModerate } = await userClient.rpc("can_moderate_users", {
      p_user_id: user.id,
    });
    if (!canModerate) return json(403, { error: "Moderator role required", code: "forbidden" });

    let body: { facilityIds?: unknown; newStatus?: unknown; reason?: unknown };
    try { body = await req.json(); } catch { return json(400, { error: "Invalid JSON", code: "invalid_json" }); }

    const facilityIds = body.facilityIds;
    const newStatus = body.newStatus;
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
    if (typeof newStatus !== "string" || !VALID_STATUSES.has(newStatus)) {
      return json(400, {
        error: `newStatus must be one of: ${Array.from(VALID_STATUSES).join(", ")}`,
        code: "invalid_status",
      });
    }
    for (const id of facilityIds) {
      if (typeof id !== "string" || !UUID_REGEX.test(id)) {
        return json(400, { error: `Invalid facility ID: ${String(id).slice(0, 40)}`, code: "invalid_facility_id" });
      }
    }

    const { data: current, error: loadErr } = await adminClient
      .from("facilities")
      .select("id, name, status, user_id, claimed_at")
      .in("id", facilityIds as string[]);
    if (loadErr) return json(500, { error: "Failed to load facilities", code: "lookup_failed" });
    const currentMap = new Map(current?.map((f) => [f.id, f]) ?? []);

    const results: Array<{ id: string; status: "updated" | "skipped" | "error"; reason?: string }> = [];
    const now = new Date().toISOString();

    for (const id of facilityIds as string[]) {
      const facility = currentMap.get(id);
      if (!facility) {
        results.push({ id, status: "error", reason: "not_found" });
        continue;
      }
      if (facility.status === newStatus) {
        results.push({ id, status: "skipped", reason: "already_in_target_status" });
        continue;
      }

      const update: Record<string, unknown> = {
        status: newStatus,
        updated_at: now,
      };
      // First-time approval of a claimed facility → stamp claimed_at
      // so downstream "claim approved at" sorts and the provider
      // dashboard's "you're approved" banner work correctly.
      if (newStatus === "approved" && facility.user_id && !facility.claimed_at) {
        update.claimed_at = now;
      }
      // Persist the reason on the listing for rejected/needs_edits so the
      // provider can see WHY on their dashboard; clear it on any other status
      // (e.g. a later approval) so a stale reason never lingers.
      update.rejection_reason = REASON_STATUSES.has(newStatus) ? (reason ?? null) : null;

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
        action_type: "provider_bulk_status_update",
        target_type: "facility",
        target_id: id,
        details: {
          previous_status: facility.status,
          new_status: newStatus,
          facility_name: facility.name,
          bulk_operation: true,
          batch_size: facilityIds.length,
          reason,
        },
      });

      // Tell the provider their listing needs action (best-effort; never
      // fails the status update). Uses the existing provider_notifications
      // bell surface + /provider/notifications; the reason is included where
      // given so the provider isn't left guessing.
      if (REASON_STATUSES.has(newStatus) && facility.user_id) {
        const isRejected = newStatus === "rejected";
        const title = isRejected ? "Listing not approved" : "Listing changes requested";
        const lead = isRejected
          ? `Your listing "${facility.name}" wasn't approved.`
          : `Your listing "${facility.name}" needs changes before it can go live.`;
        const message = `${lead}${reason ? ` Reason: ${reason}` : ""} Open your listings to update and resubmit.`;
        try {
          const { error: notifErr } = await adminClient.from("provider_notifications").insert({
            user_id: facility.user_id,
            facility_id: id,
            type: isRejected ? "facility_rejected" : "facility_needs_edits",
            title,
            message,
            metadata: { facility_id: id, status: newStatus, reason: reason ?? null, link: "/provider/listings" },
          });
          if (notifErr) console.warn(`[admin-bulk-update-provider-status] provider notify failed for ${id}: ${notifErr.message}`);
        } catch (notifEx) {
          console.warn(`[admin-bulk-update-provider-status] provider notify threw for ${id}`, notifEx);
        }
      }

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
    console.error(`[admin-bulk-update-provider-status] error`, err);
    return json(500, { error: "Internal server error", code: "internal_error" });
  }
});
