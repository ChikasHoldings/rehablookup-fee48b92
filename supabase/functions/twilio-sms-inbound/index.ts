// twilio-sms-inbound v1.0.0
//
// TCPA-compliant inbound SMS webhook. Receives Twilio "Incoming Message"
// POSTs (application/x-www-form-urlencoded), classifies the keyword,
// updates profiles.sms_opted_out_at / sms_opted_in_at, and returns a
// TwiML response that Twilio sends back to the originating handset.
//
// Deploy with verify_jwt: false because Twilio cannot send a Supabase JWT.
// Authentication is via Twilio's X-Twilio-Signature HMAC over the request
// URL + sorted form params, validated with the account auth token.
//
// Configure in Twilio console: Phone Numbers → your number →
//   "A message comes in" → Webhook → POST to
//   https://<project-ref>.supabase.co/functions/v1/twilio-sms-inbound
//
// Keyword behavior (Twilio's standard stop/help words — Twilio itself
// auto-handles STOP at the carrier-aggregator layer too, but persisting
// the opt-out in our DB lets send-sms-notification gate cleanly):
//
//   Opt out: STOP, STOPALL, UNSUBSCRIBE, CANCEL, END, QUIT
//     → set sms_opted_out_at = now(), clear sms_opted_in_at,
//       reply "You've been unsubscribed from RehabLookup SMS. Reply START to resubscribe."
//
//   Opt in:  START, YES, UNSTOP
//     → set sms_opted_in_at = now(), clear sms_opted_out_at,
//       reply "You're resubscribed to RehabLookup SMS alerts. Reply STOP to opt out, HELP for help."
//
//   Help:    HELP, INFO
//     → reply with help text + support email; no DB change.
//
//   Other:   no DB change, no reply (silent).
//
// Every inbound message — regardless of keyword — is logged to
// sms_inbound_log for TCPA audit trail.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2?target=denonext";

const VERSION = "1.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "content-type, x-twilio-signature",
};

const STOP_WORDS = new Set(["STOP", "STOPALL", "UNSUBSCRIBE", "CANCEL", "END", "QUIT"]);
const START_WORDS = new Set(["START", "YES", "UNSTOP"]);
const HELP_WORDS = new Set(["HELP", "INFO"]);

function twiml(message: string | null): Response {
  const body = message
    ? `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${message
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")}</Message></Response>`
    : `<?xml version="1.0" encoding="UTF-8"?><Response/>`;
  return new Response(body, {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "text/xml" },
  });
}

async function verifyTwilioSignature(
  authToken: string,
  signatureHeader: string | null,
  requestUrl: string,
  formParams: Record<string, string>,
): Promise<boolean> {
  if (!signatureHeader) return false;
  // Twilio's signature spec: HMAC-SHA1 of (URL + sorted key=value pairs concatenated).
  const keys = Object.keys(formParams).sort();
  let toSign = requestUrl;
  for (const k of keys) toSign += k + formParams[k];
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(authToken),
    { name: "HMAC", hash: "SHA-1" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(toSign));
  const b64 = btoa(String.fromCharCode(...new Uint8Array(sig)));
  return b64 === signatureHeader;
}

