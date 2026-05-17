// admin-register-twilio-inbound-webhook
// ──────────────────────────────────────
// One-shot admin endpoint that points the Twilio phone number's
// inbound-SMS webhook at our `twilio-sms-inbound` Supabase function.
// Idempotent: if the URL is already correct, returns the current
// state without re-writing.
//
// Returns: { phoneNumberSid, phoneNumber, smsUrl, action }
//
// Auth: service-role JWT only (format-agnostic).
//
// Background:
//   The `twilio-sms-inbound` function (deployed round 18, verify_jwt
//   false) verifies Twilio's HMAC-SHA1 signature against the
//   account TWILIO_AUTH_TOKEN. Once Twilio's phone number is
//   configured to POST inbound SMS to this URL, STOP/HELP/START
//   keywords are honored TCPA-style and audited in sms_inbound_log.

const VERSION = "1.0.0";

const DEFAULT_URL =
  "https://mldbxpntzcjalgjmwnqa.supabase.co/functions/v1/twilio-sms-inbound";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  // Service-role gate
  const authHeader = req.headers.get("authorization") ?? "";
  const token = authHeader.replace(/^Bearer\s+/i, "");
  let role: string | null = null;
  try {
    const payload = token.split(".")[1];
    if (payload) {
      const decoded = JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/")));
      role = decoded.role ?? null;
    }
  } catch { /* role stays null */ }
  if (role !== "service_role") {
    return new Response(JSON.stringify({ error: "Forbidden", _version: VERSION }), {
      status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const sid = Deno.env.get("TWILIO_ACCOUNT_SID");
  const authToken = Deno.env.get("TWILIO_AUTH_TOKEN");
  const phoneNumber = Deno.env.get("TWILIO_PHONE_NUMBER");
  if (!sid || !authToken || !phoneNumber) {
    return new Response(
      JSON.stringify({
        error: "TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER must all be set",
        _version: VERSION,
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  let body: { url?: string } = {};
  try { body = await req.json(); } catch { /* default body */ }
  const targetUrl = (body.url && body.url.trim()) || DEFAULT_URL;

  const basicAuth = btoa(`${sid}:${authToken}`);
  const apiHeaders = {
    "Authorization": `Basic ${basicAuth}`,
    "Content-Type": "application/x-www-form-urlencoded",
  };

  try {
    // (1) Resolve the phone number SID. The Twilio number can be in
    //     +E.164 form (most common) — list incoming numbers and find
    //     the matching one.
    const listResp = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${sid}/IncomingPhoneNumbers.json?PhoneNumber=${encodeURIComponent(phoneNumber)}`,
      { headers: apiHeaders },
    );
    if (!listResp.ok) {
      const errBody = await listResp.text();
      return new Response(
        JSON.stringify({
          error: `Twilio list failed: ${listResp.status} ${errBody.slice(0, 300)}`,
          _version: VERSION,
        }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    const listJson = await listResp.json() as {
      incoming_phone_numbers?: Array<{ sid: string; phone_number: string; sms_url: string | null }>;
    };
    const numbers = listJson.incoming_phone_numbers ?? [];
    if (numbers.length === 0) {
      return new Response(
        JSON.stringify({
          error: `No Twilio phone number matching ${phoneNumber} found on this account`,
          _version: VERSION,
        }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    const match = numbers[0];

    if (match.sms_url === targetUrl) {
      return new Response(
        JSON.stringify({
          action: "already_set",
          phoneNumberSid: match.sid,
          phoneNumber: match.phone_number,
          smsUrl: match.sms_url,
          _version: VERSION,
        }, null, 2),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // (2) Update the SmsUrl + SmsMethod (POST) for the matched number.
    const updResp = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${sid}/IncomingPhoneNumbers/${match.sid}.json`,
      {
        method: "POST",
        headers: apiHeaders,
        body: new URLSearchParams({
          SmsUrl: targetUrl,
          SmsMethod: "POST",
        }),
      },
    );
    if (!updResp.ok) {
      const errBody = await updResp.text();
      return new Response(
        JSON.stringify({
          error: `Twilio update failed: ${updResp.status} ${errBody.slice(0, 300)}`,
          _version: VERSION,
        }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    const updJson = await updResp.json() as { sid: string; phone_number: string; sms_url: string };

    return new Response(
      JSON.stringify({
        action: "updated",
        phoneNumberSid: updJson.sid,
        phoneNumber: updJson.phone_number,
        smsUrl: updJson.sms_url,
        previousSmsUrl: match.sms_url,
        _version: VERSION,
      }, null, 2),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    return new Response(
      JSON.stringify({
        error: e instanceof Error ? e.message : String(e),
        _version: VERSION,
      }),
      { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
