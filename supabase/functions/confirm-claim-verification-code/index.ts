// ============================================================================
// confirm-claim-verification-code v1.0.0
// ----------------------------------------------------------------------------
// Final step of automated verification (paths 1 and 2). Validates a 6-digit
// OTP that was sent via initiate-claim-email-verification OR
// initiate-claim-sms-verification.
//
// Body:  { claimRequestId: uuid, code: string }
// Auth:  required (verify_jwt=true). Caller must be the claimant.
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

const log = (level: "INFO" | "WARN" | "ERROR", msg: string, details?: unknown) => {
  const d = details ? ` | ${JSON.stringify(details)}` : "";
  console.log(`[CONFIRM-CLAIM-CODE] [${VERSION}] [${level}] ${msg}${d}`);
};

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function codesMatch(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json(405, { error: "Method not allowed", code: "METHOD_NOT_ALLOWED" });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_ANON = Deno.env.get("SUPABASE_ANON_KEY");
    const SUPABASE_SRK = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!SUPABASE_URL || !SUPABASE_ANON || !SUPABASE_SRK) {
      log("ERROR", "Missing env");
      return json(500, { error: "Server misconfigured", code: "SERVER_MISCONFIGURED" });
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json(401, { error: "Authentication required", code: "AUTH_MISSING" });
    const anon = createClient(SUPABASE_URL, SUPABASE_ANON);
    const token = authHeader.replace(/^Bearer\s+/i, "");
    const { data: u, error: uErr } = await anon.auth.getUser(token);
    if (uErr || !u?.user) return json(401, { error: "Invalid authentication", code: "AUTH_INVALID" });
    const callerId = u.user.id;

    let body: { claimRequestId?: string; code?: string };
    try { body = await req.json(); } catch { return json(400, { error: "Invalid JSON", code: "BAD_JSON" }); }
    const claimRequestId = String(body.claimRequestId ?? "").trim();
    const code = String(body.code ?? "").trim();
    if (!UUID_REGEX.test(claimRequestId)) return json(400, { error: "claimRequestId required", code: "INVALID_CLAIM_ID" });
    if (!/^\d{6}$/.test(code)) return json(400, { error: "Code must be 6 digits", code: "INVALID_CODE_FORMAT" });

    const svc = createClient(SUPABASE_URL, SUPABASE_SRK);

    const { data: claim, error: cErr } = await svc
      .from("facility_claim_requests")
      .select("id, claimant_user_id, status, verification_method, verification_status")
      .eq("id", claimRequestId)
      .maybeSingle();
    if (cErr) { log("ERROR", "claim lookup", { error: cErr.message }); return json(500, { error: "Internal error", code: "DB_ERROR" }); }
    if (!claim) return json(404, { error: "Claim not found", code: "CLAIM_NOT_FOUND" });
    if (claim.claimant_user_id !== callerId) return json(403, { error: "Not the claimant on this request", code: "NOT_CLAIMANT" });
    if (claim.verification_status === "verified") {
      return json(200, { success: true, alreadyVerified: true });
    }
    if (claim.verification_status === "failed") {
      return json(429, { error: "Verification locked after too many failed attempts. Contact support.", code: "VERIFICATION_LOCKED" });
    }
    if (claim.verification_method !== "email_domain" && claim.verification_method !== "sms_phone") {
      return json(409, { error: "This claim is not using an OTP-based verification method", code: "WRONG_METHOD" });
    }

    const tableName = claim.verification_method === "email_domain"
      ? "email_verification_codes"
      : "phone_verification_codes";

    const { data: otpRow, error: otpErr } = await svc
      .from(tableName)
      .select("id, code, attempts, expires_at, verified")
      .eq("claim_request_id", claimRequestId)
      .eq("purpose", "claim_verification")
      .eq("verified", false)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (otpErr) { log("ERROR", "otp lookup", { error: otpErr.message }); return json(500, { error: "Internal error", code: "DB_ERROR" }); }
    if (!otpRow) return json(410, { error: "No active code. Request a new one.", code: "NO_ACTIVE_CODE" });

    if (new Date(otpRow.expires_at).getTime() < Date.now()) {
      await svc.from("facility_claim_requests").update({
        verification_status: "expired", updated_at: new Date().toISOString(),
      }).eq("id", claimRequestId);
      return json(410, { error: "Code expired. Request a new one.", code: "CODE_EXPIRED" });
    }

    const currentAttempts = otpRow.attempts ?? 0;
    if (currentAttempts >= MAX_ATTEMPTS) {
      await svc.from("facility_claim_requests").update({
        verification_status: "failed", updated_at: new Date().toISOString(),
      }).eq("id", claimRequestId);
      return json(429, { error: "Too many failed attempts. Verification locked.", code: "TOO_MANY_ATTEMPTS" });
    }

    if (!codesMatch(code, String(otpRow.code))) {
      const newAttempts = currentAttempts + 1;
      await svc.from(tableName).update({ attempts: newAttempts }).eq("id", otpRow.id);
      if (newAttempts >= MAX_ATTEMPTS) {
        await svc.from("facility_claim_requests").update({
          verification_status: "failed", updated_at: new Date().toISOString(),
        }).eq("id", claimRequestId);
        return json(429, { error: "Too many failed attempts. Verification locked.", code: "TOO_MANY_ATTEMPTS" });
      }
      const remaining = MAX_ATTEMPTS - newAttempts;
      return json(401, { error: "Incorrect code", code: "CODE_MISMATCH", attemptsRemaining: remaining });
    }

    const nowIso = new Date().toISOString();
    await svc.from(tableName).update({
      verified: true,
      verified_at: nowIso,
    }).eq("id", otpRow.id);

    const { error: claimUpdErr } = await svc.from("facility_claim_requests").update({
      verification_status: "verified",
      verified_at: nowIso,
      updated_at: nowIso,
    }).eq("id", claimRequestId);
    if (claimUpdErr) log("WARN", "claim update", { error: claimUpdErr.message });

    log("INFO", "Code verified", { claimRequestId, method: claim.verification_method });
    return json(200, { success: true, verified: true, verifiedAt: nowIso });
  } catch (e) {
    log("ERROR", "unhandled", { error: e instanceof Error ? e.message : String(e) });
    return json(500, { error: "Internal error", code: "UNHANDLED" });
  }
});
