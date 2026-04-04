import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface ManageAdminUserRequest {
  action: "suspend" | "unsuspend" | "delete" | "reset_password" | "update_role" | "update_permissions" | "resend_invitation" | "toggle_mfa_skip";
  targetUserId: string;
  newRole?: "super_admin" | "manager" | "customer_rep" | "advisor";
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

function generatePasswordResetEmail(firstName: string, tempPassword: string, loginUrl: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: hsl(210, 20%, 96%);">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: hsl(210, 20%, 96%); padding: 32px 16px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px; width: 100%;">
          
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, hsl(217, 54%, 23%) 0%, hsl(217, 41%, 35%) 100%); padding: 32px; border-radius: 12px 12px 0 0;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td>
                    <p style="margin: 0 0 8px 0; font-size: 12px; color: hsla(0, 0%, 100%, 0.7); font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; text-transform: uppercase; letter-spacing: 1px;">RehabLookup Admin</p>
                    <h1 style="margin: 0; font-size: 24px; color: hsl(0, 0%, 100%); font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; font-weight: 600;">
                      🔐 Password Reset
                    </h1>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="background: hsl(0, 0%, 100%); padding: 32px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; border-left: 1px solid hsl(220, 13%, 91%); border-right: 1px solid hsl(220, 13%, 91%);">
              
              <p style="margin: 0 0 20px 0; color: hsl(215, 19%, 35%); font-size: 16px; line-height: 1.6;">
                Hello ${firstName},
              </p>
              
              <p style="margin: 0 0 24px 0; color: hsl(215, 19%, 35%); font-size: 16px; line-height: 1.6;">
                Your admin password has been reset. Here is your new temporary password:
              </p>
              
              <!-- Password Box -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background: hsl(210, 20%, 98%); border: 1px solid hsl(220, 13%, 91%); border-radius: 8px; margin-bottom: 24px;">
                <tr>
                  <td style="padding: 24px; text-align: center;">
                    <p style="margin: 0; font-size: 24px; font-weight: 600; color: hsl(217, 54%, 23%); font-family: 'Courier New', monospace; letter-spacing: 2px;">
                      ${tempPassword}
                    </p>
                  </td>
                </tr>
              </table>
              
              <!-- Warning -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background: hsl(45, 93%, 95%); border: 1px solid hsl(45, 93%, 75%); border-radius: 8px; margin-bottom: 24px;">
                <tr>
                  <td style="padding: 16px;">
                    <p style="margin: 0; color: hsl(32, 81%, 29%); font-size: 14px; line-height: 1.5;">
                      <strong>⚠️ Important:</strong> This password expires in 72 hours. You must change it upon login.
                    </p>
                  </td>
                </tr>
              </table>
              
              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="center">
                    <a href="${loginUrl}" style="display: inline-block; background: hsl(217, 54%, 23%); color: hsl(0, 0%, 100%); padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 15px;">
                      Login Now →
                    </a>
                  </td>
                </tr>
              </table>
              
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background: hsl(217, 54%, 23%); padding: 32px; border-radius: 0 0 12px 12px;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="center">
                    <p style="margin: 0 0 8px 0; font-size: 18px; font-weight: 600; color: hsl(0, 0%, 100%); font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">RehabLookup</p>
                    <p style="margin: 0 0 16px 0; font-size: 13px; color: hsla(0, 0%, 100%, 0.7); font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">Admin Panel</p>
                    <p style="margin: 0; font-size: 11px; color: hsla(0, 0%, 100%, 0.5); font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
                      © ${new Date().getFullYear()} RehabLookup. All rights reserved.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}

