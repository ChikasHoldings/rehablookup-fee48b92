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

    if (facilityIds.length > 0) {
      // Delete leads associated with facilities
      await adminClient
        .from("leads")
        .delete()
        .in("facility_id", facilityIds);

      // Delete lead routing logs
      await adminClient
        .from("lead_routing_logs")
        .delete()
        .in("assigned_provider_id", facilityIds);

      // Delete facility views
      await adminClient
        .from("facility_views")
        .delete()
        .in("facility_id", facilityIds);

      // Delete facility interactions
      await adminClient
        .from("facility_interactions")
        .delete()
        .in("facility_id", facilityIds);

      // Delete facility services
      await adminClient
        .from("facility_services")
        .delete()
        .in("facility_id", facilityIds);

      // Delete facility insurance
      await adminClient
        .from("facility_insurance")
        .delete()
        .in("facility_id", facilityIds);

      // Delete facility age groups
      await adminClient
        .from("facility_age_groups")
        .delete()
        .in("facility_id", facilityIds);

      // Delete facility credentials
      await adminClient
        .from("facility_credentials")
        .delete()
        .in("facility_id", facilityIds);

      // Delete facility accreditations
      await adminClient
        .from("facility_accreditations")
        .delete()
        .in("facility_id", facilityIds);

      // Delete facility credential documents
      await adminClient
        .from("facility_credential_documents")
        .delete()
        .in("facility_id", facilityIds);

      // Delete review responses
      await adminClient
        .from("review_responses")
        .delete()
        .in("facility_id", facilityIds);

      // Delete review disputes
      await adminClient
        .from("review_disputes")
        .delete()
        .in("facility_id", facilityIds);


      // Delete pending changes
      await adminClient
        .from("facility_pending_changes")
        .delete()
        .in("facility_id", facilityIds);

      // Delete provider notifications
      await adminClient
        .from("provider_notifications")
        .delete()
        .eq("user_id", user.id);

      // Delete provider events
      await adminClient
        .from("provider_events")
        .delete()
        .in("facility_id", facilityIds);

      // Delete featured placement analytics
      await adminClient
        .from("featured_placement_analytics")
        .delete()
        .in("facility_id", facilityIds);

      // Delete lead emails
      await adminClient
        .from("lead_emails")
        .delete()
        .in("facility_id", facilityIds);

      // Delete lead notes
      await adminClient
        .from("lead_notes")
        .delete()
        .eq("user_id", user.id);

      // Delete reply email verification codes
      await adminClient
        .from("reply_email_verification_codes")
        .delete()
        .in("facility_id", facilityIds);

      // Delete facility reviews (reviews on provider's facilities)
      await adminClient
        .from("facility_reviews")
        .delete()
        .in("facility_id", facilityIds);

      // Delete request help analytics
      await adminClient
        .from("request_help_analytics")
        .delete()
        .in("facility_id", facilityIds);

      // Delete flagged images
      await adminClient
        .from("flagged_images")
        .delete()
        .in("facility_id", facilityIds);

      // Delete facilities themselves
      await adminClient
        .from("facilities")
        .delete()
        .eq("user_id", user.id);
    }

    // Delete profile
    await adminClient
      .from("profiles")
      .delete()
      .eq("user_id", user.id);

    // Delete notification preferences
    await adminClient
      .from("notification_preferences")
      .delete()
      .eq("user_id", user.id);

    // Delete user roles
    await adminClient
      .from("user_roles")
      .delete()
      .eq("user_id", user.id);

    // Delete user sessions
    await adminClient
      .from("user_sessions")
      .delete()
      .eq("user_id", user.id);

    // Delete activity log
    await adminClient
      .from("account_activity_log")
      .delete()
      .eq("user_id", user.id);

    // Delete subscription alerts
    await adminClient
      .from("subscription_alerts")
      .delete()
      .eq("user_id", user.id);

    // Delete subscription events
    await adminClient
      .from("subscription_events")
      .delete()
      .eq("user_id", user.id);

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
