import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2?target=denonext";

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
    console.log("[DELETE-PROVIDER-ACCOUNT] Function started");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "No authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create client with user's token to get their ID
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await userClient.auth.getUser();
    
    if (userError || !user) {
      console.error("[DELETE-PROVIDER-ACCOUNT] Auth error:", userError);
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("[DELETE-PROVIDER-ACCOUNT] User authenticated:", user.id);

    // Verify user is a provider (has profiles entry with facilities)
    const { data: profile } = await userClient
      .from("profiles")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!profile) {
      return new Response(
        JSON.stringify({ error: "Account is not a provider account" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Use admin client to delete user and all associated data
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    console.log("[DELETE-PROVIDER-ACCOUNT] Deleting provider data for user:", user.id);

    // Get all facility IDs for this user to clean up related data
    const { data: facilities } = await adminClient
      .from("facilities")
      .select("id")
      .eq("user_id", user.id);

    const facilityIds = facilities?.map(f => f.id) || [];

    // 1. Purge all FACILITY-scoped data through the maintained SECURITY DEFINER
    //    purge function — the single source of truth (same model the seeker
    //    delete path uses). It covers everything the old hand-rolled list did
    //    PLUS the tables it silently omitted (facility_subscriptions,
    //    facility_staff, provider_payment_methods, concierge_*, lead/review
    //    children, favorites, badge impressions, …). Pass p_delete_user=false;
    //    user-level rows are purged explicitly in step 2. Error-checked so we
    //    NEVER report success on a partial delete (the old code swallowed every
    //    delete error and could leave PII behind while returning success).
    for (const fid of facilityIds) {
      const { error: purgeError } = await adminClient.rpc("purge_provider_data", {
        p_facility_id: fid,
        p_delete_user: false,
      });
      if (purgeError) {
        console.error("[DELETE-PROVIDER-ACCOUNT] purge_provider_data failed:", purgeError);
        return new Response(
          JSON.stringify({ error: "Failed to delete account data" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // 2. Purge USER-keyed rows (error-checked, idempotent). Includes the
    //    user-scoped rows the RPC's facility loop doesn't reach
    //    (provider_notifications / lead_notes keyed by user_id, account-level
    //    notification prefs, roles, sessions, activity log, subscription
    //    alerts/events). Fail closed before deleting the auth identity.
    const userScopedDeletes = await Promise.all([
      adminClient.from("provider_notifications").delete().eq("user_id", user.id),
      adminClient.from("lead_notes").delete().eq("user_id", user.id),
      adminClient.from("notification_preferences").delete().eq("user_id", user.id),
      adminClient.from("user_roles").delete().eq("user_id", user.id),
      adminClient.from("user_sessions").delete().eq("user_id", user.id),
      adminClient.from("account_activity_log").delete().eq("user_id", user.id),
      adminClient.from("subscription_alerts").delete().eq("user_id", user.id),
      adminClient.from("subscription_events").delete().eq("user_id", user.id),
    ]);
    const userDeleteErr = userScopedDeletes.find((r) => r.error)?.error;
    if (userDeleteErr) {
      console.error("[DELETE-PROVIDER-ACCOUNT] user-row purge failed:", userDeleteErr);
      return new Response(
        JSON.stringify({ error: "Failed to delete account data" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 3. Delete the profile last (FK anchor for the provider identity).
    const { error: profileDeleteErr } = await adminClient
      .from("profiles")
      .delete()
      .eq("user_id", user.id);
    if (profileDeleteErr) {
      console.error("[DELETE-PROVIDER-ACCOUNT] profile delete failed:", profileDeleteErr);
      return new Response(
        JSON.stringify({ error: "Failed to delete account data" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Finally delete the auth user
    const { error: deleteError } = await adminClient.auth.admin.deleteUser(user.id);

    if (deleteError) {
      console.error("[DELETE-PROVIDER-ACCOUNT] Error deleting auth user:", deleteError);
      return new Response(
        JSON.stringify({ error: "Failed to delete account" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("[DELETE-PROVIDER-ACCOUNT] Account deleted successfully:", user.id);

    return new Response(
      JSON.stringify({ success: true, message: "Account deleted successfully" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[DELETE-PROVIDER-ACCOUNT] Error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
