import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ManageAdminUserRequest {
  action: "suspend" | "unsuspend" | "delete" | "reset_password" | "update_role" | "update_permissions";
  targetUserId: string;
  newRole?: "admin" | "moderator";
  permissions?: Record<string, boolean>;
}

function generateTempPassword(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%";
  let password = "";
  for (let i = 0; i < 12; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendApiKey = Deno.env.get("RESEND_API_KEY");

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify the requesting user is an admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Missing authorization header");
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user: requestingUser }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !requestingUser) {
      throw new Error("Unauthorized");
    }

    // Check if requesting user is admin
    const { data: isAdmin } = await supabase.rpc("has_role", {
      _user_id: requestingUser.id,
      _role: "admin",
    });

    if (!isAdmin) {
      throw new Error("Only admins can manage admin users");
    }

    const body: ManageAdminUserRequest = await req.json();
    const { action, targetUserId, newRole, permissions } = body;

    console.log("[MANAGE-ADMIN-USER] Action:", action, "Target:", targetUserId);

    // Prevent self-modification for certain actions
    if (action === "suspend" || action === "delete") {
      if (targetUserId === requestingUser.id) {
        throw new Error("You cannot suspend or delete your own account");
      }
    }

    // Get target user info
    const { data: targetProfile } = await supabase
      .from("profiles")
      .select("email, first_name, last_name")
      .eq("user_id", targetUserId)
      .single();

    let result: any = { success: true };

    switch (action) {
      case "suspend": {
        // Update admin profile status
        await supabase
          .from("admin_user_profiles")
          .update({ status: "suspended" })
          .eq("user_id", targetUserId);

        // Disable user in auth (ban)
        await supabase.auth.admin.updateUserById(targetUserId, {
          ban_duration: "876000h", // ~100 years
        });

        // Log action
        await supabase.from("admin_audit_log").insert({
          admin_user_id: requestingUser.id,
          action_type: "admin_user_suspended",
          target_type: "admin_user",
          target_id: targetUserId,
          details: { email: targetProfile?.email },
        });

        result.message = "User suspended successfully";
        break;
      }

      case "unsuspend": {
        // Update admin profile status
        await supabase
          .from("admin_user_profiles")
          .update({ status: "active" })
          .eq("user_id", targetUserId);

        // Unban user
        await supabase.auth.admin.updateUserById(targetUserId, {
          ban_duration: "none",
        });

        // Log action
        await supabase.from("admin_audit_log").insert({
          admin_user_id: requestingUser.id,
          action_type: "admin_user_unsuspended",
          target_type: "admin_user",
          target_id: targetUserId,
          details: { email: targetProfile?.email },
        });

        result.message = "User unsuspended successfully";
        break;
      }

      case "delete": {
        // Check if target is the last admin
        const { count: adminCount } = await supabase
          .from("user_roles")
          .select("*", { count: "exact" })
          .eq("role", "admin");

        const { data: targetRoles } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", targetUserId);

        const isTargetAdmin = targetRoles?.some(r => r.role === "admin");

        if (isTargetAdmin && adminCount && adminCount <= 1) {
          throw new Error("Cannot delete the last admin user");
        }

        // Delete from admin_user_permissions
        await supabase
          .from("admin_user_permissions")
          .delete()
          .eq("user_id", targetUserId);

        // Delete from admin_user_profiles
        await supabase
          .from("admin_user_profiles")
          .delete()
          .eq("user_id", targetUserId);

        // Delete from admin_user_notifications
        await supabase
          .from("admin_user_notifications")
          .delete()
          .eq("user_id", targetUserId);

        // Delete roles
        await supabase
          .from("user_roles")
          .delete()
          .eq("user_id", targetUserId);

        // Delete the user from auth
        await supabase.auth.admin.deleteUser(targetUserId);

        // Log action
        await supabase.from("admin_audit_log").insert({
          admin_user_id: requestingUser.id,
          action_type: "admin_user_deleted",
          target_type: "admin_user",
          target_id: targetUserId,
          details: { email: targetProfile?.email },
        });

        result.message = "User deleted successfully";
        break;
      }

      case "reset_password": {
        const tempPassword = generateTempPassword();
        const tempPasswordExpiry = new Date();
        tempPasswordExpiry.setHours(tempPasswordExpiry.getHours() + 72);

        // Update password in auth
        await supabase.auth.admin.updateUserById(targetUserId, {
          password: tempPassword,
        });

        // Update admin profile
        await supabase
          .from("admin_user_profiles")
          .upsert({
            user_id: targetUserId,
            status: "pending_password_reset",
            force_password_change: true,
            temp_password_expires_at: tempPasswordExpiry.toISOString(),
          }, { onConflict: "user_id" });

        // Send email with new temp password
        if (resendApiKey && targetProfile?.email) {
          const resend = new Resend(resendApiKey);
          const loginUrl = `${req.headers.get("origin")}/admin-login`;

          await resend.emails.send({
            from: "RehabLookup Admin <onboarding@resend.dev>",
            to: [targetProfile.email],
            subject: "Your RehabLookup Admin Password Has Been Reset",
            html: `
              <!DOCTYPE html>
              <html>
              <head>
                <style>
                  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1a1a1a; }
                  .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                  .header { background: #1B365D; color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
                  .content { background: #f6f8fb; padding: 30px; border-radius: 0 0 8px 8px; }
                  .credentials { background: white; border: 1px solid #e2e8f0; border-radius: 6px; padding: 20px; margin: 20px 0; }
                  .credential-value { font-size: 16px; font-weight: 600; color: #1B365D; font-family: monospace; background: #f1f5f9; padding: 8px 12px; border-radius: 4px; }
                  .warning { background: #fef3c7; border: 1px solid #f59e0b; border-radius: 6px; padding: 15px; margin: 20px 0; }
                  .btn { display: inline-block; background: #1B365D; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; }
                </style>
              </head>
              <body>
                <div class="container">
                  <div class="header">
                    <h1 style="margin: 0; font-size: 24px;">🔐 Password Reset</h1>
                  </div>
                  <div class="content">
                    <p>Hello ${targetProfile.first_name || "Admin"},</p>
                    <p>Your admin password has been reset. Here is your new temporary password:</p>
                    
                    <div class="credentials">
                      <div class="credential-value" style="text-align: center; font-size: 20px;">${tempPassword}</div>
                    </div>

                    <div class="warning">
                      <strong>⚠️ Important</strong>
                      <p style="margin: 5px 0 0 0;">This password expires in 72 hours. You must change it upon login.</p>
                    </div>

                    <p style="text-align: center; margin-top: 30px;">
                      <a href="${loginUrl}" class="btn">Login Now →</a>
                    </p>
                  </div>
                </div>
              </body>
              </html>
            `,
          });
        }

        // Log action
        await supabase.from("admin_audit_log").insert({
          admin_user_id: requestingUser.id,
          action_type: "admin_password_reset",
          target_type: "admin_user",
          target_id: targetUserId,
          details: { email: targetProfile?.email },
        });

        result.message = "Password reset successfully. New credentials sent via email.";
        result.tempPassword = tempPassword;
        break;
      }

      case "update_role": {
        if (!newRole) {
          throw new Error("New role is required");
        }

        // Get current roles
        const { data: currentRoles } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", targetUserId);

        // Delete current admin/moderator roles
        await supabase
          .from("user_roles")
          .delete()
          .eq("user_id", targetUserId)
          .in("role", ["admin", "moderator"]);

        // Insert new role
        await supabase.from("user_roles").insert({
          user_id: targetUserId,
          role: newRole,
        });

        // Log action
        await supabase.from("admin_audit_log").insert({
          admin_user_id: requestingUser.id,
          action_type: "admin_role_changed",
          target_type: "admin_user",
          target_id: targetUserId,
          details: {
            email: targetProfile?.email,
            old_roles: currentRoles?.map(r => r.role),
            new_role: newRole,
          },
        });

        result.message = "Role updated successfully";
        break;
      }

      case "update_permissions": {
        if (!permissions) {
          throw new Error("Permissions are required");
        }

        // Delete existing permissions
        await supabase
          .from("admin_user_permissions")
          .delete()
          .eq("user_id", targetUserId);

        // Insert new permissions
        const permissionInserts = Object.entries(permissions).map(([key, granted]) => ({
          user_id: targetUserId,
          permission_key: key,
          granted,
        }));

        if (permissionInserts.length > 0) {
          await supabase.from("admin_user_permissions").insert(permissionInserts);
        }

        // Log action
        await supabase.from("admin_audit_log").insert({
          admin_user_id: requestingUser.id,
          action_type: "admin_permissions_updated",
          target_type: "admin_user",
          target_id: targetUserId,
          details: { email: targetProfile?.email, permissions },
        });

        result.message = "Permissions updated successfully";
        break;
      }

      default:
        throw new Error("Invalid action");
    }

    return new Response(
      JSON.stringify(result),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("[MANAGE-ADMIN-USER] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
});
