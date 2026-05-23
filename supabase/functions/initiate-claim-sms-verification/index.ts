// ============================================================================
// initiate-claim-sms-verification v1.0.0
// ----------------------------------------------------------------------------
// Verification path 2 of 3: SMS TO FACILITY PHONE.
// Sends a 6-digit OTP via Twilio to the phone number ON FILE for the facility.
//
// Body:  { claimRequestId: uuid }
// Auth:  required (verify_jwt=true). Caller must be the claimant.
// ============================================================================
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2?target=denonext";

const VERSION = "1.0.0";
const OTP_TTL_MIN = 10;
const MAX_ACTIVE_CODES = 3;

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
  console.log(`[INITIATE-CLAIM-SMS] [${VERSION}] [${level}] ${msg}${d}`);
};

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function sixDigit(): string {
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  return String(buf[0] % 1_000_000).padStart(6, "0");
}

function normalizeToE164US(input: string | null | undefined): string | null {
  if (!input || typeof input !== "string") return null;
  const trimmed = input.trim();
  if (!trimmed || !/^[+\d\s().\-]{7,32}$/.test(trimmed)) return null;
  let digits = trimmed.replace(/\D/g, "");
  if (digits.length === 10) digits = `1${digits}`;
  if (digits.length !== 11 || !digits.startsWith("1")) return null;
  const e164 = `+${digits}`;
  if (!/^\+1\d{10}$/.test(e164)) return null;
  return e164;
}

