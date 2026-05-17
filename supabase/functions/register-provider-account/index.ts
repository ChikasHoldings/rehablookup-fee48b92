// ============================================================================
// register-provider-account v1.1.0
// ----------------------------------------------------------------------------
// Replaces client-side supabase.auth.signUp() for the provider signup path so
// we NEVER trigger Supabase's built-in email-confirmation magic link. We use
// admin.createUser with email_confirm:false (no email sent), then our own
// 6-digit OTP via send-verification-code, then verify-code marks the user
// confirmed server-side. After confirmation the client signs in with password.
//
// `autoConfirm:true` is allowed for seeker flows that arrive from an intake
// form where the email was already used as the contact channel (concierge,
// international placement). Provider signups never set this.
//
// Body: { email, password, firstName, lastName, accountType?: 'provider'|'seeker', autoConfirm?: boolean }
// Returns: { userId } on success.
// ============================================================================
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2?target=denonext";

const VERSION = "1.1.0";

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

const log = (level: "INFO" | "WARN" | "ERROR", msg: string, details?: unknown) => {
  const d = details ? ` | ${JSON.stringify(details)}` : "";
  console.log(`[REGISTER-PROVIDER-ACCOUNT] [${VERSION}] [${level}] ${msg}${d}`);
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json(405, { error: "Method not allowed", code: "METHOD_NOT_ALLOWED" });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SRK = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!SUPABASE_URL || !SUPABASE_SRK) {
      log("ERROR", "Missing env");
      return json(500, { error: "Server misconfigured", code: "SERVER_MISCONFIGURED" });
    }

    let body: {
      email?: string;
      password?: string;
      firstName?: string;
      lastName?: string;
      accountType?: string;
      autoConfirm?: boolean;
    };
    try { body = await req.json(); } catch { return json(400, { error: "Invalid JSON", code: "BAD_JSON" }); }

    const email = String(body.email ?? "").trim().toLowerCase();
    const password = String(body.password ?? "");
    const firstName = String(body.firstName ?? "").trim().slice(0, 80);
    const lastName = String(body.lastName ?? "").trim().slice(0, 80);
    const accountType = body.accountType === "seeker" ? "seeker" : "provider";
    // Auto-confirm is only honored for seeker flows arriving from intake forms
    // (concierge / international thank-you). Provider signups always go through
    // the 6-digit OTP step.
    const autoConfirm = accountType === "seeker" && body.autoConfirm === true;

    if (!email || !EMAIL_REGEX.test(email)) return json(400, { error: "Valid email required", code: "INVALID_EMAIL" });
    if (!password || password.length < 8) return json(400, { error: "Password must be at least 8 characters", code: "WEAK_PASSWORD" });
    if (!firstName) return json(400, { error: "First name required", code: "MISSING_FIRST_NAME" });
    if (!lastName) return json(400, { error: "Last name required", code: "MISSING_LAST_NAME" });

    const svc = createClient(SUPABASE_URL, SUPABASE_SRK);

    try {
      const [seekerRes, providerRes, adminRes] = await Promise.all([
        svc.rpc("is_email_seeker", { p_email: email }),
        svc.rpc("is_email_provider", { p_email: email }).then(
          (r) => r,
          () => ({ data: null, error: { message: "rpc-missing" } }),
        ),
        svc.rpc("is_email_admin", { p_email: email }),
      ]);
      if (!seekerRes.error && seekerRes.data && accountType === "provider") {
        return json(409, { error: "This email is registered as a personal account. Use a different email.", code: "EMAIL_IS_SEEKER" });
      }
      // Some deployments don't have is_email_provider yet — ignore failures.
      if (providerRes && !providerRes.error && providerRes.data && accountType === "seeker") {
        return json(409, { error: "This email is registered as a facility provider. Use a different email.", code: "EMAIL_IS_PROVIDER" });
      }
      if (!adminRes.error && adminRes.data) {
        return json(409, { error: "This email is associated with an administrative account.", code: "EMAIL_IS_ADMIN" });
      }
    } catch (e) {
      log("WARN", "cross-account check failed; continuing", { error: String(e) });
    }

    const { data: createRes, error: createErr } = await svc.auth.admin.createUser({
      email,
      password,
      email_confirm: autoConfirm,
      user_metadata: {
        account_type: accountType,
        first_name: firstName,
        last_name: lastName,
      },
    });

    if (createErr) {
      const msg = (createErr.message ?? "").toLowerCase();
      if (msg.includes("already") || msg.includes("exists") || msg.includes("duplicate")) {
        return json(409, { error: "An account with this email already exists. Try signing in instead.", code: "USER_EXISTS" });
      }
      if (msg.includes("password")) {
        return json(400, { error: createErr.message, code: "WEAK_PASSWORD" });
      }
      log("ERROR", "admin.createUser failed", { error: createErr.message });
      return json(500, { error: "Failed to create account", code: "CREATE_FAILED" });
    }

    const userId = createRes?.user?.id;
    if (!userId) {
      log("ERROR", "createUser returned no user");
      return json(500, { error: "Failed to create account", code: "CREATE_FAILED" });
    }

    log("INFO", "Account created", { userId, accountType, autoConfirm });
    return json(200, { success: true, userId, autoConfirmed: autoConfirm });
  } catch (e) {
    log("ERROR", "unhandled", { error: e instanceof Error ? e.message : String(e) });
    return json(500, { error: "Internal error", code: "UNHANDLED" });
  }
});