function generateInvitationEmail(displayName: string, email: string, tempPassword: string, loginUrl: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: hsl(210, 20%, 96%);">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: hsl(210, 20%, 96%); padding: 32px 16px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px; width: 100%;">
          
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, hsl(217, 54%, 23%) 0%, hsl(217, 41%, 35%) 100%); padding: 32px; border-radius: 12px 12px 0 0;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td>
                    <p style="margin: 0 0 8px 0; font-size: 12px; color: hsla(0, 0%, 100%, 0.7); font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; text-transform: uppercase; letter-spacing: 1px;">RehabLookup Admin</p>
                    <h1 style="margin: 0; font-size: 24px; color: hsl(0, 0%, 100%); font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; font-weight: 600;">
                      🔑 Admin Invitation (Resent)
                    </h1>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="background: hsl(0, 0%, 100%); padding: 32px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; border-left: 1px solid hsl(220, 13%, 91%); border-right: 1px solid hsl(220, 13%, 91%);">
              
              <p style="margin: 0 0 20px 0; color: hsl(215, 19%, 35%); font-size: 16px; line-height: 1.6;">
                Hello ${displayName},
              </p>
              
              <p style="margin: 0 0 24px 0; color: hsl(215, 19%, 35%); font-size: 16px; line-height: 1.6;">
                Your invitation to the RehabLookup Admin Panel has been resent. Here are your new login credentials:
              </p>
              
              <!-- Credentials Box -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background: hsl(210, 20%, 98%); border: 1px solid hsl(220, 13%, 91%); border-radius: 8px; margin-bottom: 24px;">
                <tr>
                  <td style="padding: 24px;">
                    <table width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td style="padding: 12px 0; border-bottom: 1px solid hsl(220, 13%, 91%);">
                          <p style="margin: 0 0 4px 0; font-size: 12px; color: hsl(220, 9%, 46%); text-transform: uppercase;">Email</p>
                          <p style="margin: 0; font-size: 15px; font-weight: 600; color: hsl(217, 54%, 23%);">${email}</p>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 12px 0;">
                          <p style="margin: 0 0 4px 0; font-size: 12px; color: hsl(220, 9%, 46%); text-transform: uppercase;">Temporary Password</p>
                          <p style="margin: 0; font-size: 18px; font-weight: 600; color: hsl(217, 54%, 23%); font-family: 'Courier New', monospace; letter-spacing: 1px;">${tempPassword}</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              
              <!-- Warning -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background: hsl(45, 93%, 95%); border: 1px solid hsl(45, 93%, 75%); border-radius: 8px; margin-bottom: 24px;">
                <tr>
                  <td style="padding: 16px;">
                    <p style="margin: 0 0 8px 0; color: hsl(32, 81%, 29%); font-size: 14px; font-weight: 600;">
                      ⚠️ Important
                    </p>
                    <ul style="margin: 0; padding-left: 20px; color: hsl(32, 81%, 29%); font-size: 14px; line-height: 1.6;">
                      <li style="margin-bottom: 6px;">This temporary password expires in <strong>72 hours</strong></li>
                      <li style="margin-bottom: 6px;">You must change your password upon first login</li>
                      <li>Keep these credentials secure</li>
                    </ul>
                  </td>
                </tr>
              </table>
              
              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="center">
                    <a href="${loginUrl}" style="display: inline-block; background: hsl(217, 54%, 23%); color: hsl(0, 0%, 100%); padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 15px;">
                      Login to Admin Panel →
                    </a>
                  </td>
                </tr>
              </table>
              
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background: hsl(217, 54%, 23%); padding: 32px; border-radius: 0 0 12px 12px;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="center">
                    <p style="margin: 0 0 8px 0; font-size: 18px; font-weight: 600; color: hsl(0, 0%, 100%); font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">RehabLookup</p>
                    <p style="margin: 0 0 16px 0; font-size: 13px; color: hsla(0, 0%, 100%, 0.7); font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">Admin Panel</p>
                    <p style="margin: 0; font-size: 11px; color: hsla(0, 0%, 100%, 0.5); font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
                      © ${new Date().getFullYear()} RehabLookup. All rights reserved.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}

