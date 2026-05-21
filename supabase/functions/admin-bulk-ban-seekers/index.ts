/**
 * admin-bulk-ban-seekers — admin-only bulk ban/unban for seekers.
 *
 * Mirrors admin-delete-seeker's ban path but operates over a batch
 * of user_ids in one call. Each ban/unban writes a per-user
 * admin_audit_log row so the trail stays granular (matching the
 * single-action path).
 *
 * What it does:
 *   1. JWT + user_is_admin RPC gate, then can_moderate_users RPC
 *      gate (super_admin + manager only — reps don't get bulk-ban
 *      power, same as bulk-status on /admin/providers)
 *   2. Validates inputs:
 *        userIds[]: 1..50 (smaller cap than other bulk ops; banning
 *           an account triggers session-revoke downstream, so we
 *           don't want admins fat-fingering a 100-user mistake)
 *        action: 'ban' | 'unban'
 *        reason: optional, 500 chars, audit-logged
 *   3. For each user: calls auth.admin.updateUserById to set or
 *      clear the ban duration, AND syncs blocked_identifiers so
 *      the seeker can't re-register with the same email
 *   4. Writes per-user admin_audit_log row with action_type=
 *      'seeker_bulk_ban' or 'seeker_bulk_unban' + reason +
 *      previous_banned_state
 *   5. Returns partial-success summary
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2?target=denonext";

const VERSION = "1.0.0";
const MAX_PER_REQUEST = 50;
const BAN_DURATION = "876000h"; // ~100 years; mirrors single-action path

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

function sanitize(s, maxLength = 500) {
  if (typeof s !== "string") return null;
  const trimmed = s.trim().slice(0, maxLength);
  return trimmed.replace(/[<>]/g, "") || null;
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

    // First gate: admin role (any admin can call), second gate:
    // moderation role (only super_admin + manager actually wield
    // bulk ban — matches the single-action path).
    const { data: isAdmin } = await userClient.rpc("user_is_admin", { p_user_id: user.id });
    if (!isAdmin) return json(403, { error: "Admin role required", code: "forbidden" });
    const { data: canModerate } = await userClient.rpc("can_moderate_users", { p_user_id: user.id });
    if (!canModerate) return json(403, { error: "Moderator role required", code: "forbidden_moderator" });

    let body: { userIds?: unknown; action?: unknown; reason?: unknown };
    try { body = await req.json(); } catch { return json(400, { error: "Invalid JSON", code: "invalid_json" }); }

    const userIds = body.userIds;
    const action = body.action;
    const reason = sanitize(body.reason);

    if (!Array.isArray(userIds) || userIds.length === 0) {
      return json(400, { error: "userIds[] is required", code: "invalid_user_ids" });
    }
    if (userIds.length > MAX_PER_REQUEST) {
      return json(400, {
        error: `Cannot ${typeof action === "string" ? action : "update"} more than ${MAX_PER_REQUEST} seekers at once`,
        code: "batch_too_large",
      });
    }
    if (action !== "ban" && action !== "unban") {
      return json(400, { error: "action must be 'ban' or 'unban'", code: "invalid_action" });
    }
    for (const id of userIds) {
      if (typeof id !== "string" || !UUID_REGEX.test(id)) {
        return json(400, { error: `Invalid user ID: ${String(id).slice(0, 40)}`, code: "invalid_user_id" });
      }
    }
    // Self-ban guard — admins can't bulk-ban themselves through this
    // path (single-action path has its own guard).
    if ((userIds as string[]).includes(user.id)) {
      return json(409, { error: "Cannot ban yourself", code: "self_ban_blocked" });
    }

    const results: Array<{
      id: string;
      status: "updated" | "skipped" | "error";
      reason?: string;
      email?: string | null;
    }> = [];

    for (const targetUserId of userIds as string[]) {
      try {
        // Load auth user so we know the email + current ban state
        const { data: target, error: targetErr } = await adminClient.auth.admin.getUserById(targetUserId);
        if (targetErr || !target?.user) {
          results.push({ id: targetUserId, status: "error", reason: "user_not_found" });
          continue;
        }
        const targetEmail: string | null = target.user.email ?? null;
        const previouslyBanned = !!(target.user as { banned_until?: string | null }).banned_until;

        if (action === "ban") {
          if (previouslyBanned) {
            results.push({ id: targetUserId, status: "skipped", reason: "already_banned", email: targetEmail });
            continue;
          }
          // Set the auth ban (rejects login)
          await adminClient.auth.admin.updateUserById(targetUserId, {
            ban_duration: BAN_DURATION,
          });
          // Block re-registration with the same identity. Mirrors
          // admin-delete-seeker pattern: inserts a user_id row and
          // (if email is known) an email row into blocked_identifiers.
          // Schema verified: `identifier` is the value, `identifier_type`
          // is "user_id" or "email", `blocked_by` is NOT NULL.
          await adminClient.from("blocked_identifiers").insert({
            identifier: targetUserId,
            identifier_type: "user_id",
            reason: reason ?? "Banned via bulk admin action",
            blocked_by: user.id,
            is_active: true,
          });
          if (targetEmail) {
            await adminClient.from("blocked_identifiers").insert({
              identifier: targetEmail.toLowerCase(),
              identifier_type: "email",
              reason: reason ?? "Banned via bulk admin action",
              blocked_by: user.id,
              is_active: true,
            });
          }
          await adminClient.from("admin_audit_log").insert({
            admin_user_id: user.id,
            action_type: "seeker_bulk_ban",
            target_type: "seeker",
            target_id: targetUserId,
            details: {
              target_email: targetEmail,
              previous_banned_state: false,
              ban_duration: BAN_DURATION,
              reason,
              bulk_operation: true,
              batch_size: userIds.length,
            },
          });
          results.push({ id: targetUserId, status: "updated", email: targetEmail });
        } else {
          // Unban
          if (!previouslyBanned) {
            results.push({ id: targetUserId, status: "skipped", reason: "not_banned", email: targetEmail });
            continue;
          }
          await adminClient.auth.admin.updateUserById(targetUserId, {
            ban_duration: "none",
          });
          // Deactivate by identifier — same field structure as ban path
          await adminClient
            .from("blocked_identifiers")
            .update({ is_active: false })
            .eq("identifier", targetUserId);
          if (targetEmail) {
            await adminClient
              .from("blocked_identifiers")
              .update({ is_active: false })
              .eq("identifier", targetEmail.toLowerCase());
          }
          await adminClient.from("admin_audit_log").insert({
            admin_user_id: user.id,
            action_type: "seeker_bulk_unban",
            target_type: "seeker",
            target_id: targetUserId,
            details: {
              target_email: targetEmail,
              previous_banned_state: true,
              reason,
              bulk_operation: true,
              batch_size: userIds.length,
            },
          });
          results.push({ id: targetUserId, status: "updated", email: targetEmail });
        }
      } catch (rowErr) {
        results.push({
          id: targetUserId,
          status: "error",
          reason: rowErr instanceof Error ? rowErr.message : String(rowErr),
        });
      }
    }

    const updated = results.filter((r) => r.status === "updated").length;
    const skipped = results.filter((r) => r.status === "skipped").length;
    const errored = results.filter((r) => r.status === "error").length;

    return json(200, {
      success: true,
      action,
      updated,
      skipped,
      errored,
      results,
      _version: VERSION,
    });
  } catch (err) {
    console.error(`[admin-bulk-ban-seekers] error`, err);
    return json(500, { error: "Internal server error", code: "internal_error" });
  }
});
