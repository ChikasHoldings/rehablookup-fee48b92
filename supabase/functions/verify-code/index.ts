// ============================================================================
// verify-code v2.1.0
// ----------------------------------------------------------------------------
// Validates a 6-digit email verification OTP scoped by purpose. On signup
// success, marks auth.users.email_confirmed_at server-side so the user can
// sign in with password without clicking any magic link.
//
// Body: { email, code, purpose? = 'signup' }
// Legacy callers that don't send purpose still work via a fallback lookup
// that ignores the purpose filter — a WARN log surfaces those calls so
// they can be cleaned up.
// ============================================================================
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2?target=denonext";

const VERSION = "2.1.0";
const MAX_ATTEMPTS = 5;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const json = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify({ ...body, _version: VERSION }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const log = (level: "INFO" | "WARN" | "ERROR", msg: string, details?: unknown) => {
  const d = details ? ` | ${JSON.stringify(details)}` : "";
  console.log(`[VERIFY-CODE] [${VERSION}] [${level}] ${msg}${d}`);
};

async function markAuthUserConfirmed(
  svc: ReturnType<typeof createClient>,
  email: string,
) {
  try {
    // deno-lint-ignore no-explicit-any
    const { data, error } = await (svc.auth.admin as any).listUsers({
      filter: `email.eq.${email}`,
      perPage: 1,
    });
    if (error) {
      log("WARN", "listUsers failed", { error: error.message });
      return;
    }
    // deno-lint-ignore no-explicit-any
    const users = (data as any)?.users ?? [];
    const user = users.find((u: { email?: string }) => u.email?.toLowerCase() === email);
    if (!user) return;
    if (user.email_confirmed_at) return;
    const { error: updErr } = await svc.auth.admin.updateUserById(user.id, {
      email_confirm: true,
    });
    if (updErr) log("WARN", "updateUserById email_confirm failed", { error: updErr.message });
  } catch (e) {
    log("WARN", "markAuthUserConfirmed threw", { error: String(e) });
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    let body: { email?: string; code?: string; purpose?: string };
    try { body = await req.json(); } catch { return json(400, { error: "Invalid JSON" }); }

    const email = String(body.email ?? "").trim().toLowerCase();
    const code = String(body.code ?? "").trim();
    const purpose = String(body.purpose ?? "signup");

    if (!email || !code) return json(400, { error: "Email and code are required" });
    if (!/^\d{6}$/.test(code)) return json(400, { error: "Code must be 6 digits" });

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SRK = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const svc = createClient(SUPABASE_URL, SUPABASE_SRK);

    const now = new Date().toISOString();
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    // Idempotency: already verified within 24h for THIS purpose.
    const { data: recent } = await svc
      .from("email_verification_codes")
      .select("id, verified_at")
      .eq("email", email)
      .eq("purpose", purpose)
      .eq("verified", true)
      .not("verified_at", "is", null)
      .gte("verified_at", twentyFourHoursAgo)
      .order("verified_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (recent) {
      log("INFO", "already verified within 24h (idempotent)");
      if (purpose === "signup") await markAuthUserConfirmed(svc, email);
      return json(200, { success: true, verified: true, alreadyVerified: true });
    }

    let rec: { id: string; code: string; attempts: number } | null = null;
    const { data: scoped, error: fetchErr } = await svc
      .from("email_verification_codes")
      .select("*")
      .eq("email", email)
      .eq("purpose", purpose)
      .eq("verified", false)
      .gt("expires_at", now)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (fetchErr) {
      log("ERROR", "fetch failed", { error: fetchErr.message });
      return json(500, { error: "Failed to verify code. Please try again." });
    }
    if (scoped) {
      rec = scoped as typeof rec;
    } else {
      // Tolerate clients that didn't pass purpose yet — fall back to any-purpose
      // lookup for legacy compatibility. Logs surface the fallback so we can
      // clean it up once all callers send purpose.
      const { data: legacy } = await svc
        .from("email_verification_codes")
        .select("*")
        .eq("email", email)
        .eq("verified", false)
        .gt("expires_at", now)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!legacy) return json(400, { error: "Invalid or expired verification code. Please request a new code." });
      log("WARN", "legacy code matched without purpose filter", { purpose });
      rec = legacy as typeof rec;
    }

    if (!rec) return json(400, { error: "Invalid or expired verification code." });

    const attempts = rec.attempts || 0;
    if (attempts >= MAX_ATTEMPTS) {
      await svc.from("email_verification_codes").update({ expires_at: new Date().toISOString() }).eq("id", rec.id);
      return json(400, { error: "Too many incorrect attempts. Please request a new code." });
    }

    if (rec.code !== code) {
      await svc.from("email_verification_codes").update({ attempts: attempts + 1 }).eq("id", rec.id);
      const remaining = MAX_ATTEMPTS - attempts - 1;
      const msg = remaining > 0
        ? `Invalid code. ${remaining} attempt${remaining === 1 ? "" : "s"} remaining.`
        : "Invalid code. Too many incorrect attempts. Please request a new code.";
      log("INFO", `invalid code attempt ${attempts + 1}/${MAX_ATTEMPTS}`);
      return json(400, { error: msg });
    }

    const { error: updErr } = await svc
      .from("email_verification_codes")
      .update({ verified: true, verified_at: new Date().toISOString() })
      .eq("id", rec.id);
    if (updErr) {
      log("ERROR", "mark verified failed", { error: updErr.message });
      return json(500, { error: "Failed to verify code. Please try again." });
    }

    if (purpose === "signup") await markAuthUserConfirmed(svc, email);

    log("INFO", `verified ${email.substring(0, 3)}*** (${purpose})`);
    return json(200, { success: true, verified: true });
  } catch (e) {
    log("ERROR", "unhandled", { error: e instanceof Error ? e.message : String(e) });
    return json(500, { error: e instanceof Error ? e.message : "Failed to verify code" });
  }
});
