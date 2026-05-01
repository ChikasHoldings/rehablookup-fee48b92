import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2?target=denonext";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.error("[ADMIN-DELETE-SEEKER] No authorization header");
      return new Response(
        JSON.stringify({ error: "No authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Create client with caller's token to verify admin status
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user: adminUser }, error: authError } = await userClient.auth.getUser();
    
    if (authError || !adminUser) {
      console.error("[ADMIN-DELETE-SEEKER] Authentication failed:", authError);
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify caller is an admin with moderation privileges
    const { data: isAdmin } = await userClient.rpc("user_is_admin", { p_user_id: adminUser.id });
    
    if (!isAdmin) {
      console.error("[ADMIN-DELETE-SEEKER] User is not an admin:", adminUser.id);
      return new Response(
        JSON.stringify({ error: "Forbidden - Admin access required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify caller has moderation permission (super_admin or manager only)
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);
    const { data: canModerate } = await adminClient.rpc("can_moderate_users", { p_user_id: adminUser.id });
    
    if (!canModerate) {
      console.error("[ADMIN-DELETE-SEEKER] User lacks moderation permission:", adminUser.id);
      return new Response(
        JSON.stringify({ error: "Forbidden - Only Super Admins and Managers can perform this action" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json();
    const { targetUserId, action = "delete", reason } = body;

    // Input validation
    if (!targetUserId || typeof targetUserId !== "string" || targetUserId.length > 40) {
      return new Response(
        JSON.stringify({ error: "Invalid targetUserId" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // UUID format check
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(targetUserId)) {
      return new Response(
        JSON.stringify({ error: "Invalid targetUserId format" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!["delete", "ban", "unban"].includes(action)) {
      return new Response(
        JSON.stringify({ error: `Invalid action: ${action}. Valid actions are: delete, ban, unban` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Sanitize reason
    const sanitizedReason = reason ? String(reason).replace(/<[^>]*>/g, "").slice(0, 500) : undefined;

    console.log(`[ADMIN-DELETE-SEEKER] Admin ${adminUser.id} performing ${action} on user ${targetUserId}`);

    // adminClient already created above for moderation check

    // Verify target is a seeker
    const { data: seekerProfile } = await adminClient
      .from("seeker_profiles")
      .select("id, display_name, first_name, last_name")
      .eq("user_id", targetUserId)
      .maybeSingle();

    if (!seekerProfile) {
      console.error("[ADMIN-DELETE-SEEKER] Target user is not a seeker:", targetUserId);
      return new Response(
        JSON.stringify({ error: "Target user is not a seeker account" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get target user email for logging
    const { data: targetAuthUser } = await adminClient.auth.admin.getUserById(targetUserId);
    const targetEmail = targetAuthUser?.user?.email;
    const userName = seekerProfile.display_name || 
      `${seekerProfile.first_name || ''} ${seekerProfile.last_name || ''}`.trim() || 
      'Unknown User';

    if (action === "delete") {
      // Delete all related data using the centralized GDPR-compliant purge RPC
      console.log("[ADMIN-DELETE-SEEKER] Purging user data via RPC...");

      const { error: purgeError } = await adminClient.rpc("purge_seeker_data", {
        p_user_id: targetUserId,
        p_user_email: targetEmail || "",
      });

      if (purgeError) {
        console.error("[ADMIN-DELETE-SEEKER] purge_seeker_data failed:", purgeError);
        return new Response(
          JSON.stringify({ error: "Failed to purge seeker data" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Delete auth user (last step so the purge runs against an existing auth.users row)
      const { error: deleteAuthError } = await adminClient.auth.admin.deleteUser(targetUserId);

      if (deleteAuthError) {
        console.error("[ADMIN-DELETE-SEEKER] Error deleting auth user:", deleteAuthError);
        return new Response(
          JSON.stringify({ error: "Failed to delete user authentication" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Log admin action
      await adminClient.from("admin_audit_log").insert({
        admin_user_id: adminUser.id,
        action_type: "delete_seeker",
        target_type: "seeker",
        target_id: targetUserId,
        details: {
          deleted_user_name: userName,
          deleted_user_email: targetEmail,
        },
      });

      console.log("[ADMIN-DELETE-SEEKER] Successfully deleted seeker:", targetUserId);
      return new Response(
        JSON.stringify({ success: true, message: "Client account deleted successfully" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );

    } else if (action === "ban") {
      // Ban user in Supabase Auth (100 year ban)
      const { error: banAuthError } = await adminClient.auth.admin.updateUserById(
        targetUserId,
        { ban_duration: "876000h" } // ~100 years
      );

      if (banAuthError) {
        console.error("[ADMIN-DELETE-SEEKER] Error banning auth user:", banAuthError);
        return new Response(
          JSON.stringify({ error: "Failed to ban user" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Add to blocked_identifiers table
      await adminClient.from("blocked_identifiers").insert({
        identifier: targetUserId,
        identifier_type: "user_id",
        reason: reason || "Banned by admin",
        blocked_by: adminUser.id,
        is_active: true,
      });

      // Also block email if available
      if (targetEmail) {
        await adminClient.from("blocked_identifiers").insert({
          identifier: targetEmail,
          identifier_type: "email",
          reason: reason || "Banned by admin",
          blocked_by: adminUser.id,
          is_active: true,
        });
      }

      // Log admin action
      await adminClient.from("admin_audit_log").insert({
        admin_user_id: adminUser.id,
        action_type: "ban_seeker",
        target_type: "seeker",
        target_id: targetUserId,
        details: {
          banned_user_name: userName,
          banned_user_email: targetEmail,
          reason,
        },
      });

      console.log("[ADMIN-DELETE-SEEKER] Successfully banned seeker:", targetUserId);
      return new Response(
        JSON.stringify({ success: true, message: "User has been banned" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );

    } else if (action === "unban") {
      // Remove ban in Supabase Auth
      const { error: unbanAuthError } = await adminClient.auth.admin.updateUserById(
        targetUserId,
        { ban_duration: "none" }
      );

      if (unbanAuthError) {
        console.error("[ADMIN-DELETE-SEEKER] Error unbanning auth user:", unbanAuthError);
        return new Response(
          JSON.stringify({ error: "Failed to unban user" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Deactivate blocked_identifiers entries
      await adminClient
        .from("blocked_identifiers")
        .update({ is_active: false })
        .eq("identifier", targetUserId);

      if (targetEmail) {
        await adminClient
          .from("blocked_identifiers")
          .update({ is_active: false })
          .eq("identifier", targetEmail);
      }

      // Log admin action
      await adminClient.from("admin_audit_log").insert({
        admin_user_id: adminUser.id,
        action_type: "unban_seeker",
        target_type: "seeker",
        target_id: targetUserId,
        details: {
          unbanned_user_name: userName,
          unbanned_user_email: targetEmail,
        },
      });

      console.log("[ADMIN-DELETE-SEEKER] Successfully unbanned seeker:", targetUserId);
      return new Response(
        JSON.stringify({ success: true, message: "User has been unbanned" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );

    } else {
      return new Response(
        JSON.stringify({ error: `Invalid action: ${action}. Valid actions are: delete, ban, unban` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

  } catch (error) {
    console.error("[ADMIN-DELETE-SEEKER] Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