function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  if (!raw.startsWith("+")) return `+${digits}`;
  return raw;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const twilioAuthToken = Deno.env.get("TWILIO_AUTH_TOKEN");

  if (!supabaseUrl || !supabaseKey) {
    console.error("[twilio-sms-inbound] missing Supabase env");
    return twiml(null);
  }

  // Parse form body.
  const formBody = await req.text();
  const formParams: Record<string, string> = {};
  for (const [k, v] of new URLSearchParams(formBody)) formParams[k] = v;

  // Signature verification (skip in dev when token absent so local testing works).
  if (twilioAuthToken) {
    const signatureHeader = req.headers.get("x-twilio-signature");
    // Reconstruct the URL Twilio signed. We must use the public-facing URL,
    // which equals our edge function endpoint.
    const requestUrl = req.url.replace(/^http:\/\//, "https://");
    const ok = await verifyTwilioSignature(twilioAuthToken, signatureHeader, requestUrl, formParams);
    if (!ok) {
      console.warn("[twilio-sms-inbound] signature mismatch", {
        hasSig: !!signatureHeader,
        url: requestUrl,
      });
      return new Response("Forbidden", { status: 403, headers: corsHeaders });
    }
  }

  const fromPhoneRaw = formParams.From ?? "";
  const toPhone = formParams.To ?? "";
  const body = (formParams.Body ?? "").trim();
  const messageSid = formParams.MessageSid ?? null;
  if (!fromPhoneRaw || !body) return twiml(null);

  const fromPhone = normalizePhone(fromPhoneRaw);
  const keywordRaw = body.toUpperCase().split(/\s+/)[0]?.replace(/[^\w]/g, "") ?? "";

  let action: "opt_out" | "opt_in" | "help" | "other" = "other";
  let replyMessage: string | null = null;

  if (STOP_WORDS.has(keywordRaw)) {
    action = "opt_out";
    replyMessage =
      "You're unsubscribed from RehabLookup SMS alerts. No more messages will be sent. Reply START to resubscribe.";
  } else if (START_WORDS.has(keywordRaw)) {
    action = "opt_in";
    replyMessage =
      "You're resubscribed to RehabLookup SMS alerts. Reply STOP to opt out, HELP for help. Msg & data rates may apply.";
  } else if (HELP_WORDS.has(keywordRaw)) {
    action = "help";
    replyMessage =
      "RehabLookup: lead & account alerts for providers. Reply STOP to opt out. Support: support@rehablookup.com. Msg & data rates may apply.";
  }

  const svc = createClient(supabaseUrl, supabaseKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Match the inbound phone to a profile if we have one. profiles.user_id is
  // the auth user; profiles.phone may be stored in varying formats, so we
  // match on the normalized E.164 form. If multiple rows share a phone (rare
  // — providers shouldn't, but we don't enforce uniqueness on phone), opt
  // them all out: the safest TCPA posture.
  let matchedUserIds: string[] = [];
  try {
    const { data: matched } = await svc
      .from("profiles")
      .select("user_id")
      .eq("phone", fromPhone);
    matchedUserIds = ((matched as { user_id?: string }[] | null) ?? [])
      .map((r) => r.user_id)
      .filter((id): id is string => !!id);
  } catch (e) {
    console.warn("[twilio-sms-inbound] match lookup failed", e);
  }

  // Apply opt-out / opt-in across every matching profile.
  if (matchedUserIds.length > 0) {
    const nowIso = new Date().toISOString();
    if (action === "opt_out") {
      await svc
        .from("profiles")
        .update({ sms_opted_out_at: nowIso, sms_opted_in_at: null })
        .in("user_id", matchedUserIds);
      // Also flip the per-channel toggle so the Settings UI reflects state.
      await svc
        .from("notification_preferences")
        .update({ sms_lead_alerts: false })
        .in("user_id", matchedUserIds);
    } else if (action === "opt_in") {
      await svc
        .from("profiles")
        .update({ sms_opted_out_at: null, sms_opted_in_at: nowIso })
        .in("user_id", matchedUserIds);
    }
  }

  // Persist the audit row regardless of match — TCPA wants the inbound trail.
  // If multiple profiles share the phone we still log one row (with the first
  // matched user_id) — opt-out is applied to all matches above.
  try {
    await svc.from("sms_inbound_log").insert({
      from_phone: fromPhone,
      to_phone: toPhone,
      body: body.slice(0, 1600),
      keyword: keywordRaw || null,
      matched_user_id: matchedUserIds[0] ?? null,
      action,
      twilio_message_sid: messageSid,
      raw_payload: formParams,
    });
  } catch (e) {
    console.warn("[twilio-sms-inbound] audit insert failed", e);
  }

  console.log("[twilio-sms-inbound]", {
    v: VERSION,
    action,
    keyword: keywordRaw,
    matched: matchedUserIds.length,
  });

  return twiml(replyMessage);
});
