/**
 * admin-bulk-moderate-reviews — admin-only bulk action on
 * facility_reviews. One action per call:
 *   - approve      → status=approved; stamps reviewed_by + reviewed_at
 *   - reject       → status=rejected; requires admin_notes
 *   - hide         → status=hidden  (typically post-dispute)
 *   - delete       → cascades dispute rows then deletes the review
 *
 * Mirrors admin-bulk-update-support-tickets:
 *   1. JWT + has_role admin gate
 *   2. Only super_admin + manager admin_role may approve/reject/hide
 *      (mirrors the canModerateReviews client gate; defense in depth
 *      so a customer_rep token can't bypass the UI check)
 *   3. 100-row cap, UUID-array validation
 *   4. Skips no-ops as `skipped`
 *   5. Per-row admin_audit_log entry
 *   6. Optional reason field (audit-logged)
 *   7. Partial-success summary
 *
 * Approval/rejection also fire one send-review-notification call per
 * row in the same function so the seeker gets the same email they'd
 * get from the single-action path — no fan-out from the client.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2?target=denonext";

const VERSION = "1.0.0";
const MAX_PER_REQUEST = 100;

const VALID_ACTIONS = new Set(["approve", "reject", "hide", "delete"]);

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

    // Role-tier gate: only manager + super_admin may moderate reviews.
    // customer_rep + advisor may NOT (mirrors canModerateReviews client gate).
    const { data: adminProfile, error: profileErr } = await adminClient
      .from("admin_user_profiles")
      .select("admin_role")
      .eq("user_id", user.id)
      .maybeSingle();
    if (profileErr) return json(500, { error: "Admin role lookup failed", code: "role_lookup_failed" });
    const adminRole = adminProfile?.admin_role || "customer_rep";
    if (adminRole !== "super_admin" && adminRole !== "manager") {
      return json(403, {
        error: "Only managers and super admins may moderate reviews",
        code: "moderator_role_required",
      });
    }

    let body: {
      reviewIds?: unknown;
      action?: unknown;
      adminNotes?: unknown;
      reason?: unknown;
    };
    try { body = await req.json(); } catch { return json(400, { error: "Invalid JSON", code: "invalid_json" }); }

    const reviewIds = body.reviewIds;
    const action = body.action;
    const adminNotes = typeof body.adminNotes === "string"
      ? body.adminNotes.replace(/<[^>]*>/g, "").replace(/javascript:/gi, "").trim().slice(0, 2000)
      : "";
    const reason = typeof body.reason === "string" ? body.reason.trim().slice(0, 500) : null;

    if (!Array.isArray(reviewIds) || reviewIds.length === 0) {
      return json(400, { error: "reviewIds[] is required", code: "invalid_review_ids" });
    }
    if (reviewIds.length > MAX_PER_REQUEST) {
      return json(400, {
        error: `Cannot process more than ${MAX_PER_REQUEST} reviews at once`,
        code: "batch_too_large",
      });
    }
    for (const id of reviewIds) {
      if (typeof id !== "string" || !UUID_REGEX.test(id)) {
        return json(400, { error: `Invalid review ID: ${String(id).slice(0, 40)}`, code: "invalid_review_id" });
      }
    }
    if (typeof action !== "string" || !VALID_ACTIONS.has(action)) {
      return json(400, { error: `action must be one of: ${Array.from(VALID_ACTIONS).join(", ")}`, code: "invalid_action" });
    }
    if (action === "reject" && !adminNotes) {
      return json(400, { error: "adminNotes is required when rejecting", code: "rejection_reason_required" });
    }

    // Load current state — skip no-ops + diff for audit
    const { data: current, error: loadErr } = await adminClient
      .from("facility_reviews")
      .select("id, status, facility_id, user_id, rating, review_text")
      .in("id", reviewIds as string[]);
    if (loadErr) return json(500, { error: "Failed to load reviews", code: "lookup_failed" });
    const currentMap = new Map(current?.map((r) => [r.id, r]) ?? []);

    const results: Array<{ id: string; status: "ok" | "skipped" | "error"; reason?: string }> = [];
    const now = new Date().toISOString();

    const targetStatusMap: Record<string, string> = {
      approve: "approved",
      reject: "rejected",
      hide: "hidden",
    };

    for (const id of reviewIds as string[]) {
      const row = currentMap.get(id);
      if (!row) {
        results.push({ id, status: "error", reason: "not_found" });
        continue;
      }

      try {
        if (action === "delete") {
          // Cascade: dispute rows first (FK constraint), then the
          // review. Per-row error isolation — one bad row doesn't
          // abort the whole batch.
          const { error: disputeErr } = await adminClient
            .from("review_disputes")
            .delete()
            .eq("review_id", id);
          if (disputeErr) throw new Error(`Dispute cascade failed: ${disputeErr.message}`);

          const { error: deleteErr } = await adminClient
            .from("facility_reviews")
            .delete()
            .eq("id", id);
          if (deleteErr) throw new Error(`Review delete failed: ${deleteErr.message}`);

          await adminClient.from("admin_audit_log").insert({
            admin_user_id: user.id,
            action_type: "review_bulk_deleted",
            target_type: "review",
            target_id: id,
            details: {
              facility_id: row.facility_id,
              user_id: row.user_id,
              rating: row.rating,
              review_text: row.review_text,
              status_before_delete: row.status,
              bulk_operation: true,
              batch_size: reviewIds.length,
              reason,
            },
          });

          results.push({ id, status: "ok" });
          continue;
        }

        const targetStatus = targetStatusMap[action];
        if (row.status === targetStatus) {
          results.push({ id, status: "skipped", reason: "already_in_target_status" });
          continue;
        }

        const update: Record<string, unknown> = {
          status: targetStatus,
          updated_at: now,
        };
        // Stamp reviewer/timestamp on approve + reject so the
        // single-action and bulk paths produce identical audit trails.
        if (action === "approve" || action === "reject") {
          update.reviewed_at = now;
          update.reviewed_by = user.id;
          if (adminNotes) update.admin_notes = adminNotes;
        }
        // Hiding clears the disputed flag — typically called from the
        // dispute-resolution path. Single-action equivalent is in
        // handleUpholdDispute on the client.
        if (action === "hide") {
          update.disputed = false;
        }

        const { data: updatedRows, error: updateErr } = await adminClient
          .from("facility_reviews")
          .update(update)
          .eq("id", id)
          .select("id");
        if (updateErr) throw new Error(updateErr.message);
        if (!updatedRows || updatedRows.length === 0) {
          throw new Error(`Review ${id} not found or update was blocked`);
        }

        await adminClient.from("admin_audit_log").insert({
          admin_user_id: user.id,
          action_type: `review_bulk_${action}`,
          target_type: "review",
          target_id: id,
          details: {
            facility_id: row.facility_id,
            user_id: row.user_id,
            rating: row.rating,
            previous_status: row.status,
            new_status: targetStatus,
            admin_notes: adminNotes || null,
            bulk_operation: true,
            batch_size: reviewIds.length,
            reason,
          },
        });

        // Fire the seeker notification email matching the single-action
        // path. Failure is logged + counted but doesn't abort the row
        // (the moderation decision already persisted).
        if (action === "approve" || action === "reject") {
          try {
            await adminClient.functions.invoke("send-review-notification", {
              body: {
                type: action === "approve" ? "review_approved" : "review_rejected",
                reviewId: id,
                facilityId: row.facility_id,
                seekerId: row.user_id,
                ...(action === "reject" && adminNotes ? { rejectionReason: adminNotes } : {}),
              },
            });
          } catch (notifyErr) {
            console.error(`[admin-bulk-moderate-reviews] notify failed`, { id, err: notifyErr });
            // Don't fail the row — the moderation worked, just log
          }
        }

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
    console.error(`[admin-bulk-moderate-reviews] error`, err);
    return json(500, { error: "Internal server error", code: "internal_error" });
  }
});