Deno.serve(async (req) => {
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

    // Check if requesting user is Super Admin
    const { data: requestorIsSuperAdmin } = await supabase.rpc("is_super_admin", {
      _user_id: requestingUser.id,
    });

    const body: ManageAdminUserRequest = await req.json();
    const { action, targetUserId, newRole, permissions } = body;

    console.log("[MANAGE-ADMIN-USER] Action:", action, "Target:", targetUserId, "Requestor Super:", requestorIsSuperAdmin);

    // CRITICAL: Role hierarchy enforcement
    // Only Super Admins can perform destructive or role-altering actions
    const superAdminOnlyActions = ["delete", "suspend", "unsuspend", "update_role", "update_permissions", "toggle_mfa_skip"];
    if (superAdminOnlyActions.includes(action) && !requestorIsSuperAdmin) {
      throw new Error("Only Super Admins can perform this action");
    }

    // Prevent self-modification for certain actions
    if (action === "suspend" || action === "delete") {
      if (targetUserId === requestingUser.id) {
        throw new Error("You cannot suspend or delete your own account");
      }
    }

    // Prevent modifying another Super Admin unless you are the requestor yourself
    if (action !== "resend_invitation" && action !== "reset_password") {
      const { data: targetIsSuperAdmin } = await supabase.rpc("is_super_admin", {
        _user_id: targetUserId,
      });
      if (targetIsSuperAdmin && targetUserId !== requestingUser.id) {
        // Only allow if requestor is also super admin
        if (!requestorIsSuperAdmin) {
          throw new Error("Cannot modify a Super Admin account");
        }
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

        // Delete from profiles table
        await supabase
          .from("profiles")
          .delete()
          .eq("user_id", targetUserId);

        // Delete account activity log entries
        await supabase
          .from("account_activity_log")
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
          const loginUrl = "https://rehablookup.com/admin/login";

          await resend.emails.send({
            from: "RehabLookup Admin <no-reply@rehablookup.com>",
            to: [targetProfile.email],
            subject: "Your RehabLookup Admin Password Has Been Reset",
            html: generatePasswordResetEmail(targetProfile.first_name || "Admin", tempPassword, loginUrl),
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

        // Get current admin_role from admin_user_profiles
        const { data: currentAdminProfile } = await supabase
          .from("admin_user_profiles")
          .select("admin_role")
          .eq("user_id", targetUserId)
          .single();

        const oldRole = currentAdminProfile?.admin_role || "customer_rep";

        // Update admin_role in admin_user_profiles (this is the actual role)
        const { error: updateError } = await supabase
          .from("admin_user_profiles")
          .upsert({
            user_id: targetUserId,
            admin_role: newRole,
          }, { onConflict: "user_id" });

        if (updateError) {
          console.error("[MANAGE-ADMIN-USER] Failed to update admin_role:", updateError);
          throw new Error("Failed to update role");
        }

        // Ensure user has admin role in user_roles table (for RLS policies)
        const { data: existingRole } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", targetUserId)
          .eq("role", "admin")
          .single();

        if (!existingRole) {
          await supabase.from("user_roles").insert({
            user_id: targetUserId,
            role: "admin",
          });
        }

        // Update super_admin permission based on role
        const isSuperAdmin = newRole === "super_admin";
        await supabase
          .from("admin_user_permissions")
          .upsert({
            user_id: targetUserId,
            permission_key: "super_admin",
            granted: isSuperAdmin,
          }, { onConflict: "user_id,permission_key" });

        // Log action
        await supabase.from("admin_audit_log").insert({
          admin_user_id: requestingUser.id,
          action_type: "admin_role_changed",
          target_type: "admin_user",
          target_id: targetUserId,
          details: {
            email: targetProfile?.email,
            old_role: oldRole,
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

      case "resend_invitation": {
        // Check if user is in pending_password_reset status
        const { data: adminProfile } = await supabase
          .from("admin_user_profiles")
          .select("status, display_name")
          .eq("user_id", targetUserId)
          .single();

        if (adminProfile?.status !== "pending_password_reset") {
          throw new Error("Can only resend invitation to pending users");
        }

        // Generate new temp password
        const tempPassword = generateTempPassword();
        const tempPasswordExpiry = new Date();
        tempPasswordExpiry.setHours(tempPasswordExpiry.getHours() + 72);

        // Update password in auth
        await supabase.auth.admin.updateUserById(targetUserId, {
          password: tempPassword,
        });

        // Update expiry in admin profile
        await supabase
          .from("admin_user_profiles")
          .update({
            temp_password_expires_at: tempPasswordExpiry.toISOString(),
          })
          .eq("user_id", targetUserId);

        // Send invitation email
        if (resendApiKey && targetProfile?.email) {
          const resend = new Resend(resendApiKey);
          const loginUrl = "https://rehablookup.com/admin/login";
          const displayName = adminProfile.display_name || targetProfile.first_name || "Admin";

          await resend.emails.send({
            from: "RehabLookup Admin <no-reply@rehablookup.com>",
            to: [targetProfile.email],
            subject: "Your RehabLookup Admin Invitation (Resent)",
            html: generateInvitationEmail(displayName, targetProfile.email, tempPassword, loginUrl),
          });
        }

        // Log action
        await supabase.from("admin_audit_log").insert({
          admin_user_id: requestingUser.id,
          action_type: "admin_invitation_resent",
          target_type: "admin_user",
          target_id: targetUserId,
          details: { email: targetProfile?.email },
        });

        result.message = "Invitation resent successfully";
        result.tempPassword = tempPassword;
        break;
      }

      case "toggle_mfa_skip": {
        // Get current mfa_skip status
        const { data: adminProfile } = await supabase
          .from("admin_user_profiles")
          .select("mfa_skip")
          .eq("user_id", targetUserId)
          .single();

        const newMfaSkip = !(adminProfile?.mfa_skip || false);

        // Update mfa_skip
        await supabase
          .from("admin_user_profiles")
          .upsert({
            user_id: targetUserId,
            mfa_skip: newMfaSkip,
          }, { onConflict: "user_id" });

        // Log action
        await supabase.from("admin_audit_log").insert({
          admin_user_id: requestingUser.id,
          action_type: "admin_mfa_skip_toggled",
          target_type: "admin_user",
          target_id: targetUserId,
          details: { email: targetProfile?.email, mfa_skip: newMfaSkip },
        });

        result.message = newMfaSkip ? "2FA enforcement skipped" : "2FA enforcement enabled";
        result.mfa_skip = newMfaSkip;
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
