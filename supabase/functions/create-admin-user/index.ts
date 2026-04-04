import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface CreateAdminUserRequest {
  email: string;
  displayName: string;
  adminRole: "super_admin" | "manager" | "customer_rep" | "advisor";
  permissions: Record<string, boolean>;
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

function generateTempPassword(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%";
  let password = "";
  for (let i = 0; i < 12; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
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
      throw new Error("Only admins can create admin users");
    }

    const body: CreateAdminUserRequest = await req.json();
    const { email, displayName, adminRole, permissions } = body;

    console.log("[CREATE-ADMIN-USER] Creating admin user:", { email, displayName, adminRole });

    // Check if user already exists with this email
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find(u => u.email?.toLowerCase() === email.toLowerCase());
    
    if (existingUser) {
      // Check if they already have any conflicting roles
      const { data: hasProviderProfile } = await supabase.rpc("user_has_provider_profile", { p_user_id: existingUser.id });
      const { data: hasSeekerProfile } = await supabase.rpc("user_has_seeker_profile", { p_user_id: existingUser.id });
      const { data: isAlreadyAdmin } = await supabase.rpc("has_role", { _user_id: existingUser.id, _role: "admin" });
      
      if (hasProviderProfile) {
        throw new Error("This email belongs to an existing provider account and cannot be made an admin");
      }
      if (hasSeekerProfile) {
        throw new Error("This email belongs to an existing seeker account and cannot be made an admin");
      }
      if (isAlreadyAdmin) {
        throw new Error("This user is already an admin");
      }
      
      throw new Error("A user with this email address already exists in the system");
    }

    // Generate temporary password
    const tempPassword = generateTempPassword();
    const tempPasswordExpiry = new Date();
    tempPasswordExpiry.setHours(tempPasswordExpiry.getHours() + 72); // 72 hours expiry

    // Create the user in Supabase Auth
    const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: {
        display_name: displayName,
        is_admin_user: true,
      },
    });

    if (createError) {
      console.error("[CREATE-ADMIN-USER] Failed to create user:", createError);
      throw new Error(createError.message);
    }

    const userId = newUser.user.id;
    console.log("[CREATE-ADMIN-USER] User created:", userId);

    // IMPORTANT: Do NOT create a provider profile (profiles table) for admin users
    // This would trigger the prevent_admin_double_account check
    // Admin users should ONLY have admin_user_profiles records

    // Assign admin role in user_roles table FIRST (before any other tables)
    const { error: roleError } = await supabase.from("user_roles").insert({
      user_id: userId,
      role: "admin",
    });

    if (roleError) {
      console.error("[CREATE-ADMIN-USER] Failed to assign role:", roleError);
      // Clean up the auth user if role assignment fails
      await supabase.auth.admin.deleteUser(userId);
      throw new Error("Failed to assign admin role. Please try again.");
    }

    console.log("[CREATE-ADMIN-USER] Admin role assigned successfully");

    // Split display name into first and last name
    const nameParts = displayName.trim().split(/\s+/);
    const firstName = nameParts[0] || displayName;
    const lastName = nameParts.slice(1).join(" ") || null;

    // Create admin profile with specific admin_role and temp password info
    const { error: adminProfileError } = await supabase.from("admin_user_profiles").insert({
      user_id: userId,
      display_name: displayName,
      first_name: firstName,
      last_name: lastName,
      admin_role: adminRole,
      status: "pending_password_reset",
      force_password_change: true,
      temp_password_expires_at: tempPasswordExpiry.toISOString(),
      created_by: requestingUser.id,
    });

    if (adminProfileError) {
      console.error("[CREATE-ADMIN-USER] Failed to create admin profile:", adminProfileError);
    }

    // Insert permissions
    const permissionInserts = Object.entries(permissions).map(([key, granted]) => ({
      user_id: userId,
      permission_key: key,
      granted,
    }));

    if (permissionInserts.length > 0) {
      const { error: permError } = await supabase
        .from("admin_user_permissions")
        .insert(permissionInserts);

      if (permError) {
        console.error("[CREATE-ADMIN-USER] Failed to insert permissions:", permError);
      }
    }

    // Log the action
    await supabase.from("admin_audit_log").insert({
      admin_user_id: requestingUser.id,
      action_type: "admin_user_created",
      target_type: "admin_user",
      target_id: userId,
      details: {
        email,
        display_name: displayName,
        admin_role: adminRole,
        permissions,
      },
    });

    // Send invitation email
    if (resendApiKey) {
      const resend = new Resend(resendApiKey);
      const loginUrl = "https://rehablookup.com/admin/login";

      try {
        await resend.emails.send({
          from: "RehabLookup Admin <no-reply@rehablookup.com>",
          to: [email],
          subject: "Your RehabLookup Admin Account Has Been Created",
          html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Admin Account Created</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f6f9; -webkit-font-smoothing: antialiased;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f6f9;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08);">
          
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #1B365D 0%, #2C4A7F 100%); padding: 40px 32px; text-align: center;">
              <div style="font-size: 40px; margin-bottom: 12px;">🛡️</div>
              <h1 style="margin: 0; color: #ffffff; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; font-size: 26px; font-weight: 700;">
                Admin Account Created
              </h1>
            </td>
          </tr>
          
          <!-- Body -->
          <tr>
            <td style="padding: 40px 32px;">
              <p style="margin: 0 0 20px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; font-size: 17px; color: #1a1a1a; line-height: 1.6;">
                Hello ${displayName},
              </p>
              
              <p style="margin: 0 0 28px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; font-size: 16px; color: #4b5563; line-height: 1.7;">
                An admin account has been created for you on the RehabLookup platform. You have been assigned the <strong style="color: #1a1a1a;">${adminRole.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}</strong> role.
              </p>
              
              <!-- Credentials Box -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; margin-bottom: 28px;">
                <tr>
                  <td style="padding: 24px;">
                    <h3 style="margin: 0 0 20px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; font-size: 16px; font-weight: 600; color: #1B365D;">
                      Your Login Credentials
                    </h3>
                    
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding: 12px 0;">
                          <p style="margin: 0 0 6px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; font-size: 12px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px;">Email</p>
                          <p style="margin: 0; font-family: 'Courier New', Courier, monospace; font-size: 16px; font-weight: 600; color: #1B365D; background: #f1f5f9; padding: 10px 14px; border-radius: 6px;">${email}</p>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 12px 0;">
                          <p style="margin: 0 0 6px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; font-size: 12px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px;">Temporary Password</p>
                          <p style="margin: 0; font-family: 'Courier New', Courier, monospace; font-size: 16px; font-weight: 600; color: #1B365D; background: #f1f5f9; padding: 10px 14px; border-radius: 6px;">${tempPassword}</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              
              <!-- Warning Box -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background: #fef3c7; border: 1px solid #f59e0b; border-radius: 12px; margin-bottom: 32px;">
                <tr>
                  <td style="padding: 20px;">
                    <p style="margin: 0 0 12px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; font-size: 15px; font-weight: 600; color: #92400e;">
                      ⚠️ Important Security Notice
                    </p>
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding: 6px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; font-size: 14px; color: #92400e; line-height: 1.5;">
                          • This temporary password expires in <strong>72 hours</strong>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 6px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; font-size: 14px; color: #92400e; line-height: 1.5;">
                          • You will be required to change your password upon first login
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 6px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; font-size: 14px; color: #92400e; line-height: 1.5;">
                          • Do not share these credentials with anyone
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              
              <!-- CTA Button -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 32px;">
                <tr>
                  <td align="center">
                    <a href="${loginUrl}" style="display: inline-block; background: #1B365D; color: #ffffff; padding: 16px 36px; border-radius: 10px; text-decoration: none; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; font-weight: 600; font-size: 16px;">
                      Login to Admin Panel →
                    </a>
                  </td>
                </tr>
              </table>
              
              <p style="margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; font-size: 14px; color: #64748b; line-height: 1.6;">
                If you did not expect this account or have questions, please contact your system administrator immediately at <a href="mailto:help@rehablookup.com" style="color: #1B365D; text-decoration: none; font-weight: 500;">help@rehablookup.com</a>.
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background: #1B365D; padding: 28px 32px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding-bottom: 12px;">
                    <p style="margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; font-size: 18px; font-weight: 700; color: #ffffff;">
                      RehabLookup
                    </p>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding-bottom: 16px;">
                    <p style="margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; font-size: 13px; color: rgba(255,255,255,0.7);">
                      Admin System
                    </p>
                  </td>
                </tr>
                <tr>
                  <td align="center">
                    <p style="margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; font-size: 12px; color: rgba(255,255,255,0.5);">
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
          `,
        });
        console.log("[CREATE-ADMIN-USER] Invitation email sent to:", email);
      } catch (emailError) {
        console.error("[CREATE-ADMIN-USER] Failed to send email:", emailError);
        // Don't throw, user was still created
      }
    }

    // Create notification for the new admin
    await supabase.from("admin_user_notifications").insert({
      user_id: userId,
      type: "welcome",
      title: "Welcome to RehabLookup Admin! 👋",
      message: `Your admin account has been set up. Please change your temporary password to secure your account.`,
      link: "/admin/settings",
    });

    return new Response(
      JSON.stringify({
        success: true,
        userId,
        message: "Admin user created successfully. Invitation email sent.",
        tempPassword,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("[CREATE-ADMIN-USER] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
});
