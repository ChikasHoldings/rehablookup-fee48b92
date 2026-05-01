import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2?target=denonext";

const VERSION = "1.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log(`[ADMIN-DELETE-LEAD] v${VERSION} Function started`);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "No authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify super admin
    const { data: isSuperAdmin } = await userClient.rpc("is_super_admin", { _user_id: user.id });
    if (!isSuperAdmin) {
      return new Response(
        JSON.stringify({ error: "Forbidden - Super Admin access required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json();
    const { leadIds } = body;

    if (!leadIds || !Array.isArray(leadIds) || leadIds.length === 0) {
      return new Response(
        JSON.stringify({ error: "leadIds array is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (leadIds.length > 100) {
      return new Response(
        JSON.stringify({ error: "Cannot delete more than 100 leads at once" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate UUIDs
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    for (const id of leadIds) {
      if (!uuidRegex.test(id)) {
        return new Response(
          JSON.stringify({ error: `Invalid lead ID: ${id}` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    console.log(`[ADMIN-DELETE-LEAD] Admin ${user.id} deleting ${leadIds.length} leads`);

    // Delete related data first
    await Promise.all([
      adminClient.from("lead_notes").delete().in("lead_id", leadIds),
      adminClient.from("lead_emails").delete().in("lead_id", leadIds),
      adminClient.from("lead_unlocks").delete().in("lead_id", leadIds),
      adminClient.from("lead_distributions").delete().in("lead_id", leadIds),
      adminClient.from("lead_routing_logs").delete().in("lead_id", leadIds),
    ]);

    // Delete the leads
    const { error: deleteError, count } = await adminClient
      .from("leads")
      .delete()
      .in("id", leadIds);

    if (deleteError) {
      console.error("[ADMIN-DELETE-LEAD] Delete error:", deleteError.message);
      return new Response(
        JSON.stringify({ error: "Failed to delete leads" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Audit log
    await adminClient.from("admin_audit_log").insert({
      admin_user_id: user.id,
      action_type: "leads_deleted",
      target_type: "lead",
      target_id: leadIds[0],
      details: { lead_ids: leadIds, count: leadIds.length },
    });

    console.log(`[ADMIN-DELETE-LEAD] Successfully deleted ${leadIds.length} leads`);

    return new Response(
      JSON.stringify({ success: true, deleted: leadIds.length }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[ADMIN-DELETE-LEAD] Error:", error instanceof Error ? error.message : String(error));
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
