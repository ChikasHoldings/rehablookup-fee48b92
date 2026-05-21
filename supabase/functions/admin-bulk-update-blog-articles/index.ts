/**
 * admin-bulk-update-blog-articles — admin-only bulk action on
 * blog_articles. Actions:
 *   - update_status   newStatus ∈ draft|published|archived
 *                     Stamps published_at on transition to published.
 *   - set_featured    featured: boolean
 *   - delete          permanent removal (super_admin only)
 *
 * Mirrors admin-bulk-update-marketing-leads / admin-bulk-update-escalations:
 *   1. JWT + has_role admin gate
 *   2. Defense-in-depth: super_admin + manager only; delete = super_admin only
 *   3. 100-row cap, UUID-array validation
 *   4. Skips no-ops as `skipped`
 *   5. Per-row admin_audit_log entry
 *   6. Returns partial-success summary
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2?target=denonext";

const VERSION = "1.0.0";
const MAX_PER_REQUEST = 100;
const VALID_STATUSES = new Set(["draft", "published", "archived"]);
const VALID_ACTIONS = new Set(["update_status", "set_featured", "delete"]);

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
        error: "Only managers and super admins may bulk-update blog articles",
        code: "moderator_role_required",
      });
    }

    let body: {
      articleIds?: unknown;
      action?: unknown;
      newStatus?: unknown;
      featured?: unknown;
      reason?: unknown;
    };
    try { body = await req.json(); } catch { return json(400, { error: "Invalid JSON", code: "invalid_json" }); }

    const articleIds = body.articleIds;
    const action = body.action;
    const reason = typeof body.reason === "string" ? body.reason.trim().slice(0, 500) : null;

    if (!Array.isArray(articleIds) || articleIds.length === 0) {
      return json(400, { error: "articleIds[] is required", code: "invalid_article_ids" });
    }
    if (articleIds.length > MAX_PER_REQUEST) {
      return json(400, {
        error: `Cannot process more than ${MAX_PER_REQUEST} articles at once`,
        code: "batch_too_large",
      });
    }
    for (const id of articleIds) {
      if (typeof id !== "string" || !UUID_REGEX.test(id)) {
        return json(400, { error: `Invalid article ID: ${String(id).slice(0, 40)}`, code: "invalid_article_id" });
      }
    }
    if (typeof action !== "string" || !VALID_ACTIONS.has(action)) {
      return json(400, { error: `action must be one of: ${Array.from(VALID_ACTIONS).join(", ")}`, code: "invalid_action" });
    }
    if (action === "delete" && adminRole !== "super_admin") {
      return json(403, {
        error: "Only super admins may bulk-delete blog articles",
        code: "super_admin_required_for_delete",
      });
    }

    let newStatus: string | null = null;
    let featured: boolean | null = null;
    if (action === "update_status") {
      newStatus = typeof body.newStatus === "string" ? body.newStatus : "";
      if (!VALID_STATUSES.has(newStatus)) {
        return json(400, {
          error: `newStatus must be one of: ${Array.from(VALID_STATUSES).join(", ")}`,
          code: "invalid_status",
        });
      }
    } else if (action === "set_featured") {
      featured = typeof body.featured === "boolean" ? body.featured : null;
      if (featured === null) {
        return json(400, { error: "featured must be a boolean", code: "invalid_featured" });
      }
    }

    const { data: current, error: loadErr } = await adminClient
      .from("blog_articles")
      .select("id, title, slug, status, featured, published_at")
      .in("id", articleIds as string[]);
    if (loadErr) return json(500, { error: "Failed to load articles", code: "lookup_failed" });
    const currentMap = new Map(current?.map((r) => [r.id, r]) ?? []);

    const results: Array<{ id: string; status: "ok" | "skipped" | "error"; reason?: string }> = [];
    const now = new Date().toISOString();

    for (const id of articleIds as string[]) {
      const row = currentMap.get(id);
      if (!row) {
        results.push({ id, status: "error", reason: "not_found" });
        continue;
      }

      try {
        if (action === "delete") {
          const { error: deleteErr } = await adminClient
            .from("blog_articles")
            .delete()
            .eq("id", id);
          if (deleteErr) throw new Error(`Delete failed: ${deleteErr.message}`);

          await adminClient.from("admin_audit_log").insert({
            admin_user_id: user.id,
            action_type: "blog_article_bulk_deleted",
            target_type: "blog_article",
            target_id: id,
            details: {
              title: row.title,
              slug: row.slug,
              status_before_delete: row.status,
              was_featured: row.featured,
              bulk_operation: true,
              batch_size: articleIds.length,
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
          // Stamp published_at on the first publish; preserve existing
          // value when re-publishing (matches the single-row path).
          if (newStatus === "published" && !row.published_at) {
            update.published_at = now;
          }
          auditAction = "blog_article_bulk_status_update";
          auditDetails = { old_status: row.status, new_status: newStatus };
        } else {
          // set_featured
          if (row.featured === featured) {
            results.push({ id, status: "skipped", reason: featured ? "already_featured" : "already_not_featured" });
            continue;
          }
          update.featured = featured;
          auditAction = "blog_article_bulk_featured_changed";
          auditDetails = { from_featured: row.featured, to_featured: featured };
        }

        const { error: updateErr } = await adminClient
          .from("blog_articles")
          .update(update)
          .eq("id", id);
        if (updateErr) throw new Error(updateErr.message);

        await adminClient.from("admin_audit_log").insert({
          admin_user_id: user.id,
          action_type: auditAction,
          target_type: "blog_article",
          target_id: id,
          details: {
            ...auditDetails,
            title: row.title,
            slug: row.slug,
            bulk_operation: true,
            batch_size: articleIds.length,
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
    console.error(`[admin-bulk-update-blog-articles] error`, err);
    return json(500, { error: "Internal server error", code: "internal_error" });
  }
});
