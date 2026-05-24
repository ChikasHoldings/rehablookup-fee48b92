/**
 * initiate-claim-voice-otp
 *
 * Voice-OTP rung of the ownership ladder. Highest-confidence signal in
 * the engine (score 90) because the claimant must:
 *   1. Pick up a phone call at the authoritative on-file number, AND
 *   2. Hear the code spoken aloud (Twilio TTS, NOT SMS), AND
 *   3. Type the same code in the wizard.
 *
 * SAFETY: target phone is ALWAYS pulled from facilities.phone — never
 * a claimant-typed number, never a Google Places number. This mirrors
 * the SMS OTP function (initiate-claim-sms-verification) which the
 * engine spec depends on.
 *
 * Flow:
 *   1. Validate caller is the claim's claimant
 *   2. Generate 6-digit OTP (CSPRNG)
 *   3. Insert into phone_verification_codes with purpose='claim_verification_voice'
 *   4. Place a Twilio Voice call to facility.phone with TwiML pointing
 *      at our public twilio-voice-otp-twiml endpoint, which reads the
 *      code aloud twice (Twilio retries TTS if the line is noisy)
 *   5. Return the call SID + masked number to the UI
 *
 * The provider then submits the code via confirm-claim-verification-code
 * (existing function — already method-aware). When that flips
 * `verified=true` on the OTP row, the phone_otp_bridge_trg trigger
 * fires record_ownership_signal(..., 'voice_otp', 90).
 */
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

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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
    const PUBLIC_APP_URL = Deno.env.get("PUBLIC_APP_URL") || "https://rehablookup.com";

    if (!SUPABASE_URL || !SUPABASE_ANON || !SUPABASE_SRK) {
      return json(500, { error: "Server misconfigured", code: "SERVER_MISCONFIGURED" });
    }
    if (!TWILIO_SID || !TWILIO_TOKEN || !TWILIO_FROM) {
      return json(500, { error: "Voice service not configured", code: "VOICE_NOT_CONFIGURED" });
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json(401, { error: "Authentication required", code: "AUTH_MISSING" });
    const anon = createClient(SUPABASE_URL, SUPABASE_ANON);
    const token = authHeader.replace(/^Bearer\s+/i, "");
    const { data: u, error: uErr } = await anon.auth.getUser(token);
    if (uErr || !u?.user) return json(401, { error: "Invalid authentication", code: "AUTH_INVALID" });
    const callerId = u.user.id;

    let body: { claimRequestId?: string };
    try {
      body = await req.json();
    } catch {
      return json(400, { error: "Invalid JSON", code: "BAD_JSON" });
    }
    const claimRequestId = String(body.claimRequestId ?? "").trim();
    if (!UUID_REGEX.test(claimRequestId)) {
      return json(400, { error: "claimRequestId required", code: "INVALID_CLAIM_ID" });
    }

    const svc = createClient(SUPABASE_URL, SUPABASE_SRK);

    // Lookup the claim + facility. RLS-bypass via service role for the
    // join; we re-check claimant ownership below before mutating.
    const { data: claim, error: cErr } = await svc
      .from("facility_claim_requests")
      .select("id, claimant_user_id, status, facilities!inner ( id, name, phone )")
      .eq("id", claimRequestId)
      .maybeSingle();
    if (cErr) {
      console.error("[VOICE-OTP] claim lookup", cErr.message);
      return json(500, { error: "Internal error", code: "DB_ERROR" });
    }
    if (!claim) return json(404, { error: "Claim not found", code: "CLAIM_NOT_FOUND" });
    if (claim.claimant_user_id !== callerId) {
      return json(403, { error: "Not the claimant on this request", code: "NOT_CLAIMANT" });
    }
    if (claim.status === "approved" || claim.status === "rejected") {
      return json(409, { error: "Claim already resolved", code: "CLAIM_RESOLVED" });
    }

    // HARD RULE: target phone from facilities.phone only. No claimant
    // input. No Google Places lookup. The function refuses if the
    // facility has no on-file phone.
    const fac = (claim as { facilities: { id: string; name: string; phone: string | null } }).facilities;
    const e164 = normalizeToE164US(fac?.phone);
    if (!e164) {
      return json(412, {
        error: "This facility has no voice-capable US phone on file. Try email or document upload.",
        code: "NO_VOICE_PHONE",
      });
    }

    // Rate limit: cap active codes per claim in the last 10 minutes
    const tenMinAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const { count: activeCount } = await svc
      .from("phone_verification_codes")
      .select("id", { count: "exact", head: true })
      .eq("claim_request_id", claimRequestId)
      .eq("purpose", "claim_verification_voice")
      .eq("verified", false)
      .gte("created_at", tenMinAgo);
    if ((activeCount ?? 0) >= MAX_ACTIVE_CODES) {
      return json(429, {
        error: "Too many voice OTP requests. Wait 10 minutes or use a different method.",
        code: "TOO_MANY_CODES",
      });
    }

    const code = sixDigit();
    const expiresAt = new Date(Date.now() + OTP_TTL_MIN * 60 * 1000).toISOString();

    // Insert OTP row before placing the call so the TwiML callback can
    // look up the code. Service role bypasses RLS.
    const { data: inserted, error: insErr } = await svc
      .from("phone_verification_codes")
      .insert({
        phone: e164,
        code,
        expires_at: expiresAt,
        attempts: 0,
        verified: false,
        claim_request_id: claimRequestId,
        purpose: "claim_verification_voice",
      })
      .select("id")
      .single();
    if (insErr || !inserted) {
      console.error("[VOICE-OTP] insert failed", insErr?.message);
      return json(500, { error: "Could not start voice verification", code: "DB_INSERT_FAILED" });
    }

    // Update claim's verification surface
    await svc
      .from("facility_claim_requests")
      .update({
        verification_method: "sms_phone", // reuse existing enum for now
        verification_status: "pending",
        verification_phone: e164,
        updated_at: new Date().toISOString(),
      })
      .eq("id", claimRequestId);

    // Place the Twilio Voice call. TwiML URL points at our public
    // callback that reads the code; we pass the OTP row id as a query
    // param so the callback can authoritatively look it up without
    // trusting any other parameter.
    const twimlUrl = `${PUBLIC_APP_URL}/functions/v1/twilio-voice-otp-twiml?otp_id=${encodeURIComponent(inserted.id)}`;
    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_SID}/Calls.json`;
    const authString = btoa(`${TWILIO_SID}:${TWILIO_TOKEN}`);

    const callRes = await fetch(twilioUrl, {
      method: "POST",
      headers: {
        Authorization: `Basic ${authString}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        To: e164,
        From: TWILIO_FROM,
        Url: twimlUrl,
        Method: "POST",
        Timeout: "20",
      }),
    });
    if (!callRes.ok) {
      const errBody = await callRes.text().catch(() => "");
      console.error("[VOICE-OTP] twilio call failed", callRes.status, errBody.slice(0, 200));
      // Mark the OTP row as failed so the claimant can retry without
      // hitting the MAX_ACTIVE_CODES cap.
      await svc
        .from("phone_verification_codes")
        .delete()
        .eq("id", inserted.id);
      return json(502, {
        error: "Voice call could not be placed. Try SMS or email verification.",
        code: "TWILIO_FAILED",
      });
    }

    const callJson = (await callRes.json()) as { sid?: string };
    console.log("[VOICE-OTP] placed", { sid: callJson.sid, otp: inserted.id });

    return json(200, {
      success: true,
      maskedPhone: maskPhone(e164),
      callSid: callJson.sid ?? null,
      expiresAt,
      method: "voice_phone",
    });
  } catch (e) {
    console.error("[VOICE-OTP] unhandled", e instanceof Error ? e.message : String(e));
    return json(500, { error: "Internal error", code: "UNHANDLED" });
  }
});