function maskPhone(e164: string): string {
  const last4 = e164.slice(-4);
  return `(•••) •••-${last4}`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json(405, { error: "Method not allowed", code: "METHOD_NOT_ALLOWED" });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_ANON = Deno.env.get("SUPABASE_ANON_KEY");
    const SUPABASE_SRK = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const TWILIO_SID = Deno.env.get("TWILIO_ACCOUNT_SID");
    const TWILIO_TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN");
    const TWILIO_FROM = Deno.env.get("TWILIO_PHONE_NUMBER");
    if (!SUPABASE_URL || !SUPABASE_ANON || !SUPABASE_SRK) {
      log("ERROR", "Missing Supabase env");
      return json(500, { error: "Server misconfigured", code: "SERVER_MISCONFIGURED" });
    }
    if (!TWILIO_SID || !TWILIO_TOKEN || !TWILIO_FROM) {
      log("ERROR", "Missing Twilio env");
      return json(500, { error: "SMS service not configured", code: "SMS_NOT_CONFIGURED" });
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json(401, { error: "Authentication required", code: "AUTH_MISSING" });
    const anon = createClient(SUPABASE_URL, SUPABASE_ANON);
    const token = authHeader.replace(/^Bearer\s+/i, "");
    const { data: u, error: uErr } = await anon.auth.getUser(token);
    if (uErr || !u?.user) return json(401, { error: "Invalid authentication", code: "AUTH_INVALID" });
    const callerId = u.user.id;

    let body: { claimRequestId?: string };
    try { body = await req.json(); } catch { return json(400, { error: "Invalid JSON", code: "BAD_JSON" }); }
    const claimRequestId = String(body.claimRequestId ?? "").trim();
    if (!UUID_REGEX.test(claimRequestId)) return json(400, { error: "claimRequestId required", code: "INVALID_CLAIM_ID" });

    const svc = createClient(SUPABASE_URL, SUPABASE_SRK);

    const { data: claim, error: cErr } = await svc
      .from("facility_claim_requests")
      .select("id, claimant_user_id, status, facilities!inner ( id, name, phone )")
      .eq("id", claimRequestId)
      .maybeSingle();
    if (cErr) { log("ERROR", "claim lookup", { error: cErr.message }); return json(500, { error: "Internal error", code: "DB_ERROR" }); }
    if (!claim) return json(404, { error: "Claim not found", code: "CLAIM_NOT_FOUND" });
    if (claim.claimant_user_id !== callerId) return json(403, { error: "Not the claimant on this request", code: "NOT_CLAIMANT" });
    if (claim.status !== "pending" && claim.status !== "under_review") {
      return json(409, { error: `Claim is ${claim.status}; cannot start verification`, code: "CLAIM_NOT_OPEN" });
    }

    // deno-lint-ignore no-explicit-any
    const fac = (claim as any).facilities;
    const e164 = normalizeToE164US(fac?.phone);
    if (!e164) {
      return json(409, {
        error: "This facility has no SMS-capable US phone on file. Try email or document upload.",
        code: "PHONE_NOT_AVAILABLE",
      });
    }

    const { count: activeCodes } = await svc
      .from("phone_verification_codes")
      .select("id", { count: "exact", head: true })
      .eq("claim_request_id", claimRequestId)
      .eq("purpose", "claim_verification")
      .eq("verified", false)
      .gte("expires_at", new Date().toISOString());
    if ((activeCodes ?? 0) >= MAX_ACTIVE_CODES) {
      return json(429, { error: "Too many active codes. Wait 10 minutes or check the facility phone.", code: "TOO_MANY_CODES" });
    }

    const code = sixDigit();
    const expiresAt = new Date(Date.now() + OTP_TTL_MIN * 60 * 1000).toISOString();
    const { error: insErr } = await svc.from("phone_verification_codes").insert({
      phone: e164, code, expires_at: expiresAt, attempts: 0, verified: false,
      claim_request_id: claimRequestId, purpose: "claim_verification",
    });
    if (insErr) { log("ERROR", "otp insert", { error: insErr.message }); return json(500, { error: "Failed to issue code", code: "OTP_INSERT_FAILED" }); }

    const { error: updErr } = await svc.from("facility_claim_requests").update({
      verification_method: "sms_phone",
      verification_status: "pending",
      verification_phone: e164,
      updated_at: new Date().toISOString(),
    }).eq("id", claimRequestId);
    if (updErr) log("WARN", "claim update", { error: updErr.message });

    const facName = String(fac?.name ?? "this listing").slice(0, 60);
    const messageBody = `RehabLookup: Your claim verification code is ${code}. It expires in ${OTP_TTL_MIN} minutes. If you didn't request this, ignore this message. Claim for: ${facName}`;
    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_SID}/Messages.json`;
    const authStr = btoa(`${TWILIO_SID}:${TWILIO_TOKEN}`);
    // See send-sms-verification-code/index.ts for full rationale on
    // why HTTP-2xx + status="failed" is treated as a hard error.
    // Short version: Twilio queues messages first and reports
    // carrier-level rejection (A2P 10DLC, trial restrictions, etc.) in
    // the response body — not the HTTP status.
    const statusCallback = Deno.env.get("TWILIO_STATUS_CALLBACK_URL");
    const twBody = new URLSearchParams({ To: e164, From: TWILIO_FROM, Body: messageBody.slice(0, 320) });
    if (statusCallback) twBody.append("StatusCallback", statusCallback);

    let twResultStatus: string | undefined;
    let twResultSid: string | undefined;
    try {
      const twRes = await fetch(twilioUrl, {
        method: "POST",
        headers: {
          "Authorization": `Basic ${authStr}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: twBody,
      });
      // Parse body whether OK or not — Twilio embeds failure details
      // in the response payload alongside 2xx responses.
      let twResult: {
        sid?: string;
        status?: string;
        error_code?: number | null;
        error_message?: string | null;
        message?: string;
        code?: number;
      } = {};
      try {
        twResult = await twRes.json();
      } catch {
        twResult = {};
      }
      twResultStatus = twResult.status;
      twResultSid = twResult.sid;

      if (!twRes.ok) {
        log("ERROR", "twilio HTTP error", {
          status: twRes.status,
          twilioCode: twResult.code,
          twilioMessage: twResult.message?.slice(0, 200),
        });
        return json(502, {
          error: "Failed to send verification SMS",
          code: "SMS_SEND_FAILED",
          twilioCode: twResult.code ?? null,
          twilioMessage: twResult.message ?? null,
        });
      }

      if (twResult.status === "failed" || twResult.status === "undelivered") {
        log("ERROR", "twilio reported message failed in body", {
          twilioStatus: twResult.status,
          twilioErrorCode: twResult.error_code,
          twilioErrorMessage: twResult.error_message,
          sid: twResult.sid,
        });
        return json(502, {
          error: "Twilio reported delivery failure. Check the Twilio console for the message status.",
          code: "SMS_DELIVERY_FAILED",
          twilioStatus: twResult.status,
          twilioErrorCode: twResult.error_code ?? null,
          twilioErrorMessage: twResult.error_message ?? null,
        });
      }
    } catch (sendErr) {
      log("ERROR", "twilio exception", { error: String(sendErr) });
      return json(502, { error: "Failed to send verification SMS", code: "SMS_SEND_FAILED" });
    }

    log("INFO", "Code queued at Twilio", { claimRequestId, last4: e164.slice(-4), twilioStatus: twResultStatus, sid: twResultSid });
    return json(200, {
      success: true,
      method: "sms_phone",
      expiresAt,
      maskedPhone: maskPhone(e164),
    });
  } catch (e) {
    log("ERROR", "unhandled", { error: e instanceof Error ? e.message : String(e) });
    return json(500, { error: "Internal error", code: "UNHANDLED" });
  }
});
