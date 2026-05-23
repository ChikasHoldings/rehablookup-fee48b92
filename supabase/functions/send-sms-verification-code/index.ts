import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2?target=denonext";
import { generateOtpCode } from "../_shared/otp-code.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[SMS-VERIFICATION-SEND] ${step}${detailsStr}`);
};

Deno.serve(async (req) => {
  const requestId = crypto.randomUUID().slice(0, 8);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started", { requestId });

    // Validate environment
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const twilioAccountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
    const twilioAuthToken = Deno.env.get("TWILIO_AUTH_TOKEN");
    const twilioPhoneNumber = Deno.env.get("TWILIO_PHONE_NUMBER");

    if (!supabaseUrl || !supabaseServiceKey) {
      logStep("Missing Supabase credentials", { requestId });
      return new Response(
        JSON.stringify({ error: "Server configuration error", requestId }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!twilioAccountSid || !twilioAuthToken || !twilioPhoneNumber) {
      logStep("Twilio credentials not configured", { requestId });
      return new Response(
        JSON.stringify({ error: "SMS service not configured", requestId }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse request
    let body: { phone?: string; userType?: string };
    try {
      body = await req.json();
    } catch {
      logStep("Invalid JSON body", { requestId });
      return new Response(
        JSON.stringify({ error: "Invalid request body", requestId }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { phone, userType } = body;

    if (!phone) {
      logStep("Missing phone number", { requestId });
      return new Response(
        JSON.stringify({ error: "Phone number is required", requestId }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate phone format (E.164 format: +1XXXXXXXXXX)
    const phoneRegex = /^\+1\d{10}$/;
    if (!phoneRegex.test(phone)) {
      logStep("Invalid phone format", { requestId, phone: phone.slice(0, 4) + "..." });
      return new Response(
        JSON.stringify({ error: "Invalid phone format. Use E.164 format: +1XXXXXXXXXX", requestId }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    logStep("Processing verification request", { requestId, userType: userType || "unknown" });

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Rate limiting: Check recent attempts (max 3 per 10 minutes)
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const { data: recentCodes, error: countError } = await supabase
      .from("phone_verification_codes")
      .select("id")
      .eq("phone", phone)
      .gte("created_at", tenMinutesAgo);

    if (countError) {
      logStep("Error checking rate limit", { requestId, error: countError.message });
    }

    if (recentCodes && recentCodes.length >= 3) {
      logStep("Rate limit exceeded", { requestId, attempts: recentCodes.length });
      return new Response(
        JSON.stringify({ error: "Too many requests. Please wait 10 minutes before trying again.", requestId }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const code = generateOtpCode();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 minutes

    // Store verification code
    const { error: insertError } = await supabase
      .from("phone_verification_codes")
      .insert({
        phone,
        code,
        expires_at: expiresAt,
        verified: false,
        attempts: 0,
      });

    if (insertError) {
      logStep("Error storing verification code", { requestId, error: insertError.message });
      return new Response(
        JSON.stringify({ error: "Failed to create verification code", requestId }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    logStep("Verification code created", { requestId, expiresAt });

    // Send SMS via Twilio.
    //
    // Twilio's POST /Messages.json returns HTTP 201 the moment the
    // message is accepted into Twilio's queue — that is NOT the same
    // as "the carrier delivered it." The response body's `status`
    // field tells the real story:
    //   - queued / accepted / sending / sent / delivered  → in flight or good
    //   - failed / undelivered                            → won't reach phone
    // We treat the latter as a hard failure and surface Twilio's
    // `error_code` + `error_message` so the admin can diagnose without
    // digging through the Twilio console.
    //
    // Why this matters here: the same HTTP-201-on-failure pattern is
    // what made codes silently never arrive when A2P 10DLC wasn't
    // registered — Twilio queued the messages, carriers filtered them,
    // and our function logged "sent successfully."
    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`;
    const authHeader = btoa(`${twilioAccountSid}:${twilioAuthToken}`);

    const messageBody = `Your RehabLookup verification code is: ${code}. This code expires in 10 minutes. Do not share this code.`;

    // StatusCallback so Twilio pings us when the message transitions
    // out of `queued`. Webhook is optional — function still works
    // without it — but if the env var is wired, we'll get
    // delivered/undelivered/failed updates posted back, which is the
    // only reliable way to detect carrier-level filtering after the
    // fact.
    const statusCallback = Deno.env.get("TWILIO_STATUS_CALLBACK_URL");

    const twilioBody = new URLSearchParams({
      To: phone,
      From: twilioPhoneNumber,
      Body: messageBody,
    });
    if (statusCallback) {
      twilioBody.append("StatusCallback", statusCallback);
    }

    const twilioResponse = await fetch(twilioUrl, {
      method: "POST",
      headers: {
        "Authorization": `Basic ${authHeader}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: twilioBody,
    });

    // Parse the response body once. We need it for both error and
    // success paths because Twilio embeds failure details in the body
    // alongside 2xx responses.
    let twilioResult: {
      sid?: string;
      status?: string;
      error_code?: number | null;
      error_message?: string | null;
      message?: string;
      code?: number;
    } = {};
    try {
      twilioResult = await twilioResponse.json();
    } catch {
      const raw = await twilioResponse.text().catch(() => "");
      logStep("Twilio non-JSON response", { requestId, status: twilioResponse.status, raw: raw.slice(0, 200) });
    }

    // Soft-expire helper (DRY between the error branches below).
    const softExpire = async () => {
      await supabase
        .from("phone_verification_codes")
        .update({ expires_at: new Date().toISOString() })
        .eq("phone", phone)
        .eq("code", code);
    };

    if (!twilioResponse.ok) {
      logStep("Twilio HTTP error", {
        requestId,
        status: twilioResponse.status,
        twilioCode: twilioResult.code,
        twilioMessage: twilioResult.message?.slice(0, 200),
      });
      await softExpire();
      return new Response(
        JSON.stringify({
          error: "Failed to send SMS. Please try again.",
          requestId,
          twilioStatus: twilioResponse.status,
          twilioCode: twilioResult.code ?? null,
          twilioMessage: twilioResult.message ?? null,
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Twilio accepted the request but reported failure in the body.
    // This is the carrier-filter / A2P-unregistered case that looks
    // like success at the HTTP layer.
    if (twilioResult.status === "failed" || twilioResult.status === "undelivered") {
      logStep("Twilio reported message failed in response body", {
        requestId,
        twilioStatus: twilioResult.status,
        twilioErrorCode: twilioResult.error_code,
        twilioErrorMessage: twilioResult.error_message,
        sid: twilioResult.sid,
      });
      await softExpire();
      return new Response(
        JSON.stringify({
          error: "Twilio reported delivery failure. Check the Twilio console for the message status.",
          requestId,
          twilioStatus: twilioResult.status,
          twilioErrorCode: twilioResult.error_code ?? null,
          twilioErrorMessage: twilioResult.error_message ?? null,
        }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    logStep("Verification SMS queued at Twilio", {
      requestId,
      messageId: twilioResult.sid,
      twilioStatus: twilioResult.status ?? "unknown",
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: "Verification code sent",
        expiresAt,
        requestId,
        twilioStatus: twilioResult.status ?? "queued",
        twilioSid: twilioResult.sid ?? null,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    logStep("Unexpected error", { requestId, error: error instanceof Error ? error.message : "Unknown error" });
    return new Response(
      JSON.stringify({ error: "Internal server error", requestId }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
