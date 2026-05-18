// ============================================================================
// confirm-password-reset v1.0.0
// ----------------------------------------------------------------------------
// Validates a 6-digit reset OTP and sets the user's new password via
// admin.updateUserById. No magic-link anywhere.
//
// Body: { email, code, newPassword }
// Returns: { success: true }
//
// Vendored from the deployed Supabase function (version 2). Kept in
// sync with the live deployment so the repo is the source of truth.
// ============================================================================
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2?target=denonext";

const VERSION = "1.0.0";
const MAX_ATTEMPTS = 5;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify({ ...body, _version: VERSION }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json(405, { error: "Method not allowed" });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SRK = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    if (!SUPABASE_URL || !SUPABASE_SRK) return json(500, { error: "Server misconfigured" });

    let body: { email?: string; code?: string; newPassword?: string };
    try { body = await req.json(); } catch { return json(400, { error: "Invalid JSON" }); }

    const email = String(body.email ?? "").trim().toLowerCase();
    const code = String(body.code ?? "").trim();
    const newPassword = String(body.newPassword ?? "");

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      return json(400, { error: "Valid email required", code: "INVALID_EMAIL" });
    if (!/^\d{6}$/.test(code))
      return json(400, { error: "Code must be 6 digits", code: "INVALID_CODE" });
    if (newPassword.length < 8)
      return json(400, { error: "Password must be at least 8 characters", code: "WEAK_PASSWORD" });

    const svc = createClient(SUPABASE_URL, SUPABASE_SRK);
    const now = new Date().toISOString();

    const { data: rec, error: fetchErr } = await svc
      .from("email_verification_codes")
      .select("*")
      .eq("email", email)
      .eq("purpose", "password_reset")
      .eq("verified", false)
      .gt("expires_at", now)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (fetchErr) {
      console.error("[CONFIRM-PASSWORD-RESET] fetch failed", fetchErr.message);
      return json(500, { error: "Failed to verify code" });
    }
    if (!rec) return json(400, { error: "Invalid or expired reset code. Please request a new one.", code: "NO_CODE" });

    const attempts = rec.attempts || 0;
    if (attempts >= MAX_ATTEMPTS) {
      await svc.from("email_verification_codes")
        .update({ expires_at: new Date(0).toISOString() })
        .eq("id", rec.id);
      return json(400, { error: "Too many incorrect attempts. Please request a new code.", code: "TOO_MANY_ATTEMPTS" });
    }

    if (rec.code !== code) {
      await svc.from("email_verification_codes").update({ attempts: attempts + 1 }).eq("id", rec.id);
      const remaining = MAX_ATTEMPTS - attempts - 1;
      const msg = remaining > 0
        ? `Invalid code. ${remaining} attempt${remaining === 1 ? "" : "s"} remaining.`
        : "Invalid code. Too many incorrect attempts. Please request a new code.";
      return json(400, { error: msg, code: "INVALID_CODE" });
    }

    // Look up user by email.
    // deno-lint-ignore no-explicit-any
    const { data: usersData, error: listErr } = await (svc.auth.admin as any).listUsers({
      filter: `email.eq.${email}`,
      perPage: 1,
    });
    if (listErr) {
      console.error("[CONFIRM-PASSWORD-RESET] listUsers failed", listErr.message);
      return json(500, { error: "Failed to reset password" });
    }
    // deno-lint-ignore no-explicit-any
    const users = (usersData as any)?.users ?? [];
    const user = users.find((u: { email?: string }) => u.email?.toLowerCase() === email);
    if (!user) {
      // Don't leak existence; pretend success.
      console.log("[CONFIRM-PASSWORD-RESET] no user for valid code (shouldn't happen)");
      return json(200, { success: true });
    }

    const { error: updErr } = await svc.auth.admin.updateUserById(user.id, {
      password: newPassword,
      email_confirm: true,
    });
    if (updErr) {
      console.error("[CONFIRM-PASSWORD-RESET] update password failed", updErr.message);
      return json(500, { error: "Failed to update password", code: "UPDATE_FAILED" });
    }

    // Mark the code consumed.
    await svc.from("email_verification_codes")
      .update({ verified: true, verified_at: new Date().toISOString() })
      .eq("id", rec.id);

    console.log(`[CONFIRM-PASSWORD-RESET] password reset for ${email.substring(0, 3)}***`);
    return json(200, { success: true });
  } catch (e) {
    console.error("[CONFIRM-PASSWORD-RESET] unhandled", e instanceof Error ? e.message : String(e));
    return json(500, { error: "Internal error" });
  }
});
