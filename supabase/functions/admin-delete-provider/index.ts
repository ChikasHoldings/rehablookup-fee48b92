import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("[ADMIN-DELETE-PROVIDER] Function started");

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

    // Check if user has admin role
    const { data: isAdmin } = await userClient.rpc("user_is_admin", { p_user_id: user.id });

    if (!isAdmin) {
      console.error("[ADMIN-DELETE-PROVIDER] User is not an admin:", user.id);
      return new Response(
        JSON.stringify({ error: "Forbidden - Admin access required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Use admin client for service-level operations
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    // Verify caller has moderation permission (super_admin or manager only)
    const { data: canModerate } = await adminClient.rpc("can_moderate_users", { p_user_id: user.id });
    
    if (!canModerate) {
      console.error("[ADMIN-DELETE-PROVIDER] User lacks moderation permission:", user.id);
      return new Response(
        JSON.stringify({ error: "Forbidden - Only Super Admins and Managers can delete providers" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse request body
    const { facilityId, deleteUser } = await req.json();

    // Input validation - UUID format check
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!facilityId || typeof facilityId !== "string" || !uuidRegex.test(facilityId)) {
      return new Response(
        JSON.stringify({ error: "Invalid facilityId format" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("[ADMIN-DELETE-PROVIDER] Admin:", user.id, "deleting facility:", facilityId, "deleteUser:", deleteUser);

    // Use admin client for deletions
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    // Get facility info before deletion
    const { data: facility, error: facilityError } = await adminClient
      .from("facilities")
      .select("id, name, user_id")
      .eq("id", facilityId)
      .single();

    if (facilityError || !facility) {
      console.error("[ADMIN-DELETE-PROVIDER] Facility not found:", facilityError);
      return new Response(
        JSON.stringify({ error: "Facility not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const providerUserId = facility.user_id;
    const facilityName = facility.name;

    // Delete all facility-related data
    console.log("[ADMIN-DELETE-PROVIDER] Deleting facility data for:", facilityId);

    // Delete facility staff
    await adminClient.from("facility_staff").delete().eq("facility_id", facilityId);

    // Delete leads and related data
    const { data: leads } = await adminClient.from("leads").select("id").eq("facility_id", facilityId);
    const leadIds = leads?.map(l => l.id) || [];
    
    if (leadIds.length > 0) {
      await adminClient.from("lead_notes").delete().in("lead_id", leadIds);
      await adminClient.from("lead_emails").delete().in("lead_id", leadIds);
    }
    await adminClient.from("leads").delete().eq("facility_id", facilityId);

    // Delete lead routing logs
    await adminClient.from("lead_routing_logs").delete().eq("assigned_provider_id", facilityId);
    await adminClient.from("lead_routing_logs").delete().eq("requested_facility_id", facilityId);

    // Delete facility views and interactions
    await adminClient.from("facility_views").delete().eq("facility_id", facilityId);
    await adminClient.from("facility_interactions").delete().eq("facility_id", facilityId);

    // Delete facility services, insurance, age groups
    await adminClient.from("facility_services").delete().eq("facility_id", facilityId);
    await adminClient.from("facility_insurance").delete().eq("facility_id", facilityId);
    await adminClient.from("facility_age_groups").delete().eq("facility_id", facilityId);

    // Delete credentials
    await adminClient.from("facility_credentials").delete().eq("facility_id", facilityId);
    await adminClient.from("facility_accreditations").delete().eq("facility_id", facilityId);
    await adminClient.from("facility_credential_documents").delete().eq("facility_id", facilityId);

    // Delete reviews and related data
    const { data: reviews } = await adminClient.from("facility_reviews").select("id").eq("facility_id", facilityId);
    const reviewIds = reviews?.map(r => r.id) || [];
    
    if (reviewIds.length > 0) {
      await adminClient.from("review_helpful_votes").delete().in("review_id", reviewIds);
      await adminClient.from("review_responses").delete().in("review_id", reviewIds);
      await adminClient.from("review_disputes").delete().in("review_id", reviewIds);
    }
    await adminClient.from("facility_reviews").delete().eq("facility_id", facilityId);
    await adminClient.from("facility_reviews_config").delete().eq("facility_id", facilityId);

    // Delete pending changes
    await adminClient.from("facility_pending_changes").delete().eq("facility_id", facilityId);

    // Delete provider events and notifications
    await adminClient.from("provider_events").delete().eq("facility_id", facilityId);
    await adminClient.from("provider_notifications").delete().eq("facility_id", facilityId);

    // Delete featured placement analytics
    await adminClient.from("featured_placement_analytics").delete().eq("facility_id", facilityId);

    // Delete flagged images
    await adminClient.from("flagged_images").delete().eq("facility_id", facilityId);

    // Delete reply email verification codes
    await adminClient.from("reply_email_verification_codes").delete().eq("facility_id", facilityId);

    // Delete request help analytics
    await adminClient.from("request_help_analytics").delete().eq("facility_id", facilityId);

    // Delete user favorites referencing this facility
    await adminClient.from("user_favorites").delete().eq("facility_id", facilityId);

    // Finally delete the facility
    const { error: deleteFacilityError } = await adminClient
      .from("facilities")
      .delete()
      .eq("id", facilityId);

    if (deleteFacilityError) {
      console.error("[ADMIN-DELETE-PROVIDER] Error deleting facility:", deleteFacilityError);
      return new Response(
        JSON.stringify({ error: "Failed to delete facility" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // If deleteUser is true and user has no other facilities, delete the user account
    if (deleteUser && providerUserId) {
      const { data: otherFacilities } = await adminClient
        .from("facilities")
        .select("id")
        .eq("user_id", providerUserId);

      if (!otherFacilities || otherFacilities.length === 0) {
        console.log("[ADMIN-DELETE-PROVIDER] Deleting user account:", providerUserId);

        // Get user email for verification cleanup
        const { data: authUser } = await adminClient.auth.admin.getUserById(providerUserId);
        const userEmail = authUser?.user?.email;

        // Delete profile
        await adminClient.from("profiles").delete().eq("user_id", providerUserId);

        // Delete notification preferences
        await adminClient.from("notification_preferences").delete().eq("user_id", providerUserId);

        // Delete user roles
        await adminClient.from("user_roles").delete().eq("user_id", providerUserId);

        // Delete user sessions
        await adminClient.from("user_sessions").delete().eq("user_id", providerUserId);

        // Delete activity log
        await adminClient.from("account_activity_log").delete().eq("user_id", providerUserId);

        // Delete subscription alerts and events
        await adminClient.from("subscription_alerts").delete().eq("user_id", providerUserId);
        await adminClient.from("subscription_events").delete().eq("user_id", providerUserId);

        // Clean up email verification codes so they can re-verify on re-registration
        if (userEmail) {
          await adminClient.from("email_verification_codes").delete().eq("email", userEmail.toLowerCase());
        }

        // Delete the auth user
        const { error: deleteAuthError } = await adminClient.auth.admin.deleteUser(providerUserId);

        if (deleteAuthError) {
          console.error("[ADMIN-DELETE-PROVIDER] Error deleting auth user:", deleteAuthError);
          // Non-blocking - facility is already deleted
        } else {
          console.log("[ADMIN-DELETE-PROVIDER] User account deleted:", providerUserId);
        }
      } else {
        console.log("[ADMIN-DELETE-PROVIDER] User has other facilities, not deleting account");
      }
    }

    // Log admin action
    await adminClient.from("admin_audit_log").insert({
      admin_user_id: user.id,
      action_type: "provider_deleted",
      target_type: "facility",
      target_id: facilityId,
      details: {
        facility_name: facilityName,
        provider_user_id: providerUserId,
        user_deleted: deleteUser && (!await adminClient.from("facilities").select("id").eq("user_id", providerUserId).then(r => r.data?.length)),
      },
    });

    console.log("[ADMIN-DELETE-PROVIDER] Successfully deleted facility:", facilityId);

    return new Response(
      JSON.stringify({ success: true, message: "Provider deleted successfully" }),
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
