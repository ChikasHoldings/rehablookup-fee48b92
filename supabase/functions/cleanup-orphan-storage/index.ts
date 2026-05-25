import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2?target=denonext";

import { assertCronSecret } from "../_shared/cron-auth.ts";
import { requireAdmin } from "../_shared/require-admin.ts";
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  // Dual-auth: the scheduled pg_cron run carries X-Cron-Secret; the admin
  // console "run now" button carries an admin JWT instead. Accept either.
  if (req.headers.get("x-cron-secret")) {
    const __cronAuth = assertCronSecret(req);
    if (!__cronAuth.ok) return __cronAuth.response;
  } else {
    const __adminAuth = await requireAdmin(req);
    if (!__adminAuth.ok) return __adminAuth.response;
  }

  console.log("[cleanup-orphan-storage] Starting orphan file cleanup...");

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Auth (cron secret or admin JWT) is enforced above; the cron path has no
    // user context, so no further per-user check here.

    // Get all facility IDs to compare against
    const { data: facilities } = await supabase
      .from("facilities")
      .select("id, logo_url, gallery_urls");

    // Build set of valid file references
    const validPaths = new Set<string>();
    for (const facility of facilities || []) {
      // Add logo URL path
      if (facility.logo_url) {
        const logoPath = extractPathFromUrl(facility.logo_url);
        if (logoPath) validPaths.add(logoPath);
      }
      // Add gallery URLs
      if (facility.gallery_urls && Array.isArray(facility.gallery_urls)) {
        for (const url of facility.gallery_urls) {
          const path = extractPathFromUrl(url);
          if (path) validPaths.add(path);
        }
      }
    }

    console.log(`[cleanup-orphan-storage] Found ${validPaths.size} valid file references`);

    // List all files in storage
    const { data: files, error: listError } = await supabase
      .storage
      .from("facility-images")
      .list("", { limit: 1000 });

    if (listError) {
      console.error("[cleanup-orphan-storage] Error listing files:", listError);
      throw listError;
    }

    const orphanedFiles: string[] = [];
    let totalChecked = 0;

    // Check each file/folder
    for (const item of files || []) {
      if (item.id) {
        // It's a file in root
        totalChecked++;
        if (!validPaths.has(item.name)) {
          orphanedFiles.push(item.name);
        }
      } else if (item.name) {
        // It's a folder - list its contents
        const { data: folderFiles } = await supabase
          .storage
          .from("facility-images")
          .list(item.name, { limit: 500 });

        for (const file of folderFiles || []) {
          if (file.id) {
            totalChecked++;
            const fullPath = `${item.name}/${file.name}`;
            if (!validPaths.has(fullPath)) {
              orphanedFiles.push(fullPath);
            }
          }
        }
      }
    }

    console.log(`[cleanup-orphan-storage] Checked ${totalChecked} files, found ${orphanedFiles.length} orphans`);

    // Delete orphaned files (with limit to avoid timeout)
    const maxDeletions = 100;
    const toDelete = orphanedFiles.slice(0, maxDeletions);
    let deletedCount = 0;

    if (toDelete.length > 0) {
      const { error: deleteError } = await supabase
        .storage
        .from("facility-images")
        .remove(toDelete);

      if (deleteError) {
        console.error("[cleanup-orphan-storage] Error deleting files:", deleteError);
      } else {
        deletedCount = toDelete.length;
        console.log(`[cleanup-orphan-storage] Deleted ${deletedCount} orphaned files`);
      }
    }

    // Record the cleanup. admin_audit_log requires a real admin_user_id, but
    // this runs under cron (no user) or an admin manual trigger — so surface it
    // via admin_notifications instead (mirrors cleanup-audit-logs).
    await supabase.from("admin_notifications").insert({
      type: "system_maintenance",
      title: "Orphan storage cleanup",
      message: `Checked ${totalChecked} files, deleted ${deletedCount} orphaned file(s).`,
      metadata: {
        total_checked: totalChecked,
        orphans_found: orphanedFiles.length,
        deleted_count: deletedCount,
        remaining_orphans: Math.max(0, orphanedFiles.length - deletedCount),
        cleaned_at: new Date().toISOString(),
        source: "cleanup-orphan-storage",
      },
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: deletedCount > 0 
          ? `Deleted ${deletedCount} orphaned files`
          : "No orphaned files found",
        total_checked: totalChecked,
        orphans_found: orphanedFiles.length,
        deleted_count: deletedCount,
        remaining_orphans: Math.max(0, orphanedFiles.length - deletedCount),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : "Unknown error";
    console.error("[cleanup-orphan-storage] Error:", errMsg);
    return new Response(
      JSON.stringify({ success: false, error: errMsg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// Helper to extract storage path from full URL
function extractPathFromUrl(url: string): string | null {
  if (!url) return null;
  try {
    // URLs are typically like: https://xxx.supabase.co/storage/v1/object/public/facility-images/path/file.jpg
    const match = url.match(/facility-images\/(.+)$/);
    return match ? match[1] : null;
  } catch {
    return null;
  }
}
