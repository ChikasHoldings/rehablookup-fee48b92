import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2?target=denonext";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  console.log("[cleanup-orphan-storage] Starting orphan file cleanup...");

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify admin role from auth header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: "No authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData.user) {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid authentication" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check admin role
    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userData.user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleData) {
      return new Response(
        JSON.stringify({ success: false, error: "Unauthorized: Admin access required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

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

    let orphanedFiles: string[] = [];
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

    // Log the cleanup action
    await supabase.from("admin_audit_log").insert({
      admin_user_id: userData.user.id,
      action_type: "storage_cleanup",
      target_type: "storage",
      details: {
        total_checked: totalChecked,
        orphans_found: orphanedFiles.length,
        deleted_count: deletedCount,
        remaining_orphans: orphanedFiles.length - deletedCount,
        cleaned_at: new Date().toISOString(),
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
