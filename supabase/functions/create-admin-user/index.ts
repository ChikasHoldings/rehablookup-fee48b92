import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CreateAdminUserRequest {
  email: string;
  displayName: string;
  role: "admin" | "moderator";
  permissions: Record<string, boolean>;
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
      throw new Error("Only admins can create admin users");
    }

    const body: CreateAdminUserRequest = await req.json();
    const { email, displayName, role, permissions } = body;

    console.log("[CREATE-ADMIN-USER] Creating admin user:", { email, displayName, role });

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

    // Create profile for the user
    const { error: profileError } = await supabase.from("profiles").insert({
      user_id: userId,
      email,
      first_name: displayName.split(" ")[0] || displayName,
      last_name: displayName.split(" ").slice(1).join(" ") || "",
    });

    if (profileError) {
      console.error("[CREATE-ADMIN-USER] Failed to create profile:", profileError);
      // Continue anyway, profile can be created later
    }

    // Assign the role
    const { error: roleError } = await supabase.from("user_roles").insert({
      user_id: userId,
      role: role,
    });

    if (roleError) {
      console.error("[CREATE-ADMIN-USER] Failed to assign role:", roleError);
      throw new Error("Failed to assign role");
    }

    // Create admin profile with temp password info
    const { error: adminProfileError } = await supabase.from("admin_user_profiles").insert({
      user_id: userId,
      display_name: displayName,
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
        role,
        permissions,
      },
    });

    // Send invitation email
    if (resendApiKey) {
      const resend = new Resend(resendApiKey);
      const loginUrl = `${req.headers.get("origin")}/admin-login`;

      try {
        await resend.emails.send({
          from: "RehabLookup Admin <no-reply@rehablookup.com>",
          to: [email],
          subject: "Your RehabLookup Admin Account Has Been Created",
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
                .credential-item { margin: 10px 0; }
                .credential-label { font-size: 12px; color: #64748b; text-transform: uppercase; }
                .credential-value { font-size: 16px; font-weight: 600; color: #1B365D; font-family: monospace; background: #f1f5f9; padding: 8px 12px; border-radius: 4px; margin-top: 4px; }
                .warning { background: #fef3c7; border: 1px solid #f59e0b; border-radius: 6px; padding: 15px; margin: 20px 0; }
                .btn { display: inline-block; background: #1B365D; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; }
                .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #64748b; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h1 style="margin: 0; font-size: 24px;">🛡️ Admin Account Created</h1>
                </div>
                <div class="content">
                  <p>Hello ${displayName},</p>
                  <p>An admin account has been created for you on the RehabLookup platform. You have been assigned the <strong>${role === "admin" ? "Administrator" : "Moderator"}</strong> role.</p>
                  
                  <div class="credentials">
                    <h3 style="margin-top: 0;">Your Login Credentials</h3>
                    <div class="credential-item">
                      <div class="credential-label">Email</div>
                      <div class="credential-value">${email}</div>
                    </div>
                    <div class="credential-item">
                      <div class="credential-label">Temporary Password</div>
                      <div class="credential-value">${tempPassword}</div>
                    </div>
                  </div>

                  <div class="warning">
                    <strong>⚠️ Important Security Notice</strong>
                    <ul style="margin: 10px 0 0 0; padding-left: 20px;">
                      <li>This temporary password expires in <strong>72 hours</strong></li>
                      <li>You will be required to change your password upon first login</li>
                      <li>Do not share these credentials with anyone</li>
                    </ul>
                  </div>

                  <p style="text-align: center; margin-top: 30px;">
                    <a href="${loginUrl}" class="btn">Login to Admin Panel →</a>
                  </p>

                  <p style="margin-top: 30px; font-size: 14px; color: #64748b;">If you did not expect this account or have questions, please contact your system administrator immediately.</p>
                </div>
                <div style="background: #1B365D; padding: 24px; border-radius: 8px; margin-top: 20px; text-align: center;">
                  <p style="margin: 0 0 8px 0; font-size: 16px; font-weight: 600; color: #fff;">RehabLookup</p>
                  <p style="margin: 0 0 12px 0; font-size: 12px; color: rgba(255,255,255,0.7);">Admin System</p>
                  <p style="margin: 0; font-size: 11px; color: rgba(255,255,255,0.5);">© ${new Date().getFullYear()} RehabLookup. All rights reserved.</p>
                </div>
              </div>
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
        // Only return temp password once - it won't be accessible again
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
