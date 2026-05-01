import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2?target=denonext";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log("[cleanup-audit-logs] Starting audit log cleanup...");

    // Get the retention setting from platform_settings
    const { data: retentionSetting, error: settingError } = await supabase
      .from("platform_settings")
      .select("setting_value")
      .eq("setting_key", "audit_log_retention_days")
      .single();

    if (settingError && settingError.code !== "PGRST116") {
      console.error("[cleanup-audit-logs] Error fetching retention setting:", settingError);
    }

    // Default to 90 days if no setting found
    const retentionDays = retentionSetting?.setting_value?.days ?? 90;
    console.log(`[cleanup-audit-logs] Retention period: ${retentionDays} days`);

    // Calculate the cutoff date
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
    const cutoffISO = cutoffDate.toISOString();

    console.log(`[cleanup-audit-logs] Deleting logs older than: ${cutoffISO}`);

    // Count logs to be deleted first
    const { count: toDeleteCount } = await supabase
      .from("admin_audit_log")
      .select("id", { count: "exact", head: true })
      .lt("created_at", cutoffISO);

    console.log(`[cleanup-audit-logs] Found ${toDeleteCount || 0} logs to delete`);

    if ((toDeleteCount || 0) === 0) {
      console.log("[cleanup-audit-logs] No logs to delete");
      return new Response(
        JSON.stringify({
          success: true,
          message: "No logs to delete",
          deleted: 0,
          retentionDays,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Delete old audit logs
    const { error: deleteError } = await supabase
      .from("admin_audit_log")
      .delete()
      .lt("created_at", cutoffISO);

    if (deleteError) {
      console.error("[cleanup-audit-logs] Error deleting logs:", deleteError);
      throw deleteError;
    }

    console.log(`[cleanup-audit-logs] Successfully deleted ${toDeleteCount} audit logs`);

    // Record the cleanup as a system notification (admin_audit_log requires a real
    // admin_user_id; system-initiated cleanups are surfaced via admin_notifications instead).
    await supabase.from("admin_notifications").insert({
      type: "system_maintenance",
      title: "Audit log retention cleanup",
      message: `Deleted ${toDeleteCount || 0} audit logs older than ${retentionDays} days.`,
      metadata: {
        deleted_count: toDeleteCount || 0,
        retention_days: retentionDays,
        cutoff_date: cutoffISO,
        cleaned_at: new Date().toISOString(),
        source: "cleanup-audit-logs",
      },
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: `Deleted ${toDeleteCount} audit logs older than ${retentionDays} days`,
        deleted: toDeleteCount,
        retentionDays,
        cutoffDate: cutoffISO,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : "Unknown error";
    console.error("[cleanup-audit-logs] Error:", errMsg);
    return new Response(
      JSON.stringify({
        success: false,
        error: errMsg,
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
