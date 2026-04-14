import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { sendEmailWithRetry } from "../_shared/resilient-email-sender.ts";

const VERSION = "2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface CreateAdminUserRequest {
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  adminRole: "super_admin" | "manager" | "customer_rep" | "advisor";
  employmentType?: "employee" | "contractor" | "va";
  commissionRate?: number;
  hireDate?: string;
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

const ROLE_LABELS: Record<string, string> = {
  super_admin: "Super Admin",
  manager: "Manager",
  customer_rep: "Customer Rep",
  advisor: "Placement Advisor",
};

function getRoleWelcomeContent(role: string, employmentType?: string, commissionRate?: number): { headline: string; description: string; capabilities: string[] } {
  switch (role) {
    case "super_admin":
      return {
        headline: "Full Platform Access Granted",
        description: "You've been granted full platform access as a Super Admin. You can manage all staff, settings, and system operations across the entire RehabLookup platform.",
        capabilities: [
          "Manage all admin staff, roles & permissions",
          "Access Back Office oversight & impersonation",
          "Configure system settings & integrations",
          "View all analytics, audit logs & escalations",
          "Full access to every module and workflow",
        ],
      };
    case "manager":
      return {
        headline: "Welcome, Manager",
        description: "You've been added as a Manager. You oversee day-to-day platform operations, manage staff, and ensure smooth workflows across the platform.",
        capabilities: [
          "Manage providers, leads & subscriptions",
          "Oversee advisors and customer reps",
          "Handle escalations from team members",
          "View analytics and operational reports",
          "Moderate reviews and manage users",
        ],
      };
    case "advisor":
      return {
        headline: "Welcome, Placement Advisor",
        description: employmentType === "contractor"
          ? `You've been added as a Placement Advisor (Contractor). Your commission rate is ${commissionRate || 10}% per successful placement. You'll be able to track your earnings from your dashboard.`
          : "You've been added as a Placement Advisor. You'll manage placement cases, coordinate between seekers and providers, and handle the full placement workflow.",
        capabilities: [
          "View and claim new placement cases",
          "Match seekers with verified providers",
          "Communicate with seekers & providers",
          "Coordinate tours and admissions",
          "Track placement outcomes & follow-ups",
          ...(employmentType === "contractor" ? ["Track commissions & earnings"] : []),
        ],
      };
    case "customer_rep":
      return {
        headline: employmentType === "va" ? "Welcome, Virtual Assistant" : "Welcome, Customer Rep",
        description: employmentType === "va"
          ? "You've been added as a Customer Rep (Virtual Assistant). You'll handle support inquiries, assist users, and help maintain platform quality within your assigned scope."
          : "You've been added as a Customer Rep. You'll handle support inquiries, moderate reviews, and assist users with platform questions.",
        capabilities: [
          "Handle support tickets & user inquiries",
          "Moderate facility reviews",
          "Assist with onboarding & platform usage",
          "Escalate issues to managers",
          "Manage lead communications",
        ],
      };
    default:
      return { headline: "Welcome", description: "Your admin account has been created.", capabilities: [] };
  }
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

    // CRITICAL: Only Super Admins can create admin users
    const { data: isSuperAdmin } = await supabase.rpc("is_super_admin", {
      _user_id: requestingUser.id,
    });

    if (!isSuperAdmin) {
      throw new Error("Only Super Admins can create admin users");
    }

    const body: CreateAdminUserRequest = await req.json();
    const { email, firstName, lastName, phone, adminRole, employmentType, commissionRate, hireDate, permissions } = body;

    // Validate role value
    const validRoles = ["super_admin", "manager", "customer_rep", "advisor"];
    if (!validRoles.includes(adminRole)) {
      throw new Error("Invalid admin role");
    }

    const displayName = `${firstName} ${lastName}`.trim();
    console.log(`[CREATE-ADMIN-USER] v${VERSION} Creating:`, { email, displayName, adminRole, employmentType });

    // Check if user already exists with this email
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find(u => u.email?.toLowerCase() === email.toLowerCase());
    
    if (existingUser) {
      const { data: hasProviderProfile } = await supabase.rpc("user_has_provider_profile", { p_user_id: existingUser.id });
      const { data: hasSeekerProfile } = await supabase.rpc("user_has_seeker_profile", { p_user_id: existingUser.id });
      const { data: isAlreadyAdmin } = await supabase.rpc("has_role", { _user_id: existingUser.id, _role: "admin" });
      
      if (hasProviderProfile) throw new Error("This email belongs to an existing provider account and cannot be made an admin");
      if (hasSeekerProfile) throw new Error("This email belongs to an existing seeker account and cannot be made an admin");
      if (isAlreadyAdmin) throw new Error("This user is already an admin");
      throw new Error("A user with this email address already exists in the system");
    }

    // Generate temporary password
    const tempPassword = generateTempPassword();
    const tempPasswordExpiry = new Date();
    tempPasswordExpiry.setHours(tempPasswordExpiry.getHours() + 72);

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

    // Assign admin role in user_roles table
    const { error: roleError } = await supabase.from("user_roles").insert({
      user_id: userId,
      role: "admin",
    });

    if (roleError) {
      console.error("[CREATE-ADMIN-USER] Failed to assign role:", roleError);
      await supabase.auth.admin.deleteUser(userId);
      throw new Error("Failed to assign admin role. Please try again.");
    }

    // Create admin profile with classification fields
    const profileData: Record<string, any> = {
      user_id: userId,
      display_name: displayName,
      first_name: firstName,
      last_name: lastName || null,
      admin_role: adminRole,
      status: "pending_password_reset",
      force_password_change: true,
      temp_password_expires_at: tempPasswordExpiry.toISOString(),
      created_by: requestingUser.id,
    };

    if (phone) profileData.phone = phone;
    if (employmentType) profileData.employment_type = employmentType;
    if (commissionRate !== undefined && employmentType === "contractor") profileData.commission_rate = commissionRate;
    if (hireDate) profileData.hire_date = hireDate;

    const { error: adminProfileError } = await supabase.from("admin_user_profiles").insert(profileData);

    if (adminProfileError) {
      console.error("[CREATE-ADMIN-USER] Failed to create admin profile:", adminProfileError);
    }

    // Build permissions
    const permissionInserts = Object.entries(permissions).map(([key, granted]) => ({
      user_id: userId,
      permission_key: key,
      granted,
    }));

    if (adminRole === "super_admin") {
      const hasSuperAdminPerm = permissionInserts.some(p => p.permission_key === "super_admin");
      if (!hasSuperAdminPerm) {
        permissionInserts.push({ user_id: userId, permission_key: "super_admin", granted: true });
      }
    }

    if (permissionInserts.length > 0) {
      const { error: permError } = await supabase.from("admin_user_permissions").insert(permissionInserts);
      if (permError) console.error("[CREATE-ADMIN-USER] Failed to insert permissions:", permError);
    }

    // Log the action
    await supabase.from("admin_audit_log").insert({
      admin_user_id: requestingUser.id,
      action_type: "admin_user_created",
      target_type: "admin_user",
      target_id: userId,
      details: { email, display_name: displayName, admin_role: adminRole, employment_type: employmentType, permissions },
    });

    // Send role-specific welcome email
    if (resendApiKey) {
      const resend = new Resend(resendApiKey);
      const loginUrl = "https://rehablookup.com/admin/login";
      const roleLabel = ROLE_LABELS[adminRole] || adminRole;
      const welcome = getRoleWelcomeContent(adminRole, employmentType, commissionRate);

      const capabilitiesHtml = welcome.capabilities.map(c => 
        `<tr><td style="padding: 6px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; font-size: 14px; color: #374151; line-height: 1.5;">✓ ${escapeHtml(c)}</td></tr>`
      ).join("");

      const employmentBadge = employmentType 
        ? `<span style="display: inline-block; background: #EBF5FF; color: #1B365D; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; margin-left: 8px;">${employmentType === "va" ? "Virtual Assistant" : employmentType.charAt(0).toUpperCase() + employmentType.slice(1)}</span>` 
        : "";

      try {
        await sendEmailWithRetry(supabase, resend, {
          from: "RehabLookup Admin <no-reply@rehablookup.com>",
          to: [email],
          subject: `Welcome to RehabLookup — You're now a ${roleLabel}`,
          html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #f4f6f9; -webkit-font-smoothing: antialiased;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f6f9;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08);">
          
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #1B365D 0%, #2C4A7F 100%); padding: 40px 32px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; font-size: 24px; font-weight: 700;">
                ${escapeHtml(welcome.headline)}
              </h1>
              <div style="margin-top: 12px;">
                <span style="display: inline-block; background: rgba(255,255,255,0.2); color: #ffffff; padding: 6px 16px; border-radius: 20px; font-size: 13px; font-weight: 600;">${escapeHtml(roleLabel)}</span>
                ${employmentBadge ? employmentBadge.replace('color: #1B365D', 'color: #ffffff').replace('background: #EBF5FF', 'background: rgba(255,255,255,0.15)') : ""}
              </div>
            </td>
          </tr>
          
          <!-- Body -->
          <tr>
            <td style="padding: 40px 32px;">
              <p style="margin: 0 0 20px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; font-size: 17px; color: #1a1a1a; line-height: 1.6;">
                Hello ${escapeHtml(firstName)},
              </p>
              
              <p style="margin: 0 0 28px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; font-size: 15px; color: #4b5563; line-height: 1.7;">
                ${escapeHtml(welcome.description)}
              </p>

              <!-- What You Can Do -->
              ${welcome.capabilities.length > 0 ? `
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; margin-bottom: 28px;">
                <tr>
                  <td style="padding: 24px;">
                    <h3 style="margin: 0 0 16px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; font-size: 15px; font-weight: 600; color: #166534;">
                      What You Can Do
                    </h3>
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                      ${capabilitiesHtml}
                    </table>
                  </td>
                </tr>
              </table>
              ` : ""}
              
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
                          <p style="margin: 0 0 6px 0; font-size: 12px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px;">Email</p>
                          <p style="margin: 0; font-family: 'Courier New', monospace; font-size: 16px; font-weight: 600; color: #1B365D; background: #f1f5f9; padding: 10px 14px; border-radius: 6px;">${email}</p>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 12px 0;">
                          <p style="margin: 0 0 6px 0; font-size: 12px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px;">Temporary Password</p>
                          <p style="margin: 0; font-family: 'Courier New', monospace; font-size: 16px; font-weight: 600; color: #1B365D; background: #f1f5f9; padding: 10px 14px; border-radius: 6px;">${tempPassword}</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              
              <!-- Warning -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background: #fef3c7; border: 1px solid #f59e0b; border-radius: 12px; margin-bottom: 32px;">
                <tr>
                  <td style="padding: 20px;">
                    <p style="margin: 0 0 8px 0; font-size: 15px; font-weight: 600; color: #92400e;">⚠️ Important</p>
                    <p style="margin: 0; font-size: 14px; color: #92400e; line-height: 1.6;">
                      This temporary password expires in <strong>72 hours</strong>. You'll be asked to set a new password on first login. Do not share these credentials.
                    </p>
                  </td>
                </tr>
              </table>
              
              <!-- CTA -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 32px;">
                <tr>
                  <td align="center">
                    <a href="${loginUrl}" style="display: inline-block; background: #1B365D; color: #ffffff; padding: 16px 36px; border-radius: 10px; text-decoration: none; font-weight: 600; font-size: 16px;">
                      Complete Setup →
                    </a>
                  </td>
                </tr>
              </table>
              
              <p style="margin: 0; font-size: 14px; color: #64748b; line-height: 1.6;">
                Questions? Contact your administrator at <a href="mailto:Support@rehablookup.com" style="color: #1B365D; text-decoration: none; font-weight: 500;">Support@rehablookup.com</a>.
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background: #1B365D; padding: 28px 32px; text-align: center;">
              <p style="margin: 0 0 8px 0; font-size: 18px; font-weight: 700; color: #ffffff;">RehabLookup</p>
              <p style="margin: 0; font-size: 12px; color: rgba(255,255,255,0.5);">© ${new Date().getFullYear()} RehabLookup. All rights reserved.</p>
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
        console.log("[CREATE-ADMIN-USER] Welcome email sent to:", email);
      } catch (emailError) {
        console.error("[CREATE-ADMIN-USER] Failed to send email:", emailError);
      }
    }

    // Create role-specific welcome notification
    const roleLabel = ROLE_LABELS[adminRole] || "Admin";
    await supabase.from("admin_user_notifications").insert({
      user_id: userId,
      type: "welcome",
      title: `Welcome to RehabLookup, ${firstName}! 👋`,
      message: `You've been added as a ${roleLabel}. Please change your temporary password to secure your account.`,
      link: "/admin/profile",
    });

    return new Response(
      JSON.stringify({
        success: true,
        userId,
        message: "Admin user created successfully. Welcome email sent.",
        tempPassword,
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("[CREATE-ADMIN-USER] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
