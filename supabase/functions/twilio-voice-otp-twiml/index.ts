/**
 * twilio-voice-otp-twiml
 *
 * Public webhook that Twilio's Voice API calls when the recipient
 * answers the OTP call. Returns TwiML that reads the OTP aloud twice
 * (once at moderate pace, once digit-by-digit). No JWT — Twilio
 * authenticates via signature verification (X-Twilio-Signature).
 *
 * Safety:
 *   * The OTP code is looked up by id (passed as ?otp_id=…). We do
 *     NOT trust any other URL parameter to identify the code.
 *   * Twilio signature is verified against the full URL + form params
 *     using the standard HMAC-SHA1 algorithm. A mismatch returns 403
 *     so a forged callback can't extract codes.
 *   * The code is only read aloud if the phone_verification_codes row
 *     exists, is not yet verified, and hasn't expired. Otherwise we
 *     return a polite "we couldn't connect this call" message and let
 *     Twilio hang up — no code leak.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2?target=denonext";
import { createHmac } from "node:crypto";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "x-twilio-signature, content-type",
};

function twiml(body: string): Response {
  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?><Response>${body}</Response>`,
    { status: 200, headers: { ...corsHeaders, "Content-Type": "text/xml" } },
  );
}

function sorryHangup(): Response {
  return twiml(
    `<Say voice="Polly.Joanna">We could not connect this verification call. Please request a new code or use another verification method.</Say><Hangup/>`,
  );
}

/**
 * Standard Twilio signature verification:
 *   sig = base64(HMAC-SHA1(authToken, fullUrl + sortedKeyValuePairs))
 * https://www.twilio.com/docs/usage/webhooks/webhooks-security
 */
function verifyTwilioSignature(
  url: string,
  params: URLSearchParams,
  signature: string,
  authToken: string,
): boolean {
  if (!signature) return false;
  const sorted: string[] = [];
  const keys = [...new Set([...params.keys()])].sort();
  for (const k of keys) {
    const vals = params.getAll(k);
    for (const v of vals) sorted.push(`${k}${v}`);
  }
  const data = url + sorted.join("");
  const expected = createHmac("sha1", authToken).update(data).digest("base64");
  // Constant-time-ish compare
  if (expected.length !== signature.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) {
    diff |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
  }
  return diff === 0;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  // Twilio sends a POST with x-www-form-urlencoded body
  const TWILIO_TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN");
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SUPABASE_SRK = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!TWILIO_TOKEN || !SUPABASE_URL || !SUPABASE_SRK) {
    console.error("[VOICE-TWIML] missing env");
    return sorryHangup();
  }

  // Parse params + verify Twilio signature.
  const formText = await req.text().catch(() => "");
  const params = new URLSearchParams(formText);
  const signature = req.headers.get("x-twilio-signature") || "";
  const fullUrl = req.url; // includes ?otp_id=…

  if (!verifyTwilioSignature(fullUrl, params, signature, TWILIO_TOKEN)) {
    console.warn("[VOICE-TWIML] signature mismatch");
    return new Response("Forbidden", { status: 403 });
  }

  // Look up the OTP row from the ?otp_id query param.
  const url = new URL(req.url);
  const otpId = url.searchParams.get("otp_id");
  if (!otpId || !/^[0-9a-f-]{36}$/i.test(otpId)) {
    return sorryHangup();
  }

  const svc = createClient(SUPABASE_URL, SUPABASE_SRK);
  const { data: otp, error } = await svc
    .from("phone_verification_codes")
    .select("id, code, verified, expires_at, purpose")
    .eq("id", otpId)
    .eq("purpose", "claim_verification_voice")
    .maybeSingle();

  if (error || !otp || otp.verified) {
    return sorryHangup();
  }
  if (new Date(otp.expires_at).getTime() < Date.now()) {
    return sorryHangup();
  }

  // Read the code aloud. Voice playback is short — keep it tight.
  // The <Pause/> + digit-by-digit re-read gives the recipient time to
  // grab a pen and reduces transcription error.
  const code = String(otp.code);
  const spaced = code.split("").join(" ");

  return twiml(`
    <Pause length="1"/>
    <Say voice="Polly.Joanna">Hello. This is RehabLookup with your verification code.</Say>
    <Pause length="1"/>
    <Say voice="Polly.Joanna">Your code is ${spaced}.</Say>
    <Pause length="2"/>
    <Say voice="Polly.Joanna">Again, your code is ${spaced}.</Say>
    <Pause length="1"/>
    <Say voice="Polly.Joanna">Enter this code on the RehabLookup verification page. Goodbye.</Say>
    <Hangup/>
  `);
});
