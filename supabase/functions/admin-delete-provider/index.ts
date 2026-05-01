import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // POST-only enforcement
  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed", code: "method_not_allowed", allowed: ["POST"] }),
      {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json", Allow: "POST, OPTIONS" },
      },
    );
  }


  try {
    console.log("[ADMIN-DELETE-PROVIDER] Function started (v2 - purge RPC)");

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

    // Verify the requesting user is an admin
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      console.error("[ADMIN-DELETE-PROVIDER] Auth error:", userError);
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: isAdmin } = await userClient.rpc("user_is_admin", { p_user_id: user.id });
    if (!isAdmin) {
      console.error("[ADMIN-DELETE-PROVIDER] User is not an admin:", user.id);
      return new Response(
        JSON.stringify({ error: "Forbidden - Admin access required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    const { data: canModerate } = await adminClient.rpc("can_moderate_users", { p_user_id: user.id });
    if (!canModerate) {
      console.error("[ADMIN-DELETE-PROVIDER] User lacks moderation permission:", user.id);
      return new Response(
        JSON.stringify({ error: "Forbidden - Only Super Admins and Managers can delete providers" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json();
    const { facilityId, deleteUser } = body;

    // UUID validation
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!facilityId || typeof facilityId !== "string" || !uuidRegex.test(facilityId)) {
      return new Response(
        JSON.stringify({ error: "Invalid facilityId format" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Look up facility to capture name + owner before purge
    const { data: facility, error: facilityError } = await adminClient
      .from("facilities")
      .select("id, name, user_id")
      .eq("id", facilityId)
      .single();

    if (facilityError || !facility) {
      return new Response(
        JSON.stringify({ error: "Facility not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const providerUserId = facility.user_id;
    const facilityName = facility.name;

    // Prevent destructive action against an admin / privileged account
    if (providerUserId) {
      const { data: targetIsAdmin } = await adminClient.rpc("user_is_admin", { p_user_id: providerUserId });
      if (targetIsAdmin) {
        return new Response(
          JSON.stringify({ error: "Cannot delete a facility owned by an admin account" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    console.log("[ADMIN-DELETE-PROVIDER] Admin:", user.id, "purging facility:", facilityId, "deleteUser:", deleteUser);

    // Single transactional purge call — replaces dozens of orphaned per-table deletes
    const { data: purgeResult, error: purgeError } = await adminClient.rpc("purge_provider_data", {
      p_facility_id: facilityId,
      p_delete_user: !!deleteUser,
    });

    if (purgeError) {
      console.error("[ADMIN-DELETE-PROVIDER] purge_provider_data failed:", purgeError);
      return new Response(
        JSON.stringify({ error: "Failed to purge provider data" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let userDeleted = false;
    if (deleteUser && providerUserId && (purgeResult as { user_eligible_for_deletion?: boolean })?.user_eligible_for_deletion) {
      const { error: deleteAuthError } = await adminClient.auth.admin.deleteUser(providerUserId);
      if (deleteAuthError) {
        console.error("[ADMIN-DELETE-PROVIDER] Error deleting auth user:", deleteAuthError);
      } else {
        userDeleted = true;
      }
    }

    // Audit
    await adminClient.from("admin_audit_log").insert({
      admin_user_id: user.id,
      action_type: "provider_deleted",
      target_type: "facility",
      target_id: facilityId,
      details: {
        facility_name: facilityName,
        provider_user_id: providerUserId,
        user_deleted: userDeleted,
        purge_summary: purgeResult,
      },
    });

    console.log("[ADMIN-DELETE-PROVIDER] Successfully deleted facility:", facilityId);

    return new Response(
      JSON.stringify({ success: true, userDeleted, message: "Provider deleted successfully" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[ADMIN-DELETE-PROVIDER] Error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
