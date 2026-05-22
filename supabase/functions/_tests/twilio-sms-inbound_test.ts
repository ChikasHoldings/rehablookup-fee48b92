// Twilio inbound-SMS webhook signature-verification harness.
//
// Verifies the X-Twilio-Signature HMAC contract documented at
// supabase/functions/twilio-sms-inbound/index.ts:84-98:
//   X-Twilio-Signature = base64( HMAC-SHA1 ( authToken, requestUrl + sortedFormKVConcat ) )
//
// What this covers
// ────────────────
//   • POST with NO x-twilio-signature header → 403 + no sms_inbound_log row
//   • POST with WRONG signature → 403 + no sms_inbound_log row
//   • POST with VALID signature → 200 + TwiML response + sms_inbound_log row
//
// All three assertions follow the same belt-and-suspenders pattern used by
// the stripe-webhook harness: a rejected request must NOT leave a trail.
// If it did, an attacker who guesses signatures could mass-pollute the
// TCPA audit log without ever forging a valid one.
//
// Required env (all must be set; otherwise tests skip):
//   TWILIO_INBOUND_URL        e.g. https://<project>.functions.supabase.co/twilio-sms-inbound
//   TWILIO_AUTH_TOKEN         the SAME auth token the function validates with
//   SUPABASE_TEST_URL         test project URL for assertion queries
//   SUPABASE_TEST_SRK         service-role key for assertion queries
//   TWILIO_TEST_FROM_PHONE    E.164 phone that will appear in sms_inbound_log
//                             (use a sandbox/test number you control, NOT a
//                             real opt-in-listed seeker or provider)
//   TWILIO_TEST_TO_PHONE      E.164 RehabLookup-owned Twilio number
//
// Run:
//   deno test --allow-net --allow-env \
//     supabase/functions/_tests/twilio-sms-inbound_test.ts
//
// Each test that writes an sms_inbound_log row cleans it up by
// twilio_message_sid afterward.

import { assertEquals, assert } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const env = {
  url: Deno.env.get("TWILIO_INBOUND_URL"),
  authToken: Deno.env.get("TWILIO_AUTH_TOKEN"),
  supabaseUrl: Deno.env.get("SUPABASE_TEST_URL"),
  supabaseSrk: Deno.env.get("SUPABASE_TEST_SRK"),
  fromPhone: Deno.env.get("TWILIO_TEST_FROM_PHONE"),
  toPhone: Deno.env.get("TWILIO_TEST_TO_PHONE"),
};

const READY = !!(
  env.url && env.authToken && env.supabaseUrl && env.supabaseSrk &&
  env.fromPhone && env.toPhone
);

if (!READY) {
  Deno.test({
    name: "twilio-sms-inbound — SKIPPED (missing env)",
    ignore: true,
    fn: () => {
      // See file header for required env vars.
    },
  });
}

// ─────────────────────────────────────────────────────────────────────────
// Signing helper — exactly mirrors the function's verifyTwilioSignature()
// algorithm, so a test that signs with the right token + URL produces a
// header the function will accept.
// ─────────────────────────────────────────────────────────────────────────

async function twilioSignature(
  authToken: string,
  url: string,
  formParams: Record<string, string>,
): Promise<string> {
  const keys = Object.keys(formParams).sort();
  let toSign = url;
  for (const k of keys) toSign += k + formParams[k];
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(authToken),
    { name: "HMAC", hash: "SHA-1" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(toSign));
  return btoa(String.fromCharCode(...new Uint8Array(sig)));
}

function formEncode(params: Record<string, string>): string {
  return Object.entries(params)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join("&");
}

function svc() {
  return createClient(env.supabaseUrl!, env.supabaseSrk!);
}

function uniqueSid(): string {
  return `SMtest${Date.now().toString(36)}${Math.floor(Math.random() * 1e6)
    .toString(36)
    .padStart(4, "0")}`;
}

async function cleanupBySid(sid: string) {
  try {
    await svc().from("sms_inbound_log").delete().eq("twilio_message_sid", sid);
  } catch {
    // best-effort
  }
}

function basePayload(messageSid: string): Record<string, string> {
  // STOP keyword would trigger an opt-out DB write — use HELP instead so
  // the only side effect is the audit log row, which we clean up below.
  // (We don't want a test run to flip the opt-out state on whichever phone
  // the operator set as TWILIO_TEST_FROM_PHONE.)
  return {
    From: env.fromPhone!,
    To: env.toPhone!,
    Body: "HELP",
    MessageSid: messageSid,
    AccountSid: "ACtest_account_sid",
  };
}

// ─────────────────────────────────────────────────────────────────────────
// 1. Missing x-twilio-signature → 403 + no audit row
// ─────────────────────────────────────────────────────────────────────────

if (READY) Deno.test("twilio-sms-inbound: missing x-twilio-signature → 403", async () => {
  const sid = uniqueSid();
  const params = basePayload(sid);
  const res = await fetch(env.url!, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: formEncode(params),
  });
  assertEquals(res.status, 403);

  // A rejected request must NOT leave an audit-log row.
  const { data } = await svc()
    .from("sms_inbound_log")
    .select("twilio_message_sid")
    .eq("twilio_message_sid", sid)
    .maybeSingle();
  assertEquals(data, null);
});

// ─────────────────────────────────────────────────────────────────────────
// 2. Wrong signature → 403 + no audit row
// ─────────────────────────────────────────────────────────────────────────

if (READY) Deno.test("twilio-sms-inbound: invalid x-twilio-signature → 403", async () => {
  const sid = uniqueSid();
  const params = basePayload(sid);
  // Sign with a wrong token on purpose.
  const sig = await twilioSignature("wrong_token", env.url!, params);
  const res = await fetch(env.url!, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "X-Twilio-Signature": sig,
    },
    body: formEncode(params),
  });
  assertEquals(res.status, 403);

  const { data } = await svc()
    .from("sms_inbound_log")
    .select("twilio_message_sid")
    .eq("twilio_message_sid", sid)
    .maybeSingle();
  assertEquals(data, null);
});

// ─────────────────────────────────────────────────────────────────────────
// 3. Valid signature → 200 + TwiML + audit row
// ─────────────────────────────────────────────────────────────────────────

if (READY) Deno.test("twilio-sms-inbound: valid signature → 200 + sms_inbound_log row", async () => {
  const sid = uniqueSid();
  const params = basePayload(sid);
  // Sign with the SAME auth token the function uses.
  const sig = await twilioSignature(env.authToken!, env.url!, params);
  try {
    const res = await fetch(env.url!, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "X-Twilio-Signature": sig,
      },
      body: formEncode(params),
    });
    assertEquals(res.status, 200);
    // Returns TwiML <Response> — content-type must be text/xml.
    const ct = res.headers.get("content-type") || "";
    assert(ct.includes("text/xml"), `expected text/xml, got ${ct}`);
    const xml = await res.text();
    assert(xml.includes("<Response>"), "expected TwiML <Response> body");

    // Audit row landed.
    const { data, error } = await svc()
      .from("sms_inbound_log")
      .select("twilio_message_sid, action, keyword, from_phone")
      .eq("twilio_message_sid", sid)
      .maybeSingle();
    if (error) throw error;
    assert(data, `expected sms_inbound_log row for ${sid}`);
    assertEquals(data.twilio_message_sid, sid);
    // basePayload uses HELP → action = "help", keyword = "HELP"
    assertEquals(data.action, "help");
    assertEquals(data.keyword, "HELP");
  } finally {
    await cleanupBySid(sid);
  }
});
