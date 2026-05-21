/**
 * admin-bulk-update-admin-users — admin-only bulk action on
 * admin_user_profiles. Actions:
 *   - suspend            ban user in auth + set status=suspended (super_admin only)
 *   - unsuspend          unban user + set status=active (super_admin only)
 *   - reset_password     generate new temp password + email it (super_admin only)
 *   - resend_invitation  rotate temp password for pending_password_reset users (super_admin only)
 *
 * Delete is NOT supported in bulk — the per-row audit weight and the
 * "cannot delete the last admin" guard belong in the single-action path
 * (manage-admin-user), where a confirmation dialog and final sanity
 * checks happen one row at a time.
 *
 * Mirrors admin-bulk-update-blog-articles / admin-bulk-update-marketing-leads:
 *   1. JWT + has_role admin gate
 *   2. Super admin tier required (no manager exception — these are
 *      destructive on admin accounts)
 *   3. 50-row cap (lower than 100; bulk on admin accounts is a power tool)
 *   4. UUID-array validation
 *   5. No self-modification — skipped with reason=self_modification
 *   6. No super_admin targets — skipped with reason=cannot_modify_super_admin
 *      (super admins are managed one-at-a-time through the single path)
 *   7. Skips no-ops as `skipped`
 *   8. Per-row admin_audit_log entry
 *   9. Returns partial-success summary
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2?target=denonext";
import { Resend } from "https://esm.sh/resend@2.0.0?target=denonext";

const VERSION = "1.0.0";
const MAX_PER_REQUEST = 50;
const VALID_ACTIONS = new Set([
  "suspend",
  "unsuspend",
  "reset_password",
  "resend_invitation",
]);
const TEMP_PASSWORD_CHARS =
  "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function generateTempPassword(): string {
  let password = "";
  for (let i = 0; i < 12; i++) {
    password += TEMP_PASSWORD_CHARS.charAt(
      Math.floor(Math.random() * TEMP_PASSWORD_CHARS.length),
    );
  }
  return password;
}

function passwordResetEmailHtml(firstName: string, tempPassword: string, loginUrl: string): string {
  const safeName = firstName.replace(/[<>&"']/g, (c) => ({
    "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&#39;",
  }[c]!));
  return `<!DOCTYPE html><html><body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f3f4f6;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:32px 16px;">
      <tr><td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:12px;overflow:hidden;">
          <tr><td style="background:linear-gradient(135deg,#1e3a8a 0%,#3b5fa8 100%);padding:32px;color:#ffffff;">
            <p style="margin:0 0 8px;font-size:12px;text-transform:uppercase;letter-spacing:1px;opacity:0.7;">RehabLookup Admin</p>
            <h1 style="margin:0;font-size:24px;font-weight:600;">Password Reset</h1>
          </td></tr>
          <tr><td style="padding:32px;">
            <p style="margin:0 0 20px;color:#374151;font-size:16px;line-height:1.6;">Hello ${safeName},</p>
            <p style="margin:0 0 24px;color:#374151;font-size:16px;line-height:1.6;">Your admin password has been reset. Here is your new temporary password:</p>
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;margin-bottom:24px;">
              <tr><td style="padding:24px;text-align:center;">
                <p style="margin:0;font-size:24px;font-weight:600;color:#1e3a8a;font-family:'Courier New',monospace;letter-spacing:2px;">${tempPassword}</p>
              </td></tr>
            </table>
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#fef3c7;border:1px solid #fcd34d;border-radius:8px;margin-bottom:24px;">
              <tr><td style="padding:16px;color:#92400e;font-size:14px;line-height:1.5;">
                <strong>Important:</strong> This password expires in 72 hours. You must change it upon login.
              </td></tr>
            </table>
            <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
              <a href="${loginUrl}" style="display:inline-block;background:#1e3a8a;color:#ffffff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px;">Login Now</a>
            </td></tr></table>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body></html>`;
}

function invitationEmailHtml(
  displayName: string,
  email: string,
  tempPassword: string,
  loginUrl: string,
): string {
  const safeName = displayName.replace(/[<>&"']/g, (c) => ({
    "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&#39;",
  }[c]!));
  const safeEmail = email.replace(/[<>&"']/g, (c) => ({
    "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&#39;",
  }[c]!));
  return `<!DOCTYPE html><html><body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f3f4f6;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:32px 16px;">
      <tr><td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:12px;overflow:hidden;">
          <tr><td style="background:linear-gradient(135deg,#1e3a8a 0%,#3b5fa8 100%);padding:32px;color:#ffffff;">
            <p style="margin:0 0 8px;font-size:12px;text-transform:uppercase;letter-spacing:1px;opacity:0.7;">RehabLookup Admin</p>
            <h1 style="margin:0;font-size:24px;font-weight:600;">Admin Invitation (Resent)</h1>
          </td></tr>
          <tr><td style="padding:32px;">
            <p style="margin:0 0 20px;color:#374151;font-size:16px;line-height:1.6;">Hello ${safeName},</p>
            <p style="margin:0 0 24px;color:#374151;font-size:16px;line-height:1.6;">Your invitation to the RehabLookup Admin Panel has been resent. Here are your new login credentials:</p>
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;margin-bottom:24px;">
              <tr><td style="padding:24px;">
                <p style="margin:0 0 4px;font-size:12px;color:#6b7280;text-transform:uppercase;">Email</p>
                <p style="margin:0 0 16px;font-size:15px;font-weight:600;color:#1e3a8a;">${safeEmail}</p>
                <p style="margin:0 0 4px;font-size:12px;color:#6b7280;text-transform:uppercase;">Temporary Password</p>
                <p style="margin:0;font-size:18px;font-weight:600;color:#1e3a8a;font-family:'Courier New',monospace;letter-spacing:1px;">${tempPassword}</p>
              </td></tr>
            </table>
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#fef3c7;border:1px solid #fcd34d;border-radius:8px;margin-bottom:24px;">
              <tr><td style="padding:16px;color:#92400e;font-size:14px;line-height:1.5;">
                <strong>Important:</strong> This password expires in 72 hours. You must change it upon login.
              </td></tr>
            </table>
            <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
              <a href="${loginUrl}" style="display:inline-block;background:#1e3a8a;color:#ffffff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px;">Login Now</a>
            </td></tr></table>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body></html>`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json(405, { error: "Use POST", code: "method_not_allowed" });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json(401, { error: "Unauthorized", code: "auth_missing" });

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendApiKey = Deno.env.get("RESEND_API_KEY");

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    const { data: { user }, error: userErr } = await userClient.auth.getUser();
    if (userErr || !user) return json(401, { error: "Invalid auth", code: "auth_invalid" });

    const { data: isAdmin } = await userClient.rpc("has_role", {
      _user_id: user.id,
      _role: "admin",
    });
    if (!isAdmin) return json(403, { error: "Admin role required", code: "forbidden" });

    const { data: isSuperAdmin } = await userClient.rpc("is_super_admin", {
      _user_id: user.id,
    });
    if (!isSuperAdmin) {
      return json(403, {
        error: "Only super admins may bulk-manage admin users",
        code: "super_admin_required",
      });
    }

    let body: { userIds?: unknown; action?: unknown; reason?: unknown };
    try {
      body = await req.json();
    } catch {
      return json(400, { error: "Invalid JSON", code: "invalid_json" });
    }

    const userIds = body.userIds;
    const action = body.action;
    const reason = typeof body.reason === "string" ? body.reason.trim().slice(0, 500) : null;

    if (!Array.isArray(userIds) || userIds.length === 0) {
      return json(400, { error: "userIds[] is required", code: "invalid_user_ids" });
    }
    if (userIds.length > MAX_PER_REQUEST) {
      return json(400, {
        error: `Cannot process more than ${MAX_PER_REQUEST} users at once`,
        code: "batch_too_large",
      });
    }
    for (const id of userIds) {
      if (typeof id !== "string" || !UUID_REGEX.test(id)) {
        return json(400, {
          error: `Invalid user ID: ${String(id).slice(0, 40)}`,
          code: "invalid_user_id",
        });
      }
    }
    if (typeof action !== "string" || !VALID_ACTIONS.has(action)) {
      return json(400, {
        error: `action must be one of: ${Array.from(VALID_ACTIONS).join(", ")}`,
        code: "invalid_action",
      });
    }

    // Load target profiles in one round-trip
    const { data: targetProfiles, error: loadErr } = await adminClient
      .from("admin_user_profiles")
      .select("user_id, status, display_name, first_name, admin_role")
      .in("user_id", userIds as string[]);
    if (loadErr) {
      return json(500, { error: "Failed to load admin profiles", code: "lookup_failed" });
    }
    const profileMap = new Map(targetProfiles?.map((p) => [p.user_id, p]) ?? []);

    // Load emails from auth.users via the security-definer view used elsewhere
    const emailMap = new Map<string, string>();
    {
      const { data: emails, error: emailErr } = await adminClient
        .from("profiles")
        .select("user_id, email")
        .in("user_id", userIds as string[]);
      if (!emailErr && emails) {
        for (const row of emails) {
          if (row.email) emailMap.set(row.user_id, row.email);
        }
      }
    }

    const resend = resendApiKey ? new Resend(resendApiKey) : null;
    const loginUrl = "https://rehablookup.com/admin/login";

    const results: Array<{
      user_id: string;
      status: "ok" | "skipped" | "error";
      reason?: string;
    }> = [];

    for (const targetUserId of userIds as string[]) {
      try {
        // Self-modification guard — never let an admin bulk-affect their own account
        if (targetUserId === user.id) {
          results.push({ user_id: targetUserId, status: "skipped", reason: "self_modification" });
          continue;
        }

        const profile = profileMap.get(targetUserId);
        if (!profile) {
          results.push({ user_id: targetUserId, status: "error", reason: "profile_not_found" });
          continue;
        }

        // Super-admin protection: never let bulk operations touch super-admin
        // accounts. The single-path manage-admin-user can — by the same super
        // admin — but bulk by mistake is too easy.
        if (profile.admin_role === "super_admin") {
          results.push({
            user_id: targetUserId,
            status: "skipped",
            reason: "cannot_modify_super_admin",
          });
          continue;
        }

        const targetEmail = emailMap.get(targetUserId) ?? null;
        const targetFirstName = profile.first_name || profile.display_name || "Admin";

        if (action === "suspend") {
          if (profile.status === "suspended") {
            results.push({ user_id: targetUserId, status: "skipped", reason: "already_suspended" });
            continue;
          }

          const { error: updErr } = await adminClient
            .from("admin_user_profiles")
            .update({ status: "suspended", updated_at: new Date().toISOString() })
            .eq("user_id", targetUserId);
          if (updErr) throw new Error(`status update failed: ${updErr.message}`);

          const { error: banErr } = await adminClient.auth.admin.updateUserById(
            targetUserId,
            { ban_duration: "876000h" },
          );
          if (banErr) throw new Error(`auth ban failed: ${banErr.message}`);

          await adminClient.from("admin_audit_log").insert({
            admin_user_id: user.id,
            action_type: "admin_user_bulk_suspended",
            target_type: "admin_user",
            target_id: targetUserId,
            details: {
              email: targetEmail,
              admin_role: profile.admin_role,
              bulk_operation: true,
              batch_size: userIds.length,
              reason,
            },
          });
        } else if (action === "unsuspend") {
          if (profile.status !== "suspended") {
            results.push({
              user_id: targetUserId,
              status: "skipped",
              reason: "not_suspended",
            });
            continue;
          }

          const { error: updErr } = await adminClient
            .from("admin_user_profiles")
            .update({ status: "active", updated_at: new Date().toISOString() })
            .eq("user_id", targetUserId);
          if (updErr) throw new Error(`status update failed: ${updErr.message}`);

          const { error: unbanErr } = await adminClient.auth.admin.updateUserById(
            targetUserId,
            { ban_duration: "none" },
          );
          if (unbanErr) throw new Error(`auth unban failed: ${unbanErr.message}`);

          await adminClient.from("admin_audit_log").insert({
            admin_user_id: user.id,
            action_type: "admin_user_bulk_unsuspended",
            target_type: "admin_user",
            target_id: targetUserId,
            details: {
              email: targetEmail,
              admin_role: profile.admin_role,
              bulk_operation: true,
              batch_size: userIds.length,
              reason,
            },
          });
        } else if (action === "reset_password") {
          const tempPassword = generateTempPassword();
          const tempPasswordExpiry = new Date();
          tempPasswordExpiry.setHours(tempPasswordExpiry.getHours() + 72);

          const { error: pwErr } = await adminClient.auth.admin.updateUserById(
            targetUserId,
            { password: tempPassword },
          );
          if (pwErr) throw new Error(`password reset failed: ${pwErr.message}`);

          const { error: profileErr } = await adminClient
            .from("admin_user_profiles")
            .upsert(
              {
                user_id: targetUserId,
                status: "pending_password_reset",
                force_password_change: true,
                temp_password_expires_at: tempPasswordExpiry.toISOString(),
                updated_at: new Date().toISOString(),
              },
              { onConflict: "user_id" },
            );
          if (profileErr) throw new Error(`profile update failed: ${profileErr.message}`);

          if (resend && targetEmail) {
            const { error: emailErr } = await resend.emails.send({
              from: "RehabLookup Admin <no-reply@rehablookup.com>",
              to: [targetEmail],
              subject: "Your RehabLookup Admin Password Has Been Reset",
              html: passwordResetEmailHtml(targetFirstName, tempPassword, loginUrl),
            });
            if (emailErr) {
              // Email failure does not undo the password change — flag it but
              // still log success on the password reset itself
              console.warn(
                "[admin-bulk-update-admin-users] reset email failed:",
                emailErr,
                "for user:",
                targetUserId,
              );
            }
          }

          await adminClient.from("admin_audit_log").insert({
            admin_user_id: user.id,
            action_type: "admin_user_bulk_password_reset",
            target_type: "admin_user",
            target_id: targetUserId,
            details: {
              email: targetEmail,
              admin_role: profile.admin_role,
              email_sent: !!(resend && targetEmail),
              bulk_operation: true,
              batch_size: userIds.length,
              reason,
            },
          });
        } else if (action === "resend_invitation") {
          if (profile.status !== "pending_password_reset") {
            results.push({
              user_id: targetUserId,
              status: "skipped",
              reason: "not_pending_invitation",
            });
            continue;
          }

          const tempPassword = generateTempPassword();
          const tempPasswordExpiry = new Date();
          tempPasswordExpiry.setHours(tempPasswordExpiry.getHours() + 72);

          const { error: pwErr } = await adminClient.auth.admin.updateUserById(
            targetUserId,
            { password: tempPassword },
          );
          if (pwErr) throw new Error(`password reset failed: ${pwErr.message}`);

          const { error: profileErr } = await adminClient
            .from("admin_user_profiles")
            .update({
              temp_password_expires_at: tempPasswordExpiry.toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq("user_id", targetUserId);
          if (profileErr) throw new Error(`profile update failed: ${profileErr.message}`);

          if (resend && targetEmail) {
            const displayName = profile.display_name || targetFirstName;
            const { error: emailErr } = await resend.emails.send({
              from: "RehabLookup Admin <no-reply@rehablookup.com>",
              to: [targetEmail],
              subject: "Your RehabLookup Admin Invitation (Resent)",
              html: invitationEmailHtml(displayName, targetEmail, tempPassword, loginUrl),
            });
            if (emailErr) {
              console.warn(
                "[admin-bulk-update-admin-users] invitation email failed:",
                emailErr,
                "for user:",
                targetUserId,
              );
            }
          }

          await adminClient.from("admin_audit_log").insert({
            admin_user_id: user.id,
            action_type: "admin_user_bulk_invitation_resent",
            target_type: "admin_user",
            target_id: targetUserId,
            details: {
              email: targetEmail,
              admin_role: profile.admin_role,
              email_sent: !!(resend && targetEmail),
              bulk_operation: true,
              batch_size: userIds.length,
              reason,
            },
          });
        }

        results.push({ user_id: targetUserId, status: "ok" });
      } catch (err) {
        results.push({
          user_id: targetUserId,
          status: "error",
          reason: err instanceof Error ? err.message : String(err),
        });
      }
    }

    const succeeded = results.filter((r) => r.status === "ok").length;
    const skipped = results.filter((r) => r.status === "skipped").length;
    const errored = results.filter((r) => r.status === "error").length;

    return json(200, {
      success: true,
      action,
      succeeded,
      skipped,
      errored,
      results,
      _version: VERSION,
    });
  } catch (err) {
    console.error("[admin-bulk-update-admin-users] error", err);
    return json(500, { error: "Internal server error", code: "internal_error" });
  }
});
